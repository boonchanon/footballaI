from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd

from src.models.predictor import PROJECT_ROOT, load_models, predict_match


PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
FIXTURE_REQUIRED_COLUMNS = {
    "fixture_date": "fixture_date",
    "date": "fixture_date",
    "home_team": "home_team",
    "hometeam": "home_team",
    "away_team": "away_team",
    "awayteam": "away_team",
}


def _excel_safe_score(value: str) -> str:
    return f'="{value}"'


def normalize_season_label(season: str) -> str:
    match = re.fullmatch(r"\s*(\d{4})\s*[-/]\s*(\d{2,4})\s*", season)
    if not match:
        raise ValueError("season must look like 2026-2027 or 2026/27")

    start_year = int(match.group(1))
    end_part = match.group(2)
    end_year = int(end_part) if len(end_part) == 4 else 2000 + int(end_part)
    return f"{start_year}_{end_year}"


def _canonicalize_fixture_columns(frame: pd.DataFrame) -> pd.DataFrame:
    rename_map: dict[str, str] = {}
    for column in frame.columns:
        normalized = re.sub(r"[^a-z]", "", column.lower())
        if normalized in FIXTURE_REQUIRED_COLUMNS:
            rename_map[column] = FIXTURE_REQUIRED_COLUMNS[normalized]

    output = frame.rename(columns=rename_map)
    missing = [column for column in ("fixture_date", "home_team", "away_team") if column not in output.columns]
    if missing:
        raise ValueError(f"fixture CSV missing required columns: {missing}")
    return output


def load_fixture_csv(path: Path) -> pd.DataFrame:
    frame = pd.read_csv(path, low_memory=False)
    frame = _canonicalize_fixture_columns(frame)
    frame["fixture_date"] = pd.to_datetime(frame["fixture_date"], errors="coerce")
    frame["home_team"] = frame["home_team"].astype(str).str.strip()
    frame["away_team"] = frame["away_team"].astype(str).str.strip()
    frame = frame[
        frame["fixture_date"].notna()
        & frame["home_team"].ne("")
        & frame["away_team"].ne("")
        & frame["home_team"].ne(frame["away_team"])
    ].copy()
    frame.sort_values(["fixture_date", "home_team", "away_team"], inplace=True)
    frame.reset_index(drop=True, inplace=True)
    if frame.empty:
        raise ValueError("fixture CSV contains no valid rows after cleaning")
    return frame


def build_fixture_prediction_output(fixtures: pd.DataFrame) -> pd.DataFrame:
    models = load_models()
    predictions: list[dict[str, object]] = []

    for row in fixtures.itertuples(index=False):
        result = predict_match(
            models,
            home_team=row.home_team,
            away_team=row.away_team,
            prediction_date=pd.Timestamp(row.fixture_date),
        )
        predictions.append(
            {
                "fixture_date": pd.Timestamp(row.fixture_date).strftime("%Y-%m-%d"),
                "home_team": row.home_team,
                "away_team": row.away_team,
                "home_win": result["home_win"],
                "draw": result["draw"],
                "away_win": result["away_win"],
                "predicted_result": result["predicted_result"],
                "expected_home_goals": result["expected_goals"]["home"],
                "expected_away_goals": result["expected_goals"]["away"],
                "top_scores": "|".join(_excel_safe_score(score) for score in result["top_scores"]),
                "confidence": result["confidence"],
                "prediction_basis_date": result["prediction_date"],
                "catboost_predicted_result": result["model_predictions"]["catboost"]["outcome"],
                "catboost_predicted_score": _excel_safe_score(result["model_predictions"]["catboost"]["score"]),
                "xgboost_predicted_result": result["model_predictions"]["xgboost"]["outcome"],
                "xgboost_predicted_score": _excel_safe_score(result["model_predictions"]["xgboost"]["score"]),
                "poisson_predicted_result": result["model_predictions"]["poisson"]["outcome"],
                "poisson_predicted_score": _excel_safe_score(result["model_predictions"]["poisson"]["score"]),
                "ensemble_predicted_score": _excel_safe_score(result["model_predictions"]["ensemble"]["score"]),
            }
        )

    output = pd.DataFrame(predictions)
    return output


def export_fixture_predictions(fixtures_path: Path, season: str) -> dict[str, object]:
    fixtures = load_fixture_csv(fixtures_path)
    predictions = build_fixture_prediction_output(fixtures)

    season_slug = normalize_season_label(season)
    output_path = PROCESSED_DIR / f"predictions_{season_slug}.csv"
    summary_path = PROCESSED_DIR / f"predictions_{season_slug}_summary.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    predictions.to_csv(output_path, index=False)

    summary = {
        "season": season,
        "season_slug": season_slug,
        "rows": int(len(predictions)),
        "output_path": str(output_path),
        "output_filename": output_path.name,
        "summary_path": str(summary_path),
        "date_range": {
            "min": predictions["fixture_date"].min(),
            "max": predictions["fixture_date"].max(),
        },
    }
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary
