"""Train isolated classifiers with identical hyperparameters and train-only fills."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from catboost import CatBoostClassifier
import xgboost as xgb

from src.models.input_parity_no_odds import FEATURE_VERSION, no_odds_columns, prepare, training_fill_values
from src.models.model_utils import get_feature_columns, load_feature_data, split_by_season

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data/processed/input_parity_no_odds_v1"


def main():
    if not (OUT / "baseline_manifest.json").exists():
        raise FileNotFoundError("Freeze baseline first")
    files = [OUT / x for x in ("catboost_no_odds.cbm", "catboost_metadata.joblib", "xgboost_no_odds.json", "xgboost_metadata.joblib")]
    if any(path.exists() for path in files):
        raise FileExistsError("Experimental artifacts exist; refusing overwrite")
    splits = split_by_season(load_feature_data(ROOT / "data/processed/features_matches.csv"))
    columns = no_odds_columns(get_feature_columns(splits["train"]))
    assert len(columns) == 123
    fill_values = training_fill_values(splits["train"][columns], columns)
    metadata = dict(feature_columns=columns, feature_version=FEATURE_VERSION, imputation_values=fill_values,
                    imputation_policy="numeric train median; fallback 0 only if train column entirely missing",
                    odds_included=False, train_seasons="1993/94-2022/23", random_seed=42)
    features = {name: prepare(frame[columns], metadata) for name, frame in splits.items()}
    labels = {name: frame.Target.astype(int) for name, frame in splits.items()}
    cb = CatBoostClassifier(loss_function="MultiClass", eval_metric="MultiClass", iterations=600,
                            depth=6, learning_rate=0.05, l2_leaf_reg=5.0, random_seed=42,
                            verbose=False, train_dir=str(OUT / "catboost_info"))
    cb.fit(features["train"], labels["train"], cat_features=[],
           eval_set=(features["validation"], labels["validation"]), use_best_model=True)
    cb.save_model(files[0]); joblib.dump(metadata, files[1])
    xb = xgb.XGBClassifier(objective="multi:softprob", num_class=3, n_estimators=500, max_depth=6,
                           learning_rate=0.05, subsample=0.9, colsample_bytree=0.9,
                           reg_lambda=1.0, random_state=42, tree_method="hist", enable_categorical=True,
                           eval_metric="mlogloss", early_stopping_rounds=30)
    xb.fit(features["train"], labels["train"], eval_set=[(features["validation"], labels["validation"])], verbose=False)
    xb.save_model(files[2]); joblib.dump(metadata, files[3])
    report = dict(experiment="input_parity_no_odds_v1", created_utc=datetime.now(timezone.utc).isoformat(),
                  feature_version=FEATURE_VERSION, odds_included=False, feature_count=len(columns),
                  imputation_policy=metadata["imputation_policy"], train_rows=len(splits["train"]),
                  validation_rows=len(splits["validation"]), diagnostic_rows=len(splits["test"]),
                  catboost_best_iteration=cb.get_best_iteration(), xgboost_best_iteration=xb.best_iteration,
                  artifacts=[str(path.relative_to(ROOT)) for path in files])
    (OUT / "training_manifest.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
