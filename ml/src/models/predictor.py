from __future__ import annotations

import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from catboost import CatBoostClassifier

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.features.elo_rating import EloConfig, add_elo_features
from src.features.feature_engineering import add_match_metadata, build_long_team_history
from src.models.model_utils import CATEGORICAL_COLUMNS
from src.models.poisson_model import build_top_scores, predict_outcome_probabilities, score_matrix


DEFAULT_PREDICTION_DATE = pd.Timestamp(datetime(2026, 8, 10))
MODEL_DIR = PROJECT_ROOT / "models" / "saved_models"
MATCHES_PATH = PROJECT_ROOT / "data" / "processed" / "matches_standardized.csv"
PROMOTED_BASE_ELO = 1450.0

ROLLING_METRICS = [
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

EXPANDING_METRICS = [
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


@dataclass
class LoadedModels:
    catboost_model: CatBoostClassifier
    catboost_meta: dict
    xgboost_model: xgb.XGBClassifier
    xgboost_meta: dict
    poisson_bundle: dict
    matches: pd.DataFrame
    team_history: pd.DataFrame
    elo_ratings: dict[str, float]
    feature_version: str = "legacy_v1"


OUTCOME_LABELS = ("A", "D", "H")


def _result_to_points(result_code: str) -> float:
    return {"H": 3.0, "D": 1.0, "A": 0.0}[result_code]


def _season_from_date(date_value: pd.Timestamp) -> str:
    start_year = date_value.year if date_value.month >= 7 else date_value.year - 1
    return f"{start_year}/{(start_year + 1) % 100:02d}"


def _compute_elo_ratings(matches: pd.DataFrame) -> dict[str, float]:
    elo_df = add_elo_features(add_match_metadata(matches), EloConfig())
    ratings: dict[str, float] = {}
    config = EloConfig()
    for row in elo_df.itertuples(index=False):
        home_elo = ratings.get(row.HomeTeam, config.base_rating)
        away_elo = ratings.get(row.AwayTeam, config.base_rating)
        expected_home = 1.0 / (1.0 + 10 ** ((away_elo - (home_elo + config.home_advantage)) / 400.0))
        expected_away = 1.0 - expected_home
        if row.Result == "H":
            actual_home, actual_away = 1.0, 0.0
        elif row.Result == "A":
            actual_home, actual_away = 0.0, 1.0
        else:
            actual_home, actual_away = 0.5, 0.5
        ratings[row.HomeTeam] = home_elo + config.k_factor * (actual_home - expected_home)
        ratings[row.AwayTeam] = away_elo + config.k_factor * (actual_away - expected_away)
    return ratings


def _prepare_team_history(matches: pd.DataFrame) -> pd.DataFrame:
    base = add_match_metadata(matches)
    history = build_long_team_history(base)
    history["AwayFlag"] = 1 - history["IsHome"]
    history["Points"] = history["ResultCode"].map({"H": 3.0, "D": 1.0, "A": 0.0})
    history["WinFlag"] = (history["ResultCode"] == "H").astype(float)
    history["DrawFlag"] = (history["ResultCode"] == "D").astype(float)
    history["LossFlag"] = (history["ResultCode"] == "A").astype(float)
    history["GoalDiff"] = history["GoalsFor"] - history["GoalsAgainst"]
    return history


def _mean_or_zero(series: pd.Series) -> float:
    if series.empty:
        return 0.0
    value = float(series.mean())
    return 0.0 if np.isnan(value) else value


def _safe_ratio(numerator: float, denominator: float) -> float:
    return float(numerator / denominator) if denominator else 0.0


def _build_team_snapshot(team_history: pd.DataFrame, team: str, prediction_date: pd.Timestamp) -> dict[str, float]:
    rows = team_history[team_history["Team"] == team].sort_values(["Date", "MatchId", "IsHome"]).copy()
    if rows.empty:
        league_snapshot: dict[str, float] = {}
        league_snapshot["RestDays"] = 14.0
        league_snapshot["MatchesPlayedPre"] = 0.0
        league_snapshot["HomeMatchesPlayedPre"] = 0.0
        league_snapshot["AwayMatchesPlayedPre"] = 0.0
        for metric in EXPANDING_METRICS:
            league_snapshot[f"{metric}AvgPre"] = _mean_or_zero(team_history[metric].astype(float))
        for window in (3, 5):
            for metric in ROLLING_METRICS:
                league_snapshot[f"{metric}AvgLast{window}"] = _mean_or_zero(team_history[metric].astype(float))
        league_snapshot["HomePointsAvgPre"] = 0.0
        league_snapshot["AwayPointsAvgPre"] = 0.0
        league_snapshot["FormPointsDelta3v5"] = 0.0
        league_snapshot["AttackRatingPre"] = (
            league_snapshot["GoalsForAvgPre"] + 0.35 * league_snapshot["ShotsTargetForAvgPre"]
        )
        league_snapshot["DefenseRatingPre"] = -(
            league_snapshot["GoalsAgainstAvgPre"] + 0.25 * league_snapshot["ShotsTargetAgainstAvgPre"]
        )
        return league_snapshot

    snapshot: dict[str, float] = {}
    matches_played = float(len(rows))
    snapshot["RestDays"] = float(max((prediction_date - rows["Date"].iloc[-1]).days, 0))
    snapshot["MatchesPlayedPre"] = matches_played
    snapshot["HomeMatchesPlayedPre"] = float(rows["IsHome"].sum())
    snapshot["AwayMatchesPlayedPre"] = float(rows["AwayFlag"].sum())

    for metric in EXPANDING_METRICS:
        snapshot[f"{metric}AvgPre"] = _mean_or_zero(rows[metric].astype(float))

    snapshot["HomePointsAvgPre"] = _safe_ratio(
        float((rows["Points"] * rows["IsHome"]).sum()), snapshot["HomeMatchesPlayedPre"]
    )
    snapshot["AwayPointsAvgPre"] = _safe_ratio(
        float((rows["Points"] * rows["AwayFlag"]).sum()), snapshot["AwayMatchesPlayedPre"]
    )

    for window in (3, 5):
        tail = rows.tail(window)
        for metric in ROLLING_METRICS:
            snapshot[f"{metric}AvgLast{window}"] = _mean_or_zero(tail[metric].astype(float))

    snapshot["FormPointsDelta3v5"] = snapshot["PointsAvgLast3"] - snapshot["PointsAvgLast5"]
    snapshot["AttackRatingPre"] = snapshot["GoalsForAvgPre"] + 0.35 * snapshot["ShotsTargetForAvgPre"]
    snapshot["DefenseRatingPre"] = -(snapshot["GoalsAgainstAvgPre"] + 0.25 * snapshot["ShotsTargetAgainstAvgPre"])
    return snapshot


def _build_h2h_snapshot(matches: pd.DataFrame, home_team: str, away_team: str) -> dict[str, float]:
    pair_rows = matches[
        ((matches["HomeTeam"] == home_team) & (matches["AwayTeam"] == away_team))
        | ((matches["HomeTeam"] == away_team) & (matches["AwayTeam"] == home_team))
    ].copy()
    if pair_rows.empty:
        return {
            "H2HMatchesPre": 0.0,
            "H2HHomePointsAvgPre": 0.0,
            "H2HAwayPointsAvgPre": 0.0,
            "H2HPointsDiffPre": 0.0,
            "H2HHomePointsAvgLast3Pre": 0.0,
            "H2HAwayPointsAvgLast3Pre": 0.0,
            "H2HPointsDiffLast3Pre": 0.0,
            "H2HHomeGoalsAvgLast3Pre": 0.0,
            "H2HAwayGoalsAvgLast3Pre": 0.0,
            "H2HGoalsDiffLast3Pre": 0.0,
            "H2HLastMeetingGoalDiffPre": 0.0,
            "H2HLastMeetingTotalGoalsPre": 0.0,
            "H2HLastMeetingHomePointsPre": 0.0,
        }

    home_points = []
    away_points = []
    home_goals = []
    away_goals = []
    for row in pair_rows.itertuples(index=False):
        if row.HomeTeam == home_team:
            if row.Result == "H":
                home_points.append(3.0)
                away_points.append(0.0)
            elif row.Result == "A":
                home_points.append(0.0)
                away_points.append(3.0)
            else:
                home_points.append(1.0)
                away_points.append(1.0)
            home_goals.append(float(row.HomeGoals))
            away_goals.append(float(row.AwayGoals))
        else:
            if row.Result == "H":
                away_points.append(3.0)
                home_points.append(0.0)
            elif row.Result == "A":
                away_points.append(0.0)
                home_points.append(3.0)
            else:
                home_points.append(1.0)
                away_points.append(1.0)
            home_goals.append(float(row.AwayGoals))
            away_goals.append(float(row.HomeGoals))

    home_avg = float(np.mean(home_points)) if home_points else 0.0
    away_avg = float(np.mean(away_points)) if away_points else 0.0
    recent_slice = slice(-3, None)
    recent_home_points = home_points[recent_slice]
    recent_away_points = away_points[recent_slice]
    recent_home_goals = home_goals[recent_slice]
    recent_away_goals = away_goals[recent_slice]
    return {
        "H2HMatchesPre": float(len(pair_rows)),
        "H2HHomePointsAvgPre": home_avg,
        "H2HAwayPointsAvgPre": away_avg,
        "H2HPointsDiffPre": home_avg - away_avg,
        "H2HHomePointsAvgLast3Pre": float(np.mean(recent_home_points)) if recent_home_points else 0.0,
        "H2HAwayPointsAvgLast3Pre": float(np.mean(recent_away_points)) if recent_away_points else 0.0,
        "H2HPointsDiffLast3Pre": (
            float(np.mean(recent_home_points)) - float(np.mean(recent_away_points))
            if recent_home_points and recent_away_points
            else 0.0
        ),
        "H2HHomeGoalsAvgLast3Pre": float(np.mean(recent_home_goals)) if recent_home_goals else 0.0,
        "H2HAwayGoalsAvgLast3Pre": float(np.mean(recent_away_goals)) if recent_away_goals else 0.0,
        "H2HGoalsDiffLast3Pre": (
            float(np.mean(recent_home_goals)) - float(np.mean(recent_away_goals))
            if recent_home_goals and recent_away_goals
            else 0.0
        ),
        "H2HLastMeetingGoalDiffPre": float(home_goals[-1] - away_goals[-1]),
        "H2HLastMeetingTotalGoalsPre": float(home_goals[-1] + away_goals[-1]),
        "H2HLastMeetingHomePointsPre": float(home_points[-1]),
    }


def _build_feature_row(models: LoadedModels, home_team: str, away_team: str, prediction_date: pd.Timestamp) -> pd.DataFrame:
    from src.features.feature_engineering import build_fixture_features

    return build_fixture_features(models.matches, home_team, away_team, prediction_date, feature_version=models.feature_version)


def _fill_with_training_values(frame: pd.DataFrame, metadata: dict) -> pd.DataFrame:
    fills = metadata["imputation_values"]
    return pd.DataFrame(
        {column: pd.to_numeric(frame[column], errors="coerce").fillna(fills[column]).astype(float) for column in metadata["feature_columns"]},
        index=frame.index,
    )


def _prepare_catboost_frame(frame: pd.DataFrame, feature_columns: list[str], metadata: dict | None = None) -> pd.DataFrame:
    if metadata is not None and "imputation_values" in metadata:
        return _fill_with_training_values(frame, metadata)
    data = frame[feature_columns].copy()
    for column in feature_columns:
        if column in CATEGORICAL_COLUMNS:
            data[column] = data[column].fillna("Unknown").astype(str)
        else:
            data[column] = pd.to_numeric(data[column], errors="coerce").fillna(0.0)
    return data


def _prepare_xgboost_frame(frame: pd.DataFrame, metadata: dict) -> pd.DataFrame:
    if "imputation_values" in metadata:
        return _fill_with_training_values(frame, metadata)
    feature_columns = metadata["feature_columns"]
    data = frame[feature_columns].copy()
    category_maps = metadata["category_maps"]
    for column in feature_columns:
        if column in CATEGORICAL_COLUMNS:
            categories = category_maps[column]
            values = data[column].fillna("Unknown").astype(str)
            values = values.where(values.isin(categories), "Unknown")
            data[column] = pd.Categorical(values, categories=categories)
        else:
            data[column] = pd.to_numeric(data[column], errors="coerce").fillna(0.0)
    return data


def _prepare_poisson_frame(frame: pd.DataFrame, poisson_bundle: dict) -> pd.DataFrame:
    feature_columns = poisson_bundle["feature_columns"]
    fill_values = pd.Series(poisson_bundle["fill_values"])
    data = frame[feature_columns].apply(pd.to_numeric, errors="coerce")
    return data.fillna(fill_values).fillna(0.0)


def _argmax_outcome(probabilities: np.ndarray) -> str:
    return OUTCOME_LABELS[int(np.argmax(probabilities))]


def _select_score_for_outcome(score_probabilities: np.ndarray, outcome: str) -> str:
    matrix = score_probabilities[0]
    max_goals = matrix.shape[0] - 1
    candidates: list[tuple[float, str]] = []

    for home_goals in range(max_goals + 1):
        for away_goals in range(max_goals + 1):
            if outcome == "H" and home_goals <= away_goals:
                continue
            if outcome == "D" and home_goals != away_goals:
                continue
            if outcome == "A" and home_goals >= away_goals:
                continue
            candidates.append((float(matrix[home_goals, away_goals]), f"{home_goals}-{away_goals}"))

    if not candidates:
        return build_top_scores(score_probabilities)[0][0]
    return max(candidates, key=lambda item: item[0])[1]


def _build_outcome_masks(score_probabilities: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    matrix = score_probabilities[0]
    home_mask = np.tril(np.ones_like(matrix, dtype=float), k=-1)
    draw_mask = np.eye(matrix.shape[0], dtype=float)
    away_mask = np.triu(np.ones_like(matrix, dtype=float), k=1)
    return home_mask, draw_mask, away_mask


def _top_scores_from_matrix(matrix: np.ndarray, top_k: int = 3) -> list[str]:
    ranked = np.dstack(np.unravel_index(np.argsort(matrix.ravel())[::-1], matrix.shape))[0]
    return [f"{int(home_goals)}-{int(away_goals)}" for home_goals, away_goals in ranked[:top_k]]


def _score_to_outcome(score: str) -> str:
    home_goals, away_goals = (int(part) for part in score.split("-", maxsplit=1))
    if home_goals > away_goals:
        return "H"
    if home_goals < away_goals:
        return "A"
    return "D"


def _promote_draw_outcome(
    outcome_probabilities: np.ndarray,
    expected_home_goals: float,
    expected_away_goals: float,
) -> np.ndarray:
    adjusted = outcome_probabilities.astype(float).copy()
    total_xg = expected_home_goals + expected_away_goals
    gap = abs(expected_home_goals - expected_away_goals)
    leader = float(max(adjusted[0], adjusted[2]))
    draw_gap = leader - float(adjusted[1])

    if gap < 0.18 and total_xg < 2.9 and draw_gap <= 0.055:
        adjusted[1] += 0.075
    elif gap < 0.25 and total_xg < 2.75 and draw_gap <= 0.04:
        adjusted[1] += 0.055
    elif gap < 0.32 and total_xg < 2.45 and draw_gap <= 0.03:
        adjusted[1] += 0.04

    adjusted = np.clip(adjusted, 0.0, None)
    total = adjusted.sum()
    return adjusted / total if total > 0 else outcome_probabilities


def _should_force_draw(
    outcome_probabilities: np.ndarray,
    expected_home_goals: float,
    expected_away_goals: float,
) -> bool:
    total_xg = expected_home_goals + expected_away_goals
    gap = abs(expected_home_goals - expected_away_goals)
    draw_prob = float(outcome_probabilities[1])
    leader = float(max(outcome_probabilities[0], outcome_probabilities[2]))
    draw_gap = leader - draw_prob

    if gap < 0.18 and total_xg < 2.8 and draw_gap <= 0.04:
        return True
    if gap < 0.12 and total_xg < 3.0 and draw_gap <= 0.06:
        return True
    if expected_home_goals < 1.2 and expected_away_goals < 1.2 and gap < 0.2 and draw_gap <= 0.08:
        return True
    return False


def _calibrate_score_matrix(
    score_probabilities: np.ndarray,
    outcome_probabilities: np.ndarray,
    expected_home_goals: float,
    expected_away_goals: float,
) -> np.ndarray:
    matrix = score_probabilities[0]
    home_mask, draw_mask, away_mask = _build_outcome_masks(score_probabilities)
    total_xg = expected_home_goals + expected_away_goals
    gap = abs(expected_home_goals - expected_away_goals)

    weighted = (
        matrix * home_mask * float(outcome_probabilities[2])
        + matrix * draw_mask * float(outcome_probabilities[1])
        + matrix * away_mask * float(outcome_probabilities[0])
    )

    # Historical scoreline priors learned from our archive.
    score_priors = {
        (0, 0): 1.15,
        (1, 0): 1.04,
        (0, 1): 0.98,
        (1, 1): 1.22,
        (2, 0): 1.06,
        (0, 2): 0.90,
        (2, 1): 1.12,
        (1, 2): 1.00,
        (2, 2): 1.10,
        (3, 0): 0.98,
        (0, 3): 0.82,
        (3, 1): 1.02,
        (1, 3): 0.88,
        (3, 2): 0.94,
        (2, 3): 0.88,
        (3, 3): 0.84,
        (4, 0): 0.86,
        (0, 4): 0.72,
    }
    for (home_goals, away_goals), prior in score_priors.items():
        weighted[home_goals, away_goals] *= prior

    # Balanced, lower-event matches should surface draw scorelines more often.
    if expected_home_goals < 1.25 and expected_away_goals < 1.25 and gap < 0.22:
        weighted[0, 0] *= 1.85
        weighted[1, 1] *= 1.45
    elif total_xg < 2.4 and gap < 0.28:
        weighted[0, 0] *= 1.45
        weighted[1, 1] *= 1.28
    elif total_xg < 3.1 and gap < 0.3:
        weighted[1, 1] *= 1.18
        weighted[2, 2] *= 1.16

    # Moderate-scoring balanced matches should keep 2-1/1-2 alive.
    if 2.2 <= total_xg <= 3.4 and gap < 0.42:
        weighted[2, 1] *= 1.08
        weighted[1, 2] *= 1.07
        weighted[2, 2] *= 1.05

    # Mild favorite, modest-total games should prefer 1-0 over 2-0 only slightly.
    if total_xg < 2.8:
        weighted[1, 0] *= 0.99
        weighted[0, 1] *= 0.98
        weighted[2, 0] *= 1.01
        weighted[0, 2] *= 0.99

    # Medium-total matches should lean away from narrow 1-0/0-1 outcomes.
    if 2.6 <= total_xg <= 3.3:
        weighted[1, 0] *= 0.93
        weighted[0, 1] *= 0.93
        weighted[2, 1] *= 1.09
        weighted[1, 2] *= 1.08
        if gap < 0.24:
            weighted[2, 2] *= 1.08

    # Preserve 1-1 and 0-0 for truly balanced fixtures without forcing them.
    if gap < 0.18 and total_xg < 2.2:
        weighted[0, 0] *= 1.18
    if gap < 0.2 and 2.1 <= total_xg <= 2.9:
        weighted[1, 1] *= 1.16

    # Keep 2-0 / 0-2 alive for moderate favorite profiles.
    if 2.3 <= total_xg <= 3.2 and 0.3 <= gap <= 0.8:
        weighted[2, 0] *= 1.05
        weighted[0, 2] *= 1.04

    # Large favorite still keeps room for 2-0 / 3-0 style wins.
    if outcome_probabilities[2] > 0.58 and expected_home_goals > 1.8:
        weighted[2, 0] *= 1.1
        weighted[3, 0] *= 1.08
    if outcome_probabilities[0] > 0.58 and expected_away_goals > 1.8:
        weighted[0, 2] *= 1.1
        weighted[0, 3] *= 1.08

    total = weighted.sum()
    return weighted / total if total > 0 else matrix


def load_models(model_dir: Path = MODEL_DIR) -> LoadedModels:
    matches = pd.read_csv(MATCHES_PATH, low_memory=False)
    matches["Date"] = pd.to_datetime(matches["Date"], errors="coerce")
    matches = matches[matches["Date"].notna()].copy()
    matches.sort_values(["Date", "HomeTeam", "AwayTeam"], inplace=True)
    matches.reset_index(drop=True, inplace=True)

    catboost_model = CatBoostClassifier()
    catboost_model.load_model(model_dir / "catboost_classifier.cbm")
    catboost_meta = joblib.load(model_dir / "catboost_metadata.joblib")

    xgboost_model = xgb.XGBClassifier()
    xgboost_model.load_model(model_dir / "xgboost_classifier.json")
    xgboost_meta = joblib.load(model_dir / "xgboost_metadata.joblib")

    poisson_bundle = joblib.load(model_dir / "poisson_model.joblib")
    versions = {meta.get("feature_version", "legacy_v1") for meta in (catboost_meta, xgboost_meta, poisson_bundle)}
    if len(versions) != 1:
        raise ValueError(f"Model bundle mixes feature versions: {sorted(versions)}")
    team_history = _prepare_team_history(matches)
    elo_ratings = _compute_elo_ratings(matches)

    return LoadedModels(
        catboost_model=catboost_model,
        catboost_meta=catboost_meta,
        xgboost_model=xgboost_model,
        xgboost_meta=xgboost_meta,
        poisson_bundle=poisson_bundle,
        matches=matches,
        team_history=team_history,
        elo_ratings=elo_ratings,
        feature_version=versions.pop(),
    )


def predict_match(
    models: LoadedModels,
    home_team: str,
    away_team: str,
    prediction_date: pd.Timestamp | None = None,
) -> dict[str, object]:
    prediction_date = pd.Timestamp.now().normalize() if prediction_date is None else pd.Timestamp(prediction_date).normalize()
    frame = _build_feature_row(models, home_team, away_team, prediction_date)

    catboost_frame = _prepare_catboost_frame(frame, models.catboost_meta["feature_columns"], models.catboost_meta)
    xgboost_frame = _prepare_xgboost_frame(frame, models.xgboost_meta)
    poisson_frame = _prepare_poisson_frame(frame, models.poisson_bundle)

    catboost_prob = models.catboost_model.predict_proba(catboost_frame)[0]
    xgboost_prob = models.xgboost_model.predict_proba(xgboost_frame)[0]

    home_goals_model = models.poisson_bundle["home_goals_model"]
    away_goals_model = models.poisson_bundle["away_goals_model"]
    expected_home_goals = float(np.clip(home_goals_model.predict(poisson_frame)[0], 0.05, None))
    expected_away_goals = float(np.clip(away_goals_model.predict(poisson_frame)[0], 0.05, None))
    return combine_model_outputs(
        home_team, away_team, prediction_date, catboost_prob, xgboost_prob, expected_home_goals, expected_away_goals
    )


def combine_model_outputs(
    home_team: str,
    away_team: str,
    prediction_date: pd.Timestamp,
    catboost_prob: np.ndarray,
    xgboost_prob: np.ndarray,
    expected_home_goals: float,
    expected_away_goals: float,
    score_probs: np.ndarray | None = None,
    legacy_forced_draw: bool = True,
) -> dict[str, object]:
    if score_probs is None:
        score_probs = score_matrix(np.array([expected_home_goals]), np.array([expected_away_goals]))
    poisson_prob = predict_outcome_probabilities(score_probs)[0]

    outcome_prob = 0.5 * catboost_prob + 0.5 * xgboost_prob
    outcome_prob = outcome_prob / outcome_prob.sum()
    outcome_prob = _promote_draw_outcome(
        outcome_prob,
        expected_home_goals,
        expected_away_goals,
    )
    ensemble_prob = 0.75 * outcome_prob + 0.25 * poisson_prob
    ensemble_prob = ensemble_prob / ensemble_prob.sum()
    calibrated_matrix = _calibrate_score_matrix(
        score_probs,
        ensemble_prob,
        expected_home_goals,
        expected_away_goals,
    )
    catboost_outcome = _argmax_outcome(catboost_prob)
    xgboost_outcome = _argmax_outcome(xgboost_prob)
    poisson_outcome = _argmax_outcome(poisson_prob)

    if legacy_forced_draw:
        force_draw = _should_force_draw(ensemble_prob, expected_home_goals, expected_away_goals)
        if force_draw:
            calibrated_matrix = calibrated_matrix * np.eye(calibrated_matrix.shape[0], dtype=float)
            calibrated_matrix = calibrated_matrix / calibrated_matrix.sum()
        top_scores = _top_scores_from_matrix(calibrated_matrix)
        ensemble_score = top_scores[0]
        ensemble_outcome = "D" if force_draw else _score_to_outcome(ensemble_score)
    else:
        # The outcome is the most probable A/D/H class; the headline score must agree with it.
        ensemble_outcome = _argmax_outcome(ensemble_prob)
        ensemble_score = _select_score_for_outcome(calibrated_matrix[np.newaxis], ensemble_outcome)
        top_scores = [ensemble_score] + [score for score in _top_scores_from_matrix(calibrated_matrix, 4) if score != ensemble_score][:2]

    return {
        "home_team": home_team,
        "away_team": away_team,
        "home_win": float(ensemble_prob[2]),
        "draw": float(ensemble_prob[1]),
        "away_win": float(ensemble_prob[0]),
        "predicted_result": ensemble_outcome,
        "expected_goals": {
            "home": expected_home_goals,
            "away": expected_away_goals,
        },
        "top_scores": top_scores,
        "confidence": float(np.max(ensemble_prob)),
        "prediction_date": prediction_date.strftime("%Y-%m-%d"),
        "model_predictions": {
            "catboost": {
                "outcome": catboost_outcome,
                "score": _select_score_for_outcome(score_probs, catboost_outcome),
                "probabilities": {
                    "away_win": float(catboost_prob[0]),
                    "draw": float(catboost_prob[1]),
                    "home_win": float(catboost_prob[2]),
                },
            },
            "xgboost": {
                "outcome": xgboost_outcome,
                "score": _select_score_for_outcome(score_probs, xgboost_outcome),
                "probabilities": {
                    "away_win": float(xgboost_prob[0]),
                    "draw": float(xgboost_prob[1]),
                    "home_win": float(xgboost_prob[2]),
                },
            },
            "poisson": {
                "outcome": poisson_outcome,
                "score": _select_score_for_outcome(score_probs, poisson_outcome),
                "probabilities": {
                    "away_win": float(poisson_prob[0]),
                    "draw": float(poisson_prob[1]),
                    "home_win": float(poisson_prob[2]),
                },
            },
            "ensemble": {
                "outcome": ensemble_outcome,
                "score": ensemble_score,
                "probabilities": {
                    "away_win": float(ensemble_prob[0]),
                    "draw": float(ensemble_prob[1]),
                    "home_win": float(ensemble_prob[2]),
                },
            },
        },
    }
