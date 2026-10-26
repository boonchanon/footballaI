from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd


TRAIN_SEASONS = [f"{year}/{(year + 1) % 100:02d}" for year in range(1993, 2023)]
VALIDATION_SEASONS = ["2023/24"]
TEST_SEASONS = ["2024/25", "2025/26"]
MODEL_OUTPUT_DIR = Path("models/saved_models")

NON_FEATURE_COLUMNS = {
    "Date",
    "Season",
    "Div",
    "Time",
    "HomeTeam",
    "AwayTeam",
    "Result",
    "SourceFile",
    "Target",
    "MatchId",
    "HomeGoals",
    "AwayGoals",
    "HTHomeGoals",
    "HTAwayGoals",
    "HTResult",
    "Referee",
    "HomeShots",
    "AwayShots",
    "HomeShotsTarget",
    "AwayShotsTarget",
    "HomeFouls",
    "AwayFouls",
    "HomeCorners",
    "AwayCorners",
    "HomeYellow",
    "AwayYellow",
    "HomeRed",
    "AwayRed",
    "HomeWin",
    "Draw",
    "AwayWin",
}

CATEGORICAL_COLUMNS = ["HomeTeam", "AwayTeam", "Div"]
ODDS_FEATURE_COLUMNS = ["market_home_prob", "market_draw_prob", "market_away_prob"]


def load_feature_data(path: Path | str) -> pd.DataFrame:
    df = pd.read_csv(path, low_memory=False)
    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    df = df[df["Date"].notna()].copy()
    df.sort_values(["Date", "HomeTeam", "AwayTeam"], inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df


def split_by_season(df: pd.DataFrame) -> dict[str, pd.DataFrame]:
    return {
        "train": df[df["Season"].isin(TRAIN_SEASONS)].copy(),
        "validation": df[df["Season"].isin(VALIDATION_SEASONS)].copy(),
        "test": df[df["Season"].isin(TEST_SEASONS)].copy(),
    }


def get_feature_columns(df: pd.DataFrame) -> list[str]:
    feature_columns = [column for column in df.columns if column not in NON_FEATURE_COLUMNS]
    return sorted(feature_columns)


def split_feature_sets(df: pd.DataFrame) -> tuple[list[str], list[str]]:
    all_features = get_feature_columns(df)
    football_features = [column for column in all_features if column not in ODDS_FEATURE_COLUMNS]
    football_plus_odds = list(all_features)
    return football_features, football_plus_odds


def prepare_feature_matrices(
    splits: dict[str, pd.DataFrame], feature_columns: list[str]
) -> tuple[dict[str, pd.DataFrame], dict[str, pd.Series]]:
    features = {}
    targets = {}
    numeric_fill_values = splits["train"][feature_columns].median(numeric_only=True)

    for split_name, frame in splits.items():
        current = frame[feature_columns].copy()
        for column in feature_columns:
            if column in CATEGORICAL_COLUMNS:
                current[column] = current[column].fillna("Unknown").astype(str)
            else:
                fill_value = numeric_fill_values.get(column, 0.0)
                current[column] = pd.to_numeric(current[column], errors="coerce").fillna(fill_value)
        features[split_name] = current
        targets[split_name] = frame["Target"].astype(int)

    return features, targets


def softmax(logits: np.ndarray) -> np.ndarray:
    shifted = logits - np.max(logits, axis=1, keepdims=True)
    exp_values = np.exp(shifted)
    return exp_values / exp_values.sum(axis=1, keepdims=True)


def ensure_output_dir() -> Path:
    MODEL_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return MODEL_OUTPUT_DIR
