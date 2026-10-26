"""Compare the production bundle with saved_models_v2 on untouched seasons and the 2026/27 walk-forward."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from src.models.input_parity_no_odds import ODDS_COLUMNS
from src.models.model_utils import load_feature_data, split_by_season
from src.models.predictor import (MODEL_DIR, PROJECT_ROOT, _prepare_catboost_frame, _prepare_poisson_frame,
                                  _prepare_xgboost_frame, combine_model_outputs, load_models)
from src.models.weekly_refresh import DEFAULT_API, build_history, fetch_fixtures, predict_row

V2_DIR = PROJECT_ROOT / "models/saved_models_v2"
OUT = PROJECT_ROOT / "data/processed/v2_vs_baseline"
FEATURE_FILES = {
    "baseline": PROJECT_ROOT / "data/processed/features_matches.csv",
    "v2": PROJECT_ROOT / "data/processed/correctness_audit_v1/features_correctness_v2.csv",
}
TARGET_TO_RESULT = {0: "A", 1: "D", 2: "H"}


def metrics(frame: pd.DataFrame) -> dict[str, float]:
    probs = frame[["away_win", "draw", "home_win"]].to_numpy()
    onehot = np.stack([(frame.actual_result == k).to_numpy() for k in ("A", "D", "H")], axis=1).astype(float)
    return dict(
        n=len(frame),
        outcome_accuracy=float((frame.predicted_result == frame.actual_result).mean()),
        argmax_outcome_accuracy=float((np.array(["A", "D", "H"])[probs.argmax(axis=1)] == frame.actual_result).mean()),
        log_loss=float(-np.mean(np.log(np.clip((probs * onehot).sum(axis=1), 1e-12, None)))),
        brier=float(np.mean(((probs - onehot) ** 2).sum(axis=1))),
        exact_top1=float((frame.top1 == frame.actual_score).mean()),
        exact_top3=float(np.mean([s in t for s, t in zip(frame.actual_score, frame.top3)])),
        predicted_draw_share=float((frame.predicted_result == "D").mean()),
        actual_draw_share=float((frame.actual_result == "D").mean()),
    )


def offline_rows(name: str, models) -> pd.DataFrame:
    test = split_by_season(load_feature_data(FEATURE_FILES[name]))["test"].copy()
    if name == "baseline":
        test.loc[:, list(ODDS_COLUMNS)] = np.nan  # production inference never receives odds
    cat = models.catboost_model.predict_proba(_prepare_catboost_frame(test, models.catboost_meta["feature_columns"], models.catboost_meta))
    xgp = models.xgboost_model.predict_proba(_prepare_xgboost_frame(test, models.xgboost_meta))
    poisson_x = _prepare_poisson_frame(test, models.poisson_bundle)
    lh = np.clip(models.poisson_bundle["home_goals_model"].predict(poisson_x), 0.05, None)
    la = np.clip(models.poisson_bundle["away_goals_model"].predict(poisson_x), 0.05, None)
    rows = []
    for i, match in enumerate(test.itertuples(index=False)):
        result = combine_model_outputs(match.HomeTeam, match.AwayTeam, match.Date, cat[i], xgp[i], float(lh[i]), float(la[i]))
        rows.append(dict(
            season=match.Season, match=f"{match.Date:%Y-%m-%d} {match.HomeTeam} v {match.AwayTeam}",
            away_win=result["away_win"], draw=result["draw"], home_win=result["home_win"],
            predicted_result=result["predicted_result"], top1=result["top_scores"][0], top3=result["top_scores"][:3],
            actual_result=TARGET_TO_RESULT[int(match.Target)], actual_score=f"{int(match.HomeGoals)}-{int(match.AwayGoals)}",
        ))
    return pd.DataFrame(rows)


def walk_forward_rows(models) -> pd.DataFrame:
    fixtures, _ = fetch_fixtures(DEFAULT_API)
    results = fixtures[fixtures.Finished]
    base = models.matches.copy()
    rows = []
    for day, part in results.groupby("Date"):
        prior = results[results.Date < day]
        models.matches = build_history(base, prior) if len(prior) else base
        for match in part.itertuples(index=False):
            p = predict_row(models, match.HomeTeam, match.AwayTeam, match.Date, day)
            hg, ag = int(match.HomeGoals), int(match.AwayGoals)
            top3 = [s.replace('="', "").replace('"', "") for s in p["top_scores"].split("|")]
            rows.append(dict(
                match=f"{day} {match.HomeTeam} v {match.AwayTeam}", away_win=p["away_win"], draw=p["draw"],
                home_win=p["home_win"], predicted_result=p["predicted_result"], top1=top3[0], top3=top3,
                actual_result="H" if hg > ag else "A" if hg < ag else "D", actual_score=f"{hg}-{ag}",
            ))
    models.matches = base
    return pd.DataFrame(rows)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    bundles = {"baseline": load_models(MODEL_DIR), "v2": load_models(V2_DIR)}
    report = {}
    for name, models in bundles.items():
        offline = offline_rows(name, models)
        live = walk_forward_rows(models)
        offline.to_csv(OUT / f"{name}_test_seasons.csv", index=False)
        live.to_csv(OUT / f"{name}_walk_forward_2026_27.csv", index=False)
        report[name] = dict(
            test_2024_26=metrics(offline),
            by_season={season: metrics(part) for season, part in offline.groupby("season")},
            walk_forward_2026_27=metrics(live),
        )
    (OUT / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
