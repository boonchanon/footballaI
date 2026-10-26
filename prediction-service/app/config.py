from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import List


def _split_csv_env(value: str) -> List[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


SERVICE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SERVICE_ROOT.parent
DEFAULT_SHARED_DATA_DIR = REPO_ROOT / "data"
DEFAULT_LOCAL_DATA_DIR = SERVICE_ROOT / "data"
# The AI prediction code and its data live in ml/ of the website repo.
DEFAULT_ML_DIR = REPO_ROOT / "ml"


def _default_ml_python(ml_dir: Path) -> Path:
    candidates = [ml_dir / ".venv" / "Scripts" / "python.exe", ml_dir / ".venv" / "bin" / "python"]
    return next((path for path in candidates if path.exists()), Path(sys.executable))


class Settings:
    def __init__(self) -> None:
        self.app_name = os.getenv("APP_NAME", "prediction-service")
        self.app_env = os.getenv("APP_ENV", "development")
        self.port = int(os.getenv("PORT", "8000"))
        # Only the website on the same machine talks to this service.
        self.host = os.getenv("HOST", "127.0.0.1")
        self.log_level = os.getenv("LOG_LEVEL", "info")

        self.ml_dir = Path(os.getenv("PREDICTION_ML_DIR", DEFAULT_ML_DIR)).expanduser().resolve()
        configured_data_dir = os.getenv("PREDICTION_DATA_DIR", "").strip()
        if configured_data_dir:
            self.data_dir = Path(configured_data_dir).expanduser().resolve()
        elif (self.ml_dir / "data").exists():
            self.data_dir = self.ml_dir / "data"
        elif DEFAULT_SHARED_DATA_DIR.exists():
            self.data_dir = DEFAULT_SHARED_DATA_DIR
        else:
            self.data_dir = DEFAULT_LOCAL_DATA_DIR
        self.uses_ml_dir = self.data_dir == self.ml_dir / "data"

        self.raw_dir = Path(os.getenv("PREDICTION_RAW_DIR", self.data_dir / "raw")).expanduser().resolve()
        self.export_dir = Path(
            os.getenv("PREDICTION_EXPORT_DIR", self.data_dir / "predictions")
        ).expanduser().resolve()
        default_model_dir = self.ml_dir / "models" / "saved_models" if self.uses_ml_dir else self.data_dir / "models"
        self.model_dir = Path(os.getenv("PREDICTION_MODEL_DIR", default_model_dir)).expanduser().resolve()
        self.processed_dir = self.data_dir / "processed"
        self.weekly_dir = self.processed_dir / "weekly"
        self.web_public_dir = REPO_ROOT / "public"
        # Python that has the ml/ requirements installed; the jobs run ml/src modules with it.
        self.ml_python = Path(os.getenv("PREDICTION_PYTHON", _default_ml_python(self.ml_dir))).expanduser()
        self.jobs_dir = Path(os.getenv("PREDICTION_JOBS_DIR", self.ml_dir / "logs")).expanduser().resolve()

        cors_origins = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000")
        self.cors_allowed_origins = _split_csv_env(cors_origins)


settings = Settings()
