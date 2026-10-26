"""Isolated Poisson-objective goal-count regressors for Phase 3."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from catboost import CatBoostRegressor
import xgboost as xgb

from src.models.input_parity_no_odds import FEATURE_VERSION, ODDS_COLUMNS, prepare
from src.models.model_utils import load_feature_data, split_by_season
from src.evaluation.input_parity_no_odds_v1 import evaluate
from catboost import CatBoostClassifier

ROOT = Path(__file__).resolve().parents[2]
PHASE2 = ROOT / "data/processed/input_parity_no_odds_v1"
OUT = ROOT / "data/processed/ml_goal_rates_v1"
ARTIFACTS = ("xgb_home.json", "xgb_away.json", "cat_home.cbm", "cat_away.cbm", "metadata.joblib")
TARGETS = ("HomeGoals", "AwayGoals")
FLOOR = 0.05  # Fixed validity floor, same as production Poisson path.


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_splits():
    splits = split_by_season(load_feature_data(ROOT / "data/processed/features_matches.csv"))
    assert len(splits["train"]) == 11564 and len(splits["validation"]) == 380 and len(splits["test"]) == 760
    for name, frame in splits.items():
        for target in TARGETS:
            if frame[target].isna().any() or (frame[target] < 0).any():
                raise ValueError(f"Invalid {target} in {name}")
    return splits


def baseline_freeze():
    if OUT.exists():
        raise FileExistsError("Refusing to overwrite Phase 3 output")
    old = json.loads((PHASE2 / "comparison.json").read_text(encoding="utf-8"))
    if old["experimental"]["exact_hits"] != 75:
        raise ValueError("Phase 2 result does not say 75/760")
    for relative, expected in old["artifact_sha256"].items():
        if sha(ROOT / relative) != expected:
            raise ValueError(f"Phase 2 artifact changed: {relative}")
    splits = load_splits()
    test = splits["test"]
    meta = joblib.load(PHASE2 / "catboost_metadata.joblib")
    if meta != joblib.load(PHASE2 / "xgboost_metadata.joblib") or meta["feature_version"] != FEATURE_VERSION:
        raise ValueError("Phase 2 metadata mismatch")
    features = prepare(test[meta["feature_columns"]], meta)
    cb = CatBoostClassifier(); cb.load_model(PHASE2 / "catboost_no_odds.cbm")
    xb = xgb.XGBClassifier(); xb.load_model(PHASE2 / "xgboost_no_odds.json")
    rates = np.load(PHASE2 / "frozen_rates.npy")
    reproduced = evaluate(test, rates, cb.predict_proba(features), xb.predict_proba(features))
    frozen = __import__("pandas").read_csv(PHASE2 / "experiment_matches.csv")
    if int(reproduced.ExactCorrect.sum()) != 75 or not (reproduced.PredictedScore.to_numpy() == frozen.PredictedScore.to_numpy()).all():
        raise ValueError("Cannot reproduce Phase 2 scores exactly")
    if not np.allclose(rates, frozen[["lambda_home", "lambda_away"]].to_numpy(), rtol=0, atol=1e-12):
        raise ValueError("Phase 2 goal-rate mismatch")
    OUT.mkdir(parents=True)
    manifest = dict(experiment="ml_goal_rates_v1", created_utc=datetime.now(timezone.utc).isoformat(),
                    phase2_exact_hits=75, phase2_matches=760, feature_version=FEATURE_VERSION,
                    imputation_policy=meta["imputation_policy"], baseline_path=old["path"],
                    phase2_artifact_sha256=old["artifact_sha256"],
                    phase2_match_sha256=sha(PHASE2 / "experiment_matches.csv"),
                    phase2_rates_sha256=sha(PHASE2 / "frozen_rates.npy"),
                    feature_data_sha256=sha(ROOT / "data/processed/features_matches.csv"),
                    code_sha256={str(p.relative_to(ROOT)):sha(p) for p in [ROOT / "src/models/predictor.py",
                        ROOT / "src/models/poisson_model.py", ROOT / "src/evaluation/input_parity_no_odds_v1.py",
                        ROOT / "src/models/input_parity_no_odds.py", ROOT / "src/models/ml_goal_rates_v1.py"]},
                    train_seasons="1993/94-2022/23", train_dates="1993-08-14 to 2023-05-28",
                    validation_seasons="2023/24", validation_dates="2023-08-11 to 2024-05-19",
                    diagnostic_seasons="2024/25-2025/26", diagnostic_dates="2024-08-16 to 2026-05-24",
                    match_count=len(test), prediction_logic="Phase 2 same-match feature rows and classifiers; only source of lambdas changes")
    (OUT / "baseline_freeze.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print("Phase 2 reproduced: 75/760, zero score mismatches")


def train():
    if not (OUT / "baseline_freeze.json").exists():
        raise FileNotFoundError("Freeze Phase 2 baseline first")
    if any((OUT / name).exists() for name in ARTIFACTS):
        raise FileExistsError("Experimental model exists; refusing overwrite")
    frozen = json.loads((OUT / "baseline_freeze.json").read_text(encoding="utf-8"))
    if sha(ROOT / "data/processed/features_matches.csv") != frozen["feature_data_sha256"]:
        raise ValueError("Training source data changed after baseline freeze")
    splits = load_splits()
    phase2_meta = joblib.load(PHASE2 / "catboost_metadata.joblib")
    columns = phase2_meta["feature_columns"]
    if len(columns) != 123 or any(name in ODDS_COLUMNS for name in columns):
        raise ValueError("Phase 2 no-odds feature list invalid")
    matrices = {name: prepare(frame[columns], phase2_meta) for name, frame in splits.items()}
    model_meta = dict(experiment="ml_goal_rates_v1", feature_columns=columns,
                      feature_version=FEATURE_VERSION, imputation_values=phase2_meta["imputation_values"],
                      imputation_policy=phase2_meta["imputation_policy"], odds_included=False,
                      target_columns=dict(home="HomeGoals", away="AwayGoals"), lambda_floor=FLOOR,
                      train_seasons=frozen["train_seasons"], validation_seasons=frozen["validation_seasons"],
                      random_seed=42, objective=dict(xgb="count:poisson", cat="Poisson"),
                      xgb_hyperparameters=dict(n_estimators=500, max_depth=6, learning_rate=0.05,
                                               subsample=0.9, colsample_bytree=0.9, reg_lambda=1.0,
                                               tree_method="hist", early_stopping_rounds=30),
                      cat_hyperparameters=dict(iterations=600, depth=6, learning_rate=0.05, l2_leaf_reg=5.0))
    runs = {}
    for side, target in zip(("home", "away"), TARGETS):
        y_train = splits["train"][target].astype(float)
        y_val = splits["validation"][target].astype(float)
        xm = xgb.XGBRegressor(objective="count:poisson", eval_metric="poisson-nloglik",
                              random_state=42, enable_categorical=True, **model_meta["xgb_hyperparameters"])
        xm.fit(matrices["train"], y_train, eval_set=[(matrices["validation"], y_val)], verbose=False)
        xm.save_model(OUT / f"xgb_{side}.json")
        cm = CatBoostRegressor(loss_function="Poisson", eval_metric="Poisson", random_seed=42,
                               verbose=False, train_dir=str(OUT / f"catboost_{side}_info"),
                               **model_meta["cat_hyperparameters"])
        cm.fit(matrices["train"], y_train, eval_set=(matrices["validation"], y_val),
               use_best_model=True)
        cm.save_model(OUT / f"cat_{side}.cbm")
        runs[side] = dict(xgb_best_iteration=int(xm.best_iteration), cat_best_iteration=int(cm.get_best_iteration()))
    joblib.dump(model_meta, OUT / "metadata.joblib")
    report = dict(experiment="ml_goal_rates_v1", created_utc=datetime.now(timezone.utc).isoformat(),
                  feature_count=len(columns), train_rows=len(splits["train"]),
                  validation_rows=len(splits["validation"]), diagnostic_rows=len(splits["test"]),
                  targets=model_meta["target_columns"], objectives=model_meta["objective"],
                  runs=runs, artifacts={name:sha(OUT / name) for name in ARTIFACTS})
    (OUT / "training_manifest.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


def positive_rates(values):
    array = np.asarray(values, dtype=float)
    if array.ndim != 2 or array.shape[1] != 2 or not np.isfinite(array).all():
        raise ValueError("Invalid goal-rate array")
    if (array < 0).any():
        raise ValueError("Negative goal-rate estimate")
    return np.maximum(array, FLOOR)


def predict_rates(features):
    metadata = joblib.load(OUT / "metadata.joblib")
    if list(features.columns) != metadata["feature_columns"] or metadata["feature_version"] != FEATURE_VERSION:
        raise ValueError("Goal-rate inference feature mismatch")
    if any(name in ODDS_COLUMNS for name in features.columns):
        raise ValueError("Odds supplied to goal-rate model")
    prepared = prepare(features, metadata)
    rates = {}
    for family in ("xgb", "cat"):
        pair = []
        for side in ("home", "away"):
            if family == "xgb":
                model = xgb.XGBRegressor(); model.load_model(OUT / f"xgb_{side}.json")
                if model.get_booster().feature_names != metadata["feature_columns"]:
                    raise ValueError("XGB model feature mismatch")
            else:
                model = CatBoostRegressor(); model.load_model(OUT / f"cat_{side}.cbm")
                if list(model.feature_names_) != metadata["feature_columns"]:
                    raise ValueError("CatBoost model feature mismatch")
            pair.append(model.predict(prepared))
        rates[family] = positive_rates(np.column_stack(pair))
    rates["ensemble"] = positive_rates((rates["xgb"] + rates["cat"]) / 2)
    return rates


if __name__ == "__main__":
    import sys
    if sys.argv[1:] == ["freeze"]:
        baseline_freeze()
    elif sys.argv[1:] == ["train"]:
        train()
    else:
        raise SystemExit("Use freeze or train")
