"""Background jobs that run ml/ code (weekly refresh, retraining) one at a time.

Jobs are kept in <jobs_dir>/jobs.json so their history survives a service restart, and each
job's console output is written to <jobs_dir>/<job id>.log.
"""
from __future__ import annotations

import json
import os
import subprocess
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from .config import settings
from .errors import ApiError

JOB_LABELS = {
    "weekly_refresh": "อัปเดตผลทำนายรายสัปดาห์",
    "train": "ฝึกแบบจำลองใหม่",
    "upload": "อัปโหลดข้อมูลผลแข่ง",
}
ACTIVE_STATUSES = {"queued", "running"}
LOG_TAIL_LINES = 40


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _friendly_error(lines: list[str], returncode: int) -> str:
    text = "\n".join(lines)
    if "URLError" in text or "ConnectionRefused" in text or "WinError 10061" in text:
        return "เชื่อมต่อ API ผลการแข่งขันของเว็บไม่ได้ ตรวจสอบว่าเว็บเปิดอยู่และค่า PREDICTION_FIXTURES_API_URL ถูกต้อง"
    last = next((line for line in reversed(lines) if line.strip() and not line.startswith("[progress]")), "")
    return last.strip() or f"งานจบด้วยรหัสผิดพลาด {returncode}"


class JobStore:
    def __init__(self, jobs_dir: Path) -> None:
        self.jobs_dir = jobs_dir
        self.path = jobs_dir / "jobs.json"
        self.lock = threading.Lock()
        self.jobs: list[dict[str, Any]] = []
        self._load()

    def _load(self) -> None:
        if self.path.exists():
            try:
                self.jobs = json.loads(self.path.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                self.jobs = []
        changed = False
        for job in self.jobs:
            if job.get("status") in ACTIVE_STATUSES:
                job.update(status="failed", finished_at=_now(), error="prediction-service ถูกปิดระหว่างที่งานกำลังทำงาน")
                changed = True
        if changed:
            self._save()

    def _save(self) -> None:
        self.jobs_dir.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_name(self.path.name + ".tmp")
        tmp.write_text(json.dumps(self.jobs, ensure_ascii=False, indent=1), encoding="utf-8")
        os.replace(tmp, self.path)

    def _update(self, job: dict[str, Any], **fields: Any) -> None:
        with self.lock:
            job.update(fields)
            self._save()

    def get(self, job_id: str) -> dict[str, Any]:
        with self.lock:
            job = next((item for item in self.jobs if item["id"] == job_id), None)
            if job is None:
                raise ApiError(404, "ไม่พบงานนี้")
            return dict(job)

    def active(self) -> dict[str, Any] | None:
        with self.lock:
            job = next((item for item in self.jobs if item["status"] in ACTIVE_STATUSES), None)
            return dict(job) if job else None

    def list(self, limit: int = 100, kind: str | None = None) -> list[dict[str, Any]]:
        with self.lock:
            items = [dict(item) for item in self.jobs if kind is None or item["kind"] == kind]
        items.sort(key=lambda item: item["created_at"], reverse=True)
        return items[:limit]

    def _new_job(self, kind: str, requested_by: str, status: str) -> dict[str, Any]:
        return dict(
            id=uuid.uuid4().hex[:12],
            kind=kind,
            label=JOB_LABELS.get(kind, kind),
            status=status,
            progress=0,
            message="รอเริ่มงาน" if status == "queued" else "",
            error=None,
            requested_by=requested_by or "-",
            created_at=_now(),
            started_at=None,
            finished_at=None,
            result=None,
            log_tail=[],
        )

    def record(self, kind: str, requested_by: str, status: str, message: str, result: Any = None, error: str | None = None) -> dict[str, Any]:
        """Log a short synchronous operation (e.g. a CSV upload) in the same history."""
        job = self._new_job(kind, requested_by, status)
        now = _now()
        job.update(progress=100, message=message, result=result, error=error, started_at=now, finished_at=now)
        with self.lock:
            self.jobs.append(job)
            self._save()
        return dict(job)

    def start_process(
        self,
        kind: str,
        args: list[str],
        requested_by: str,
        read_result: Callable[[Path], Any],
    ) -> dict[str, Any]:
        """Run `python <args>` inside ml/ in a background thread; only one job may run at a time.

        "{result_file}" in args is replaced by this job's result path, which read_result then parses.
        """
        with self.lock:
            running = next((item for item in self.jobs if item["status"] in ACTIVE_STATUSES), None)
            if running is not None:
                raise ApiError(
                    409,
                    f"มีงาน \"{running['label']}\" กำลังทำงานอยู่ กรุณารอให้เสร็จก่อน",
                    details={"active_job": dict(running)},
                )
            job = self._new_job(kind, requested_by, "queued")
            self.jobs.append(job)
            self._save()
        thread = threading.Thread(target=self._run, args=(job, args, read_result), daemon=True)
        thread.start()
        return dict(job)

    def _run(self, job: dict[str, Any], args: list[str], read_result: Callable[[Path], Any]) -> None:
        self.jobs_dir.mkdir(parents=True, exist_ok=True)
        result_path = self.jobs_dir / f"{job['id']}.result.json"
        log_path = self.jobs_dir / f"{job['id']}.log"
        command = [str(settings.ml_python), *(arg.replace("{result_file}", str(result_path)) for arg in args)]
        env = {**os.environ, "PYTHONIOENCODING": "utf-8", "PYTHONUNBUFFERED": "1"}
        self._update(job, status="running", started_at=_now(), message="กำลังเริ่มงาน")
        tail: list[str] = []
        try:
            with log_path.open("w", encoding="utf-8") as log, subprocess.Popen(
                command,
                cwd=settings.ml_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                env=env,
            ) as process:
                assert process.stdout is not None
                for raw_line in process.stdout:
                    line = raw_line.rstrip("\r\n")
                    log.write(line + "\n")
                    log.flush()
                    if line.startswith("[progress] "):
                        _, percent, *message = line.split(" ", 2)
                        if percent.isdigit():
                            self._update(job, progress=min(100, int(percent)), message=message[0] if message else "")
                        continue
                    tail = (tail + [line])[-LOG_TAIL_LINES:]
                returncode = process.wait()
            if returncode == 0:
                self._update(job, status="done", progress=100, message="เสร็จสิ้น", finished_at=_now(),
                             result=read_result(result_path), log_tail=tail[-10:])
            else:
                self._update(job, status="failed", finished_at=_now(), error=_friendly_error(tail, returncode), log_tail=tail)
        except Exception as error:  # noqa: BLE001 - a job failure must never kill the service
            self._update(job, status="failed", finished_at=_now(), error=f"{type(error).__name__}: {error}", log_tail=tail)


job_store = JobStore(settings.jobs_dir)
