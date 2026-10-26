import hashlib
import json

import pandas as pd

from src.evaluation.xg_history_walkforward_v1 import OUT, ROOT, XG, asof_features


def test_current_future_and_same_day_xg_never_enter_fixture_features():
    rows = pd.DataFrame([
        dict(Date='2020-01-01',HomeTeam='A',AwayTeam='B',hXG=1.2,aXG=.6,XGAvailableDate='2020-01-01'),
        dict(Date='2020-01-02',HomeTeam='A',AwayTeam='C',hXG=2.5,aXG=.8,XGAvailableDate='2020-01-03'),
        dict(Date='2020-01-03',HomeTeam='A',AwayTeam='D',hXG=9.,aXG=9.,XGAvailableDate='2020-01-03'),
        dict(Date='2020-01-03',HomeTeam='B',AwayTeam='C',hXG=9.,aXG=9.,XGAvailableDate='2020-01-03'),
        dict(Date='2020-01-04',HomeTeam='A',AwayTeam='E',hXG=3.,aXG=1.,XGAvailableDate='2020-01-04'),
    ])
    for col in ('Date','XGAvailableDate'):
        rows[col]=pd.to_datetime(rows[col])
    original=asof_features(rows)
    assert original.loc[1,'HomeXGForLast5']==1.2
    assert original.loc[2,'HomeXGForLast5']==1.2
    assert original.loc[4,'HomeXGForLast5']==(1.2+2.5+9.)/3
    altered=rows.copy()
    altered.loc[2:,['hXG','aXG']]=999.
    again=asof_features(altered)
    pd.testing.assert_frame_equal(original.loc[:2,XG],again.loc[:2,XG])
    assert (original.LatestXGSourceDate.dropna()<original.loc[original.LatestXGSourceDate.notna(),'Date']).all()


def test_frozen_lineage_and_results():
    source=pd.read_csv(OUT/'understat_match_xg_pre2026.csv')
    pred=pd.read_csv(OUT/'walkforward_predictions.csv')
    assert len(source)==4560 and len(pred)==3040
    assert not source.Season.str.startswith('2026').any()
    assert source.UnderstatMatchID.is_unique
    assert not ((pd.to_datetime(pred.LatestXGSourceDate)>=pd.to_datetime(pred.Date))&pred.LatestXGSourceDate.notna()).any()
    assert (pred.BaseExact==((pred.BaseScoreHome==pred.HomeGoals)&(pred.BaseScoreAway==pred.AwayGoals))).all()
    assert (pred.XGExact==((pred.XGScoreHome==pred.HomeGoals)&(pred.XGScoreAway==pred.AwayGoals))).all()
    assert (pred.ActualHigh4Plus==((pred.HomeGoals+pred.AwayGoals)>=4)).all()
    assert int((pred.ActualHigh4Plus&pred.XGExact).sum())==0
    assert json.loads((OUT/'report.json').read_text())['ForecastsFrozen'] is False
    raw=ROOT/'data/processed/predictions_2026_27_latest/predictions_raw.csv'
    assert hashlib.sha256(raw.read_bytes()).hexdigest()=='0afa806c8e26b9fa2a354b760128955ad40fa85b7b592bd11aa0fd3a2923f8e3'
