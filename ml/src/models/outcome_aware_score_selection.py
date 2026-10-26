"""Parameter-free H/D/A mass and within-outcome score decision rules."""
from __future__ import annotations

import numpy as np

OUTCOMES=("H","D","A")


def outcome_of_score(score: str) -> str:
    home,away=map(int,score.split("-"))
    return "H" if home>away else "A" if home<away else "D"


def masks(shape: tuple[int,int]) -> dict[str,np.ndarray]:
    if len(shape)!=2 or shape[0]!=shape[1] or shape[0]<2:
        raise ValueError("Expected square score grid")
    home,away=np.indices(shape)
    return {"H":home>away,"D":home==away,"A":home<away}


def masses(matrix: np.ndarray) -> dict[str,float]:
    matrix=np.asarray(matrix,dtype=float)
    regions=masks(matrix.shape)
    if not np.isfinite(matrix).all() or (matrix<0).any() or not np.isclose(matrix.sum(),1,atol=1e-12):
        raise ValueError("Score matrix must be finite, nonnegative and normalized")
    result={name:float(matrix[mask].sum()) for name,mask in regions.items()}
    if not np.isclose(sum(result.values()),1,atol=1e-12):
        raise ValueError("Outcome masses do not sum to one")
    return result


def selected_outcome(probabilities: dict[str,float]) -> str:
    if set(probabilities)!=set(OUTCOMES) or any(not np.isfinite(v) or v<0 for v in probabilities.values()):
        raise ValueError("Need valid H/D/A probabilities")
    if not np.isclose(sum(probabilities.values()),1,atol=1e-8):
        raise ValueError("Outcome probabilities must sum to one")
    return max(OUTCOMES,key=lambda name:probabilities[name])


def top_within(matrix: np.ndarray,outcome: str,count: int=3) -> list[tuple[str,float]]:
    matrix=np.asarray(matrix,dtype=float)
    region=masks(matrix.shape).get(outcome)
    if region is None or count<1:
        raise ValueError("Invalid outcome or Top-k")
    flat=matrix.ravel()
    eligible=np.flatnonzero(region.ravel())
    order=eligible[np.argsort(-flat[eligible],kind="stable")[:count]]
    side=matrix.shape[1]
    return [(f"{index//side}-{index%side}",float(flat[index])) for index in order]


def outcome_aware_top1(matrix: np.ndarray,probabilities: dict[str,float]) -> tuple[str,str,float]:
    outcome=selected_outcome(probabilities)
    score,probability=top_within(matrix,outcome,1)[0]
    if outcome_of_score(score)!=outcome:
        raise AssertionError("Selector returned score outside selected outcome")
    return outcome,score,probability
