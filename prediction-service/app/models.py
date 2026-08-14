from __future__ import annotations

from typing import Any, List

from pydantic import BaseModel, Field


class MatchPredictionRequest(BaseModel):
    home_team: str = Field(..., min_length=1)
    away_team: str = Field(..., min_length=1)


class TopScore(BaseModel):
    score: str
    probability: float | None = None


class ExpectedGoals(BaseModel):
    home: float | None = None
    away: float | None = None


class MatchPredictionResponse(BaseModel):
    ok: bool = True
    home_team: str
    away_team: str
    home_win: float
    draw: float
    away_win: float
    expected_goals: ExpectedGoals
    top_scores: List[TopScore]
    summary: str
    elo_fallback_used: bool
    debug: dict[str, Any]
