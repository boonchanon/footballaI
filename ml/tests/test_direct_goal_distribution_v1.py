import json

import numpy as np
import pandas as pd

from src.evaluation.direct_goal_distribution_v1 import OUT, FEATURES, GRID, matrix, bucket, valid_probability, verify
from src.evaluation.score_calibration_v1 import reproduce
from src.models.ml_goal_rates_v1 import sha
from src.features.feature_engineering import build_fixture_features
from src.models.ml_goal_rates_v1 import ROOT


def test_policy_support_frozen_before_diagnostic():
    verify()
    policy=json.loads((OUT/'class_policy.json').read_text())
    spec=json.loads((OUT/'feature_spec.json').read_text())
    selection=json.loads((OUT/'selection_freeze.json').read_text())
    manifest=json.loads((OUT/'training_manifest.json').read_text())
    meta=json.loads((OUT/'final_metadata.json').read_text())
    support=pd.read_csv(OUT/'goal_class_support.csv')
    assert policy['ExactClasses']==list(range(7)) and policy['OverflowMeaning'].startswith('7+')
    assert policy['ObservedMinimumSupport']==31
    assert support[support.Class.astype(str).isin(['5','6'])].Count.min()==31
    assert spec['Features']==FEATURES==selection['SelectedFeatures']==meta['Features']
    assert meta['ClassOrder']==list(range(8)) and set(meta['Fills'])==set(FEATURES)
    assert not any(c in FEATURES for c in ('HomeGoals','AwayGoals','Result','ActualScore','ActualTotal'))
    assert not spec['NoPhase9Detector'] is False and spec['NoOdds'] and spec['NoScoreBoost']
    assert selection['FrozenBeforeDiagnostic'] and not selection['DiagnosticUsedForSelection']
    assert not manifest['DiagnosticOutcomesUsedForTraining']
    assert manifest['HomeModelSHA256']==sha(OUT/'home_model.json')
    assert manifest['AwayModelSHA256']==sha(OUT/'away_model.json')
    assert manifest['HomeModelSHA256']!=manifest['AwayModelSHA256']


def test_probability_outer_product_argmax_and_overflow():
    home=np.array([.1,.2,.3,.2,.1,.05,.03,.02])
    away=np.array([.2,.3,.2,.1,.1,.05,.03,.02])
    m,mass=matrix(home,away)
    raw=np.outer(home[:GRID],away[:GRID])
    assert np.allclose(m,raw/raw.sum()) and np.isclose(mass,raw.sum())
    assert np.isclose(m.sum(),1) and (m>=0).all()
    assert np.unravel_index(np.argmax(m),m.shape)==(2,1)
    assert bucket([0,6,7,9]).tolist()==[0,6,7,7]
    valid_probability(np.tile(home,(3,1)))


def test_baseline_lineage_folds_rank_and_artifacts():
    reproduce()
    diag=pd.read_csv(OUT/'diagnostic_predictions.csv')
    oof=pd.read_csv(OUT/'walk_forward_predictions.csv')
    folds=pd.read_csv(OUT/'walk_forward_fold_metrics.csv')
    assert len(diag)==760 and len(oof)==2660
    assert diag.BaselineExact.sum()==96 and diag.DirectExact.sum()==89
    assert diag.loc[diag.ActualTotal>=4,'BaselineExact'].sum()==0
    assert diag.loc[diag.ActualTotal>=4,'DirectExact'].sum()==0
    assert all(pd.to_datetime(folds.TrainMaxDate)<pd.to_datetime(folds.ValidMinDate))
    assert (diag.DirectActualRank>=1).all() and (diag.DirectActualRank<=50).all()
    assert (diag.DirectActualGridProbability>=0).all()
    assert diag.loc[diag.ActualScore=='7-0','DirectActualRank'].iloc[0]==50
    assert diag.loc[diag.ActualScore=='7-0','DirectActualGridProbability'].iloc[0]==0
    assert np.isclose(diag.DirectGridMass.max(),1,atol=.02)
    for col in ('HomeProbabilities','AwayProbabilities'):
        p=np.array([json.loads(item) for item in diag[col]])
        valid_probability(p)
        assert p.shape==(760,8)
    assert (OUT/'score_family_analysis.csv').exists() and (OUT/'matchwise_flips.csv').exists()


def test_report_flips_and_group_counts():
    report=json.loads((OUT/'report.json').read_text())
    assert (report['IndependentBaseline'],report['FixedDCReference'],report['EFixedDCReference'])==(96,99,101)
    assert not report['Phase9DetectorIntegration'] and report['NoDependency'] and report['NoScoreBoost']
    assert report['WrongToCorrect']-report['CorrectToWrong']==-7
    groups=pd.read_csv(OUT/'goal_group_analysis.csv')
    assert groups.N.tolist()==[151,371,238]
    assert groups.DirectExact.tolist()==[24,65,0]


def test_corrected_pre_match_base_ignores_current_and_future_results():
    matches=pd.read_csv(ROOT/'data/processed/matches_standardized.csv',low_memory=False).head(80)
    matches.Date=pd.to_datetime(matches.Date)
    fixture=matches.iloc[60]
    before=build_fixture_features(matches,fixture.HomeTeam,fixture.AwayTeam,fixture.Date,feature_version='correctness_v2')
    changed=matches.copy()
    changed.loc[changed.Date>=fixture.Date,['HomeGoals','AwayGoals']]=99
    after=build_fixture_features(changed,fixture.HomeTeam,fixture.AwayTeam,fixture.Date,feature_version='correctness_v2')
    pd.testing.assert_frame_equal(before[FEATURES],after[FEATURES],check_dtype=False)


def test_whole_date_selected_lineage_has_no_same_team_double_fixture():
    from src.models.model_utils import load_feature_data
    from src.evaluation.direct_goal_distribution_v1 import SOURCE
    data=load_feature_data(SOURCE)
    home=data[['Date','HomeTeam']].rename(columns={'HomeTeam':'Team'})
    away=data[['Date','AwayTeam']].rename(columns={'AwayTeam':'Team'})
    assert not pd.concat([home,away],ignore_index=True).duplicated(['Date','Team']).any()
    assert not data.duplicated(['Date','HomeTeam','AwayTeam']).any()
