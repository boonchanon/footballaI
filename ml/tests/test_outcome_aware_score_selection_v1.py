import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from src.models.outcome_aware_score_selection import masks,masses,outcome_of_score,selected_outcome,top_within
from src.models.score_dependency import top_scores
from src.evaluation.outcome_aware_score_selection_v1 import OUT,P2,P3,P4,P5,METHODS,ORACLES,verify_baselines,classifier_audit


def test_frozen_baselines_fixture_rates_rho_and_scores():
    source,rates,params,matrices=verify_baselines()
    assert len(source)==760 and np.array_equal(rates,np.load(P3/"diagnostic_rates.npz")["xgb"])
    assert params["rho"]==json.loads((P4/"parameter_fit.json").read_text())["rho"]
    report=json.loads((OUT/"report.json").read_text())
    assert report["deployable_methods"]["independent_global"]["exact_hits"]==96
    assert report["deployable_methods"]["dc_global"]["exact_hits"]==99
    assert pd.read_csv(OUT/"independent_global_predictions.csv").Top1Score.tolist()==pd.read_csv(P4/"independent_predictions.csv").Top1Score.tolist()
    assert pd.read_csv(OUT/"dc_global_predictions.csv").Top1Score.tolist()==pd.read_csv(P4/"dc_predictions.csv").Top1Score.tolist()


def test_regions_masses_selector_and_negative_control_on_all_frozen_matrices():
    _,_,_,matrix_sets=verify_baselines()
    region=masks((7,7))
    home,away=np.indices((7,7))
    assert np.array_equal(region["H"],home>away)
    assert np.array_equal(region["D"],home==away)
    assert np.array_equal(region["A"],home<away)
    assert np.all(sum(region.values())==1)
    for matrices in matrix_sets.values():
        for matrix in matrices:
            probability=masses(matrix)
            assert np.isclose(sum(probability.values()),1,atol=1e-12)
            chosen=selected_outcome(probability)
            score,p=top_within(matrix,chosen,1)[0]
            assert outcome_of_score(score)==chosen
            h,a=map(int,score.split("-"))
            assert 0<=h<=6 and 0<=a<=6 and np.isclose(p,matrix[h,a])
            global_score=top_scores(matrix,1)[0][0]
            assert top_within(matrix,outcome_of_score(global_score),1)[0][0]==global_score


def test_within_region_argmax_top3_and_invalid_probability_rejected():
    matrix=np.zeros((3,3),dtype=float)
    matrix[2,0]=.3; matrix[1,0]=.2; matrix[0,0]=.25; matrix[0,1]=.15; matrix[0,2]=.1
    assert top_within(matrix,"H",3)[0]==("2-0",.3)
    assert [score for score,_ in top_within(matrix,"H",3)]==["2-0","1-0","2-1"]
    assert selected_outcome({"H":.5,"D":.3,"A":.2})=="H"
    with pytest.raises(ValueError):
        selected_outcome({"H":.5,"D":.2,"A":.2})
    with pytest.raises(ValueError):
        masses(matrix*2)


def test_classifier_mapping_preprocessing_and_probability_parity():
    source=pd.read_csv(P4/"frozen_test_inputs.csv")
    audit,probs=classifier_audit(source)
    assert audit["status"]=="VALID"
    assert audit["class_mapping"]=={"0":"A","1":"D","2":"H"}
    assert audit["odds_included"] is False and audit["feature_count"]==123
    old=pd.read_csv(P2/"experiment_matches.csv")
    assert np.allclose(probs["cat"],old[["CatA","CatD","CatH"]],rtol=0,atol=1e-12)
    assert np.allclose(probs["xgb"],old[["XgbA","XgbD","XgbH"]],rtol=0,atol=1e-12)


def test_oracle_is_separate_and_no_test_derived_threshold():
    report=json.loads((OUT/"report.json").read_text())
    manifest=json.loads((OUT/"data_manifest.json").read_text())
    assert report["oracle_cannot_be_deployed"] and not set(ORACLES)&set(report["deployable_methods"])
    assert report["best_deployable"] in report["deployable_methods"]
    oracle=pd.read_csv(OUT/"oracle_diagnostic.csv")
    assert oracle.OracleNonDeployable.all()
    assert (oracle.ActualOutcome==oracle.SelectedOutcome).all()
    deployable=pd.read_csv(OUT/"predictions.csv")
    assert not deployable.OracleNonDeployable.any()
    assert report["test_outcomes_used_to_fit"] is False and manifest["no_thresholds_no_blends_no_retraining"]
    assert set(report["deployable_methods"])==set(METHODS)


def test_protected_artifact_hashes_unchanged():
    manifest=json.loads((OUT/"data_manifest.json").read_text())
    digest=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
    for name,expected in manifest["phase3_artifact_sha256"].items():
        assert digest(P3/name)==expected
    assert digest(P4/"score_matrices.npz")==manifest["phase4_score_matrices_sha256"]
    assert digest(P4/"frozen_test_inputs.csv")==manifest["phase4_test_inputs_sha256"]
    for name,expected in manifest["phase5_protected_sha256"].items():
        assert digest(P5/name)==expected
    p2=json.loads((P2/"baseline_manifest.json").read_text())
    for name,expected in p2["source_sha256"].items():
        assert digest(Path(name))==expected
