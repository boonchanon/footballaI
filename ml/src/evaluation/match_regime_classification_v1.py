"""P13: Stage-1 three-regime discrimination, with no score integration."""
from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import (average_precision_score, f1_score, log_loss,
                             accuracy_score, roc_auc_score)
from xgboost import XGBClassifier

from src.evaluation.learned_score_cell_ranking_v1 import ROOT, OUT as P12, BASE, FOLDS
from src.evaluation.xg_history_walkforward_v1 import XG, OUT as P11

OUT=ROOT/'data/processed/match_regime_classification_v1'
P9=ROOT/'data/processed/high_total_discrimination_v1'
DIAG=['2024/25','2025/26']
LAMBDA=['LambdaHome','LambdaAway','LambdaTotal','LambdaDifference','AbsLambdaDifference']
VOL=['HomeRecentTotalMean5','AwayRecentTotalMean5','HomeRecentTotalStd5','AwayRecentTotalStd5',
     'HomeRecentHighRate10','AwayRecentHighRate10','HomeRecentLowRate10','AwayRecentLowRate10']
VARIANTS={'A':BASE,'B':BASE+LAMBDA,'C':BASE+XG,'D':BASE+LAMBDA+XG,
          'E':BASE+LAMBDA+VOL,'F':BASE+LAMBDA+XG+VOL}
PARAMS=dict(objective='multi:softprob',num_class=3,n_estimators=200,max_depth=3,
            learning_rate=.05,subsample=.9,colsample_bytree=.9,reg_lambda=10,
            random_state=42,tree_method='hist',n_jobs=4)
P9_PARAMS=dict(objective='binary:logistic',n_estimators=180,max_depth=4,
               learning_rate=.05,subsample=.9,colsample_bytree=.9,reg_lambda=5,
               random_state=42,tree_method='hist',n_jobs=4)

def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def save_json(name,obj): (OUT/name).write_text(json.dumps(obj,indent=2,default=str),encoding='utf-8')

def regime(goals):
    total=np.asarray(goals)
    return np.select([total<=1,total>=4],[0,2],default=1).astype(int)

def add_volatility(frame):
    """Whole-day as-of. Results enter only after later source/project date."""
    frame=frame.sort_values(['Date','HomeTeam','AwayTeam']).copy()
    history=defaultdict(list); awaiting=[]; rows=[]
    for date,part in frame.groupby('Date',sort=True):
        ready=[item for item in awaiting if item[0]<date]
        awaiting=[item for item in awaiting if item[0]>=date]
        for available,home,away,total in ready:
            history[home].append((available,total))
            history[away].append((available,total))
        for row in part.itertuples():
            h=history[row.HomeTeam]; a=history[row.AwayTeam]
            assert all(source<date for source,_ in h[-10:]+a[-10:])
            def values(seq):
                recent5=np.array([t for _,t in seq[-5:]],dtype=float)
                recent10=np.array([t for _,t in seq[-10:]],dtype=float)
                return [float(recent5.mean()) if len(recent5) else np.nan,
                        float(recent5.std(ddof=0)) if len(recent5) else np.nan,
                        float((recent10>=4).mean()) if len(recent10) else np.nan,
                        float((recent10<=1).mean()) if len(recent10) else np.nan]
            hv=values(h); av=values(a)
            rows.append(dict(Index=row.Index,**dict(zip(VOL,[hv[0],av[0],hv[1],av[1],hv[2],av[2],hv[3],av[3]])),
                             LatestResultSourceDate=max([d for d,_ in h[-10:]+a[-10:]],default=pd.NaT)))
            awaiting.append((row.XGAvailableDate,row.HomeTeam,row.AwayTeam,int(row.HomeGoals+row.AwayGoals)))
    features=pd.DataFrame(rows).set_index('Index')
    return frame.join(features)

def source_frame():
    OUT.mkdir(parents=True,exist_ok=True)
    source=pd.read_csv(P11/'aligned_asof_features.csv',low_memory=False)
    rates=pd.read_csv(P12/'fixture_oof_rates.csv',low_memory=False)
    source.Date=pd.to_datetime(source.Date)
    rates.Date=pd.to_datetime(rates.Date)
    assert len(source)==4560 and len(rates)==3800
    assert not source.Season.str.startswith('2026').any() and not rates.Season.str.startswith('2026').any()
    frame=source.merge(rates[['Date','HomeTeam','AwayTeam','BaseLambdaHome','BaseLambdaAway']],
       on=['Date','HomeTeam','AwayTeam'],how='left',validate='one_to_one')
    frame.XGAvailableDate=pd.to_datetime(frame.XGAvailableDate)
    frame=add_volatility(frame)
    frame=frame[frame.Season.str[:4].astype(int).between(2016,2025)].copy()
    assert len(frame)==3800 and frame[['BaseLambdaHome','BaseLambdaAway']].notna().all().all()
    frame['LambdaHome']=frame.BaseLambdaHome
    frame['LambdaAway']=frame.BaseLambdaAway
    frame['LambdaTotal']=frame.LambdaHome+frame.LambdaAway
    frame['LambdaDifference']=frame.LambdaHome-frame.LambdaAway
    frame['AbsLambdaDifference']=frame.LambdaDifference.abs()
    frame['MatchRegime']=regime(frame.HomeGoals+frame.AwayGoals)
    assert set(frame.MatchRegime.unique())=={0,1,2}
    assert (frame.LatestResultSourceDate.dropna()<frame.loc[frame.LatestResultSourceDate.notna(),'Date']).all()
    frame=frame.sort_values(['Date','HomeTeam','AwayTeam']).reset_index(drop=True)
    frame.to_csv(OUT/'asof_feature_rows.csv',index=False)
    return frame

def fit_fold(train,valid,cols,seed_labels=None):
    fills=train[cols].median(numeric_only=True).reindex(cols).fillna(0).to_dict()
    xtrain=train[cols].fillna(fills).astype(float)
    xvalid=valid[cols].fillna(fills).astype(float)
    assert np.isfinite(xtrain.to_numpy()).all() and np.isfinite(xvalid.to_numpy()).all()
    y=train.MatchRegime.to_numpy() if seed_labels is None else seed_labels
    model=XGBClassifier(**PARAMS)
    model.fit(xtrain,y,verbose=False)
    assert list(model.feature_names_in_)==cols and model.classes_.tolist()==[0,1,2]
    prob=model.predict_proba(xvalid)
    assert prob.shape==(len(valid),3) and np.isfinite(prob).all() and (prob>=0).all()
    assert np.allclose(prob.sum(axis=1),1)
    return prob,model,fills

def metrics(part):
    y=part.MatchRegime.to_numpy(int); prob=part[['PLOW','PNORMAL','PHIGH']].to_numpy()
    high=(y==2); low=(y==0)
    return dict(N=len(part),LowN=int(low.sum()),NormalN=int((y==1).sum()),HighN=int(high.sum()),
      HighAUC=float(roc_auc_score(high,prob[:,2])),HighAP=float(average_precision_score(high,prob[:,2])),
      LowAUC=float(roc_auc_score(low,prob[:,0])),LowAP=float(average_precision_score(low,prob[:,0])),
      LogLoss=float(log_loss(y,prob,labels=[0,1,2])),
      Accuracy=float(accuracy_score(y,prob.argmax(axis=1))),
      MacroF1=float(f1_score(y,prob.argmax(axis=1),average='macro')),
      ActualLowRate=float(low.mean()),MeanPLOW=float(prob[:,0].mean()),
      ActualHighRate=float(high.mean()),MeanPHIGH=float(prob[:,2].mean()))

def predict_frame(valid,prob,variant,fold):
    out=valid[['Date','Season','HomeTeam','AwayTeam','HomeGoals','AwayGoals',
               'MatchRegime','LambdaTotal']].copy().reset_index(drop=True)
    out[['PLOW','PNORMAL','PHIGH']]=prob
    out['Variant']=variant; out['Fold']=fold
    out['ArgmaxRegime']=prob.argmax(axis=1)
    return out

def p9_matched(pre,diag):
    old=pd.read_csv(P9/'walk_forward_predictions.csv')
    old.Date=pd.to_datetime(old.Date)
    old=old[old.Variant=='Full']
    join=pre[['Date','HomeTeam','AwayTeam','MatchRegime','LambdaTotal']].merge(
      old[['Date','HomeTeam','AwayTeam','ActualHigh','Probability']],
      on=['Date','HomeTeam','AwayTeam'],validate='one_to_one')
    assert len(join)==len(pre) and ((join.MatchRegime==2).astype(int)==join.ActualHigh).all()
    diag_old=pd.read_csv(P9/'diagnostic_predictions.csv')
    diag_old.Date=pd.to_datetime(diag_old.Date)
    diag_join=diag[['Date','HomeTeam','AwayTeam','MatchRegime','LambdaTotal']].merge(
       diag_old[['Date','HomeTeam','AwayTeam','ActualHigh','DetectorProbability']],
       on=['Date','HomeTeam','AwayTeam'],validate='one_to_one')
    assert len(diag_join)==len(diag) and ((diag_join.MatchRegime==2).astype(int)==diag_join.ActualHigh).all()
    rows=[]
    for period,data,column in [('PreDiagnostic',join,'Probability'),('InspectedDiagnostic',diag_join,'DetectorProbability')]:
        y=data.MatchRegime==2
        p9_label='P9 Full saved OOF' if period=='PreDiagnostic' else 'P9 Full frozen detector'
        for label,score in [(p9_label,data[column]),('Matched OOF lambda total',data.LambdaTotal)]:
            rows.append(dict(Period=period,Reference=label,N=len(data),HighAUC=float(roc_auc_score(y,score)),
                             HighAP=float(average_precision_score(y,score))))
    return pd.DataFrame(rows),join,diag_join

def deciles(part,prob_col,actual_class,period):
    order=part.sort_values([prob_col,'Date','HomeTeam','AwayTeam'],ascending=[False,True,True,True]).reset_index(drop=True)
    order['Decile']=np.arange(len(order))*10//len(order)+1
    result=order.groupby('Decile').agg(N=('MatchRegime','size'),MeanProbability=(prob_col,'mean'),
                     ActualCount=('MatchRegime',lambda s:int((s==actual_class).sum()))).reset_index()
    result['ActualRate']=result.ActualCount/result.N
    result['Period']=period
    return result

def capture(part,col,actual_class,period,source):
    ordered=part.sort_values([col,'Date','HomeTeam','AwayTeam'],ascending=[False,True,True,True])
    total=int((part.MatchRegime==actual_class).sum()); rows=[]
    for fraction in [.1,.2,.3,.5]:
        n=int(round(len(part)*fraction)); caught=int((ordered.head(n).MatchRegime==actual_class).sum())
        rows.append(dict(Period=period,Source=source,TopFraction=fraction,N=n,ActualCaptured=caught,
                         CaptureRate=caught/total,Precision=caught/n,
                         RandomExpected=total*fraction))
    return rows

def main():
    frame=source_frame()
    design=dict(Title='Three-class LOW/NORMAL/HIGH before-kickoff discrimination only',
      Boundaries={'LOW':0,'NORMAL':1,'HIGH':2,'Definition':'<=1, 2..3, >=4 actual total'},
      Variants=VARIANTS,Model=PARAMS,Folds=FOLDS,TrainingStart='2016/17',
      Diagnostic=DIAG,No2026=True,NoScoreIntegration=True,NoClassWeights=True,
      SourceSHA={'P11Features':sha(P11/'aligned_asof_features.csv'),
                 'P12OOFRates':sha(P12/'fixture_oof_rates.csv'),
                 'P9SavedOOF':sha(P9/'walk_forward_predictions.csv')},
      ProtectedRawSHA=sha(ROOT/'data/processed/predictions_2026_27_latest/predictions_raw.csv'))
    save_json('experiment_manifest.json',design)
    save_json('feature_manifest.json',dict(FeatureVersion='correctness_v2 seven safe + P11 prior xG + P12 OOF rates + whole-day recent total history',
       Variants=VARIANTS,Excluded=['HomeGoals','AwayGoals','hXG','aXG','MatchRegime','ActualTotal','ActualOutcome'],
       Missing='each fold/final training median, zero only if entire training column missing'))
    (OUT/'design_audit.md').write_text('P9 trained a binary detector for total >=4 using Elo/form, mismatch, prior total/high/BTTS/clean-sheet history, venue and congestion. Its selected Full OOF HIGH AUC was ~0.552 on 2,660 records, with 2023/24 weak. P13 is distinct: a frozen three-class LOW<=1, NORMAL 2..3, HIGH>=4 detector, independently auditing LOW and HIGH AUC/AP, adding chronological OOF lambda context, P11 prior-match xG, and explicitly pre-registered prior-five total volatility and prior-ten LOW/HIGH frequencies. P9 saved Full probabilities are rejoined on identical P13 fixtures for an honest matched reference; P13 never modifies score selection.\n',encoding='utf-8')
    predictions=[]; importance=[]; fold_meta=[]
    for variant,cols in VARIANTS.items():
        for season in FOLDS:
            year=int(season[:4]); train=frame[frame.Season.str[:4].astype(int).between(2016,year-1)]
            valid=frame[frame.Season==season]
            assert len(train)>=760 and len(valid)==380 and train.Date.max()<valid.Date.min()
            prob,model,fills=fit_fold(train,valid,cols)
            predictions.append(predict_frame(valid,prob,variant,season))
            fold_meta.append(dict(Variant=variant,Fold=season,TrainN=len(train),TrainMaxDate=str(train.Date.max().date()),
                                  ValidMinDate=str(valid.Date.min().date()),Fills=fills))
            gain=model.get_booster().get_score(importance_type='gain')
            importance += [dict(Variant=variant,Fold=season,Feature=c,Gain=float(gain.get(c,0))) for c in cols]
    allpred=pd.concat(predictions,ignore_index=True)
    allpred.to_csv(OUT/'walk_forward_predictions.csv',index=False)
    season_metrics=pd.DataFrame([dict(Variant=v,Season=s,**metrics(allpred[(allpred.Variant==v)&(allpred.Season==s)]))
        for v in VARIANTS for s in FOLDS])
    season_metrics.to_csv(OUT/'season_metrics.csv',index=False)
    variant=pd.DataFrame([dict(Variant=v,**metrics(allpred[allpred.Variant==v])) for v in VARIANTS])
    variant.to_csv(OUT/'variant_comparison.csv',index=False)
    save_json('training_manifest.json',fold_meta)
    pd.DataFrame(importance).to_csv(OUT/'feature_importance.csv',index=False)
    # Selection is frozen solely from six earlier seasons.
    ranked=variant.sort_values(['HighAUC','HighAP','LowAUC'],ascending=False)
    selected=str(ranked.iloc[0].Variant)
    latest=float(season_metrics[(season_metrics.Variant==selected)&(season_metrics.Season==FOLDS[-1])].HighAUC.iloc[0])
    gate=bool(float(ranked.iloc[0].HighAUC)>.55 and latest>.55)
    decision=dict(Selected=selected,Rule='highest pooled HIGH AUC, then HIGH AP, then LOW AUC; latest fold stability checked as gate',
      SelectedPreDiagnosticMetrics=ranked.iloc[0].to_dict(),LatestFoldHighAUC=latest,
      GatePassed=gate,StopReason='Insufficient or unstable HIGH discrimination' if not gate else None,
      VariantComparisonSHA=sha(OUT/'variant_comparison.csv'),
      WalkForwardPredictionsSHA=sha(OUT/'walk_forward_predictions.csv'),
      NoDiagnosticSelection=True)
    save_json('selection_decision.json',decision)
    # Only selected architecture is trained/evaluated on repeatedly inspected seasons.
    train=frame[frame.Season.str[:4].astype(int).between(2016,2023)]
    valid=frame[frame.Season.isin(DIAG)]
    assert train.Date.max()<valid.Date.min() and len(valid)==760
    prob,final_model,final_fills=fit_fold(train,valid,VARIANTS[selected])
    diagnostic=predict_frame(valid,prob,selected,'Inspected760')
    diagnostic.to_csv(OUT/'diagnostic_predictions.csv',index=False)
    final_model.save_model(OUT/'selected_model.json')
    save_json('final_metadata.json',dict(Selected=selected,Features=VARIANTS[selected],Fills=final_fills,
          TrainMaxDate=str(train.Date.max().date()),ModelSHA256=sha(OUT/'selected_model.json')))
    selected_pre=allpred[allpred.Variant==selected].copy()
    selected_pre.to_csv(OUT/'walk_forward_results.csv',index=False)
    selected_pre_summary=metrics(selected_pre); diag_summary=metrics(diagnostic)
    save_json('diagnostic_summary.json',diag_summary)
    refs,p9_pre,p9_diag=p9_matched(selected_pre,diagnostic)
    for row in variant.to_dict('records'):
        refs.loc[len(refs)]=dict(Period='PreDiagnostic',Reference='P13 '+row['Variant'],N=row['N'],
                                   HighAUC=row['HighAUC'],HighAP=row['HighAP'])
    refs.to_csv(OUT/'p9_comparison.csv',index=False)
    dec_high=[];dec_low=[];capture_rows=[];confusion=[];dist=[]
    for period,part,p9matched in [('PreDiagnostic',selected_pre,p9_pre),('InspectedDiagnostic',diagnostic,p9_diag)]:
        dec_high.append(deciles(part,'PHIGH',2,period)); dec_low.append(deciles(part,'PLOW',0,period))
        capture_rows += capture(part,'PHIGH',2,period,'P13 selected')
        capture_rows += capture(part,'LambdaTotal',2,period,'Matched OOF lambda total')
        p9col='Probability' if period=='PreDiagnostic' else 'DetectorProbability'
        capture_rows += capture(p9matched.rename(columns={p9col:'PHIGH'}),'PHIGH',2,period,'P9 Full saved')
        c=pd.crosstab(part.MatchRegime,part.ArgmaxRegime).reindex(index=[0,1,2],columns=[0,1,2],fill_value=0)
        confusion += [dict(Period=period,ActualRegime=i,PredictedRegime=j,Matches=int(c.loc[i,j]))
                      for i in range(3) for j in range(3)]
        for actual,sub in part.groupby('MatchRegime'):
            for regime_class,col in enumerate(['PLOW','PNORMAL','PHIGH']):
                dist.append(dict(Period=period,ActualRegime=int(actual),ProbabilityFor=int(regime_class),
                   N=len(sub),Mean=float(sub[col].mean()),Median=float(sub[col].median()),
                   Std=float(sub[col].std(ddof=0))))
    pd.concat(dec_high,ignore_index=True).to_csv(OUT/'high_risk_deciles.csv',index=False)
    pd.concat(dec_low,ignore_index=True).to_csv(OUT/'low_risk_deciles.csv',index=False)
    pd.DataFrame(capture_rows).to_csv(OUT/'top_risk_capture.csv',index=False)
    pd.DataFrame(confusion).to_csv(OUT/'confusion_matrix.csv',index=False)
    pd.DataFrame(dist).to_csv(OUT/'probability_distribution.csv',index=False)
    # One controlled target-shuffle sanity audit on the latest earlier fold.
    shuffle_train=frame[frame.Season.str[:4].astype(int).between(2016,2022)]
    shuffle_valid=frame[frame.Season==FOLDS[-1]]
    rng=np.random.default_rng(42)
    shuffled=rng.permutation(shuffle_train.MatchRegime.to_numpy())
    shuffle_prob,_,_=fit_fold(shuffle_train,shuffle_valid,VARIANTS[selected],seed_labels=shuffled)
    shuffle_auc=float(roc_auc_score(shuffle_valid.MatchRegime==2,shuffle_prob[:,2]))
    save_json('shuffle_sanity.json',dict(Fold=FOLDS[-1],Selected=selected,HighAUC=shuffle_auc,
        Interpretation='A single finite shuffled-label fit is a sanity diagnostic; chance fluctuations remain'))
    (OUT/'leakage_audit.md').write_text('Whole-day history builder reads all fixtures before applying same-date results. Historical result/xG availability uses the later of project/source dates. Current goals/xG and target are excluded from every variant. Goal-rate context comes only from P12 chronological OOF arrays; training rows precede test rows in all six folds. Each median is computed from fold training only. 2024/25–2025/26 are evaluated only after selection_decision.json is written; no 2026/27 row is loaded. P9 is joined on date/home/away and actual HIGH labels are verified matchwise. Existing raw forecast SHA is checked.\n',encoding='utf-8')
    protected=sha(ROOT/'data/processed/predictions_2026_27_latest/predictions_raw.csv')==design['ProtectedRawSHA']
    save_json('tests_summary.json',dict(ScriptAssertions=True,ProtectedRawUnchanged=protected,ShuffleHighAUC=shuffle_auc))
    if gate:
        (OUT/'integration_proposal.md').write_text('Future P14 proposal only: a soft mixture P(score|fixture)=sum_r P(regime=r|fixture) P(score|fixture,regime=r), trained and frozen in independent historical walk-forward folds. No hard threshold or forced scores. P13 does not implement this proposal.\n',encoding='utf-8')
    # Rich summary kept in JSON to make all A-F and diagnostic metrics inspectable.
    save_json('report.json',dict(Variants=variant.to_dict('records'),Selected=selected,
       SelectedPreDiagnostic=selected_pre_summary,SelectedDiagnostic=diag_summary,
       SeasonMetrics=season_metrics[season_metrics.Variant==selected].to_dict('records'),
       References=refs.to_dict('records'),ShuffleHighAUC=shuffle_auc,GatePassed=gate,
       ProtectedRawUnchanged=protected,ScoreModelChanged=False))
    lines=['# Phase 13 — Match Regime Classification v1','',
      '## PLAIN-LANGUAGE SUMMARY','',
      'P13 ทำนายความน่าจะเป็นของสามกลุ่มประตูรวมก่อนแข่ง: LOW (0–1), NORMAL (2–3), HIGH (4+). ประตูรวมจริงใช้เป็น target หลังเกมเท่านั้น; P13 ไม่เปลี่ยน lambda, Poisson matrix หรือคำทำนายสกอร์ Exact.','',
      f"Walk-forward {len(selected_pre):,} นัด มี LOW={int((selected_pre.MatchRegime==0).sum())}, NORMAL={int((selected_pre.MatchRegime==1).sum())}, HIGH={int((selected_pre.MatchRegime==2).sum())}. ชุดที่เลือกจาก fold ก่อนวินิจฉัยคือ **{selected}**: HIGH AUC **{selected_pre_summary['HighAUC']:.4f}**, AP **{selected_pre_summary['HighAP']:.4f}**; LOW AUC **{selected_pre_summary['LowAUC']:.4f}**, AP **{selected_pre_summary['LowAP']:.4f}**. HIGH AUC fold ล่าสุด **{latest:.4f}**. Gate สำหรับการวิจัย score integration ภายหลัง: **{'PASS' if gate else 'STOP'}**.",'',
      '## Six fixed feature families, earlier walk-forward only','',
      '| Variant | HIGH AUC | HIGH AP | LOW AUC | LOW AP | Log loss |','|---|---:|---:|---:|---:|---:|']
    for row in variant.to_dict('records'):
        lines.append(f"| {row['Variant']} | {row['HighAUC']:.4f} | {row['HighAP']:.4f} | {row['LowAUC']:.4f} | {row['LowAP']:.4f} | {row['LogLoss']:.4f} |")
    lines+=['','## Season stability of selected variant','',
      '| Season | HIGH AUC | HIGH AP | LOW AUC | LOW AP | Log loss |','|---|---:|---:|---:|---:|---:|']
    for row in season_metrics[season_metrics.Variant==selected].to_dict('records'):
        lines.append(f"| {row['Season']} | {row['HighAUC']:.4f} | {row['HighAP']:.4f} | {row['LowAUC']:.4f} | {row['LowAP']:.4f} | {row['LogLoss']:.4f} |")
    lines+=['','## Matched references and inspected historical diagnostic','',
      '| Period/source | N | HIGH AUC | HIGH AP |','|---|---:|---:|---:|']
    for row in refs.to_dict('records'):
        if row['Reference'] in ['P9 Full saved OOF','P9 Full frozen detector','Matched OOF lambda total','P13 '+selected]:
            lines.append(f"| {row['Period']} / {row['Reference']} | {row['N']} | {row['HighAUC']:.4f} | {row['HighAP']:.4f} |")
    lines.append(f"| InspectedDiagnostic / P13 {selected} | 760 | {diag_summary['HighAUC']:.4f} | {diag_summary['HighAP']:.4f} |")
    lines+=['','Earlier six folds alone selected the variant. The 760 fixtures in 2024/25–2025/26 were repeatedly inspected and are not prospective evidence; their LOW AUC/AP and log loss are in diagnostic_summary.json. High/low deciles, top-risk capture against P9 and lambda, confusion, probability distributions, feature gain and one shuffled-label fit are saved separately. Mean regime probabilities are calibration diagnostics, not proof of ranking quality.','',
      'P11 xG values are retrospectively mirrored match observations, not archived publication-time snapshots; only strict calendar-date as-of ordering can be proven. The corrected-v2 seven base features are inherited from the project’s historical builder. All six variants use natural training frequencies without class weights, oversampling, calibration or threshold tuning.','',
      f"No 2026/27 result was loaded or evaluated. Existing predictions_raw.csv SHA256 `{design['ProtectedRawSHA']}` is unchanged. No Exact-score model or future forecast was modified. Decision: **{'propose a future soft-mixture P14 study only' if gate else 'regime discrimination is insufficient to justify score integration'}**."]
    (OUT/'final_report.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    hashes={p.name:sha(p) for p in OUT.iterdir() if p.is_file() and p.name!='artifact_hashes.json'}
    save_json('artifact_hashes.json',hashes)
    print('Selected',selected,'Pre',selected_pre_summary,'Diagnostic',diag_summary,'P9',refs.head(4).to_dict('records'),'Gate',gate,'Shuffle',shuffle_auc)

if __name__=='__main__': main()
