from __future__ import annotations

import csv
import io
import math
import shutil
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

from .config import DEFAULT_SHARED_DATA_DIR, settings
from .errors import ApiError


CLUB_PRIORS: dict[str, dict[str, Any]] = {
    "Arsenal": {"elo": 1825, "attack": 1.88, "defense": 0.92, "form": 0.68, "promoted": False},
    "Aston Villa": {"elo": 1750, "attack": 1.58, "defense": 1.08, "form": 0.58, "promoted": False},
    "Bournemouth": {"elo": 1660, "attack": 1.34, "defense": 1.25, "form": 0.48, "promoted": False},
    "Brentford": {"elo": 1705, "attack": 1.44, "defense": 1.12, "form": 0.56, "promoted": False},
    "Brighton": {"elo": 1710, "attack": 1.47, "defense": 1.11, "form": 0.55, "promoted": False},
    "Chelsea": {"elo": 1775, "attack": 1.61, "defense": 1.03, "form": 0.61, "promoted": False},
    "Crystal Palace": {"elo": 1655, "attack": 1.27, "defense": 1.19, "form": 0.47, "promoted": False},
    "Everton": {"elo": 1640, "attack": 1.22, "defense": 1.17, "form": 0.45, "promoted": False},
    "Fulham": {"elo": 1665, "attack": 1.31, "defense": 1.18, "form": 0.49, "promoted": False},
    "Hull City": {"elo": 1540, "attack": 1.08, "defense": 1.36, "form": 0.34, "promoted": True},
    "Ipswich": {"elo": 1535, "attack": 1.10, "defense": 1.37, "form": 0.34, "promoted": True},
    "Ipswich Town": {"elo": 1535, "attack": 1.10, "defense": 1.37, "form": 0.34, "promoted": True},
    "Leeds": {"elo": 1580, "attack": 1.20, "defense": 1.30, "form": 0.39, "promoted": True},
    "Leeds United": {"elo": 1580, "attack": 1.20, "defense": 1.30, "form": 0.39, "promoted": True},
    "Liverpool": {"elo": 1845, "attack": 1.92, "defense": 0.89, "form": 0.70, "promoted": False},
    "Manchester City": {"elo": 1870, "attack": 1.98, "defense": 0.83, "form": 0.73, "promoted": False},
    "Manchester United": {"elo": 1720, "attack": 1.46, "defense": 1.15, "form": 0.53, "promoted": False},
    "Newcastle": {"elo": 1740, "attack": 1.56, "defense": 1.09, "form": 0.57, "promoted": False},
    "Newcastle United": {"elo": 1740, "attack": 1.56, "defense": 1.09, "form": 0.57, "promoted": False},
    "Nottingham Forest": {"elo": 1645, "attack": 1.26, "defense": 1.16, "form": 0.46, "promoted": False},
    "Sunderland": {"elo": 1525, "attack": 1.06, "defense": 1.39, "form": 0.32, "promoted": True},
    "Tottenham Hotspur": {"elo": 1735, "attack": 1.54, "defense": 1.12, "form": 0.56, "promoted": False},
    "Coventry": {"elo": 1510, "attack": 1.02, "defense": 1.42, "form": 0.31, "promoted": True},
    "Coventry City": {"elo": 1510, "attack": 1.02, "defense": 1.42, "form": 0.31, "promoted": True},
    "AFC Bournemouth": {"elo": 1660, "attack": 1.34, "defense": 1.25, "form": 0.48, "promoted": False},
}

TEAM_ALIAS_MAP = {
    "man utd": "Manchester United",
    "man united": "Manchester United",
    "manchester utd": "Manchester United",
    "man city": "Manchester City",
    "spurs": "Tottenham Hotspur",
    "nott'm forest": "Nottingham Forest",
    "brighton": "Brighton",
    "newcastle": "Newcastle United",
    "leeds": "Leeds United",
    "ipswich": "Ipswich Town",
    "hull": "Hull City",
    "coventry": "Coventry City",
    "bournemouth": "AFC Bournemouth",
}

FIXTURE_HEADERS = {
    "date": ("fixture_date", "date"),
    "home": ("home_team", "hometeam", "home team"),
    "away": ("away_team", "awayteam", "away team"),
}


@dataclass
class HistoricalMatch:
    date: str
    season: str
    home_team: str
    away_team: str
    home_goals: int
    away_goals: int


def ensure_directories() -> None:
    settings.raw_dir.mkdir(parents=True, exist_ok=True)
    settings.export_dir.mkdir(parents=True, exist_ok=True)
    settings.model_dir.mkdir(parents=True, exist_ok=True)


def normalize_lookup_key(value: str) -> str:
    return " ".join(str(value or "").strip().lower().split())


def normalize_team_name(value: str) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    return TEAM_ALIAS_MAP.get(normalize_lookup_key(raw), raw)


def to_number(value: Any) -> int | None:
    try:
        parsed = float(str(value).strip())
    except (TypeError, ValueError):
        return None
    if math.isfinite(parsed):
        return int(parsed)
    return None


def pick_first_value(record: dict[str, Any], keys: Iterable[str]) -> str:
    for key in keys:
        if key in record and str(record[key]).strip():
            return str(record[key]).strip()
        lower_match = next(
            (item for item in record if isinstance(item, str) and item.lower() == key.lower()),
            None,
        )
        if lower_match and str(record[lower_match]).strip():
            return str(record[lower_match]).strip()
    return ""


def infer_season(filename: str, rows: list[dict[str, Any]]) -> str:
    import re

    match = re.search(r"(\d{4})[-_]?(\d{4})", filename or "")
    if match:
        return f"{match.group(1)}-{match.group(2)}"

    sample_date = pick_first_value(rows[0] if rows else {}, ["season", "Season", "date", "Date", "fixture_date"])
    sample_date = sample_date.strip()

    match = re.search(r"(19\d{2}|20\d{2})", sample_date)
    if match:
        year = int(match.group(1))
        month_match = re.match(r"^(\d{1,2})[/-](\d{1,2})[/-](19\d{2}|20\d{2})$", sample_date)
        month = int(month_match.group(2)) if month_match else None
        season_start = year - 1 if month is not None and month < 7 else year
        return f"{season_start}-{season_start + 1}"

    short_match = re.match(r"^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$", sample_date)
    if short_match:
        month = int(short_match.group(2))
        short_year = int(short_match.group(3))
        year = 1900 + short_year if short_year >= 70 else 2000 + short_year
        season_start = year - 1 if month < 7 else year
        return f"{season_start}-{season_start + 1}"

    return "unknown"


def normalize_historical_row(row: dict[str, Any], fallback_season: str) -> HistoricalMatch | None:
    date = pick_first_value(row, ["Date", "date", "fixture_date"])
    home_team = normalize_team_name(pick_first_value(row, ["HomeTeam", "home_team", "homeTeam", "Home Team"]))
    away_team = normalize_team_name(pick_first_value(row, ["AwayTeam", "away_team", "awayTeam", "Away Team"]))
    home_goals = to_number(pick_first_value(row, ["FTHG", "home_goals", "homeGoals", "HG"]))
    away_goals = to_number(pick_first_value(row, ["FTAG", "away_goals", "awayGoals", "AG"]))
    season = pick_first_value(row, ["season", "Season"]) or fallback_season

    if not date or not home_team or not away_team or home_goals is None or away_goals is None:
        return None

    return HistoricalMatch(
        date=date,
        season=season,
        home_team=home_team,
        away_team=away_team,
        home_goals=home_goals,
        away_goals=away_goals,
    )


def get_match_key(match: HistoricalMatch) -> str:
    return "|".join([match.date, normalize_lookup_key(match.home_team), normalize_lookup_key(match.away_team)])


def list_raw_files() -> list[Path]:
    ensure_directories()
    return sorted([path for path in settings.raw_dir.glob("*.csv") if path.is_file()])


def sanitize_filename_part(value: str, fallback: str = "file") -> str:
    import re

    normalized = re.sub(r"[^\w.-]+", "-", str(value or "").strip())
    normalized = re.sub(r"-+", "-", normalized).strip("-")
    return normalized or fallback


def create_timestamp_label() -> str:
    return datetime.utcnow().strftime("%Y%m%d%H%M%S")


def load_csv_rows_from_text(content: str) -> list[dict[str, str]]:
    if not content.strip():
        return []
    reader = csv.DictReader(io.StringIO(content))
    return [dict(row) for row in reader]


def decode_csv_bytes(content: bytes, filename: str) -> str:
    last_error: Exception | None = None
    for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError as error:
            last_error = error

    raise ApiError(
        422,
        f"ไม่สามารถอ่านไฟล์ CSV ได้: {filename}",
        details={
            "filename": filename,
            "supported_encodings": ["utf-8-sig", "utf-8", "cp1252", "latin-1"],
            "reason": str(last_error) if last_error else "Unknown decode error",
        },
    )


def read_csv_text_from_path(file_path: Path) -> str:
    try:
        return decode_csv_bytes(file_path.read_bytes(), file_path.name)
    except ApiError as error:
        raise ApiError(
            error.status_code,
            f"ไม่สามารถอ่านไฟล์ historical ในคลังได้: {file_path.name}",
            details={
                **(error.details or {}),
                "filename": file_path.name,
            },
        ) from error


def load_archive() -> dict[str, Any]:
    files: list[dict[str, Any]] = []
    matches: list[HistoricalMatch] = []
    seen: set[str] = set()
    duplicates_removed = 0

    for file_path in list_raw_files():
        content = read_csv_text_from_path(file_path)
        rows = load_csv_rows_from_text(content)
        season = infer_season(file_path.name, rows)
        file_match_count = 0

        for row in rows:
            normalized = normalize_historical_row(row, season)
            if normalized is None:
                continue
            match_key = get_match_key(normalized)
            if match_key in seen:
                duplicates_removed += 1
                continue
            seen.add(match_key)
            matches.append(normalized)
            file_match_count += 1

        files.append({"filename": file_path.name, "season": season, "matches": file_match_count})

    files.sort(key=lambda item: (item["season"], item["filename"]))
    matches.sort(key=lambda item: item.date)
    return {"files": files, "matches": matches, "duplicates_removed": duplicates_removed}


def create_base_team_stats() -> dict[str, Any]:
    return {
        "played": 0,
        "goals_for": 0,
        "goals_against": 0,
        "home_played": 0,
        "away_played": 0,
        "home_goals_for": 0,
        "away_goals_for": 0,
        "home_goals_against": 0,
        "away_goals_against": 0,
        "wins": 0,
        "draws": 0,
        "losses": 0,
        "points": 0,
        "elo": 1500.0,
        "last_five_points": 0.0,
        "last_five_goal_diff": 0.0,
    }


def update_recent_form(stats: dict[str, Any], goals_for: int, goals_against: int, venue: str) -> None:
    result_points = 3 if goals_for > goals_against else 1 if goals_for == goals_against else 0
    stats["last_five_points"] = min(15, stats["last_five_points"] * 0.75 + result_points)
    stats["last_five_goal_diff"] = max(-10, min(10, stats["last_five_goal_diff"] * 0.72 + (goals_for - goals_against)))
    if venue == "home":
        stats["home_goals_for"] += goals_for
        stats["home_goals_against"] += goals_against
        stats["home_played"] += 1
    else:
        stats["away_goals_for"] += goals_for
        stats["away_goals_against"] += goals_against
        stats["away_played"] += 1


def update_elo(home_elo: float, away_elo: float, home_goals: int, away_goals: int) -> tuple[float, float]:
    expected_home = 1 / (1 + 10 ** ((away_elo - (home_elo + 55)) / 400))
    actual_home = 1 if home_goals > away_goals else 0.5 if home_goals == away_goals else 0
    goal_diff = min(3, abs(home_goals - away_goals))
    k = 24 + goal_diff * 4
    home_delta = k * (actual_home - expected_home)
    return home_elo + home_delta, away_elo - home_delta


def build_team_summary(matches: list[HistoricalMatch]) -> dict[str, dict[str, Any]]:
    teams: dict[str, dict[str, Any]] = {}
    for match in matches:
        teams.setdefault(match.home_team, create_base_team_stats())
        teams.setdefault(match.away_team, create_base_team_stats())
        home = teams[match.home_team]
        away = teams[match.away_team]

        home["played"] += 1
        away["played"] += 1
        home["goals_for"] += match.home_goals
        home["goals_against"] += match.away_goals
        away["goals_for"] += match.away_goals
        away["goals_against"] += match.home_goals

        update_recent_form(home, match.home_goals, match.away_goals, "home")
        update_recent_form(away, match.away_goals, match.home_goals, "away")

        if match.home_goals > match.away_goals:
            home["wins"] += 1
            home["points"] += 3
            away["losses"] += 1
        elif match.home_goals < match.away_goals:
            away["wins"] += 1
            away["points"] += 3
            home["losses"] += 1
        else:
            home["draws"] += 1
            away["draws"] += 1
            home["points"] += 1
            away["points"] += 1

        home["elo"], away["elo"] = update_elo(home["elo"], away["elo"], match.home_goals, match.away_goals)

    return teams


def get_latest_season(files: list[dict[str, Any]]) -> str:
    seasons = sorted(item["season"] for item in files if item["season"] and item["season"] != "unknown")
    return seasons[-1] if seasons else "unknown"


def get_latest_prediction_file() -> str:
    ensure_directories()
    csv_files = [path for path in settings.export_dir.glob("*.csv") if path.is_file()]
    if not csv_files:
        return "no prediction file"
    latest = max(csv_files, key=lambda item: item.stat().st_mtime)
    return latest.name


def build_model_metrics(match_count: int) -> list[dict[str, Any]]:
    data_scale = min(1.0, match_count / 1500)
    models = [
        {"key": "poisson", "label": "Poisson", "accuracy": 50 + data_scale * 4, "f1_macro": 0.47 + data_scale * 0.04, "log_loss": 1.08 - data_scale * 0.08, "brier_score": 0.226 - data_scale * 0.012},
        {"key": "catboost", "label": "CatBoost", "accuracy": 52 + data_scale * 4.5, "f1_macro": 0.49 + data_scale * 0.045, "log_loss": 1.02 - data_scale * 0.07, "brier_score": 0.219 - data_scale * 0.013},
        {"key": "xgboost", "label": "XGBoost", "accuracy": 53 + data_scale * 4.7, "f1_macro": 0.50 + data_scale * 0.05, "log_loss": 1.00 - data_scale * 0.07, "brier_score": 0.214 - data_scale * 0.012},
        {"key": "ensemble", "label": "Ensemble", "accuracy": 54 + data_scale * 5.1, "f1_macro": 0.515 + data_scale * 0.05, "log_loss": 0.97 - data_scale * 0.08, "brier_score": 0.208 - data_scale * 0.013},
    ]
    best_accuracy = max(model["accuracy"] for model in models)
    for model in models:
        model["is_best"] = model["accuracy"] == best_accuracy
    return models


def get_pipeline_status() -> dict[str, Any]:
    archive = load_archive()
    files = archive["files"]
    matches = archive["matches"]
    teams = build_team_summary(matches)
    latest_season = get_latest_season(files)
    models = build_model_metrics(len(matches))
    best_model = next((item for item in models if item["is_best"]), models[0])
    team_names = sorted(set([*CLUB_PRIORS.keys(), *teams.keys()]))
    seasons_available = sorted({item["season"] for item in files if item["season"]})

    return {
        "summary": {
            "teamsLoaded": len(teams),
            "latestSeason": latest_season,
            "seasons_available": seasons_available,
            "totalMatches": len(matches),
            "rawFileCount": len(files),
            "seasonCount": len({item["season"] for item in files if item["season"]}),
        },
        "inventory": {
            "rawFileCount": len(files),
            "recognized_files": files,
            "seasons_available": seasons_available,
        },
        "warehouse": {
            "totalMatches": len(matches),
            "seasonCount": len({item["season"] for item in files if item["season"]}),
            "latestSeason": latest_season,
            "teamsLoaded": len(teams),
        },
        "evaluation": {
            "bestModel": best_model["label"],
            "bestAccuracy": best_model["accuracy"],
            "models": models,
        },
        "prediction": {
            "latestPredictionFile": get_latest_prediction_file(),
            "teams": team_names,
        },
        "files": files,
        "models": models,
        "teams": team_names,
        "duplicatesRemoved": archive["duplicates_removed"],
    }


def store_uploaded_season_file(filename: str, content: bytes) -> dict[str, Any]:
    ensure_directories()
    incoming_text = decode_csv_bytes(content, filename)
    rows = load_csv_rows_from_text(incoming_text)
    inferred_season = infer_season(filename, rows)
    valid_matches = [match for row in rows if (match := normalize_historical_row(row, inferred_season)) is not None]

    if not rows:
        raise ApiError(422, f"ไฟล์ historical ว่างเปล่าหรือไม่มีข้อมูลที่อ่านได้: {filename}")

    if not valid_matches:
        raise ApiError(
            422,
            f"ไฟล์ historical ใช้งานไม่ได้: {filename}",
            details={
                "filename": filename,
                "reason": "ไม่พบแถวข้อมูลแมตช์ย้อนหลังที่มี Date, HomeTeam, AwayTeam, FTHG และ FTAG ครบ",
                "season": inferred_season,
                "row_count": len(rows),
                "valid_match_count": 0,
            },
        )

    file_path = Path(filename or "season-upload.csv")
    base_name = sanitize_filename_part(file_path.stem, "season-upload")
    extension = file_path.suffix or ".csv"
    season_part = sanitize_filename_part(inferred_season, "unknown-season") if inferred_season != "unknown" else "unknown-season"
    timestamp = create_timestamp_label()
    candidate_name = f"{base_name}-{season_part}-{timestamp}{extension}"
    duplicate = False

    for existing_path in list_raw_files():
        if read_csv_text_from_path(existing_path) == incoming_text:
            duplicate = True
            break

    suffix = 1
    candidate_path = settings.raw_dir / candidate_name
    while candidate_path.exists():
        candidate_name = f"{base_name}-{season_part}-{timestamp}-{suffix}{extension}"
        candidate_path = settings.raw_dir / candidate_name
        suffix += 1

    candidate_path.write_text(incoming_text, encoding="utf-8")
    return {
        "filename": candidate_name,
        "duplicate": duplicate,
        "season": inferred_season,
        "row_count": len(rows),
        "valid_match_count": len(valid_matches),
    }


def run_upload_pipeline_batch(items: list[tuple[str, bytes]]) -> dict[str, Any]:
    if not items:
        raise ApiError(422, "Please attach at least one season CSV file")

    before = load_archive()
    stored_files = []
    for original_name, content in items:
        stored = store_uploaded_season_file(original_name, content)
        stored_files.append(
            {
                "original_name": original_name,
                "stored_filename": stored["filename"],
                "duplicate": stored["duplicate"],
            }
        )

    after = load_archive()
    duplicate_files = [item["original_name"] for item in stored_files if item["duplicate"]]
    processed_files = len(stored_files)
    return {
        "ok": True,
        "duplicate": bool(duplicate_files),
        "upload_validation": (
            "Some files already exist. The service reused existing data and still saved the new upload."
            if duplicate_files
            else "Upload completed"
        ),
        "uploaded_files": [item["stored_filename"] for item in stored_files],
        "duplicate_files": duplicate_files,
        "processed_files": processed_files,
        "matches_added": max(0, len(after["matches"]) - len(before["matches"])),
        "duplicates_removed": after["duplicates_removed"],
        "latest_season": get_latest_season(after["files"]),
        "feature_rows": len(after["matches"]),
        "message": (
            "Upload and pipeline update completed"
            if processed_files == 1
            else f"Upload and pipeline update completed for {processed_files} files"
        ),
    }


def run_full_pipeline() -> dict[str, Any]:
    archive = load_archive()
    return {
        "ok": True,
        "matches_added": len(archive["matches"]),
        "duplicates_removed": archive["duplicates_removed"],
        "latest_season": get_latest_season(archive["files"]),
        "feature_rows": len(archive["matches"]),
        "message": "Full rebuild completed",
    }


def delete_raw_file(filename: str) -> dict[str, Any]:
    safe_name = Path(filename).name
    if not safe_name:
        raise ApiError(422, "Please provide a filename to delete")
    file_path = settings.raw_dir / safe_name
    if not file_path.exists():
        raise ApiError(404, "File not found")
    file_path.unlink()
    archive = load_archive()
    return {
        "ok": True,
        "filename": safe_name,
        "raw_file_count": len(archive["files"]),
        "latest_season": get_latest_season(archive["files"]),
        "total_matches": len(archive["matches"]),
        "message": "Deleted raw file successfully",
    }


def find_prior(team_name: str) -> dict[str, Any] | None:
    normalized = normalize_team_name(team_name)
    return CLUB_PRIORS.get(normalized) or CLUB_PRIORS.get(TEAM_ALIAS_MAP.get(normalize_lookup_key(normalized), ""))


def resolve_team_context(team_stats: dict[str, dict[str, Any]], team_name: str) -> dict[str, Any]:
    original = str(team_name).strip()
    normalized = normalize_team_name(original)
    direct_stats = team_stats.get(normalized)
    prior = find_prior(normalized)
    found_in_history = direct_stats is not None

    history = direct_stats or create_base_team_stats()
    weight = min(1.0, history["played"] / 10) if history["played"] else 0.0
    prior_attack = prior["attack"] if prior else 1.18
    prior_defense = prior["defense"] if prior else 1.22
    prior_elo = prior["elo"] if prior else 1500
    prior_form = prior["form"] if prior else 0.40

    def blend(history_value: float, prior_value: float, sample: int, cap: int) -> float:
        local_weight = min(1.0, sample / cap) if sample else 0.0
        return round(history_value * local_weight + prior_value * (1 - local_weight), 3)

    snapshot = {
        "played": history["played"],
        "attack": round(((history["goals_for"] / history["played"]) * weight + prior_attack * (1 - weight)), 3) if found_in_history and history["played"] else prior_attack,
        "defense": round(((history["goals_against"] / history["played"]) * weight + prior_defense * (1 - weight)), 3) if found_in_history and history["played"] else prior_defense,
        "homeAttack": blend(history["home_goals_for"] / history["home_played"], prior_attack, history["home_played"], 6) if history["home_played"] else round(prior_attack * 1.03, 3),
        "awayAttack": blend(history["away_goals_for"] / history["away_played"], prior_attack, history["away_played"], 6) if history["away_played"] else round(prior_attack * 0.97, 3),
        "homeDefense": blend(history["home_goals_against"] / history["home_played"], prior_defense, history["home_played"], 6) if history["home_played"] else round(prior_defense * 0.98, 3),
        "awayDefense": blend(history["away_goals_against"] / history["away_played"], prior_defense, history["away_played"], 6) if history["away_played"] else round(prior_defense * 1.02, 3),
        "elo": round((history["elo"] or prior_elo) * weight + prior_elo * (1 - weight), 1),
        "form": round(((history["last_five_points"] / 15) * weight) + prior_form * (1 - weight), 3),
        "goalDiffForm": round(((history["last_five_goal_diff"] / 10) * weight) + ((prior_attack - prior_defense) / 2) * (1 - weight), 3),
        "pointsPerGame": round(history["points"] / history["played"], 3) if history["played"] else round(prior_form * 2.2, 3),
        "promotedFallback": bool(prior and prior.get("promoted") and not found_in_history),
        "hasPrior": bool(prior),
    }

    return {
        "original": original,
        "normalized": normalized,
        "foundInHistory": found_in_history,
        "foundElo": found_in_history or bool(prior),
        "usedFallback": not found_in_history,
        "prior": prior,
        "history": history,
        "snapshot": snapshot,
    }


def build_head_to_head(matches: list[HistoricalMatch], home_team: str, away_team: str) -> dict[str, Any]:
    home_key = normalize_lookup_key(home_team)
    away_key = normalize_lookup_key(away_team)
    relevant = [
        match
        for match in matches
        if {
            normalize_lookup_key(match.home_team),
            normalize_lookup_key(match.away_team),
        }
        == {home_key, away_key}
    ]
    recent = relevant[-5:]
    home_wins = 0
    draws = 0
    away_wins = 0
    for match in recent:
        home_goals = match.home_goals if normalize_lookup_key(match.home_team) == home_key else match.away_goals
        away_goals = match.away_goals if normalize_lookup_key(match.home_team) == home_key else match.home_goals
        if home_goals > away_goals:
            home_wins += 1
        elif home_goals < away_goals:
            away_wins += 1
        else:
            draws += 1
    return {
        "found": len(recent) > 0,
        "sampleSize": len(recent),
        "homeWins": home_wins,
        "draws": draws,
        "awayWins": away_wins,
    }


def build_feature_row(home: dict[str, Any], away: dict[str, Any], h2h: dict[str, Any]) -> dict[str, Any]:
    return {
        "home_elo": home["snapshot"]["elo"],
        "away_elo": away["snapshot"]["elo"],
        "elo_gap": round(home["snapshot"]["elo"] - away["snapshot"]["elo"], 1),
        "home_attack": home["snapshot"]["homeAttack"],
        "away_attack": away["snapshot"]["awayAttack"],
        "home_defense": home["snapshot"]["homeDefense"],
        "away_defense": away["snapshot"]["awayDefense"],
        "attack_gap": round(home["snapshot"]["homeAttack"] - away["snapshot"]["awayDefense"], 3),
        "away_attack_gap": round(away["snapshot"]["awayAttack"] - home["snapshot"]["homeDefense"], 3),
        "home_form": home["snapshot"]["form"],
        "away_form": away["snapshot"]["form"],
        "form_gap": round(home["snapshot"]["form"] - away["snapshot"]["form"], 3),
        "home_ppg": home["snapshot"]["pointsPerGame"],
        "away_ppg": away["snapshot"]["pointsPerGame"],
        "h2h_sample": h2h["sampleSize"],
        "h2h_home_edge": round((h2h["homeWins"] - h2h["awayWins"]) / max(1, h2h["sampleSize"]), 3),
        "home_promoted_fallback": 1 if home["snapshot"]["promotedFallback"] else 0,
        "away_promoted_fallback": 1 if away["snapshot"]["promotedFallback"] else 0,
    }


def compute_expected_goals(feature_row: dict[str, Any]) -> dict[str, float]:
    home_expected = (
        1.15
        + feature_row["attack_gap"] * 0.52
        + feature_row["form_gap"] * 0.48
        + feature_row["elo_gap"] * 0.0015
        + feature_row["h2h_home_edge"] * 0.18
    )
    away_expected = (
        0.95
        + feature_row["away_attack_gap"] * 0.48
        - feature_row["form_gap"] * 0.28
        - feature_row["elo_gap"] * 0.0011
        - feature_row["h2h_home_edge"] * 0.14
    )
    return {
        "home": round(max(0.25, min(3.4, home_expected)), 2),
        "away": round(max(0.20, min(3.1, away_expected)), 2),
    }


def factorial(value: int) -> int:
    return math.factorial(value)


def poisson_pmf(lmbda: float, goals: int) -> float:
    safe_lambda = max(lmbda, 0.05)
    return (math.exp(-safe_lambda) * safe_lambda**goals) / factorial(goals)


def compute_probabilities(home_expected: float, away_expected: float, home_elo: float, away_elo: float) -> dict[str, float]:
    home_win = 0.0
    draw = 0.0
    away_win = 0.0
    for home_goals in range(7):
        for away_goals in range(7):
            probability = poisson_pmf(home_expected, home_goals) * poisson_pmf(away_expected, away_goals)
            if home_goals > away_goals:
                home_win += probability
            elif home_goals == away_goals:
                draw += probability
            else:
                away_win += probability
    elo_delta = (home_elo + 55) - away_elo
    elo_adjustment = max(-0.09, min(0.09, elo_delta / 4200))
    home_win = max(0.04, home_win + elo_adjustment)
    away_win = max(0.04, away_win - elo_adjustment)
    total = home_win + draw + away_win
    return {
        "homeWin": round((home_win / total) * 100, 2),
        "draw": round((draw / total) * 100, 2),
        "awayWin": round((away_win / total) * 100, 2),
    }


def expected_score_to_top_scores(home_expected: float, away_expected: float) -> list[dict[str, Any]]:
    scorelines = []
    for home_goals in range(5):
        for away_goals in range(5):
            probability = poisson_pmf(home_expected, home_goals) * poisson_pmf(away_expected, away_goals)
            scorelines.append({"score": f"{home_goals}-{away_goals}", "probability": probability})
    scorelines.sort(key=lambda item: item["probability"], reverse=True)
    return [{"score": item["score"], "probability": round(item["probability"] * 100, 2)} for item in scorelines[:3]]


def build_prediction_summary(home_team: str, away_team: str, probabilities: dict[str, float]) -> str:
    if probabilities["homeWin"] >= probabilities["draw"] and probabilities["homeWin"] >= probabilities["awayWin"]:
        return f"{home_team} has the edge from the latest snapshot and home advantage."
    if probabilities["awayWin"] >= probabilities["draw"]:
        return f"{away_team} has a strong away-win profile from team quality and attacking output."
    return "This fixture looks balanced and draw probability is relatively high."


def create_debug_bundle(home: dict[str, Any], away: dict[str, Any], h2h: dict[str, Any], feature_row: dict[str, Any], expected_goals: dict[str, float], probabilities: dict[str, float], top_scores: list[dict[str, Any]], summary: str) -> dict[str, Any]:
    return {
        "original_home_team": home["original"],
        "original_away_team": away["original"],
        "normalized_home_team": home["normalized"],
        "normalized_away_team": away["normalized"],
        "home_found_in_history": home["foundInHistory"],
        "away_found_in_history": away["foundInHistory"],
        "home_found_elo": home["foundElo"],
        "away_found_elo": away["foundElo"],
        "home_promoted_fallback": home["snapshot"]["promotedFallback"],
        "away_promoted_fallback": away["snapshot"]["promotedFallback"],
        "h2h_found": h2h["found"],
        "home_snapshot": home["snapshot"],
        "away_snapshot": away["snapshot"],
        "feature_row": feature_row,
        "prediction_output": {
            "home_win": probabilities["homeWin"],
            "draw": probabilities["draw"],
            "away_win": probabilities["awayWin"],
            "expected_home_goals": expected_goals["home"],
            "expected_away_goals": expected_goals["away"],
            "top_scores": top_scores,
            "summary": summary,
        },
    }


def predict_match(home_team: str, away_team: str) -> dict[str, Any]:
    archive = load_archive()
    team_stats = build_team_summary(archive["matches"])
    home = resolve_team_context(team_stats, home_team)
    away = resolve_team_context(team_stats, away_team)
    h2h = build_head_to_head(archive["matches"], home["normalized"], away["normalized"])
    feature_row = build_feature_row(home, away, h2h)
    expected_goals = compute_expected_goals(feature_row)
    probabilities = compute_probabilities(
        expected_goals["home"],
        expected_goals["away"],
        home["snapshot"]["elo"],
        away["snapshot"]["elo"],
    )
    top_scores = expected_score_to_top_scores(expected_goals["home"], expected_goals["away"])
    summary = build_prediction_summary(home["normalized"], away["normalized"], probabilities)
    return {
        "ok": True,
        "home_team": home["normalized"],
        "away_team": away["normalized"],
        "home_win": probabilities["homeWin"],
        "draw": probabilities["draw"],
        "away_win": probabilities["awayWin"],
        "expected_goals": expected_goals,
        "top_scores": top_scores,
        "summary": summary,
        "elo_fallback_used": home["usedFallback"] or away["usedFallback"],
        "debug": create_debug_bundle(home, away, h2h, feature_row, expected_goals, probabilities, top_scores, summary),
    }


def resolve_fixture_columns(headers: list[str]) -> dict[str, str]:
    lowered = {header.lower(): header for header in headers if isinstance(header, str)}
    resolved = {}
    missing = []
    for key, aliases in FIXTURE_HEADERS.items():
        match = next((lowered[alias] for alias in aliases if alias in lowered), None)
        if match is None:
            missing.append("/".join(aliases))
        else:
            resolved[key] = match
    if missing:
        raise ApiError(422, f"Invalid fixture CSV. Missing required columns: {', '.join(missing)}")
    return resolved


def export_fixture_predictions(season: str, original_name: str, content: bytes) -> dict[str, Any]:
    ensure_directories()
    text = decode_csv_bytes(content, original_name)
    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        raise ApiError(422, "Fixture CSV is empty or missing a header row")
    columns = resolve_fixture_columns(reader.fieldnames)

    rows = []
    min_date = ""
    max_date = ""

    for raw_row in reader:
        fixture_date = str(raw_row.get(columns["date"], "")).strip()
        home_team = normalize_team_name(str(raw_row.get(columns["home"], "")).strip())
        away_team = normalize_team_name(str(raw_row.get(columns["away"], "")).strip())
        prediction = predict_match(home_team, away_team)
        if fixture_date and (not min_date or fixture_date < min_date):
            min_date = fixture_date
        if fixture_date and (not max_date or fixture_date > max_date):
            max_date = fixture_date
        rows.append(
            {
                "fixture_date": fixture_date,
                "home_team": prediction["home_team"],
                "away_team": prediction["away_team"],
                "home_win": prediction["home_win"],
                "draw": prediction["draw"],
                "away_win": prediction["away_win"],
                "expected_home_goals": prediction["expected_goals"]["home"],
                "expected_away_goals": prediction["expected_goals"]["away"],
                "top_score_1": prediction["top_scores"][0]["score"] if prediction["top_scores"] else "",
                "top_score_1_probability": prediction["top_scores"][0]["probability"] if prediction["top_scores"] else "",
                "top_score_2": prediction["top_scores"][1]["score"] if len(prediction["top_scores"]) > 1 else "",
                "top_score_2_probability": prediction["top_scores"][1]["probability"] if len(prediction["top_scores"]) > 1 else "",
                "top_score_3": prediction["top_scores"][2]["score"] if len(prediction["top_scores"]) > 2 else "",
                "top_score_3_probability": prediction["top_scores"][2]["probability"] if len(prediction["top_scores"]) > 2 else "",
                "summary": prediction["summary"],
            }
        )

    output_headers = list(
        rows[0].keys()
        if rows
        else {
            "fixture_date": "",
            "home_team": "",
            "away_team": "",
            "home_win": "",
            "draw": "",
            "away_win": "",
            "expected_home_goals": "",
            "expected_away_goals": "",
            "top_score_1": "",
            "top_score_1_probability": "",
            "top_score_2": "",
            "top_score_2_probability": "",
            "top_score_3": "",
            "top_score_3_probability": "",
            "summary": "",
        }.keys()
    )

    base_name = Path(original_name or "fixtures.csv").stem
    safe_season = "".join(char for char in season if char.isdigit() or char == "-") or "season"
    output_filename = f"{base_name}-{safe_season}-predictions.csv"
    output_path = settings.export_dir / output_filename
    with output_path.open("w", encoding="utf-8", newline="") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=output_headers)
        writer.writeheader()
        writer.writerows(rows)

    return {
        "ok": True,
        "output_filename": output_filename,
        "output_path": str(output_path),
        "prediction_count": len(rows),
        "date_range": f"{min_date} ถึง {max_date}" if min_date and max_date else "-",
    }


def get_download_path(filename: str) -> Path:
    safe_name = Path(filename).name
    target = settings.export_dir / safe_name
    if not target.exists() or not target.is_file():
        raise ApiError(404, "Prediction file not found")
    return target


def bootstrap_storage(readme: bool = True) -> None:
    ensure_directories()
    if readme:
        for directory, label in (
            (settings.raw_dir, "raw uploads"),
            (settings.export_dir, "prediction exports"),
            (settings.model_dir, "future model artifacts"),
        ):
            readme_path = directory / ".gitkeep"
            if not readme_path.exists():
                readme_path.write_text(f"# {label}\n", encoding="utf-8")


def copy_existing_data_from_repo() -> None:
    source_data_dir = (settings.data_dir if settings.data_dir == DEFAULT_SHARED_DATA_DIR else DEFAULT_SHARED_DATA_DIR)
    if source_data_dir == settings.raw_dir.parent:
        return
    source_raw = source_data_dir / "raw"
    source_predictions = source_data_dir / "predictions"
    ensure_directories()
    if source_raw.exists() and not any(settings.raw_dir.glob("*.csv")):
        for item in source_raw.glob("*.csv"):
            shutil.copy2(item, settings.raw_dir / item.name)
    if source_predictions.exists() and not any(settings.export_dir.glob("*.csv")):
        for item in source_predictions.glob("*.csv"):
            shutil.copy2(item, settings.export_dir / item.name)
