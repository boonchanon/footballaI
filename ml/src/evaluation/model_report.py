"""Accuracy / Precision / Recall / F1 (macro) of every model on the same test matches (2024/25 + 2025/26).

- CatBoost, XGBoost, Poisson, Ensemble: the saved *_test_predictions.csv written by training.
- Baseline: always predicts a home win.
- Dixon-Coles: refit every calendar week on matches strictly before that week (as in
  src/evaluation/outcome_and_dixon_coles_v1.py), headline outcome = most probable of A/D/H.
Writes models/saved_models/model_report.json, which the admin AI page shows.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.evaluation.evaluate import MODEL_FILES  # noqa: E402
from src.evaluation.metrics import evaluate_predictions  # noqa: E402
from src.models import dixon_coles_team as dc  # noqa: E402

MODEL_DIR = PROJECT_ROOT / "models" / "saved_models"
MATCHES_PATH = PROJECT_ROOT / "data" / "processed" / "matches_standardized.csv"
REPORT_PATH = MODEL_DIR / "model_report.json"
LABELS = {
    "baseline": "Baseline (ทายเจ้าบ้านชนะทุกนัด)",
    "catboost": "CatBoost",
    "xgboost": "XGBoost",
    "poisson": "Poisson",
    "ensemble": "Ensemble",
    "dixon_coles": "Dixon-Coles",
}
ORDER = ["baseline", "catboost", "xgboost", "poisson", "ensemble", "dixon_coles"]


def _metrics(y_true: np.ndarray, y_prob: np.ndarray, probabilistic: bool = True) -> dict[str, float | None]:
    result = evaluate_predictions(y_true, y_prob)
    return {
        "accuracy": result["accuracy"],
        "precision_macro": result["precision_macro"],
        "recall_macro": result["recall_macro"],
        "f1_macro": result["f1_macro"],
        # A constant one-hot "probability" has no meaningful log loss / Brier score.
        "log_loss": result["log_loss"] if probabilistic else None,
        "brier_score": result["brier_score"] if probabilistic else None,
    }


def dixon_coles_probabilities(test: pd.DataFrame, progress: Callable[[int, int], None] | None = None) -> np.ndarray:
    history = pd.read_csv(MATCHES_PATH, low_memory=False, usecols=["Date", "HomeTeam", "AwayTeam", "HomeGoals", "AwayGoals"])
    history["Date"] = pd.to_datetime(history["Date"], errors="coerce")
    history = history.dropna(subset=["Date", "HomeGoals", "AwayGoals"])
    probabilities = np.zeros((len(test), 3))
    weeks = list(test.groupby(test.Date.dt.to_period("W")))
    for done, (_, week) in enumerate(weeks, start=1):
        predict = dc.fit(history, week.Date.min())
        for position, match in zip(week.index, week.itertuples()):
            probabilities[position] = dc.outcome_probabilities(predict(match.HomeTeam, match.AwayTeam)[2])
        if progress:
            progress(done, len(weeks))
    return probabilities


def build_report(progress: Callable[[int, int], None] | None = None) -> dict[str, object]:
    frames = {name: pd.read_csv(MODEL_DIR / filename) for name, filename in MODEL_FILES.items()}
    test = frames["xgboost"][["Date", "Season", "HomeTeam", "AwayTeam", "Target"]].copy()
    test["Date"] = pd.to_datetime(test["Date"])
    test = test.reset_index(drop=True)
    y_true = test["Target"].astype(int).to_numpy()

    models: dict[str, dict[str, float | None]] = {}
    models["baseline"] = _metrics(y_true, np.tile([0.0, 0.0, 1.0], (len(test), 1)), probabilistic=False)
    for name, frame in frames.items():
        if not frame["Target"].astype(int).equals(test["Target"].astype(int)):
            raise ValueError(f"{name} test predictions are not aligned with the other models")
        models[name] = _metrics(y_true, frame[["AwayWinProb", "DrawProb", "HomeWinProb"]].to_numpy())
    models["dixon_coles"] = _metrics(y_true, dixon_coles_probabilities(test, progress))

    rows = [{"key": key, "label": LABELS[key], **models[key]} for key in ORDER]
    best = max(rows, key=lambda row: row["accuracy"])
    return {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "test_seasons": sorted(test["Season"].astype(str).unique().tolist()),
        "test_matches": int(len(test)),
        "best_model": best["key"],
        "models": rows,
        "notes_th": {
            "accuracy": "สัดส่วนนัดที่ทายผล ชนะ/เสมอ/แพ้ ถูก",
            "precision_macro": "เฉลี่ยทั้ง 3 ผล: เมื่อทายว่าออกผลไหน ถูกจริงบ่อยแค่ไหน",
            "recall_macro": "เฉลี่ยทั้ง 3 ผล: เมื่อผลจริงเกิดขึ้น ทายเจอได้มากแค่ไหน",
            "f1_macro": "ค่าสมดุลระหว่าง Precision และ Recall เฉลี่ยทั้ง 3 ผล",
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=REPORT_PATH)
    args = parser.parse_args()
    report = build_report(lambda done, total: print(f"[progress] {int(100 * done / total)} Dixon-Coles week {done}/{total}", file=sys.stderr, flush=True))
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    for row in report["models"]:
        print(f"{row['key']:12s} acc {row['accuracy']:.3f}  P {row['precision_macro']:.3f}  R {row['recall_macro']:.3f}  F1 {row['f1_macro']:.3f}")


if __name__ == "__main__":
    main()
