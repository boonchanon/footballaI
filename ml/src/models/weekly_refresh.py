"""Weekly as-of refresh: re-predict unplayed 2026/27 fixtures using every known result; freeze played ones."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

from src.models import dixon_coles_team as dc
from src.models.fixture_predictions import _excel_safe_score
from src.models.predictor import MODEL_DIR, PROJECT_ROOT, load_models, predict_match

# The website serving the fixtures API; on the faculty VM it runs on port 80, so this is configurable.
DEFAULT_API = os.getenv("PREDICTION_FIXTURES_API_URL", "http://localhost:3000/api/football/fixtures?type=all&limit=380")
DEFAULT_PREVIOUS = PROJECT_ROOT / "data/processed/predictions_2026_2027_retrained_h2h.csv"
OUT_DIR = PROJECT_ROOT / "data/processed/weekly"
# ml/ lives inside the website repo; --publish writes into its public/ folder.
WEB_PUBLIC_DIR = PROJECT_ROOT.parent / "public"
PUBLISHED_CSV = WEB_PUBLIC_DIR / "predictions_2026_2027_retrained_h2h.csv"
PUBLISHED_MANIFEST = WEB_PUBLIC_DIR / "predictions_manifest.json"
MODEL_LABELS = {"dixon_coles": "Dixon-Coles", "ensemble": "Ensemble (CatBoost + XGBoost + Poisson)"}
API_TO_CSV = {"Manchester City": "Man City", "Manchester Utd": "Man Utd", "Tottenham": "Spurs", "Nottingham": "Nott'm Forest"}
CSV_TO_MODEL = {"Man Utd": "Man United", "Spurs": "Tottenham"}
MODEL_FILES = ["catboost_classifier.cbm", "catboost_metadata.joblib", "xgboost_classifier.json", "xgboost_metadata.joblib", "poisson_model.joblib"]


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fetch_fixtures(api_url: str) -> tuple[pd.DataFrame, bytes]:
    with urllib.request.urlopen(api_url, timeout=60) as response:
        raw = response.read()
    rows = []
    for item in json.loads(raw)["data"]:
        home = API_TO_CSV.get(item["teams"]["home"]["nameEn"], item["teams"]["home"]["nameEn"])
        away = API_TO_CSV.get(item["teams"]["away"]["nameEn"], item["teams"]["away"]["nameEn"])
        finished = bool(item["status"]["isFinished"]) and item["goals"]["home"] is not None and item["goals"]["away"] is not None
        rows.append(dict(
            Kickoff=pd.Timestamp(item["date"]),
            Date=item["date"][:10],
            HomeTeam=home,
            AwayTeam=away,
            Finished=finished,
            HomeGoals=item["goals"]["home"] if finished else np.nan,
            AwayGoals=item["goals"]["away"] if finished else np.nan,
        ))
    frame = pd.DataFrame(rows)
    if frame.duplicated(["HomeTeam", "AwayTeam"]).any():
        raise ValueError("API returned duplicate home/away pairings")
    return frame, raw


def build_history(base: pd.DataFrame, results: pd.DataFrame) -> pd.DataFrame:
    goals_home = results.HomeGoals.astype(int).to_numpy()
    goals_away = results.AwayGoals.astype(int).to_numpy()
    supplement = pd.DataFrame(dict(
        Date=pd.to_datetime(results.Date).to_numpy(),
        Season="2026/27",
        Div="E0",
        HomeTeam=results.HomeTeam.replace(CSV_TO_MODEL).to_numpy(),
        AwayTeam=results.AwayTeam.replace(CSV_TO_MODEL).to_numpy(),
        HomeGoals=goals_home,
        AwayGoals=goals_away,
        Result=np.where(goals_home > goals_away, "H", np.where(goals_home < goals_away, "A", "D")),
        SourceFile="website API 2026/27 final score; other post-match stats unavailable",
    ))
    history = pd.concat([base, supplement], ignore_index=True)
    history.sort_values(["Date", "HomeTeam", "AwayTeam"], inplace=True)
    history.reset_index(drop=True, inplace=True)
    return history


def predict_row(models, home: str, away: str, date: str, basis_date: str, dc_predict: dc.Predictor | None = None) -> dict[str, object]:
    model_home, model_away = CSV_TO_MODEL.get(home, home), CSV_TO_MODEL.get(away, away)
    result = predict_match(models, model_home, model_away, pd.Timestamp(date))
    preds = result["model_predictions"]
    top_probabilities = ""
    if dc_predict is not None:
        # Dixon-Coles drives the headline outcome, probabilities and scores; classifier columns stay for comparison.
        home_rate, away_rate, grid = dc_predict(model_home, model_away)
        away_win, draw, home_win = dc.outcome_probabilities(grid)
        outcome, top3 = dc.headline(grid)
        result.update(home_win=home_win, draw=draw, away_win=away_win, predicted_result=outcome, top_scores=top3,
                      confidence=max(home_win, draw, away_win), expected_goals={"home": home_rate, "away": away_rate})
        preds["ensemble"]["score"] = top3[0]
        top_probabilities = "|".join(f"{grid[int(s.split('-')[0]), int(s.split('-')[1])]:.4f}" for s in top3)
    return {
        "fixture_date": date,
        "home_team": home,
        "away_team": away,
        "home_win": result["home_win"],
        "draw": result["draw"],
        "away_win": result["away_win"],
        "predicted_result": result["predicted_result"],
        "expected_home_goals": result["expected_goals"]["home"],
        "expected_away_goals": result["expected_goals"]["away"],
        "top_scores": "|".join(_excel_safe_score(score) for score in result["top_scores"]),
        "confidence": result["confidence"],
        "prediction_basis_date": basis_date,
        "catboost_predicted_result": preds["catboost"]["outcome"],
        "catboost_predicted_score": _excel_safe_score(preds["catboost"]["score"]),
        "xgboost_predicted_result": preds["xgboost"]["outcome"],
        "xgboost_predicted_score": _excel_safe_score(preds["xgboost"]["score"]),
        "poisson_predicted_result": preds["poisson"]["outcome"],
        "poisson_predicted_score": _excel_safe_score(preds["poisson"]["score"]),
        "ensemble_predicted_score": _excel_safe_score(preds["ensemble"]["score"]),
        "top_scores_probabilities": top_probabilities,
    }


def report_progress(percent: int, message: str) -> None:
    """One machine-readable line on stderr; prediction-service shows it while the job runs."""
    print(f"[progress] {percent} {message}", file=sys.stderr, flush=True)


def refresh(api_url: str, previous_path: Path, now: pd.Timestamp, model: str = "ensemble") -> dict[str, object]:
    report_progress(2, "fetching fixtures and results from the website")
    fixtures, api_raw = fetch_fixtures(api_url)
    previous = pd.read_csv(previous_path, dtype=str, keep_default_na=False)
    previous_by_pair = {(row.home_team, row.away_team): row._asdict() for row in previous.itertuples(index=False)}

    report_progress(8, "loading models and match history")
    models = load_models()
    base = models.matches.copy()
    known_teams = set(base.HomeTeam) | set(base.AwayTeam)
    for team in set(fixtures.HomeTeam) | set(fixtures.AwayTeam):
        if CSV_TO_MODEL.get(team, team) not in known_teams:
            raise ValueError(f"Team {team!r} has no model history; add it to API_TO_CSV/CSV_TO_MODEL")

    results = fixtures[fixtures.Finished].copy()
    if (pd.to_datetime(results.Date) <= base.Date.max()).any():
        raise ValueError("A 2026/27 result predates the frozen history; refusing to double count")
    models.matches = build_history(base, results)
    basis_date = now.strftime("%Y-%m-%d")
    if model == "dixon_coles":
        report_progress(15, "fitting Dixon-Coles team ratings")
    dc_predict = dc.fit(models.matches, pd.Timestamp(basis_date)) if model == "dixon_coles" else None
    suffix = "" if model == "ensemble" else f"_{model}"

    rows, refreshed, frozen = [], 0, 0
    ordered = fixtures.sort_values(["Kickoff", "HomeTeam"])
    for index, fixture in enumerate(ordered.itertuples(index=False), start=1):
        pair = (fixture.HomeTeam, fixture.AwayTeam)
        if fixture.Kickoff <= now:
            if pair not in previous_by_pair:
                raise ValueError(f"Started fixture {pair} has no previous prediction to freeze")
            rows.append(previous_by_pair[pair])
            frozen += 1
        else:
            rows.append(predict_row(models, fixture.HomeTeam, fixture.AwayTeam, fixture.Date, basis_date, dc_predict))
            refreshed += 1
        if index % 10 == 0 or index == len(ordered):
            report_progress(20 + int(75 * index / len(ordered)), f"predicting fixtures {index}/{len(ordered)}")

    api_pairs = set(zip(fixtures.HomeTeam, fixtures.AwayTeam))
    missing_from_api = [row for pair, row in previous_by_pair.items() if pair not in api_pairs]
    rows.extend(missing_from_api)

    columns = list(previous.columns) + [c for c in ("top_scores_probabilities",) if c not in previous.columns]
    output = pd.DataFrame(rows, columns=columns).fillna("")
    output.sort_values(["fixture_date", "home_team"], inplace=True, kind="stable")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    # Weekly outputs are never overwritten: a second run on the same day gets a time label.
    label = basis_date
    out_path = OUT_DIR / f"predictions_2026_2027_asof_{label}{suffix}.csv"
    if out_path.exists():
        label = f"{basis_date}_{datetime.now(timezone.utc):%H%M%S}"
        out_path = OUT_DIR / f"predictions_2026_2027_asof_{label}{suffix}.csv"
    if out_path.exists():
        raise FileExistsError(f"{out_path.name} already exists; weekly outputs are never overwritten")
    report_progress(96, "writing weekly output")
    output.to_csv(out_path, index=False)
    (OUT_DIR / f"api_snapshot_{label}{suffix}.json").write_bytes(api_raw)

    manifest = dict(
        CreatedAt=datetime.now(timezone.utc).isoformat(),
        AsOf=now.isoformat(),
        Output=out_path.name,
        OutputSHA256=sha(out_path),
        PreviousFile=str(previous_path),
        PreviousSHA256=sha(previous_path),
        ApiUrl=api_url,
        Fixtures=len(fixtures),
        KnownResults=len(results),
        LastKnownResultDate=results.Date.max() if len(results) else None,
        StartedWithoutResult=int(((fixtures.Kickoff <= now) & ~fixtures.Finished).sum()),
        Refreshed=refreshed,
        FrozenFromPrevious=frozen,
        KeptMissingFromApi=[f"{row['home_team']} v {row['away_team']}" for row in missing_from_api],
        HeadlineModel=model,
        DixonColes=dict(half_life_days=dc.HALF_LIFE_DAYS, window_years=dc.WINDOW_YEARS, min_team_matches=dc.MIN_TEAM_MATCHES) if dc_predict else None,
        ModelHashes={name: sha(MODEL_DIR / name) for name in MODEL_FILES},
        Retraining=False,
    )
    write_manifest(manifest)
    return manifest


def manifest_path(manifest: dict[str, object]) -> Path:
    output = str(manifest["Output"])
    return OUT_DIR / ("manifest_" + output.removeprefix("predictions_2026_2027_asof_").removesuffix(".csv") + ".json")


def write_manifest(manifest: dict[str, object]) -> None:
    manifest_path(manifest).write_text(json.dumps(manifest, indent=2, default=str), encoding="utf-8")


def _write_atomic(path: Path, data: bytes) -> None:
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_bytes(data)
    os.replace(tmp, path)


def publish(manifest: dict[str, object], public_dir: Path = WEB_PUBLIC_DIR) -> dict[str, object]:
    """Copy the weekly CSV over the file the website reads and write the website's summary manifest."""
    source = OUT_DIR / str(manifest["Output"])
    csv_path = public_dir / PUBLISHED_CSV.name
    # The website copy has always used LF line endings; content is otherwise identical.
    _write_atomic(csv_path, source.read_bytes().replace(b"\r\n", b"\n"))
    model = str(manifest["HeadlineModel"])
    summary = dict(
        updatedAt=manifest["CreatedAt"],
        asOf=manifest["AsOf"],
        source=manifest["Output"],
        fixtures=manifest["Fixtures"],
        knownResults=manifest["KnownResults"],
        lastKnownResultDate=manifest["LastKnownResultDate"],
        refreshed=manifest["Refreshed"],
        frozen=manifest["FrozenFromPrevious"],
        startedWithoutResult=manifest["StartedWithoutResult"],
        model=model,
        modelLabel=MODEL_LABELS.get(model, model),
    )
    _write_atomic(public_dir / PUBLISHED_MANIFEST.name, json.dumps(summary, indent=2, default=str).encode("utf-8"))
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-url", default=DEFAULT_API)
    parser.add_argument("--previous", type=Path, default=None,
                        help="Last published CSV; started fixtures keep its rows. Defaults to the website's CSV with --publish.")
    parser.add_argument("--model", choices=["ensemble", "dixon_coles"], default="dixon_coles",
                        help="Model behind the headline outcome/score; dixon_coles won the 2024-26 walk-forward test.")
    parser.add_argument("--as-of", default=None, help="Reference time (e.g. 2026-10-26T12:00:00Z); defaults to now.")
    parser.add_argument("--publish", action="store_true",
                        help="Copy the new CSV to public/ and write public/predictions_manifest.json for the website.")
    parser.add_argument("--result-file", type=Path, default=None, help="Also write the final manifest JSON to this file.")
    args = parser.parse_args()
    previous = args.previous or (PUBLISHED_CSV if args.publish and PUBLISHED_CSV.exists() else DEFAULT_PREVIOUS)
    now = pd.Timestamp(args.as_of) if args.as_of else pd.Timestamp.now(tz="UTC")
    if now.tzinfo is None:
        now = now.tz_localize("UTC")
    manifest = refresh(args.api_url, previous, now, args.model)
    if args.publish:
        report_progress(98, "publishing to the website")
        manifest["Published"] = publish(manifest)
        write_manifest(manifest)
    text = json.dumps(manifest, indent=2, default=str)
    if args.result_file:
        args.result_file.write_text(text, encoding="utf-8")
    report_progress(100, "done")
    print(text)


if __name__ == "__main__":
    main()
