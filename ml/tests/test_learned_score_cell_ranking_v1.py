import hashlib
import json

import numpy as np
import pandas as pd
from xgboost import XGBRanker

from src.evaluation.learned_score_cell_ranking_v1 import (
    BASE, FEATURES, GRID, OUT, P11, ROOT, candidate_features, poisson_matrix,
)


def test_candidate_features_ignore_current_and_future_result():
    fixture=dict(HomeEloPre=1500.,AwayEloPre=1480.,EloDiffPre=20.,
                 HomeGoalsForAvgLast5=1.4,AwayGoalsForAvgLast5=1.1,
                 HomeGoalsAgainstAvgLast5=1.2,AwayGoalsAgainstAvgLast5=1.3,
                 HomeGoals=1,AwayGoals=1,hXG=.5,aXG=.7)
    rates=np.array([1.45,1.22])
    before,p,ranks=candidate_features(rates,fixture)
    fixture.update(HomeGoals=6,AwayGoals=6,hXG=9.,aXG=9.,FutureGoals=99)
    after,again,other=candidate_features(rates,fixture)
    np.testing.assert_array_equal(before,after)
    np.testing.assert_array_equal(p,again)
    np.testing.assert_array_equal(ranks,other)
    assert len(GRID)==49 and ranks.min()==1 and ranks.max()==49
    assert np.isclose(poisson_matrix(rates).sum(),1)
    assert not {'HomeGoals','AwayGoals','hXG','aXG','FutureGoals'}&set(FEATURES)


def test_candidate_group_labels_and_out_of_grid():
    frame=pd.read_csv(OUT/'fixture_oof_rates.csv')
    arrays=np.load(OUT/'candidate_training_rows.npz')
    assert len(frame)==3800
    assert arrays['Features'].shape==(3800*49,len(FEATURES))
    labels=arrays['Labels'].reshape(-1,49)
    expected=((frame.HomeGoals<=6)&(frame.AwayGoals<=6)).astype(int).to_numpy()
    np.testing.assert_array_equal(labels.sum(axis=1),expected)
    np.testing.assert_array_equal(arrays['FixtureID'].reshape(-1,49)[:,0],frame.FixtureID)
    assert np.all(arrays['FixtureID'].reshape(-1,49)==frame.FixtureID.to_numpy()[:,None])
    assert expected.sum()<len(frame)


def test_walkforward_oof_parity_and_ranker_group_maximum():
    prior=pd.read_csv(P11/'walkforward_predictions.csv')
    results=pd.concat([pd.read_csv(OUT/'walk_forward_results.csv'),
                       pd.read_csv(OUT/'diagnostic_results.csv')],ignore_index=True)
    assert len(results)==3040 and not results.Season.str.startswith('2026').any()
    aligned=results.merge(prior[['Date','HomeTeam','AwayTeam','BaseLambdaHome','BaseLambdaAway',
                                  'BaseScoreHome','BaseScoreAway']],
                          on=['Date','HomeTeam','AwayTeam'],suffixes=('','_p11'),validate='one_to_one')
    assert len(aligned)==3040
    np.testing.assert_array_equal(aligned[['BaseLambdaHome','BaseLambdaAway']].to_numpy(),
                                  aligned[['BaseLambdaHome_p11','BaseLambdaAway_p11']].to_numpy())
    assert (aligned.BaselineCell==aligned.BaseScoreHome*7+aligned.BaseScoreAway).all()
    assert (results.BaselineExact==(results.BaselineCell==results.ActualCell)).all()
    assert (results.P12Exact==(results.P12Cell==results.ActualCell)).all()
    # Load a frozen ranker and verify its selected cell is the within-fixture
    # maximum of all 49 candidate ranking scores.
    row=results[results.Season=='2023/24'].iloc[0]
    frame=pd.read_csv(OUT/'fixture_oof_rates.csv')
    feat=frame[frame.FixtureID==row.FixtureID].iloc[0].to_dict()
    x,p,_=candidate_features(np.array([row.BaseLambdaHome,row.BaseLambdaAway]),feat)
    model=XGBRanker()
    model.load_model(OUT/'ranker_2023_24.json')
    scores=model.predict(pd.DataFrame(x,columns=FEATURES))
    assert int(np.argmax(scores))==int(row.P12Cell)
    assert int(np.argmax(p))==int(row.BaselineCell)
    assert np.isclose(p[int(row.P12Cell)],row.P12PoissonProb)


def test_chronology_protected_raw_and_decision():
    manifest=json.loads((OUT/'training_manifest.json').read_text())
    assert len(manifest)==8
    assert all(m['TrainMaxDate']<m['ValidMinDate'] for m in manifest)
    assert manifest[-1]['TrainMaxDate']==manifest[-2]['TrainMaxDate']
    decision=json.loads((OUT/'decision.json').read_text())
    assert decision['QualifiesForFutureChallenger'] is False
    assert decision['FuturePredictionsFrozen'] is False
    raw=ROOT/'data/processed/predictions_2026_27_latest/predictions_raw.csv'
    assert hashlib.sha256(raw.read_bytes()).hexdigest()=='0afa806c8e26b9fa2a354b760128955ad40fa85b7b592bd11aa0fd3a2923f8e3'
