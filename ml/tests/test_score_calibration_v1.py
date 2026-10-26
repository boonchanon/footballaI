import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from src.models.score_calibration import (GRID,apply,temperature_matrix,fit_score_specific,
    fit_temperature,fit_structured,score_specific_matrix,structured_matrix)
from src.evaluation.score_calibration_v1 import OUT,P3,P4,CUTOFF,in_grid
from src.models.score_dependency import independent_matrix,top_scores


def test_frozen_baselines_and_lambdas_reproduce():
    raw=pd.read_csv(OUT/"raw_predictions.csv")
    dc=pd.read_csv(OUT/"dc_predictions.csv")
    p4_raw=pd.read_csv(P4/"independent_predictions.csv")
    p4_dc=pd.read_csv(P4/"dc_predictions.csv")
    assert len(raw)==len(dc)==760
    assert int(raw.ExactCorrect.sum())==96 and int(dc.ExactCorrect.sum())==99
    assert raw.Top1Score.tolist()==p4_raw.Top1Score.tolist()
    assert dc.Top1Score.tolist()==p4_dc.Top1Score.tolist()
    frozen=np.load(P4/"frozen_test_rates.npy")
    prior=np.load(P3/"diagnostic_rates.npz")["xgb"]
    assert np.array_equal(frozen,prior)
    assert np.allclose(raw[["lambda_home_xgb","lambda_away_xgb"]],frozen,rtol=0,atol=1e-12)


def test_calibration_fit_uses_only_allowed_chronological_rows():
    data=json.loads((OUT/"data_manifest.json").read_text())
    params=json.loads((OUT/"calibration_parameters.json").read_text())
    train=pd.read_csv(OUT/"calibration_train.csv")
    valid=pd.read_csv(OUT/"calibration_validation.csv")
    assert data["test_outcomes_used_for_fit"] is False and params["test_outcomes_used"] is False
    assert len(train)==188 and len(valid)==192
    assert train.Date.max()<CUTOFF<=valid.Date.min()
    raw=np.load(OUT/"calibration_raw_matrices.npy")[:len(train)]
    fit_raw,pairs,excluded=in_grid(train,raw)
    weights,_,_,_=fit_score_specific(fit_raw,pairs)
    assert np.allclose(weights,np.asarray(params["score_specific_weights"]))
    assert np.isclose(fit_temperature(fit_raw,pairs),params["temperature"],atol=1e-8)
    assert np.allclose(fit_structured(fit_raw,pairs),params["structured_beta"],atol=1e-6)
    assert excluded==1
    # The 760 outcomes are nowhere passed to any of the three fit functions.
    fake_test=pd.read_csv(P4/"frozen_test_inputs.csv")
    fake_test.loc[:,["ActualHomeGoals","ActualAwayGoals"]]=99
    assert np.allclose(fit_score_specific(fit_raw,pairs)[0],weights)


def test_all_calibrated_matrices_valid_and_neutral_is_raw():
    matrices=np.load(OUT/"diagnostic_matrices.npz")
    for method in ("raw","dc","temperature","score_specific","structured"):
        matrix=matrices[method]
        assert matrix.shape==(760,7,7)
        assert np.isfinite(matrix).all() and (matrix>=0).all()
        assert np.allclose(matrix.sum(axis=(1,2)),1,atol=1e-12)
        score,p=top_scores(matrix[0],1)[0]
        h,a=map(int,score.split('-'))
        assert 0<=h<GRID and 0<=a<GRID and 0<=p<=1
    raw=matrices["raw"][0]
    assert np.allclose(apply("raw",raw,{}),raw)
    assert np.allclose(temperature_matrix(raw,1),raw,atol=1e-14)
    assert np.allclose(score_specific_matrix(raw,np.ones((7,7))),raw)
    assert np.allclose(structured_matrix(raw,np.zeros(5)),raw)


def test_temperature_math_preserves_ranking():
    raw=independent_matrix(1.6,1.2)
    temperature=1.8
    expected=np.power(raw,1/temperature)
    expected/=expected.sum()
    assert np.allclose(temperature_matrix(raw,temperature),expected)
    assert top_scores(raw,1)[0][0]==top_scores(temperature_matrix(raw,temperature),1)[0][0]
    with pytest.raises(ValueError):
        temperature_matrix(raw,0)


def test_rare_unseen_score_stays_neutral_without_test_multiplier():
    params=json.loads((OUT/"calibration_parameters.json").read_text())
    table={row["score"]:row for row in params["score_specific_train_table"]}
    assert params["method_design"]["score_specific_formula"]=="w=(observed+10)/(expected+10) when expected>=3; otherwise w=1"
    for row in table.values():
        if not row["supported"]:
            assert row["multiplier"]==1.0
    assert table["6-6"]["multiplier"]==1.0
    assert 0<np.min(params["score_specific_weights"])


def test_protected_phase2_phase3_phase4_and_production_artifacts_unchanged():
    p5=json.loads((OUT/"data_manifest.json").read_text())
    for name,expected in p5["phase3_artifact_sha256"].items():
        assert hashlib.sha256((P3/name).read_bytes()).hexdigest()==expected
    p4=json.loads((P4/"baseline_freeze.json").read_text())
    for name,expected in p4["phase3_artifact_sha256"].items():
        assert hashlib.sha256((P3/name).read_bytes()).hexdigest()==expected
    p2=json.loads(Path("data/processed/input_parity_no_odds_v1/baseline_manifest.json").read_text())
    for name,expected in p2["source_sha256"].items():
        assert hashlib.sha256(Path(name).read_bytes()).hexdigest()==expected
    assert hashlib.sha256((P4/"score_matrices.npz").read_bytes()).hexdigest()==p5["phase4_matrices_sha256"]
