from __future__ import annotations

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .config import settings
from .errors import ApiError, register_error_handlers
from .models import MatchPredictionRequest
from .pipeline import (
    bootstrap_storage,
    copy_existing_data_from_repo,
    delete_raw_file,
    export_fixture_predictions,
    get_download_path,
    get_pipeline_status,
    predict_match,
    run_full_pipeline,
    run_upload_pipeline_batch,
)


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
    bootstrap_storage()
    copy_existing_data_from_repo()


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
        },
    }


@app.get("/pipeline/status")
async def pipeline_status() -> dict[str, object]:
    return get_pipeline_status()


@app.post("/pipeline/upload")
async def pipeline_upload(file: list[UploadFile] = File(...)) -> dict[str, object]:
    items = []
    for item in file:
        if not item.filename.lower().endswith(".csv"):
            raise ApiError(422, f"Only CSV files are supported for upload: {item.filename}")
        items.append((item.filename, await item.read()))
    return run_upload_pipeline_batch(items)


@app.post("/pipeline/full")
async def pipeline_full() -> dict[str, object]:
    return run_full_pipeline()


@app.delete("/pipeline/files/{filename}")
async def pipeline_delete_file(filename: str) -> dict[str, object]:
    return delete_raw_file(filename)


@app.post("/predict")
async def predict(request: MatchPredictionRequest) -> dict[str, object]:
    return predict_match(request.home_team, request.away_team)


@app.post("/predict-match")
async def predict_match_legacy(request: MatchPredictionRequest) -> dict[str, object]:
    return predict_match(request.home_team, request.away_team)


@app.post("/predictions/export-fixtures")
async def predictions_export_fixtures(
    season: str = Form(...),
    file: UploadFile = File(...),
) -> dict[str, object]:
    if not season.strip():
        raise ApiError(422, "Season is required")
    if not file.filename.lower().endswith(".csv"):
        raise ApiError(422, "Fixture export accepts CSV only")
    return export_fixture_predictions(season.strip(), file.filename, await file.read())


@app.get("/predictions/download/{filename}")
async def predictions_download(filename: str) -> FileResponse:
    file_path = get_download_path(filename)
    return FileResponse(path=file_path, filename=file_path.name, media_type="text/csv")
