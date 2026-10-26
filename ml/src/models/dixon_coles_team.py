"""Team-strength Dixon-Coles (penaltyblog) with exponential time decay, refit as of a given date."""
from __future__ import annotations

from typing import Callable

import numpy as np
import pandas as pd
import penaltyblog as pb

# Selected on 2023/24 only; see data/processed/outcome_and_dixon_coles_v1/report.json.
HALF_LIFE_DAYS = 365
WINDOW_YEARS = 4
MIN_TEAM_MATCHES = 10
MAX_GOALS = 6
OUTCOME_LABELS = ("A", "D", "H")

Predictor = Callable[[str, str], tuple[float, float, np.ndarray]]


def fit(history: pd.DataFrame, before: pd.Timestamp, half_life_days: float = HALF_LIFE_DAYS) -> Predictor:
    window = history[(history.Date < before) & (history.Date >= before - pd.DateOffset(years=WINDOW_YEARS))]
    weights = pb.models.dixon_coles_weights(window.Date, xi=np.log(2) / half_life_days, base_date=before)
    model = pb.models.DixonColesGoalModel(
        window.HomeGoals.astype(int).to_numpy(), window.AwayGoals.astype(int).to_numpy(),
        window.HomeTeam.to_numpy(), window.AwayTeam.to_numpy(), weights=weights,
    )
    model.fit()
    params = model.get_params()
    counts = pd.concat([window.HomeTeam, window.AwayTeam]).value_counts()
    recent = window[window.Date >= before - pd.DateOffset(days=365)]
    strength = {
        team: params[f"attack_{team}"] - params[f"defence_{team}"]
        for team in sorted(set(recent.HomeTeam) | set(recent.AwayTeam))
        if f"attack_{team}" in params
    }
    weakest = sorted(strength, key=strength.get)[:3]
    # Promoted sides without enough recent top-flight data are rated like this window's three weakest teams.
    proxy = (
        float(np.mean([params[f"attack_{team}"] for team in weakest])),
        float(np.mean([params[f"defence_{team}"] for team in weakest])),
    )

    def team(name: str) -> tuple[float, float]:
        if counts.get(name, 0) < MIN_TEAM_MATCHES or f"attack_{name}" not in params:
            return proxy
        return params[f"attack_{name}"], params[f"defence_{name}"]

    def predict(home: str, away: str) -> tuple[float, float, np.ndarray]:
        (attack_home, defence_home), (attack_away, defence_away) = team(home), team(away)
        home_rate = float(np.exp(params["home_advantage"] + attack_home + defence_away))
        away_rate = float(np.exp(attack_away + defence_home))
        grid = pb.models.create_dixon_coles_grid(home_rate, away_rate, params["rho"], max_goals=MAX_GOALS).goal_matrix
        grid = np.clip(np.asarray(grid, dtype=float), 0.0, None)
        return home_rate, away_rate, grid / grid.sum()

    return predict


def outcome_probabilities(grid: np.ndarray) -> np.ndarray:
    return np.array([np.triu(grid, 1).sum(), np.trace(grid), np.tril(grid, -1).sum()])


def score_outcome(score: str) -> str:
    home, away = map(int, score.split("-"))
    return "H" if home > away else "A" if home < away else "D"


def ranked_scores(grid: np.ndarray) -> list[str]:
    order = np.argsort(grid.ravel(), kind="stable")[::-1]
    return [f"{index // grid.shape[1]}-{index % grid.shape[1]}" for index in order]


def headline(grid: np.ndarray) -> tuple[str, list[str]]:
    """Most probable A/D/H outcome, plus top-3 scores led by the likeliest score consistent with it."""
    outcome = OUTCOME_LABELS[int(np.argmax(outcome_probabilities(grid)))]
    ranked = ranked_scores(grid)
    lead = next(score for score in ranked if score_outcome(score) == outcome)
    return outcome, [lead] + [score for score in ranked if score != lead][:2]
