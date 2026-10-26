"""Train the v2 model bundle: correctness_v2 features, no odds, train-median imputation persisted for inference."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
import xgboost as xgb
from catboost import CatBoostClassifier

from src.models.input_parity_no_odds import no_odds_columns, training_fill_values
from src.models.model_utils import get_feature_columns, load_feature_data, split_by_season
from src.models.poisson_model import FEATURE_COLUMNS as POISSON_COLUMNS
from src.models.poisson_model import fit_poisson_models

ROOT = Path(__file__).resolve().parents[2]
FEATURES = ROOT / "data/processed/correctness_audit_v1/features_correctness_v2.csv"
OUT = ROOT / "models/saved_models_v2"
FEATURE_VERSION = "correctness_v2"


def fill(frame: pd.DataFrame, columns: list[str], values: dict[str, float]) -> pd.DataFrame:
    return pd.DataFrame(
        {column: pd.to_numeric(frame[column], errors="coerce").fillna(values[column]).astype(float) for column in columns},
        index=frame.index,
    )


def main() -> None:
    if OUT.exists() and any(OUT.iterdir()):
        raise FileExistsError(f"{OUT} already has artifacts; refusing to overwrite")
    OUT.mkdir(parents=True, exist_ok=True)

    splits = split_by_season(load_feature_data(FEATURES))
    columns = no_odds_columns(get_feature_columns(splits["train"]))
    fills = training_fill_values(splits["train"][columns], columns)
    metadata = dict(
        feature_columns=columns,
        categorical_columns=[],
        feature_version=FEATURE_VERSION,
        imputation_values=fills,
        odds_included=False,
        train_seasons="1993/94-2022/23",
        early_stopping_season="2023/24",
        random_seed=42,
    )
    x = {name: fill(frame, columns, fills) for name, frame in splits.items()}
    y = {name: frame.Target.astype(int) for name, frame in splits.items()}

    catboost = CatBoostClassifier(
        loss_function="MultiClass", eval_metric="MultiClass", iterations=600, depth=6, learning_rate=0.05,
        l2_leaf_reg=5.0, random_seed=42, verbose=False, train_dir=str(OUT / "catboost_info"),
    )
    catboost.fit(x["train"], y["train"], eval_set=(x["validation"], y["validation"]), use_best_model=True)
    catboost.save_model(OUT / "catboost_classifier.cbm")
    joblib.dump(metadata, OUT / "catboost_metadata.joblib")

    xgboost = xgb.XGBClassifier(
        objective="multi:softprob", num_class=3, n_estimators=500, max_depth=6, learning_rate=0.05, subsample=0.9,
        colsample_bytree=0.9, reg_lambda=1.0, random_state=42, tree_method="hist", eval_metric="mlogloss",
        early_stopping_rounds=30,
    )
    xgboost.fit(x["train"], y["train"], eval_set=[(x["validation"], y["validation"])], verbose=False)
    xgboost.save_model(OUT / "xgboost_classifier.json")
    joblib.dump(metadata, OUT / "xgboost_metadata.joblib")

    poisson_train = pd.concat([splits["train"], splits["validation"]], ignore_index=True)
    home_model, away_model, poisson_fills = fit_poisson_models(poisson_train)
    joblib.dump(
        dict(home_goals_model=home_model, away_goals_model=away_model, feature_columns=POISSON_COLUMNS,
             fill_values=poisson_fills.to_dict(), feature_version=FEATURE_VERSION),
        OUT / "poisson_model.joblib",
    )

    manifest = dict(
        created_utc=datetime.now(timezone.utc).isoformat(),
        feature_version=FEATURE_VERSION,
        features_file=str(FEATURES.relative_to(ROOT)),
        classifier_feature_count=len(columns),
        odds_included=False,
        train_rows=len(splits["train"]),
        validation_rows=len(splits["validation"]),
        untouched_test_seasons="2024/25, 2025/26",
        catboost_best_iteration=catboost.get_best_iteration(),
        xgboost_best_iteration=int(xgboost.best_iteration),
        poisson_train_rows=len(poisson_train),
    )
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
