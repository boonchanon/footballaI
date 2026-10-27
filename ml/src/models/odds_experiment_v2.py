from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pandas as pd
import xgboost as xgb
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
)


TRAIN_SEASONS = [f"{year}/{(year + 1) % 100:02d}" for year in range(2002, 2023)]
VALIDATION_SEASONS = ["2023/24"]
TEST_SEASONS = ["2024/25", "2025/26"]
ODDS_DERIVED_COLUMNS = ODDS_FEATURE_COLUMNS + [
    "market_favorite_prob",
    "market_confidence",
    "market_prob_difference",
]


def split_dataset_v2(df: pd.DataFrame) -> dict[str, pd.DataFrame]:
    eligible_seasons = set(TRAIN_SEASONS + VALIDATION_SEASONS + TEST_SEASONS)
    filtered = df[df["Season"].isin(eligible_seasons)].copy()
    return {
        "train": filtered[filtered["Season"].isin(TRAIN_SEASONS)].copy(),
        "validation": filtered[filtered["Season"].isin(VALIDATION_SEASONS)].copy(),
        "test": filtered[filtered["Season"].isin(TEST_SEASONS)].copy(),
    }


def build_feature_sets(df: pd.DataFrame) -> tuple[list[str], list[str]]:
    excluded_columns = {
        "Date",
        "Season",
        "Div",
        "Time",
        "HomeTeam",
        "AwayTeam",
        "Result",
        "SourceFile",
        "Target",
        "MatchId",
        "HomeGoals",
        "AwayGoals",
        "HTHomeGoals",
        "HTAwayGoals",
        "HTResult",
        "Referee",
        "HomeShots",
        "AwayShots",
        "HomeShotsTarget",
        "AwayShotsTarget",
        "HomeFouls",
        "AwayFouls",
        "HomeCorners",
        "AwayCorners",
        "HomeYellow",
        "AwayYellow",
        "HomeRed",
        "AwayRed",
        "B365H",
        "B365D",
        "B365A",
        "HomeWin",
        "Draw",
        "AwayWin",
    }
    all_features = sorted(column for column in df.columns if column not in excluded_columns)
    football_only = [column for column in all_features if column not in ODDS_DERIVED_COLUMNS]
    football_plus_odds = list(all_features)
    return football_only, football_plus_odds


def train_catboost(splits: dict[str, pd.DataFrame], feature_columns: list[str]) -> tuple[dict[str, object], pd.DataFrame]:
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
    probabilities = model.predict_proba(features["test"])
    metrics = evaluate_predictions(targets["test"].to_numpy(), probabilities)
    metrics["feature_count"] = len(feature_columns)
    metrics["best_iteration"] = int(model.get_best_iteration())
    prediction_frame = splits["test"][["Date", "Season", "HomeTeam", "AwayTeam", "Target"]].copy()
    prediction_frame[["AwayWinProb", "DrawProb", "HomeWinProb"]] = probabilities
    return metrics, prediction_frame


def train_xgboost(splits: dict[str, pd.DataFrame], feature_columns: list[str]) -> tuple[dict[str, object], pd.DataFrame]:
    features, targets = prepare_feature_matrices(splits, feature_columns)
    encoded_features = {name: frame.copy() for name, frame in features.items()}
    for column in CATEGORICAL_COLUMNS:
        if column not in feature_columns:
            continue
        categories = sorted(encoded_features["train"][column].astype(str).unique().tolist())
        if "Unknown" not in categories:
            categories.append("Unknown")
        for split_name, frame in encoded_features.items():
            values = frame[column].astype(str)
            values = values.where(values.isin(categories), "Unknown")
            frame[column] = pd.Categorical(values, categories=categories)

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
    probabilities = model.predict_proba(encoded_features["test"])
    metrics = evaluate_predictions(targets["test"].to_numpy(), probabilities)
    metrics["feature_count"] = len(feature_columns)
    metrics["best_iteration"] = int(model.best_iteration)
    prediction_frame = splits["test"][["Date", "Season", "HomeTeam", "AwayTeam", "Target"]].copy()
    prediction_frame[["AwayWinProb", "DrawProb", "HomeWinProb"]] = probabilities
    return metrics, prediction_frame


def build_ensemble(catboost_predictions: pd.DataFrame, xgboost_predictions: pd.DataFrame) -> dict[str, object]:
    merged = catboost_predictions.merge(
        xgboost_predictions,
        on=["Date", "Season", "HomeTeam", "AwayTeam", "Target"],
        suffixes=("_catboost", "_xgboost"),
    )
    ensemble_probabilities = (
        merged[["AwayWinProb_catboost", "DrawProb_catboost", "HomeWinProb_catboost"]].to_numpy()
        + merged[["AwayWinProb_xgboost", "DrawProb_xgboost", "HomeWinProb_xgboost"]].to_numpy()
    ) / 2.0
    return evaluate_predictions(merged["Target"].to_numpy(), ensemble_probabilities)


def compare_metric_sets(base: dict[str, object], with_odds: dict[str, object]) -> dict[str, object]:
    comparison = {}
    for model_name in ("catboost", "xgboost", "ensemble"):
        comparison[model_name] = {
            "accuracy_delta": with_odds[model_name]["accuracy"] - base[model_name]["accuracy"],
            "log_loss_delta": with_odds[model_name]["log_loss"] - base[model_name]["log_loss"],
            "brier_score_delta": with_odds[model_name]["brier_score"] - base[model_name]["brier_score"],
            "odds_helped": (
                with_odds[model_name]["accuracy"] > base[model_name]["accuracy"]
                and with_odds[model_name]["log_loss"] < base[model_name]["log_loss"]
                and with_odds[model_name]["brier_score"] < base[model_name]["brier_score"]
            ),
        }
    return comparison


def run_experiment(input_path: Path) -> dict[str, object]:
    df = load_feature_data(input_path)
    football_only_features, football_plus_odds_features = build_feature_sets(df)
    splits = split_dataset_v2(df)

    experiment_a_catboost, experiment_a_catboost_predictions = train_catboost(splits, football_only_features)
    experiment_a_xgboost, experiment_a_xgboost_predictions = train_xgboost(splits, football_only_features)
    experiment_a_ensemble = build_ensemble(experiment_a_catboost_predictions, experiment_a_xgboost_predictions)

    experiment_b_catboost, experiment_b_catboost_predictions = train_catboost(splits, football_plus_odds_features)
    experiment_b_xgboost, experiment_b_xgboost_predictions = train_xgboost(splits, football_plus_odds_features)
    experiment_b_ensemble = build_ensemble(experiment_b_catboost_predictions, experiment_b_xgboost_predictions)

    experiment_a = {
        "catboost": experiment_a_catboost,
        "xgboost": experiment_a_xgboost,
        "ensemble": experiment_a_ensemble,
        "feature_count": len(football_only_features),
    }
    experiment_b = {
        "catboost": experiment_b_catboost,
        "xgboost": experiment_b_xgboost,
        "ensemble": experiment_b_ensemble,
        "feature_count": len(football_plus_odds_features),
    }

    return {
        "dataset_window": {
            "train": {"seasons": TRAIN_SEASONS, "rows": len(splits["train"])},
            "validation": {"seasons": VALIDATION_SEASONS, "rows": len(splits["validation"])},
            "test": {"seasons": TEST_SEASONS, "rows": len(splits["test"])},
        },
        "odds_feature_columns": ODDS_DERIVED_COLUMNS,
        "ensemble_definition": "Soft voting average of CatBoost and XGBoost probabilities.",
        "experiment_a_football_only": experiment_a,
        "experiment_b_football_plus_betting_odds": experiment_b,
        "comparison": compare_metric_sets(experiment_a, experiment_b),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Controlled betting odds experiment from 2002/03 onward.")
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("data/processed/features_matches.csv"),
        help="Input feature dataset path.",
    )
    args = parser.parse_args()

    report = run_experiment(args.input)
    output_dir = ensure_output_dir()
    output_path = output_dir / "odds_experiment_v2.json"
    output_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"Report: {output_path}")


if __name__ == "__main__":
    main()
