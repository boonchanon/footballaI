from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from scipy.stats import poisson
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import PoissonRegressor

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.models.model_utils import ensure_output_dir, load_feature_data, split_by_season


FEATURE_COLUMNS = [
    "HomeEloPre",
    "AwayEloPre",
    "EloDiffPre",
    "HomeGoalsForAvgPre",
    "AwayGoalsForAvgPre",
    "HomeGoalsAgainstAvgPre",
    "AwayGoalsAgainstAvgPre",
    "HomeShotsTargetForAvgPre",
    "AwayShotsTargetForAvgPre",
    "HomePointsAvgLast5",
    "AwayPointsAvgLast5",
    "AttackRatingDiff",
    "DefenseRatingDiff",
    "RestDaysDiff",
    "H2HPointsDiffPre",
    "H2HPointsDiffLast3Pre",
    "H2HGoalsDiffLast3Pre",
    "H2HLastMeetingGoalDiffPre",
    "H2HLastMeetingTotalGoalsPre",
    "H2HLastMeetingHomePointsPre",
]


def _prepare_matrix(frame: pd.DataFrame, fill_values: pd.Series | None = None) -> tuple[pd.DataFrame, pd.Series]:
    matrix = frame[FEATURE_COLUMNS].apply(pd.to_numeric, errors="coerce")
    if fill_values is None:
        fill_values = matrix.median(numeric_only=True)
    matrix = matrix.fillna(fill_values)
    return matrix, fill_values


def fit_poisson_models(train_df: pd.DataFrame) -> tuple[Pipeline, Pipeline, pd.Series]:
    x_train, fill_values = _prepare_matrix(train_df)
    home_model = Pipeline(
        [
            ("scaler", StandardScaler()),
            ("regressor", PoissonRegressor(alpha=0.1, max_iter=3000)),
        ]
    )
    away_model = Pipeline(
        [
            ("scaler", StandardScaler()),
            ("regressor", PoissonRegressor(alpha=0.1, max_iter=3000)),
        ]
    )
    home_model.fit(x_train, train_df["HomeGoals"].astype(float))
    away_model.fit(x_train, train_df["AwayGoals"].astype(float))
    return home_model, away_model, fill_values


def score_matrix(home_goals_rate: np.ndarray, away_goals_rate: np.ndarray, max_goals: int = 6) -> np.ndarray:
    home_grid = np.arange(max_goals + 1)
    away_grid = np.arange(max_goals + 1)
    score_probabilities = np.zeros((len(home_goals_rate), max_goals + 1, max_goals + 1))
    for idx, (home_lambda, away_lambda) in enumerate(zip(home_goals_rate, away_goals_rate)):
        home_probs = poisson.pmf(home_grid, mu=max(home_lambda, 1e-6))
        away_probs = poisson.pmf(away_grid, mu=max(away_lambda, 1e-6))
        score_probabilities[idx] = np.outer(home_probs, away_probs)
        score_probabilities[idx] = score_probabilities[idx] / score_probabilities[idx].sum()
    return score_probabilities


def predict_outcome_probabilities(score_probabilities: np.ndarray) -> np.ndarray:
    home_win = np.tril(score_probabilities, k=-1).sum(axis=(1, 2))
    draw = np.trace(score_probabilities, axis1=1, axis2=2)
    away_win = np.triu(score_probabilities, k=1).sum(axis=(1, 2))
    return np.column_stack([away_win, draw, home_win])


def build_top_scores(score_probabilities: np.ndarray, top_k: int = 3) -> list[list[str]]:
    max_goals = score_probabilities.shape[1] - 1
    labels = [(h, a) for h in range(max_goals + 1) for a in range(max_goals + 1)]
    outputs: list[list[str]] = []
    for matrix in score_probabilities:
        flat = matrix.reshape(-1)
        top_indices = np.argsort(flat)[::-1][:top_k]
        outputs.append([f"{labels[idx][0]}-{labels[idx][1]}" for idx in top_indices])
    return outputs


def run_training(input_path: Path) -> dict[str, object]:
    df = load_feature_data(input_path)
    splits = split_by_season(df)
    train_df = pd.concat([splits["train"], splits["validation"]], ignore_index=True)
    test_df = splits["test"].copy()

    home_model, away_model, fill_values = fit_poisson_models(train_df)
    x_test, _ = _prepare_matrix(test_df, fill_values)

    expected_home_goals = np.clip(home_model.predict(x_test), 0.05, None)
    expected_away_goals = np.clip(away_model.predict(x_test), 0.05, None)
    score_probabilities = score_matrix(expected_home_goals, expected_away_goals)
    outcome_probabilities = predict_outcome_probabilities(score_probabilities)

    predictions = test_df[["Date", "Season", "HomeTeam", "AwayTeam", "Target"]].copy()
    predictions["ExpectedHomeGoals"] = expected_home_goals
    predictions["ExpectedAwayGoals"] = expected_away_goals
    predictions["AwayWinProb"] = outcome_probabilities[:, 0]
    predictions["DrawProb"] = outcome_probabilities[:, 1]
    predictions["HomeWinProb"] = outcome_probabilities[:, 2]
    predictions["TopScores"] = ["|".join(scores) for scores in build_top_scores(score_probabilities)]

    output_dir = ensure_output_dir()
    joblib.dump(
        {
            "home_goals_model": home_model,
            "away_goals_model": away_model,
            "feature_columns": FEATURE_COLUMNS,
            "fill_values": fill_values.to_dict(),
        },
        output_dir / "poisson_model.joblib",
    )
    predictions.to_csv(output_dir / "poisson_test_predictions.csv", index=False)

    summary = {
        "train_rows": int(len(train_df)),
        "test_rows": int(len(test_df)),
        "feature_columns": FEATURE_COLUMNS,
        "avg_expected_home_goals": float(np.mean(expected_home_goals)),
        "avg_expected_away_goals": float(np.mean(expected_away_goals)),
    }
    (output_dir / "poisson_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Train Poisson goal models for expected goals.")
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("data/processed/features_matches.csv"),
        help="Input features dataset path.",
    )
    args = parser.parse_args()
    summary = run_training(args.input)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
