from __future__ import annotations

import hashlib
import json
import re
import shutil
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from src.data.clean_data import build_dataset, clean_file, write_outputs
from src.evaluation.evaluate import evaluate_model_predictions
from src.features.feature_engineering import FEATURE_OUTPUT, generate_features, write_features
from src.models.ensemble import build_ensemble
from src.models.poisson_model import run_training as run_poisson_training
from src.models.train_catboost import run_training as run_catboost_training
from src.models.train_xgboost import run_training as run_xgboost_training


PROJECT_ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = PROJECT_ROOT / "data" / "raw"
UPLOAD_DIR = RAW_DIR / "uploads"
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
FEATURE_PATH = PROJECT_ROOT / FEATURE_OUTPUT
MASTER_DATASET_PATH = PROCESSED_DIR / "master_matches.csv"
UPDATE_HISTORY_PATH = PROCESSED_DIR / "update_history.json"

DEDUPLICATE_KEYS = ["Date", "HomeTeam", "AwayTeam"]


@dataclass
class PipelineResult:
    mode: str
    uploaded_file: str | None
    total_raw_files: int
    total_matches: int
    added_matches: int
    duplicate_matches_removed: int
    feature_rows: int
    seasons_available: list[str]
    latest_season: str | None
    recognized_files: list[dict[str, object]]
    upload_validation: dict[str, object] | None
    train_summary: dict[str, dict[str, object]]
    evaluation_summary: dict[str, dict[str, object]]
    evaluation_report_path: str
    update_history_path: str

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


def _slugify_filename(filename: str) -> str:
    sanitized = re.sub(r"[^A-Za-z0-9._-]+", "_", Path(filename).name).strip("._")
    return sanitized or "uploaded.csv"


def _count_raw_files() -> int:
    return len(list(RAW_DIR.rglob("E0*.csv")))


def _file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _build_recognized_files(dataset: pd.DataFrame) -> list[dict[str, object]]:
    source_counts = dataset.groupby(["SourceFile", "Season"], dropna=False).size().reset_index(name="match_count")
    files_by_name = {path.name: path for path in RAW_DIR.rglob("E0*.csv")}
    recognized_files: list[dict[str, object]] = []

    for row in source_counts.sort_values(["Season", "SourceFile"]).itertuples(index=False):
        file_path = files_by_name.get(row.SourceFile)
        recognized_files.append(
            {
                "file_name": row.SourceFile,
                "season": row.Season,
                "match_count": int(row.match_count),
                "location": str(file_path) if file_path else None,
            }
        )
    return recognized_files


def _summarize_seasons(dataset: pd.DataFrame) -> tuple[list[str], str | None]:
    seasons = sorted(dataset["Season"].dropna().astype(str).unique().tolist())
    return seasons, (seasons[-1] if seasons else None)


def _deduplicate_matches(dataset: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    before = len(dataset)
    deduplicated = dataset.drop_duplicates(subset=DEDUPLICATE_KEYS, keep="last").copy()
    deduplicated.sort_values(["Date", "HomeTeam", "AwayTeam"], inplace=True)
    deduplicated.reset_index(drop=True, inplace=True)
    return deduplicated, before - len(deduplicated)


def _load_previous_master_count() -> int:
    if not MASTER_DATASET_PATH.exists():
        return 0
    frame = pd.read_csv(MASTER_DATASET_PATH, low_memory=False)
    return int(len(frame))


def _write_master_dataset(dataset: pd.DataFrame) -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    dataset.to_csv(MASTER_DATASET_PATH, index=False)


def _write_evaluation_report(report: dict[str, dict[str, object]]) -> Path:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    output_path = PROCESSED_DIR / "evaluation_report.json"
    output_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return output_path


def _append_update_history(result: PipelineResult) -> None:
    history: list[dict[str, object]] = []
    if UPDATE_HISTORY_PATH.exists():
        history = json.loads(UPDATE_HISTORY_PATH.read_text(encoding="utf-8"))

    history.append(
        {
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "mode": result.mode,
            "uploaded_file": result.uploaded_file,
            "total_raw_files": result.total_raw_files,
            "total_matches": result.total_matches,
            "added_matches": result.added_matches,
            "duplicate_matches_removed": result.duplicate_matches_removed,
            "feature_rows": result.feature_rows,
        }
    )
    UPDATE_HISTORY_PATH.write_text(json.dumps(history, indent=2), encoding="utf-8")


def _run_pipeline(mode: str, uploaded_file: str | None = None) -> PipelineResult:
    previous_match_count = _load_previous_master_count()

    dataset, summaries = build_dataset(PROJECT_ROOT)
    dataset, duplicate_matches_removed = _deduplicate_matches(dataset)
    write_outputs(PROJECT_ROOT, dataset, summaries)
    _write_master_dataset(dataset)

    feature_input = dataset.copy()
    feature_input["Date"] = pd.to_datetime(feature_input["Date"], errors="coerce")
    feature_input = feature_input[feature_input["Date"].notna()].copy()
    features = generate_features(feature_input)
    write_features(features, FEATURE_PATH)
    seasons_available, latest_season = _summarize_seasons(dataset)
    recognized_files = _build_recognized_files(dataset)

    train_summary = {
        "catboost": run_catboost_training(FEATURE_PATH),
        "xgboost": run_xgboost_training(FEATURE_PATH),
        "poisson": run_poisson_training(FEATURE_PATH),
        "ensemble": build_ensemble(PROJECT_ROOT / "models" / "saved_models"),
    }

    evaluation_summary = evaluate_model_predictions(PROJECT_ROOT / "models" / "saved_models")
    evaluation_report_path = _write_evaluation_report(evaluation_summary)

    result = PipelineResult(
        mode=mode,
        uploaded_file=uploaded_file,
        total_raw_files=_count_raw_files(),
        total_matches=int(len(dataset)),
        added_matches=max(int(len(dataset)) - previous_match_count, 0),
        duplicate_matches_removed=int(duplicate_matches_removed),
        feature_rows=int(len(features)),
        seasons_available=seasons_available,
        latest_season=latest_season,
        recognized_files=recognized_files,
        upload_validation=None,
        train_summary=train_summary,
        evaluation_summary=evaluation_summary,
        evaluation_report_path=str(evaluation_report_path),
        update_history_path=str(UPDATE_HISTORY_PATH),
    )
    _append_update_history(result)
    return result


def run_full_pipeline() -> PipelineResult:
    return _run_pipeline(mode="full_rebuild")


def inspect_current_archive() -> dict[str, object]:
    if MASTER_DATASET_PATH.exists():
        dataset = pd.read_csv(MASTER_DATASET_PATH, low_memory=False)
    else:
        dataset, _ = build_dataset(PROJECT_ROOT)
        dataset, _ = _deduplicate_matches(dataset)

    seasons_available, latest_season = _summarize_seasons(dataset)
    recognized_files = _build_recognized_files(dataset)
    return {
        "total_raw_files": _count_raw_files(),
        "total_matches": int(len(dataset)),
        "seasons_available": seasons_available,
        "latest_season": latest_season,
        "recognized_files": recognized_files,
    }


def validate_uploaded_file(source_file: Path) -> dict[str, object]:
    if not source_file.exists():
        raise FileNotFoundError(f"Uploaded file not found: {source_file}")

    header_frame, summary = clean_file(source_file)
    file_hash = _file_sha256(source_file)
    existing_hashes = {
        _file_sha256(path): path.name for path in RAW_DIR.rglob("E0*.csv") if path.resolve() != source_file.resolve()
    }
    seasons_in_file = sorted(header_frame["Season"].dropna().astype(str).unique().tolist())
    archive = inspect_current_archive()
    known_seasons = set(archive["seasons_available"])

    duplicate_file = file_hash in existing_hashes
    season_already_present = all(season in known_seasons for season in seasons_in_file) if seasons_in_file else False

    return {
        "file_name": source_file.name,
        "season_candidates": seasons_in_file,
        "match_rows": int(len(header_frame)),
        "primary_season": summary.season,
        "is_duplicate_file": duplicate_file,
        "duplicate_of": existing_hashes.get(file_hash),
        "season_already_present": season_already_present,
        "is_new_season": any(season not in known_seasons for season in seasons_in_file),
        "archive_latest_season": archive["latest_season"],
        "archive_total_matches": archive["total_matches"],
    }


def run_incremental_update(source_file: Path) -> PipelineResult:
    validation = validate_uploaded_file(source_file)
    if validation["is_duplicate_file"]:
        result = _run_pipeline(
            mode="incremental_update_existing_file",
            uploaded_file=str(validation["duplicate_of"] or source_file.name),
        )
        result.upload_validation = validation
        return result

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = _slugify_filename(source_file.name)
    if not safe_name.startswith("E0"):
        safe_name = f"E0_update_{safe_name}"
    destination = UPLOAD_DIR / safe_name
    if destination.resolve() != source_file.resolve():
        shutil.copy2(source_file, destination)

    result = _run_pipeline(mode="incremental_update", uploaded_file=destination.name)
    result.upload_validation = validation
    return result
