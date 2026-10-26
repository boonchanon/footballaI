import joblib
import numpy as np
import pandas as pd
import pytest

from src.models.input_parity_no_odds import ODDS_COLUMNS, FEATURE_VERSION, no_odds_columns, prepare, training_fill_values
from src.evaluation.input_parity_no_odds_v1 import score_row


def meta(columns, fills):
    return dict(feature_columns=columns, feature_version=FEATURE_VERSION,
                imputation_values=fills, odds_included=False)


def test_feature_order_and_names_fail_loudly():
    m = meta(["a", "b"], {"a": 2.0, "b": 3.0})
    with pytest.raises(ValueError):
        prepare(pd.DataFrame({"b": [1], "a": [2]}), m)
    with pytest.raises(ValueError):
        prepare(pd.DataFrame({"a": [2], "b": [1], "extra": [3]}), m)
    with pytest.raises(ValueError):
        prepare(pd.DataFrame({"a": [2]}), m)


def test_saved_train_fill_reused_and_validation_cannot_change_it():
    train = pd.DataFrame({"a": [1.0, 3.0, np.nan], "b": [4.0, 6.0, 8.0]})
    fills = training_fill_values(train, ["a", "b"])
    assert fills == {"a": 2.0, "b": 6.0}
    validation = pd.DataFrame({"a": [np.nan, 10000.0], "b": [np.nan, -10000.0]})
    output = prepare(validation, meta(["a", "b"], fills))
    assert output.iloc[0].to_dict() == fills
    assert fills == training_fill_values(train, ["a", "b"])


def test_exact_saved_experimental_metadata_has_no_odds():
    cb = joblib.load("data/processed/input_parity_no_odds_v1/catboost_metadata.joblib")
    xb = joblib.load("data/processed/input_parity_no_odds_v1/xgboost_metadata.joblib")
    assert cb == xb and cb["odds_included"] is False
    assert not set(cb["feature_columns"]) & set(ODDS_COLUMNS)
    assert len(cb["feature_columns"]) == 123
    with pytest.raises(ValueError):
        no_odds_columns(["a", *ODDS_COLUMNS[:-1]])


def test_prediction_valid_exact_score_and_probability():
    result = score_row(1.6, 1.2, np.array([.25, .25, .50]), np.array([.28, .24, .48]))
    h, a = map(int, result["score"].split("-"))
    assert h == result["predicted_home"] and a == result["predicted_away"]
    assert 0 <= result["top1_score_probability"] <= 1
    assert np.isclose(result["score_nll_matrix"].sum(), 1)
