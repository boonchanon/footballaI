from __future__ import annotations

import threading

from fastapi import FastAPI, File, Form, Header, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from . import ml_bridge
from .config import settings
from .errors import ApiError, register_error_handlers
from .jobs import job_store
from .models import MatchPredictionRequest
from .pipeline import bootstrap_storage, copy_existing_data_from_repo
from .training import start_training
from .weekly import get_weekly_job, start_weekly_refresh, weekly_history


app = FastAPI(title=settings.app_name)
register_error_handlers(app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    # ml/ is a tracked, byte-exact copy of the AI project; do not seed placeholder files into it.
    bootstrap_storage(readme=not settings.uses_ml_dir)
    if not settings.uses_ml_dir:
        copy_existing_data_from_repo()
    # Load the models and fit Dixon-Coles in the background so the first prediction is quick.
    threading.Thread(target=ml_bridge.warm_up, daemon=True).start()


@app.get("/health")
async def health() -> dict[str, object]:
    return {
        "ok": True,
        "service": settings.app_name,
        "status": "ready",
        "data": {
            "environment": settings.app_env,
            "data_dir": str(settings.data_dir),
            "raw_dir": str(settings.raw_dir),
            "export_dir": str(settings.export_dir),
            "ml_dir": str(settings.ml_dir),
            "ml_python": str(settings.ml_python),
        },
    }


# ---------------------------------------------------------------- weekly refresh


@app.post("/pipeline/weekly-refresh", status_code=202)
def pipeline_weekly_refresh(x_requested_by: str = Header(default="")) -> dict[str, object]:
    job = start_weekly_refresh(x_requested_by.strip())
    return {"ok": True, "job_id": job["id"], "job": job}


@app.get("/pipeline/weekly-refresh/{job_id}")
def pipeline_weekly_refresh_status(job_id: str) -> dict[str, object]:
    return {"ok": True, "job": get_weekly_job(job_id)}


@app.get("/pipeline/weekly-history")
def pipeline_weekly_history() -> dict[str, object]:
    return {"ok": True, **weekly_history()}


# ---------------------------------------------------------------- jobs (history for the logs page)


@app.get("/pipeline/jobs")
def pipeline_jobs(kind: str | None = None, limit: int = 100) -> dict[str, object]:
    return {"ok": True, "jobs": job_store.list(limit=max(1, min(limit, 500)), kind=kind), "active_job": job_store.active()}


@app.get("/pipeline/jobs/{job_id}")
def pipeline_job(job_id: str) -> dict[str, object]:
    return {"ok": True, "job": job_store.get(job_id)}


# ---------------------------------------------------------------- data archive and training


@app.get("/pipeline/status")
def pipeline_status() -> dict[str, object]:
    return ml_bridge.pipeline_status()


@app.post("/pipeline/upload")
def pipeline_upload(file: list[UploadFile] = File(...), x_requested_by: str = Header(default="")) -> dict[str, object]:
    stored = []
    for item in file:
        try:
            stored.append(ml_bridge.store_upload(item.filename or "upload.csv", item.file.read()))
        except ApiError as error:
            job_store.record("upload", x_requested_by, "failed", f"อัปโหลด {item.filename} ไม่ผ่านการตรวจ", error=error.message)
            raise
    added = [item for item in stored if item["stored_filename"]]
    duplicates = [item["original_name"] for item in stored if item["duplicate"]]
    message = (
        f"เพิ่มไฟล์เข้าคลังข้อมูล {len(added)} ไฟล์ กด \"ฝึกแบบจำลองใหม่\" เพื่อนำข้อมูลไปใช้"
        if added
        else "ไฟล์นี้มีอยู่ในคลังข้อมูลแล้ว ไม่ได้เพิ่มซ้ำ"
    )
    job_store.record("upload", x_requested_by, "done", message, result={"files": stored})
    return {
        "ok": True,
        "message": message,
        "duplicate": bool(duplicates),
        "duplicate_files": duplicates,
        "uploaded_files": [item["stored_filename"] for item in added],
        "processed_files": len(stored),
        "files": stored,
        "matches_added": sum(item["match_rows"] for item in added),
        "latest_season": max((season for item in stored for season in item["seasons"]), default=None),
    }


@app.post("/pipeline/full", status_code=202)
def pipeline_full(x_requested_by: str = Header(default="")) -> dict[str, object]:
    job = start_training(x_requested_by.strip())
    return {"ok": True, "job_id": job["id"], "job": job}


@app.delete("/pipeline/files/{filename}")
def pipeline_delete_file(filename: str, x_requested_by: str = Header(default="")) -> dict[str, object]:
    result = ml_bridge.delete_upload(filename)
    job_store.record("delete_file", x_requested_by, "done", f"ลบไฟล์ {result['filename']}", result=result)
    archive = ml_bridge.archive_summary()
    return {**result, "raw_file_count": archive["raw_file_count"], "latest_season": archive["latest_season"], "total_matches": archive["total_matches"]}


# ---------------------------------------------------------------- prediction


@app.get("/teams")
def teams() -> dict[str, object]:
    return ml_bridge.teams_payload()


@app.post("/predict")
def predict(request: MatchPredictionRequest) -> dict[str, object]:
    return ml_bridge.predict_pair(request.home_team, request.away_team)


@app.post("/predict-match")
def predict_match_legacy(request: MatchPredictionRequest) -> dict[str, object]:
    return ml_bridge.predict_pair(request.home_team, request.away_team)


@app.post("/predictions/export-fixtures")
def predictions_export_fixtures(
    season: str = Form(...),
    file: UploadFile = File(...),
) -> dict[str, object]:
    if not season.strip():
        raise ApiError(422, "Season is required")
    if not (file.filename or "").lower().endswith(".csv"):
        raise ApiError(422, "Fixture export accepts CSV only")
    return ml_bridge.export_fixture_predictions(season.strip(), file.filename or "fixtures.csv", file.file.read())


@app.get("/predictions/download/{filename}")
def predictions_download(filename: str) -> FileResponse:
    file_path = ml_bridge.download_path(filename)
    return FileResponse(path=file_path, filename=file_path.name, media_type="text/csv")
