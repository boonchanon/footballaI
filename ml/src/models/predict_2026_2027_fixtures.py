from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import pandas as pd
import requests
from bs4 import BeautifulSoup

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.models.predictor import DEFAULT_PREDICTION_DATE, load_models, predict_match


FIXTURES_URL = "https://www.premierleague.com/en/news/4675097/all-380-fixtures-for-202627-premier-league-season"
OUTPUT_PATH = PROJECT_ROOT / "data" / "processed" / "predictions_2026_2027_preseason.csv"
SUMMARY_PATH = PROJECT_ROOT / "data" / "processed" / "predictions_2026_2027_summary.json"

DATE_PATTERNS = (
    "%A %d %B %Y",
    "%A %d %B",
)


def _excel_safe_score(value: str) -> str:
    return f'="{value}"'


def fetch_fixture_lines(url: str) -> list[str]:
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "lxml")
    text = soup.get_text("\n")
    lines = [line.strip() for line in text.splitlines()]
    return [line for line in lines if line]


def _normalize_match_line(line: str) -> str:
    line = re.sub(r"^\d{1,2}:\d{2}\s+", "", line)
    line = re.sub(r"\s+\([^)]*\)$", "", line)
    line = re.sub(r"\*+$", "", line).strip()
    return line


def parse_fixtures(lines: list[str]) -> pd.DataFrame:
    fixtures: list[dict[str, object]] = []
    current_date: pd.Timestamp | None = None

    start_index = lines.index("Friday 21 August 2026")
    end_index = lines.index("Sunday 30 May")
    relevant_lines = lines[start_index : end_index + 11]

    for line in relevant_lines:
        parsed_date = None
        for date_pattern in DATE_PATTERNS:
            try:
                parsed_date = pd.to_datetime(line, format=date_pattern)
                break
            except ValueError:
                continue

        if parsed_date is not None:
            if parsed_date.year == 1900 and current_date is not None:
                parsed_date = parsed_date.replace(year=current_date.year)
                if parsed_date.month < current_date.month:
                    parsed_date = parsed_date.replace(year=current_date.year + 1)
            current_date = pd.Timestamp(parsed_date)
            continue

        if " v " not in line or current_date is None:
            continue
        if line.startswith("*") or line.startswith("**"):
            continue

        normalized = _normalize_match_line(line)
        if " v " not in normalized:
            continue
        home_team, away_team = normalized.split(" v ", maxsplit=1)
        fixtures.append(
            {
                "fixture_date": current_date.strftime("%Y-%m-%d"),
                "home_team": home_team.strip(),
                "away_team": away_team.strip(),
            }
        )

    frame = pd.DataFrame(fixtures).drop_duplicates()
    frame["fixture_date"] = pd.to_datetime(frame["fixture_date"])
    frame.sort_values(["fixture_date", "home_team", "away_team"], inplace=True)
    frame.reset_index(drop=True, inplace=True)
    return frame


def predict_fixtures(fixtures: pd.DataFrame) -> pd.DataFrame:
    models = load_models()
    predictions: list[dict[str, object]] = []

    for row in fixtures.itertuples(index=False):
        result = predict_match(
            models,
            home_team=row.home_team,
            away_team=row.away_team,
            prediction_date=DEFAULT_PREDICTION_DATE,
        )
        predictions.append(
            {
                "fixture_date": row.fixture_date.strftime("%Y-%m-%d"),
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
                "prediction_basis_date": DEFAULT_PREDICTION_DATE.strftime("%Y-%m-%d"),
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


def build_summary(predictions: pd.DataFrame) -> dict[str, object]:
    strongest_home = predictions.sort_values("home_win", ascending=False).head(10)[
        ["fixture_date", "home_team", "away_team", "home_win"]
    ]
    strongest_away = predictions.sort_values("away_win", ascending=False).head(10)[
        ["fixture_date", "home_team", "away_team", "away_win"]
    ]
    most_balanced = predictions.assign(balance=(predictions["home_win"] - predictions["away_win"]).abs()).sort_values(
        ["confidence", "balance"], ascending=[True, True]
    ).head(10)[["fixture_date", "home_team", "away_team", "home_win", "draw", "away_win", "confidence"]]

    return {
        "total_predictions": int(len(predictions)),
        "prediction_basis_date": DEFAULT_PREDICTION_DATE.strftime("%Y-%m-%d"),
        "source_url": FIXTURES_URL,
        "strongest_home_favorites": strongest_home.to_dict(orient="records"),
        "strongest_away_favorites": strongest_away.to_dict(orient="records"),
        "lowest_confidence_matches": most_balanced.to_dict(orient="records"),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Predict all announced 2026/27 Premier League fixtures.")
    parser.add_argument("--url", default=FIXTURES_URL, help="Official fixtures page URL.")
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH, help="CSV output path.")
    args = parser.parse_args()

    fixtures = parse_fixtures(fetch_fixture_lines(args.url))
    if len(fixtures) != 380:
        raise ValueError(f"Expected 380 fixtures, parsed {len(fixtures)}.")

    predictions = predict_fixtures(fixtures)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    predictions.to_csv(args.output, index=False)

    summary = build_summary(predictions)
    SUMMARY_PATH.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(json.dumps({"fixtures": len(fixtures), "output": str(args.output), "summary": str(SUMMARY_PATH)}, indent=2))


if __name__ == "__main__":
    main()
