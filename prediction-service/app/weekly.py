"""Weekly prediction refresh: runs ml/src/models/weekly_refresh.py --publish as a background job."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Any

from .config import settings
from .errors import ApiError
from .jobs import job_store

PUBLISHED_CSV_NAME = "predictions_2026_2027_retrained_h2h.csv"
MODEL_LABELS = {"dixon_coles": "Dixon-Coles", "ensemble": "Ensemble (CatBoost + XGBoost + Poisson)"}


def _read_result(path: Path) -> Any:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    finally:
        path.unlink(missing_ok=True)


def start_weekly_refresh(requested_by: str) -> dict[str, Any]:
    # weekly_refresh writes its final manifest to the job's result file.
    args = ["-m", "src.models.weekly_refresh", "--publish", "--result-file", "{result_file}"]
    fixtures_api = os.getenv("PREDICTION_FIXTURES_API_URL", "").strip()
    if fixtures_api:
        args += ["--api-url", fixtures_api]
    return job_store.start_process("weekly_refresh", args, requested_by, _read_result)


def get_weekly_job(job_id: str) -> dict[str, Any]:
    job = job_store.get(job_id)
    if job["kind"] != "weekly_refresh":
        raise ApiError(404, "ไม่พบงานอัปเดตผลรายสัปดาห์นี้")
    return job


def _normalized_sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes().replace(b"\r\n", b"\n")).hexdigest()


def weekly_history() -> dict[str, Any]:
    live_csv = settings.web_public_dir / PUBLISHED_CSV_NAME
    live_sha = _normalized_sha(live_csv) if live_csv.exists() else None
    rounds = []
    for path in sorted(settings.weekly_dir.glob("manifest_*.json")):
        try:
            manifest = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        output = settings.weekly_dir / str(manifest.get("Output", ""))
        # Manifests from before the --model option always used the ensemble headline.
        model = str(manifest.get("HeadlineModel") or "ensemble")
        rounds.append(
            dict(
                manifest_file=path.name,
                output_file=manifest.get("Output"),
                created_at=manifest.get("CreatedAt"),
                as_of=manifest.get("AsOf"),
                model=model,
                model_label=MODEL_LABELS.get(model, model),
                fixtures=manifest.get("Fixtures"),
                known_results=manifest.get("KnownResults"),
                last_known_result_date=manifest.get("LastKnownResultDate"),
                started_without_result=manifest.get("StartedWithoutResult"),
                refreshed=manifest.get("Refreshed"),
                frozen=manifest.get("FrozenFromPrevious"),
                published=bool(manifest.get("Published")),
                is_live=bool(live_sha and output.exists() and _normalized_sha(output) == live_sha),
            )
        )
    rounds.sort(key=lambda item: item["created_at"] or "", reverse=True)
    # Two runs with the same inputs produce identical files; only the newest one counts as live.
    live_seen = False
    for item in rounds:
        item["is_live"] = item["is_live"] and not live_seen
        live_seen = live_seen or item["is_live"]
    active = job_store.active()
    return {"rounds": rounds, "active_job": active if active and active["kind"] == "weekly_refresh" else None}
