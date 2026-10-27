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

from src.models.model_utils import load_feature_data, split_by_season
from src.models.poisson_model import score_matrix
from src.models.predictor import (
    _calibrate_score_matrix,
    _promote_draw_outcome,
    _score_to_outcome,
    _should_force_draw,
    _top_scores_from_matrix,
)


def _parse_score(score: str) -> tuple[int, int]:
    home_goals, away_goals = score.split("-", maxsplit=1)
    return int(home_goals), int(away_goals)


def _outcome_from_goals(home_goals: int, away_goals: int) -> str:
    if home_goals > away_goals:
        return "H"
    if home_goals < away_goals:
        return "A"
    return "D"


def _outcome_from_target(target: int) -> str:
    return {0: "A", 1: "D", 2: "H"}[int(target)]


def _build_test_frame(model_dir: Path, features_path: Path) -> pd.DataFrame:
    features = load_feature_data(features_path)
    test_df = split_by_season(features)["test"][
        ["Date", "Season", "HomeTeam", "AwayTeam", "Target", "HomeGoals", "AwayGoals"]
    ].copy()

    catboost = pd.read_csv(model_dir / "catboost_test_predictions.csv")
    xgboost = pd.read_csv(model_dir / "xgboost_test_predictions.csv")
    poisson = pd.read_csv(model_dir / "poisson_test_predictions.csv")
    for frame in (catboost, xgboost, poisson):
        frame["Date"] = pd.to_datetime(frame["Date"], errors="coerce")
    merge_keys = ["Date", "Season", "HomeTeam", "AwayTeam", "Target"]

    merged = test_df.merge(
        catboost[merge_keys + ["AwayWinProb", "DrawProb", "HomeWinProb"]],
        on=merge_keys,
        how="inner",
        suffixes=("", "_catboost"),
    )
    merged = merged.rename(
        columns={
            "AwayWinProb": "catboost_AwayWinProb",
            "DrawProb": "catboost_DrawProb",
            "HomeWinProb": "catboost_HomeWinProb",
        }
    )
    merged = merged.merge(
        xgboost[merge_keys + ["AwayWinProb", "DrawProb", "HomeWinProb"]],
        on=merge_keys,
        how="inner",
        suffixes=("", "_xgboost"),
    )
    merged = merged.rename(
        columns={
            "AwayWinProb": "xgboost_AwayWinProb",
            "DrawProb": "xgboost_DrawProb",
            "HomeWinProb": "xgboost_HomeWinProb",
        }
    )
    merged = merged.merge(
        poisson[
            merge_keys
            + [
                "AwayWinProb",
                "DrawProb",
                "HomeWinProb",
                "ExpectedHomeGoals",
                "ExpectedAwayGoals",
                "TopScores",
            ]
        ],
        on=merge_keys,
        how="inner",
    )
    merged = merged.rename(
        columns={
            "AwayWinProb": "poisson_AwayWinProb",
            "DrawProb": "poisson_DrawProb",
            "HomeWinProb": "poisson_HomeWinProb",
            "ExpectedHomeGoals": "expected_home_goals",
            "ExpectedAwayGoals": "expected_away_goals",
            "TopScores": "poisson_top_scores",
        }
    )
    return merged


def _generate_predictions(frame: pd.DataFrame) -> pd.DataFrame:
    rows: list[dict[str, object]] = []

    for row in frame.itertuples(index=False):
        catboost_prob = np.array(
            [row.catboost_AwayWinProb, row.catboost_DrawProb, row.catboost_HomeWinProb],
            dtype=float,
        )
        xgboost_prob = np.array(
            [row.xgboost_AwayWinProb, row.xgboost_DrawProb, row.xgboost_HomeWinProb],
            dtype=float,
        )
        poisson_prob = np.array(
            [row.poisson_AwayWinProb, row.poisson_DrawProb, row.poisson_HomeWinProb],
            dtype=float,
        )
        expected_home_goals = float(row.expected_home_goals)
        expected_away_goals = float(row.expected_away_goals)
        poisson_matrix = score_matrix(np.array([expected_home_goals]), np.array([expected_away_goals]))

        poisson_top_score = str(row.poisson_top_scores).split("|", maxsplit=1)[0]

        outcome_prob = 0.5 * catboost_prob + 0.5 * xgboost_prob
        outcome_prob = outcome_prob / outcome_prob.sum()
        outcome_prob = _promote_draw_outcome(outcome_prob, expected_home_goals, expected_away_goals)
        ensemble_prob = 0.75 * outcome_prob + 0.25 * poisson_prob
        ensemble_prob = ensemble_prob / ensemble_prob.sum()

        calibrated = _calibrate_score_matrix(
            poisson_matrix,
            ensemble_prob,
            expected_home_goals,
            expected_away_goals,
        )
        if _should_force_draw(ensemble_prob, expected_home_goals, expected_away_goals):
            draw_only = calibrated * np.eye(calibrated.shape[0], dtype=float)
            if draw_only.sum() > 0:
                calibrated = draw_only / draw_only.sum()
        calibrated_top = _top_scores_from_matrix(calibrated)
        calibrated_score = calibrated_top[0]

        rows.append(
            {
                "Date": row.Date,
                "Season": row.Season,
                "HomeTeam": row.HomeTeam,
                "AwayTeam": row.AwayTeam,
                "Target": int(row.Target),
                "HomeGoals": int(row.HomeGoals),
                "AwayGoals": int(row.AwayGoals),
                "actual_score": f"{int(row.HomeGoals)}-{int(row.AwayGoals)}",
                "actual_outcome": _outcome_from_target(int(row.Target)),
                "poisson_top1_score": poisson_top_score,
                "poisson_top1_outcome": _score_to_outcome(poisson_top_score),
                "calibrated_score": calibrated_score,
                "calibrated_outcome": _score_to_outcome(calibrated_score),
                "expected_home_goals": expected_home_goals,
                "expected_away_goals": expected_away_goals,
                "home_win_prob": float(ensemble_prob[2]),
                "draw_prob": float(ensemble_prob[1]),
                "away_win_prob": float(ensemble_prob[0]),
            }
        )

    return pd.DataFrame(rows)


def _evaluate_score_predictions(frame: pd.DataFrame, score_column: str, outcome_column: str) -> dict[str, object]:
    predicted_scores = frame[score_column].astype(str)
    actual_scores = frame["actual_score"].astype(str)
    predicted_pairs = predicted_scores.map(_parse_score)
    actual_pairs = actual_scores.map(_parse_score)

    exact_score_accuracy = float((predicted_scores == actual_scores).mean())
    outcome_accuracy = float((frame[outcome_column].astype(str) == frame["actual_outcome"].astype(str)).mean())
    goal_diff_accuracy = float(
        (
            predicted_pairs.map(lambda pair: pair[0] - pair[1])
            == actual_pairs.map(lambda pair: pair[0] - pair[1])
        ).mean()
    )
    total_goals_mae = float(
        np.mean(
            np.abs(
                predicted_pairs.map(lambda pair: pair[0] + pair[1]).to_numpy()
                - actual_pairs.map(lambda pair: pair[0] + pair[1]).to_numpy()
            )
        )
    )
    home_goals_mae = float(
        np.mean(
            np.abs(
                predicted_pairs.map(lambda pair: pair[0]).to_numpy()
                - actual_pairs.map(lambda pair: pair[0]).to_numpy()
            )
        )
    )
    away_goals_mae = float(
        np.mean(
            np.abs(
                predicted_pairs.map(lambda pair: pair[1]).to_numpy()
                - actual_pairs.map(lambda pair: pair[1]).to_numpy()
            )
        )
    )

    return {
        "exact_score_accuracy": exact_score_accuracy,
        "outcome_accuracy_from_score": outcome_accuracy,
        "goal_difference_accuracy": goal_diff_accuracy,
        "total_goals_mae": total_goals_mae,
        "home_goals_mae": home_goals_mae,
        "away_goals_mae": away_goals_mae,
    }


def run_backtest(model_dir: Path, features_path: Path, output_path: Path | None = None) -> dict[str, object]:
    test_frame = _build_test_frame(model_dir, features_path)
    predictions = _generate_predictions(test_frame)

    report = {
        "rows": int(len(predictions)),
        "seasons": sorted(predictions["Season"].unique().tolist()),
        "strategies": {
            "poisson_top1": _evaluate_score_predictions(predictions, "poisson_top1_score", "poisson_top1_outcome"),
            "calibrated_scoreline": _evaluate_score_predictions(predictions, "calibrated_score", "calibrated_outcome"),
        },
        "predicted_score_distribution": {
            "poisson_top1": predictions["poisson_top1_score"].value_counts().head(10).to_dict(),
            "calibrated_scoreline": predictions["calibrated_score"].value_counts().head(10).to_dict(),
        },
    }

    if output_path is not None:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    predictions_path = None
    if output_path is not None:
        predictions_path = output_path.with_name(output_path.stem + "_predictions.csv")
        predictions.to_csv(predictions_path, index=False)
        report["predictions_path"] = str(predictions_path)

    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Backtest scoreline prediction logics on the held-out test seasons.")
    parser.add_argument(
        "--model-dir",
        type=Path,
        default=PROJECT_ROOT / "models" / "saved_models",
        help="Directory containing saved test prediction files.",
    )
    parser.add_argument(
        "--features-path",
        type=Path,
        default=PROJECT_ROOT / "data" / "processed" / "features_matches.csv",
        help="Features dataset with actual goals.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=PROJECT_ROOT / "data" / "processed" / "scoreline_backtest_report.json",
        help="JSON output report path.",
    )
    args = parser.parse_args()

    report = run_backtest(args.model_dir, args.features_path, args.output)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
