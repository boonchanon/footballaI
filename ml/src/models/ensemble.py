from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.models.model_utils import ensure_output_dir


WEIGHTS = {
    "catboost": 0.4,
    "xgboost": 0.4,
    "poisson": 0.2,
}


def _load_prediction_frame(path: Path, prefix: str) -> pd.DataFrame:
    frame = pd.read_csv(path)
    rename_map = {
        "AwayWinProb": f"{prefix}_AwayWinProb",
        "DrawProb": f"{prefix}_DrawProb",
        "HomeWinProb": f"{prefix}_HomeWinProb",
    }
    if "ExpectedHomeGoals" in frame.columns:
        rename_map["ExpectedHomeGoals"] = f"{prefix}_ExpectedHomeGoals"
        rename_map["ExpectedAwayGoals"] = f"{prefix}_ExpectedAwayGoals"
        rename_map["TopScores"] = f"{prefix}_TopScores"
    return frame.rename(columns=rename_map)


def build_ensemble(model_dir: Path) -> dict[str, object]:
    catboost = _load_prediction_frame(model_dir / "catboost_test_predictions.csv", "catboost")
    xgboost = _load_prediction_frame(model_dir / "xgboost_test_predictions.csv", "xgboost")
    poisson = _load_prediction_frame(model_dir / "poisson_test_predictions.csv", "poisson")

    merge_keys = ["Date", "Season", "HomeTeam", "AwayTeam", "Target"]
    merged = catboost.merge(xgboost, on=merge_keys, how="inner")
    merged = merged.merge(poisson, on=merge_keys, how="inner")

    merged["AwayWinProb"] = (
        WEIGHTS["catboost"] * merged["catboost_AwayWinProb"]
        + WEIGHTS["xgboost"] * merged["xgboost_AwayWinProb"]
        + WEIGHTS["poisson"] * merged["poisson_AwayWinProb"]
    )
    merged["DrawProb"] = (
        WEIGHTS["catboost"] * merged["catboost_DrawProb"]
        + WEIGHTS["xgboost"] * merged["xgboost_DrawProb"]
        + WEIGHTS["poisson"] * merged["poisson_DrawProb"]
    )
    merged["HomeWinProb"] = (
        WEIGHTS["catboost"] * merged["catboost_HomeWinProb"]
        + WEIGHTS["xgboost"] * merged["xgboost_HomeWinProb"]
        + WEIGHTS["poisson"] * merged["poisson_HomeWinProb"]
    )
    merged["ProbSum"] = merged["AwayWinProb"] + merged["DrawProb"] + merged["HomeWinProb"]
    merged["AwayWinProb"] = merged["AwayWinProb"] / merged["ProbSum"]
    merged["DrawProb"] = merged["DrawProb"] / merged["ProbSum"]
    merged["HomeWinProb"] = merged["HomeWinProb"] / merged["ProbSum"]

    merged["ExpectedHomeGoals"] = merged["poisson_ExpectedHomeGoals"]
    merged["ExpectedAwayGoals"] = merged["poisson_ExpectedAwayGoals"]
    merged["TopScores"] = merged["poisson_TopScores"]
    merged["ConfidenceScore"] = merged[["AwayWinProb", "DrawProb", "HomeWinProb"]].max(axis=1)
    merged["PredictedClass"] = merged[["AwayWinProb", "DrawProb", "HomeWinProb"]].to_numpy().argmax(axis=1)

    output_columns = [
        "Date",
        "Season",
        "HomeTeam",
        "AwayTeam",
        "Target",
        "PredictedClass",
        "AwayWinProb",
        "DrawProb",
        "HomeWinProb",
        "ExpectedHomeGoals",
        "ExpectedAwayGoals",
        "TopScores",
        "ConfidenceScore",
    ]
    predictions = merged[output_columns].copy()
    predictions.to_csv(model_dir / "ensemble_test_predictions.csv", index=False)

    summary = {
        "rows": int(len(predictions)),
        "weights": WEIGHTS,
        "average_confidence": float(predictions["ConfidenceScore"].mean()),
    }
    (model_dir / "ensemble_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Build weighted ensemble predictions from saved model outputs.")
    parser.add_argument(
        "--model-dir",
        type=Path,
        default=ensure_output_dir(),
        help="Directory containing saved model prediction files.",
    )
    args = parser.parse_args()
    summary = build_ensemble(args.model_dir)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
