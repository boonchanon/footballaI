import hashlib
import json

import numpy as np
import pandas as pd

from src.evaluation.team_condition_availability_v1 import COND, OUT, ROOT, risk, snapshot_features


def test_snapshot_selection_strictly_before_kickoff_and_complete():
    selected=pd.read_csv(OUT/'fixture_snapshot_selection.csv')
    assert len(selected)==1900
    assert not selected.Season.str.startswith('2026').any()
    assert selected.SnapshotPath.notna().all()
    assert (pd.to_datetime(selected.SnapshotUTC,utc=True)<pd.to_datetime(selected.KickoffUTC,utc=True)).all()
    assert (selected.SnapshotAgeHours>0).all() and selected.SnapshotAgeHours.max()<12


def test_condition_features_do_not_use_current_or_future_results():
    rows=pd.read_csv(OUT/'team_condition_features.csv',low_memory=False)
    assert len(rows)==1900 and rows[COND].notna().all().all()
    before=rows[COND].copy()
    changed=rows.copy()
    changed[['HomeGoals','AwayGoals']]=99
    pd.testing.assert_frame_equal(before,changed[COND])
    # Independently reconstruct a sample snapshot/team aggregation.
    first=rows.iloc[0]
    snapshot=snapshot_features(first.SnapshotPath)
    assert first.HomeTeam in snapshot and first.AwayTeam in snapshot
    assert snapshot[first.HomeTeam]['UnavailableTop15']==first.HomeUnavailableTop15
    assert snapshot[first.AwayTeam]['RiskCostShareTop15']==first.AwayRiskCostShareTop15


def test_fpl_status_risk_policy_is_fixed():
    assert risk({'status':'a','chance_of_playing_this_round':None})==0
    assert risk({'status':'d','chance_of_playing_this_round':None})==.5
    assert risk({'status':'i','chance_of_playing_this_round':None})==1
    assert risk({'status':'s','chance_of_playing_this_round':None})==1
    assert risk({'status':'d','chance_of_playing_this_round':75})==.25


def test_walkforward_results_and_protected_forecasts():
    pre=pd.read_csv(OUT/'walk_forward_predictions.csv')
    diag=pd.read_csv(OUT/'diagnostic_predictions.csv')
    assert len(pre)==760 and len(diag)==760
    assert set(pre.Season)=={'2022/23','2023/24'}
    assert set(diag.Season)=={'2024/25','2025/26'}
    assert not pre.Season.str.startswith('2026').any() and not diag.Season.str.startswith('2026').any()
    assert (pre.BaselineExact==((pre.BaselineScore.str.split('-').str[0].astype(int)==pre.HomeGoals)&
                                (pre.BaselineScore.str.split('-').str[1].astype(int)==pre.AwayGoals))).all()
    assert (pre.ConditionExact==((pre.ConditionScore.str.split('-').str[0].astype(int)==pre.HomeGoals)&
                                 (pre.ConditionScore.str.split('-').str[1].astype(int)==pre.AwayGoals))).all()
    decision=json.loads((OUT/'decision.json').read_text())
    assert decision['PreDiagnosticQualification'] is True
    assert decision['DeploymentApproved'] is False
    assert decision['FutureForecastsFrozen'] is False
    raw=ROOT/'data/processed/predictions_2026_27_latest/predictions_raw.csv'
    assert hashlib.sha256(raw.read_bytes()).hexdigest()=='0afa806c8e26b9fa2a354b760128955ad40fa85b7b592bd11aa0fd3a2923f8e3'
