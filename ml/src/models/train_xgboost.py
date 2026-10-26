from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import joblib
import pandas as pd
import xgboost as xgb
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

    encoded_features = {name: frame.copy() for name, frame in features.items()}
    category_maps: dict[str, list[str]] = {}
    for column in CATEGORICAL_COLUMNS:
        if column not in feature_columns:
            continue
        categories = sorted(encoded_features["train"][column].astype(str).unique().tolist())
        if "Unknown" not in categories:
            categories.append("Unknown")
        category_maps[column] = categories
        for split_name, frame in encoded_features.items():
            frame[column] = pd.Categorical(frame[column].astype(str), categories=categories)

    model = xgb.XGBClassifier(
        objective="multi:softprob",
        num_class=3,
        n_estimators=500,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        reg_lambda=1.0,
        random_state=42,
        tree_method="hist",
        enable_categorical=True,
        eval_metric="mlogloss",
        early_stopping_rounds=30,
    )
    model.fit(
        encoded_features["train"],
        targets["train"],
        eval_set=[(encoded_features["validation"], targets["validation"])],
        verbose=False,
    )

    validation_pred = model.predict_proba(encoded_features["validation"])
    test_pred = model.predict_proba(encoded_features["test"])
    validation_log_loss = log_loss(targets["validation"], validation_pred, labels=[0, 1, 2])

    output_dir = ensure_output_dir()
    model.save_model(output_dir / "xgboost_classifier.json")
    joblib.dump(
        {"feature_columns": feature_columns, "categorical_columns": CATEGORICAL_COLUMNS, "category_maps": category_maps},
        output_dir / "xgboost_metadata.joblib",
    )

    validation_predictions = splits["validation"][["Date", "Season", "HomeTeam", "AwayTeam", "Target"]].copy()
    validation_predictions[["AwayWinProb", "DrawProb", "HomeWinProb"]] = validation_pred
    validation_predictions.to_csv(output_dir / "xgboost_validation_predictions.csv", index=False)

    test_predictions = splits["test"][["Date", "Season", "HomeTeam", "AwayTeam", "Target"]].copy()
    test_predictions[["AwayWinProb", "DrawProb", "HomeWinProb"]] = test_pred
    test_predictions.to_csv(output_dir / "xgboost_test_predictions.csv", index=False)

    summary = {
        "train_rows": int(len(splits["train"])),
        "validation_rows": int(len(splits["validation"])),
        "test_rows": int(len(splits["test"])),
        "feature_count": int(len(feature_columns)),
        "best_iteration": int(model.best_iteration),
        "validation_log_loss": float(validation_log_loss),
    }
    (output_dir / "xgboost_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Train XGBoost classifier for match outcome prediction.")
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
