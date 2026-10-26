"""Train an isolated Poisson baseline and select rate scales on validation only."""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
import joblib
import numpy as np
import pandas as pd
from scipy.stats import poisson
from src.models.model_utils import load_feature_data, split_by_season
from src.models.poisson_model import fit_poisson_models, _prepare_matrix, FEATURE_COLUMNS

OUT = ROOT / 'data/processed/poisson_goal_calibration_v1'

def evaluate(frame, rates):
    # Independent Poisson modes; at integer lambda choose the higher tied mode.
    predicted = np.floor(rates).astype(int)
    actual = frame[['HomeGoals','AwayGoals']].to_numpy(dtype=int)
    exact = np.all(predicted == actual, axis=1)
    ad = np.sign(actual[:,0]-actual[:,1])
    pdiff = np.sign(predicted[:,0]-predicted[:,1])
    metrics = dict(matches=len(frame), exact_hits=int(exact.sum()), exact_accuracy=float(exact.mean()),
        outcome_accuracy=float((ad==pdiff).mean()),
        score_nll=float(-poisson.logpmf(actual, rates).sum(axis=1).mean()),
        goal_rate_mae=float(np.abs(actual-rates).mean()),
        total_goals_mae=float(np.abs(actual.sum(axis=1)-predicted.sum(axis=1)).mean()),
        actual_draws=int((ad==0).sum()), draw_hits=int(((ad==0)&(pdiff==0)).sum()),
        mean_actual_goals=actual.mean(axis=0).tolist(), mean_expected_goals=rates.mean(axis=0).tolist())
    return metrics, predicted

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    feature_path = ROOT / 'data/processed/features_matches.csv'
    splits = split_by_season(load_feature_data(feature_path))
    assert splits['train'].Date.max() < splits['validation'].Date.min()
    assert splits['validation'].Date.max() < splits['test'].Date.min()
    home, away, fill = fit_poisson_models(splits['train'])
    def rates(frame):
        matrix, _ = _prepare_matrix(frame, fill)
        return np.clip(np.column_stack([home.predict(matrix),away.predict(matrix)]),.05,None)
    validation_rates = rates(splits['validation'])
    candidates = []
    for hs in (.8,.9,1.,1.1,1.2):
        for aws in (.8,.9,1.,1.1,1.2):
            metric, _ = evaluate(splits['validation'],validation_rates*np.array([hs,aws]))
            candidates.append(dict(home_scale=hs,away_scale=aws,**metric))
    # Prespecified priority: exact hits, joint score NLL, smallest scale change.
    selected = min(candidates,key=lambda c:(-c['exact_hits'],c['score_nll'],abs(c['home_scale']-1)+abs(c['away_scale']-1)))
    scale = np.array([selected['home_scale'],selected['away_scale']])
    pd.DataFrame(candidates).to_csv(OUT/'validation_candidates.csv',index=False)
    report = dict(selection='25 fixed scale pairs; maximize validation exact hits, tie-break by score NLL then distance from identity.',
        training_seasons=sorted(splits['train'].Season.unique().tolist()), train_rows=len(splits['train']),
        validation_seasons=['2023/24'], selected_scales=scale.tolist(),
        feature_sha256=hashlib.sha256(feature_path.read_bytes()).hexdigest(),
        notes=['Experimental model trained on train seasons only; no validation/test fitting.',
               'Previously examined test seasons are diagnostic, not an untouched final holdout.',
               'Recent 30-match analysis transfers selected scales to frozen original-model rates; not an evaluation of the newly fitted model on recent fixtures.',
               'Exact independent Poisson mode has no 6-goal truncation. Integer-rate ties choose higher mode.',
               'No production model or harddraw_v3 file overwritten.'], evaluations={})
    for label, frame in [('validation',splits['validation']),('test_all',splits['test'])]+list(splits['test'].groupby('Season')):
        raw = rates(frame)
        base, bs = evaluate(frame,raw)
        calibrated, cs = evaluate(frame,raw*scale)
        report['evaluations'][label] = dict(baseline=base,calibrated=calibrated,
            gained=int((np.all(cs==frame[['HomeGoals','AwayGoals']].to_numpy(),axis=1)&~np.all(bs==frame[['HomeGoals','AwayGoals']].to_numpy(),axis=1)).sum()),
            lost=int((np.all(bs==frame[['HomeGoals','AwayGoals']].to_numpy(),axis=1)&~np.all(cs==frame[['HomeGoals','AwayGoals']].to_numpy(),axis=1)).sum()))
        output = frame[['Date','Season','HomeTeam','AwayTeam','HomeGoals','AwayGoals']].copy()
        for name, arr in [('baseline',bs),('calibrated',cs)]:
            output[name+'_score'] = [f'{h}-{a}' for h,a in arr]
        output['baseline_home_rate'],output['baseline_away_rate'] = raw[:,0],raw[:,1]
        output.to_csv(OUT/(label.replace('/','_')+'.csv'),index=False)
    frozen_path = ROOT/'data/processed/predictions_2026_2027_harddraw_v3.csv'
    frozen = pd.read_csv(frozen_path)
    actual = pd.read_csv(ROOT/'data/processed/actual_results_2026_2027_mw1_3.csv')
    recent = actual.merge(frozen,on=['fixture_date','home_team','away_team'],validate='one_to_one')
    assert len(recent)==30
    recent[['HomeGoals','AwayGoals']] = recent.actual_score.str.split('-',expand=True).astype(int)
    raw = recent[['expected_home_goals','expected_away_goals']].to_numpy()
    report['recent_frozen_rate_transfer'] = {name:evaluate(recent,rr)[0] for name,rr in [('baseline',raw),('calibrated',raw*scale)]}
    all_rates = frozen[['expected_home_goals','expected_away_goals']].to_numpy()
    output = frozen[['fixture_date','home_team','away_team']].copy()
    for name, rr in [('poisson_baseline',all_rates),('poisson_calibrated',all_rates*scale)]:
        output[name+'_score'] = [f'{h}-{a}' for h,a in np.floor(rr).astype(int)]
        output[name+'_home_rate'],output[name+'_away_rate'] = rr[:,0],rr[:,1]
    output.to_csv(OUT/'frozen_fixture_rate_transfer.csv',index=False)
    report['frozen_prediction_sha256'] = hashlib.sha256(frozen_path.read_bytes()).hexdigest()
    joblib.dump(dict(home_goals_model=home,away_goals_model=away,fill_values=fill.to_dict(),
                     feature_columns=FEATURE_COLUMNS,rate_scales=scale.tolist()),OUT/'experimental_poisson.joblib')
    (OUT/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2))

if __name__ == '__main__':
    main()
