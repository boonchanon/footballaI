"""Frozen same-match classifier input-parity experiment; production artifacts stay untouched."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from catboost import CatBoostClassifier
import xgboost as xgb
from scipy.stats import poisson

from src.models.input_parity_no_odds import FEATURE_VERSION, ODDS_COLUMNS, no_odds_columns, prepare, training_fill_values
from src.models.model_utils import get_feature_columns, load_feature_data, split_by_season
from src.models.poisson_model import score_matrix, predict_outcome_probabilities, _prepare_matrix
from src.models.predictor import _promote_draw_outcome, _calibrate_score_matrix, _should_force_draw, _top_scores_from_matrix

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data/processed/input_parity_no_odds_v1"
PROD = ROOT / "models/saved_models"
FEATURES = ROOT / "data/processed/features_matches.csv"
SCORES = ("0-0", "1-0", "0-1", "1-1", "2-0", "0-2", "2-1", "1-2", "2-2", "3-0", "0-3", "3-1", "1-3")


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_manifest() -> dict:
    paths = [FEATURES, ROOT / "src/models/predictor.py", ROOT / "src/models/poisson_model.py",
             ROOT / "src/features/feature_engineering.py", ROOT / "src/models/model_utils.py"]
    paths += [PROD / name for name in ("catboost_classifier.cbm", "catboost_metadata.joblib",
                                      "xgboost_classifier.json", "xgboost_metadata.joblib", "poisson_model.joblib")]
    return {str(path.relative_to(ROOT)): digest(path) for path in paths}


def data():
    splits = split_by_season(load_feature_data(FEATURES))
    assert len(splits["validation"]) == 380 and len(splits["test"]) == 760
    test = splits["test"]
    assert not test.duplicated(["Date", "HomeTeam", "AwayTeam"]).any()
    return splits


def rates(test: pd.DataFrame) -> np.ndarray:
    bundle = joblib.load(PROD / "poisson_model.joblib")
    matrix, _ = _prepare_matrix(test, pd.Series(bundle["fill_values"]))
    return np.column_stack([
        np.clip(bundle["home_goals_model"].predict(matrix), 0.05, None),
        np.clip(bundle["away_goals_model"].predict(matrix), 0.05, None),
    ])


def score_row(home_rate, away_rate, cat, xgb_prob):
    raw = score_matrix(np.array([home_rate]), np.array([away_rate]))
    pp = predict_outcome_probabilities(raw)[0]
    outcome = (cat + xgb_prob) / 2
    outcome = _promote_draw_outcome(outcome / outcome.sum(), home_rate, away_rate)
    blend = .75 * outcome + .25 * pp
    blend /= blend.sum()
    matrix = _calibrate_score_matrix(raw, blend, home_rate, away_rate)
    forced = _should_force_draw(blend, home_rate, away_rate)
    if forced:
        matrix = matrix * np.eye(matrix.shape[0])
        matrix /= matrix.sum()
    top = _top_scores_from_matrix(matrix)
    h, a = map(int, top[0].split("-"))
    return dict(score=top[0], top3=top, predicted_home=h, predicted_away=a,
                outcome="H" if h > a else "A" if h < a else "D",
                top1_score_probability=float(matrix[h, a]),
                score_nll_matrix=matrix, forced_draw=forced,
                A=float(blend[0]), D=float(blend[1]), H=float(blend[2]))


def evaluate(test: pd.DataFrame, goal_rates: np.ndarray, cat_probs: np.ndarray, xgb_probs: np.ndarray) -> pd.DataFrame:
    rows = []
    for i, match in enumerate(test.itertuples(index=False)):
        output = score_row(*goal_rates[i], cat_probs[i], xgb_probs[i])
        actual_h, actual_a = int(match.HomeGoals), int(match.AwayGoals)
        actual_o = "H" if actual_h > actual_a else "A" if actual_h < actual_a else "D"
        nll = float(-np.log(max(output.pop("score_nll_matrix")[min(actual_h, 6), min(actual_a, 6)], 1e-15))) if actual_h <= 6 and actual_a <= 6 else float("nan")
        top3 = output.pop("top3")
        rows.append(dict(Date=match.Date.strftime("%Y-%m-%d"), Season=match.Season,
                         HomeTeam=match.HomeTeam, AwayTeam=match.AwayTeam,
                         ActualHomeGoals=actual_h, ActualAwayGoals=actual_a,
                         ActualScore=f"{actual_h}-{actual_a}", ActualOutcome=actual_o,
                         PredictedHomeGoals=output.pop("predicted_home"), PredictedAwayGoals=output.pop("predicted_away"),
                         PredictedScore=output.pop("score"), PredictedOutcome=output.pop("outcome"),
                         Top3="|".join(top3), Top3Correct=f"{actual_h}-{actual_a}" in top3,
                         lambda_home=float(goal_rates[i, 0]), lambda_away=float(goal_rates[i, 1]),
                         CatA=float(cat_probs[i, 0]), CatD=float(cat_probs[i, 1]), CatH=float(cat_probs[i, 2]),
                         XgbA=float(xgb_probs[i, 0]), XgbD=float(xgb_probs[i, 1]), XgbH=float(xgb_probs[i, 2]),
                         ScoreNLL=nll, **output))
    frame = pd.DataFrame(rows)
    frame["ExactCorrect"] = (frame.PredictedHomeGoals == frame.ActualHomeGoals) & (frame.PredictedAwayGoals == frame.ActualAwayGoals)
    return frame


def metrics(frame: pd.DataFrame) -> dict:
    return dict(matches=len(frame), exact_hits=int(frame.ExactCorrect.sum()), exact_top1=float(frame.ExactCorrect.mean()),
                outcome_accuracy=float((frame.PredictedOutcome == frame.ActualOutcome).mean()),
                home_goal_mae=float((frame.PredictedHomeGoals - frame.ActualHomeGoals).abs().mean()),
                away_goal_mae=float((frame.PredictedAwayGoals - frame.ActualAwayGoals).abs().mean()),
                top3_exact=float(frame.Top3Correct.mean()), score_nll=float(frame.ScoreNLL.dropna().mean()),
                predicted_scores=frame.PredictedScore.value_counts().to_dict(),
                actual_scores=frame.ActualScore.value_counts().to_dict(),
                predicted_draw_rate=float((frame.PredictedOutcome == "D").mean()),
                actual_draw_rate=float((frame.ActualOutcome == "D").mean()))


def baseline():
    if OUT.exists():
        raise FileExistsError(f"Refusing to overwrite {OUT}")
    OUT.mkdir(parents=True)
    splits = data()
    test = splits["test"]
    cb_meta = joblib.load(PROD / "catboost_metadata.joblib")
    xgb_meta = joblib.load(PROD / "xgboost_metadata.joblib")
    cb = CatBoostClassifier(); cb.load_model(PROD / "catboost_classifier.cbm")
    xb = xgb.XGBClassifier(); xb.load_model(PROD / "xgboost_classifier.json")
    from src.models.predictor import _prepare_catboost_frame, _prepare_xgboost_frame
    # Football-history rows, not archived bookmaker quotes: emulate fixture availability.
    history = test.copy()
    history.loc[:, list(ODDS_COLUMNS)] = np.nan
    cat = cb.predict_proba(_prepare_catboost_frame(history, cb_meta["feature_columns"]))
    xprob = xb.predict_proba(_prepare_xgboost_frame(history, xgb_meta))
    goal_rates = rates(test)
    frame = evaluate(test, goal_rates, cat, xprob)
    frame.to_csv(OUT / "baseline_matches.csv", index=False)
    np.save(OUT / "frozen_rates.npy", goal_rates)
    manifest = dict(experiment="input_parity_no_odds_v1", created_utc=datetime.now(timezone.utc).isoformat(),
                    feature_version=FEATURE_VERSION, path="saved pre-match historical feature rows with odds set missing; current production classifiers and predictor score-selection functions",
                    seasons=dict(train="1993/94-2022/23", validation="2023/24", diagnostic_test="2024/25-2025/26"),
                    date_range=[frame.Date.min(), frame.Date.max()], matches=len(frame),
                    model_artifacts=[str(p.relative_to(ROOT)) for p in PROD.glob("*model*") if p.is_file()],
                    source_sha256=source_manifest(), baseline=metrics(frame),
                    limitations=["Historical feature rows, not per-fixture live builder calls.",
                                 "Diagnostic seasons previously inspected; not an untouched holdout.",
                                 "Historical odds availability unverified; baseline explicitly sets odds missing."])
    (OUT / "baseline_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest["baseline"], indent=2))


def comparison():
    if (OUT / "comparison.json").exists():
        raise FileExistsError("Refusing to overwrite comparison")
    frozen = pd.read_csv(OUT / "baseline_matches.csv")
    baseline_meta = json.loads((OUT / "baseline_manifest.json").read_text(encoding="utf-8"))
    if source_manifest() != baseline_meta["source_sha256"]:
        raise ValueError("Baseline source/model/data provenance changed")
    test = data()["test"]
    keys = ["Date", "HomeTeam", "AwayTeam"]
    assert list(frozen[keys].itertuples(index=False, name=None)) == list(
        test.assign(Date=test.Date.dt.strftime("%Y-%m-%d"))[keys].itertuples(index=False, name=None))
    cb_meta = joblib.load(OUT / "catboost_metadata.joblib")
    xb_meta = joblib.load(OUT / "xgboost_metadata.joblib")
    assert cb_meta == xb_meta and cb_meta["odds_included"] is False
    cb = CatBoostClassifier(); cb.load_model(OUT / "catboost_no_odds.cbm")
    xb = xgb.XGBClassifier(); xb.load_model(OUT / "xgboost_no_odds.json")
    if list(cb.feature_names_) != cb_meta["feature_columns"] or list(xb.get_booster().feature_names) != cb_meta["feature_columns"]:
        raise ValueError("Model feature names/order mismatch")
    prepared = prepare(test[cb_meta["feature_columns"]], cb_meta)
    cat = cb.predict_proba(prepared)
    xprob = xb.predict_proba(prepared)
    goal_rates = np.load(OUT / "frozen_rates.npy")
    frame = evaluate(test, goal_rates, cat, xprob)
    frame.to_csv(OUT / "experiment_matches.csv", index=False)
    score_table = []
    for score in SCORES:
        b = int((frozen.PredictedScore == score).sum())
        e = int((frame.PredictedScore == score).sum())
        a = int((frame.ActualScore == score).sum())
        score_table.append(dict(score=score, baseline_count=b, baseline_pct=100*b/len(frame),
                                experiment_count=e, experiment_pct=100*e/len(frame),
                                actual_count=a, actual_pct=100*a/len(frame)))
    flips = frozen[keys + ["ActualScore", "PredictedScore", "ExactCorrect", "A", "D", "H"]].merge(
        frame[keys + ["PredictedScore", "ExactCorrect", "A", "D", "H", "lambda_home", "lambda_away"]],
        on=keys, validate="one_to_one", suffixes=("_baseline", "_experiment"))
    gained = flips[(~flips.ExactCorrect_baseline) & flips.ExactCorrect_experiment]
    lost = flips[flips.ExactCorrect_baseline & (~flips.ExactCorrect_experiment)]
    gained.to_csv(OUT / "gained_matches.csv", index=False)
    lost.to_csv(OUT / "lost_matches.csv", index=False)
    bm, em = metrics(frozen), metrics(frame)
    report = dict(experiment="input_parity_no_odds_v1", created_utc=datetime.now(timezone.utc).isoformat(),
                  path=baseline_meta["path"], baseline=bm, experimental=em,
                  delta_percentage_points=100*(em["exact_top1"]-bm["exact_top1"]),
                  verdict="PROMISING" if em["exact_hits"] > bm["exact_hits"] else "NEUTRAL" if em["exact_hits"] == bm["exact_hits"] else "FAILED",
                  score_table=score_table, gained_matches=len(gained), lost_matches=len(lost),
                  parity="PASS: model feature names/order and saved training fills checked; no odds in experimental metadata",
                  leakage="UNCERTAIN: historical date-only odds timing and prospective freeze unavailable; no odds used in experimental classifier",
                  limitations=baseline_meta["limitations"],
                  artifact_sha256={str(path.relative_to(ROOT)): digest(path) for path in
                                   [OUT / "catboost_no_odds.cbm", OUT / "catboost_metadata.joblib", OUT / "xgboost_no_odds.json", OUT / "xgboost_metadata.joblib"]})
    (OUT / "comparison.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({k:report[k] for k in ("baseline", "experimental", "delta_percentage_points", "verdict", "gained_matches", "lost_matches")}, indent=2))


if __name__ == "__main__":
    import sys
    if sys.argv[1:] == ["baseline"]:
        baseline()
    elif sys.argv[1:] == ["compare"]:
        comparison()
    else:
        raise SystemExit("Use baseline or compare")
