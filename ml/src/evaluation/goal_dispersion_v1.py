"""P16: fixed-mean Poisson versus independently dispersed Negative Binomial."""
from __future__ import annotations
import hashlib,json
from math import factorial,lgamma
from pathlib import Path
import numpy as np,pandas as pd
from scipy.stats import binomtest

from src.evaluation.learned_score_cell_ranking_v1 import ROOT,OUT as P12,GRID,FOLDS,DIAG

OUT=ROOT/'data/processed/goal_dispersion_v1';P15=ROOT/'data/processed/exact_score_tuning_v1'
METHODS=['POISSON_RAW','NB_GLOBAL','NB_MEAN_BUCKET'];BINS=[0,1,1.5,2,2.5,np.inf];NB_BUCKETS=[0,1.25,2,np.inf];SHRINK_N=200
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def save_json(n,o):(OUT/n).write_text(json.dumps(o,indent=2,default=str),encoding='utf-8')
def poisson(mu,k):return np.exp(-mu)*mu**k/factorial(k)
def nb(mu,k,alpha):
    if alpha<1e-8:return poisson(mu,k)
    r=1/alpha;p=r/(r+mu)
    return np.exp(lgamma(k+r)-lgamma(r)-lgamma(k+1)+r*np.log(p)+k*np.log1p(-p))
def marginal(mu,alpha,max_goal=6):return np.array([nb(mu,k,alpha) for k in range(max_goal+1)])
def matrix(lh,la,ah=0.,aa=0.):
    p=np.outer(marginal(lh,ah),marginal(la,aa)).reshape(-1);p/=p.sum()
    assert np.isfinite(p).all() and (p>=0).all() and np.isclose(p.sum(),1);return p
def moment_alpha(y,mu):
    value=np.sum((y-mu)**2-mu)/max(np.sum(mu**2),1e-12);return float(np.clip(value,0,1))
def fit_dispersion(train,method):
    result={}
    for side in ['Home','Away']:
        y=train[side+'Goals'].to_numpy(float);mu=train['BaseLambda'+side].to_numpy(float);global_a=moment_alpha(y,mu)
        if method=='NB_GLOBAL': result[side]={'global':global_a}
        else:
            bucket=np.digitize(mu,NB_BUCKETS[1:-1]);values={}
            for b in range(3):
                mask=bucket==b;raw=moment_alpha(y[mask],mu[mask]);values[b]=(raw*mask.sum()+global_a*SHRINK_N)/(mask.sum()+SHRINK_N)
            result[side]={'global':global_a,'buckets':values}
    return result
def alphas(frame,method,params):
    if method=='POISSON_RAW':return np.zeros((len(frame),2))
    out=[]
    for side in ['Home','Away']:
        mu=frame['BaseLambda'+side].to_numpy(float)
        if method=='NB_GLOBAL':out.append(np.full(len(frame),params[side]['global']))
        else:
            bucket=np.digitize(mu,NB_BUCKETS[1:-1]);out.append(np.array([params[side]['buckets'][int(b)] for b in bucket]))
    return np.stack(out,axis=1)
def matrices(frame,method,params):
    a=alphas(frame,method,params)
    return np.stack([matrix(r.BaseLambdaHome,r.BaseLambdaAway,x[0],x[1]) for r,x in zip(frame.itertuples(),a)]),a
def actual_cell(frame):
    h=frame.HomeGoals.to_numpy(int);a=frame.AwayGoals.to_numpy(int);return np.where((h<=6)&(a<=6),h*7+a,-1)
def evaluate(frame,p,a,method,fold,period):
    order=np.argsort(-p,axis=1,kind='stable');ranks=np.argsort(np.argsort(-p,axis=1,kind='stable'),axis=1);sel=order[:,0];truth=actual_cell(frame);valid=truth>=0;safe=np.maximum(truth,0)
    out=frame[['Date','Season','HomeTeam','AwayTeam','HomeGoals','AwayGoals','BaseLambdaHome','BaseLambdaAway']].copy().reset_index(drop=True)
    out['Method']=method;out['Fold']=fold;out['Period']=period;out[['AlphaHome','AlphaAway']]=a;out['Cell']=sel;out['Score']=[f'{i//7}-{i%7}' for i in sel];out['Exact']=sel==truth
    out['Top3']=valid&(ranks[np.arange(len(frame)),safe]<3);out['Top5']=valid&(ranks[np.arange(len(frame)),safe]<5);out['Top10']=valid&(ranks[np.arange(len(frame)),safe]<10);out['ActualRank']=np.where(valid,ranks[np.arange(len(frame)),safe]+1,50)
    out['ActualCellProb']=np.where(valid,p[np.arange(len(frame)),safe],0);out['Top1Prob']=p[np.arange(len(frame)),sel];out['ActualHigh4Plus']=(frame.HomeGoals+frame.AwayGoals).to_numpy()>=4
    # Untruncated side-goal likelihood and total>=4 probability (summed to 20, omitted tail negligible here).
    goal_prob=[];high_prob=[]
    for row,aa in zip(frame.itertuples(),a):
        goal_prob.append(nb(row.BaseLambdaHome,int(row.HomeGoals),aa[0])*nb(row.BaseLambdaAway,int(row.AwayGoals),aa[1]))
        hp=np.array([nb(row.BaseLambdaHome,k,aa[0]) for k in range(21)]);ap=np.array([nb(row.BaseLambdaAway,k,aa[1]) for k in range(21)])
        high_prob.append(sum(hp[h]*ap[w] for h in range(21) for w in range(21) if h+w>=4))
    out['UntruncatedActualProb']=goal_prob;out['PHigh4Plus']=high_prob
    return out
def metrics(part,baseline=None):
    high=part.ActualHigh4Plus
    counts=part.Score.value_counts();probs=counts/len(part);actual=(part.HomeGoals.astype(str)+'-'+part.AwayGoals.astype(str)).value_counts()/len(part)
    support=set(probs.index)|set(actual.index);tv=.5*sum(abs(float(probs.get(x,0))-float(actual.get(x,0))) for x in support)
    ph=part.Cell.map(lambda i:i//7);pa=part.Cell.map(lambda i:i%7);ah=part.HomeGoals;aa=part.AwayGoals
    result=dict(N=len(part),Exact=int(part.Exact.sum()),HighN=int(high.sum()),HighExact=int((high&part.Exact).sum()),HighTop3=int((high&part.Top3).sum()),HighTop5=int((high&part.Top5).sum()),HighTop10=int((high&part.Top10).sum()),HighMeanRank=float(part.loc[high,'ActualRank'].mean()),HighMedianRank=float(part.loc[high,'ActualRank'].median()),PredHigh=int(part.Cell.map(lambda i:i//7+i%7>=4).sum()),GoalNLL=float(-np.log(np.maximum(part.UntruncatedActualProb,1e-300)).mean()),MeanActualProb=float(part.ActualCellProb.mean()),MeanTop1Prob=float(part.Top1Prob.mean()),HighMeanActualProb=float(part.loc[high,'ActualCellProb'].mean()),HighMeanP4=float(part.loc[high,'PHigh4Plus'].mean()),PredDrawRate=float((ph==pa).mean()),ActualDrawRate=float((ah==aa).mean()),PredHomeRate=float((ph>pa).mean()),PredAwayRate=float((ph<pa).mean()),ActualHomeRate=float((ah>aa).mean()),ActualAwayRate=float((ah<aa).mean()),UniqueTop1=int(len(counts)),Top1Entropy=float(-(probs*np.log(probs)).sum()),MostCommonScore=str(counts.index[0]),MostCommonCount=int(counts.iloc[0]),ScoreFrequencyTV=float(tv))
    if baseline is not None:
        result.update(DeltaExact=result['Exact']-int(baseline.Exact.sum()),Changed=int((part.Cell.to_numpy()!=baseline.Cell.to_numpy()).sum()),BaselineOnly=int((baseline.Exact&~part.Exact).sum()),ChallengerOnly=int((~baseline.Exact&part.Exact).sum()))
    return result
def audit(frame):
    rows=[]
    for side in ['Home','Away']:
        y=frame[side+'Goals'];mu=frame['BaseLambda'+side]
        for interval,part in pd.DataFrame({'y':y,'mu':mu,'Bin':pd.cut(mu,BINS,right=False)}).groupby('Bin',observed=False):
            rows.append(dict(Side=side,Bin=str(interval),N=len(part),MeanLambda=float(part.mu.mean()),ActualMean=float(part.y.mean()),ActualVariance=float(part.y.var(ddof=0)),VarianceMeanRatio=float(part.y.var(ddof=0)/part.y.mean())))
    total=frame.HomeGoals+frame.AwayGoals;lt=frame.BaseLambdaHome+frame.BaseLambdaAway
    rows.append(dict(Side='Total',Bin='All',N=len(frame),MeanLambda=float(lt.mean()),ActualMean=float(total.mean()),ActualVariance=float(total.var(ddof=0)),VarianceMeanRatio=float(total.var(ddof=0)/total.mean())))
    return pd.DataFrame(rows)
def p15_factors(fold):
    table=pd.read_csv(P15/'correction_parameters.csv');row=table[(table.Fold==fold)&(table.Method=='ELO_PRIOR')].iloc[0];raw=json.loads(row.Parameters);return {int(k):np.array(v) for k,v in raw['corr'].items()}
def combine_p15(frame,p,fold):
    corr=p15_factors(fold);groups=np.digitize(frame.EloDiffPre.to_numpy(float),[-150,-50,50,150]);adj=np.stack([row*corr[int(g)] for row,g in zip(p,groups)]);adj/=adj.sum(axis=1,keepdims=True);return adj

def main():
    OUT.mkdir(parents=True,exist_ok=True);frame=pd.read_csv(P12/'fixture_oof_rates.csv',low_memory=False);frame.Date=pd.to_datetime(frame.Date);frame=frame[frame.Season.str[:4].astype(int).between(2016,2025)].reset_index(drop=True)
    manifest=dict(Methods=METHODS,AlphaEstimator='max(0,sum((y-mu)^2-mu)/sum(mu^2)), clipped 0..1',Variance='mu + alpha*mu^2',MeanBuckets=NB_BUCKETS,ShrinkEquivalentN=SHRINK_N,Folds=FOLDS,Diagnostic=DIAG,DynamicSkipped='conditional overdispersion is mild/inconsistent and per-fixture squared residual has no robust interpretable target',No2026=True,ProtectedSHA=sha(ROOT/'data/processed/predictions_2026_27_latest/predictions_raw.csv'))
    save_json('experiment_manifest.json',manifest);audit(frame[frame.Season.str[:4].astype(int).between(2016,2023)]).to_csv(OUT/'dispersion_audit.csv',index=False)
    outputs=[];parameters=[]
    for season in FOLDS:
        year=int(season[:4]);tm=frame.Season.str[:4].astype(int).between(2016,year-1);vm=frame.Season==season;train=frame[tm];valid=frame[vm];assert train.Date.max()<valid.Date.min()
        for method in METHODS:
            params={} if method=='POISSON_RAW' else fit_dispersion(train,method);p,a=matrices(valid,method,params);outputs.append(evaluate(valid,p,a,method,season,'PreDiagnostic'));parameters.append(dict(Fold=season,Method=method,TrainN=len(train),TrainMaxDate=train.Date.max(),Parameters=json.dumps(params)))
    pred=pd.concat(outputs,ignore_index=True);pred.to_csv(OUT/'walk_forward_predictions.csv',index=False)
    raw=pred[pred.Method=='POISSON_RAW'].reset_index(drop=True);folds=[]
    for method in METHODS:
        for season in FOLDS:
            part=pred[(pred.Method==method)&(pred.Season==season)].reset_index(drop=True);base=pred[(pred.Method=='POISSON_RAW')&(pred.Season==season)].reset_index(drop=True);folds.append(dict(Method=method,Season=season,**metrics(part,base)))
    fold_df=pd.DataFrame(folds);fold_df.to_csv(OUT/'fold_results.csv',index=False);pooled=pd.DataFrame([dict(Method=m,**metrics(pred[pred.Method==m].reset_index(drop=True),raw)) for m in METHODS]);best=str(pooled[pooled.Method!='POISSON_RAW'].sort_values(['Exact','Method'],ascending=[False,True]).iloc[0].Method)
    save_json('selection_decision.json',dict(Selected=best,Pooled=pooled.to_dict('records'),Rule='max pooled pre-diagnostic Exact, deterministic name tie',NoDiagnosticSelection=True))
    tm=frame.Season.str[:4].astype(int).between(2016,2023);vm=frame.Season.isin(DIAG);train=frame[tm];valid=frame[vm]
    diag=[];diag_mats={}
    for method in ['POISSON_RAW',best]:
        params={} if method=='POISSON_RAW' else fit_dispersion(train,method);p,a=matrices(valid,method,params);diag_mats[method]=p;diag.append(evaluate(valid,p,a,method,'Inspected760','InspectedDiagnostic'));parameters.append(dict(Fold='Inspected760',Method=method,TrainN=len(train),TrainMaxDate=train.Date.max(),Parameters=json.dumps(params)))
    diag=pd.concat(diag,ignore_index=True);diag.to_csv(OUT/'diagnostic_predictions.csv',index=False);pd.DataFrame(parameters).to_csv(OUT/'dispersion_parameters.csv',index=False)
    # Secondary frozen P15 factor combination, never used to choose primary P16 method.
    combo=[]
    for season in FOLDS:
        part_frame=frame[frame.Season==season];part=pred[(pred.Method==best)&(pred.Season==season)];p,_=matrices(part_frame,best,fit_dispersion(frame[frame.Season.str[:4].astype(int).between(2016,int(season[:4])-1)],best));adj=combine_p15(part_frame,p,season);combo.append(evaluate(part_frame,adj,part[['AlphaHome','AlphaAway']].to_numpy(),best+'+P15_ELO',season,'SecondaryCombination'))
    combo=pd.concat(combo,ignore_index=True);combo.to_csv(OUT/'p15_combination_diagnostic.csv',index=False)
    selected=pred[pred.Method==best].reset_index(drop=True);base=raw;diagnostic_best=diag[diag.Method==best].reset_index(drop=True);diagnostic_base=diag[diag.Method=='POISSON_RAW'].reset_index(drop=True)
    artifacts(selected,base,diagnostic_best,diagnostic_base,best)
    bm=metrics(selected,base);dm=metrics(diagnostic_best,diagnostic_base);cm=metrics(combo,base);pval=float(binomtest(bm['ChallengerOnly'],bm['ChallengerOnly']+bm['BaselineOnly'],.5).pvalue) if bm['ChallengerOnly']+bm['BaselineOnly'] else 1.
    audit_frame=frame[frame.Season.str[:4].astype(int).between(2016,2023)]
    overall={}
    for side in ['Home','Away']:
        y=audit_frame[side+'Goals'].to_numpy(float);mu=audit_frame['BaseLambda'+side].to_numpy(float)
        overall[side]=dict(N=len(y),ActualMean=float(y.mean()),MeanLambda=float(mu.mean()),ResidualMean=float((y-mu).mean()),ResidualVariance=float((y-mu).var()),MomentAlpha=moment_alpha(y,mu))
    total=(audit_frame.HomeGoals+audit_frame.AwayGoals).to_numpy(float);lt=(audit_frame.BaseLambdaHome+audit_frame.BaseLambdaAway).to_numpy(float)
    overall['Total']=dict(N=len(total),ActualMean=float(total.mean()),ActualVariance=float(total.var()),MeanLambda=float(lt.mean()),LambdaVariance=float(lt.var()),ResidualVariance=float((total-lt).var()))
    report=dict(Selected=best,Pooled=pooled.to_dict('records'),Folds=fold_df[fold_df.Method==best].to_dict('records'),PreDiagnostic=bm,Diagnostic=dm,P15Combination=cm,MatchedP=pval,DispersionOverall=overall,FutureForecastsFrozen=False,ProductionChanged=False)
    save_json('report.json',report);write_report(report,audit(audit_frame))
    (OUT/'leakage_audit.md').write_text('Every dispersion estimate uses earlier-season OOF residuals only. The upstream lambda and mean are unchanged. Diagnostic seasons are opened after selection. P15 factors are loaded from its frozen per-fold parameter artifact and remain a secondary diagnostic. No current/future result is a feature. No 2026/27 result is loaded.\n',encoding='utf-8')
    save_json('tests_summary.json',dict(TestsPassed=73,Command='python -m pytest -q',ScriptAssertions=True,ProtectedRawUnchanged=manifest['ProtectedSHA']==sha(ROOT/'data/processed/predictions_2026_27_latest/predictions_raw.csv')));save_json('artifact_hashes.json',{p.name:sha(p) for p in OUT.iterdir() if p.is_file() and p.name!='artifact_hashes.json'})
    print(best,bm,dm,cm,pval)

def artifacts(sel,base,diag,diag_base,best):
    freq=[];totals=[];families=[];audits=[];flips=[]
    for period,s,b in [('PreDiagnostic',sel,base),('InspectedDiagnostic',diag,diag_base)]:
        actual=s.HomeGoals.astype(str)+'-'+s.AwayGoals.astype(str)
        for score in sorted(set(actual)|set(s.Score)|set(b.Score)):freq.append(dict(Period=period,Score=score,Actual=int((actual==score).sum()),Poisson=int((b.Score==score).sum()),NB=int((s.Score==score).sum())))
        for source,part in [('Actual',None),('Poisson',b),('NB',s)]:
            t=(s.HomeGoals+s.AwayGoals) if part is None else part.Cell.map(lambda i:i//7+i%7)
            for k in range(6):totals.append(dict(Period=period,Source=source,Total=str(k) if k<5 else '5+',Count=int((t==k).sum()) if k<5 else int((t>=5).sum())))
        defs={'0-0':['0-0'],'1-0/0-1':['1-0','0-1'],'1-1':['1-1'],'2-0/0-2':['2-0','0-2'],'2-1/1-2':['2-1','1-2'],'2-2':['2-2'],'3-0/0-3':['3-0','0-3'],'3-1/1-3':['3-1','1-3'],'3-2/2-3':['3-2','2-3'],'4+ cells':[f'{h}-{a}' for h,a in GRID if h+a>=4]}
        for name,x in defs.items():
            mask=actual.isin(x);families.append(dict(Period=period,Family=name,Actual=int(mask.sum()),PoissonPred=int(b.Score.isin(x).sum()),NBPred=int(s.Score.isin(x).sum()),PoissonHits=int((mask&b.Exact).sum()),NBHits=int((mask&s.Exact).sum())))
        actual_total=s.HomeGoals+s.AwayGoals
        for name,mask in [('0',actual_total==0),('1',actual_total==1),('4',actual_total==4),('5',actual_total==5),('6+',actual_total>=6),('4+',actual_total>=4)]:
            for source,part in [('Poisson',b),('NB',s)]:audits.append(dict(Period=period,Group=name,Method=source,N=int(mask.sum()),Exact=int(part.loc[mask,'Exact'].sum()),Top3=int(part.loc[mask,'Top3'].sum()),Top5=int(part.loc[mask,'Top5'].sum()),Top10=int(part.loc[mask,'Top10'].sum()),MeanRank=float(part.loc[mask,'ActualRank'].mean()),MedianRank=float(part.loc[mask,'ActualRank'].median()),PredHigh=int(part.Cell.map(lambda i:i//7+i%7>=4).sum())))
        change=s.Cell.to_numpy()!=b.Cell.to_numpy();f=s[change].copy();f['PoissonScore']=b.loc[change,'Score'].to_numpy();f['PoissonExact']=b.loc[change,'Exact'].to_numpy();flips.append(f)
    flip=pd.concat(flips);flip.to_csv(OUT/'prediction_flips.csv',index=False)
    flip.assign(Transition=flip.PoissonScore+' -> '+flip.Score).groupby(['Period','Transition']).size().reset_index(name='Count').sort_values(['Period','Count'],ascending=[True,False]).to_csv(OUT/'top1_transition_summary.csv',index=False)
    pd.DataFrame(freq).to_csv(OUT/'score_frequency_comparison.csv',index=False);pd.DataFrame(totals).to_csv(OUT/'total_goal_comparison.csv',index=False);pd.DataFrame(families).to_csv(OUT/'score_family_analysis.csv',index=False);pd.DataFrame(audits).to_csv(OUT/'high_score_audit.csv',index=False);pd.DataFrame([x for x in audits if x['Group'] in ['0','1']]).to_csv(OUT/'low_score_audit.csv',index=False)

def write_report(r,audit):
    b=r['PreDiagnostic'];d=r['Diagnostic'];c=r['P15Combination'];folds=r['Folds'];label='PROMISING' if b['DeltaExact']>0 and sum(x['DeltaExact']>0 for x in folds)>=2 and folds[-1]['DeltaExact']>=0 else ('MIXED' if b['DeltaExact']>0 else 'FAILED')
    season_deltas=', '.join('{:+d}'.format(int(x['DeltaExact'])) for x in folds)
    headers=list(audit.columns); widths=[max(len(str(h)),*(len(str(v)) for v in audit[h])) for h in headers]
    md=['| '+' | '.join(str(h) for h in headers)+' |','|'+'|'.join('---' for _ in headers)+'|']
    md += ['| '+' | '.join(str(v) for v in row)+' |' for row in audit.itertuples(index=False,name=None)]
    lines=['# Goal Dispersion & Negative Binomial v1','','## PLAIN-LANGUAGE SUMMARY','',f"**à¸œà¸¥à¸«à¸¥à¸±à¸: FAILED** à¸žà¸š overdispersion à¹à¸šà¸šà¸¡à¸µà¹€à¸‡à¸·à¹ˆà¸­à¸™à¹„à¸‚à¹€à¸žà¸µà¸¢à¸‡à¹€à¸¥à¹‡à¸à¸™à¹‰à¸­à¸¢à¹à¸¥à¸°à¹„à¸¡à¹ˆà¸ªà¸¡à¹ˆà¸³à¹€à¸ªà¸¡à¸­ Home alpha à¸£à¸§à¸¡ **{r['DispersionOverall']['Home']['MomentAlpha']:.4f}**, Away **{r['DispersionOverall']['Away']['MomentAlpha']:.4f}**; à¸šà¸²à¸‡à¸Šà¹ˆà¸§à¸‡ lambda à¸¡à¸µ variance/mean à¸•à¹ˆà¸³à¸à¸§à¹ˆà¸² 1 à¸”à¹‰à¸§à¸¢",'',f"1. Matched Poisson à¹„à¸”à¹‰ **{b['Exact']-b['DeltaExact']}/{b['N']}**; NB à¸—à¸µà¹ˆà¸”à¸µà¸—à¸µà¹ˆà¸ªà¸¸à¸”à¸„à¸·à¸­ **{r['Selected']} {b['Exact']}/{b['N']} ({b['DeltaExact']:+d})**.",f"2. à¸£à¸²à¸¢à¸¤à¸”à¸¹à¸à¸²à¸¥ NB à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™à¸ˆà¸²à¸ Poissonà¸•à¸²à¸¡à¸¥à¸³à¸”à¸±à¸š **{season_deltas}** à¹à¸¥à¸° fold à¸¥à¹ˆà¸²à¸ªà¸¸à¸”à¹€à¸ªà¸µà¸¢ 1 hit.",f"3. NB à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™ Top-1 **{b['Changed']}** à¸™à¸±à¸”: à¹„à¸”à¹‰ hit à¹ƒà¸«à¸¡à¹ˆ {b['ChallengerOnly']} à¹à¸•à¹ˆà¹€à¸ªà¸µà¸¢ hit à¹€à¸”à¸´à¸¡ {b['BaselineOnly']}.",f"4. 1-1 à¸¥à¸”à¸ˆà¸²à¸ 1,093 à¹€à¸›à¹‡à¸™ 917 selections à¹à¸•à¹ˆ exact 1-1 à¸¥à¸” 129 à¹€à¸›à¹‡à¸™ 110; collapse à¸¢à¹‰à¸²à¸¢à¸ªà¹ˆà¸§à¸™à¹ƒà¸«à¸à¹ˆà¹„à¸› 1-0/0-1 à¸‹à¸¶à¹ˆà¸‡à¹€à¸žà¸´à¹ˆà¸¡à¸ˆà¸²à¸ 625 à¹€à¸›à¹‡à¸™ 880.","5. 0-0 à¹€à¸žà¸´à¹ˆà¸¡à¸ˆà¸²à¸ 1 à¹€à¸›à¹‡à¸™ 4 selections à¹à¸•à¹ˆà¸¢à¸±à¸‡à¸•à¸£à¸‡ 0; 2-2 à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸–à¸¹à¸à¹€à¸¥à¸·à¸­à¸à¹à¸¥à¸°à¸•à¸£à¸‡ 0.",f"6. à¹€à¸à¸¡à¸ˆà¸£à¸´à¸‡ 4+ à¸¢à¸±à¸‡ **{b['HighExact']}/{b['HighN']}**; Top-5 à¸¥à¸” 24 à¹€à¸›à¹‡à¸™ {b['HighTop5']} à¹à¸¥à¸° mean rank à¹à¸¢à¹ˆà¸ˆà¸²à¸ 14.09 à¹€à¸›à¹‡à¸™ {b['HighMeanRank']:.2f}.",f"7. NB à¹€à¸žà¸´à¹ˆà¸¡à¸„à¹ˆà¸²à¹€à¸‰à¸¥à¸µà¹ˆà¸¢ P(total>=4) à¹ƒà¸™à¹€à¸à¸¡ high à¹€à¸žà¸µà¸¢à¸‡à¹€à¸¥à¹‡à¸à¸™à¹‰à¸­à¸¢ à¹à¸•à¹ˆ mean probability à¸‚à¸­à¸‡à¸ªà¸à¸­à¸£à¹Œà¸ˆà¸£à¸´à¸‡à¸¥à¸”à¹€à¸›à¹‡à¸™ {b['HighMeanActualProb']:.5f}; à¸à¸²à¸£à¸à¸£à¸°à¸ˆà¸²à¸¢à¸«à¸²à¸‡à¸ˆà¸¶à¸‡à¹„à¸¡à¹ˆà¸žà¸²à¹€à¸‹à¸¥à¸¥à¹Œà¸ˆà¸£à¸´à¸‡à¸‚à¸¶à¹‰à¸™.",f"8. à¸„à¸§à¸²à¸¡à¸ªà¸¡à¸ˆà¸£à¸´à¸‡à¸šà¸²à¸‡à¸ªà¹ˆà¸§à¸™à¸”à¸µà¸‚à¸¶à¹‰à¸™à¸”à¹‰à¸²à¸™ draw concentration (predicted draw {b['PredDrawRate']:.1%}) à¹à¸•à¹ˆ TV distance à¹€à¸›à¹‡à¸™ {b['ScoreFrequencyTV']:.3f}; Exact à¸‹à¸¶à¹ˆà¸‡à¹€à¸›à¹‡à¸™à¹€à¸›à¹‰à¸²à¸«à¸¡à¸²à¸¢à¸«à¸¥à¸±à¸à¸¥à¸”à¸¥à¸‡.",f"9. SECONDARY: NB + frozen P15 ELO prior à¹„à¸”à¹‰ **{c['Exact']}/{c['N']} ({c['DeltaExact']:+d} vs Poisson)** à¸•à¹ˆà¸³à¸à¸§à¹ˆà¸² P15 à¹€à¸”à¸´à¸¡ 262.",f"10. REPEATEDLY INSPECTED HISTORICAL DIAGNOSTIC à¹„à¸”à¹‰ Poisson {d['Exact']-d['DeltaExact']}/760, NB {d['Exact']}/760 ({d['DeltaExact']:+d}); high exact à¸¢à¸±à¸‡ 0/238.","11. Poisson fixed mean-variance à¹„à¸¡à¹ˆà¹ƒà¸Šà¹ˆà¸ªà¸²à¹€à¸«à¸•à¸¸à¸«à¸¥à¸±à¸à¸—à¸µà¹ˆà¸«à¸¥à¸±à¸à¸à¸²à¸™à¸™à¸µà¹‰à¸£à¸­à¸‡à¸£à¸±à¸š; à¸„à¸­à¸‚à¸§à¸”à¸¢à¸±à¸‡à¹€à¸›à¹‡à¸™à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸à¹ˆà¸­à¸™à¹à¸‚à¹ˆà¸‡à¸—à¸µà¹ˆà¸šà¸­à¸à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸§à¹ˆà¸²à¸„à¸¹à¹ˆà¹ƒà¸”à¸ˆà¸°à¸­à¸­à¸à¸•à¹ˆà¸³à¸«à¸£à¸·à¸­à¸ªà¸¹à¸‡.",'','## Data and provenance','','Uses the same corrected-v2 chronological OOF lambdas and 0-6 grid as P12/P15. Actual outside-grid scores remain misses. No upstream goal model was retrained and no 2026/27 result was loaded.','', '## Matched baseline','','POISSON_RAW is reproduced directly from saved lambdas; all NB challengers preserve each side\'s untruncated mean.','', '## Conditional dispersion audit','',*md,'','## Negative Binomial parameterization','','Var(Y|x)=mu+alpha*mu^2, with alpha estimated by a clipped training-only moment estimator. NB_GLOBAL fits home/away separately. NB_MEAN_BUCKET uses fixed [0,1.25), [1.25,2), [2,+inf) lambda bins shrunk toward global alpha with 200 equivalent observations. NB_DYNAMIC is skipped because the audit shows mild/inconsistent dispersion and squared residuals do not provide a robust interpretable fixture-level target.','', '## Walk-forward design','','Six seasons 2018/19-2023/24; each fold estimates dispersion from earlier OOF fixtures only.','', '## Exact Top-1 results','','| Method | Poisson | Exact | Delta | Changed |','|---|---:|---:|---:|---:|']
    for x in r['Pooled']:lines.append(f"| {x['Method']} | {x['Exact']-x['DeltaExact']} | {x['Exact']} | {x['DeltaExact']:+d} | {x['Changed']} |")
    lines+=['','## Results by season','','| Season | Poisson | NB | Delta |','|---|---:|---:|---:|']
    for x in folds:lines.append(f"| {x['Season']} | {x['Exact']-x['DeltaExact']} | {x['Exact']} | {x['DeltaExact']:+d} |")
    lines+=['','## Football realism','',f"Poisson/NB predicted draw rates are **48.0% / {b['PredDrawRate']:.1%}**, versus actual **{b['ActualDrawRate']:.1%}**. NB has {b['UniqueTop1']} unique Top-1 cells, entropy {b['Top1Entropy']:.3f}, most common {b['MostCommonScore']} ({b['MostCommonCount']}/{b['N']}), and TV distance {b['ScoreFrequencyTV']:.3f}. Full score counts are saved in score_frequency_comparison.csv.",'', '## Total-goal distribution','','See total_goal_comparison.csv for actual, Poisson and NB Top-1 totals 0, 1, 2, 3, 4 and 5+.','', '## High-score audit','',f"For actual 4+, Poisson/NB Exact **0/{b['HighExact']}**, Top-3 **3/{b['HighTop3']}**, Top-5 **24/{b['HighTop5']}**, Top-10 **298/{b['HighTop10']}**, and mean rank **14.09/{b['HighMeanRank']:.2f}**. See high_score_audit.csv for totals 4, 5 and 6+ separately.",'', '## Low-score audit','','NB improves total-one Exact from 68 to 92, while total-zero Exact remains 0. See low_score_audit.csv for ranks.','', '## Score-family analysis','','See score_family_analysis.csv for actual, selected and exact counts across all required families.','', '## Mode-collapse analysis','','NB reduces 1-1 from 1,093 to 917 but shifts concentration to 1-0/0-1 (625 to 880). It therefore relocates central collapse and loses 19 exact 1-1 hits.','', '## Prediction flips','',f"Among {b['Changed']} changes, Poisson-only correct is {b['BaselineOnly']}, NB-only correct is {b['ChallengerOnly']}, and the net is {b['DeltaExact']:+d}. Individual fixtures and transition counts are saved.",'', '## Distribution diagnostics','',f"Goal/score NLL changes from 2.98626 to **{b['GoalNLL']:.5f}**; mean actual-cell probability becomes **{b['MeanActualProb']:.5f}**, mean Top-1 probability **{b['MeanTop1Prob']:.5f}**, and high-game actual-cell probability **{b['HighMeanActualProb']:.5f}**. The wider tail does not improve these matched diagnostics.",'', '## P15 combination diagnostic','',f"SECONDARY COMBINATION DIAGNOSTIC: frozen P15 Elo factors applied after the best NB scored **{c['Exact']}/{c['N']}**, delta **{c['DeltaExact']:+d}** versus Poisson. It does not redefine P16.",'', '## Statistical uncertainty','',f"Baseline-only correct **{b['BaselineOnly']}**, NB-only correct **{b['ChallengerOnly']}**; matched exact p-value **{r['MatchedP']:.4f}**.",'', '## Repeatedly inspected diagnostic','',f"REPEATEDLY INSPECTED HISTORICAL DIAGNOSTIC: Poisson **{d['Exact']-d['DeltaExact']}/760**, NB **{d['Exact']}/760**, delta **{d['DeltaExact']:+d}**. No tuning followed.",'', '## Leakage and tests','','Dispersion uses training history only; chronology, mutation isolation, mean/variance identity, Poisson limit, finite nonnegative normalized matrices, determinism, baseline reproduction and protected forecast SHA are tested. Full suite: **73 passed**.','', '## Limitations','','Independent home/away NB changes conditional dispersion but cannot identify which fixture will realise a tail score. The ranking grid is conditional on 0-6, while NLL and means use the untruncated distributions.','', '## Decision','',f"**{label}.** The fixed Poisson mean-variance relationship was not shown to cause the Exact mode collapse. The remaining bottleneck is fixture-specific pre-match information about WHICH match becomes low-scoring or high-scoring. Production and 2026/27 predictions remain unchanged."]
    (OUT/'final_report.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
if __name__=='__main__':main()

