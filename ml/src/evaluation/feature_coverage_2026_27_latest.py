"""Describe unknown intervening fixtures after the frozen raw export, without changing it."""
from __future__ import annotations

import json

import pandas as pd

from src.models.predict_2026_27_latest import OUT,load_fixtures,sha

def main():
    manifest=json.loads((OUT/'prediction_manifest.json').read_text())
    if sha(OUT/'predictions_raw.csv')!=manifest['PredictionsRawSHA256']:
        raise ValueError('Raw freeze changed before coverage audit')
    fixture=load_fixtures()
    audit=pd.read_csv(OUT/'fixture_audit.csv')
    raw=pd.read_csv(OUT/'predictions_raw.csv')
    creation_day=pd.Timestamp(manifest['CreatedAt']).tz_convert('Asia/Bangkok').normalize().tz_localize(None)
    future=fixture[fixture.Date>creation_day]
    rows=[]
    for item in fixture.itertuples(index=False):
        home_prior=future[(future.Date<item.Date)&((future.ModelHomeTeam==item.ModelHomeTeam)|(future.ModelAwayTeam==item.ModelHomeTeam))]
        away_prior=future[(future.Date<item.Date)&((future.ModelHomeTeam==item.ModelAwayTeam)|(future.ModelAwayTeam==item.ModelAwayTeam))]
        unknown=len(home_prior)+len(away_prior)
        rows.append(dict(FixtureID=item.FixtureID,Date=str(item.Date.date()),HomeTeam=item.HomeTeam,AwayTeam=item.AwayTeam,
                         IsFuture=item.Date>creation_day,HomeUnknownInterveningPLFixtures=len(home_prior),
                         AwayUnknownInterveningPLFixtures=len(away_prior),
                         PLHistoryCoverage='KNOWN_AS_OF_CREATION' if unknown==0 else 'INTERVENING_RESULTS_UNKNOWN',
                         Reason='future scheduled team fixtures before this date have no results yet; form/rest as of kickoff cannot be complete now' if unknown else 'all prior scheduled PL results through creation are known'))
    coverage=pd.DataFrame(rows)
    coverage.to_csv(OUT/'feature_coverage_audit.csv',index=False)
    known_future=int(((coverage.IsFuture)&(coverage.PLHistoryCoverage=='KNOWN_AS_OF_CREATION')).sum())
    unknown_future=int(((coverage.IsFuture)&(coverage.PLHistoryCoverage=='INTERVENING_RESULTS_UNKNOWN')).sum())
    (OUT/'feature_coverage_summary.json').write_text(json.dumps(dict(RawSHA256=manifest['PredictionsRawSHA256'],
        CoverageSHA256=sha(OUT/'feature_coverage_audit.csv'),CreatedLocalDay=str(creation_day.date()),
        FutureWithKnownPriorPLResults=known_future,FutureWithUnknownInterveningPLResults=unknown_future,
        MechanicalPredictions=len(raw),RawUnchanged=True,Interpretation='far-future forecasts are provisional snapshots; not feature-complete pre-kickoff forecasts'),indent=2),encoding='utf-8')
    print('coverage',known_future,unknown_future)

if __name__=='__main__':
    main()
