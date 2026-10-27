from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.features.elo_rating import EloConfig, add_elo_features


ROLLING_WINDOWS = (3, 5)
FEATURE_OUTPUT = "data/processed/features_matches.csv"


def convert_odds_to_probability(
    home_odds: pd.Series, draw_odds: pd.Series, away_odds: pd.Series
) -> pd.DataFrame:
    implied = pd.DataFrame(
        {
            "market_home_prob": 1.0 / pd.to_numeric(home_odds, errors="coerce"),
            "market_draw_prob": 1.0 / pd.to_numeric(draw_odds, errors="coerce"),
            "market_away_prob": 1.0 / pd.to_numeric(away_odds, errors="coerce"),
        }
    )
    sums = implied.sum(axis=1)
    valid_rows = sums.notna() & (sums > 0)
    implied.loc[valid_rows] = implied.loc[valid_rows].div(sums.loc[valid_rows], axis=0)
    implied.loc[~valid_rows, :] = np.nan
    return implied


def add_market_features(df: pd.DataFrame) -> pd.DataFrame:
    enriched = df.copy()
    market_columns = ["market_home_prob", "market_draw_prob", "market_away_prob"]
    market_probs = enriched[market_columns]
    sorted_probs = np.sort(market_probs.to_numpy(dtype=float), axis=1)
    enriched["market_favorite_prob"] = market_probs.max(axis=1)
    enriched["market_confidence"] = sorted_probs[:, 2] - sorted_probs[:, 1]
    enriched["market_prob_difference"] = enriched["market_home_prob"] - enriched["market_away_prob"]
    missing_market = market_probs.isna().any(axis=1)
    enriched.loc[missing_market, ["market_favorite_prob", "market_confidence", "market_prob_difference"]] = np.nan
    return enriched


def load_matches(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    df = df[df["Date"].notna()].copy()
    df.sort_values(["Date", "HomeTeam", "AwayTeam"], inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df


def add_match_metadata(df: pd.DataFrame) -> pd.DataFrame:
    enriched = df.copy()
    enriched["MatchId"] = np.arange(len(enriched))
    enriched["SeasonYearStart"] = enriched["Season"].str.slice(0, 4).astype(int)
    enriched["IsWeekend"] = enriched["Date"].dt.dayofweek.isin([5, 6]).astype(int)
    enriched["Month"] = enriched["Date"].dt.month
    enriched["DayOfWeek"] = enriched["Date"].dt.dayofweek
    enriched["HomeWin"] = (enriched["Result"] == "H").astype(int)
    enriched["Draw"] = (enriched["Result"] == "D").astype(int)
    enriched["AwayWin"] = (enriched["Result"] == "A").astype(int)
    enriched["Target"] = enriched["Result"].map({"A": 0, "D": 1, "H": 2}).astype(int)
    market_probabilities = convert_odds_to_probability(
        enriched.get("B365H", pd.Series(index=enriched.index, dtype=float)),
        enriched.get("B365D", pd.Series(index=enriched.index, dtype=float)),
        enriched.get("B365A", pd.Series(index=enriched.index, dtype=float)),
    )
    enriched = pd.concat([enriched, market_probabilities], axis=1)
    enriched = add_market_features(enriched)
    return enriched


def build_long_team_history(df: pd.DataFrame) -> pd.DataFrame:
    home = pd.DataFrame(
        {
            "MatchId": df["MatchId"],
            "Date": df["Date"],
            "Season": df["Season"],
            "Team": df["HomeTeam"],
            "Opponent": df["AwayTeam"],
            "IsHome": 1,
            "GoalsFor": df["HomeGoals"],
            "GoalsAgainst": df["AwayGoals"],
            "ShotsFor": df["HomeShots"],
            "ShotsAgainst": df["AwayShots"],
            "ShotsTargetFor": df["HomeShotsTarget"],
            "ShotsTargetAgainst": df["AwayShotsTarget"],
            "CornersFor": df["HomeCorners"],
            "CornersAgainst": df["AwayCorners"],
            "YellowFor": df["HomeYellow"],
            "YellowAgainst": df["AwayYellow"],
            "RedFor": df["HomeRed"],
            "RedAgainst": df["AwayRed"],
            "FoulsFor": df["HomeFouls"],
            "FoulsAgainst": df["AwayFouls"],
            "ResultCode": df["Result"],
        }
    )
    away = pd.DataFrame(
        {
            "MatchId": df["MatchId"],
            "Date": df["Date"],
            "Season": df["Season"],
            "Team": df["AwayTeam"],
            "Opponent": df["HomeTeam"],
            "IsHome": 0,
            "GoalsFor": df["AwayGoals"],
            "GoalsAgainst": df["HomeGoals"],
            "ShotsFor": df["AwayShots"],
            "ShotsAgainst": df["HomeShots"],
            "ShotsTargetFor": df["AwayShotsTarget"],
            "ShotsTargetAgainst": df["HomeShotsTarget"],
            "CornersFor": df["AwayCorners"],
            "CornersAgainst": df["HomeCorners"],
            "YellowFor": df["AwayYellow"],
            "YellowAgainst": df["HomeYellow"],
            "RedFor": df["AwayRed"],
            "RedAgainst": df["HomeRed"],
            "FoulsFor": df["AwayFouls"],
            "FoulsAgainst": df["HomeFouls"],
            "ResultCode": df["Result"].map({"H": "A", "D": "D", "A": "H"}),
        }
    )
    history = pd.concat([home, away], ignore_index=True)
    history.sort_values(["Team", "Date", "MatchId", "IsHome"], inplace=True)
    history.reset_index(drop=True, inplace=True)
    history["Points"] = history["ResultCode"].map({"H": 3, "D": 1, "A": 0}).astype(float)
    history["WinFlag"] = (history["ResultCode"] == "H").astype(float)
    history["DrawFlag"] = (history["ResultCode"] == "D").astype(float)
    history["LossFlag"] = (history["ResultCode"] == "A").astype(float)
    history["GoalDiff"] = history["GoalsFor"] - history["GoalsAgainst"]
    return history


def _safe_divide(numerator: pd.Series, denominator: pd.Series) -> pd.Series:
    result = numerator / denominator.replace(0, np.nan)
    return result.fillna(0.0)


def add_team_rolling_features(team_history: pd.DataFrame) -> pd.DataFrame:
    history = team_history.copy()
    group = history.groupby("Team", sort=False)

    history["MatchesPlayedPre"] = group.cumcount()
    history["RestDays"] = group["Date"].diff().dt.days
    history["RestDays"] = history["RestDays"].fillna(7).clip(lower=0)
    history["AwayFlag"] = 1 - history["IsHome"]

    expanding_metrics = [
        "GoalsFor",
        "GoalsAgainst",
        "ShotsFor",
        "ShotsAgainst",
        "ShotsTargetFor",
        "ShotsTargetAgainst",
        "CornersFor",
        "CornersAgainst",
        "FoulsFor",
        "FoulsAgainst",
        "YellowFor",
        "YellowAgainst",
        "RedFor",
        "RedAgainst",
        "Points",
        "WinFlag",
        "DrawFlag",
        "LossFlag",
        "GoalDiff",
    ]
    for metric in expanding_metrics:
        history[f"{metric}CumSumPre"] = group[metric].cumsum() - history[metric]
        history[f"{metric}AvgPre"] = _safe_divide(
            history[f"{metric}CumSumPre"], history["MatchesPlayedPre"]
        )

    history["HomePointsOnly"] = history["Points"] * history["IsHome"]
    history["AwayPointsOnly"] = history["Points"] * history["AwayFlag"]
    history["HomeMatchesPlayedPre"] = group["IsHome"].cumsum() - history["IsHome"]
    history["AwayMatchesPlayedPre"] = group["AwayFlag"].cumsum() - history["AwayFlag"]
    history["HomePointsCumSumPre"] = group["HomePointsOnly"].cumsum() - history["HomePointsOnly"]
    history["AwayPointsCumSumPre"] = group["AwayPointsOnly"].cumsum() - history["AwayPointsOnly"]
    history["HomePointsAvgPre"] = _safe_divide(
        history["HomePointsCumSumPre"], history["HomeMatchesPlayedPre"]
    )
    history["AwayPointsAvgPre"] = _safe_divide(
        history["AwayPointsCumSumPre"], history["AwayMatchesPlayedPre"]
    )

    rolling_metrics = [
        "Points",
        "GoalsFor",
        "GoalsAgainst",
        "GoalDiff",
        "ShotsFor",
        "ShotsAgainst",
        "ShotsTargetFor",
        "ShotsTargetAgainst",
        "CornersFor",
        "CornersAgainst",
        "FoulsFor",
        "FoulsAgainst",
        "YellowFor",
        "YellowAgainst",
        "RedFor",
        "RedAgainst",
        "WinFlag",
        "DrawFlag",
        "LossFlag",
    ]
    for window in ROLLING_WINDOWS:
        shifted = group[rolling_metrics].shift(1)
        rolling = shifted.groupby(history["Team"], sort=False).rolling(window, min_periods=1)
        rolling_mean = rolling.mean().reset_index(level=0, drop=True)
        for metric in rolling_metrics:
            history[f"{metric}AvgLast{window}"] = rolling_mean[metric]

    history["FormPointsDelta3v5"] = history["PointsAvgLast3"] - history["PointsAvgLast5"]
    history["AttackRatingPre"] = history["GoalsForAvgPre"] + 0.35 * history["ShotsTargetForAvgPre"]
    history["DefenseRatingPre"] = -(history["GoalsAgainstAvgPre"] + 0.25 * history["ShotsTargetAgainstAvgPre"])
    return history


def build_head_to_head_features(df: pd.DataFrame, *, feature_version: str = "legacy_v1") -> pd.DataFrame:
    history: dict[tuple[str, str], list[tuple[float, float, float, float]]] = {}
    home_points_pre: list[float] = []
    away_points_pre: list[float] = []
    matches_pre: list[int] = []
    home_points_last3_pre: list[float] = []
    away_points_last3_pre: list[float] = []
    home_goals_last3_pre: list[float] = []
    away_goals_last3_pre: list[float] = []
    last_meeting_goal_diff_pre: list[float] = []
    last_meeting_total_goals_pre: list[float] = []
    last_meeting_home_points_pre: list[float] = []

    for row in df.itertuples(index=False):
        key = tuple(sorted((row.HomeTeam, row.AwayTeam)))
        previous_results = history.get(key, [])
        if feature_version == "correctness_v2" and row.HomeTeam != key[0]:
            previous_results = [(away_pts, home_pts, away_goals, home_goals)
                                for home_pts, away_pts, home_goals, away_goals in previous_results]
        matches_pre.append(len(previous_results))
        if previous_results:
            home_points = [entry[0] for entry in previous_results]
            away_points = [entry[1] for entry in previous_results]
            home_goals = [entry[2] for entry in previous_results]
            away_goals = [entry[3] for entry in previous_results]
            recent = previous_results[-3:]

            home_points_pre.append(float(np.mean(home_points)))
            away_points_pre.append(float(np.mean(away_points)))
            home_points_last3_pre.append(float(np.mean([entry[0] for entry in recent])))
            away_points_last3_pre.append(float(np.mean([entry[1] for entry in recent])))
            home_goals_last3_pre.append(float(np.mean([entry[2] for entry in recent])))
            away_goals_last3_pre.append(float(np.mean([entry[3] for entry in recent])))
            last_entry = previous_results[-1]
            last_meeting_goal_diff_pre.append(float(last_entry[2] - last_entry[3]))
            last_meeting_total_goals_pre.append(float(last_entry[2] + last_entry[3]))
            last_meeting_home_points_pre.append(float(last_entry[0]))
        else:
            home_points_pre.append(0.0)
            away_points_pre.append(0.0)
            home_points_last3_pre.append(0.0)
            away_points_last3_pre.append(0.0)
            home_goals_last3_pre.append(0.0)
            away_goals_last3_pre.append(0.0)
            last_meeting_goal_diff_pre.append(0.0)
            last_meeting_total_goals_pre.append(0.0)
            last_meeting_home_points_pre.append(0.0)

        if row.Result == "H":
            outcome = (3.0, 0.0, float(row.HomeGoals), float(row.AwayGoals))
        elif row.Result == "A":
            outcome = (0.0, 3.0, float(row.HomeGoals), float(row.AwayGoals))
        else:
            outcome = (1.0, 1.0, float(row.HomeGoals), float(row.AwayGoals))

        if key[0] == row.HomeTeam:
            history.setdefault(key, []).append(outcome)
        else:
            history.setdefault(key, []).append((outcome[1], outcome[0], outcome[3], outcome[2]))

    enriched = df.copy()
    enriched["H2HMatchesPre"] = matches_pre
    enriched["H2HHomePointsAvgPre"] = home_points_pre
    enriched["H2HAwayPointsAvgPre"] = away_points_pre
    enriched["H2HPointsDiffPre"] = enriched["H2HHomePointsAvgPre"] - enriched["H2HAwayPointsAvgPre"]
    enriched["H2HHomePointsAvgLast3Pre"] = home_points_last3_pre
    enriched["H2HAwayPointsAvgLast3Pre"] = away_points_last3_pre
    enriched["H2HPointsDiffLast3Pre"] = enriched["H2HHomePointsAvgLast3Pre"] - enriched["H2HAwayPointsAvgLast3Pre"]
    enriched["H2HHomeGoalsAvgLast3Pre"] = home_goals_last3_pre
    enriched["H2HAwayGoalsAvgLast3Pre"] = away_goals_last3_pre
    enriched["H2HGoalsDiffLast3Pre"] = enriched["H2HHomeGoalsAvgLast3Pre"] - enriched["H2HAwayGoalsAvgLast3Pre"]
    enriched["H2HLastMeetingGoalDiffPre"] = last_meeting_goal_diff_pre
    enriched["H2HLastMeetingTotalGoalsPre"] = last_meeting_total_goals_pre
    enriched["H2HLastMeetingHomePointsPre"] = last_meeting_home_points_pre
    return enriched


def merge_team_features(matches: pd.DataFrame, team_features: pd.DataFrame) -> pd.DataFrame:
    selected_columns = [
        "MatchId",
        "Team",
        "RestDays",
        "MatchesPlayedPre",
        "HomeMatchesPlayedPre",
        "AwayMatchesPlayedPre",
        "GoalsForAvgPre",
        "GoalsAgainstAvgPre",
        "ShotsForAvgPre",
        "ShotsAgainstAvgPre",
        "ShotsTargetForAvgPre",
        "ShotsTargetAgainstAvgPre",
        "CornersForAvgPre",
        "CornersAgainstAvgPre",
        "FoulsForAvgPre",
        "FoulsAgainstAvgPre",
        "YellowForAvgPre",
        "YellowAgainstAvgPre",
        "RedForAvgPre",
        "RedAgainstAvgPre",
        "PointsAvgPre",
        "WinFlagAvgPre",
        "DrawFlagAvgPre",
        "LossFlagAvgPre",
        "GoalDiffAvgPre",
        "HomePointsAvgPre",
        "AwayPointsAvgPre",
        "PointsAvgLast3",
        "GoalsForAvgLast3",
        "GoalsAgainstAvgLast3",
        "ShotsForAvgLast3",
        "ShotsTargetForAvgLast3",
        "WinFlagAvgLast3",
        "DrawFlagAvgLast3",
        "LossFlagAvgLast3",
        "PointsAvgLast5",
        "GoalsForAvgLast5",
        "GoalsAgainstAvgLast5",
        "ShotsForAvgLast5",
        "ShotsTargetForAvgLast5",
        "WinFlagAvgLast5",
        "DrawFlagAvgLast5",
        "LossFlagAvgLast5",
        "FormPointsDelta3v5",
        "AttackRatingPre",
        "DefenseRatingPre",
    ]
    features = team_features[selected_columns]

    home_features = features.rename(
        columns={column: f"Home{column}" for column in selected_columns if column not in ("MatchId", "Team")}
    ).rename(columns={"Team": "HomeTeam"})
    away_features = features.rename(
        columns={column: f"Away{column}" for column in selected_columns if column not in ("MatchId", "Team")}
    ).rename(columns={"Team": "AwayTeam"})

    merged = matches.merge(home_features, on=["MatchId", "HomeTeam"], how="left")
    merged = merged.merge(away_features, on=["MatchId", "AwayTeam"], how="left")
    return merged


def add_difference_features(df: pd.DataFrame, *, feature_version: str = "legacy_v1") -> pd.DataFrame:
    enriched = df.copy()
    diff_pairs = [
        ("RestDays", "RestDaysDiff"),
        ("MatchesPlayedPre", "MatchesPlayedDiff"),
        ("GoalsForAvgPre", "GoalsForAvgDiff"),
        ("GoalsAgainstAvgPre", "GoalsAgainstAvgDiff"),
        ("ShotsForAvgPre", "ShotsForAvgDiff"),
        ("ShotsTargetForAvgPre", "ShotsTargetForAvgDiff"),
        ("PointsAvgPre", "PointsAvgDiff"),
        ("PointsAvgLast3", "PointsLast3Diff"),
        ("PointsAvgLast5", "PointsLast5Diff"),
        ("AttackRatingPre", "AttackRatingDiff"),
        ("DefenseRatingPre", "DefenseRatingDiff"),
        ("HomePointsAvgPre", "HomeVsAwayPointsContextDiff"),
    ]
    for base_name, diff_name in diff_pairs:
        enriched[diff_name] = enriched[f"Home{base_name}"] - enriched[f"Away{base_name}"]
    if feature_version == "correctness_v2":
        # Current home team's home form versus current away team's away form.
        enriched["HomeVsAwayPointsContextDiff"] = enriched["HomeHomePointsAvgPre"] - enriched["AwayAwayPointsAvgPre"]
    return enriched


def generate_features(matches: pd.DataFrame, *, feature_version: str = "legacy_v1") -> pd.DataFrame:
    if feature_version not in {"legacy_v1", "correctness_v2"}:
        raise ValueError(f"Unsupported feature version: {feature_version}")
    matches = matches.copy()
    matches["Date"] = pd.to_datetime(matches["Date"], errors="raise").dt.normalize()
    matches.sort_values(["Date", "HomeTeam", "AwayTeam"], inplace=True)
    matches.reset_index(drop=True, inplace=True)
    appearances = pd.concat([
        matches[["Date", "HomeTeam"]].rename(columns={"HomeTeam": "Team"}),
        matches[["Date", "AwayTeam"]].rename(columns={"AwayTeam": "Team"}),
    ])
    if appearances.duplicated(["Date", "Team"]).any():
        raise ValueError("A team appears more than once on the same date; resolve duplicate matches before generating features.")
    base = add_match_metadata(matches)
    base = add_elo_features(base, EloConfig())
    team_history = build_long_team_history(base)
    team_history = add_team_rolling_features(team_history)
    enriched = merge_team_features(base, team_history)
    enriched = build_head_to_head_features(enriched, feature_version=feature_version)
    enriched = add_difference_features(enriched, feature_version=feature_version)
    enriched.sort_values(["Date", "HomeTeam", "AwayTeam"], inplace=True)
    enriched.reset_index(drop=True, inplace=True)
    return enriched


def build_fixture_features(matches: pd.DataFrame, home_team: str, away_team: str,
                           prediction_date: pd.Timestamp, *, feature_version: str = "legacy_v1") -> pd.DataFrame:
    """Use the training feature builder with only completed prior-day matches.

    The synthetic row's result/statistics are placeholders, never model inputs.
    No market odds are supplied; their existing missing-value policy is retained.
    """
    fixtures = pd.DataFrame([{"HomeTeam": home_team, "AwayTeam": away_team}])
    return build_fixtures_for_date(matches, fixtures, prediction_date, feature_version=feature_version)


def build_fixtures_for_date(matches: pd.DataFrame, fixtures: pd.DataFrame,
                            prediction_date: pd.Timestamp, *, feature_version: str = "legacy_v1") -> pd.DataFrame:
    """Build a day's fixtures together using the same logic as single-match inference."""
    teams = fixtures[["HomeTeam", "AwayTeam"]]
    if teams.isna().any().any() or teams.eq("").any().any() or teams.HomeTeam.eq(teams.AwayTeam).any():
        raise ValueError("Provide two different non-empty team names.")
    day = pd.Timestamp(prediction_date).normalize()
    if pd.isna(day):
        raise ValueError("prediction_date must be a valid date.")
    history = matches.copy()
    history["Date"] = pd.to_datetime(history["Date"], errors="coerce").dt.normalize()
    history = history[(history["Date"] < day) & history["Result"].isin(["H", "D", "A"])
                      & history["HomeGoals"].notna() & history["AwayGoals"].notna()].copy()
    year = day.year if day.month >= 7 else day.year - 1
    fixture = {column: np.nan for column in history.columns}
    fixture.update(Date=day, Season=f"{year}/{(year+1)%100:02d}", Div="E0",
                   Result="D")
    for column in ("HomeGoals", "AwayGoals", "HomeShots", "AwayShots", "HomeShotsTarget",
                   "AwayShotsTarget", "HomeCorners", "AwayCorners", "HomeYellow", "AwayYellow",
                   "HomeRed", "AwayRed", "HomeFouls", "AwayFouls"):
        fixture[column] = 0.0
    fixture_rows = [dict(fixture, HomeTeam=r.HomeTeam, AwayTeam=r.AwayTeam) for r in teams.itertuples(index=False)]
    combined = pd.concat([history, pd.DataFrame(fixture_rows)], ignore_index=True)
    result = generate_features(combined, feature_version=feature_version)
    return result[result["Date"].eq(day)].reset_index(drop=True)


def write_features(df: pd.DataFrame, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate leakage-safe match features from the standardized match dataset."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("data/processed/matches_standardized.csv"),
        help="Input standardized dataset path.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(FEATURE_OUTPUT),
        help="Output feature dataset path.",
    )
    args = parser.parse_args()

    matches = load_matches(args.input)
    features = generate_features(matches)
    write_features(features, args.output)

    print(f"Generated {len(features)} rows with {len(features.columns)} columns.")
    print(f"Output: {args.output}")


if __name__ == "__main__":
    main()
