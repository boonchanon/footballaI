from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from catboost import CatBoostClassifier

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.evaluation.metrics import evaluate_predictions
from src.models.model_utils import (
    CATEGORICAL_COLUMNS,
    ODDS_FEATURE_COLUMNS,
    ensure_output_dir,
    load_feature_data,
    prepare_feature_matrices,
    split_by_season,
    split_feature_sets,
)


def train_and_evaluate(
    splits: dict[str, object],
    feature_columns: list[str],
) -> dict[str, object]:
    features, targets = prepare_feature_matrices(splits, feature_columns)
    model = CatBoostClassifier(
        loss_function="MultiClass",
        eval_metric="MultiClass",
        iterations=600,
        depth=6,
        learning_rate=0.05,
        l2_leaf_reg=5.0,
        random_seed=42,
        verbose=False,
    )
    cat_feature_indices = [feature_columns.index(column) for column in CATEGORICAL_COLUMNS if column in feature_columns]
    model.fit(
        features["train"],
        targets["train"],
        cat_features=cat_feature_indices,
        eval_set=(features["validation"], targets["validation"]),
        use_best_model=True,
    )
    test_probabilities = model.predict_proba(features["test"])
    metrics = evaluate_predictions(targets["test"].to_numpy(), test_probabilities)
    metrics["feature_count"] = len(feature_columns)
    metrics["best_iteration"] = int(model.get_best_iteration())
    return metrics


def run_experiment(input_path: Path) -> dict[str, object]:
    df = load_feature_data(input_path)
    football_features, football_plus_odds_features = split_feature_sets(df)
    splits = split_by_season(df)

    experiment_a = train_and_evaluate(splits, football_features)
    experiment_b = train_and_evaluate(splits, football_plus_odds_features)

    deltas = {
        "accuracy_delta": experiment_b["accuracy"] - experiment_a["accuracy"],
        "log_loss_delta": experiment_b["log_loss"] - experiment_a["log_loss"],
        "brier_score_delta": experiment_b["brier_score"] - experiment_a["brier_score"],
    }
    odds_helped = (
        deltas["accuracy_delta"] > 0
        and deltas["log_loss_delta"] < 0
        and deltas["brier_score_delta"] < 0
    )

    return {
        "experiment_a_football_only": experiment_a,
        "experiment_b_football_plus_odds": experiment_b,
        "odds_feature_columns": ODDS_FEATURE_COLUMNS,
        "comparison": {
            **deltas,
            "odds_helped": odds_helped,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare football-only features vs football+odds features.")
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("data/processed/features_matches.csv"),
        help="Input feature dataset path.",
    )
    args = parser.parse_args()

    report = run_experiment(args.input)
    output_dir = ensure_output_dir()
    output_path = output_dir / "odds_feature_experiment.json"
    output_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"Report: {output_path}")


if __name__ == "__main__":
    main()
