"""Pre-registered, prior-day football history features for Phase 7."""
from __future__ import annotations

from collections import defaultdict
from datetime import timedelta

import numpy as np
import pandas as pd

FAMILIES={
    "elo":("HomeEloTrendLast5","AwayEloTrendLast5","EloTrendDiffLast5"),
    "venue":("HomeHomeGFLast5","HomeHomeGALast5","HomeHomePointsLast5","HomeHomeWinRateLast5",
             "AwayAwayGFLast5","AwayAwayGALast5","AwayAwayPointsLast5","AwayAwayWinRateLast5"),
    "opponent":("HomeOpponentAdjustedGFLast5","HomeOpponentAdjustedGALast5",
                "HomeOpponentAdjustedPointsLast5","AwayOpponentAdjustedGFLast5",
                "AwayOpponentAdjustedGALast5","AwayOpponentAdjustedPointsLast5"),
    "congestion":("HomeMatchesLast7Days","AwayMatchesLast7Days","MatchesLast7DaysDiff",
                  "HomeMatchesLast14Days","AwayMatchesLast14Days","MatchesLast14DaysDiff"),
}
ALL_NEW=tuple(column for family in FAMILIES.values() for column in family)
WINDOW=5
ELO_BASE=1500.0
ELO_SCALE=400.0


def _mean(entries,key):
    return float(np.mean([entry[key] for entry in entries])) if entries else np.nan


def _side(history,date,venue):
    recent=history[-WINDOW:]
    specific=[entry for entry in history if entry["venue"]==venue][-WINDOW:]
    trend=float(history[-1]["post_elo"]-recent[0]["pre_elo"]) if recent else np.nan
    adjusted_gf=_mean(recent,"adjusted_gf")
    adjusted_ga=_mean(recent,"adjusted_ga")
    adjusted_points=_mean(recent,"adjusted_points")
    last7=sum(0<(date-entry["date"]).days<=7 for entry in history)
    last14=sum(0<(date-entry["date"]).days<=14 for entry in history)
    return dict(trend=trend,venue_gf=_mean(specific,"gf"),venue_ga=_mean(specific,"ga"),
        venue_points=_mean(specific,"points"),venue_win=_mean(specific,"win"),
        adjusted_gf=adjusted_gf,adjusted_ga=adjusted_ga,adjusted_points=adjusted_points,
        last7=last7,last14=last14)


def add_expansion_features(base: pd.DataFrame, *, trace_indices: set[int]|None=None):
    """Read all fixtures on a date before updating histories from that date."""
    needed={"Date","HomeTeam","AwayTeam","HomeGoals","AwayGoals","Result",
            "HomeEloPre","AwayEloPre","HomeEloExpectedPre"}
    if not needed<=set(base.columns):
        raise ValueError("Required base history columns absent")
    dates=pd.to_datetime(base.Date).dt.normalize()
    if not dates.is_monotonic_increasing or base.duplicated(["Date","HomeTeam","AwayTeam"]).any():
        raise ValueError("Fixtures must be chronologically sorted and unique")
    histories=defaultdict(list)
    rows=[None]*len(base)
    traces={}
    config_k=20.0  # Existing frozen EloConfig; used only for past trajectory reconstruction.
    for date,indices in dates.groupby(dates,sort=True).groups.items():
        group=base.loc[list(indices)]
        for idx,row in group.iterrows():
            home=_side(histories[row.HomeTeam],date,"H")
            away=_side(histories[row.AwayTeam],date,"A")
            values=dict(HomeEloTrendLast5=home["trend"],AwayEloTrendLast5=away["trend"],
                EloTrendDiffLast5=home["trend"]-away["trend"],
                HomeHomeGFLast5=home["venue_gf"],HomeHomeGALast5=home["venue_ga"],
                HomeHomePointsLast5=home["venue_points"],HomeHomeWinRateLast5=home["venue_win"],
                AwayAwayGFLast5=away["venue_gf"],AwayAwayGALast5=away["venue_ga"],
                AwayAwayPointsLast5=away["venue_points"],AwayAwayWinRateLast5=away["venue_win"],
                HomeOpponentAdjustedGFLast5=home["adjusted_gf"],
                HomeOpponentAdjustedGALast5=home["adjusted_ga"],
                HomeOpponentAdjustedPointsLast5=home["adjusted_points"],
                AwayOpponentAdjustedGFLast5=away["adjusted_gf"],
                AwayOpponentAdjustedGALast5=away["adjusted_ga"],
                AwayOpponentAdjustedPointsLast5=away["adjusted_points"],
                HomeMatchesLast7Days=home["last7"],AwayMatchesLast7Days=away["last7"],
                MatchesLast7DaysDiff=home["last7"]-away["last7"],
                HomeMatchesLast14Days=home["last14"],AwayMatchesLast14Days=away["last14"],
                MatchesLast14DaysDiff=home["last14"]-away["last14"])
            rows[idx]=values
            if trace_indices and idx in trace_indices:
                traces[idx]=dict(fixture_date=str(date.date()),home_team=row.HomeTeam,away_team=row.AwayTeam,
                    home_prior_matches=[dict(date=str(e["date"].date()),team=e["team"],opponent=e["opponent"],
                        venue=e["venue"],opponent_pre_elo=e["opponent_pre_elo"]) for e in histories[row.HomeTeam][-5:]],
                    away_prior_matches=[dict(date=str(e["date"].date()),team=e["team"],opponent=e["opponent"],
                        venue=e["venue"],opponent_pre_elo=e["opponent_pre_elo"]) for e in histories[row.AwayTeam][-5:]],
                    home_prior_venue_matches=[str(e["date"].date()) for e in histories[row.HomeTeam] if e["venue"]=="H"][-5:],
                    away_prior_venue_matches=[str(e["date"].date()) for e in histories[row.AwayTeam] if e["venue"]=="A"][-5:])
        # All feature rows above see strictly earlier dates. Only now may same-day results update history.
        for idx,row in group.iterrows():
            if pd.isna(row.HomeGoals) or pd.isna(row.AwayGoals):
                continue
            home_score=1.0 if row.Result=="H" else .5 if row.Result=="D" else 0.0
            away_score=1-home_score
            expected_home=float(row.HomeEloExpectedPre)
            for team,opponent,venue,gf,ga,score,pre_elo,opponent_elo,expected in (
                (row.HomeTeam,row.AwayTeam,"H",float(row.HomeGoals),float(row.AwayGoals),home_score,
                 float(row.HomeEloPre),float(row.AwayEloPre),expected_home),
                (row.AwayTeam,row.HomeTeam,"A",float(row.AwayGoals),float(row.HomeGoals),away_score,
                 float(row.AwayEloPre),float(row.HomeEloPre),1-expected_home)):
                strength=(opponent_elo-ELO_BASE)/ELO_SCALE
                histories[team].append(dict(date=date,team=team,opponent=opponent,venue=venue,
                    gf=gf,ga=ga,points=3 if score==1 else 1 if score==.5 else 0,
                    win=int(score==1),pre_elo=pre_elo,post_elo=pre_elo+config_k*(score-expected),
                    opponent_pre_elo=opponent_elo,adjusted_gf=gf+strength,
                    adjusted_ga=ga-strength,adjusted_points=3*(score-expected)))
    expanded=pd.DataFrame(rows,index=base.index)
    if list(expanded.columns)!=list(ALL_NEW):
        expanded=expanded[list(ALL_NEW)]
    return expanded,traces
