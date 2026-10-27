from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.evaluation.metrics import evaluate_predictions
from src.models.model_utils import ensure_output_dir


MODEL_FILES = {
    "poisson": "poisson_test_predictions.csv",
    "catboost": "catboost_test_predictions.csv",
    "xgboost": "xgboost_test_predictions.csv",
    "ensemble": "ensemble_test_predictions.csv",
}

METRIC_EXPLANATIONS_TH = {
    "accuracy": "สัดส่วนที่โมเดลทายผลการแข่งขันถูกตรง ๆ ว่าเจ้าบ้านชนะ เสมอ หรือทีมเยือนชนะ ยิ่งสูงยิ่งดี",
    "precision_macro": "ค่าเฉลี่ยความแม่นของทุกหน้าผลการแข่งขัน โดยดูว่าเวลาที่โมเดลทายว่าออกหน้าไหน หน้า đóถูกจริงบ่อยแค่ไหน ยิ่งสูงยิ่งดี",
    "recall_macro": "ค่าเฉลี่ยความสามารถในการจับผลจริงของทุกหน้าผลการแข่งขัน ว่าเมื่อผลจริงเกิดขึ้น โมเดลหาเจอได้มากแค่ไหน ยิ่งสูงยิ่งดี",
    "f1_macro": "ค่ากลางที่สรุปสมดุลระหว่างความแม่นและความสามารถในการจับผลจริงของทั้ง 3 หน้าผลการแข่งขัน ยิ่งสูงยิ่งดี",
    "log_loss": "ค่าวัดคุณภาพของเปอร์เซ็นต์ความน่าจะเป็นที่โมเดลให้ไว้ ถ้ามั่นใจผิดแรง ๆ ค่านี้จะสูง ยิ่งต่ำยิ่งดี",
    "brier_score": "ค่าวัดว่าความน่าจะเป็นที่โมเดลให้มาใกล้ผลจริงมากน้อยแค่ไหน ยิ่งต่ำยิ่งดี",
}


def evaluate_model_predictions(model_dir: Path) -> dict[str, dict[str, object]]:
    results: dict[str, dict[str, object]] = {}
    for model_name, filename in MODEL_FILES.items():
        frame = pd.read_csv(model_dir / filename)
        y_true = frame["Target"].astype(int).to_numpy()
        y_prob = frame[["AwayWinProb", "DrawProb", "HomeWinProb"]].to_numpy()
        metrics = evaluate_predictions(y_true, y_prob)
        metrics["metric_explanations_th"] = METRIC_EXPLANATIONS_TH
        results[model_name] = metrics
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate all model predictions on the test set.")
    parser.add_argument(
        "--model-dir",
        type=Path,
        default=ensure_output_dir(),
        help="Directory containing saved model predictions.",
    )
    args = parser.parse_args()
    results = evaluate_model_predictions(args.model_dir)

    evaluation_dir = PROJECT_ROOT / "data" / "processed"
    evaluation_dir.mkdir(parents=True, exist_ok=True)
    output_path = evaluation_dir / "evaluation_report.json"
    output_path.write_text(json.dumps(results, indent=2), encoding="utf-8")

    print(json.dumps(results, indent=2))
    print(f"Report: {output_path}")


if __name__ == "__main__":
    main()
