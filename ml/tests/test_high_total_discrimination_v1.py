import json

import numpy as np
import pandas as pd
import pytest

from src.features.high_total_discrimination_v1 import ALL_NEW, add_environment_features
from src.evaluation.high_total_discrimination_v1 import OUT, GROUPS, FOLDS, verify_freeze
from src.models.ml_goal_rates_v1 import sha


def tiny():
    return pd.DataFrame([
        dict(Date='2024-01-01',HomeTeam='A',AwayTeam='B',HomeGoals=2,AwayGoals=2,Result='D'),
        dict(Date='2024-01-01',HomeTeam='C',AwayTeam='D',HomeGoals=0,AwayGoals=0,Result='D'),
        dict(Date='2024-01-02',HomeTeam='A',AwayTeam='C',HomeGoals=1,AwayGoals=0,Result='H'),
        dict(Date='2024-01-03',HomeTeam='B',AwayTeam='D',HomeGoals=0,AwayGoals=2,Result='A'),
    ])


def test_whole_date_and_future_result_mutation():
    source=tiny()
    before,traces=add_environment_features(source,{0,1,2})
    assert np.isnan(before.loc[0,'HomeRecentTotalMean5'])
    assert np.isnan(before.loc[1,'HomeRecentTotalMean5'])
    assert before.loc[2,'HomeRecentTotalMean5']==4
    assert before.loc[2,'HomeRecentHighRate5']==1
    assert traces[2]['HomeRecentSources']==['2024-01-01']
    mutated=source.copy()
    mutated.loc[2,['HomeGoals','AwayGoals','Result']]=[9,9,'D']
    mutated.loc[3,['HomeGoals','AwayGoals','Result']]=[9,9,'D']
    after,_=add_environment_features(mutated)
    pd.testing.assert_series_equal(before.loc[2,list(ALL_NEW)],after.loc[2,list(ALL_NEW)])


def test_frozen_selection_and_predictions():
    verify_freeze()
    spec=json.loads((OUT/'feature_spec.json').read_text())
    selected=json.loads((OUT/'selection_freeze.json').read_text())
    trained=json.loads((OUT/'training_manifest.json').read_text())
    metadata=json.loads((OUT/'final_metadata.json').read_text())
    assert spec['Folds']==FOLDS
    assert selected['FrozenBeforeDiagnostic'] and not selected['DiagnosticOutcomesUsedForSelection']
    assert selected['SelectedFeatures']==GROUPS[selected['SelectedVariant']]
    assert metadata['Features']==selected['SelectedFeatures']
    assert set(metadata['Fills'])==set(metadata['Features'])
    assert not any(name in metadata['Features'] for name in ('HomeGoals','AwayGoals','Result','ActualHigh','ActualTotalGoals'))
    assert trained['ModelSHA256']==sha(OUT/'final_model.json')
    oof=pd.read_csv(OUT/'walk_forward_predictions.csv')
    assert len(oof)==2660*len(GROUPS)
    assert set(oof.Fold)==set(FOLDS)
    assert ((oof.Probability>=0)&(oof.Probability<=1)).all()
    folds=pd.read_csv(OUT/'walk_forward_fold_metrics.csv')
    assert all(pd.to_datetime(folds.TrainMaxDate)<pd.to_datetime(folds.ValidMinDate))
    diag=pd.read_csv(OUT/'diagnostic_predictions.csv')
    assert len(diag)==760 and diag.ActualHigh.sum()==238
    assert ((diag.DetectorProbability>=0)&(diag.DetectorProbability<=1)).all()
    assert diag.ExactCorrect.sum()==96
    assert diag.loc[diag.ActualHigh==1,'ExactCorrect'].sum()==0


def test_report_and_locked_score_references():
    report=json.loads((OUT/'report.json').read_text())
    assert (report['BaselineExact'],report['FixedDCExact'],report['EFixedDCExact'])==(96,99,101)
    assert not report['DetectorScoreIntegration']
    assert report['Phase3EarlierOOFReference'].startswith('unavailable')
    assert (OUT/'data_manifest.json').exists()
