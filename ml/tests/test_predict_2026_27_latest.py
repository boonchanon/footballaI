import json

import numpy as np
import pandas as pd

from src.models.ml_goal_rates_v1 import sha
from src.models.predict_2026_27_latest import (OUT,FIXTURES,MODEL_DIR,KEYS,load_fixtures,load_results,
    history_asof,calibrated_top_matrix)
from src.models.predictor import load_models,predict_match


def test_fixture_and_result_lineage_and_aliases():
    fixtures=load_fixtures()
    results=load_results(fixtures)
    assert len(fixtures)==380 and len(results)==40
    assert fixtures.FixtureID.is_unique and not fixtures.duplicated(KEYS).any()
    assert results[KEYS].merge(fixtures[KEYS],on=KEYS,how='inner').shape[0]==40
    assert fixtures.loc[fixtures.HomeTeam=='Man Utd','ModelHomeTeam'].eq('Man United').all()
    assert fixtures.loc[fixtures.HomeTeam=='Spurs','ModelHomeTeam'].eq('Tottenham').all()
    assert fixtures.loc[(fixtures.HomeTeam=='Leeds')&(fixtures.AwayTeam=='Crystal Palace'),'Date'].iloc[0]==pd.Timestamp('2026-09-20')


def test_current_and_future_results_cannot_enter_asof_features():
    models=load_models(); base=models.matches
    fixtures=load_fixtures(); results=load_results(fixtures)
    day=pd.Timestamp('2026-09-12')
    history=history_asof(base,results,day)
    assert history.Date.max()<day
    assert len(history)==len(base)+30
    fixture=fixtures[fixtures.Date==day].iloc[0]
    models.matches=history
    first=predict_match(models,fixture.ModelHomeTeam,fixture.ModelAwayTeam,day)
    altered=results.copy()
    altered.loc[altered.Date>=day,['HomeGoals','AwayGoals','Result']]=[99,99,'D']
    models.matches=history_asof(base,altered,day)
    second=predict_match(models,fixture.ModelHomeTeam,fixture.ModelAwayTeam,day)
    assert first['top_scores']==second['top_scores']
    assert first['expected_goals']==second['expected_goals']
    scores,probs=calibrated_top_matrix(first)
    assert scores==first['top_scores'][:3]
    assert np.isfinite(probs).all() and probs[0]>=probs[1]>=probs[2]>=0


def test_raw_frozen_before_separate_result_join():
    manifest=json.loads((OUT/'prediction_manifest.json').read_text())
    raw=pd.read_csv(OUT/'predictions_raw.csv')
    audit=pd.read_csv(OUT/'fixture_audit.csv')
    with_results=pd.read_csv(OUT/'predictions_with_results.csv')
    evaluation=json.loads((OUT/'current_evaluation.json').read_text())
    assert manifest['PredictionsRawSHA256']==sha(OUT/'predictions_raw.csv')==evaluation['RawPredictionSHA256']
    assert len(audit)==380 and len(raw)==manifest['PredictionsN']==manifest['Predictable']
    assert raw.FixtureID.is_unique and not raw.duplicated(KEYS).any()
    assert not any(name in raw for name in ('ActualHomeGoals','ActualAwayGoals','ActualScore','ExactCorrect'))
    assert set(['ActualHomeGoals','ActualAwayGoals','ActualScore','ExactCorrect'])<=set(with_results)
    assert len(with_results)==manifest['PlayedVerified']==evaluation['N']==40
    assert (raw.Top1Probability>=raw.Top2Probability).all() and (raw.Top2Probability>=raw.Top3Probability).all()
    assert ((raw[['Top1Probability','Top2Probability','Top3Probability']]>=0)&(raw[['Top1Probability','Top2Probability','Top3Probability']]<=1)).all().all()
    assert raw.PredictionType.value_counts().to_dict()=={'PRE-KICKOFF PREDICTION':340,'RETROSPECTIVE RECONSTRUCTION':40}
    assert not manifest['Retraining'] and not manifest['Tuning'] and not manifest['NewScoreAdjustment']


def test_frozen_model_source_hashes_unchanged():
    manifest=json.loads((OUT/'prediction_manifest.json').read_text())
    assert manifest['FixtureSourceSHA256']==sha(FIXTURES)
    for name,expected in manifest['ModelFiles'].items():
        assert sha(MODEL_DIR/name)==expected


def test_far_future_history_coverage_is_flagged_without_changing_raw():
    summary=json.loads((OUT/'feature_coverage_summary.json').read_text())
    manifest=json.loads((OUT/'prediction_manifest.json').read_text())
    coverage=pd.read_csv(OUT/'feature_coverage_audit.csv')
    assert summary['RawSHA256']==manifest['PredictionsRawSHA256']==sha(OUT/'predictions_raw.csv')
    assert summary['CoverageSHA256']==sha(OUT/'feature_coverage_audit.csv')
    assert len(coverage)==380
    assert summary['FutureWithKnownPriorPLResults']==10
    assert summary['FutureWithUnknownInterveningPLResults']==330
    assert coverage.loc[coverage.PLHistoryCoverage=='INTERVENING_RESULTS_UNKNOWN','IsFuture'].all()
