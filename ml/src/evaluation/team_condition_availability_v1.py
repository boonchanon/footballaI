"""Timestamped FPL availability snapshots as pre-match team-condition features."""
from __future__ import annotations

import argparse
import hashlib
import json
import lzma
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd
import requests
from scipy.stats import binomtest

from src.evaluation.xg_history_walkforward_v1 import BASE, ROOT, fit_predict

OUT=ROOT/'data/processed/team_condition_availability_v1'
SNAP=OUT/'snapshots'
TREE=OUT/'fplcache_tree.json'
SOURCE='https://github.com/Randdalf/fplcache'
RAW='https://raw.githubusercontent.com/Randdalf/fplcache/main/'
FOLDS=['2022/23','2023/24']
DIAG=['2024/25','2025/26']
TEAM_MAP={'Man Utd':'Man United','Man City':'Man City','Spurs':'Tottenham',
          "Nott'm Forest":"Nott'm Forest",'Newcastle':'Newcastle','Leicester':'Leicester',
          'Leeds':'Leeds','Wolves':'Wolves','West Ham':'West Ham','Brighton':'Brighton',
          'Bournemouth':'Bournemouth','Ipswich':'Ipswich','Sheffield Utd':'Sheffield United'}
COND=['HomeUnavailableTop15','AwayUnavailableTop15','HomeDoubtfulTop15','AwayDoubtfulTop15',
      'HomeInjuredTop15','AwayInjuredTop15','HomeSuspendedTop15','AwaySuspendedTop15',
      'HomeRiskCostShareTop15','AwayRiskCostShareTop15','HomeRiskMinutesShareTop15',
      'AwayRiskMinutesShareTop15','HomeKeyUnavailableTop11','AwayKeyUnavailableTop11',
      'UnavailableTop15Diff','DoubtfulTop15Diff','RiskCostShareDiff','RiskMinutesShareDiff']

def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def save_json(name,obj): (OUT/name).write_text(json.dumps(obj,indent=2,default=str),encoding='utf-8')

def snapshot_index():
    tree=json.loads(TREE.read_text(encoding='utf-8'))
    rows=[]
    pattern=re.compile(r'cache/(\d+)/(\d+)/(\d+)/(\d{4})\.json\.xz')
    for item in tree['tree']:
        m=pattern.fullmatch(item['path'])
        if not m: continue
        year,month,day=map(int,m.groups()[:3]); hhmm=m.group(4)
        stamp=datetime(year,month,day,int(hhmm[:2]),int(hhmm[2:]),tzinfo=timezone.utc)
        rows.append((stamp,item['path'],item.get('sha'),item.get('size')))
    idx=pd.DataFrame(rows,columns=['SnapshotUTC','Path','BlobSHA','CompressedBytes']).sort_values('SnapshotUTC')
    assert len(idx)>7000 and idx.SnapshotUTC.is_monotonic_increasing
    return idx

def kickoff_utc(date,time):
    local=pd.Timestamp(f'{date} {time}').to_pydatetime().replace(tzinfo=ZoneInfo('Europe/London'))
    return local.astimezone(timezone.utc)

def select_snapshots():
    fixtures=pd.read_csv(ROOT/'data/processed/xg_history_walkforward_v1/aligned_asof_features.csv',low_memory=False)
    fixtures=fixtures[fixtures.Season.str[:4].astype(int).between(2021,2025)].copy()
    assert len(fixtures)==1900 and fixtures.Time.notna().all()
    fixtures['KickoffUTC']=[kickoff_utc(d,t) for d,t in zip(fixtures.Date,fixtures.Time)]
    idx=snapshot_index(); times=pd.to_datetime(idx.SnapshotUTC,utc=True).astype('int64').to_numpy()
    chosen=[]
    for stamp in fixtures.KickoffUTC:
        pos=np.searchsorted(times,pd.Timestamp(stamp).value,'left')-1
        if pos<0: chosen.append((None,None,None,None)); continue
        row=idx.iloc[pos]
        age=(stamp-row.SnapshotUTC.to_pydatetime()).total_seconds()/3600
        chosen.append((row.Path,row.SnapshotUTC,row.BlobSHA,age))
    fixtures[['SnapshotPath','SnapshotUTC','SnapshotBlobSHA','SnapshotAgeHours']]=chosen
    assert fixtures.SnapshotPath.notna().all()
    assert (pd.to_datetime(fixtures.SnapshotUTC,utc=True)<pd.to_datetime(fixtures.KickoffUTC,utc=True)).all()
    fixtures.to_csv(OUT/'fixture_snapshot_selection.csv',index=False)
    return fixtures

def download():
    OUT.mkdir(parents=True,exist_ok=True); SNAP.mkdir(parents=True,exist_ok=True)
    fixtures=select_snapshots(); paths=sorted(fixtures.SnapshotPath.unique())
    def one(remote):
        local=SNAP/remote.replace('/','__')
        if local.exists() and local.stat().st_size>1000: return remote,'cached',local.stat().st_size
        response=requests.get(RAW+remote,timeout=30); response.raise_for_status()
        lzma.decompress(response.content)  # integrity/schema envelope check
        local.write_bytes(response.content)
        return remote,'downloaded',len(response.content)
    rows=[]
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures={pool.submit(one,p):p for p in paths}
        for future in as_completed(futures): rows.append(future.result())
    pd.DataFrame(rows,columns=['Path','Status','Bytes']).sort_values('Path').to_csv(OUT/'download_manifest.csv',index=False)
    print('fixtures',len(fixtures),'unique snapshots',len(paths),'downloaded',sum(r[1]=='downloaded' for r in rows))

def risk(player):
    status=player.get('status','a')
    chance=player.get('chance_of_playing_this_round')
    if chance is not None: return max(0,min(1,(100-float(chance))/100))
    return {'a':0.,'d':.5,'i':1.,'s':1.,'u':1.,'n':1.}.get(status,0.)

def snapshot_features(path):
    raw=lzma.decompress((SNAP/path.replace('/','__')).read_bytes())
    data=json.loads(raw); teams={int(t['id']):TEAM_MAP.get(t['name'],t['name']) for t in data['teams']}
    output={}
    for team_id,name in teams.items():
        players=[p for p in data['elements'] if int(p['team'])==team_id]
        ranked=sorted(players,key=lambda p:(-float(p.get('now_cost') or 0),-float(p.get('minutes') or 0),int(p['id'])))
        top15=ranked[:15]; top11=ranked[:11]
        statuses=[p.get('status','a') for p in top15]
        risks=np.array([risk(p) for p in top15],float)
        costs=np.array([float(p.get('now_cost') or 0) for p in top15],float)
        minutes=np.array([float(p.get('minutes') or 0) for p in top15],float)
        key_status=[p.get('status','a') for p in top11]
        output[name]=dict(UnavailableTop15=sum(s in {'i','s','u','n'} for s in statuses),
          DoubtfulTop15=sum(s=='d' for s in statuses),InjuredTop15=sum(s=='i' for s in statuses),
          SuspendedTop15=sum(s=='s' for s in statuses),KeyUnavailableTop11=sum(s in {'i','s','u','n'} for s in key_status),
          RiskCostShareTop15=float((risks*costs).sum()/costs.sum()) if costs.sum() else 0.,
          RiskMinutesShareTop15=float((risks*minutes).sum()/minutes.sum()) if minutes.sum() else 0.,
          SnapshotPlayers=len(players))
    return output

def build_features():
    fixtures=pd.read_csv(OUT/'fixture_snapshot_selection.csv',low_memory=False)
    cache={p:snapshot_features(p) for p in fixtures.SnapshotPath.unique()}
    rows=[]
    for row in fixtures.itertuples(index=False):
        snap=cache[row.SnapshotPath]
        if row.HomeTeam not in snap or row.AwayTeam not in snap:
            raise KeyError(f'team mapping missing: {row.Season} {row.HomeTeam} {row.AwayTeam}; available={sorted(snap)}')
        h=snap[row.HomeTeam]; a=snap[row.AwayTeam]
        values={f'Home{k}':v for k,v in h.items()}; values.update({f'Away{k}':v for k,v in a.items()})
        values.update(UnavailableTop15Diff=h['UnavailableTop15']-a['UnavailableTop15'],
          DoubtfulTop15Diff=h['DoubtfulTop15']-a['DoubtfulTop15'],
          RiskCostShareDiff=h['RiskCostShareTop15']-a['RiskCostShareTop15'],
          RiskMinutesShareDiff=h['RiskMinutesShareTop15']-a['RiskMinutesShareTop15'])
        rows.append(values)
    features=pd.DataFrame(rows)
    assert features[COND].notna().all().all() and np.isfinite(features[COND].to_numpy()).all()
    result=pd.concat([fixtures.reset_index(drop=True),features],axis=1)
    result.to_csv(OUT/'team_condition_features.csv',index=False)
    return result

def mode(rates):
    assert (rates>0).all() and (rates<7).all()
    return np.floor(rates).astype(int)

def evaluate():
    frame=build_features(); frame.Date=pd.to_datetime(frame.Date)
    feature_spec=dict(Source=SOURCE,SnapshotSelection='latest filename timestamp strictly before kickoff converted from Europe/London to UTC',
      ImportanceProxy='top 15/top 11 by FPL now_cost in that timestamped snapshot',
      Risk='FPL chance_of_playing_this_round where present; otherwise a=0,d=.5,i/s/u/n=1',
      Baseline=BASE,ConditionFeatures=COND,PrimaryMetric='Exact-score Top-1',Folds=FOLDS,Diagnostic=DIAG,
      Model='same XGB count:poisson configuration via P11 fit_predict',No2026Results=True,
      NoConfirmedLineups='FPL bootstrap snapshots contain availability flags, not confirmed starting XI')
    save_json('experiment_manifest.json',feature_spec); save_json('feature_manifest.json',dict(Features=COND))
    predictions=[]; training=[]
    for season in FOLDS:
        year=int(season[:4]); train=frame[frame.Season.str[:4].astype(int).between(2021,year-1)]
        valid=frame[frame.Season==season]
        assert len(valid)==380 and train.Date.max()<valid.Date.min()
        base,basefill=fit_predict(train,valid,BASE); cond,condfill=fit_predict(train,valid,BASE+COND)
        predictions.append(prediction_rows(valid,base,cond,season,'PreDiagnostic'))
        training.append(dict(Season=season,TrainN=len(train),TrainMaxDate=str(train.Date.max().date()),
          ValidMinDate=str(valid.Date.min().date()),BaseFill=basefill,ConditionFill=condfill))
    # Design is fixed before both inspected seasons; both use pre-2024/25 training only.
    train=frame[frame.Season.str[:4].astype(int).between(2021,2023)]
    valid=frame[frame.Season.isin(DIAG)]
    assert len(valid)==760 and train.Date.max()<valid.Date.min()
    base,basefill=fit_predict(train,valid,BASE); cond,condfill=fit_predict(train,valid,BASE+COND)
    predictions.append(prediction_rows(valid,base,cond,'Inspected760','InspectedDiagnostic'))
    training.append(dict(Season='Inspected760',TrainN=len(train),TrainMaxDate=str(train.Date.max().date()),
      ValidMinDate=str(valid.Date.min().date()),BaseFill=basefill,ConditionFill=condfill))
    pred=pd.concat(predictions,ignore_index=True)
    pred[pred.Period=='PreDiagnostic'].to_csv(OUT/'walk_forward_predictions.csv',index=False)
    pred[pred.Period=='InspectedDiagnostic'].to_csv(OUT/'diagnostic_predictions.csv',index=False)
    pd.DataFrame(training).to_json(OUT/'training_manifest.json',orient='records',indent=2)
    seasons=pd.DataFrame([summary(pred[pred.Season==s],s) for s in FOLDS+DIAG])
    seasons.to_csv(OUT/'season_metrics.csv',index=False)
    pre=pred[pred.Period=='PreDiagnostic']; diag=pred[pred.Period=='InspectedDiagnostic']
    pre_summary=summary(pre,'PreDiagnostic'); diag_summary=summary(diag,'InspectedDiagnostic')
    save_json('walk_forward_summary.json',pre_summary); save_json('diagnostic_summary.json',diag_summary)
    changed=pred[pred.BaselineScore!=pred.ConditionScore]
    changed.to_csv(OUT/'rank_flips.csv',index=False)
    scores=[]
    for period,part in [('PreDiagnostic',pre),('InspectedDiagnostic',diag)]:
        actual=part.HomeGoals.astype(str)+'-'+part.AwayGoals.astype(str)
        for score in sorted(set(actual)|set(part.BaselineScore)|set(part.ConditionScore)):
            scores.append(dict(Period=period,Score=score,Actual=int((actual==score).sum()),
              BaselineSelected=int((part.BaselineScore==score).sum()),
              ConditionSelected=int((part.ConditionScore==score).sum()),
              BaselineHits=int(((part.BaselineScore==score)&part.BaselineExact).sum()),
              ConditionHits=int(((part.ConditionScore==score)&part.ConditionExact).sum())))
    pd.DataFrame(scores).to_csv(OUT/'score_distribution.csv',index=False)
    uncertainty={}
    for label,part in [('PreDiagnostic',pre),('InspectedDiagnostic',diag)]:
        b=int((part.BaselineExact&~part.ConditionExact).sum()); c=int((~part.BaselineExact&part.ConditionExact).sum())
        uncertainty[label]=dict(BaselineOnly=b,ConditionOnly=c,Discordant=b+c,
          TwoSidedMatchedBinomialP=float(binomtest(c,b+c,.5).pvalue))
    save_json('matched_uncertainty.json',uncertainty)
    condition_summary=[]
    for season,part in frame.groupby('Season'):
        row={'Season':season,'N':len(part)}
        for col in COND: row[col+'Mean']=float(part[col].mean())
        condition_summary.append(row)
    pd.DataFrame(condition_summary).to_csv(OUT/'condition_feature_summary.csv',index=False)
    pd.DataFrame([dict(Season=s,N=len(g),MeanSnapshotAgeHours=float(g.SnapshotAgeHours.mean()),
      MedianSnapshotAgeHours=float(g.SnapshotAgeHours.median()),MaxSnapshotAgeHours=float(g.SnapshotAgeHours.max()),
      SnapshotsOver12Hours=int((g.SnapshotAgeHours>12).sum())) for s,g in frame.groupby('Season')]).to_csv(OUT/'snapshot_coverage.csv',index=False)
    qualification=pre_summary['DeltaExact']>0 and all(seasons[seasons.Group.isin(FOLDS)].DeltaExact>=0)
    save_json('decision.json',dict(PreDiagnosticQualification=bool(qualification),DeploymentApproved=False,
      FutureForecastsFrozen=False,PreRegisteredHistoricalRule='positive pooled exact and no losing pre-diagnostic season',
      DecisionReason='earlier folds improved but both repeatedly inspected later seasons regressed; gain is statistically uncertain and no prospective test exists'))
    raw=ROOT/'data/processed/predictions_2026_27_latest/predictions_raw.csv'
    protected=sha(raw)=='0afa806c8e26b9fa2a354b760128955ad40fa85b7b592bd11aa0fd3a2923f8e3'
    (OUT/'leakage_audit.md').write_text('Every FPL snapshot filename timestamp is strictly earlier than kickoff converted from Europe/London to UTC. Features use only availability, cost, minutes and status already present in that snapshot. Current match goals and appearances are excluded. Fold fills use training rows only. Both inspected seasons are evaluated only after the design is fixed, using a model trained through 2023/24. No 2026/27 result is loaded. Protected forecast unchanged: '+str(protected)+'\n',encoding='utf-8')
    report(pre_summary,diag_summary,seasons,frame,qualification,protected)
    save_json('tests_summary.json',dict(ScriptAssertions=True,ProtectedRawUnchanged=protected))
    hashes={p.name:sha(p) for p in OUT.iterdir() if p.is_file() and p.name!='artifact_hashes.json' and not p.is_dir()}
    save_json('artifact_hashes.json',hashes)
    print('Pre',pre_summary,'Diag',diag_summary,'qualify',qualification)

def prediction_rows(valid,base,cond,fold,period):
    b=mode(base); c=mode(cond); actual=valid[['HomeGoals','AwayGoals']].to_numpy(int)
    out=valid[['Date','Season','HomeTeam','AwayTeam','HomeGoals','AwayGoals','SnapshotUTC','SnapshotAgeHours']+COND].copy().reset_index(drop=True)
    out[['BaseLambdaHome','BaseLambdaAway']]=base; out[['ConditionLambdaHome','ConditionLambdaAway']]=cond
    out['BaselineScore']=[f'{h}-{a}' for h,a in b]; out['ConditionScore']=[f'{h}-{a}' for h,a in c]
    out['BaselineExact']=(b==actual).all(axis=1); out['ConditionExact']=(c==actual).all(axis=1)
    out['ActualHigh4Plus']=actual.sum(axis=1)>=4; out['Fold']=fold; out['Period']=period
    return out

def summary(part,label):
    high=part.ActualHigh4Plus
    return dict(Group=label,N=len(part),HighN=int(high.sum()),BaselineExact=int(part.BaselineExact.sum()),
      ConditionExact=int(part.ConditionExact.sum()),DeltaExact=int(part.ConditionExact.sum()-part.BaselineExact.sum()),
      BaselineHighExact=int((part.BaselineExact&high).sum()),ConditionHighExact=int((part.ConditionExact&high).sum()),
      Changed=int((part.BaselineScore!=part.ConditionScore).sum()),
      BaselineOnly=int((part.BaselineExact&~part.ConditionExact).sum()),
      ConditionOnly=int((~part.BaselineExact&part.ConditionExact).sum()))

def report(pre,diag,seasons,frame,qualification,protected):
    lines=['# Team condition availability v1 — timestamped pre-kickoff FPL snapshots','',
      '## PLAIN-LANGUAGE SUMMARY','',
      'This isolated experiment adds player availability known before kickoff: injured, suspended, unavailable and doubtful counts among each team’s 15 highest-priced FPL players, plus price/minutes-weighted risk. It does not use confirmed lineups because the archived FPL bootstrap snapshots do not contain them.','',
      f"Earlier walk-forward ({pre['N']} matches): matched baseline **{pre['BaselineExact']}**, condition model **{pre['ConditionExact']}**, delta **{pre['DeltaExact']:+d}**. Actual 4+ exact: **{pre['BaselineHighExact']} → {pre['ConditionHighExact']}/{pre['HighN']}**. Inspected 760 diagnostic: baseline **{diag['BaselineExact']}**, condition **{diag['ConditionExact']}**, delta **{diag['DeltaExact']:+d}**; 4+ exact **{diag['BaselineHighExact']} → {diag['ConditionHighExact']}/{diag['HighN']}**.",'',
      '## Exact score by season','',
      '| Season | N | Baseline | + team condition | Delta | 4+ exact baseline → condition |','|---|---:|---:|---:|---:|---:|']
    for r in seasons.to_dict('records'):
        lines.append(f"| {r['Group']} | {r['N']} | {r['BaselineExact']} | {r['ConditionExact']} | {r['DeltaExact']:+d} | {r['BaselineHighExact']} → {r['ConditionHighExact']}/{r['HighN']} |")
    lines+=['','## Provenance and decision','',
      'Snapshots come from Randdalf/fplcache, an archive of the public FPL bootstrap endpoint recorded about four times per day. For every fixture, selection uses the latest archived filename timestamp strictly before kickoff. Team/player status is therefore point-in-time rather than reconstructed from final season records. FPL status is an availability signal, not a medical diagnosis, and `now_cost` is only a fixed pre-registered importance proxy.','',
      f"The archive starts in April 2021, so clean full-season training begins in 2021/22. The primary pre-diagnostic walk-forward contains only 2022/23 and 2023/24; this shorter history is a material limitation. The 2024/25–2025/26 results are repeatedly inspected historical diagnostics and do not justify tuning.",'',
      f"Earlier historical qualification rule: **{'PASS' if qualification else 'FAIL'}**. This is not deployment approval: both inspected later seasons regressed and the matched gain is uncertain. Existing 2026/27 forecasts unchanged: **{protected}**. No 2026/27 result was loaded, no production model was changed, and no future condition challenger was frozen."]
    (OUT/'final_report.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--download',action='store_true'); args=parser.parse_args()
    download() if args.download else evaluate()

if __name__=='__main__': main()
