"""Fixed recency experiment; select on 2023/24 before evaluating test seasons."""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
import joblib
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import PoissonRegressor
from src.models.model_utils import load_feature_data, split_by_season
from src.models.poisson_model import _prepare_matrix, FEATURE_COLUMNS
from src.evaluation.poisson_goal_calibration import evaluate

OUT = ROOT / 'data/processed/poisson_recency_v1'

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    protected = [ROOT/'models/saved_models/poisson_model.joblib',
                 ROOT/'data/processed/predictions_2026_2027_harddraw_v3.csv']
    digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
    before = {str(p):digest(p) for p in protected}
    path = ROOT/'data/processed/features_matches.csv'
    splits = split_by_season(load_feature_data(path))
    train, validation, test = [splits[s] for s in ('train','validation','test')]
    assert train.Date.max() < validation.Date.min() < test.Date.min()
    assert validation.Date.max() < test.Date.min()
    assert len(validation)==380 and len(test)==760
    x, fill = _prepare_matrix(train)
    vx, _ = _prepare_matrix(validation,fill)
    age = (train.Date.max()-train.Date).dt.days.to_numpy()/365.25
    models, candidates = {}, []
    for half_life in (None,1,2,4):
        name = 'uniform' if half_life is None else f'half_life_{half_life}y'
        weights = np.ones(len(train)) if half_life is None else np.exp2(-age/half_life)
        weights /= weights.mean()
        assert np.all(np.isfinite(weights)) and np.all(weights > 0)
        pair = []
        for target in ('HomeGoals','AwayGoals'):
            model = Pipeline([('scaler',StandardScaler()),
                              ('regressor',PoissonRegressor(alpha=.1,max_iter=3000))])
            # Keep scaler and imputation identical: only loss sample weights vary.
            model.fit(x,train[target].astype(float),regressor__sample_weight=weights)
            pair.append(model)
        models[name] = pair
        rates = np.clip(np.column_stack([m.predict(vx) for m in pair]),.05,None)
        metric, _ = evaluate(validation,rates)
        candidates.append(dict(name=name,half_life_years=half_life,
            effective_sample_size=float(weights.sum()**2/(weights**2).sum()),**metric))
    # Fixed priority: validation exact hits; then NLL; then prefer uniform.
    selected = min(candidates,key=lambda c:(-c['exact_hits'],c['score_nll'],c['name']!='uniform'))['name']
    (OUT/'selection.json').write_text(json.dumps(dict(selected=selected,candidates=candidates),indent=2),encoding='utf-8')
    report = dict(selected=selected,validation_candidates=candidates,
        train_rows=len(train),train_start=str(train.Date.min().date()),train_end=str(train.Date.max().date()),
        feature_sha256=digest(path),protected_sha256=before,
        method='Same 20 features, train medians, unweighted scaler, alpha=0.1; only regressor sample weights vary. Weight=2^(-age_years/half_life), normalized to mean 1. No goal-rate multipliers.',
        selection_rule='Validation 2023/24 exact hits descending, score NLL ascending, uniform tie preference. Selection persisted before test predictions.',
        limitations=['Test seasons have been examined previously; diagnostic results, not a new untouched holdout.',
                     'No recent-fixture inference: frozen rates belong to another fitted model and cannot evaluate retrained recency models.',
                     'No production replacement; historical features reused without a new full leakage audit.'],test={})
    # Evaluate baseline and validation winner only; do not pick another on test.
    for label, frame in [('all',test)]+list(test.groupby('Season')):
        tx, _ = _prepare_matrix(frame,fill)
        output = frame[['Date','Season','HomeTeam','AwayTeam','HomeGoals','AwayGoals']].copy()
        report['test'][label] = {}
        hits = {}
        for name in dict.fromkeys(['uniform',selected]):
            rates = np.clip(np.column_stack([m.predict(tx) for m in models[name]]),.05,None)
            metric, score = evaluate(frame,rates)
            report['test'][label][name] = metric
            output[name+'_score'] = [f'{h}-{a}' for h,a in score]
            output[name+'_home_rate'],output[name+'_away_rate'] = rates[:,0],rates[:,1]
            hits[name] = np.all(score==frame[['HomeGoals','AwayGoals']].to_numpy(),axis=1)
        report['test'][label]['paired_change'] = dict(gained=int((hits[selected]&~hits['uniform']).sum()),lost=int((hits['uniform']&~hits[selected]).sum()))
        output.to_csv(OUT/('test_'+label.replace('/','_')+'.csv'),index=False)
    for name in dict.fromkeys(['uniform',selected]):
        joblib.dump(dict(home_goals_model=models[name][0],away_goals_model=models[name][1],
                         feature_columns=FEATURE_COLUMNS,fill_values=fill.to_dict(),experiment=name),OUT/(name+'.joblib'))
    assert all(digest(p)==before[str(p)] for p in protected)
    (OUT/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2))

if __name__ == '__main__':
    main()
