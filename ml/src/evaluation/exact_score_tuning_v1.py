"""P15: interpretable chronological score-prior corrections."""
from __future__ import annotations

import hashlib,json
from math import factorial
from pathlib import Path
import numpy as np,pandas as pd
from scipy.stats import binomtest

from src.evaluation.learned_score_cell_ranking_v1 import ROOT,OUT as P12,GRID,FOLDS,DIAG

OUT=ROOT/'data/processed/exact_score_tuning_v1'
METHODS=['RAW','PRIOR_RATIO','LOG_PRIOR','TOTAL_MARGIN','ELO_PRIOR','CONFIDENCE_PRIOR']
ALPHAS=[.10,.25,.50]
ELO_EDGES=[-np.inf,-150,-50,50,150,np.inf]
SMOOTH=20.0; SHRINK=.5; CAP=(.5,2.0)

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def save_json(name,obj): (OUT/name).write_text(json.dumps(obj,indent=2,default=str),encoding='utf-8')
def matrix(lh,la):
    ph=np.array([np.exp(-lh)*lh**i/factorial(i) for i in range(7)])
    pa=np.array([np.exp(-la)*la**i/factorial(i) for i in range(7)])
    p=np.outer(ph,pa).reshape(-1); p/=p.sum()
    assert np.isfinite(p).all() and (p>=0).all() and np.isclose(p.sum(),1)
    return p
def normalize(v):
    v=np.maximum(np.asarray(v,float),0); s=v.sum(); assert np.isfinite(v).all() and s>0
    return v/s
def actual_cell(frame):
    h=frame.HomeGoals.to_numpy(int); a=frame.AwayGoals.to_numpy(int)
    return np.where((h<=6)&(a<=6),h*7+a,-1)
def confidence_bucket(p,edges): return np.digitize(p.max(axis=1),edges[1:-1],right=False)

def correction(actual,pred,groups=None):
    actual=np.asarray(actual); n=len(actual); groups=np.zeros(n,int) if groups is None else np.asarray(groups)
    result={}
    for group in sorted(set(groups)):
        mask=groups==group; expected=pred[mask].sum(axis=0); observed=np.bincount(actual[mask][actual[mask]>=0],minlength=49).astype(float)
        # Bayesian shrink actual counts toward the model's expected counts, then shrink ratio toward one.
        posterior=(observed+SMOOTH*(expected/max(expected.sum(),1e-12)))/(mask.sum()+SMOOTH)
        model=expected/max(expected.sum(),1e-12)
        ratio=np.divide(posterior,model,out=np.ones(49),where=model>0)
        result[int(group)]=np.clip(1+SHRINK*(ratio-1),*CAP)
    return result

def total_margin_correction(actual,pred):
    totals=np.minimum(GRID[:,0]+GRID[:,1],5); margins=np.clip(GRID[:,0]-GRID[:,1],-3,3)
    actual_valid=actual>=0; ai=np.maximum(actual,0); at=totals[ai]; am=margins[ai]
    exp_t=np.array([pred[:,totals==t].sum() for t in range(6)]); obs_t=np.array([((at==t)&actual_valid).sum() for t in range(6)])
    exp_m=np.array([pred[:,margins==m].sum() for m in range(-3,4)]); obs_m=np.array([((am==m)&actual_valid).sum() for m in range(-3,4)])
    def ratios(obs,exp):
        post=(obs+SMOOTH*exp/exp.sum())/(len(actual)+SMOOTH); raw=post/(exp/exp.sum())
        return np.clip(1+SHRINK*(raw-1),*CAP)
    rt=ratios(obs_t,exp_t); rm=ratios(obs_m,exp_m)
    return np.sqrt(rt[totals]*rm[margins]),rt,rm

def historical_prior(actual):
    counts=np.bincount(actual[actual>=0],minlength=49).astype(float)
    return (counts+1)/(counts.sum()+49)

def tune_alpha(train,pred):
    seasons=sorted(train.Season.unique()); inner=seasons[-1]; fit=train.Season!=inner; valid=~fit
    a=actual_cell(train); prior=historical_prior(a[fit]); truth=a[valid]
    scores={alpha:int((np.argmax(pred[valid]*prior[None,:]**alpha,axis=1)==truth).sum()) for alpha in ALPHAS}
    return sorted(ALPHAS,key=lambda x:(-scores[x],x))[0],scores,inner

def fit_params(train,pred,method,alpha=None):
    a=actual_cell(train)
    if method=='PRIOR_RATIO': return {'corr':correction(a,pred)}
    if method=='LOG_PRIOR': return {'prior':historical_prior(a),'alpha':alpha}
    if method=='TOTAL_MARGIN':
        corr,rt,rm=total_margin_correction(a,pred); return {'corr':corr,'total':rt,'margin':rm}
    if method=='ELO_PRIOR':
        groups=np.digitize(train.EloDiffPre.to_numpy(float),ELO_EDGES[1:-1]); return {'corr':correction(a,pred,groups)}
    if method=='CONFIDENCE_PRIOR':
        edges=np.quantile(pred.max(axis=1),[0,.33,.67,1]); edges[0]=-np.inf;edges[-1]=np.inf
        groups=confidence_bucket(pred,edges); return {'corr':correction(a,pred,groups),'edges':edges}
    return {}
def apply(method,p,frame,params):
    if method=='RAW': return p.copy(),np.zeros(len(frame),int)
    if method=='PRIOR_RATIO': groups=np.zeros(len(frame),int); factors=np.stack([params['corr'][0]]*len(frame))
    elif method=='LOG_PRIOR': groups=np.zeros(len(frame),int); factors=np.stack([params['prior']**params['alpha']]*len(frame))
    elif method=='TOTAL_MARGIN': groups=np.zeros(len(frame),int); factors=np.stack([params['corr']]*len(frame))
    elif method=='ELO_PRIOR':
        groups=np.digitize(frame.EloDiffPre.to_numpy(float),ELO_EDGES[1:-1]); factors=np.stack([params['corr'][int(g)] for g in groups])
    elif method=='CONFIDENCE_PRIOR':
        groups=confidence_bucket(p,params['edges']); factors=np.stack([params['corr'][int(g)] for g in groups])
    adjusted=np.stack([normalize(row*f) for row,f in zip(p,factors)])
    return adjusted,groups

def evaluate_part(frame,raw,method,params,fold,period):
    adj,groups=apply(method,raw,frame,params); truth=actual_cell(frame)
    raw_order=np.argsort(-raw,axis=1,kind='stable'); order=np.argsort(-adj,axis=1,kind='stable')
    selected=order[:,0]; baseline=raw_order[:,0]
    raw_rank=np.argsort(np.argsort(-raw,axis=1,kind='stable'),axis=1)
    adj_rank=np.argsort(np.argsort(-adj,axis=1,kind='stable'),axis=1)
    valid=truth>=0; safe=np.maximum(truth,0)
    out=frame[['Date','Season','HomeTeam','AwayTeam','HomeGoals','AwayGoals','BaseLambdaHome','BaseLambdaAway','EloDiffPre']].copy().reset_index(drop=True)
    out['Method']=method;out['Fold']=fold;out['Period']=period;out['GroupBucket']=groups
    out['BaselineCell']=baseline;out['TunedCell']=selected;out['ActualCell']=truth
    out['BaselineScore']=[f'{i//7}-{i%7}' for i in baseline];out['TunedScore']=[f'{i//7}-{i%7}' for i in selected]
    out['BaselineProb']=raw[np.arange(len(frame)),baseline];out['TunedRawProb']=raw[np.arange(len(frame)),selected]
    out['TunedAdjustedProb']=adj[np.arange(len(frame)),selected];out['TunedRawRank']=raw_rank[np.arange(len(frame)),selected]+1
    out['BaselineExact']=baseline==truth;out['TunedExact']=selected==truth;out['ActualHigh4Plus']=(frame.HomeGoals+frame.AwayGoals).to_numpy()>=4
    out['BaselineTop3']=valid&(raw_rank[np.arange(len(frame)),safe]<3);out['TunedTop3']=valid&(adj_rank[np.arange(len(frame)),safe]<3)
    out['BaselineTop5']=valid&(raw_rank[np.arange(len(frame)),safe]<5);out['TunedTop5']=valid&(adj_rank[np.arange(len(frame)),safe]<5)
    out['BaselineActualRank']=np.where(valid,raw_rank[np.arange(len(frame)),safe]+1,50);out['TunedActualRank']=np.where(valid,adj_rank[np.arange(len(frame)),safe]+1,50)
    return out

def metrics(part):
    high=part.ActualHigh4Plus
    return dict(N=len(part),BaselineExact=int(part.BaselineExact.sum()),TunedExact=int(part.TunedExact.sum()),DeltaExact=int(part.TunedExact.sum()-part.BaselineExact.sum()),
      Changed=int((part.BaselineCell!=part.TunedCell).sum()),BaselineOnly=int((part.BaselineExact&~part.TunedExact).sum()),TunedOnly=int((~part.BaselineExact&part.TunedExact).sum()),
      HighN=int(high.sum()),BaselineHighExact=int((high&part.BaselineExact).sum()),TunedHighExact=int((high&part.TunedExact).sum()),
      BaselineHighTop3=int((high&part.BaselineTop3).sum()),TunedHighTop3=int((high&part.TunedTop3).sum()),BaselineHighTop5=int((high&part.BaselineTop5).sum()),TunedHighTop5=int((high&part.TunedTop5).sum()),
      BaselineHighMeanRank=float(part.loc[high,'BaselineActualRank'].mean()),TunedHighMeanRank=float(part.loc[high,'TunedActualRank'].mean()),
      BaselinePredHigh=int(part.BaselineCell.map(lambda i:i//7+i%7>=4).sum()),TunedPredHigh=int(part.TunedCell.map(lambda i:i//7+i%7>=4).sum()))
def tv(actual,pred):
    ac=np.bincount(actual[actual>=0],minlength=49)/len(actual); pc=np.bincount(pred,minlength=49)/len(pred)
    return float(.5*np.abs(ac-pc).sum())
def entropy(cells):
    p=np.bincount(cells,minlength=49)/len(cells);p=p[p>0];return float(-(p*np.log(p)).sum())

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    frame=pd.read_csv(P12/'fixture_oof_rates.csv',low_memory=False);frame.Date=pd.to_datetime(frame.Date)
    frame=frame[frame.Season.str[:4].astype(int).between(2016,2025)].copy().reset_index(drop=True)
    assert len(frame)==3800 and not frame.Season.str.startswith('2026').any()
    raw=np.stack([matrix(r.BaseLambdaHome,r.BaseLambdaAway) for r in frame.itertuples()])
    baseline=np.argmax(raw,axis=1); assert np.array_equal(baseline,np.floor(frame.BaseLambdaHome).astype(int)*7+np.floor(frame.BaseLambdaAway).astype(int))
    manifest=dict(Methods=METHODS,Alphas=ALPHAS,SmoothingPseudoMatches=SMOOTH,RatioShrink=SHRINK,RatioCap=CAP,EloEdges=['-inf',-150,-50,50,150,'inf'],
      ConfidenceBuckets='training raw Top1 probability 0/33/67/100 percentiles',Grid='0..6 x 0..6',Folds=FOLDS,Diagnostic=DIAG,
      Upstream='P12 chronological OOF XGB-rate fixture lambdas',No2026=True,ProtectedSHA=sha(ROOT/'data/processed/predictions_2026_27_latest/predictions_raw.csv'))
    save_json('experiment_manifest.json',manifest)
    outputs=[];params_rows=[]
    for season in FOLDS:
        year=int(season[:4]);tm=frame.Season.str[:4].astype(int).between(2016,year-1);vm=frame.Season==season
        train=frame[tm];valid=frame[vm]; assert train.Date.max()<valid.Date.min() and len(valid)==380
        alpha,scores,inner=tune_alpha(train,raw[tm])
        for method in METHODS:
            params=fit_params(train,raw[tm],method,alpha)
            outputs.append(evaluate_part(valid,raw[vm],method,params,season,'PreDiagnostic'))
            params_rows.append(dict(Fold=season,Method=method,TrainN=len(train),TrainMaxDate=train.Date.max(),Alpha=alpha if method=='LOG_PRIOR' else None,InnerSeason=inner if method=='LOG_PRIOR' else None,InnerScores=json.dumps(scores) if method=='LOG_PRIOR' else None,Parameters=json.dumps(params,default=lambda x:np.asarray(x).tolist())))
    pred=pd.concat(outputs,ignore_index=True);pred.to_csv(OUT/'walk_forward_predictions.csv',index=False)
    folds=pd.DataFrame([dict(Method=m,Season=s,**metrics(pred[(pred.Method==m)&(pred.Season==s)])) for m in METHODS for s in FOLDS]);folds.to_csv(OUT/'fold_results.csv',index=False)
    pooled=pd.DataFrame([dict(Method=m,**metrics(pred[pred.Method==m])) for m in METHODS])
    selected=str(pooled.sort_values(['TunedExact','Method'],ascending=[False,True]).iloc[0].Method)
    save_json('selection_decision.json',dict(Selected=selected,Rule='maximum pooled pre-diagnostic Exact Top-1; ties lexical deterministic',Pooled=pooled.to_dict('records'),NoDiagnosticSelection=True))
    # Freeze selected method parameters using history through 2023/24, then open diagnostic once.
    tm=frame.Season.str[:4].astype(int).between(2016,2023);vm=frame.Season.isin(DIAG);train=frame[tm];valid=frame[vm]
    alpha,scores,inner=tune_alpha(train,raw[tm]);params=fit_params(train,raw[tm],selected,alpha)
    diag=evaluate_part(valid,raw[vm],selected,params,'Inspected760','InspectedDiagnostic');diag.to_csv(OUT/'diagnostic_predictions.csv',index=False)
    params_rows.append(dict(Fold='Inspected760',Method=selected,TrainN=len(train),TrainMaxDate=train.Date.max(),Alpha=alpha if selected=='LOG_PRIOR' else None,InnerSeason=inner if selected=='LOG_PRIOR' else None,InnerScores=json.dumps(scores) if selected=='LOG_PRIOR' else None,Parameters=json.dumps(params,default=lambda x:np.asarray(x).tolist())))
    pd.DataFrame(params_rows).to_csv(OUT/'correction_parameters.csv',index=False)
    best=pred[pred.Method==selected]; best.to_csv(OUT/'selected_walk_forward_predictions.csv',index=False)
    # Realism, families, high groups and transitions.
    frequency=[];families=[];high_rows=[];realism_detail=[];total_rows=[]
    for period,part in [('PreDiagnostic',best),('InspectedDiagnostic',diag)]:
        actual=part.HomeGoals.astype(str)+'-'+part.AwayGoals.astype(str)
        for score in sorted(set(actual)|set(part.BaselineScore)|set(part.TunedScore)):
            frequency.append(dict(Period=period,Score=score,Actual=int((actual==score).sum()),Baseline=int((part.BaselineScore==score).sum()),Tuned=int((part.TunedScore==score).sum())))
        actual_cells=actual_cell(part); b=part.BaselineCell.to_numpy(); t=part.TunedCell.to_numpy()
        for source,cells in [('Actual',actual_cells[actual_cells>=0]),('Baseline',b),('Tuned',t)]:
            home=cells//7;away=cells%7; counts=np.bincount(cells,minlength=49); common=int(np.argmax(counts))
            realism_detail.append(dict(Period=period,Source=source,N=len(cells),DrawRate=float(np.mean(home==away)),HomeWinRate=float(np.mean(home>away)),AwayWinRate=float(np.mean(home<away)),UniqueScores=int(np.count_nonzero(counts)),Entropy=entropy(cells),MostCommon=f'{common//7}-{common%7}',MostCommonCount=int(counts[common]),MostCommonPct=float(counts[common]/len(cells))))
            totals=home+away
            for bucket in range(6): total_rows.append(dict(Period=period,Source=source,TotalGoals=str(bucket) if bucket<5 else '5+',Count=int((totals==bucket).sum()) if bucket<5 else int((totals>=5).sum())))
        family_defs={'0-0':['0-0'],'1-0/0-1':['1-0','0-1'],'1-1':['1-1'],'2-0/0-2':['2-0','0-2'],'2-1/1-2':['2-1','1-2'],'2-2':['2-2'],'3-0/0-3':['3-0','0-3'],'3-1/1-3':['3-1','1-3'],'3-2/2-3':['3-2','2-3'],'4+ individual':[f'{h}-{a}' for h,a in GRID if h+a>=4]}
        for name,scoreset in family_defs.items():
            mask=actual.isin(scoreset);families.append(dict(Period=period,Family=name,Actual=int(mask.sum()),BaselinePredicted=int(part.BaselineScore.isin(scoreset).sum()),TunedPredicted=int(part.TunedScore.isin(scoreset).sum()),BaselineHits=int((mask&part.BaselineExact).sum()),TunedHits=int((mask&part.TunedExact).sum())))
        total=part.HomeGoals+part.AwayGoals
        for name,mask in [('0-1',total<=1),('2',total==2),('3',total==3),('4',total==4),('5+',total>=5),('4+',total>=4)]:
            sub=part[mask];high_rows.append(dict(Period=period,ActualTotal=name,N=len(sub),BaselineExact=int(sub.BaselineExact.sum()),TunedExact=int(sub.TunedExact.sum()),BaselineTop3=int(sub.BaselineTop3.sum()),TunedTop3=int(sub.TunedTop3.sum()),BaselineTop5=int(sub.BaselineTop5.sum()),TunedTop5=int(sub.TunedTop5.sum()),BaselineMeanRank=float(sub.BaselineActualRank.mean()),TunedMeanRank=float(sub.TunedActualRank.mean()),BaselineMedianRank=float(sub.BaselineActualRank.median()),TunedMedianRank=float(sub.TunedActualRank.median())))
    pd.DataFrame(frequency).to_csv(OUT/'score_frequency_comparison.csv',index=False);pd.DataFrame(families).to_csv(OUT/'score_family_analysis.csv',index=False);pd.DataFrame(high_rows).to_csv(OUT/'high_score_audit.csv',index=False)
    pd.DataFrame(realism_detail).to_csv(OUT/'realism_detail.csv',index=False);pd.DataFrame(total_rows).to_csv(OUT/'total_goal_frequency.csv',index=False)
    flips=pd.concat([best,diag]);flips=flips[flips.BaselineCell!=flips.TunedCell].copy();flips['Transition']=flips.BaselineScore+' -> '+flips.TunedScore;flips.to_csv(OUT/'prediction_flips.csv',index=False)
    transition=flips.groupby(['Period','Transition']).size().reset_index(name='Matches').sort_values(['Period','Matches'],ascending=[True,False]);transition.to_csv(OUT/'transition_counts.csv',index=False)
    realism=[]
    for method in METHODS:
        part=pred[pred.Method==method];truth=actual_cell(part);actual=actual_cell(part);b=part.BaselineCell.to_numpy();t=part.TunedCell.to_numpy()
        realism.append(dict(Method=method,BaselineTVD=tv(actual,b),TunedTVD=tv(actual,t),BaselineEntropy=entropy(b),TunedEntropy=entropy(t),BaselineUnique=len(set(b)),TunedUnique=len(set(t)),BaselineDrawRate=float(np.mean(b//7==b%7)),TunedDrawRate=float(np.mean(t//7==t%7))))
    pd.DataFrame(realism).to_csv(OUT/'realism_metrics.csv',index=False)
    bm=metrics(best);dm=metrics(diag);unc=dict(PreDiagnosticP=float(binomtest(bm['TunedOnly'],bm['TunedOnly']+bm['BaselineOnly'],.5).pvalue),DiagnosticP=float(binomtest(dm['TunedOnly'],dm['TunedOnly']+dm['BaselineOnly'],.5).pvalue))
    report=dict(Selected=selected,PreDiagnostic=bm,Diagnostic=dm,Folds=folds[folds.Method==selected].to_dict('records'),Pooled=pooled.to_dict('records'),Realism=pd.DataFrame(realism).to_dict('records'),Uncertainty=unc,FutureForecastsFrozen=False,ProductionChanged=False)
    save_json('report.json',report)
    (OUT/'leakage_audit.md').write_text('Every tuning fold learns priors/corrections only from earlier-season OOF matrices. LOG_PRIOR alpha is selected only on the latest season inside that fold training history, using still-earlier priors. Same-date and future results cannot enter a prior because fits are season-bounded and chronological. All adjusted matrices are finite, non-negative and normalized. The selected method is frozen from six earlier folds before the inspected 760 is evaluated. No 2026/27 row is loaded; protected raw SHA is unchanged.\n',encoding='utf-8')
    write_report(report,selected,pd.DataFrame(realism),transition)
    save_json('tests_summary.json',dict(ScriptAssertions=True,ProtectedRawUnchanged=manifest['ProtectedSHA']==sha(ROOT/'data/processed/predictions_2026_27_latest/predictions_raw.csv')))
    save_json('artifact_hashes.json',{p.name:sha(p) for p in OUT.iterdir() if p.is_file() and p.name!='artifact_hashes.json'})
    print(selected,bm,dm,unc)

def write_report(report,selected,realism,transitions):
    b=report['PreDiagnostic'];d=report['Diagnostic'];rm=realism[realism.Method==selected].iloc[0]
    label='PROMISING' if b['DeltaExact']>0 and all(r['DeltaExact']>=0 for r in report['Folds']) else ('MIXED' if b['DeltaExact']>0 else 'FAILED')
    lines=['# Exact Score Tuning & Football Realism v1','','## PLAIN-LANGUAGE SUMMARY','',
      f"Structured score tuning tested RAW, past score-frequency ratio, log prior, total+margin structure, Elo-strength prior and raw-confidence prior. The selected earlier-fold method was **{selected}**. Matched baseline Exact was **{b['BaselineExact']}/{b['N']}**; challenger **{b['TunedExact']}/{b['N']}**, delta **{b['DeltaExact']:+d}**. Verdict **{label}**. Production remains unchanged.",'',
      f"Football-realism TV distance changed **{rm.BaselineTVD:.3f} → {rm.TunedTVD:.3f}** (lower is closer to actual Top-1 frequencies). Actual 4+ exact changed **{b['BaselineHighExact']} → {b['TunedHighExact']}/{b['HighN']}**; predicted 4+ Top-1 **{b['BaselinePredHigh']} → {b['TunedPredHigh']}**. Inspected 760 diagnostic Exact changed **{d['BaselineExact']} → {d['TunedExact']} ({d['DeltaExact']:+d})** and is not used for selection.",'',
      '## Data and provenance','', 'Uses the P12 corrected-v2 chronological OOF lambdas and their normalized independent-Poisson 0–6 grids. An actual score outside the grid remains a miss with rank sentinel 50. No upstream goal model is retrained.','',
      '## Baseline reproduction','','Raw global argmax is reproduced matchwise from the saved lambdas. Baseline and every challenger share identical raw matrices.','',
      '## Walk-forward design','','Six folds 2018/19–2023/24 learn corrections only from earlier seasons. Fixed ratio smoothing is 20 pseudo-matches, shrinkage 0.5 and cap [0.5,2]. Elo edges are −150/−50/50/150. Confidence uses training-only 33/67% raw Top-1 probability quantiles. Log-prior alpha is chosen from {0.10,0.25,0.50} only within earlier history.','',
      '## Score tuning methods','','RAW is control. PRIOR_RATIO corrects exact-cell observed/model frequency. LOG_PRIOR multiplies by a smoothed historical score prior. TOTAL_MARGIN corrects total and margin structure. ELO_PRIOR uses five fixed pre-match Elo buckets. CONFIDENCE_PRIOR uses three training-derived concentration buckets.','',
      '## Exact score results','','| Method | Baseline | Tuned | Delta | Changed |','|---|---:|---:|---:|---:|']
    for r in report['Pooled']:lines.append(f"| {r['Method']} | {r['BaselineExact']} | {r['TunedExact']} | {r['DeltaExact']:+d} | {r['Changed']} |")
    lines+=['','## Results by season','','| Season | Baseline | Tuned | Delta |','|---|---:|---:|---:|']
    for r in report['Folds']:lines.append(f"| {r['Season']} | {r['BaselineExact']} | {r['TunedExact']} | {r['DeltaExact']:+d} |")
    lines+=['','## Football realism','','Full score frequencies, total-goal distributions, draw/outcome rates, unique cells, entropy and TV distance are saved in CSV artifacts. Realism is a diagnostic guardrail and never replaces Exact.','',
      '## Score-family analysis','','`score_family_analysis.csv` reports actual, selected and exact counts for 0-0, narrow wins, 1-1, 2-2, 3-goal families and individual 4+ cells.','',
      '## High-score audit','','`high_score_audit.csv` reports Exact, Top-3/5 and ranks for actual totals 0–1, 2, 3, 4, 5+ and 4+.','',
      '## Prediction flips','','Every changed match and the most common raw→tuned transitions are saved. Gains and losses are compared matchwise.','',
      '## Statistical uncertainty','',f"Earlier matched-binomial p-value **{report['Uncertainty']['PreDiagnosticP']:.4f}**; inspected diagnostic p-value **{report['Uncertainty']['DiagnosticP']:.4f}**. These communicate uncertainty, not usefulness by themselves.",'',
      '## Diagnostic-period results','',f"REPEATEDLY INSPECTED HISTORICAL DIAGNOSTIC 2024/25–2025/26: baseline **{d['BaselineExact']}/760**, tuned **{d['TunedExact']}/760**. No method or parameter was altered afterward.",'',
      '## Leakage and tests','','Chronological OOF matrices, past-only priors, inner-history alpha selection, normalized finite matrices, deterministic ordering and the protected 2026/27 SHA are audited.','',
      '## Limitations','','All historical test seasons have been repeatedly studied to different degrees. Exact-score hits are sparse; high-score cells have low support. Historical Top-1 realism does not guarantee future Exact gains.','',
      '## Decision','',f"**{label}.** Structured score tuning {'improved' if b['DeltaExact']>0 else 'did not improve'} pooled Exact. The report explicitly checks whether it learned broader football structure or shifted collapse through frequency, family and transition artifacts. No production or 2026/27 forecast is changed."]
    (OUT/'final_report.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')

if __name__=='__main__':main()
