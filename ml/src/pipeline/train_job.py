"""Retrain from every raw season file, then re-evaluate all models (run by prediction-service as a job).

1. src.pipeline.runner.run_full_pipeline: clean raw CSVs, rebuild features, train CatBoost, XGBoost,
   Poisson and the ensemble (overwrites models/saved_models).
2. src.evaluation.model_report: Accuracy/Precision/Recall/F1 of every model incl. Baseline and Dixon-Coles.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from src.evaluation.model_report import REPORT_PATH, build_report
from src.pipeline.runner import run_full_pipeline


def report_progress(percent: int, message: str) -> None:
    print(f"[progress] {percent} {message}", file=sys.stderr, flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--result-file", type=Path, default=None)
    args = parser.parse_args()
    started = time.monotonic()

    report_progress(5, "rebuilding dataset and training CatBoost, XGBoost and Poisson")
    pipeline = run_full_pipeline().to_dict()
    trained_seconds = round(time.monotonic() - started, 1)

    report_progress(70, "evaluating models")
    report = build_report(lambda done, total: report_progress(70 + int(28 * done / total), f"evaluating Dixon-Coles week {done}/{total}"))
    REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    result = {
        "total_raw_files": pipeline["total_raw_files"],
        "total_matches": pipeline["total_matches"],
        "added_matches": pipeline["added_matches"],
        "seasons_available": pipeline["seasons_available"],
        "latest_season": pipeline["latest_season"],
        "feature_rows": pipeline["feature_rows"],
        "training_seconds": trained_seconds,
        "total_seconds": round(time.monotonic() - started, 1),
        "report": report,
    }
    text = json.dumps(result, indent=2, ensure_ascii=False, default=str)
    if args.result_file:
        args.result_file.write_text(text, encoding="utf-8")
    report_progress(100, "done")
    print(json.dumps({k: v for k, v in result.items() if k != "report"}, default=str))


if __name__ == "__main__":
    main()
