"""Audit exact-score confidence with fixed bins and validation-selected threshold."""
import json
from pathlib import Path
import numpy as np
import pandas as pd
from scipy.stats import poisson

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT/'data/processed'
OUT = DATA/'score_confidence_audit_v1'

def enrich(frame):
    f = frame.copy()
    rates = f[['baseline_home_rate','baseline_away_rate']].to_numpy()
    modes = np.floor(rates).astype(int)
    f['score'] = [f'{h}-{a}' for h,a in modes]
    f['score_probability'] = np.prod(poisson.pmf(modes,rates),axis=1)
    actual = f[['HomeGoals','AwayGoals']].to_numpy(dtype=int)
    f['exact_hit'] = np.all(modes==actual,axis=1)
    assert np.all((f.score_probability>0)&(f.score_probability<=1))
    return f

def summary(f):
    n=len(f)
    hits=int(f.exact_hit.sum())
    if not n:
        return dict(matches=0,hits=0,accuracy=None)
    p=hits/n
    z=1.96
    center=(p+z*z/(2*n))/(1+z*z/n)
    width=z*np.sqrt(p*(1-p)/n+z*z/(4*n*n))/(1+z*z/n)
    return dict(matches=n,hits=hits,accuracy=p,
        mean_predicted_probability=float(f.score_probability.mean()),
        wilson_95_interval=[center-width,center+width])

def bins(f):
    edges=[0,.10,.125,.15,.175,.20,.25,1.000001]
    return {f'{lo:.3f}-{hi:.3f}':summary(f[(f.score_probability>=lo)&(f.score_probability<hi)]) for lo,hi in zip(edges,edges[1:])}

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    base=DATA/'poisson_goal_calibration_v1'
    val=enrich(pd.read_csv(base/'validation.csv'))
    test=enrich(pd.read_csv(base/'test_all.csv'))
    assert len(val)==380 and len(test)==760
    assert pd.to_datetime(val.Date).max()<pd.to_datetime(test.Date).min()
    # Fixed threshold grid and minimum coverage protect against tiny subsets.
    candidates=[]
    for threshold in (0,.10,.125,.15,.175,.20):
        metric=summary(val[val.score_probability>=threshold])
        candidates.append(dict(threshold=threshold,eligible=metric['matches']>=100,**metric))
    chosen=max((c for c in candidates if c['eligible']),key=lambda c:(c['accuracy'],c['matches']))['threshold']
    (OUT/'selection.json').write_text(json.dumps(dict(threshold=chosen,candidates=candidates),indent=2),encoding='utf-8')
    report=dict(selected_threshold=chosen,validation_candidates=candidates,
        methodology='Independent Poisson top-1 score probability, untruncated. Threshold selected on 2023/24 exact accuracy with >=100 validation matches. Ties prefer greater coverage.',
        limitations=['Test seasons were previously inspected and are diagnostic.',
                     'Confidence bins and all/top-50%/top-30% are fixed descriptive comparisons, not additional test-based model selection.',
                     'Top fractions are selected within each season retrospectively, not a weekly deployable rule. Threshold is deployable.',
                     'Wilson intervals assume independent matches and do not capture all season/team dependence.',
                     'No exact matchweek IDs available in historical frame; no claims about selecting 3 or 5 from actual matchweeks.'],validation_bins=bins(val),test={})
    for name,group in [('all',test)]+list(test.groupby('Season')):
        ordered=group.sort_values(['score_probability','Date','HomeTeam','AwayTeam'],ascending=[False,True,True,True])
        report['test'][name]=dict(all=summary(group),threshold_selected=summary(group[group.score_probability>=chosen]),
            top_half=summary(ordered.head(int(np.ceil(len(group)*.5)))),
            top_30_percent=summary(ordered.head(int(np.ceil(len(group)*.3)))),bins=bins(group))
    test['passes_validation_threshold']=test.score_probability>=chosen
    test.to_csv(OUT/'historical_score_confidence.csv',index=False)
    pred=pd.read_csv(DATA/'predictions_2026_2027_harddraw_v3.csv')
    rates=pred[['expected_home_goals','expected_away_goals']].to_numpy()
    modes=np.floor(rates).astype(int)
    output=pred[['fixture_date','home_team','away_team','ensemble_predicted_score']].copy()
    output['poisson_direct_score']=[f'{h}-{a}' for h,a in modes]
    output['score_probability']=np.prod(poisson.pmf(modes,rates),axis=1)
    output['passes_validation_threshold']=output.score_probability>=chosen
    output.to_csv(OUT/'frozen_fixture_score_confidence.csv',index=False)
    report['fixture_note']='Probabilities use frozen harddraw_v3 rates, not refreshed predictions or calibrated confidence; no guaranteed hit rate.'
    (OUT/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(dict(threshold=chosen,candidates=candidates,test={k:{m:v[m] for m in ('all','threshold_selected','top_half','top_30_percent')} for k,v in report['test'].items()}),indent=2))

if __name__=='__main__':
    main()
