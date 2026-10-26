"""As-of 2026/27 export using the current frozen predictor; no model training."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime,timezone

import numpy as np
import pandas as pd

from src.models.predictor import (PROJECT_ROOT,MODEL_DIR,MATCHES_PATH,load_models,predict_match,
    _calibrate_score_matrix,_should_force_draw,_top_scores_from_matrix)
from src.models.poisson_model import score_matrix
from src.models.ml_goal_rates_v1 import sha

OUT=PROJECT_ROOT/'data/processed/predictions_2026_27_latest'
FIXTURES=PROJECT_ROOT/'data/processed/predictions_2026_2027_harddraw_v3.csv'
LOCAL_RESULTS=PROJECT_ROOT/'data/processed/actual_results_2026_2027_mw1_3.csv'
MW4=OUT/'verified_results_mw4.csv'
AMENDMENTS=OUT/'fixture_amendments.csv'
ALIASES={'Man Utd':'Man United','Spurs':'Tottenham'}
KEYS=['Date','HomeTeam','AwayTeam']
MODEL_FILES=['catboost_classifier.cbm','catboost_metadata.joblib','xgboost_classifier.json',
             'xgboost_metadata.joblib','poisson_model.joblib']
COMMON=['0-0','1-0','0-1','1-1','2-0','0-2','2-1','1-2','2-2','3-0','0-3','3-1','1-3','3-2','2-3']

def created_at():
    return datetime.now(timezone.utc).isoformat()

def save(name,obj):
    (OUT/name).write_text(json.dumps(obj,indent=2,ensure_ascii=False,default=str),encoding='utf-8')

def load_fixtures():
    source=pd.read_csv(FIXTURES,low_memory=False)
    frame=source[['fixture_date','home_team','away_team']].rename(columns={'fixture_date':'Date','home_team':'HomeTeam','away_team':'AwayTeam'}).copy()
    frame.Date=pd.to_datetime(frame.Date,errors='raise').dt.normalize()
    if len(frame)!=380 or frame.duplicated(['HomeTeam','AwayTeam']).any() or frame.duplicated(KEYS).any():
        raise ValueError('Local 2026/27 fixture lineage not unique/complete')
    frame['OriginalDate']=frame.Date.copy()
    changes=pd.read_csv(AMENDMENTS)
    for item in changes.itertuples(index=False):
        mask=frame.HomeTeam.eq(item.HomeTeam)&frame.AwayTeam.eq(item.AwayTeam)
        if mask.sum()!=1 or frame.loc[mask,'Date'].dt.strftime('%Y-%m-%d').iloc[0]!=item.OriginalDate:
            raise ValueError('Verified fixture amendment does not match source')
        frame.loc[mask,'Date']=pd.Timestamp(item.UpdatedDate)
    frame['ModelHomeTeam']=frame.HomeTeam.replace(ALIASES)
    frame['ModelAwayTeam']=frame.AwayTeam.replace(ALIASES)
    frame['FixtureID']=frame.apply(lambda row:'PL2026_27_'+hashlib.sha256((row.ModelHomeTeam+'|'+row.ModelAwayTeam).encode()).hexdigest()[:16],axis=1)
    if frame.FixtureID.duplicated().any():
        raise ValueError('Duplicate stable fixture identifier')
    frame.sort_values(['Date','ModelHomeTeam','ModelAwayTeam'],inplace=True)
    frame.reset_index(drop=True,inplace=True)
    return frame

def load_results(fixtures):
    local=pd.read_csv(LOCAL_RESULTS)
    local=local.rename(columns={'fixture_date':'Date','home_team':'HomeTeam','away_team':'AwayTeam'})
    goals=local.actual_score.str.split('-',expand=True)
    if goals.shape[1]!=2 or not goals[0].str.fullmatch(r'\d+').all() or not goals[1].str.fullmatch(r'\d+').all():
        raise ValueError('Local result score parse failure')
    local['HomeGoals']=goals[0].astype(int); local['AwayGoals']=goals[1].astype(int)
    local=local[KEYS+['HomeGoals','AwayGoals']].copy(); local['SourceURL']='local actual_results_2026_2027_mw1_3.csv'
    verified=pd.read_csv(MW4)
    result=pd.concat([local,verified],ignore_index=True)
    result.Date=pd.to_datetime(result.Date).dt.normalize()
    if len(result)!=40 or result.duplicated(KEYS).any() or (result[['HomeGoals','AwayGoals']]<0).any().any():
        raise ValueError('Known 2026/27 results must be 40 unique valid matches')
    matched=result.merge(fixtures[KEYS+['FixtureID']],on=KEYS,how='left',validate='one_to_one')
    if matched.FixtureID.isna().any():
        raise ValueError('Known result does not match 2026/27 fixture list')
    result['ModelHomeTeam']=result.HomeTeam.replace(ALIASES)
    result['ModelAwayTeam']=result.AwayTeam.replace(ALIASES)
    result['Result']=np.where(result.HomeGoals>result.AwayGoals,'H',np.where(result.HomeGoals<result.AwayGoals,'A','D'))
    return result

def history_asof(base,results,day):
    prior=results[results.Date<day]
    if not len(prior):
        return base
    supplement=pd.DataFrame(dict(Date=prior.Date.to_numpy(),Season='2026/27',Div='E0',
                                 HomeTeam=prior.ModelHomeTeam.to_numpy(),AwayTeam=prior.ModelAwayTeam.to_numpy(),
                                 HomeGoals=prior.HomeGoals.to_numpy(),AwayGoals=prior.AwayGoals.to_numpy(),
                                 Result=prior.Result.to_numpy(),SourceFile='verified 2026/27 final score; other post-match stats unavailable'))
    joined=pd.concat([base,supplement],ignore_index=True)
    joined.sort_values(['Date','HomeTeam','AwayTeam'],inplace=True)
    joined.reset_index(drop=True,inplace=True)
    if joined.Date.max()>=day or len(joined)!=len(base)+len(prior):
        raise ValueError('As-of history includes current/future result')
    return joined

def calibrated_top_matrix(result):
    lh=float(result['expected_goals']['home']); la=float(result['expected_goals']['away'])
    raw=score_matrix(np.array([lh]),np.array([la]))
    outcome=np.array([result['away_win'],result['draw'],result['home_win']],dtype=float)
    weighted=_calibrate_score_matrix(raw,outcome,lh,la)
    if _should_force_draw(outcome,lh,la):
        weighted=weighted*np.eye(weighted.shape[0])
        weighted=weighted/weighted.sum()
    if not np.isfinite(weighted).all() or (weighted<0).any() or not np.isclose(weighted.sum(),1,atol=1e-12):
        raise ValueError('Current predictor calibrated matrix invalid')
    ordered=np.argsort(-weighted.ravel(),kind='stable')
    scores=[f'{index//weighted.shape[1]}-{index%weighted.shape[1]}' for index in ordered[:3]]
    probs=[float(weighted.ravel()[index]) for index in ordered[:3]]
    if scores!=result['top_scores'][:3] or scores!=_top_scores_from_matrix(weighted)[:3] or not (probs[0]>=probs[1]>=probs[2]>=0):
        raise ValueError('Top-3/probability reconstruction differs from current predictor')
    return scores,probs

def audit_and_predict():
    if (OUT/'predictions_raw.csv').exists():
        raise FileExistsError('Raw predictions already frozen; do not regenerate')
    fixtures=load_fixtures(); results=load_results(fixtures)
    models=load_models()
    base=models.matches.copy()
    if base.Date.max()!=pd.Timestamp('2026-05-24') or len(base)!=12704:
        raise ValueError('Current frozen history source differs')
    historical_teams=set(base.HomeTeam)|set(base.AwayTeam)
    if not (set(fixtures.ModelHomeTeam)|set(fixtures.ModelAwayTeam))<=historical_teams:
        raise ValueError('Fixture team mapping lacks any genuine PL history')
    model_hashes={name:sha(MODEL_DIR/name) for name in MODEL_FILES}
    combined_hash=hashlib.sha256(json.dumps(model_hashes,sort_keys=True).encode()).hexdigest()
    code_hashes={name:sha(PROJECT_ROOT/name) for name in ('src/models/predictor.py','src/features/feature_engineering.py','src/models/poisson_model.py')}
    timestamp=created_at(); today=pd.Timestamp(datetime.now().date())
    known=set(map(tuple,results[KEYS].itertuples(index=False,name=None)))
    raw=[]; audit=[]
    for day,part in fixtures.groupby('Date',sort=True):
        models.matches=history_asof(base,results,day)
        prior_n=len(models.matches)-len(base)
        for fixture in part.itertuples(index=False):
            key=(fixture.Date,fixture.HomeTeam,fixture.AwayTeam)
            prediction_type='RETROSPECTIVE RECONSTRUCTION' if key in known else 'PRE-KICKOFF PREDICTION' if fixture.Date>today else 'PAST_DATE_RESULT_UNVERIFIED'
            record=dict(FixtureID=fixture.FixtureID,Date=fixture.Date.strftime('%Y-%m-%d'),
                        OriginalDate=fixture.OriginalDate.strftime('%Y-%m-%d'),HomeTeam=fixture.HomeTeam,AwayTeam=fixture.AwayTeam,
                        ModelHomeTeam=fixture.ModelHomeTeam,ModelAwayTeam=fixture.ModelAwayTeam,
                        Status='played_verified' if key in known else 'future_scheduled' if fixture.Date>today else 'past_unverified',
                        ResultAvailable=key in known,HistoryMatches=prior_n+len(base),RecentVerifiedHistoryMatches=prior_n,
                        PredictionType=prediction_type,ScheduleStatus='amended_verified' if fixture.Date!=fixture.OriginalDate else 'local_fixture_date_provisional',
                        PromotedHistoryCaveat=fixture.ModelHomeTeam in ('Coventry','Hull') or fixture.ModelAwayTeam in ('Coventry','Hull'))
            try:
                predicted=predict_match(models,fixture.ModelHomeTeam,fixture.ModelAwayTeam,fixture.Date)
                scores,probabilities=calibrated_top_matrix(predicted)
                if scores[0]!=predicted['model_predictions']['ensemble']['score']:
                    raise ValueError('Ensemble top1 differs from calibrated argmax')
                row=dict(FixtureID=fixture.FixtureID,Date=record['Date'],HomeTeam=fixture.HomeTeam,AwayTeam=fixture.AwayTeam,
                         PredictionType=prediction_type,PredictedHomeGoals=int(scores[0].split('-')[0]),PredictedAwayGoals=int(scores[0].split('-')[1]),
                         Top1Score=scores[0],Top1Probability=probabilities[0],Top2Score=scores[1],Top2Probability=probabilities[1],
                         Top3Score=scores[2],Top3Probability=probabilities[2],LambdaHome=float(predicted['expected_goals']['home']),
                         LambdaAway=float(predicted['expected_goals']['away']),ModelName='current predictor production ensemble',
                         ModelVersion='predictor_'+code_hashes['src/models/predictor.py'][:12],ModelHash=combined_hash,
                         FeatureVersion='legacy_v1 live fixture builder',PredictionCreatedAt=timestamp)
                raw.append(row); record['Predictable']=True; record['FailureReason']=''
            except Exception as exc:
                record['Predictable']=False; record['FailureReason']=f'{type(exc).__name__}: {exc}'
            audit.append(record)
        print('predicted date',day.date(),'cumulative',len(raw),'of',len(fixtures),flush=True)
    audit_frame=pd.DataFrame(audit)
    audit_frame.to_csv(OUT/'fixture_audit.csv',index=False)
    if not len(raw):
        raise ValueError('No fixture could be predicted')
    predictions=pd.DataFrame(raw).sort_values(['Date','HomeTeam','AwayTeam']).reset_index(drop=True)
    if predictions.FixtureID.duplicated().any() or any(col in predictions for col in ('ActualHomeGoals','ActualAwayGoals','ActualScore','ExactCorrect')):
        raise ValueError('Raw predictions have duplicates or actual-result columns')
    predictions.to_csv(OUT/'predictions_raw.csv',index=False)
    manifest=dict(CreatedAt=timestamp,ModelName='current predictor production ensemble',ModelFiles=model_hashes,
                  CombinedModelHash=combined_hash,CodeHashes=code_hashes,FeatureVersion='legacy_v1 live fixture builder; classifier numeric zero-fill, Poisson saved medians',
                  FixtureSource=str(FIXTURES.relative_to(PROJECT_ROOT)),FixtureSourceSHA256=sha(FIXTURES),
                  LocalResultsSource=str(LOCAL_RESULTS.relative_to(PROJECT_ROOT)),LocalResultsSHA256=sha(LOCAL_RESULTS),
                  VerifiedMW4SHA256=sha(MW4),FixtureAmendmentsSHA256=sha(AMENDMENTS),
                  PredictionsRawSHA256=sha(OUT/'predictions_raw.csv'),FixtureAuditSHA256=sha(OUT/'fixture_audit.csv'),
                  PredictionsN=len(predictions),FixturesFound=len(fixtures),Predictable=len(raw),NotPredictable=int((~audit_frame.Predictable).sum()),
                  PlayedVerified=int((audit_frame.Status=='played_verified').sum()),FutureScheduled=int((audit_frame.Status=='future_scheduled').sum()),
                  Retraining=False,Tuning=False,NewScoreAdjustment=False,GitCommit=None,
                  CurrentHistoryLastDate=str(base.Date.max().date()),RecentResultHistory='40 score-only completed PL fixtures, strictly prior per fixture',
                  ModelMetadataFeatureVersion='not explicitly stored; predictor build_fixture_features defaults to legacy_v1',
                  ScheduleCaveat='future local fixture dates can change; two verified amendments applied before export')
    save('prediction_manifest.json',manifest)
    return predictions,audit_frame,results

def distribution(raw):
    rows=[]
    for score in COMMON:
        rows.append(dict(Group='common_score',Value=score,N=int((raw.Top1Score==score).sum()),Percent=float((raw.Top1Score==score).mean()*100)))
    rows.append(dict(Group='common_score',Value='other',N=int((~raw.Top1Score.isin(COMMON)).sum()),Percent=float((~raw.Top1Score.isin(COMMON)).mean()*100)))
    totals=raw.Top1Score.str.split('-').apply(lambda v:sum(map(int,v)))
    for label,mask in [('0',totals==0),('1',totals==1),('2',totals==2),('3',totals==3),('4',totals==4),('5',totals==5),('6+',totals>=6)]:
        rows.append(dict(Group='top1_total',Value=label,N=int(mask.sum()),Percent=float(mask.mean()*100)))
    pd.DataFrame(rows).to_csv(OUT/'prediction_distribution.csv',index=False)
    return rows

def evaluate(results):
    manifest=json.loads((OUT/'prediction_manifest.json').read_text())
    if sha(OUT/'predictions_raw.csv')!=manifest['PredictionsRawSHA256']:
        raise ValueError('Frozen raw prediction hash differs before result join')
    raw=pd.read_csv(OUT/'predictions_raw.csv')
    matched=raw.merge(results[KEYS+['HomeGoals','AwayGoals']].assign(Date=lambda f:f.Date.dt.strftime('%Y-%m-%d')),
                      on=KEYS,how='inner',validate='one_to_one')
    if len(matched)!=manifest['PlayedVerified']:
        raise ValueError('Evaluation result count differs from frozen audit')
    matched=matched.copy()
    matched['ActualHomeGoals']=matched.pop('HomeGoals')
    matched['ActualAwayGoals']=matched.pop('AwayGoals')
    matched['ActualScore']=matched.ActualHomeGoals.astype(str)+'-'+matched.ActualAwayGoals.astype(str)
    matched['ExactCorrect']=matched.Top1Score.eq(matched.ActualScore).astype(int)
    matched.to_csv(OUT/'predictions_with_results.csv',index=False)
    save('current_evaluation.json',dict(Type='RETROSPECTIVE RECONSTRUCTION',N=len(matched),
                                         ExactHits=int(matched.ExactCorrect.sum()),ExactPercent=float(matched.ExactCorrect.mean()*100),
                                         RawPredictionSHA256=manifest['PredictionsRawSHA256'],RawFrozenBeforeResultJoin=True,
                                         Claim='reconstructed after fixtures completed; not prospective accuracy'))
    return matched

def main():
    raw,audit,results=audit_and_predict()
    distribution(raw)
    evaluation=evaluate(results)
    print(json.dumps(dict(Fixtures=len(audit),Predictions=len(raw),Played=int((audit.Status=='played_verified').sum()),
                          RetrospectiveExact=int(evaluation.ExactCorrect.sum()),RawSHA256=sha(OUT/'predictions_raw.csv'))))

if __name__=='__main__':
    main()
