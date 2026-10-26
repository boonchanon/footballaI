"""Walk-forward comparison: legacy forced-draw outcome vs argmax outcome vs team-strength Dixon-Coles (penaltyblog).

Dixon-Coles is refit every calendar week on matches strictly before that week, with exponential time decay.
The half-life is chosen on 2023/24 only; 2024/25, 2025/26 and the 2026/27 results are scored afterwards.
"""
from __future__ import annotations

import json

import numpy as np
import pandas as pd

from src.models import dixon_coles_team as dc
from src.models.input_parity_no_odds import ODDS_COLUMNS
from src.models.model_utils import load_feature_data
from src.models.predictor import (OUTCOME_LABELS, PROJECT_ROOT, _build_feature_row, _prepare_catboost_frame,
                                  _prepare_poisson_frame, _prepare_xgboost_frame, combine_model_outputs, load_models)
from src.models.weekly_refresh import CSV_TO_MODEL, DEFAULT_API, build_history, fetch_fixtures

OUT = PROJECT_ROOT / "data/processed/outcome_and_dixon_coles_v1"
HALF_LIVES_DAYS = [120, 180, 270, 365, 540]


def dc_rows(history: pd.DataFrame, targets: pd.DataFrame, half_life: float) -> pd.DataFrame:
    rows = []
    for _, week in targets.groupby(targets.Date.dt.to_period("W")):
        predict = dc.fit(history, week.Date.min(), half_life)
        for match in week.itertuples():
            lh, la, grid = predict(match.HomeTeam, match.AwayTeam)
            rows.append(dict(index=match.Index, dc_lh=lh, dc_la=la, dc_grid=grid))
    return pd.DataFrame(rows).set_index("index")


def score_row(probs: np.ndarray, result: str, top3: list[str], actual: str) -> dict[str, float]:
    actual_result = dc.score_outcome(actual)
    onehot = np.array([actual_result == k for k in OUTCOME_LABELS], dtype=float)
    cum_p, cum_o = np.cumsum(probs)[:-1], np.cumsum(onehot)[:-1]
    return dict(
        correct=float(result == actual_result),
        log_loss=float(-np.log(max(float((probs * onehot).sum()), 1e-12))),
        rps=float(((cum_p - cum_o) ** 2).sum() / 2),
        exact=float(top3[0] == actual),
        top3=float(actual in top3),
        predicted_draw=float(result == "D"),
    )


def evaluate(frame: pd.DataFrame) -> dict[str, dict[str, float]]:
    variants = {}
    for row in frame.itertuples():
        actual = f"{int(row.HomeGoals)}-{int(row.AwayGoals)}"
        common = (row.HomeTeam, row.AwayTeam, row.Date, row.cat, row.xgb)
        legacy = combine_model_outputs(*common, row.lh, row.la, legacy_forced_draw=True)
        argmax = combine_model_outputs(*common, row.lh, row.la, legacy_forced_draw=False)
        hybrid = combine_model_outputs(*common, row.dc_lh, row.dc_la, score_probs=row.dc_grid[np.newaxis], legacy_forced_draw=False)
        dc_result, dc_top3 = dc.headline(row.dc_grid)
        entries = {
            "1_current_legacy": (legacy, None),
            "2_argmax_outcome": (argmax, None),
            "3_dixon_coles_alone": (None, (dc.outcome_probabilities(row.dc_grid), dc_result, dc_top3)),
            "4_ensemble_with_dixon_coles": (hybrid, None),
        }
        for name, (result, raw) in entries.items():
            if result is not None:
                probs = np.array([result["away_win"], result["draw"], result["home_win"]])
                raw = (probs, result["predicted_result"], result["top_scores"])
            s = score_row(raw[0], raw[1], raw[2], actual)
            variants.setdefault(name, []).append(s)
    return {name: {k: round(float(np.mean([r[k] for r in rows])), 4) for k in rows[0]} | {"n": len(rows)} for name, rows in variants.items()}


def offline_frame(models) -> pd.DataFrame:
    data = load_feature_data(PROJECT_ROOT / "data/processed/features_matches.csv")
    data = data[data.Season.isin(["2023/24", "2024/25", "2025/26"])].copy()
    data.loc[:, list(ODDS_COLUMNS)] = np.nan  # production inference never receives odds
    cat = models.catboost_model.predict_proba(_prepare_catboost_frame(data, models.catboost_meta["feature_columns"], models.catboost_meta))
    xgp = models.xgboost_model.predict_proba(_prepare_xgboost_frame(data, models.xgboost_meta))
    px = _prepare_poisson_frame(data, models.poisson_bundle)
    out = data[["Date", "Season", "HomeTeam", "AwayTeam", "HomeGoals", "AwayGoals"]].copy()
    out["cat"], out["xgb"] = list(cat), list(xgp)
    out["lh"] = np.clip(models.poisson_bundle["home_goals_model"].predict(px), 0.05, None)
    out["la"] = np.clip(models.poisson_bundle["away_goals_model"].predict(px), 0.05, None)
    return out.reset_index(drop=True)


def live_frame(models) -> tuple[pd.DataFrame, pd.DataFrame]:
    fixtures, _ = fetch_fixtures(DEFAULT_API)
    results = fixtures[fixtures.Finished].copy()
    results["HomeTeam"] = results.HomeTeam.replace(CSV_TO_MODEL)
    results["AwayTeam"] = results.AwayTeam.replace(CSV_TO_MODEL)
    base = models.matches.copy()
    rows = []
    for day, part in results.groupby("Date"):
        prior = results[results.Date < day]
        models.matches = build_history(base, prior) if len(prior) else base
        for match in part.itertuples(index=False):
            frame = _build_feature_row(models, match.HomeTeam, match.AwayTeam, pd.Timestamp(day))
            px = _prepare_poisson_frame(frame, models.poisson_bundle)
            rows.append(dict(
                Date=pd.Timestamp(day), Season="2026/27", HomeTeam=match.HomeTeam, AwayTeam=match.AwayTeam,
                HomeGoals=int(match.HomeGoals), AwayGoals=int(match.AwayGoals),
                cat=models.catboost_model.predict_proba(_prepare_catboost_frame(frame, models.catboost_meta["feature_columns"], models.catboost_meta))[0],
                xgb=models.xgboost_model.predict_proba(_prepare_xgboost_frame(frame, models.xgboost_meta))[0],
                lh=float(np.clip(models.poisson_bundle["home_goals_model"].predict(px)[0], 0.05, None)),
                la=float(np.clip(models.poisson_bundle["away_goals_model"].predict(px)[0], 0.05, None)),
            ))
    full_history = build_history(base, results)
    models.matches = base
    return pd.DataFrame(rows), full_history


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    models = load_models()
    history = models.matches[["Date", "HomeTeam", "AwayTeam", "HomeGoals", "AwayGoals"]].copy()
    offline = offline_frame(models)
    live, live_history = live_frame(models)
    live_history = live_history[["Date", "HomeTeam", "AwayTeam", "HomeGoals", "AwayGoals"]]

    validation = offline[offline.Season == "2023/24"]
    selection = {}
    for half_life in HALF_LIVES_DAYS:
        frame = validation.join(dc_rows(history, validation, half_life))
        selection[half_life] = evaluate(frame)["3_dixon_coles_alone"]
        print("validation half-life", half_life, selection[half_life], flush=True)
    best = min(selection, key=lambda h: selection[h]["rps"])

    report = dict(selected_half_life_days=best, validation_2023_24=selection, window_years=WINDOW_YEARS)
    for label, frame, hist in [
        ("test_2024_25", offline[offline.Season == "2024/25"], history),
        ("test_2025_26", offline[offline.Season == "2025/26"], history),
        ("walk_forward_2026_27", live, live_history),
    ]:
        report[label] = evaluate(frame.join(dc_rows(hist, frame, best)))
        print(label, json.dumps(report[label], indent=1), flush=True)
    (OUT / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
