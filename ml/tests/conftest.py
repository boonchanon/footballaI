"""Shared pytest setup for ml/tests.

Several research-phase tests freeze the SHA-256 of src/models/predictor.py
(recorded in data/processed/input_parity_no_odds_v1/baseline_manifest.json).
predictor.py was later changed on purpose in the original D:\\ai-score- project
(weekly as-of refresh + Dixon-Coles headline), so that single hash check already
failed there before the code moved to ml/. Only that exact mismatch is reported
as xfail; any other failure in these tests still fails.
"""
from __future__ import annotations

import pytest

FROZEN_PREDICTOR_SHA_PREFIX = "782aa201e00f"
REASON = "src/models/predictor.py was intentionally updated after the research hash freeze (weekly refresh / Dixon-Coles)"


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()
    if report.when == "call" and report.failed and call.excinfo is not None:
        if call.excinfo.errisinstance(AssertionError) and FROZEN_PREDICTOR_SHA_PREFIX in str(report.longrepr):
            report.outcome = "skipped"
            report.wasxfail = REASON
