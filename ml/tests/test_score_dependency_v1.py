import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from src.models.score_dependency import (independent_matrix, dixon_coles_matrix, dc_tau,
    bivariate_matrix, bivariate_actual_probability, shared_components, top_scores)
from src.evaluation.score_dependency_v1 import OUT, fit_parameters


def test_phase3_frozen_xgb_baseline_is_exactly_reproduced():
    frozen = json.loads((OUT / "baseline_freeze.json").read_text())
    control = pd.read_csv(OUT / "independent_predictions.csv")
    prior = pd.read_csv("data/processed/ml_goal_rates_v1/pure_xgb_matches.csv")
    rates = np.load(OUT / "frozen_test_rates.npy")
    assert frozen["baseline_exact_hits"] == int(control.ExactCorrect.sum()) == 96
    assert len(control) == len(prior) == len(rates) == 760
    assert control.Top1Score.tolist() == prior.PredictedScore.tolist()
    assert np.array_equal(rates, np.load("data/processed/ml_goal_rates_v1/diagnostic_rates.npz")["xgb"])


def test_zero_dependence_controls_reproduce_independent():
    for home, away in ((.8,.9),(1.6,1.2),(2.5,2.0)):
        raw = independent_matrix(home,away)
        assert np.allclose(dixon_coles_matrix(home,away,0),raw,atol=1e-14)
        assert np.allclose(bivariate_matrix(home,away,0),raw,atol=1e-14)


def test_dc_targets_only_standard_low_score_cells_before_normalization():
    home,away,rho=1.6,1.2,-.03
    raw=independent_matrix(home,away)
    dc=dixon_coles_matrix(home,away,rho)
    reference=dc[2,2]/raw[2,2]
    for cell,factor in zip(((0,0),(0,1),(1,0),(1,1)),dc_tau(home,away,rho)):
        assert np.isclose((dc[cell]/raw[cell])/reference,factor,atol=1e-12)
    assert np.isclose((dc[3,2]/raw[3,2])/reference,1,atol=1e-12)
    assert (dc_tau(home,away,rho)>0).all()


def test_matrices_valid_and_top1_integer_score():
    for matrix in (independent_matrix(1.6,1.2),dixon_coles_matrix(1.6,1.2,-.03),
                   bivariate_matrix(1.6,1.2,.3)):
        assert matrix.shape==(7,7)
        assert np.isfinite(matrix).all() and (matrix>=0).all()
        assert np.isclose(matrix.sum(),1,atol=1e-12)
        score,p=top_scores(matrix,1)[0]
        h,a=map(int,score.split('-'))
        assert 0<=h<=6 and 0<=a<=6 and 0<=p<=1
    with pytest.raises(ValueError):
        dixon_coles_matrix(4,4,.5)


def test_bivariate_marginal_means_preserved_with_wide_grid():
    home,away,q=1.6,1.2,.35
    theta1,theta2,shared=shared_components(home,away,q)
    assert np.isclose(theta1+shared,home) and np.isclose(theta2+shared,away)
    wide=bivariate_matrix(home,away,q,max_goals=20)
    grid=np.arange(21)
    mean_home=float((wide*grid[:,None]).sum())
    mean_away=float((wide*grid[None,:]).sum())
    assert abs(mean_home-home)<1e-8 and abs(mean_away-away)<1e-8
    assert bivariate_actual_probability(home,away,7,0,q)>0


def test_dependency_fit_uses_validation_only_and_production_hashes_hold():
    fitted=json.loads((OUT / "parameter_fit.json").read_text())
    assert fitted["test_outcomes_used"] is False
    val=pd.read_csv(OUT / "validation_fit_inputs.csv")
    rates=np.load(OUT / "validation_rates.npy")
    recalculated=fit_parameters(val,rates)
    assert np.isclose(recalculated["rho"],fitted["rho"],atol=1e-8)
    assert np.isclose(recalculated["shared_fraction"],fitted["shared_fraction"],atol=1e-8)
    test=pd.read_csv(OUT / "frozen_test_inputs.csv")
    test.loc[:,["ActualHomeGoals","ActualAwayGoals"]]=99
    assert np.isclose(fit_parameters(val,rates)["rho"],fitted["rho"],atol=1e-8)
    assert np.isclose(fit_parameters(val,rates)["shared_fraction"],fitted["shared_fraction"],atol=1e-8)
    frozen=json.loads((OUT / "baseline_freeze.json").read_text())
    for name,expected in frozen["phase3_artifact_sha256"].items():
        assert hashlib.sha256((Path("data/processed/ml_goal_rates_v1")/name).read_bytes()).hexdigest()==expected
    prior=json.loads(Path("data/processed/input_parity_no_odds_v1/baseline_manifest.json").read_text())
    for name,expected in prior["source_sha256"].items():
        assert hashlib.sha256(Path(name).read_bytes()).hexdigest()==expected
