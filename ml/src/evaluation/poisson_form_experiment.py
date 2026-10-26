"""Controlled form-feature experiment with validation-only selection."""
import hashlib
import json
import sys
from collections import defaultdict, deque
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
from src.models.poisson_model import FEATURE_COLUMNS
from src.evaluation.poisson_goal_calibration import evaluate

OUT = ROOT / 'data/processed/poisson_form_v1'
RECENT = [s+m+'Last5Experiment' for s in ('Home','Away') for m in ('GoalsFor','GoalsAgainst')]
VENUE = [s+m+'VenueLast5Experiment' for s in ('Home','Away') for m in ('GoalsFor','GoalsAgainst')]

def add_form(frame):
    """Read snapshots before updating ALL results on a date; no same-day leakage."""
    output = frame.copy()
    histories = defaultdict(lambda: deque(maxlen=5))
    for c in RECENT+VENUE:
        output[c] = np.nan
    for _, day in frame.groupby('Date', sort=True):
        for i, r in day.iterrows():
            for side, team, venue in [('Home',r.HomeTeam,'H'),('Away',r.AwayTeam,'A')]:
                for key, suffix in [(team,'Last5Experiment'),((team,venue),'VenueLast5Experiment')]:
                    history = histories[key]
                    if history:
                        gf, ga = np.mean(history,axis=0)
                        output.loc[i,side+'GoalsFor'+suffix] = gf
                        output.loc[i,side+'GoalsAgainst'+suffix] = ga
        for r in day.itertuples():
            for team, venue, gf, ga in [(r.HomeTeam,'H',r.HomeGoals,r.AwayGoals),(r.AwayTeam,'A',r.AwayGoals,r.HomeGoals)]:
                histories[team].append((gf,ga))
                histories[(team,venue)].append((gf,ga))
    return output

def verify_temporal_features():
    toy = pd.DataFrame(dict(Date=pd.to_datetime(['2020-01-01','2020-01-02','2020-01-03']),
        HomeTeam=['A','B','A'],AwayTeam=['B','A','B'],HomeGoals=[2,3,4],AwayGoals=[1,0,2]))
    enriched = add_form(toy)
    assert enriched.loc[2,'HomeGoalsForLast5Experiment']==1
    assert enriched.loc[2,'HomeGoalsForVenueLast5Experiment']==2
    changed = toy.copy()
    changed.loc[1:,['HomeGoals','AwayGoals']] = 99
    assert add_form(changed).loc[:1,RECENT+VENUE].equals(enriched.loc[:1,RECENT+VENUE])

def main():
    verify_temporal_features()
    OUT.mkdir(parents=True,exist_ok=True)
    paths = [ROOT/'models/saved_models/poisson_model.joblib',ROOT/'data/processed/predictions_2026_2027_harddraw_v3.csv']
    digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
    protected = {str(p):digest(p) for p in paths}
    source = ROOT/'data/processed/features_matches.csv'
    frame = load_feature_data(source)
    assert not frame.duplicated(['Date','HomeTeam','AwayTeam']).any()
    splits = split_by_season(add_form(frame))
    train, val, test = [splits[k] for k in ('train','validation','test')]
    assert train.Date.max()<val.Date.min() and val.Date.max()<test.Date.min()
    assert len(val)==380 and len(test)==760
    sets = dict(baseline=FEATURE_COLUMNS,recent5=FEATURE_COLUMNS+RECENT,
                venue5=FEATURE_COLUMNS+VENUE,recent5_venue5=FEATURE_COLUMNS+RECENT+VENUE)
    bundles, candidates = {}, []
    def predict(bundle, f):
        x = f[bundle['feature_columns']].apply(pd.to_numeric,errors='coerce').fillna(pd.Series(bundle['fill_values']))
        return np.clip(np.column_stack([bundle[k].predict(x) for k in ('home_goals_model','away_goals_model')]),.05,None)
    for name, columns in sets.items():
        x = train[columns].apply(pd.to_numeric,errors='coerce')
        fill = x.median()
        x = x.fillna(fill)
        assert np.isfinite(x.to_numpy()).all()
        bundle = dict(feature_columns=columns,fill_values=fill.to_dict())
        for target,key in [('HomeGoals','home_goals_model'),('AwayGoals','away_goals_model')]:
            model = Pipeline([('scaler',StandardScaler()),('regressor',PoissonRegressor(alpha=.1,max_iter=3000))])
            model.fit(x,train[target].astype(float))
            bundle[key] = model
        bundles[name] = bundle
        metric,_ = evaluate(val,predict(bundle,val))
        candidates.append(dict(name=name,feature_count=len(columns),**metric))
    winner = min(candidates,key=lambda c:(-c['exact_hits'],c['score_nll'],c['feature_count']))['name']
    (OUT/'selection.json').write_text(json.dumps(dict(selected=winner,candidates=candidates),indent=2),encoding='utf-8')
    report = dict(selected=winner,validation_candidates=candidates,train_rows=len(train),
        feature_sets=sets,source_sha256=digest(source),protected_sha256=protected,
        method='Uniform weights, alpha=0.1, no rate scaling. Select by validation exact hits, then score NLL, then fewer features; selection saved before test evaluation.',
        notes=['New features are means of goals for/against in last 5 matches overall or at the same venue role. Histories cross seasons.',
               'All rows on each date read history before any results from that date are appended. Missing histories use train medians.',
               'Test is sequential pre-match evaluation: previous test match results become available to later matches.',
               'Previously inspected test seasons are diagnostic; no new untouched holdout.',
               'No production inference changes; added features would require matching implementation in live predictor before deployment.'],test={})
    for label,f in [('all',test)]+list(test.groupby('Season')):
        output = f[['Date','Season','HomeTeam','AwayTeam','HomeGoals','AwayGoals']].copy()
        report['test'][label] = {}
        hits = {}
        for name in dict.fromkeys(['baseline',winner]):
            rates = predict(bundles[name],f)
            metric,scores = evaluate(f,rates)
            report['test'][label][name]=metric
            hits[name]=np.all(scores==f[['HomeGoals','AwayGoals']].to_numpy(),axis=1)
            output[name+'_score']=[f'{h}-{a}' for h,a in scores]
            output[name+'_home_rate'],output[name+'_away_rate']=rates[:,0],rates[:,1]
        report['test'][label]['paired_change']=dict(gained=int((hits[winner]&~hits['baseline']).sum()),lost=int((hits['baseline']&~hits[winner]).sum()))
        output.to_csv(OUT/('test_'+label.replace('/','_')+'.csv'),index=False)
    for name in dict.fromkeys(['baseline',winner]):
        joblib.dump(bundles[name],OUT/(name+'.joblib'))
    assert all(digest(p)==protected[str(p)] for p in paths)
    (OUT/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(dict(selected=winner,validation=[{k:c[k] for k in ('name','exact_hits','score_nll')} for c in candidates],test=report['test']),indent=2))

if __name__=='__main__':
    main()
