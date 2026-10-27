import hashlib
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import pytest

from src.models.input_parity_no_odds import ODDS_COLUMNS, prepare, training_fill_values
from src.models.ml_goal_rates_v1 import OUT, PHASE2, TARGETS, FLOOR, load_splits, positive_rates, predict_rates
from src.evaluation.ml_goal_rates_v1 import pure_score
from src.models.poisson_model import score_matrix


def test_targets_are_actual_home_and_away_goal_counts():
    meta = joblib.load(OUT / "metadata.joblib")
    assert meta["target_columns"] == {"home": "HomeGoals", "away": "AwayGoals"}
    assert TARGETS == ("HomeGoals", "AwayGoals")
    train = load_splits()["train"]
    assert train.HomeGoals.dtype.kind in "iu" and train.AwayGoals.dtype.kind in "iu"
    assert (train[["HomeGoals", "AwayGoals"]] >= 0).all().all()


def test_no_odds_and_strict_train_serve_feature_parity():
    meta = joblib.load(OUT / "metadata.joblib")
    assert meta["odds_included"] is False
    assert len(meta["feature_columns"]) == 123
    assert not set(meta["feature_columns"]) & set(ODDS_COLUMNS)
    sample = load_splits()["test"].iloc[:2]
    clean = sample[meta["feature_columns"]]
    assert list(prepare(clean, meta).columns) == meta["feature_columns"]
    with pytest.raises(ValueError):
        prepare(clean[meta["feature_columns"][::-1]], meta)
    with pytest.raises(ValueError):
        predict_rates(clean[meta["feature_columns"][::-1]])


def test_saved_imputation_is_train_only_and_reused_on_future_rows():
    splits = load_splits()
    meta = joblib.load(OUT / "metadata.joblib")
    columns = meta["feature_columns"]
    expected = training_fill_values(splits["train"][columns], columns)
    assert expected == meta["imputation_values"]
    sample = splits["test"][columns].iloc[:1].copy()
    sample.iloc[0] = np.nan
    prepared = prepare(sample, meta)
    assert prepared.iloc[0].to_dict() == expected
    # Dramatically changed future values cannot change the stored train medians.
    future = sample.fillna(1e9)
    assert meta["imputation_values"] == expected
    assert prepare(future, meta).iloc[0, 0] == 1e9


def test_positive_rates_and_valid_normalized_score_matrix():
    meta = joblib.load(OUT / "metadata.joblib")
    features = load_splits()["test"][meta["feature_columns"]].iloc[:5]
    variants = predict_rates(features)
    assert set(variants) == {"xgb", "cat", "ensemble"}
    for rates in variants.values():
        assert rates.shape == (5, 2)
        assert np.isfinite(rates).all() and (rates > 0).all()
        matrices = score_matrix(rates[:, 0], rates[:, 1])
        assert np.isfinite(matrices).all() and (matrices >= 0).all()
        assert np.allclose(matrices.sum(axis=(1, 2)), 1)
        score, probability = pure_score(*rates[0])
        h, a = map(int, score.split("-"))
        assert 0 <= h <= 6 and 0 <= a <= 6 and 0 <= probability <= 1
    assert positive_rates([[0, .2]])[0, 0] == FLOOR
    with pytest.raises(ValueError):
        positive_rates([[np.nan, 1]])
    with pytest.raises(ValueError):
        positive_rates([[-1, 1]])


def test_phase2_and_production_artifacts_unchanged():
    frozen = json.loads((OUT / "baseline_freeze.json").read_text(encoding="utf-8"))
    for relative, expected in frozen["phase2_artifact_sha256"].items():
        assert hashlib.sha256(Path(relative).read_bytes()).hexdigest() == expected
    prior = json.loads((PHASE2 / "baseline_manifest.json").read_text(encoding="utf-8"))
    for relative, expected in prior["source_sha256"].items():
        assert hashlib.sha256(Path(relative).read_bytes()).hexdigest() == expected
    assert frozen["phase2_exact_hits"] == 75
