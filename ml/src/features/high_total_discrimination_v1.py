"""Whole-date as-of high-total football environment features."""
from __future__ import annotations

from collections import defaultdict

import numpy as np
import pandas as pd

WINDOW=5
RECENT=("HomeRecentTotalMean5","AwayRecentTotalMean5",
        "HomeRecentHighRate5","AwayRecentHighRate5",
        "HomeRecentBTTSRate5","AwayRecentBTTSRate5",
        "HomeRecentCleanSheetRate5","AwayRecentCleanSheetRate5",
        "HomeRecentFailedScoreRate5","AwayRecentFailedScoreRate5")
VENUE=("HomeVenueTotalMean5","AwayVenueTotalMean5",
       "HomeVenueHighRate5","AwayVenueHighRate5",
       "HomeVenueBTTSRate5","AwayVenueBTTSRate5")
ALL_NEW=RECENT+VENUE


def _avg(history,key):
    return float(np.mean([match[key] for match in history[-WINDOW:]])) if history else np.nan


def add_environment_features(source: pd.DataFrame,trace_indices: set[int]|None=None):
    needed={"Date","HomeTeam","AwayTeam","HomeGoals","AwayGoals","Result"}
    if not needed<=set(source):
        raise ValueError("Historical source missing required fixture columns")
    if not source.index.equals(pd.RangeIndex(len(source))):
        raise ValueError("Historical source needs consecutive chronological index")
    dates=pd.to_datetime(source.Date).dt.normalize()
    if not dates.is_monotonic_increasing or source.duplicated(["Date","HomeTeam","AwayTeam"]).any():
        raise ValueError("Source fixtures must be chronologically sorted and unique")
    history=defaultdict(list)
    rows=[None]*len(source)
    traces={}
    for day,indices in dates.groupby(dates,sort=True).groups.items():
        matches=source.loc[list(indices)]
        for index,row in matches.iterrows():
            home=history[row.HomeTeam]
            away=history[row.AwayTeam]
            home_venue=[item for item in home if item["venue"]=="H"]
            away_venue=[item for item in away if item["venue"]=="A"]
            rows[index]=dict(HomeRecentTotalMean5=_avg(home,"total"),
                AwayRecentTotalMean5=_avg(away,"total"),
                HomeRecentHighRate5=_avg(home,"high"),AwayRecentHighRate5=_avg(away,"high"),
                HomeRecentBTTSRate5=_avg(home,"btts"),AwayRecentBTTSRate5=_avg(away,"btts"),
                HomeRecentCleanSheetRate5=_avg(home,"clean_sheet"),
                AwayRecentCleanSheetRate5=_avg(away,"clean_sheet"),
                HomeRecentFailedScoreRate5=_avg(home,"failed_score"),
                AwayRecentFailedScoreRate5=_avg(away,"failed_score"),
                HomeVenueTotalMean5=_avg(home_venue,"total"),
                AwayVenueTotalMean5=_avg(away_venue,"total"),
                HomeVenueHighRate5=_avg(home_venue,"high"),
                AwayVenueHighRate5=_avg(away_venue,"high"),
                HomeVenueBTTSRate5=_avg(home_venue,"btts"),
                AwayVenueBTTSRate5=_avg(away_venue,"btts"))
            if trace_indices and index in trace_indices:
                traces[index]=dict(FixtureDate=str(day.date()),HomeTeam=row.HomeTeam,AwayTeam=row.AwayTeam,
                    HomeRecentSources=[str(item["date"].date()) for item in home[-WINDOW:]],
                    AwayRecentSources=[str(item["date"].date()) for item in away[-WINDOW:]],
                    HomeVenueSources=[str(item["date"].date()) for item in home_venue[-WINDOW:]],
                    AwayVenueSources=[str(item["date"].date()) for item in away_venue[-WINDOW:]])
        # Today's observations enter only after all today's pre-match feature rows exist.
        for _,row in matches.iterrows():
            if pd.isna(row.HomeGoals) or pd.isna(row.AwayGoals):
                continue
            for team,venue,gf,ga in ((row.HomeTeam,"H",float(row.HomeGoals),float(row.AwayGoals)),
                                     (row.AwayTeam,"A",float(row.AwayGoals),float(row.HomeGoals))):
                history[team].append(dict(date=day,venue=venue,total=gf+ga,
                    high=int(gf+ga>=4),btts=int(gf>0 and ga>0),
                    clean_sheet=int(ga==0),failed_score=int(gf==0)))
    result=pd.DataFrame(rows,index=source.index)[list(ALL_NEW)]
    return result,traces
