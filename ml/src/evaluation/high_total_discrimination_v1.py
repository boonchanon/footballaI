"""Pre-registered historical walk-forward high-total detector; score selection stays frozen."""
from __future__ import annotations

import json
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from scipy.stats import poisson, spearmanr
from sklearn.metrics import average_precision_score, brier_score_loss, log_loss, roc_auc_score

from src.models.ml_goal_rates_v1 import ROOT, sha
from src.models.model_utils import load_feature_data
from src.evaluation.score_calibration_v1 import reproduce
from src.features.high_total_discrimination_v1 import ALL_NEW, RECENT, VENUE, add_environment_features

OUT=ROOT/'data/processed/high_total_discrimination_v1'
SOURCE=ROOT/'data/processed/correctness_audit_v1/features_correctness_v2.csv'
P7=ROOT/'data/processed/goal_rate_feature_expansion_v1/new_features.csv'
P8=ROOT/'data/processed/high_score_underdispersion_audit_v1/actual_score_ranks.csv'
KEYS=['Date','HomeTeam','AwayTeam']
BASE=['HomeEloPre','AwayEloPre','EloDiffPre','HomeGoalsForAvgLast5',
      'AwayGoalsForAvgLast5','HomeGoalsAgainstAvgLast5','AwayGoalsAgainstAvgLast5']
MISMATCH=['HomeAttackVsAwayDefence','AwayAttackVsHomeDefence']
SCHEDULE=['HomeRestDays','AwayRestDays','HomeMatchesLast7Days','AwayMatchesLast7Days',
          'HomeMatchesLast14Days','AwayMatchesLast14Days']
GROUPS={'Base':BASE,'Mismatch':BASE+MISMATCH,'Recent':BASE+list(RECENT),
        'Venue':BASE+list(VENUE),'Schedule':BASE+SCHEDULE,
        'Full':BASE+MISMATCH+list(RECENT)+list(VENUE)+SCHEDULE}
FOLDS=[f'{year}/{(year+1)%100:02d}' for year in range(2017,2024)]
PARAMS=dict(n_estimators=180,max_depth=4,learning_rate=.05,subsample=.9,
            colsample_bytree=.9,reg_lambda=5,tree_method='hist',random_state=42,
            objective='binary:logistic',eval_metric='logloss',n_jobs=4)

def write_json(name, obj):
    (OUT/name).write_text(json.dumps(obj,indent=2,ensure_ascii=False,default=str),encoding='utf-8')

def check_keys(a,b):
    if len(a)!=len(b) or not a[KEYS].astype(str).equals(b[KEYS].astype(str)):
        raise ValueError('Fixture lineage/order mismatch')

def source_frame():
    base=load_feature_data(SOURCE)
    p7=pd.read_csv(P7)
    legacy=load_feature_data(ROOT/'data/processed/features_matches.csv')
    check_keys(base,legacy)
    if len(base)!=len(p7) or len(base)!=12704:
        raise ValueError('Frozen chronological source row count mismatch')
    base=base.copy()
    for name in SCHEDULE[2:]:
        base[name]=p7[name].to_numpy()
    base[MISMATCH[0]]=base.HomeGoalsForAvgLast5*base.AwayGoalsAgainstAvgLast5
    base[MISMATCH[1]]=base.AwayGoalsForAvgLast5*base.HomeGoalsAgainstAvgLast5
    environment,traces=add_environment_features(base,trace_indices={11564,11944,12324})
    for name in ALL_NEW:
        base[name]=environment[name].to_numpy()
    if any(name not in base or not pd.api.types.is_numeric_dtype(base[name]) for names in GROUPS.values() for name in names):
        raise ValueError('Non-numeric or absent registered feature')
    return base,environment,traces

def metric(y,p):
    y=np.asarray(y,dtype=int); p=np.asarray(p,dtype=float)
    if not np.isfinite(p).all() or ((p<0)|(p>1)).any():
        raise ValueError('Invalid probability')
    return dict(N=len(y),High=int(y.sum()),Prevalence=float(y.mean()),
                ROC_AUC=float(roc_auc_score(y,p)),AveragePrecision=float(average_precision_score(y,p)),
                LogLoss=float(log_loss(y,p,labels=[0,1])),Brier=float(brier_score_loss(y,p)))

def fit_fold(train,valid,columns):
    fills=train[columns].apply(pd.to_numeric,errors='coerce').median().fillna(0).to_dict()
    xtrain=train[columns].fillna(fills).astype(float)
    xvalid=valid[columns].fillna(fills).astype(float)
    model=xgb.XGBClassifier(**PARAMS)
    target=(train.HomeGoals+train.AwayGoals>=4).astype(int)
    model.fit(xtrain,target,verbose=False)
    if list(model.feature_names_in_)!=columns:
        raise ValueError('Model feature order changed')
    return model, {key:float(value) for key,value in fills.items()},model.predict_proba(xvalid)[:,1]

def freeze():
    if OUT.exists():
        raise FileExistsError('Phase-9 output already exists; do not overwrite frozen evaluation')
    reproduce()
    base,environment,traces=source_frame()
    OUT.mkdir(parents=True)
    environment.to_csv(OUT/'environment_features.csv',index=False)
    for entry in traces.values():
        if any(date>=entry['FixtureDate'] for key in ('HomeRecentSources','AwayRecentSources','HomeVenueSources','AwayVenueSources') for date in entry[key]):
            raise ValueError('As-of history includes fixture/current/future date')
    write_json('asof_spot_checks.json',traces)
    spec=dict(Experiment='high_total_discrimination_v1',CreatedUTC=datetime.now(timezone.utc).isoformat(),
              Target='HomeGoals + AwayGoals >= 4',FeatureVersion='correctness_v2 safe subset plus whole-date history',
              Families=GROUPS,Folds=FOLDS,Model=PARAMS,Selection='highest pooled walk-forward ROC-AUC; tie AP, then lower LogLoss, then lower Brier; fixed family order',
              Fill='per-fold training numeric median; zero if entire column missing',
              Calibration='raw XGBoost predict_proba, no fit/calibration/threshold',
              MismatchFormulae=['HomeGoalsForAvgLast5 * AwayGoalsAgainstAvgLast5','AwayGoalsForAvgLast5 * HomeGoalsAgainstAvgLast5'],
              AsOf='all fixtures on a date read before same-day results; strict source_date < fixture_date',
              DiagnosticSeasons=['2024/25','2025/26'],NoScoreIntegration=True)
    write_json('feature_spec.json',spec)
    integrity=[]
    for group,names in [('base',BASE),('mismatch',MISMATCH),('recent',RECENT),('venue',VENUE),('schedule',SCHEDULE)]:
        for name in names:
            integrity.append(dict(Family=group,Feature=name,Source='correctness_v2' if group in ('base','mismatch') or name in SCHEDULE[:2] else 'whole-date historical results' if group in ('recent','venue') else 'Phase-7 frozen prior-fixture schedule',
                                  HistoricalWindow='last five prior team matches' if group=='recent' else 'last five prior correct-venue matches' if group=='venue' else 'existing pre-match / fixed 7-14 calendar days',
                                  AsOfRule='strictly before fixture date; all same-day results delayed',Fill='training median; zero if all missing'))
    pd.DataFrame(integrity).to_csv(OUT/'feature_integrity.csv',index=False)
    missing=[]
    for name in dict.fromkeys(GROUPS['Full']):
        for split,seasons in [('train',None),('validation',['2023/24']),('diagnostic',['2024/25','2025/26'])]:
            frame=base[base.Season.isin(seasons)] if seasons else base[~base.Season.isin(['2023/24','2024/25','2025/26'])]
            missing.append(dict(Feature=name,Split=split,N=len(frame),Missing=int(frame[name].isna().sum()),MissingPercent=float(frame[name].isna().mean()*100)))
    pd.DataFrame(missing).to_csv(OUT/'feature_missingness.csv',index=False)
    protected={}
    for phase,folder in [('phase3','ml_goal_rates_v1'),('phase4','score_dependency_v1'),('phase5','score_calibration_v1'),('phase6','outcome_aware_score_selection_v1'),('phase7','goal_rate_feature_expansion_v1'),('phase8','high_score_underdispersion_audit_v1')]:
        path=ROOT/'data/processed'/folder
        if path.exists():
            protected[phase]={name:sha(path/name) for name in ('report.json','final_report.md') if (path/name).exists()}
    write_json('data_manifest.json',dict(SourceSHA256=sha(SOURCE),Phase7FeatureSHA256=sha(P7),Phase8RankSHA256=sha(P8),
                                          SpecSHA256=sha(OUT/'feature_spec.json'),EnvironmentSHA256=sha(OUT/'environment_features.csv'),Protected=protected,
                                          ScoreReferences='Phase-3 independent 96/760; Phase-4 DC 99/760; Phase-7 E+DC 101/760; unchanged'))

def verify_freeze():
    manifest=json.loads((OUT/'data_manifest.json').read_text())
    for path,key in [(SOURCE,'SourceSHA256'),(P7,'Phase7FeatureSHA256'),(P8,'Phase8RankSHA256'),(OUT/'feature_spec.json','SpecSHA256'),(OUT/'environment_features.csv','EnvironmentSHA256')]:
        if sha(path)!=manifest[key]:
            raise ValueError(f'Frozen Phase-9 input changed: {path}')
    for phase,entries in manifest['Protected'].items():
        folder={'phase3':'ml_goal_rates_v1','phase4':'score_dependency_v1','phase5':'score_calibration_v1','phase6':'outcome_aware_score_selection_v1','phase7':'goal_rate_feature_expansion_v1','phase8':'high_score_underdispersion_audit_v1'}[phase]
        for name,hashval in entries.items():
            if sha(ROOT/'data/processed'/folder/name)!=hashval:
                raise ValueError(f'Protected {phase}/{name} changed')

def walkforward():
    verify_freeze()
    if (OUT/'selection_freeze.json').exists():
        raise FileExistsError('Selection is already frozen')
    base,_,_=source_frame()
    frame=[]; fold_metrics=[]
    for variant,columns in GROUPS.items():
        for season in FOLDS:
            year=int(season[:4]); train=base[base.Season.str[:4].astype(int)<year]
            valid=base[base.Season==season]
            if not len(train) or not len(valid) or train.Date.max()>=valid.Date.min():
                raise ValueError('Walk-forward train/validation chronology invalid')
            model,fills,p=fit_fold(train,valid,columns)
            y=(valid.HomeGoals+valid.AwayGoals>=4).astype(int).to_numpy()
            fold_metrics.append(dict(Variant=variant,Fold=season,TrainN=len(train),TrainHigh=int((train.HomeGoals+train.AwayGoals>=4).sum()),
                                     TrainMaxDate=str(train.Date.max().date()),ValidMinDate=str(valid.Date.min().date()),**metric(y,p)))
            frame.extend(dict(Variant=variant,Fold=season,Date=str(date.date()),HomeTeam=h,AwayTeam=a,
                              ActualTotal=int(hg+ag),ActualHigh=int(hg+ag>=4),Probability=float(prob))
                         for date,h,a,hg,ag,prob in zip(valid.Date,valid.HomeTeam,valid.AwayTeam,valid.HomeGoals,valid.AwayGoals,p))
    oof=pd.DataFrame(frame)
    oof.to_csv(OUT/'walk_forward_predictions.csv',index=False)
    pd.DataFrame(fold_metrics).to_csv(OUT/'walk_forward_fold_metrics.csv',index=False)
    summary=[]
    for variant in GROUPS:
        part=oof[oof.Variant==variant]
        summary.append(dict(Variant=variant,**metric(part.ActualHigh,part.Probability),
                            FoldAUCMean=float(pd.DataFrame(fold_metrics).query('Variant == @variant').ROC_AUC.mean()),
                            FoldAUCStd=float(pd.DataFrame(fold_metrics).query('Variant == @variant').ROC_AUC.std(ddof=0))))
    summary=pd.DataFrame(summary)
    summary.to_csv(OUT/'walk_forward_metrics.csv',index=False)
    chosen=summary.sort_values(['ROC_AUC','AveragePrecision','LogLoss','Brier','Variant'],ascending=[False,False,True,True,True]).iloc[0]
    write_json('selection_freeze.json',dict(SelectedVariant=chosen.Variant,SelectedFeatures=GROUPS[chosen.Variant],
                                            HistoricalPooledMetrics=chosen.to_dict(),FeatureSpecSHA256=sha(OUT/'feature_spec.json'),
                                            WalkForwardPredictionsSHA256=sha(OUT/'walk_forward_predictions.csv'),
                                            WalkForwardMetricsSHA256=sha(OUT/'walk_forward_metrics.csv'),
                                            FrozenBeforeDiagnostic=True,DiagnosticOutcomesUsedForSelection=False))
    return chosen.Variant

def final_train():
    verify_freeze()
    if (OUT/'final_model.json').exists():
        raise FileExistsError('Final detector already frozen')
    selected=json.loads((OUT/'selection_freeze.json').read_text())
    if sha(OUT/'feature_spec.json')!=selected['FeatureSpecSHA256'] or sha(OUT/'walk_forward_predictions.csv')!=selected['WalkForwardPredictionsSHA256']:
        raise ValueError('Pre-diagnostic selection freeze invalid')
    base,_,_=source_frame()
    train=base[base.Season.str[:4].astype(int)<2024]
    valid=base[base.Season=='2024/25'].iloc[:1]
    model,fills,_=fit_fold(train,valid,selected['SelectedFeatures'])
    model.save_model(OUT/'final_model.json')
    write_json('final_metadata.json',dict(SelectedVariant=selected['SelectedVariant'],Features=selected['SelectedFeatures'],
                                          Fills=fills,TrainN=len(train),TrainHigh=int((train.HomeGoals+train.AwayGoals>=4).sum()),
                                          TrainMaxDate=str(train.Date.max().date()),Model=PARAMS,NoEarlyStopping=True,NoCalibration=True))
    write_json('training_manifest.json',dict(ModelSHA256=sha(OUT/'final_model.json'),MetadataSHA256=sha(OUT/'final_metadata.json'),
                                             SelectionSHA256=sha(OUT/'selection_freeze.json'),
                                             SpecSHA256=sha(OUT/'feature_spec.json'),
                                             DiagnosticOutcomesUsedForTraining=False))

def diagnostic():
    verify_freeze(); reproduce()
    if (OUT/'diagnostic_predictions.csv').exists():
        raise FileExistsError('Diagnostic already evaluated')
    training=json.loads((OUT/'training_manifest.json').read_text())
    for file,key in [('final_model.json','ModelSHA256'),('final_metadata.json','MetadataSHA256'),('selection_freeze.json','SelectionSHA256'),('feature_spec.json','SpecSHA256')]:
        if sha(OUT/file)!=training[key]:
            raise ValueError('Final training freeze changed')
    base,_,_=source_frame()
    test=base[base.Season.isin(['2024/25','2025/26'])].copy().reset_index(drop=True)
    ranks=pd.read_csv(P8)
    ranks.Date=pd.to_datetime(ranks.Date)
    check_keys(test,ranks)
    if len(test)!=760 or not np.array_equal((test.HomeGoals+test.AwayGoals).to_numpy(),ranks.ActualTotalGoals.to_numpy()):
        raise ValueError('Diagnostic target/fixture lineage differs from Phase 8')
    meta=json.loads((OUT/'final_metadata.json').read_text())
    model=xgb.XGBClassifier(); model.load_model(OUT/'final_model.json')
    if list(model.feature_names_in_)!=meta['Features']:
        raise ValueError('Model feature order differs from frozen metadata')
    p=model.predict_proba(test[meta['Features']].fillna(meta['Fills']).astype(float))[:,1]
    frame=ranks[KEYS+['ActualTotalGoals','ActualScore','ActualScoreGridRank','Top1Score','ExactCorrect','LambdaHome','LambdaAway','LambdaTotal']].copy()
    frame.insert(3,'Season',test.Season.to_numpy())
    frame['ActualHigh']=(frame.ActualTotalGoals>=4).astype(int)
    frame['DetectorProbability']=p
    frame['FrozenPoissonHighProbability']=poisson.sf(3,frame.LambdaTotal.to_numpy())
    frame['DetectorRiskRank']=frame.DetectorProbability.rank(ascending=False,method='first').astype(int)
    frame['LambdaRiskRank']=frame.LambdaTotal.rank(ascending=False,method='first').astype(int)
    frame.to_csv(OUT/'diagnostic_predictions.csv',index=False)
    metrics=[]
    for source,col in [('Detector','DetectorProbability'),('FrozenPoissonHighProbability','FrozenPoissonHighProbability')]:
        metrics.append(dict(Source=source,Season='pooled',**metric(frame.ActualHigh,frame[col])))
    y=frame.ActualHigh.to_numpy(); lam=frame.LambdaTotal.to_numpy()
    metrics.append(dict(Source='FrozenPhase3LambdaTotal',Season='pooled',N=760,High=int(y.sum()),Prevalence=float(y.mean()),
                        ROC_AUC=float(roc_auc_score(y,lam)),AveragePrecision=float(average_precision_score(y,lam)),LogLoss=np.nan,Brier=np.nan))
    pd.DataFrame(metrics).to_csv(OUT/'diagnostic_metrics.csv',index=False)
    season=[]
    for name,part in frame.groupby('Season',sort=True):
        for source,col in [('Detector','DetectorProbability'),('FrozenPoissonHighProbability','FrozenPoissonHighProbability'),('FrozenPhase3LambdaTotal','LambdaTotal')]:
            item=metric(part.ActualHigh,part[col]) if source!='FrozenPhase3LambdaTotal' else dict(N=len(part),High=int(part.ActualHigh.sum()),Prevalence=float(part.ActualHigh.mean()),ROC_AUC=float(roc_auc_score(part.ActualHigh,part.LambdaTotal)),AveragePrecision=float(average_precision_score(part.ActualHigh,part.LambdaTotal)),LogLoss=np.nan,Brier=np.nan)
            season.append(dict(Source=source,Season=name,**item))
    pd.DataFrame(season).to_csv(OUT/'season_metrics.csv',index=False)
    calibration=[]
    edges=np.linspace(0,1,11)
    for i in range(10):
        part=frame[(frame.DetectorProbability>=edges[i]) & (frame.DetectorProbability<(edges[i+1] if i<9 else 1.0000001))]
        calibration.append(dict(Bin=i,Lower=edges[i],Upper=edges[i+1],N=len(part),MeanPredicted=float(part.DetectorProbability.mean()) if len(part) else np.nan,
                                ActualHighRate=float(part.ActualHigh.mean()) if len(part) else np.nan))
    pd.DataFrame(calibration).to_csv(OUT/'calibration_bins.csv',index=False)
    ordered=frame.sort_values('DetectorProbability',ascending=False,kind='stable').reset_index(drop=True)
    deciles=[]
    for i in range(10):
        part=ordered.iloc[i*76:(i+1)*76]
        deciles.append(dict(Decile=i+1,N=len(part),High=int(part.ActualHigh.sum()),HighRate=float(part.ActualHigh.mean()),MeanDetectorRisk=float(part.DetectorProbability.mean()),MeanLambdaTotal=float(part.LambdaTotal.mean())))
    pd.DataFrame(deciles).to_csv(OUT/'risk_deciles.csv',index=False)
    capture=[]
    for source,col in [('Detector','DetectorProbability'),('FrozenPhase3LambdaTotal','LambdaTotal')]:
        ordered=frame.sort_values(col,ascending=False,kind='stable')
        for fraction in (.1,.2,.3,.5):
            part=ordered.iloc[:int(760*fraction)]
            capture.append(dict(Source=source,TopFraction=fraction,N=len(part),CapturedHigh=int(part.ActualHigh.sum()),CaptureOfAllHigh=float(part.ActualHigh.sum()/y.sum()),Precision=float(part.ActualHigh.mean())))
    pd.DataFrame(capture).to_csv(OUT/'top_risk_capture.csv',index=False)
    pd.DataFrame([dict(PearsonRiskLambda=float(frame.DetectorProbability.corr(frame.LambdaTotal)),SpearmanRiskLambda=float(spearmanr(frame.DetectorProbability,frame.LambdaTotal).statistic),
                       MeanDetectorRisk=float(frame.DetectorProbability.mean()),MeanPoissonRisk=float(frame.FrozenPoissonHighProbability.mean()),
                       MeanLambdaHigh=float(frame.loc[frame.ActualHigh==1,'LambdaTotal'].mean()),MeanLambdaNotHigh=float(frame.loc[frame.ActualHigh==0,'LambdaTotal'].mean()))]).to_csv(OUT/'detector_lambda_connection.csv',index=False)
    disagreements=frame[(frame.DetectorRiskRank<=190)&(frame.LambdaRiskRank>570) | (frame.LambdaRiskRank<=190)&(frame.DetectorRiskRank>570)].copy()
    disagreements['RankGap']=abs(disagreements.DetectorRiskRank-disagreements.LambdaRiskRank)
    disagreements.sort_values('RankGap',ascending=False).to_csv(OUT/'detector_lambda_disagreements.csv',index=False)
    booster=model.get_booster(); gain=booster.get_score(importance_type='gain')
    pd.DataFrame([dict(Feature=name,Gain=float(gain.get(name,0)),Rank=rank) for rank,name in enumerate(sorted(meta['Features'],key=lambda x:-gain.get(x,0)),1)]).to_csv(OUT/'feature_importance.csv',index=False)
    promoted=[]
    for season_name,part in frame.groupby('Season'):
        prior_year=int(season_name[:4])-1
        prior=f'{prior_year}/{(prior_year+1)%100:02d}'
        prior_teams=set(base.loc[base.Season==prior,'HomeTeam'])|set(base.loc[base.Season==prior,'AwayTeam'])
        season_teams=set(test.loc[test.Season==season_name,'HomeTeam'])|set(test.loc[test.Season==season_name,'AwayTeam'])
        newcomers=sorted(season_teams-prior_teams)
        mask=(test.Season==season_name)&(test.HomeTeam.isin(newcomers)|test.AwayTeam.isin(newcomers))
        sub=frame[mask.to_numpy()]
        promoted.append(dict(Season=season_name,InferredNewTeams=';'.join(newcomers),N=len(sub),High=int(sub.ActualHigh.sum()),MeanDetectorRisk=float(sub.DetectorProbability.mean()),ROC_AUC=float(roc_auc_score(sub.ActualHigh,sub.DetectorProbability)) if sub.ActualHigh.nunique()>1 else np.nan))
    pd.DataFrame(promoted).to_csv(OUT/'promoted_team_diagnostic.csv',index=False)
    report=dict(Experiment='high_total_discrimination_v1',SelectedVariant=meta['SelectedVariant'],WalkForwardSelectedMetrics=json.loads((OUT/'selection_freeze.json').read_text())['HistoricalPooledMetrics'],
                DiagnosticMetrics=metrics,SeasonMetrics=season,HighMatches=int(y.sum()),BaselineExact=96,FixedDCExact=99,EFixedDCExact=101,
                BaselineHighExact=0,DetectorScoreIntegration=False,HistoricalInspectedDiagnostic=True,
                Phase3EarlierOOFReference='unavailable; 2023/24 frozen goal rates used for early stopping, so cannot serve as independent walk-forward reference')
    write_json('report.json',report)
    return report

def main():
    freeze(); selected=walkforward(); final_train(); report=diagnostic()
    print('Selected',selected,'diagnostic',report['DiagnosticMetrics'])

if __name__=='__main__':
    main()
