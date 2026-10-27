"""Fixed-rate Dixon-Coles low-score dependence ablation, not a full DC refit."""
import json
from pathlib import Path
import numpy as np
import pandas as pd
from scipy.stats import poisson

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'data/processed/poisson_goal_calibration_v1'
OUT=ROOT/'data/processed/dixon_coles_v1'

def distribution(frame,rho):
    h=frame.baseline_home_rate.to_numpy()
    a=frame.baseline_away_rate.to_numpy()
    maximum=max(20,int(np.ceil(max(h.max(),a.max())))+15)
    grid=np.arange(maximum+1)
    raw=poisson.pmf(grid[None,:],h[:,None])[:,:,None]*poisson.pmf(grid[None,:],a[:,None])[:,None,:]
    tau=np.column_stack([1-h*a*rho,1+h*rho,1+a*rho,np.full(len(h),1-rho)])
    if np.any(tau<=0):
        raise ValueError('Invalid dependence parameter for these goal rates')
    adjusted=raw.copy()
    for i,(x,y) in enumerate([(0,0),(0,1),(1,0),(1,1)]):
        adjusted[:,x,y]*=tau[:,i]
    assert np.allclose(raw.sum(axis=(1,2)),adjusted.sum(axis=(1,2)),atol=1e-12)
    assert np.all(adjusted.sum(axis=(1,2))>1-1e-9)
    return adjusted

def evaluate(frame,rho):
    matrix=distribution(frame,rho)
    mode=matrix.reshape(len(frame),-1).argmax(axis=1)
    scores=np.column_stack(np.unravel_index(mode,matrix.shape[1:]))
    actual=frame[['HomeGoals','AwayGoals']].to_numpy(dtype=int)
    # Exact likelihood, including actual scores beyond the mode-search grid.
    rates=frame[['baseline_home_rate','baseline_away_rate']].to_numpy()
    prob=poisson.pmf(actual,rates).prod(axis=1)
    for i,((x,y),(h,a)) in enumerate(zip(actual,rates)):
        if (x,y)==(0,0): prob[i]*=1-h*a*rho
        elif (x,y)==(0,1): prob[i]*=1+h*rho
        elif (x,y)==(1,0): prob[i]*=1+a*rho
        elif (x,y)==(1,1): prob[i]*=1-rho
    hit=np.all(scores==actual,axis=1)
    return dict(matches=len(frame),exact_hits=int(hit.sum()),exact_accuracy=float(hit.mean()),
        score_nll=float(-np.log(prob).mean()),outcome_accuracy=float((np.sign(scores[:,0]-scores[:,1])==np.sign(actual[:,0]-actual[:,1])).mean())),scores

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    val=pd.read_csv(BASE/'validation.csv')
    test=pd.read_csv(BASE/'test_all.csv')
    assert len(val)==380 and len(test)==760
    candidates=[]
    for rho in (-.15,-.10,-.05,0.,.05,.10,.15):
        try:
            metric,_=evaluate(val,rho)
            candidates.append(dict(rho=rho,**metric))
        except ValueError:
            pass
    chosen=min(candidates,key=lambda c:(-c['exact_hits'],c['score_nll'],abs(c['rho'])))['rho']
    (OUT/'selection.json').write_text(json.dumps(dict(rho=chosen,candidates=candidates),indent=2),encoding='utf-8')
    report=dict(rho=chosen,validation_candidates=candidates,
        method='Fixed train-only Poisson rates. DC tau: 00=1-h*a*rho, 01=1+h*rho, 10=1+a*rho, 11=1-rho. Others unchanged. Validation selection by exact hits, then score NLL, then abs(rho).',
        reference='https://doi.org/10.1111/1467-9876.00065',
        limitations=['This tests the low-score correction only, not jointly refitted team attack/defence parameters.',
                    'Previously viewed test seasons are diagnostic, not an untouched final holdout.',
                    'Saved historical rates use pre-match feature rows; live predictor is not used.'],test={})
    for label,frame in [('all',test)]+list(test.groupby('Season')):
        output=frame[['Date','Season','HomeTeam','AwayTeam','HomeGoals','AwayGoals']].copy()
        report['test'][label]={}
        for name,rho in [('baseline',0.),('selected',chosen)]:
            metric,scores=evaluate(frame,rho)
            report['test'][label][name]=metric
            output[name+'_score']=[f'{h}-{a}' for h,a in scores]
        output.to_csv(OUT/('test_'+label.replace('/','_')+'.csv'),index=False)
    assert report['test']['all']['baseline']['exact_hits']==89
    (OUT/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2))

if __name__=='__main__':
    main()
