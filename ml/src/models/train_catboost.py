from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import joblib
import pandas as pd
from catboost import CatBoostClassifier
from sklearn.metrics import log_loss

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.models.model_utils import (
    CATEGORICAL_COLUMNS,
    ensure_output_dir,
    get_feature_columns,
    load_feature_data,
    prepare_feature_matrices,
    split_by_season,
)


def run_training(input_path: Path) -> dict[str, object]:
    df = load_feature_data(input_path)
    splits = split_by_season(df)
    feature_columns = get_feature_columns(df)
    features, targets = prepare_feature_matrices(splits, feature_columns)
    output_dir = ensure_output_dir()

    model = CatBoostClassifier(
        loss_function="MultiClass",
        eval_metric="MultiClass",
        iterations=600,
        depth=6,
        learning_rate=0.05,
        l2_leaf_reg=5.0,
        random_seed=42,
        verbose=False,
        train_dir=str(output_dir / "catboost_info"),
    )
    cat_feature_indices = [feature_columns.index(column) for column in CATEGORICAL_COLUMNS if column in feature_columns]
    model.fit(
        features["train"],
        targets["train"],
        cat_features=cat_feature_indices,
        eval_set=(features["validation"], targets["validation"]),
        use_best_model=True,
    )

    validation_pred = model.predict_proba(features["validation"])
    test_pred = model.predict_proba(features["test"])
    validation_log_loss = log_loss(targets["validation"], validation_pred, labels=[0, 1, 2])

    model.save_model(output_dir / "catboost_classifier.cbm")
    joblib.dump(
        {"feature_columns": feature_columns, "categorical_columns": CATEGORICAL_COLUMNS},
        output_dir / "catboost_metadata.joblib",
    )

    validation_predictions = splits["validation"][["Date", "Season", "HomeTeam", "AwayTeam", "Target"]].copy()
    validation_predictions[["AwayWinProb", "DrawProb", "HomeWinProb"]] = validation_pred
    validation_predictions.to_csv(output_dir / "catboost_validation_predictions.csv", index=False)

    test_predictions = splits["test"][["Date", "Season", "HomeTeam", "AwayTeam", "Target"]].copy()
    test_predictions[["AwayWinProb", "DrawProb", "HomeWinProb"]] = test_pred
    test_predictions.to_csv(output_dir / "catboost_test_predictions.csv", index=False)

    summary = {
        "train_rows": int(len(splits["train"])),
        "validation_rows": int(len(splits["validation"])),
        "test_rows": int(len(splits["test"])),
        "feature_count": int(len(feature_columns)),
        "best_iteration": int(model.get_best_iteration()),
        "validation_log_loss": float(validation_log_loss),
    }
    (output_dir / "catboost_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Train CatBoost classifier for match outcome prediction.")
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
