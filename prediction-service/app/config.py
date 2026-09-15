from __future__ import annotations

import os
from pathlib import Path
from typing import List


def _split_csv_env(value: str) -> List[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


SERVICE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = SERVICE_ROOT.parent
DEFAULT_SHARED_DATA_DIR = REPO_ROOT / "data"
DEFAULT_LOCAL_DATA_DIR = SERVICE_ROOT / "data"


class Settings:
    def __init__(self) -> None:
        self.app_name = os.getenv("APP_NAME", "prediction-service")
        self.app_env = os.getenv("APP_ENV", "development")
        self.port = int(os.getenv("PORT", "8000"))
        self.host = os.getenv("HOST", "0.0.0.0")
        self.log_level = os.getenv("LOG_LEVEL", "info")

        configured_data_dir = os.getenv("PREDICTION_DATA_DIR", "").strip()
        if configured_data_dir:
            self.data_dir = Path(configured_data_dir).expanduser().resolve()
        elif DEFAULT_SHARED_DATA_DIR.exists():
            self.data_dir = DEFAULT_SHARED_DATA_DIR
        else:
            self.data_dir = DEFAULT_LOCAL_DATA_DIR

        self.raw_dir = Path(os.getenv("PREDICTION_RAW_DIR", self.data_dir / "raw")).expanduser().resolve()
        self.export_dir = Path(
            os.getenv("PREDICTION_EXPORT_DIR", self.data_dir / "predictions")
        ).expanduser().resolve()
        self.model_dir = Path(os.getenv("PREDICTION_MODEL_DIR", self.data_dir / "models")).expanduser().resolve()

        cors_origins = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000")
        self.cors_allowed_origins = _split_csv_env(cors_origins)


settings = Settings()
