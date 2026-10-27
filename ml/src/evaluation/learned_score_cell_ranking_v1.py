"""P12: chronological OOF lambdas, grouped pairwise score-cell ranking."""
from __future__ import annotations

import hashlib
import json
from math import factorial
from pathlib import Path

import numpy as np
import pandas as pd
from xgboost import XGBRanker

from src.evaluation.xg_history_walkforward_v1 import BASE, OUT as P11, ROOT, fit_predict

OUT=ROOT/'data/processed/learned_score_cell_ranking_v1'
GRID=np.array([(h,a) for h in range(7) for a in range(7)],dtype=int)
FOLDS=[f'{y}/{str(y+1)[-2:]}' for y in range(2018,2024)]
DIAG=['2024/25','2025/26']
RANKER_PARAMS=dict(objective='rank:pairwise',n_estimators=200,max_depth=3,learning_rate=.05,
                   subsample=.9,colsample_bytree=.9,reg_lambda=10,tree_method='hist',
                   random_state=42,n_jobs=4)
CELL_FEATURES=['PoissonCellProbability','PoissonCellLogProbability','PoissonCellRank',
 'CandidateHomeGoals','CandidateAwayGoals','CandidateTotalGoals','CandidateGoalDifference',
 'CandidateAbsGoalDifference','CandidateIsDraw','CandidateIsHomeWin','CandidateIsAwayWin',
 'CandidateBTTS','CandidateHomeCleanSheet','CandidateAwayCleanSheet','LambdaHome','LambdaAway',
 'LambdaTotal','LambdaDifference','AbsLambdaDifference','CandidateHomeMinusLambdaHome',
 'CandidateAwayMinusLambdaAway','AbsCandidateHomeMinusLambdaHome','AbsCandidateAwayMinusLambdaAway',
 'CandidateTotalMinusLambdaTotal','AbsCandidateTotalMinusLambdaTotal']
FEATURES=CELL_FEATURES+BASE

def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def save_json(path,value): (OUT/path).write_text(json.dumps(value,indent=2,default=str),encoding='utf-8')

def poisson_matrix(rates):
    assert rates.shape==(2,) and np.isfinite(rates).all() and (rates>0).all()
    ph=np.array([np.exp(-rates[0])*rates[0]**i/factorial(i) for i in range(7)])
    pa=np.array([np.exp(-rates[1])*rates[1]**i/factorial(i) for i in range(7)])
    p=np.outer(ph,pa).reshape(-1)
    p=p/p.sum()
    assert len(p)==49 and np.isclose(p.sum(),1) and (p>=0).all()
    return p

def candidate_features(rates,fixture):
    p=poisson_matrix(rates)
    order=np.argsort(-p,kind='stable')
    ranks=np.empty(49,dtype=int); ranks[order]=np.arange(1,50)
    h=GRID[:,0]; a=GRID[:,1]; total=h+a; diff=h-a
    lh,la=rates; lt=lh+la; ld=lh-la
    values=[p,np.log(np.maximum(p,1e-300)),ranks,h,a,total,diff,np.abs(diff),
            h==a,h>a,h<a,(h>0)&(a>0),a==0,h==0,np.full(49,lh),np.full(49,la),
            np.full(49,lt),np.full(49,ld),np.full(49,abs(ld)),h-lh,a-la,
            abs(h-lh),abs(a-la),total-lt,abs(total-lt)]
    values += [np.full(49,float(fixture[col])) for col in BASE]
    x=np.stack(values,axis=1).astype(np.float32)
    assert x.shape==(49,len(FEATURES)) and np.isfinite(x).all()
    return x,p,ranks

def load_and_oof():
    OUT.mkdir(parents=True,exist_ok=True)
    frame=pd.read_csv(P11/'aligned_asof_features.csv',low_memory=False)
    frame.Date=pd.to_datetime(frame.Date)
    prior=pd.read_csv(P11/'walkforward_predictions.csv')
    prior.Date=pd.to_datetime(prior.Date)
    assert len(frame)==4560 and len(prior)==3040
    assert not frame.Season.str.startswith('2026').any() and not prior.Season.str.startswith('2026').any()
    selected=prior[['Date','HomeTeam','AwayTeam','BaseLambdaHome','BaseLambdaAway']]
    frame=frame.merge(selected,on=['Date','HomeTeam','AwayTeam'],how='left',validate='one_to_one')
    records=[]
    for season in ['2016/17','2017/18']:
        year=int(season[:4]); train=frame[frame.Season.str[:4].astype(int)<year]
        valid=frame[frame.Season==season]
        assert len(valid)==380 and train.Date.max()<valid.Date.min()
        rates,_=fit_predict(train,valid,BASE)
        records.append(pd.DataFrame(dict(Date=valid.Date.values,HomeTeam=valid.HomeTeam.values,
                                         AwayTeam=valid.AwayTeam.values,BaseLambdaHome=rates[:,0],
                                         BaseLambdaAway=rates[:,1])))
    early=pd.concat(records,ignore_index=True)
    early.to_csv(OUT/'early_chronological_oof_lambdas.csv',index=False)
    frame=frame.merge(early,on=['Date','HomeTeam','AwayTeam'],how='left',suffixes=('','_early'),validate='one_to_one')
    for side in ['BaseLambdaHome','BaseLambdaAway']:
        frame[side]=frame[side].fillna(frame[side+'_early'])
    early_fills=frame[frame.Season.str[:4].astype(int)<2016][BASE].median(numeric_only=True).reindex(BASE).fillna(0).to_dict()
    frame[BASE]=frame[BASE].fillna(early_fills)
    frame=frame[frame.Season.str[:4].astype(int).between(2016,2025)].copy()
    assert len(frame)==3800 and frame[['BaseLambdaHome','BaseLambdaAway']].notna().all().all()
    frame=frame.sort_values(['Date','HomeTeam','AwayTeam']).reset_index(drop=True)
    frame['FixtureID']=np.arange(len(frame))
    frame.to_csv(OUT/'fixture_oof_rates.csv',index=False)
    return frame

def build_cells(frame):
    cells=[]; matrices=[]; labels=[]
    for row in frame.itertuples(index=False):
        fixture=row._asdict(); rates=np.array([row.BaseLambdaHome,row.BaseLambdaAway],dtype=float)
        x,p,ranks=candidate_features(rates,fixture)
        actual=(row.HomeGoals,row.AwayGoals)
        in_grid=0<=actual[0]<=6 and 0<=actual[1]<=6
        y=((GRID[:,0]==actual[0])&(GRID[:,1]==actual[1])).astype(int) if in_grid else np.zeros(49,dtype=int)
        assert int(y.sum())==int(in_grid)
        cells.append(x); matrices.append(p); labels.append(y)
    x=np.concatenate(cells); p=np.stack(matrices); y=np.concatenate(labels)
    assert x.shape==(49*len(frame),len(FEATURES)) and p.shape==(len(frame),49)
    return x,p,y

def fit_ranker(x,y,fixtures):
    # Pairwise groups with no positive cell (out-of-grid actual) have no valid
    # pairwise comparison. Their 49 zero-label rows remain in the saved audit,
    # but are excluded from ranker fit; evaluation still counts them as misses.
    in_grid=((fixtures.HomeGoals<=6)&(fixtures.AwayGoals<=6)).to_numpy()
    keep=np.repeat(in_grid,49)
    labels=y[keep]
    qid=np.repeat(np.arange(int(in_grid.sum())),49)
    assert len(labels)==len(qid) and np.all(labels.reshape(-1,49).sum(axis=1)==1)
    model=XGBRanker(**RANKER_PARAMS)
    model.fit(pd.DataFrame(x[keep],columns=FEATURES),labels,qid=qid,verbose=False)
    assert list(model.feature_names_in_)==FEATURES
    return model

def predict_fold(frame,x,p,y,train_mask,valid_mask,frequency_train):
    train=frame[train_mask]; valid=frame[valid_mask]
    assert len(train)>0 and len(valid)>0 and train.Date.max()<valid.Date.min()
    train_ids=train.FixtureID.to_numpy(); valid_ids=valid.FixtureID.to_numpy()
    train_x=x[np.repeat(train_mask.to_numpy(),49)]
    train_y=y[np.repeat(train_mask.to_numpy(),49)]
    model=fit_ranker(train_x,train_y,train)
    valid_x=x[np.repeat(valid_mask.to_numpy(),49)]
    scores=model.predict(pd.DataFrame(valid_x,columns=FEATURES)).reshape(-1,49)
    assert scores.shape==(len(valid),49)
    ranked=np.argsort(-scores,axis=1,kind='stable')
    selected=ranked[:,0]
    baseline=np.argmax(p[valid_ids],axis=1)
    assert np.array_equal(baseline,np.argmax(p[valid_ids],axis=1))
    selected_rank=np.argsort(np.argsort(-p[valid_ids],axis=1,kind='stable'),axis=1) [np.arange(len(valid)),selected]+1
    actual=valid[['HomeGoals','AwayGoals']].to_numpy(int)
    actual_idx=np.where((actual[:,0]<=6)&(actual[:,1]<=6),actual[:,0]*7+actual[:,1],-1)
    freq=frequency_train.groupby(['HomeGoals','AwayGoals']).size().sort_values(ascending=False)
    # Stable tie break by row-major score index, using past training history only.
    common=sorted(((int(n),int(h)*7+int(a)) for (h,a),n in freq.items()),key=lambda t:(-t[0],t[1]))[0][1]
    out=valid[['FixtureID','Date','Season','HomeTeam','AwayTeam','HomeGoals','AwayGoals',
               'BaseLambdaHome','BaseLambdaAway']].copy().reset_index(drop=True)
    out['BaselineCell']=baseline; out['P12Cell']=selected; out['FrequencyCell']=common
    out['BaselineProb']=p[valid_ids,np.arange(len(valid))*0+baseline]
    out['P12PoissonProb']=p[valid_ids,selected]
    out['P12RankScore']=scores[np.arange(len(valid)),selected]
    out['P12PoissonRank']=selected_rank
    out['ActualCell']=actual_idx
    out['ActualPoissonRank']=np.where(actual_idx>=0,
       np.argsort(np.argsort(-p[valid_ids],axis=1,kind='stable'),axis=1)[np.arange(len(valid)),np.maximum(actual_idx,0)]+1,50)
    out['ActualP12Rank']=np.where(actual_idx>=0,
       np.argsort(np.argsort(-scores,axis=1,kind='stable'),axis=1)[np.arange(len(valid)),np.maximum(actual_idx,0)]+1,50)
    out['BaselineExact']=baseline==actual_idx; out['P12Exact']=selected==actual_idx
    out['FrequencyExact']=common==actual_idx
    out['ActualHigh4Plus']=actual.sum(axis=1)>=4
    out['BaselineTop3']=np.any(np.argsort(-p[valid_ids],axis=1,kind='stable')[:,:3]==actual_idx[:,None],axis=1)
    out['P12Top3']=np.any(ranked[:,:3]==actual_idx[:,None],axis=1)
    out['BaselineTop5']=np.any(np.argsort(-p[valid_ids],axis=1,kind='stable')[:,:5]==actual_idx[:,None],axis=1)
    out['P12Top5']=np.any(ranked[:,:5]==actual_idx[:,None],axis=1)
    out['BaselineScore']=out.BaselineCell.map(lambda i:f'{i//7}-{i%7}')
    out['P12Score']=out.P12Cell.map(lambda i:f'{i//7}-{i%7}')
    out['FrequencyScore']=f'{common//7}-{common%7}'
    out['P12Top2']=ranked[:,1]; out['P12Top3Cell']=ranked[:,2]
    importance=model.get_booster().get_score(importance_type='gain')
    return out,model,importance

def summary(data):
    return dict(N=len(data),BaselineExact=int(data.BaselineExact.sum()),P12Exact=int(data.P12Exact.sum()),
       DeltaExact=int(data.P12Exact.sum()-data.BaselineExact.sum()),FrequencyExact=int(data.FrequencyExact.sum()),
       HighN=int(data.ActualHigh4Plus.sum()),BaselineHighExact=int((data.BaselineExact&data.ActualHigh4Plus).sum()),
       P12HighExact=int((data.P12Exact&data.ActualHigh4Plus).sum()),
       BaselinePredHigh=int((data.BaselineCell.map(lambda i:i//7+i%7)>=4).sum()),
       P12PredHigh=int((data.P12Cell.map(lambda i:i//7+i%7)>=4).sum()),
       Baseline11=int((data.BaselineScore=='1-1').sum()),P1211=int((data.P12Score=='1-1').sum()),
       Baseline00Exact=int(((data.BaselineScore=='0-0')&data.BaselineExact).sum()),
       P1200Exact=int(((data.P12Score=='0-0')&data.P12Exact).sum()),
       Baseline22Exact=int(((data.BaselineScore=='2-2')&data.BaselineExact).sum()),
       P1222Exact=int(((data.P12Score=='2-2')&data.P12Exact).sum()))

def main():
    frame=load_and_oof()
    freeze=dict(Primary='XGBRanker rank:pairwise within 49-cell fixture groups',Features=FEATURES,
       RankerParameters=RANKER_PARAMS,Upstream='P11 matched corrected-v2 7-feature XGB count:poisson',
       OOFTrainSeasons='2016/17 onward, goal-rate models trained on earlier seasons only',
       PrimaryFolds=FOLDS,Diagnostic=DIAG,Grid='0..6 x 0..6',
       No2026Results=True,NoHandBoost=True,NoDiagnosticTuning=True,
       P11FixtureRatesSHA=sha(P11/'walkforward_predictions.csv'),
       Protected2026RawSHA=sha(ROOT/'data/processed/predictions_2026_27_latest/predictions_raw.csv'))
    save_json('experiment_manifest.json',freeze)
    save_json('feature_manifest.json',dict(Features=FEATURES,TargetsExcluded=['HomeGoals','AwayGoals','hXG','aXG',
            'ActualTotal','ActualOutcome'],CellRowsPerFixture=49,CorrectedV2Inputs=BASE))
    x,p,y=build_cells(frame)
    np.savez_compressed(OUT/'candidate_training_rows.npz',Features=x,Labels=y,FixtureID=np.repeat(frame.FixtureID.to_numpy(),49))
    records=[]; importance_rows=[]; manifests=[]
    for season in FOLDS+DIAG:
        year=int(season[:4])
        # Ranker is frozen at end-2023/24 for both inspected diagnostics.
        train_cut=min(year,2024)
        train_mask=frame.Season.str[:4].astype(int).between(2016,train_cut-1)
        valid_mask=frame.Season==season
        frequency_train=frame[frame.Season.str[:4].astype(int)<train_cut]
        part,model,importance=predict_fold(frame,x,p,y,train_mask,valid_mask,frequency_train)
        records.append(part)
        model_path=OUT/f'ranker_{season.replace("/", "_")}.json'
        model.save_model(model_path)
        manifests.append(dict(Season=season,TrainMaxDate=str(frame[train_mask].Date.max().date()),
                              ValidMinDate=str(frame[valid_mask].Date.min().date()),
                              RankerTrainN=int(train_mask.sum()),ModelSHA256=sha(model_path)))
        importance_rows += [dict(Season=season,Feature=feat,Gain=float(importance.get(feat,0))) for feat in FEATURES]
    results=pd.concat(records,ignore_index=True)
    results[results.Season.isin(FOLDS)].to_csv(OUT/'walk_forward_results.csv',index=False)
    results[results.Season.isin(DIAG)].to_csv(OUT/'diagnostic_results.csv',index=False)
    save_json('training_manifest.json',manifests)
    pd.DataFrame(importance_rows).to_csv(OUT/'feature_importance.csv',index=False)
    pre=results[results.Season.isin(FOLDS)]; diag=results[results.Season.isin(DIAG)]
    season=pd.DataFrame([dict(Season=s,**summary(results[results.Season==s])) for s in FOLDS+DIAG])
    season.to_csv(OUT/'season_comparison.csv',index=False)
    pre_summary=summary(pre); diag_summary=summary(diag)
    save_json('walk_forward_summary.json',pre_summary)
    save_json('diagnostic_summary.json',diag_summary)
    changed=results[results.BaselineCell!=results.P12Cell].copy()
    changed.to_csv(OUT/'rank_flips.csv',index=False)
    changed[['FixtureID','Date','HomeTeam','AwayTeam','BaseLambdaHome','BaseLambdaAway',
             'BaselineScore','BaselineProb','P12Score','P12RankScore','P12PoissonProb',
             'P12PoissonRank','HomeGoals','AwayGoals','BaselineExact','P12Exact']].to_csv(OUT/'score_cell_movements.csv',index=False)
    results.groupby('P12PoissonRank').size().reset_index(name='Matches').to_csv(OUT/'poisson_rank_of_selected.csv',index=False)
    groups=[]
    for period,part in [('PreDiagnostic',pre),('InspectedDiagnostic',diag)]:
        for label,mask in [('0-1',(part.HomeGoals+part.AwayGoals)<=1),
                           ('2-3',(part.HomeGoals+part.AwayGoals).between(2,3)),
                           ('4',(part.HomeGoals+part.AwayGoals)==4),
                           ('5',(part.HomeGoals+part.AwayGoals)==5),
                           ('6',(part.HomeGoals+part.AwayGoals)==6),
                           ('7+',(part.HomeGoals+part.AwayGoals)>=7),
                           ('4+',part.ActualHigh4Plus)]:
            sub=part[mask]
            groups.append(dict(Period=period,ActualTotalGroup=label,N=len(sub),
              BaselineExact=int(sub.BaselineExact.sum()),P12Exact=int(sub.P12Exact.sum()),
              BaselineTop3=int(sub.BaselineTop3.sum()),P12Top3=int(sub.P12Top3.sum()),
              BaselineTop5=int(sub.BaselineTop5.sum()),P12Top5=int(sub.P12Top5.sum()),
              BaselineMeanActualRank=float(sub.ActualPoissonRank.mean()) if len(sub) else None,
              P12MeanActualRank=float(sub.ActualP12Rank.mean()) if len(sub) else None))
    pd.DataFrame(groups).to_csv(OUT/'high_score_analysis.csv',index=False)
    modes=[]
    for period,part in [('PreDiagnostic',pre),('InspectedDiagnostic',diag)]:
        for score in sorted(set(part.BaselineScore)|set(part.P12Score)|set(part.FrequencyScore)):
            modes.append(dict(Period=period,Score=score,Actual=int(((part.HomeGoals.astype(str)+'-'+part.AwayGoals.astype(str))==score).sum()),
                              BaselineSelected=int((part.BaselineScore==score).sum()),
                              P12Selected=int((part.P12Score==score).sum()),
                              FrequencySelected=int((part.FrequencyScore==score).sum()),
                              BaselineHits=int(((part.BaselineScore==score)&part.BaselineExact).sum()),
                              P12Hits=int(((part.P12Score==score)&part.P12Exact).sum())))
    pd.DataFrame(modes).to_csv(OUT/'score_mode_analysis.csv',index=False)
    results[['Season','FixtureID','FrequencyScore','FrequencyExact','BaselineExact','P12Exact']].to_csv(OUT/'frequency_baseline.csv',index=False)
    actual_ranks=pre.ActualPoissonRank.value_counts().sort_index().to_dict()
    save_json('oracle_rank_diagnostic.json',dict(NonDeployable=True,UsesActualResult=True,
       PreDiagnosticActualPoissonRanks=actual_ranks,OutOfGrid=int((pre.ActualCell<0).sum())))
    no_leak=(sha(ROOT/'data/processed/predictions_2026_27_latest/predictions_raw.csv')==freeze['Protected2026RawSHA'])
    (OUT/'leakage_audit.md').write_text('Chronological upstream OOF: 2016/17–2023/24 each trained on prior seasons; ranker inputs use those OOF lambdas. Each ranker fold trains on earlier OOF fixtures only. Both inspected diagnostics reuse ranker training cutoff 2023/24. Candidate features exclude current actual goals/xG and actual outcome. 49 row-major cells per fixture; outside-grid target is 49 zero labels and its group is excluded only from pairwise fit. Baseline and challenger consume identical saved lambdas and identical Poisson matrices. 2026/27 results are never loaded. Protected raw SHA unchanged: '+str(no_leak)+'\n',encoding='utf-8')
    save_json('tests_summary.json',dict(ScriptAssertions=True,ProtectedRawUnchanged=no_leak))
    qualify=(pre_summary['DeltaExact']>0 and sum(int(v)>0 for v in season[season.Season.isin(FOLDS)].DeltaExact)>=2
             and season[season.Season==FOLDS[-1]].DeltaExact.iloc[0]>=-5 and no_leak)
    save_json('decision.json',dict(QualifiesForFutureChallenger=bool(qualify),FuturePredictionsFrozen=False,
          Reason='Historical exact/season stability gates; future feature snapshots and kickoff-safe fixture feed required' if qualify else 'Historical exact/season stability gate failed'))
    paths=[p for p in OUT.iterdir() if p.is_file() and p.name!='artifact_hashes.json']
    save_json('artifact_hashes.json',{p.name:sha(p) for p in paths})
    lines=['# Phase 12 — learned score-cell ranking v1','',
      '## PLAIN-LANGUAGE SUMMARY','',
      'P12 kept the same pre-match features, XGB goal-rate predictions, lambdas and independent Poisson grid as its matched baseline. It changed only the final choice of one score cell: a grouped pairwise ranker trained on chronological OOF history instead of global Poisson argmax. No 2026/27 result entered training or selection.','',
      f"Pre-diagnostic walk-forward: baseline **{pre_summary['BaselineExact']}/{pre_summary['N']}**, P12 **{pre_summary['P12Exact']}/{pre_summary['N']}**, delta **{pre_summary['DeltaExact']:+d} hits**. Inspected 2024/25–2025/26 diagnostic: baseline **{diag_summary['BaselineExact']}/{diag_summary['N']}**, P12 **{diag_summary['P12Exact']}/{diag_summary['N']}**, delta **{diag_summary['DeltaExact']:+d}**. Actual 4+ exact in the earlier folds: **{pre_summary['BaselineHighExact']} → {pre_summary['P12HighExact']}/{pre_summary['HighN']}**. Baseline/P12 1-1 selections: **{pre_summary['Baseline11']} → {pre_summary['P1211']}**.",'',
      '## Season-by-season primary exact score','',
      '| Season | N | Baseline | P12 | Delta | Actual 4+ exact, baseline → P12 |','|---|---:|---:|---:|---:|---:|']
    for row in season.to_dict('records'):
        lines.append(f"| {row['Season']} | {row['N']} | {row['BaselineExact']} | {row['P12Exact']} | {row['DeltaExact']:+d} | {row['BaselineHighExact']} → {row['P12HighExact']}/{row['HighN']} |")
    lines+=['','## Leakage, mechanism and decision','',
      'Goal-rate inputs for ranker training were out-of-sample from earlier-season upstream models. Both methods select from exactly the same 49-cell normalized independent-Poisson matrices; all 2026/27 results are excluded. A true result outside the grid remains a miss and its candidate labels are all zero. The ranker trains only on groups containing one positive pairwise label. Score-frequency baseline uses earlier training history only; score distributions, rank flips, Poisson ranks of selected cells, actual-score oracle ranks, grouped high-score diagnostics and feature gain are saved alongside this report.','',
      'The 760 diagnostic fixtures are repeatedly inspected historical matches, not prospective evidence. Frozen Phase-3 independent 96/760, fixed DC 99/760, P7 E+DC 101/760 and P10 Direct 89/760 use different model/features and are project references, not the matched control. No model was tuned after looking at the 760.','',
      f"Qualification gate from earlier walk-forward: **{'passed' if qualify else 'failed'}**. Future predictions frozen: **no**. The existing predictions_raw.csv retained SHA256 `{freeze['Protected2026RawSHA']}`. See decision.json and leakage_audit.md for the explicit gate and provenance. Phase 12 stops here."]
    (OUT/'final_report.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    print('Pre',pre_summary,'Diagnostic',diag_summary,'Qualify',qualify)

if __name__=='__main__': main()
