"""Storage setup. All archive, training and prediction work lives in ml_bridge.py (real ml/ code)."""
from __future__ import annotations

import shutil

from .config import DEFAULT_SHARED_DATA_DIR, settings


def ensure_directories() -> None:
    settings.raw_dir.mkdir(parents=True, exist_ok=True)
    settings.export_dir.mkdir(parents=True, exist_ok=True)
    settings.model_dir.mkdir(parents=True, exist_ok=True)


def bootstrap_storage(readme: bool = True) -> None:
    ensure_directories()
    if readme:
        for directory, label in (
            (settings.raw_dir, "raw uploads"),
            (settings.export_dir, "prediction exports"),
            (settings.model_dir, "future model artifacts"),
        ):
            readme_path = directory / ".gitkeep"
            if not readme_path.exists():
                readme_path.write_text(f"# {label}\n", encoding="utf-8")


def copy_existing_data_from_repo() -> None:
    source_data_dir = (settings.data_dir if settings.data_dir == DEFAULT_SHARED_DATA_DIR else DEFAULT_SHARED_DATA_DIR)
    if source_data_dir == settings.raw_dir.parent:
        return
    source_raw = source_data_dir / "raw"
    source_predictions = source_data_dir / "predictions"
    ensure_directories()
    if source_raw.exists() and not any(settings.raw_dir.glob("*.csv")):
        for item in source_raw.glob("*.csv"):
            shutil.copy2(item, settings.raw_dir / item.name)
    if source_predictions.exists() and not any(settings.export_dir.glob("*.csv")):
        for item in source_predictions.glob("*.csv"):
            shutil.copy2(item, settings.export_dir / item.name)
