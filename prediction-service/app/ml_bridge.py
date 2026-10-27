"""Real data and models from ml/ for the admin AI page: archive summary, model report, teams,
single-match prediction, fixture CSV export and validated raw-file uploads.

Everything is computed by the ml/src code itself; nothing here is estimated.
"""
from __future__ import annotations

import csv
import io
import json
import shutil
import sys
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd

from .config import settings
from .errors import ApiError

if str(settings.ml_dir) not in sys.path:
    sys.path.insert(0, str(settings.ml_dir))

MATCHES_PATH = settings.processed_dir / "matches_standardized.csv"
REPORT_PATH = settings.model_dir / "model_report.json"
PUBLISHED_CSV = settings.web_public_dir / "predictions_2026_2027_retrained_h2h.csv"
UPLOAD_DIR = settings.raw_dir / "uploads"
MODEL_FILES = ["catboost_classifier.cbm", "catboost_metadata.joblib", "xgboost_classifier.json", "xgboost_metadata.joblib", "poisson_model.joblib"]
OUTCOME_TH = {"H": "เจ้าบ้านชนะ", "D": "เสมอ", "A": "ทีมเยือนชนะ"}


def _mtime(path: Path) -> float:
    return path.stat().st_mtime if path.exists() else 0.0


def _clean_score(value: str) -> str:
    return str(value).replace('="', "").replace('"', "").strip()


# ---------------------------------------------------------------- archive / report


_archive_cache: dict[str, Any] = {}


def archive_summary() -> dict[str, Any]:
    key = _mtime(MATCHES_PATH)
    if _archive_cache.get("key") != key:
        if not MATCHES_PATH.exists():
            raise ApiError(503, "ยังไม่มีข้อมูลแมตช์ (ml/data/processed/matches_standardized.csv)")
        matches = pd.read_csv(MATCHES_PATH, low_memory=False, usecols=["Season", "SourceFile", "HomeTeam", "AwayTeam"])
        files = (
            matches.groupby(["SourceFile", "Season"]).size().reset_index(name="matches").sort_values(["Season", "SourceFile"])
        )
        seasons = sorted(matches["Season"].astype(str).unique().tolist())
        _archive_cache.update(
            key=key,
            total_matches=int(len(matches)),
            seasons=seasons,
            files=[{"filename": row.SourceFile, "season": row.Season, "matches": int(row.matches)} for row in files.itertuples()],
        )
    raw_files = sorted(settings.raw_dir.rglob("E0*.csv"))
    uploaded = {path.name for path in UPLOAD_DIR.glob("*.csv")} if UPLOAD_DIR.exists() else set()
    files = [dict(item, uploaded=item["filename"] in uploaded, pending=False) for item in _archive_cache["files"]]
    # Uploaded files the models have not been trained on yet.
    trained = {item["filename"] for item in files}
    files += [
        {"filename": path.name, "season": "-", "matches": 0, "uploaded": path.name in uploaded, "pending": True}
        for path in raw_files
        if path.name not in trained
    ]
    return {
        "total_matches": _archive_cache["total_matches"],
        "seasons": _archive_cache["seasons"],
        "latest_season": _archive_cache["seasons"][-1] if _archive_cache["seasons"] else None,
        "files": files,
        "raw_file_count": len(raw_files),
    }


def model_report() -> dict[str, Any] | None:
    if not REPORT_PATH.exists():
        return None
    return json.loads(REPORT_PATH.read_text(encoding="utf-8"))


def current_teams() -> list[str]:
    """The 20 clubs of the season the website predicts (names as in the published CSV)."""
    if not PUBLISHED_CSV.exists():
        return []
    key = _mtime(PUBLISHED_CSV)
    if _teams_cache.get("key") != key:
        with PUBLISHED_CSV.open(encoding="utf-8") as handle:
            rows = list(csv.DictReader(handle))
        _teams_cache.update(key=key, teams=sorted({row["home_team"] for row in rows} | {row["away_team"] for row in rows}))
    return list(_teams_cache["teams"])


_teams_cache: dict[str, Any] = {}


def latest_published() -> dict[str, Any] | None:
    manifest = settings.web_public_dir / "predictions_manifest.json"
    if not manifest.exists():
        return None
    return json.loads(manifest.read_text(encoding="utf-8"))


def pipeline_status() -> dict[str, Any]:
    archive = archive_summary()
    report = model_report()
    models = []
    if report:
        for row in report["models"]:
            models.append({**row, "is_best": row["key"] == report.get("best_model")})
    best = next((row for row in models if row["is_best"]), None)
    teams = current_teams()
    published = latest_published()
    summary = {
        "teamsLoaded": len(teams),
        "latestSeason": archive["latest_season"],
        "seasons_available": archive["seasons"],
        "totalMatches": archive["total_matches"],
        "rawFileCount": archive["raw_file_count"],
        "seasonCount": len(archive["seasons"]),
    }
    return {
        "summary": summary,
        "inventory": {"rawFileCount": archive["raw_file_count"], "recognized_files": archive["files"], "seasons_available": archive["seasons"]},
        "warehouse": summary,
        "evaluation": {
            "bestModel": best["label"] if best else None,
            "bestAccuracy": best["accuracy"] if best else None,
            "models": models,
            "testSeasons": report.get("test_seasons") if report else [],
            "testMatches": report.get("test_matches") if report else 0,
            "evaluatedAt": report.get("created_at") if report else None,
        },
        "models": models,
        "prediction": {
            "latestPredictionFile": published.get("source") if published else None,
            "latestPredictionUpdatedAt": published.get("updatedAt") if published else None,
            "teams": teams,
        },
        "teams": teams,
    }


# ---------------------------------------------------------------- prediction


class _Predictor:
    """Models + Dixon-Coles fitted on all known results (history + latest weekly snapshot), reused until they change."""

    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.key: tuple[Any, ...] | None = None
        self.state: dict[str, Any] = {}

    def _latest_snapshot(self) -> Path | None:
        snapshots = sorted(settings.weekly_dir.glob("api_snapshot_*.json"), key=lambda path: path.stat().st_mtime)
        return snapshots[-1] if snapshots else None

    def get(self) -> dict[str, Any]:
        snapshot = self._latest_snapshot()
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        key = (tuple(_mtime(settings.model_dir / name) for name in MODEL_FILES), _mtime(MATCHES_PATH), str(snapshot), today)
        with self.lock:
            if self.key != key:
                from src.models import dixon_coles_team as dc
                from src.models import weekly_refresh as wr
                from src.models.predictor import load_models

                models = load_models(settings.model_dir)
                results_count = 0
                if snapshot is not None:
                    fixtures, _ = wr.fetch_fixtures(snapshot.resolve().as_uri())
                    results = fixtures[fixtures.Finished].copy()
                    results = results[pd.to_datetime(results.Date) > models.matches.Date.max()]
                    if len(results):
                        models.matches = wr.build_history(models.matches, results)
                    results_count = int(len(results))
                self.state = dict(
                    models=models,
                    dc_predict=dc.fit(models.matches, pd.Timestamp(today)),
                    basis_date=today,
                    snapshot=snapshot.name if snapshot else None,
                    results_count=results_count,
                    last_result_date=str(models.matches.Date.max().date()),
                )
                self.key = key
            return self.state


predictor = _Predictor()


def warm_up() -> None:
    try:
        predictor.get()
    except Exception as error:  # noqa: BLE001 - warming is best-effort; requests report real errors
        print(f"prediction-service: model warm-up failed: {error}", file=sys.stderr)


def _model_team(name: str) -> str:
    from src.models import weekly_refresh as wr

    csv_name = wr.API_TO_CSV.get(name, name)
    return wr.CSV_TO_MODEL.get(csv_name, csv_name)


FULL_NAMES = {
    "manchester united": "Man Utd",
    "manchester city": "Man City",
    "tottenham hotspur": "Spurs",
    "nottingham forest": "Nott'm Forest",
    "newcastle united": "Newcastle",
    "leeds united": "Leeds",
    "afc bournemouth": "Bournemouth",
    "hull city": "Hull",
    "ipswich town": "Ipswich",
    "coventry city": "Coventry",
    "wolverhampton wanderers": "Wolves",
    "brighton & hove albion": "Brighton",
    "brighton and hove albion": "Brighton",
    "west ham united": "West Ham",
    "sunderland afc": "Sunderland",
}


def _csv_team(name: str) -> str:
    """Accept the published CSV name, the model's name, the website feed's name or the full club name."""
    from src.models import weekly_refresh as wr

    aliases = {key.lower(): value for key, value in FULL_NAMES.items()}
    aliases.update({api.lower(): csv_name for api, csv_name in wr.API_TO_CSV.items()})
    aliases.update({model.lower(): csv_name for csv_name, model in wr.CSV_TO_MODEL.items()})
    aliases.update({team.lower(): team for team in current_teams()})
    cleaned = " ".join(name.split())
    return aliases.get(cleaned.lower(), cleaned)


def predict_pair(home_team: str, away_team: str, fixture_date: str | None = None) -> dict[str, Any]:
    from src.models import weekly_refresh as wr

    home, away = _csv_team(home_team.strip()), _csv_team(away_team.strip())
    if home == away:
        raise ApiError(422, "ทีมเหย้าและทีมเยือนต้องไม่ซ้ำกัน")
    state = predictor.get()
    known = set(state["models"].matches.HomeTeam) | set(state["models"].matches.AwayTeam)
    unknown = [team for team in (home, away) if _model_team(team) not in known]
    if unknown:
        raise ApiError(422, f"ไม่พบประวัติของทีม: {', '.join(unknown)}")
    date = fixture_date or state["basis_date"]
    row = wr.predict_row(state["models"], home, away, date, state["basis_date"], state["dc_predict"])
    scores = [_clean_score(score) for score in str(row["top_scores"]).split("|") if score]
    probabilities = [float(value) for value in str(row["top_scores_probabilities"]).split("|") if value]
    return {
        "ok": True,
        "home_team": home,
        "away_team": away,
        "fixture_date": date,
        "home_win": float(row["home_win"]),
        "draw": float(row["draw"]),
        "away_win": float(row["away_win"]),
        "predicted_result": row["predicted_result"],
        "expected_goals": {"home": float(row["expected_home_goals"]), "away": float(row["expected_away_goals"])},
        "top_scores": [{"score": score, "probability": probabilities[i] if i < len(probabilities) else None} for i, score in enumerate(scores)],
        "model": "Dixon-Coles",
        "other_models": {
            "catboost": row["catboost_predicted_result"],
            "xgboost": row["xgboost_predicted_result"],
            "poisson": row["poisson_predicted_result"],
        },
        "basis": {"date": state["basis_date"], "last_result_date": state["last_result_date"], "snapshot": state["snapshot"]},
        "summary": (
            f"Dixon-Coles คาดว่า {OUTCOME_TH.get(row['predicted_result'], row['predicted_result'])} "
            f"สกอร์คาดการณ์ {scores[0] if scores else '-'} "
            f"(ใช้ผลการแข่งขันถึงวันที่ {state['last_result_date']})"
        ),
    }


def teams_payload() -> dict[str, Any]:
    teams = current_teams()
    return {"ok": True, "season": "2026/27", "teams": [{"name": team, "model_name": _model_team(team)} for team in teams]}


# ---------------------------------------------------------------- fixture export


FIXTURE_HEADERS = {
    "date": ("fixture_date", "date"),
    "home": ("home_team", "hometeam", "home team"),
    "away": ("away_team", "awayteam", "away team"),
}


def _decode(content: bytes, filename: str) -> str:
    for encoding in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ApiError(422, f"อ่านไฟล์ CSV ไม่ได้: {filename}")


def export_fixture_predictions(season: str, original_name: str, content: bytes) -> dict[str, Any]:
    reader = csv.DictReader(io.StringIO(_decode(content, original_name)))
    if not reader.fieldnames:
        raise ApiError(422, "ไฟล์ fixture ว่างหรือไม่มีแถวหัวตาราง")
    lowered = {name.strip().lower(): name for name in reader.fieldnames}
    columns = {}
    for key, aliases in FIXTURE_HEADERS.items():
        match = next((lowered[alias] for alias in aliases if alias in lowered), None)
        if match is None:
            raise ApiError(422, f"ไฟล์ fixture ไม่มีคอลัมน์ {' / '.join(aliases)}")
        columns[key] = match

    rows = []
    for raw in reader:
        home, away = str(raw[columns["home"]]).strip(), str(raw[columns["away"]]).strip()
        if not home or not away:
            continue
        date = str(raw[columns["date"]]).strip()[:10] or None
        prediction = predict_pair(home, away, date)
        tops = prediction["top_scores"] + [{"score": "", "probability": ""}] * 3
        rows.append({
            "fixture_date": date or "",
            "home_team": prediction["home_team"],
            "away_team": prediction["away_team"],
            "home_win": round(prediction["home_win"], 4),
            "draw": round(prediction["draw"], 4),
            "away_win": round(prediction["away_win"], 4),
            "predicted_result": prediction["predicted_result"],
            "expected_home_goals": round(prediction["expected_goals"]["home"], 3),
            "expected_away_goals": round(prediction["expected_goals"]["away"], 3),
            **{f"top_score_{i + 1}": tops[i]["score"] for i in range(3)},
            **{f"top_score_{i + 1}_probability": tops[i]["probability"] for i in range(3)},
            "model": prediction["model"],
        })
    if not rows:
        raise ApiError(422, "ไม่พบคู่แข่งขันในไฟล์ fixture")

    settings.export_dir.mkdir(parents=True, exist_ok=True)
    safe_season = "".join(char for char in season if char.isdigit() or char == "-") or "season"
    output_name = f"{Path(original_name or 'fixtures.csv').stem}-{safe_season}-predictions.csv"
    output_path = settings.export_dir / output_name
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    dates = sorted(row["fixture_date"] for row in rows if row["fixture_date"])
    return {
        "ok": True,
        "output_filename": output_name,
        "output_path": str(output_path),
        "prediction_count": len(rows),
        "date_range": f"{dates[0]} ถึง {dates[-1]}" if dates else "-",
    }


def download_path(filename: str) -> Path:
    target = settings.export_dir / Path(filename).name
    if not target.is_file():
        raise ApiError(404, "ไม่พบไฟล์ผลทำนาย")
    return target


# ---------------------------------------------------------------- raw uploads


def store_upload(filename: str, content: bytes) -> dict[str, Any]:
    """Validate a football-data.co.uk style season CSV with ml's own cleaner, then add it to data/raw/uploads."""
    from src.pipeline.runner import validate_uploaded_file

    if not filename.lower().endswith(".csv"):
        raise ApiError(422, f"รองรับเฉพาะไฟล์ CSV: {filename}")
    settings.jobs_dir.mkdir(parents=True, exist_ok=True)
    staging = settings.jobs_dir / f"E0_upload_check_{uuid.uuid4().hex[:8]}.csv"
    staging.write_bytes(content)
    try:
        try:
            validation = validate_uploaded_file(staging)
        except Exception as error:  # noqa: BLE001 - the cleaner raises plain errors for bad files
            raise ApiError(422, f"ไฟล์ {filename} ใช้ไม่ได้: {str(error).replace(staging.name, filename)}") from error
        if validation["match_rows"] == 0:
            raise ApiError(422, f"ไฟล์ {filename} ไม่มีแถวผลการแข่งขันที่อ่านได้")
        stored_as = None
        if not validation["is_duplicate_file"]:
            UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
            stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
            safe = "".join(char if char.isalnum() or char in "._-" else "_" for char in Path(filename).stem)
            stored_as = f"E0_update_{stamp}_{safe}.csv"
            shutil.copy2(staging, UPLOAD_DIR / stored_as)
    finally:
        staging.unlink(missing_ok=True)
    return {
        "original_name": filename,
        "stored_filename": stored_as,
        "duplicate": bool(validation["is_duplicate_file"]),
        "duplicate_of": validation["duplicate_of"],
        "seasons": validation["season_candidates"],
        "match_rows": validation["match_rows"],
        "is_new_season": bool(validation["is_new_season"]),
        "season_already_present": bool(validation["season_already_present"]),
    }


def delete_upload(filename: str) -> dict[str, Any]:
    name = Path(filename).name
    target = UPLOAD_DIR / name
    if not target.is_file():
        if any(path.name == name for path in settings.raw_dir.glob("E0*.csv")):
            raise ApiError(422, "ลบได้เฉพาะไฟล์ที่อัปโหลดเพิ่ม ไฟล์ข้อมูลตั้งต้นลบไม่ได้")
        raise ApiError(404, "ไม่พบไฟล์")
    target.unlink()
    return {"ok": True, "filename": name, "message": "ลบไฟล์แล้ว กดฝึกแบบจำลองใหม่เพื่อให้ข้อมูลอัปเดต"}
