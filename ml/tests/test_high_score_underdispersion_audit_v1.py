import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd

from src.evaluation.high_score_underdispersion_audit_v1 import (OUT,P3,P4,P5,P6,P7,actual_rank,
    constrained_top,rank_bucket,total_bucket,scoring_group,RANGES)
from src.evaluation.score_calibration_v1 import reproduce
from src.models.score_dependency import independent_matrix,top_scores
from src.models.outcome_aware_score_selection import outcome_of_score


def test_frozen_760_baseline_matchwise_rates_and_scores():
    source,rates,fit=reproduce()
    report=json.loads((OUT/"report.json").read_text())
    frame=pd.read_csv(OUT/"actual_score_ranks.csv")
    dc=pd.read_csv(OUT/"independent_vs_dc.csv")
    prior=pd.read_csv(P4/"independent_predictions.csv")
    assert len(frame)==len(source)==len(dc)==760
    assert report["baseline_exact_hits"]==96 and report["dc_exact_hits"]==99
    assert np.array_equal(rates,np.load(P3/"diagnostic_rates.npz")["xgb"])
    assert fit["rho"]==json.loads((OUT/"data_manifest.json").read_text())["fixed_dc_rho"]
    assert frame.Top1Score.tolist()==prior.Top1Score.tolist()
    assert frame.ActualScore.tolist()==prior.ActualScore.tolist()
    assert list(frame[["Date","HomeTeam","AwayTeam"]].itertuples(index=False,name=None))==list(
        prior[["Date","HomeTeam","AwayTeam"]].itertuples(index=False,name=None))
    assert np.allclose(frame[["LambdaHome","LambdaAway"]],rates,rtol=0,atol=1e-12)
    for matrix in np.load(P4/"score_matrices.npz")["independent"]:
        assert np.isfinite(matrix).all() and (matrix>=0).all() and np.isclose(matrix.sum(),1,atol=1e-12)


def test_stable_actual_grid_rank_and_outside_policy():
    matrix=independent_matrix(1.4,1.2)
    scores=[score for score,_ in top_scores(matrix,49)]
    for rank,score in enumerate(scores,1):
        home,away=map(int,score.split("-"))
        actual_rank_value,prob,outside=actual_rank(matrix,home,away)
        assert actual_rank_value==rank and prob==matrix[home,away] and not outside
    rank,prob,outside=actual_rank(matrix,7,0)
    assert (rank,prob,outside)==(50,0.0,True)
    assert rank_bucket(1)=="Top1" and rank_bucket(50)=="outside_grid"


def test_total_groups_high_definition_and_fixed_bins():
    frame=pd.read_csv(OUT/"actual_score_ranks.csv")
    assert all(frame.ActualTotalGoals==frame.ActualHomeGoals+frame.ActualAwayGoals)
    assert total_bucket(6)=="6+" and scoring_group(3)=="MEDIUM_2-3"
    assert scoring_group(4)=="HIGH_4+" and scoring_group(1)=="LOW_0-1"
    assert len(frame[frame.ActualTotalGoals>=4])==238
    assert len(pd.read_csv(OUT/"high_score_matches.csv"))==238
    bins=pd.read_csv(OUT/"goal_total_bins.csv")
    assert bins.Matches.sum()==760 and bins.LambdaTotalBin.tolist()==[name for _,_,name in RANGES]


def test_oracles_use_actual_information_only_and_remain_non_deployable():
    report=json.loads((OUT/"report.json").read_text())
    frame=pd.read_csv(OUT/"actual_score_ranks.csv")
    total=pd.read_csv(OUT/"oracle_total_goals.csv")
    combined=pd.read_csv(OUT/"oracle_combined.csv")
    assert report["oracles_non_deployable"] and report["oracle_uses_actual_result_information"]
    assert total.OracleNonDeployable.all() and combined.OracleNonDeployable.all()
    assert total.UsesActualResultInformation.all() and combined.UsesActualResultInformation.all()
    assert int(total.TrueTotalOracleCorrect.sum())==report["true_total_oracle_hits"]==360
    assert int(combined.CombinedOracleCorrect.sum())==report["combined_oracle_hits"]==633
    for row in frame.itertuples(index=False):
        assert sum(map(int,row.TrueTotalOracleScore.split("-")))==row.ActualTotalGoals
        assert sum(map(int,row.CombinedOracleScore.split("-")))==row.ActualTotalGoals
        assert outcome_of_score(row.CombinedOracleScore)==row.ActualOutcome
    sample=independent_matrix(1.8,1.1)
    chosen,_=constrained_top(sample,4,"H")
    assert sum(map(int,chosen.split("-")))==4 and outcome_of_score(chosen)=="H"


def test_no_training_no_tuning_no_weighting_and_protected_hashes():
    manifest=json.loads((OUT/"data_manifest.json").read_text())
    report=json.loads((OUT/"report.json").read_text())
    assert manifest["no_model_training"] and manifest["no_lambda_modification"] and manifest["no_score_weighting"]
    assert report["no_model_training"] and report["no_score_weighting"] and report["no_test_fitted_threshold"]
    digest=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
    for name,expected in manifest["phase3_artifact_sha256"].items():
        assert digest(P3/name)==expected
    assert digest(P4/"score_matrices.npz")==manifest["phase4_matrix_sha256"]
    assert digest(P4/"frozen_test_inputs.csv")==manifest["phase4_test_inputs_sha256"]
    for parent,key in ((P5,"phase5_protected_sha256"),(P6,"phase6_protected_sha256"),
                       (P7,"phase7_protected_sha256")):
        for name,expected in manifest[key].items():
            assert digest(parent/name)==expected
    phase2=json.loads(Path("data/processed/input_parity_no_odds_v1/baseline_manifest.json").read_text())
    for name,expected in phase2["source_sha256"].items():
        assert digest(Path(name))==expected
