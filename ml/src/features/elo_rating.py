from __future__ import annotations

from dataclasses import dataclass

import pandas as pd


@dataclass
class EloConfig:
    base_rating: float = 1500.0
    k_factor: float = 20.0
    home_advantage: float = 80.0


def _result_to_score(result: str) -> tuple[float, float]:
    if result == "H":
        return 1.0, 0.0
    if result == "A":
        return 0.0, 1.0
    return 0.5, 0.5


def _expected_score(home_elo: float, away_elo: float, home_advantage: float) -> tuple[float, float]:
    expected_home = 1.0 / (1.0 + 10 ** ((away_elo - (home_elo + home_advantage)) / 400.0))
    return expected_home, 1.0 - expected_home


def add_elo_features(matches: pd.DataFrame, config: EloConfig | None = None) -> pd.DataFrame:
    config = config or EloConfig()
    df = matches.copy()

    ratings: dict[str, float] = {}
    pre_home_elo: list[float] = []
    pre_away_elo: list[float] = []
    pre_elo_diff: list[float] = []
    pre_expected_home: list[float] = []
    pre_expected_away: list[float] = []

    for row in df.itertuples(index=False):
        home_team = row.HomeTeam
        away_team = row.AwayTeam

        home_elo = ratings.get(home_team, config.base_rating)
        away_elo = ratings.get(away_team, config.base_rating)
        expected_home, expected_away = _expected_score(home_elo, away_elo, config.home_advantage)

        pre_home_elo.append(home_elo)
        pre_away_elo.append(away_elo)
        pre_elo_diff.append(home_elo - away_elo)
        pre_expected_home.append(expected_home)
        pre_expected_away.append(expected_away)

        actual_home, actual_away = _result_to_score(row.Result)
        ratings[home_team] = home_elo + config.k_factor * (actual_home - expected_home)
        ratings[away_team] = away_elo + config.k_factor * (actual_away - expected_away)

    df["HomeEloPre"] = pre_home_elo
    df["AwayEloPre"] = pre_away_elo
    df["EloDiffPre"] = pre_elo_diff
    df["HomeEloExpectedPre"] = pre_expected_home
    df["AwayEloExpectedPre"] = pre_expected_away
    df["HomeAdvantageElo"] = config.home_advantage

    return df
