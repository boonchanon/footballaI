"""Strict train/serve preprocessing for the isolated no-odds experiment."""
from __future__ import annotations

import pandas as pd

ODDS_COLUMNS = (
    "B365A", "B365D", "B365H", "market_away_prob", "market_confidence",
    "market_draw_prob", "market_favorite_prob", "market_home_prob",
    "market_prob_difference",
)
FEATURE_VERSION = "legacy_v1"


def no_odds_columns(columns: list[str]) -> list[str]:
    found = [column for column in columns if column in ODDS_COLUMNS]
    if sorted(found) != sorted(ODDS_COLUMNS):
        raise ValueError(f"Expected exact odds columns; found {found}")
    return [column for column in columns if column not in ODDS_COLUMNS]


def training_fill_values(train: pd.DataFrame, columns: list[str]) -> dict[str, float]:
    if list(train.columns) != columns:
        raise ValueError("Training feature names/order mismatch")
    values = {}
    for column in columns:
        numeric = pd.to_numeric(train[column], errors="coerce")
        if numeric.notna().any():
            values[column] = float(numeric.median())
        else:
            values[column] = 0.0
    return values


def prepare(frame: pd.DataFrame, metadata: dict) -> pd.DataFrame:
    columns = metadata["feature_columns"]
    if len(columns) != len(set(columns)) or list(frame.columns) != columns:
        raise ValueError("Inference feature names/order mismatch")
    if metadata["feature_version"] != FEATURE_VERSION:
        raise ValueError("Feature version mismatch")
    if any(column in ODDS_COLUMNS for column in columns):
        raise ValueError("Odds feature in experimental model")
    fills = metadata["imputation_values"]
    if set(fills) != set(columns):
        raise ValueError("Missing or unexpected imputation values")
    output = pd.DataFrame({column: pd.to_numeric(frame[column], errors="coerce").fillna(fills[column]).astype(float)
                           for column in columns}, index=frame.index)
    if output.isna().any().any():
        raise ValueError("Unresolved missing feature value")
    return output
