"""Fixed score-selection ablation; no fitting, tuning, or baseline overwrites."""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
import numpy as np
import pandas as pd
from src.evaluation.backtest_scorelines import _build_test_frame
from src.models.poisson_model import score_matrix
from src.models.predictor import (_calibrate_score_matrix, _promote_draw_outcome,
                                  _should_force_draw, _top_scores_from_matrix)

DATA = ROOT / 'data/processed'

def scores(h, a, probs):
    raw = score_matrix(np.array([h]), np.array([a]))
    calibrated = _calibrate_score_matrix(raw, probs, h, a)
    forced = calibrated.copy()
    if _should_force_draw(probs, h, a):
        forced *= np.eye(forced.shape[0])
    return {'poisson_direct': _top_scores_from_matrix(raw[0])[0],
            'calibrated_no_force': _top_scores_from_matrix(calibrated)[0],
            'current_reconstructed': _top_scores_from_matrix(forced)[0]}

def result(score):
    h, a = map(int, score.split('-'))
    return 'H' if h > a else 'A' if a > h else 'D'

def metrics(frame, column):
    actual = frame.actual_score.map(result)
    predicted = frame[column].map(result)
    goals = lambda s: sum(map(int, s.split('-')))
    return {'matches': len(frame), 'exact_hits': int((frame[column] == frame.actual_score).sum()),
            'exact_accuracy': float((frame[column] == frame.actual_score).mean()),
            'outcome_accuracy': float((actual == predicted).mean()),
            'draw_hits': int(((actual == 'D') & (predicted == 'D')).sum()),
            'actual_draws': int((actual == 'D').sum()),
            'total_goals_mae': float((frame[column].map(goals)-frame.actual_score.map(goals)).abs().mean()),
            'score_distribution': frame[column].value_counts().to_dict()}

def main():
    historical = _build_test_frame(ROOT / 'models/saved_models', DATA / 'features_matches.csv')
    assert len(historical) == 760
    assert not historical.duplicated(['Date','HomeTeam','AwayTeam']).any()
    rows = []
    for r in historical.itertuples():
        h, a = r.expected_home_goals, r.expected_away_goals
        cb = np.array([r.catboost_AwayWinProb,r.catboost_DrawProb,r.catboost_HomeWinProb])
        xgb = np.array([r.xgboost_AwayWinProb,r.xgboost_DrawProb,r.xgboost_HomeWinProb])
        pp = np.array([r.poisson_AwayWinProb,r.poisson_DrawProb,r.poisson_HomeWinProb])
        p = (cb+xgb)/2
        p = .75*_promote_draw_outcome(p/p.sum(),h,a)+.25*pp
        rows.append(dict(season=r.Season,date=str(r.Date.date()),home=r.HomeTeam,away=r.AwayTeam,
                         actual_score=f'{int(r.HomeGoals)}-{int(r.AwayGoals)}',**scores(h,a,p/p.sum())))
    hist = pd.DataFrame(rows)
    baseline_path = DATA / 'predictions_2026_2027_harddraw_v3.csv'
    pred = pd.read_csv(baseline_path)
    actual = pd.read_csv(DATA / 'actual_results_2026_2027_mw1_3.csv')
    joined = actual.merge(pred,on=['fixture_date','home_team','away_team'],validate='one_to_one')
    assert len(joined) == len(actual) == 30
    rows = []
    for r in joined.itertuples():
        p = np.array([r.away_win,r.draw,r.home_win])
        rows.append(dict(date=r.fixture_date,home=r.home_team,away=r.away_team,actual_score=r.actual_score,
                         frozen_harddraw_v3=r.ensemble_predicted_score.removeprefix('="').removesuffix('"'),
                         **scores(r.expected_home_goals,r.expected_away_goals,p)))
    recent = pd.DataFrame(rows)
    variants = ['current_reconstructed','poisson_direct','calibrated_no_force']
    report = {'baseline_sha256': hashlib.sha256(baseline_path.read_bytes()).hexdigest(),
              'notes': ['No parameter tuning or model fitting.',
                        'Historical baseline reconstructed with current predictor code; not proof of historical harddraw_v3 code identity.',
                        'Recent alternatives use frozen expected goals and outcome probabilities.',
                        'Previously inspected test sets are diagnostic, not a new untouched holdout.',
                        'Recent actual-results sources are recorded in comparison_harddraw_v3_mw1_3.json.'],
              'historical': {c:metrics(hist,c) for c in variants},
              'by_season': {s:{c:metrics(g,c) for c in variants} for s,g in hist.groupby('season')},
              'recent': {c:metrics(recent,c) for c in variants+['frozen_harddraw_v3']},
              'recent_reconstruction_mismatches': int((recent.current_reconstructed != recent.frozen_harddraw_v3).sum())}
    hist.to_csv(DATA / 'score_selection_ablation_historical_v1.csv',index=False)
    recent.to_csv(DATA / 'score_selection_ablation_mw1_3_v1.csv',index=False)
    (DATA / 'score_selection_ablation_v1.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2))

if __name__ == '__main__':
    main()
