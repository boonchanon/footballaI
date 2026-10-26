"""Model retraining: runs ml/src/pipeline/train_job.py as a background job (one job at a time)."""
from __future__ import annotations

from typing import Any

from .jobs import job_store
from .weekly import _read_result


def start_training(requested_by: str) -> dict[str, Any]:
    args = ["-m", "src.pipeline.train_job", "--result-file", "{result_file}"]
    return job_store.start_process("train", args, requested_by, _read_result)
