"""Pre-registered pure and integrated Phase-3 exact-score comparisons."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import poisson

from src.models.ml_goal_rates_v1 import OUT, PHASE2, ROOT, load_splits, predict_rates, positive_rates, sha
from src.models.input_parity_no_odds import ODDS_COLUMNS
from src.models.poisson_model import score_matrix
from src.evaluation.input_parity_no_odds_v1 import SCORES, score_row
import joblib

NAMES = ("poisson", "xgb", "cat", "ensemble")


def pure_score(home_rate, away_rate):
    matrix = score_matrix(np.array([home_rate]), np.array([away_rate]))[0]
    if not np.isfinite(matrix).all() or (matrix < 0).any() or not np.isclose(matrix.sum(), 1):
        raise ValueError("Invalid normalized score matrix")
    index = np.unravel_index(np.argmax(matrix), matrix.shape)
    h, a = int(index[0]), int(index[1])
    return f"{h}-{a}", float(matrix[h, a])


def predicted_outcome(score):
    h, a = map(int, score.split("-"))
    return "H" if h > a else "A" if h < a else "D"


def make_rows(test, rates, family, path, frozen=None):
    rows = []
    for i, row in enumerate(test.itertuples(index=False)):
        h, a = rates[i]
        if path == "pure":
            score, probability = pure_score(h, a)
            forced = False
        else:
            c = np.array([frozen.iloc[i].CatA, frozen.iloc[i].CatD, frozen.iloc[i].CatH])
            x = np.array([frozen.iloc[i].XgbA, frozen.iloc[i].XgbD, frozen.iloc[i].XgbH])
            selection = score_row(h, a, c, x)
            score = selection["score"]
            probability = selection["top1_score_probability"]
            forced = selection["forced_draw"]
        actual_h, actual_a = int(row.HomeGoals), int(row.AwayGoals)
        actual = f"{actual_h}-{actual_a}"
        pred_h, pred_a = map(int, score.split("-"))
        # Proper likelihood under the untruncated independent-Poisson joint model.
        # This is deliberately not the forced-draw integrated matrix likelihood.
        nll = float(-poisson.logpmf(actual_h, h) - poisson.logpmf(actual_a, a))
        rows.append(dict(Date=row.Date.strftime("%Y-%m-%d"), Season=row.Season,
                         HomeTeam=row.HomeTeam, AwayTeam=row.AwayTeam, ActualHomeGoals=actual_h,
                         ActualAwayGoals=actual_a, ActualScore=actual, PredictedHomeGoals=pred_h,
                         PredictedAwayGoals=pred_a, PredictedScore=score, ActualOutcome=predicted_outcome(actual),
                         PredictedOutcome=predicted_outcome(score), ExactCorrect=score == actual,
                         lambda_home=float(h), lambda_away=float(a),
                         top1_matrix_probability=probability, untruncated_poisson_nll=nll,
                         forced_draw=forced, model=family, path=path))
    return pd.DataFrame(rows)


def summarize(frame):
    actual_h = frame.ActualHomeGoals.to_numpy()
    actual_a = frame.ActualAwayGoals.to_numpy()
    rates = frame[["lambda_home", "lambda_away"]].to_numpy()
    predicted = frame.PredictedScore.value_counts().to_dict()
    common = ("0-0", "1-0", "0-1", "1-1", "2-0", "2-1", "1-2", "2-2")
    precision = {}
    for score in common:
        sub = frame[frame.PredictedScore == score]
        precision[score] = dict(predictions=len(sub), hits=int(sub.ExactCorrect.sum()),
                                precision=float(sub.ExactCorrect.mean()) if len(sub) else None)
    return dict(matches=len(frame), exact_hits=int(frame.ExactCorrect.sum()), exact_top1=float(frame.ExactCorrect.mean()),
                outcome_accuracy=float((frame.PredictedOutcome == frame.ActualOutcome).mean()),
                home_rate_mae=float(np.abs(rates[:, 0]-actual_h).mean()),
                away_rate_mae=float(np.abs(rates[:, 1]-actual_a).mean()),
                home_rate_rmse=float(np.sqrt(np.square(rates[:, 0]-actual_h).mean())),
                away_rate_rmse=float(np.sqrt(np.square(rates[:, 1]-actual_a).mean())),
                mean_lambda_home=float(rates[:, 0].mean()), mean_lambda_away=float(rates[:, 1].mean()),
                actual_mean_home=float(actual_h.mean()), actual_mean_away=float(actual_a.mean()),
                independent_poisson_nll=float(frame.untruncated_poisson_nll.mean()),
                rate_distribution={side:{key:float(value) for key,value in zip(("min","median","mean","max","variance"),
                                    (np.min(col),np.median(col),np.mean(col),np.max(col),np.var(col)))}
                                   for side,col in (("home",rates[:, 0]),("away",rates[:, 1]))},
                predicted_scores=predicted, score_precision=precision,
                most_common_score=max(predicted, key=predicted.get),
                most_common_count=max(predicted.values()),
                most_common_pct=float(max(predicted.values())/len(frame)),
                unique_scorelines=len(predicted),
                draw_prediction_rate=float((frame.PredictedOutcome == "D").mean()),
                actual_draw_rate=float((frame.ActualOutcome == "D").mean()))


def evaluate_all():
    if (OUT / "report.json").exists():
        raise FileExistsError("Refusing to overwrite Phase 3 evaluation")
    frozen_manifest = json.loads((OUT / "baseline_freeze.json").read_text(encoding="utf-8"))
    train_manifest = json.loads((OUT / "training_manifest.json").read_text(encoding="utf-8"))
    if sha(ROOT / "data/processed/features_matches.csv") != frozen_manifest["feature_data_sha256"]:
        raise ValueError("Feature data changed")
    for name, expected in train_manifest["artifacts"].items():
        if sha(OUT / name) != expected:
            raise ValueError(f"Phase 3 model changed: {name}")
    test = load_splits()["test"]
    phase2 = pd.read_csv(PHASE2 / "experiment_matches.csv")
    if sha(PHASE2 / "experiment_matches.csv") != frozen_manifest["phase2_match_sha256"]:
        raise ValueError("Phase 2 match predictions changed")
    keys = ["Date", "HomeTeam", "AwayTeam"]
    if list(phase2[keys].itertuples(index=False, name=None)) != list(test.assign(Date=test.Date.dt.strftime("%Y-%m-%d"))[keys].itertuples(index=False, name=None)):
        raise ValueError("Different matches or match order")
    if int(phase2.ExactCorrect.sum()) != 75:
        raise ValueError("Phase 2 baseline no longer 75/760")
    metadata = joblib.load(OUT / "metadata.joblib")
    if metadata["odds_included"] is not False or any(name in ODDS_COLUMNS for name in metadata["feature_columns"]):
        raise ValueError("Goal-rate model contains odds")
    ml = predict_rates(test[metadata["feature_columns"]])
    old = positive_rates(np.load(PHASE2 / "frozen_rates.npy"))
    all_rates = dict(poisson=old, **ml)
    for name, arr in all_rates.items():
        if arr.shape != (760, 2) or not np.isfinite(arr).all() or (arr <= 0).any():
            raise ValueError(f"Invalid rates: {name}")
    np.savez(OUT / "diagnostic_rates.npz", **all_rates)
    summaries = {path:{} for path in ("pure", "integrated")}
    frames = {}
    for path in ("pure", "integrated"):
        for name in NAMES:
            frame = make_rows(test, all_rates[name], name, path, phase2 if path == "integrated" else None)
            frame.to_csv(OUT / f"{path}_{name}_matches.csv", index=False)
            frames[(path,name)] = frame
            summaries[path][name] = summarize(frame)
    # Confirm that only lambda source changes on integrated Phase-2 path.
    phase2_reproduced = frames[("integrated","poisson")]
    if not (phase2_reproduced.PredictedScore.to_numpy() == phase2.PredictedScore.to_numpy()).all():
        raise ValueError("Integrated Poisson does not reproduce Phase 2 score path")
    if summaries["integrated"]["poisson"]["exact_hits"] != 75:
        raise ValueError("Phase 2 baseline mismatch")
    actual_counts = phase2.ActualScore.value_counts().to_dict()
    distributions = {}
    for path in ("pure", "integrated"):
        distributions[path] = [dict(score=score, actual_count=int(actual_counts.get(score,0)),
                                    actual_pct=100*actual_counts.get(score,0)/760,
                                    phase2_count=int((phase2.PredictedScore==score).sum()),
                                    phase2_pct=100*(phase2.PredictedScore==score).sum()/760,
                                    **{f"{name}_count":int((frames[(path,name)].PredictedScore==score).sum()) for name in NAMES},
                                    **{f"{name}_pct":100*(frames[(path,name)].PredictedScore==score).sum()/760 for name in NAMES})
                               for score in SCORES]
        pd.DataFrame(distributions[path]).to_csv(OUT / f"{path}_score_distribution.csv", index=False)
    # Pre-registered best integrated model only for descriptive flip analysis.
    best = max(("xgb","cat","ensemble"), key=lambda name:(summaries["integrated"][name]["exact_hits"],
                                                        -summaries["integrated"][name]["independent_poisson_nll"],
                                                        -NAMES.index(name)))
    joined = phase2[keys + ["ActualScore", "PredictedScore", "ExactCorrect", "lambda_home", "lambda_away"]].merge(
        frames[("integrated",best)][keys + ["PredictedScore", "ExactCorrect", "lambda_home", "lambda_away"]],
        on=keys, validate="one_to_one", suffixes=("_phase2","_phase3"))
    gained = joined[(~joined.ExactCorrect_phase2)&joined.ExactCorrect_phase3]
    lost = joined[joined.ExactCorrect_phase2&(~joined.ExactCorrect_phase3)]
    gained.to_csv(OUT / "best_gained_matches.csv", index=False)
    lost.to_csv(OUT / "best_lost_matches.csv", index=False)
    report = dict(experiment="ml_goal_rates_v1", created_utc=datetime.now(timezone.utc).isoformat(),
                  baseline_freeze="baseline_freeze.json", training_manifest="training_manifest.json",
                  objectives=metadata["objective"], phase2_baseline_exact_hits=75,
                  pure=summaries["pure"], integrated=summaries["integrated"],
                  score_distributions=distributions,
                  integrated_best=best, best_gained=len(gained), best_lost=len(lost),
                  pure_comparison_baseline="pure poisson", integrated_comparison_baseline="Phase 2 integrated poisson",
                  nll_method="Untruncated independent-Poisson joint likelihood for actual counts; valid for pure models. For integrated variants it evaluates underlying goal-rate quality, not the forced-draw/adjusted score matrix.",
                  limitations=["Historical date-based pre-match feature rows; not 760 live fixture calls.",
                               "Diagnostic seasons 2024/25 and 2025/26 were previously inspected.",
                               "No diagnostic test-based hyperparameter or ensemble-weight tuning."])
    (OUT / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({path:{name:(summaries[path][name]["exact_hits"], summaries[path][name]["exact_top1"]) for name in NAMES} for path in summaries}, indent=2))
    print("best integrated", best, "gained", len(gained), "lost", len(lost))


if __name__ == "__main__":
    evaluate_all()
