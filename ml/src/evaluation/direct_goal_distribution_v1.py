"""Frozen direct goal-count marginals and independent global score mode."""
from __future__ import annotations

import json
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import xgboost as xgb
from scipy.stats import poisson
from sklearn.metrics import log_loss

from src.models.ml_goal_rates_v1 import ROOT,sha
from src.models.model_utils import load_feature_data
from src.evaluation.score_calibration_v1 import reproduce
from src.evaluation.high_score_underdispersion_audit_v1 import actual_rank
from src.evaluation.high_total_discrimination_v1 import BASE,FOLDS,SOURCE,P8,KEYS

OUT=ROOT/'data/processed/direct_goal_distribution_v1'
NCLASSES=8 # exact 0..6, 7 is 7+ overflow, never treated as an exact seven-goal cell
GRID=7
FEATURES=BASE.copy() # corrected-v2 safe subset; architecture comparison with legacy 123-feature P3 has a feature-lineage difference
PARAMS=dict(n_estimators=180,max_depth=4,learning_rate=.05,subsample=.9,colsample_bytree=.9,
            reg_lambda=5,tree_method='hist',random_state=42,n_jobs=4)

def save(name,obj):
    (OUT/name).write_text(json.dumps(obj,indent=2,ensure_ascii=False,default=str),encoding='utf-8')

def bucket(goals):
    return np.minimum(np.asarray(goals,dtype=int),7)

def valid_probability(p):
    p=np.asarray(p,dtype=float)
    if p.ndim!=2 or p.shape[1]!=NCLASSES or not np.isfinite(p).all() or (p<0).any() or not np.allclose(p.sum(axis=1),1,atol=1e-6):
        raise ValueError('Invalid frozen goal-count class probabilities')
    return p

def matrix(home,away):
    if len(home)!=NCLASSES or len(away)!=NCLASSES or not np.isfinite(home).all() or not np.isfinite(away).all():
        raise ValueError('Goal probability vectors must use frozen class order')
    raw=np.outer(home[:GRID],away[:GRID])
    mass=raw.sum()
    if mass<=0 or not np.isfinite(mass):
        raise ValueError('No supported exact grid mass')
    result=raw/mass # same conditional 0..6 grid convention as Phase-3/4
    if not np.isclose(result.sum(),1,atol=1e-12) or (result<0).any() or np.argmax(result)!=np.argmax(raw):
        raise ValueError('Outer-product normalization changed score mode')
    return result,float(mass)

def counts_and_freeze():
    if OUT.exists():
        raise FileExistsError('Phase-10 results already exist')
    reproduce()
    data=load_feature_data(SOURCE)
    train=data[data.Season.str[:4].astype(int)<2024]
    if len(train)!=11944 or data[FEATURES].select_dtypes(include='number').shape[1]!=len(FEATURES):
        raise ValueError('Feature lineage or historical training size differs')
    rows=[]
    for side in ('Home','Away'):
        target=train[f'{side}Goals'].to_numpy()
        for value in range(8):
            count=int((target==value).sum()) if value<7 else int((target>=7).sum())
            rows.append(dict(Side=side,Class=str(value) if value<7 else '7+',Count=count,
                             Percent=100*count/len(train),TrainingN=len(train)))
    support=pd.DataFrame(rows)
    # Registered stability floor: >=30 examples for exact classes 5 and 6 on both sides.
    if support[(support.Class.isin(['5','6']))].Count.min()<30:
        raise ValueError('Pre-registered exact 0..6 policy fails training-support floor; inspect 5+ policy before training')
    OUT.mkdir(parents=True)
    support.to_csv(OUT/'goal_class_support.csv',index=False)
    policy=dict(ExactClasses=list(range(7)),OverflowClass=7,OverflowMeaning='7+; not an exact score cell',
                MinimumSupportExact5And6=30,ObservedMinimumSupport=int(support[support.Class.isin(['5','6'])].Count.min()),
                PrimaryGrid='exact 0..6 each side',Matrix='outer product of exact 0..6 probabilities, normalized on grid',
                Selection='stable row-major global argmax; no score weighting',ClassOrder=list(range(8)),
                ChosenFrom='strictly pre-2024/25 training support; diagnostic outcomes excluded')
    save('class_policy.json',policy)
    spec=dict(Experiment='direct_goal_distribution_v1',CreatedUTC=datetime.now(timezone.utc).isoformat(),
              FeatureVersion='correctness_v2 safe subset',Features=FEATURES,FeatureOrder=FEATURES,
              FeatureLineageCaveat='Phase-3 frozen 123 legacy_v1 columns cannot all be reused with verified safe semantics; seven corrected pre-match strength/form columns used for direct and matched historical Poisson folds',
              HomeTarget='HomeGoals mapped 7+ to overflow class 7',AwayTarget='AwayGoals mapped 7+ to overflow class 7',
              ClassPolicy=policy,Model='two independent XGBoost multi:softprob classifiers, unweighted',
              Hyperparameters=PARAMS,RateReference='matched-feature XGB count:poisson on historical folds only; frozen Phase-3 independent on diagnostic',
              Fill='numeric train median separately per fold; zero only if entire training column missing',
              Folds=FOLDS,NoCalibration=True,NoDependency=True,NoOdds=True,NoPhase9Detector=True,
              NoScoreBoost=True,DiagnosticSeasons=['2024/25','2025/26'])
    save('feature_spec.json',spec)
    pd.DataFrame([dict(Feature=name,Source='correctness_v2 pre-match row',Definition='existing pre-match Elo / prior-five goals form',AsOf='prior match history only; source before fixture date',MissingFill='fold/final training median') for name in FEATURES]).to_csv(OUT/'feature_integrity.csv',index=False)
    missing=[]
    for name in FEATURES:
        for group,seasons in [('train',None),('validation',['2023/24']),('diagnostic',['2024/25','2025/26'])]:
            part=data[data.Season.isin(seasons)] if seasons else train
            missing.append(dict(Feature=name,Split=group,N=len(part),Missing=int(part[name].isna().sum()),Percent=float(part[name].isna().mean()*100)))
    pd.DataFrame(missing).to_csv(OUT/'feature_missingness.csv',index=False)
    protected={}
    folders={'phase3':'ml_goal_rates_v1','phase4':'score_dependency_v1','phase5':'score_calibration_v1','phase6':'outcome_aware_score_selection_v1','phase7':'goal_rate_feature_expansion_v1','phase8':'high_score_underdispersion_audit_v1','phase9':'high_total_discrimination_v1'}
    for phase,folder in folders.items():
        path=ROOT/'data/processed'/folder
        protected[phase]={name:sha(path/name) for name in ('report.json','final_report.md') if (path/name).exists()}
    save('data_manifest.json',dict(SourceSHA256=sha(SOURCE),Phase8RankSHA256=sha(P8),
                                   SpecSHA256=sha(OUT/'feature_spec.json'),PolicySHA256=sha(OUT/'class_policy.json'),
                                   Protected=protected,ProtectedFolders=folders,Phase3Baseline='matchwise 96/760 reproduced before training'))

def verify():
    m=json.loads((OUT/'data_manifest.json').read_text())
    for path,key in [(SOURCE,'SourceSHA256'),(P8,'Phase8RankSHA256'),(OUT/'feature_spec.json','SpecSHA256'),(OUT/'class_policy.json','PolicySHA256')]:
        if sha(path)!=m[key]:
            raise ValueError(f'Frozen input differs: {path}')
    for phase,entries in m['Protected'].items():
        for name,value in entries.items():
            if sha(ROOT/'data/processed'/m['ProtectedFolders'][phase]/name)!=value:
                raise ValueError(f'Protected {phase} artifact differs')

def fit_models(train,valid):
    fills=train[FEATURES].median(numeric_only=True).reindex(FEATURES).fillna(0).to_dict()
    xt=train[FEATURES].fillna(fills).astype(float)
    xv=valid[FEATURES].fillna(fills).astype(float)
    classifiers=[]; probs=[]; rates=[]; rate_models=[]
    for side in ('Home','Away'):
        y=bucket(train[f'{side}Goals'])
        if sorted(np.unique(y).tolist())!=list(range(NCLASSES)):
            raise ValueError(f'{side} fold missing a registered class')
        cl=xgb.XGBClassifier(objective='multi:softprob',num_class=NCLASSES,eval_metric='mlogloss',**PARAMS)
        cl.fit(xt,y,verbose=False)
        if list(cl.feature_names_in_)!=FEATURES or cl.classes_.tolist()!=list(range(NCLASSES)):
            raise ValueError('Classifier feature/class order differs')
        classifiers.append(cl); probs.append(valid_probability(cl.predict_proba(xv)))
        reg=xgb.XGBRegressor(objective='count:poisson',eval_metric='poisson-nloglik',**PARAMS)
        reg.fit(xt,train[f'{side}Goals'],verbose=False)
        rate_models.append(reg); rates.append(np.maximum(reg.predict(xv),.05))
    return classifiers,probs,rate_models,np.stack(rates,axis=1),{key:float(value) for key,value in fills.items()}

def per_fixture(frame,ph,pa,rates,fold):
    rows=[]
    for n,row in enumerate(frame.itertuples(index=False)):
        m,gridmass=matrix(ph[n],pa[n])
        index=int(np.argmax(m)); direct=f'{index//GRID}-{index%GRID}'
        total=int(row.HomeGoals+row.AwayGoals); actual=f'{int(row.HomeGoals)}-{int(row.AwayGoals)}'
        pm=poisson.pmf(np.arange(GRID),rates[n,0])[:,None]*poisson.pmf(np.arange(GRID),rates[n,1])[None,:]
        pm/=pm.sum()
        pi=int(np.argmax(pm)); rate=f'{pi//GRID}-{pi%GRID}'
        rank,pactual,outside=actual_rank(m,int(row.HomeGoals),int(row.AwayGoals))
        prank,ppactual,_=actual_rank(pm,int(row.HomeGoals),int(row.AwayGoals))
        rows.append(dict(Fold=fold,Date=str(row.Date.date()),Season=row.Season,HomeTeam=row.HomeTeam,AwayTeam=row.AwayTeam,
                         ActualHomeGoals=int(row.HomeGoals),ActualAwayGoals=int(row.AwayGoals),ActualScore=actual,ActualTotal=total,
                         DirectScore=direct,DirectExact=int(direct==actual),DirectGridMass=gridmass,
                         DirectActualRank=rank,DirectActualGridProbability=pactual,DirectOutsideGrid=outside,
                         MatchedPoissonScore=rate,MatchedPoissonExact=int(rate==actual),MatchedPoissonActualRank=prank,
                         MatchedPoissonActualGridProbability=ppactual,
                         HomeProbabilities=json.dumps(ph[n].tolist()),AwayProbabilities=json.dumps(pa[n].tolist()),
                         MatchedLambdaHome=float(rates[n,0]),MatchedLambdaAway=float(rates[n,1])))
    return rows

def metrics(part):
    return dict(N=len(part),DirectHits=int(part.DirectExact.sum()),DirectAccuracy=float(part.DirectExact.mean()),
                MatchedPoissonHits=int(part.MatchedPoissonExact.sum()),MatchedPoissonAccuracy=float(part.MatchedPoissonExact.mean()),
                DirectTop3=int((part.DirectActualRank<=3).sum()),MatchedPoissonTop3=int((part.MatchedPoissonActualRank<=3).sum()),
                DirectMeanActualRank=float(part.DirectActualRank.mean()),MatchedPoissonMeanActualRank=float(part.MatchedPoissonActualRank.mean()))

def walkforward():
    verify()
    if (OUT/'selection_freeze.json').exists():
        raise FileExistsError('Historical selection is already frozen')
    data=load_feature_data(SOURCE)
    rows=[]; folds=[]
    for season in FOLDS:
        year=int(season[:4]); train=data[data.Season.str[:4].astype(int)<year]
        valid=data[data.Season==season]
        if len(train)==0 or len(valid)==0 or train.Date.max()>=valid.Date.min():
            raise ValueError('Walk-forward chronology differs')
        _,(ph,pa),_,rates,fills=fit_models(train,valid)
        part=pd.DataFrame(per_fixture(valid,ph,pa,rates,season))
        rows.extend(part.to_dict('records'))
        folds.append(dict(Fold=season,TrainN=len(train),TrainMaxDate=str(train.Date.max().date()),
                          ValidMinDate=str(valid.Date.min().date()),**metrics(part)))
    oof=pd.DataFrame(rows)
    oof.to_csv(OUT/'walk_forward_predictions.csv',index=False)
    pd.DataFrame(folds).to_csv(OUT/'walk_forward_fold_metrics.csv',index=False)
    pd.DataFrame([dict(Source='pooled',**metrics(oof))]).to_csv(OUT/'walk_forward_metrics.csv',index=False)
    save('selection_freeze.json',dict(ClassPolicySHA256=sha(OUT/'class_policy.json'),FeatureSpecSHA256=sha(OUT/'feature_spec.json'),
                                      OofSHA256=sha(OUT/'walk_forward_predictions.csv'),SelectedFeatures=FEATURES,
                                      SelectedModel=PARAMS,Architecture='two unweighted direct marginals × independent outer product × global argmax',
                                      FrozenBeforeDiagnostic=True,DiagnosticUsedForSelection=False,
                                      HistoricalMetrics=metrics(oof)))
    return metrics(oof)

def final_train():
    verify()
    if (OUT/'home_model.json').exists():
        raise FileExistsError('Final direct classifiers already frozen')
    selection=json.loads((OUT/'selection_freeze.json').read_text())
    if sha(OUT/'feature_spec.json')!=selection['FeatureSpecSHA256'] or sha(OUT/'walk_forward_predictions.csv')!=selection['OofSHA256']:
        raise ValueError('Historical pre-diagnostic freeze changed')
    data=load_feature_data(SOURCE)
    train=data[data.Season.str[:4].astype(int)<2024]
    valid=data[data.Season=='2024/25'].iloc[:1]
    cls,_,_,_,fills=fit_models(train,valid)
    for side,model in zip(('home','away'),cls):
        model.save_model(OUT/f'{side}_model.json')
    save('final_metadata.json',dict(Features=FEATURES,Fills=fills,ClassOrder=list(range(NCLASSES)),
                                    TrainN=len(train),TrainMaxDate=str(train.Date.max().date()),
                                    HomeTarget='HomeGoals',AwayTarget='AwayGoals',NoCalibration=True,
                                    Matrix='normalized outer product of exact 0..6; 7+ excluded',NoScoreWeighting=True))
    save('training_manifest.json',dict(HomeModelSHA256=sha(OUT/'home_model.json'),AwayModelSHA256=sha(OUT/'away_model.json'),
                                       MetadataSHA256=sha(OUT/'final_metadata.json'),SelectionSHA256=sha(OUT/'selection_freeze.json'),
                                       DiagnosticOutcomesUsedForTraining=False))

def diagnostic():
    verify(); reproduce()
    if (OUT/'diagnostic_predictions.csv').exists():
        raise FileExistsError('Diagnostic already evaluated')
    manifest=json.loads((OUT/'training_manifest.json').read_text())
    for name,key in [('home_model.json','HomeModelSHA256'),('away_model.json','AwayModelSHA256'),('final_metadata.json','MetadataSHA256'),('selection_freeze.json','SelectionSHA256')]:
        if sha(OUT/name)!=manifest[key]:
            raise ValueError('Final direct model freeze changed')
    data=load_feature_data(SOURCE)
    test=data[data.Season.isin(['2024/25','2025/26'])].reset_index(drop=True)
    ranks=pd.read_csv(P8); ranks.Date=pd.to_datetime(ranks.Date)
    if len(test)!=760 or not test[KEYS].astype(str).equals(ranks[KEYS].astype(str)) or not np.array_equal((test.HomeGoals+test.AwayGoals).to_numpy(),ranks.ActualTotalGoals.to_numpy()):
        raise ValueError('Frozen 760 fixture lineage differs')
    meta=json.loads((OUT/'final_metadata.json').read_text())
    ph=[]
    for side in ('home','away'):
        cl=xgb.XGBClassifier(); cl.load_model(OUT/f'{side}_model.json')
        if list(cl.feature_names_in_)!=meta['Features'] or cl.classes_.tolist()!=meta['ClassOrder']:
            raise ValueError(f'{side} final model feature/class order differs')
        ph.append(valid_probability(cl.predict_proba(test[FEATURES].fillna(meta['Fills']).astype(float))))
    frozen_rates=np.load(ROOT/'data/processed/ml_goal_rates_v1/diagnostic_rates.npz')['xgb']
    frame=pd.DataFrame(per_fixture(test,*ph,frozen_rates,'diagnostic'))
    frame=frame.drop(columns=[name for name in frame if name.startswith('MatchedPoisson')])
    frame['BaselineScore']=ranks.Top1Score.to_numpy()
    frame['BaselineExact']=ranks.ExactCorrect.astype(int).to_numpy()
    frame['BaselineActualRank']=ranks.ActualScoreGridRank.to_numpy()
    frame['BaselineActualGridProbability']=ranks.ActualScoreGridProbability.to_numpy()
    frame['BaselineTop3']=(frame.BaselineActualRank<=3).astype(int)
    frame['BaselineTop5']=(frame.BaselineActualRank<=5).astype(int)
    frame['DirectTop3']=(frame.DirectActualRank<=3).astype(int)
    frame['DirectTop5']=(frame.DirectActualRank<=5).astype(int)
    if int(frame.BaselineExact.sum())!=96 or frame.loc[frame.ActualTotal>=4,'BaselineExact'].sum()!=0:
        raise ValueError('Frozen Phase-3 96/760 or high-score baseline changed')
    frame.to_csv(OUT/'diagnostic_predictions.csv',index=False)
    report_artifacts(frame,ph)
    return frame

def report_artifacts(frame,probs):
    season=[]
    for group,part in [('pooled',frame),*frame.groupby('Season')]:
        season.append(dict(Season=group,N=len(part),DirectHits=int(part.DirectExact.sum()),BaselineHits=int(part.BaselineExact.sum()),
                           DirectAccuracy=float(part.DirectExact.mean()),BaselineAccuracy=float(part.BaselineExact.mean()),
                           DeltaHits=int(part.DirectExact.sum()-part.BaselineExact.sum())))
    pd.DataFrame(season).to_csv(OUT/'season_metrics.csv',index=False)
    common=['0-0','1-0','0-1','1-1','2-0','0-2','2-1','1-2','2-2','3-0','0-3','3-1','1-3','3-2','2-3']
    families=[]
    for score in common:
        actual=frame[frame.ActualScore==score]
        families.append(dict(Score=score,ActualN=len(actual),BaselineSelected=int((frame.BaselineScore==score).sum()),
                             BaselineHits=int(((frame.BaselineScore==score)&(frame.ActualScore==score)).sum()),
                             DirectSelected=int((frame.DirectScore==score).sum()),DirectHits=int(((frame.DirectScore==score)&(frame.ActualScore==score)).sum()),
                             BaselineMeanRank=float(actual.BaselineActualRank.mean()) if len(actual) else np.nan,
                             DirectMeanRank=float(actual.DirectActualRank.mean()) if len(actual) else np.nan,
                             BaselineMeanProbability=float(actual.BaselineActualGridProbability.mean()) if len(actual) else np.nan,
                             DirectMeanProbability=float(actual.DirectActualGridProbability.mean()) if len(actual) else np.nan))
    pd.DataFrame(families).to_csv(OUT/'score_family_analysis.csv',index=False)
    distribution=[]
    for score in sorted(set(common)|set(frame.ActualScore)|set(frame.BaselineScore)|set(frame.DirectScore)):
        distribution.append(dict(Score=score,ActualN=int((frame.ActualScore==score).sum()),BaselineSelected=int((frame.BaselineScore==score).sum()),
                                 DirectSelected=int((frame.DirectScore==score).sum()),DirectHits=int(((frame.DirectScore==score)&(frame.ActualScore==score)).sum())))
    pd.DataFrame(distribution).to_csv(OUT/'score_selection_distribution.csv',index=False)
    totals=[]
    for group,scorecol in [('Actual','ActualScore'),('Baseline','BaselineScore'),('Direct','DirectScore')]:
        goal_total=frame[scorecol].str.split('-').apply(lambda x:sum(map(int,x)))
        for label,mask in [('0',goal_total==0),('1',goal_total==1),('2',goal_total==2),('3',goal_total==3),('4',goal_total==4),('5',goal_total==5),('6+',goal_total>=6)]:
            totals.append(dict(Source=group,Total=label,N=int(mask.sum()),Percent=float(mask.mean()*100)))
    pd.DataFrame(totals).to_csv(OUT/'top1_total_distribution.csv',index=False)
    ranks=frame[KEYS+['Season','ActualScore','ActualTotal','BaselineActualRank','DirectActualRank','BaselineActualGridProbability','DirectActualGridProbability','BaselineTop3','DirectTop3','BaselineTop5','DirectTop5','DirectGridMass']].copy()
    ranks.to_csv(OUT/'actual_score_ranks.csv',index=False)
    group_rows=[]
    for label,mask in [('low_0-1',frame.ActualTotal<=1),('medium_2-3',(frame.ActualTotal>=2)&(frame.ActualTotal<=3)),('high_4+',frame.ActualTotal>=4)]:
        part=frame[mask]
        group_rows.append(dict(Group=label,N=len(part),BaselineExact=int(part.BaselineExact.sum()),DirectExact=int(part.DirectExact.sum()),
                               BaselineMeanRank=float(part.BaselineActualRank.mean()),DirectMeanRank=float(part.DirectActualRank.mean()),
                               BaselineMedianRank=float(part.BaselineActualRank.median()),DirectMedianRank=float(part.DirectActualRank.median()),
                               BaselineTop3=int(part.BaselineTop3.sum()),DirectTop3=int(part.DirectTop3.sum()),
                               BaselineTop5=int(part.BaselineTop5.sum()),DirectTop5=int(part.DirectTop5.sum()),
                               BaselineMeanActualProbability=float(part.BaselineActualGridProbability.mean()),
                               DirectMeanActualProbability=float(part.DirectActualGridProbability.mean())))
    pd.DataFrame(group_rows).to_csv(OUT/'goal_group_analysis.csv',index=False)
    pd.DataFrame([group_rows[-1]]).to_csv(OUT/'high_score_analysis.csv',index=False)
    flips=frame[frame.DirectScore!=frame.BaselineScore].copy()
    flips['FlipType']=np.where((flips.BaselineExact==0)&(flips.DirectExact==1),'wrong_to_correct',
                               np.where((flips.BaselineExact==1)&(flips.DirectExact==0),'correct_to_wrong','wrong_to_other_wrong'))
    flips[KEYS+['Season','ActualScore','BaselineScore','DirectScore','BaselineExact','DirectExact','FlipType','DirectActualRank','BaselineActualRank']].to_csv(OUT/'matchwise_flips.csv',index=False)
    calibration=[]; confusions=[]; sharp=[]
    for side,p in zip(('Home','Away'),probs):
        target=frame[f'Actual{side}Goals'].to_numpy()
        truth=bucket(target)
        for cls in range(NCLASSES):
            calibration.append(dict(Side=side,Class=str(cls) if cls<7 else '7+',MeanPredicted=float(p[:,cls].mean()),ActualFrequency=float((truth==cls).mean()),ActualN=int((truth==cls).sum())))
        cm=pd.crosstab(pd.Categorical(truth,categories=range(NCLASSES)),pd.Categorical(p.argmax(axis=1),categories=range(NCLASSES)),dropna=False)
        for actual in range(NCLASSES):
            for predicted in range(NCLASSES):
                confusions.append(dict(Side=side,ActualClass=str(actual) if actual<7 else '7+',PredictedClass=str(predicted) if predicted<7 else '7+',N=int(cm.iloc[actual,predicted])))
        sharp.append(dict(Side=side,MeanEntropy=float((-p*np.log(np.maximum(p,1e-15))).sum(axis=1).mean()),
                          MeanMaxProbability=float(p.max(axis=1).mean()),MulticlassLogLoss=float(log_loss(truth,p,labels=list(range(NCLASSES)))),
                          MulticlassBrier=float(np.mean(np.sum((p-np.eye(NCLASSES)[truth])**2,axis=1)))))
    cal=pd.DataFrame(calibration)
    cal[cal.Side=='Home'].to_csv(OUT/'home_goal_calibration.csv',index=False)
    cal[cal.Side=='Away'].to_csv(OUT/'away_goal_calibration.csv',index=False)
    conf=pd.DataFrame(confusions)
    conf[conf.Side=='Home'].to_csv(OUT/'home_confusion_matrix.csv',index=False)
    conf[conf.Side=='Away'].to_csv(OUT/'away_confusion_matrix.csv',index=False)
    pd.DataFrame(sharp).to_csv(OUT/'class_probability_sharpness.csv',index=False)
    in_grid=frame.DirectActualGridProbability>0
    baseline_grid=frame.BaselineActualGridProbability>0
    summary=dict(Experiment='direct_goal_distribution_v1',HistoricalWalkForward=json.loads((OUT/'selection_freeze.json').read_text())['HistoricalMetrics'],
                 DiagnosticSeasons=season,GoalGroups=group_rows,Sharpness=sharp,
                 ChangedTop1=len(flips),WrongToCorrect=int((flips.FlipType=='wrong_to_correct').sum()),
                 CorrectToWrong=int((flips.FlipType=='correct_to_wrong').sum()),
                 BaselineGridNLL=float(-np.log(frame.loc[baseline_grid,'BaselineActualGridProbability']).mean()),
                 DirectGridNLL=float(-np.log(frame.loc[in_grid,'DirectActualGridProbability']).mean()),
                 OutOfGridActual=int((~in_grid).sum()),
                 IndependentBaseline=96,FixedDCReference=99,EFixedDCReference=101,
                 Phase9DetectorIntegration=False,NoDependency=True,NoScoreBoost=True,
                 FeatureLineageCaveat='Phase-3 uses 123 legacy_v1 features; direct diagnostic uses seven corrected_v2 pre-match features. Historical matched-feature Poisson folds isolate architecture more fairly.')
    save('report.json',summary)

def secondary_summaries():
    """Post-freeze descriptive metrics; no decisions or model fitting."""
    verify()
    oof=pd.read_csv(OUT/'walk_forward_predictions.csv')
    diag=pd.read_csv(OUT/'diagnostic_predictions.csv')
    historical=[]
    for source,score,prob,rank in [('Direct','DirectScore','DirectActualGridProbability','DirectActualRank'),
                                    ('MatchedFeaturePoisson','MatchedPoissonScore','MatchedPoissonActualGridProbability','MatchedPoissonActualRank')]:
        actual=oof.ActualScore.str.split('-').apply(lambda v:tuple(map(int,v)))
        pred=oof[score].str.split('-').apply(lambda v:tuple(map(int,v)))
        result=lambda pair: 'H' if pair[0]>pair[1] else 'A' if pair[0]<pair[1] else 'D'
        ingrid=oof[prob]>0
        historical.append(dict(Source=source,N=len(oof),Exact=int((oof[score]==oof.ActualScore).sum()),
                               OutcomeCorrect=int(sum(result(a)==result(p) for a,p in zip(actual,pred))),
                               Top3=int((oof[rank]<=3).sum()),MeanActualRank=float(oof[rank].mean()),
                               GridConditionalNLL=float(-np.log(oof.loc[ingrid,prob]).mean()),
                               OutOfGrid=int((~ingrid).sum())))
    pd.DataFrame(historical).to_csv(OUT/'historical_secondary_metrics.csv',index=False)
    rows=[]
    for source,col in [('Baseline','BaselineActualRank'),('Direct','DirectActualRank')]:
        for label,part in [('all',diag),('low_0-1',diag[diag.ActualTotal<=1]),
                           ('medium_2-3',diag[(diag.ActualTotal>=2)&(diag.ActualTotal<=3)]),
                           ('high_4+',diag[diag.ActualTotal>=4])]:
            ranks=part[col]
            rows.append(dict(Source=source,Group=label,N=len(part),Top1=int((ranks==1).sum()),Top2=int((ranks<=2).sum()),
                             Top3=int((ranks<=3).sum()),Top5=int((ranks<=5).sum()),Top10=int((ranks<=10).sum()),
                             RankOver10=int((ranks>10).sum()),OutOfGrid=int((ranks==50).sum()),
                             MeanRank=float(ranks.mean()),MedianRank=float(ranks.median())))
    pd.DataFrame(rows).to_csv(OUT/'rank_summary.csv',index=False)
    return historical,rows

def main():
    counts_and_freeze(); oof=walkforward(); final_train(); test=diagnostic()
    print('OOF',oof,'diagnostic direct',int(test.DirectExact.sum()),'baseline',int(test.BaselineExact.sum()))

if __name__=='__main__':
    main()
