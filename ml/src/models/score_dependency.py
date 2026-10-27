"""Independent, Dixon-Coles and bivariate-Poisson score distributions."""
from __future__ import annotations

import numpy as np
from scipy.stats import poisson

GRID_MAX = 6


def validate_rates(home: float, away: float):
    if not np.isfinite(home) or not np.isfinite(away) or home <= 0 or away <= 0:
        raise ValueError("Both marginal goal rates must be finite and positive")


def normalize(matrix: np.ndarray) -> np.ndarray:
    if not np.isfinite(matrix).all() or (matrix < 0).any() or matrix.sum() <= 0:
        raise ValueError("Invalid score probabilities")
    result = matrix / matrix.sum()
    if not np.isclose(result.sum(), 1, atol=1e-12):
        raise ValueError("Score matrix did not normalize")
    return result


def independent_matrix(home: float, away: float, max_goals: int = GRID_MAX) -> np.ndarray:
    validate_rates(home, away)
    goals = np.arange(max_goals + 1)
    return normalize(np.outer(poisson.pmf(goals, home), poisson.pmf(goals, away)))


def dc_tau(home: float, away: float, rho: float) -> np.ndarray:
    validate_rates(home, away)
    if not np.isfinite(rho):
        raise ValueError("Invalid rho")
    # Standard Dixon-Coles correction in (00, 01, 10, 11) order.
    return np.array([1-home*away*rho, 1+home*rho, 1+away*rho, 1-rho], dtype=float)


def dixon_coles_matrix(home: float, away: float, rho: float, max_goals: int = GRID_MAX) -> np.ndarray:
    tau = dc_tau(home, away, rho)
    if (tau <= 0).any():
        raise ValueError("Rho gives negative low-score probability")
    goals = np.arange(max_goals + 1)
    matrix = np.outer(poisson.pmf(goals, home), poisson.pmf(goals, away))
    for cell, factor in zip(((0,0),(0,1),(1,0),(1,1)), tau):
        matrix[cell] *= factor
    return normalize(matrix)


def dc_actual_probability(home: float, away: float, actual_home: int, actual_away: int, rho: float) -> float:
    tau = dc_tau(home, away, rho)
    if (tau <= 0).any():
        raise ValueError("Invalid rho for goal rates")
    factor = { (0,0):tau[0], (0,1):tau[1], (1,0):tau[2], (1,1):tau[3] }.get((actual_home,actual_away), 1.0)
    return float(poisson.pmf(actual_home, home)*poisson.pmf(actual_away, away)*factor)


def shared_components(home: float, away: float, shared_fraction: float) -> tuple[float,float,float]:
    validate_rates(home, away)
    if not np.isfinite(shared_fraction) or not 0 <= shared_fraction < 1:
        raise ValueError("Shared fraction must be in [0,1)")
    shared = shared_fraction * min(home, away)
    return home-shared, away-shared, shared


def bivariate_actual_probability(home: float, away: float, actual_home: int, actual_away: int,
                                 shared_fraction: float) -> float:
    theta1, theta2, shared = shared_components(home, away, shared_fraction)
    if actual_home < 0 or actual_away < 0:
        raise ValueError("Goal counts must be nonnegative")
    return float(sum(poisson.pmf(actual_home-k, theta1)*poisson.pmf(actual_away-k, theta2)*poisson.pmf(k, shared)
                     for k in range(min(actual_home, actual_away)+1)))


def bivariate_matrix(home: float, away: float, shared_fraction: float,
                     max_goals: int = GRID_MAX) -> np.ndarray:
    theta1, theta2, shared = shared_components(home, away, shared_fraction)
    goals = np.arange(max_goals+1)
    matrix = np.zeros((max_goals+1,max_goals+1), dtype=float)
    # X=U1+U3, Y=U2+U3. The shared component changes covariance but
    # theta1+shared=home and theta2+shared=away preserve marginal means.
    for k in range(max_goals+1):
        p_shared = poisson.pmf(k, shared)
        if p_shared == 0:
            continue
        matrix[k:,k:] += p_shared * np.outer(poisson.pmf(goals[:max_goals+1-k], theta1),
                                              poisson.pmf(goals[:max_goals+1-k], theta2))
    return normalize(matrix)


def top_scores(matrix: np.ndarray, count: int = 3) -> list[tuple[str,float]]:
    flat = matrix.ravel()
    order = np.argsort(-flat, kind="stable")[:count]
    size = matrix.shape[1]
    return [(f"{index//size}-{index%size}", float(flat[index])) for index in order]
