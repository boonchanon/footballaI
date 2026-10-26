"""Isolated, as-of xG augmentation of the existing XGB Poisson goal-rate model."""
from __future__ import annotations

import hashlib
import json
from collections import defaultdict, deque
from pathlib import Path

import numpy as np
import pandas as pd
from xgboost import XGBRegressor

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'data/processed/xg_history_walkforward_v1'
SOURCE = 'https://raw.githubusercontent.com/cabrown12/EPL_Prediction/main/data/epl_xg.csv'
BASE = ['HomeEloPre','AwayEloPre','EloDiffPre','HomeGoalsForAvgLast5','AwayGoalsForAvgLast5',
        'HomeGoalsAgainstAvgLast5','AwayGoalsAgainstAvgLast5']
XG = ['HomeXGForLast5','HomeXGAgainstLast5','AwayXGForLast5','AwayXGAgainstLast5']
FOLDS = [f'{y}/{str(y+1)[-2:]}' for y in range(2018,2026)]
PARAMS = dict(n_estimators=180,max_depth=4,learning_rate=.05,subsample=.9,
              colsample_bytree=.9,reg_lambda=5,tree_method='hist',random_state=42,n_jobs=4)
ALIASES = {'AFC Bournemouth':'Bournemouth','Brighton & Hove Albion':'Brighton',
           'Cardiff City':'Cardiff','Huddersfield Town':'Huddersfield','Hull City':'Hull',
           'Ipswich Town':'Ipswich','Leeds United':'Leeds','Leicester City':'Leicester',
           'Luton Town':'Luton','Manchester City':'Man City','Manchester United':'Man United',
           'Newcastle United':'Newcastle','Norwich City':'Norwich','Nottingham Forest':"Nott'm Forest",
           'Queens Park Rangers':'QPR','Stoke City':'Stoke','Swansea City':'Swansea',
           'Tottenham Hotspur':'Tottenham','West Bromwich Albion':'West Brom',
           'West Ham United':'West Ham','Wolverhampton Wanderers':'Wolves'}

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def load_source() -> pd.DataFrame:
    OUT.mkdir(parents=True,exist_ok=True)
    # The external mirror currently includes 2026/27 results. Exclude them before saving
    # or using any selection, fill, feature, model, or diagnostic calculation.
    raw = pd.read_csv(SOURCE)
    raw = raw[raw.Season.str[:4].astype(int).between(2014,2025)].copy()
    raw['Season'] = raw.Season.map(lambda s: f"{s[:4]}/{s[-2:]}")
    raw['HomeTeam'] = raw.HomeTeam.replace(ALIASES)
    raw['AwayTeam'] = raw.AwayTeam.replace(ALIASES)
    raw = raw.sort_values(['Date','HomeTeam','AwayTeam']).reset_index(drop=True)
    assert len(raw)==4560 and raw.groupby('Season').size().eq(380).all()
    assert raw.UnderstatMatchID.is_unique
    assert raw[['hXG','aXG']].notna().all().all() and (raw[['hXG','aXG']]>=0).all().all()
    raw.to_csv(OUT/'understat_match_xg_pre2026.csv',index=False)
    return raw

def align(raw: pd.DataFrame) -> pd.DataFrame:
    repo = pd.read_csv(ROOT/'data/processed/correctness_audit_v1/features_correctness_v2.csv',low_memory=False)
    repo = repo[repo.Season.str[:4].astype(int).between(2014,2025)].copy()
    assert len(repo)==4560
    # Correctness-v2's archive assigns 66 postponed 2019/20 matches to
    # 2020/21. Match by teams and date within one day, then use the source's
    # actual football season for fold chronology.
    key=['HomeTeam','AwayTeam']
    merged=repo.merge(raw,on=key,how='inner',suffixes=('','_xg'))
    merged['Date']=pd.to_datetime(merged.Date)
    merged['Date_xg']=pd.to_datetime(merged.Date_xg)
    merged=merged[(merged.Date-merged.Date_xg).dt.days.abs()<=1].copy()
    if len(merged)!=4560 or not merged.UnderstatMatchID.is_unique or not merged.MatchId.is_unique:
        raise ValueError(f'xG fixture coverage failed: matched={len(merged)}, source unique={merged.UnderstatMatchID.is_unique}, repo unique={merged.MatchId.is_unique}')
    merged['RepoSeason']=merged.Season
    merged['Season']=merged.Season_xg
    mismatch=merged[(merged.HomeGoals!=merged.hGoal)|(merged.AwayGoals!=merged.aGoal)]
    mismatch[key+['Date','Date_xg','HomeGoals','AwayGoals','hGoal','aGoal']].to_csv(OUT/'score_mismatches.csv',index=False)
    date_diff=(merged.Date-merged.Date_xg).dt.days.abs()
    pd.DataFrame({'DateDifferenceDays':date_diff}).value_counts().reset_index(name='Matches').to_csv(OUT/'date_alignment.csv',index=False)
    if len(mismatch) or date_diff.max()>1:
        raise ValueError(f'xG score/date alignment failed: score mismatches={len(mismatch)}, max date difference={date_diff.max()}')
    merged['XGAvailableDate']=merged[['Date','Date_xg']].max(axis=1)
    # The project's historical fixture date defines the fixture clock;
    # source xG enters history only after the later of the two recorded dates.
    return merged.sort_values(['Date','HomeTeam','AwayTeam']).reset_index(drop=True)

def asof_features(frame: pd.DataFrame) -> pd.DataFrame:
    hist=defaultdict(lambda: deque(maxlen=5))
    rows=[]
    awaiting=[]
    for date,part in frame.groupby('Date',sort=True):
        ready=[item for item in awaiting if item[0]<date]
        awaiting=[item for item in awaiting if item[0]>=date]
        for available,home,away,hxg,axg in ready:
            hist[home].append((available,hxg,axg))
            hist[away].append((available,axg,hxg))
        pending=[]
        for row in part.itertuples():
            h=list(hist[row.HomeTeam]); a=list(hist[row.AwayTeam])
            values=[np.mean([v[1] for v in h]) if h else np.nan,
                    np.mean([v[2] for v in h]) if h else np.nan,
                    np.mean([v[1] for v in a]) if a else np.nan,
                    np.mean([v[2] for v in a]) if a else np.nan]
            latest=max([v[0] for v in h+a],default=pd.NaT)
            assert pd.isna(latest) or latest<date
            rows.append(dict(Index=row.Index,**dict(zip(XG,values)),LatestXGSourceDate=latest,
                             HomeXGHistoryN=len(h),AwayXGHistoryN=len(a)))
            pending.append((row.XGAvailableDate,row.HomeTeam,row.AwayTeam,float(row.hXG),float(row.aXG)))
        awaiting.extend(pending)
    feat=pd.DataFrame(rows).set_index('Index').sort_index()
    assert len(feat)==len(frame)
    return pd.concat([frame,feat],axis=1)

def fit_predict(train: pd.DataFrame, valid: pd.DataFrame, cols: list[str]) -> tuple[np.ndarray,dict]:
    fills=train[cols].median(numeric_only=True).reindex(cols).fillna(0).to_dict()
    xt=train[cols].fillna(fills).astype(float)
    xv=valid[cols].fillna(fills).astype(float)
    rates=[]
    for target in ('HomeGoals','AwayGoals'):
        model=XGBRegressor(objective='count:poisson',eval_metric='poisson-nloglik',**PARAMS)
        model.fit(xt,train[target].astype(int),verbose=False)
        assert list(model.feature_names_in_)==cols
        rates.append(np.maximum(model.predict(xv),.05))
    arr=np.stack(rates,axis=1)
    assert np.isfinite(arr).all() and (arr>0).all()
    return arr,fills

def score_mode(rates: np.ndarray) -> np.ndarray:
    # Independent Poisson global mode on 0..6; all observed rates in this audit
    # are below 7, so floor(rate) is exactly the normalized-grid argmax.
    assert (rates<7).all()
    return np.floor(rates).astype(int)

def evaluation_rows(valid: pd.DataFrame, base: np.ndarray, plus: np.ndarray, fold: str) -> pd.DataFrame:
    b=score_mode(base); x=score_mode(plus)
    actual=valid[['HomeGoals','AwayGoals']].to_numpy(dtype=int)
    out=valid[['Date','Season','HomeTeam','AwayTeam','HomeGoals','AwayGoals','hXG','aXG',
               'LatestXGSourceDate','HomeXGHistoryN','AwayXGHistoryN']].copy().reset_index(drop=True)
    out['Fold']=fold
    out[['BaseLambdaHome','BaseLambdaAway']]=base
    out[['XGLambdaHome','XGLambdaAway']]=plus
    out[['BaseScoreHome','BaseScoreAway']]=b
    out[['XGScoreHome','XGScoreAway']]=x
    out['BaseExact']=(b==actual).all(axis=1)
    out['XGExact']=(x==actual).all(axis=1)
    out['ActualHigh4Plus']=actual.sum(axis=1)>=4
    out['BasePredHigh4Plus']=b.sum(axis=1)>=4
    out['XGPredHigh4Plus']=x.sum(axis=1)>=4
    return out

def summarize(pred: pd.DataFrame) -> pd.DataFrame:
    groups=[('Pooled',pred)]+[(s,pred[pred.Season==s]) for s in sorted(pred.Season.unique())]
    return pd.DataFrame([dict(Group=name,N=len(part),HighN=int(part.ActualHigh4Plus.sum()),
                              BaseExact=int(part.BaseExact.sum()),XGExact=int(part.XGExact.sum()),
                              DeltaExact=int(part.XGExact.sum()-part.BaseExact.sum()),
                              BaseHighExact=int((part.BaseExact&part.ActualHigh4Plus).sum()),
                              XGHighExact=int((part.XGExact&part.ActualHigh4Plus).sum()),
                              BasePredHigh=int(part.BasePredHigh4Plus.sum()),
                              XGPredHigh=int(part.XGPredHigh4Plus.sum())) for name,part in groups])

def main() -> None:
    raw=load_source()
    frame=asof_features(align(raw))
    frame.to_csv(OUT/'aligned_asof_features.csv',index=False)
    design=dict(Source=SOURCE,SourceAttribution='Understat via cabrown12 EPL_Prediction public mirror',
                SourceSHA256=sha(OUT/'understat_match_xg_pre2026.csv'),
                RepoSHA256=sha(ROOT/'data/processed/correctness_audit_v1/features_correctness_v2.csv'),
                BaseColumns=BASE,AdditionalXGColumns=XG,Folds=FOLDS,
                TrainStartSeason='2014/15',Hyperparameters=PARAMS,
                AsOf='all fixtures on a date scored before that date xG enters history; last five prior matches by team',
                Selection='no model, feature/window or threshold chosen from 2024/25 onward; 2026/27 excluded at import',
                PrimaryMetric='exact score Top-1 on matched walk-forward fixtures',
                Diagnostic='actual total goals >=4, separated from deployable selection')
    (OUT/'design_freeze.json').write_text(json.dumps(design,indent=2,default=str),encoding='utf-8')
    outputs=[]; fold_info=[]
    for season in FOLDS:
        year=int(season[:4])
        train=frame[frame.Season.str[:4].astype(int)<year]
        valid=frame[frame.Season==season]
        assert len(train)>=1520 and len(valid)==380 and train.Date.max()<valid.Date.min()
        base,base_fill=fit_predict(train,valid,BASE)
        plus,xg_fill=fit_predict(train,valid,BASE+XG)
        outputs.append(evaluation_rows(valid,base,plus,season))
        fold_info.append(dict(Fold=season,TrainN=len(train),TrainMaxDate=str(train.Date.max().date()),
                              ValidMinDate=str(valid.Date.min().date()),BaseFill=base_fill,XGFill=xg_fill))
    pred=pd.concat(outputs,ignore_index=True)
    pred.to_csv(OUT/'walkforward_predictions.csv',index=False)
    summary=summarize(pred)
    summary.to_csv(OUT/'walkforward_metrics.csv',index=False)
    (OUT/'training_manifest.json').write_text(json.dumps(fold_info,indent=2),encoding='utf-8')
    # Later seasons are historical diagnostics, not a source of model selection.
    pre=summary[summary.Group.isin(['2018/19','2019/20','2020/21','2021/22','2022/23','2023/24'])]
    diagnostic=summary[summary.Group.isin(['2024/25','2025/26'])]
    result=dict(PreDiagnostic=pre.to_dict('records'),Diagnostic=diagnostic.to_dict('records'),
                Pooled=summary.iloc[0].to_dict(),ForecastsFrozen=False,
                Existing2026RawSHA256=sha(ROOT/'data/processed/predictions_2026_27_latest/predictions_raw.csv'))
    (OUT/'report.json').write_text(json.dumps(result,indent=2,default=str),encoding='utf-8')
    p=pre[['N','HighN','BaseExact','XGExact','DeltaExact','BaseHighExact','XGHighExact']].sum()
    d=diagnostic[['N','HighN','BaseExact','XGExact','DeltaExact','BaseHighExact','XGHighExact']].sum()
    lines=['# Real historical xG added to XGB goal rates — walk-forward audit','',
           'xG is observed after each historical match. Only previous matches contribute to a fixture feature. The original 2026/27 predictions were untouched.','',
           '## Primary exact-score results','',
           '| Period | Matches | Matched old XGB+Poisson | Same model + prior-match xG | Delta | Actual 4+ games: old → xG |',
           '|---|---:|---:|---:|---:|---:|',
           f"| Pre-diagnostic folds 2018/19–2023/24 | {int(p.N)} | {int(p.BaseExact)} | {int(p.XGExact)} | {int(p.DeltaExact):+d} | {int(p.BaseHighExact)} → {int(p.XGHighExact)} / {int(p.HighN)} |",
           f"| Inspected 2024/25–2025/26 diagnostic | {int(d.N)} | {int(d.BaseExact)} | {int(d.XGExact)} | {int(d.DeltaExact):+d} | {int(d.BaseHighExact)} → {int(d.XGHighExact)} / {int(d.HighN)} |",'',
           'The matched baseline and xG model share seven corrected-v2 pre-match features, XGB count:poisson settings, train windows, and independent-Poisson global score selection. The added four columns are each side\'s last-five previous-match xG for and against. Training medians are computed separately per fold. No early stopping uses the validation season.','',
           'The 2024/25–2025/26 numbers are repeatedly inspected historical diagnostics and are not prospective evidence. Source xG comes from a public Understat mirror and may have been revised retrospectively; these rows are not archived pre-kickoff xG snapshots. Only the calendar date as-of ordering is verifiable.','',
           'No model was selected or altered using 2026/27 outcomes. Freeze fresh future predictions only if the pre-diagnostic and later historical evidence shows a clear, stable exact-score gain with improvement in actual 4+ games.']
    (OUT/'final_report.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    print(summary.to_string(index=False))

if __name__=='__main__':
    main()
