import hashlib
from pathlib import Path

import numpy as np
import pandas as pd

from src.evaluation.goal_dispersion_v1 import (
    FOLDS,
    OUT,
    P12,
    fit_dispersion,
    matrix,
    nb,
)


def test_negative_binomial_mean_variance_and_poisson_limit():
    mu, alpha = 1.7, 0.12
    k = np.arange(150)
    p = np.array([nb(mu, int(x), alpha) for x in k])
    assert np.isclose(p.sum(), 1.0, atol=1e-12)
    assert np.isclose((k * p).sum(), mu, atol=1e-10)
    assert np.isclose(((k - mu) ** 2 * p).sum(), mu + alpha * mu**2, atol=1e-9)
    assert np.allclose(
        [nb(mu, int(x), 0.0) for x in range(12)],
        [nb(mu, int(x), 1e-10) for x in range(12)],
    )


def test_score_matrix_is_valid_and_deterministic():
    first = matrix(1.63, 1.18, 0.03, 0.10)
    second = matrix(1.63, 1.18, 0.03, 0.10)
    assert first.shape == (49,)
    assert np.isfinite(first).all() and (first >= 0).all()
    assert np.isclose(first.sum(), 1.0)
    assert np.array_equal(first, second)


def test_walk_forward_baseline_and_training_chronology():
    pred = pd.read_csv(OUT / "walk_forward_predictions.csv")
    raw = pred[pred.Method == "POISSON_RAW"]
    assert len(raw) == 2280
    assert int(raw.Exact.sum()) == 254
    diag = pd.read_csv(OUT / "diagnostic_predictions.csv")
    assert int(diag[diag.Method == "POISSON_RAW"].Exact.sum()) == 90
    rates = pd.read_csv(P12 / "fixture_oof_rates.csv", parse_dates=["Date"])
    params = pd.read_csv(OUT / "dispersion_parameters.csv")
    for season in FOLDS:
        row = params[(params.Fold == season) & (params.Method == "NB_GLOBAL")].iloc[0]
        valid_min = rates.loc[rates.Season == season, "Date"].min()
        assert pd.Timestamp(row.TrainMaxDate) < valid_min


def test_future_result_mutation_cannot_change_fitted_dispersion_or_forecast_hash():
    rates = pd.read_csv(P12 / "fixture_oof_rates.csv")
    train = rates[rates.Season.str[:4].astype(int).between(2016, 2022)].copy()
    original = fit_dispersion(train, "NB_GLOBAL")
    evaluation = rates[rates.Season == "2023/24"].copy()
    changed = evaluation.copy()
    changed.loc[changed.index[0], ["HomeGoals", "AwayGoals"]] = [6, 6]
    changed.loc[changed.index[-1], ["HomeGoals", "AwayGoals"]] = [6, 6]
    # Current and future evaluation outcomes are never passed into the fit.
    assert fit_dispersion(train, "NB_GLOBAL") == original
    assert not changed[["HomeGoals", "AwayGoals"]].equals(
        evaluation[["HomeGoals", "AwayGoals"]]
    )
    target = Path("data/processed/predictions_2026_27_latest/predictions_raw.csv")
    assert hashlib.sha256(target.read_bytes()).hexdigest() == "0afa806c8e26b9fa2a354b760128955ad40fa85b7b592bd11aa0fd3a2923f8e3"
