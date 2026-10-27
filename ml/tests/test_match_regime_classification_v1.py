import hashlib
import json

import numpy as np
import pandas as pd

from src.evaluation.match_regime_classification_v1 import (
    OUT, P12, ROOT, VARIANTS, add_volatility, regime,
)


def test_fixed_boundaries_and_no_target_features():
    np.testing.assert_array_equal(regime(np.array([0,1,2,3,4,5,8])),
                                  np.array([0,0,1,1,2,2,2]))
    excluded={'HomeGoals','AwayGoals','MatchRegime','hXG','aXG','ActualTotal','ActualOutcome'}
    assert all(not (excluded&set(cols)) for cols in VARIANTS.values())
    assert list(VARIANTS)==list('ABCDEF')


def test_whole_day_current_future_result_mutation():
    rows=pd.DataFrame([
      dict(Date='2020-01-01',XGAvailableDate='2020-01-01',HomeTeam='A',AwayTeam='B',HomeGoals=1,AwayGoals=0),
      dict(Date='2020-01-02',XGAvailableDate='2020-01-03',HomeTeam='A',AwayTeam='C',HomeGoals=3,AwayGoals=2),
      dict(Date='2020-01-03',XGAvailableDate='2020-01-03',HomeTeam='A',AwayTeam='D',HomeGoals=4,AwayGoals=0),
      dict(Date='2020-01-03',XGAvailableDate='2020-01-03',HomeTeam='B',AwayTeam='C',HomeGoals=2,AwayGoals=2),
      dict(Date='2020-01-04',XGAvailableDate='2020-01-04',HomeTeam='A',AwayTeam='E',HomeGoals=0,AwayGoals=0),
    ])
    rows[['Date','XGAvailableDate']]=rows[['Date','XGAvailableDate']].apply(pd.to_datetime)
    before=add_volatility(rows)
    assert before.loc[2,'HomeRecentTotalMean5']==1
    assert before.loc[3,'HomeRecentTotalMean5']==1
    assert before.loc[4,'HomeRecentTotalMean5']==(1+5+4)/3
    changed=rows.copy()
    changed.loc[2:,['HomeGoals','AwayGoals']]=99
    after=add_volatility(changed)
    cols=list(VARIANTS['E'][-8:])
    pd.testing.assert_frame_equal(before.loc[:2,cols],after.loc[:2,cols])
    assert (before.LatestResultSourceDate.dropna()<before.loc[before.LatestResultSourceDate.notna(),'Date']).all()


def test_fold_chronology_oof_fills_and_saved_lineage():
    manifest=json.loads((OUT/'training_manifest.json').read_text())
    assert len(manifest)==36
    assert all(row['TrainMaxDate']<row['ValidMinDate'] for row in manifest)
    assert all(set(row['Fills'])==set(VARIANTS[row['Variant']]) for row in manifest)
    p12=json.loads((P12/'training_manifest.json').read_text())
    assert all(row['TrainMaxDate']<row['ValidMinDate'] for row in p12)
    feat=pd.read_csv(OUT/'asof_feature_rows.csv',low_memory=False)
    assert len(feat)==3800 and not feat.Season.str.startswith('2026').any()
    assert (feat.MatchRegime==regime(feat.HomeGoals+feat.AwayGoals)).all()
    assert not ((pd.to_datetime(feat.LatestResultSourceDate)>=pd.to_datetime(feat.Date))&feat.LatestResultSourceDate.notna()).any()


def test_selection_precedes_diagnostic_shuffle_and_protected_forecasts():
    selection=json.loads((OUT/'selection_decision.json').read_text())
    assert selection['Selected']=='D' and selection['NoDiagnosticSelection'] is True
    assert selection['GatePassed'] is False
    assert selection['LatestFoldHighAUC']<.55
    shuffled=json.loads((OUT/'shuffle_sanity.json').read_text())
    assert .4<shuffled['HighAUC']<.6
    oof=pd.read_csv(OUT/'walk_forward_predictions.csv')
    diag=pd.read_csv(OUT/'diagnostic_predictions.csv')
    assert len(oof)==6*2280 and len(diag)==760
    assert not oof.Season.str.startswith('2026').any()
    assert not diag.Season.str.startswith('2026').any()
    assert np.allclose(oof[['PLOW','PNORMAL','PHIGH']].sum(axis=1),1)
    assert np.allclose(diag[['PLOW','PNORMAL','PHIGH']].sum(axis=1),1)
    raw=ROOT/'data/processed/predictions_2026_27_latest/predictions_raw.csv'
    assert hashlib.sha256(raw.read_bytes()).hexdigest()=='0afa806c8e26b9fa2a354b760128955ad40fa85b7b592bd11aa0fd3a2923f8e3'
    assert not (OUT/'integration_proposal.md').exists()
