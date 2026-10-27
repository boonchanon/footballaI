from __future__ import annotations

import argparse
import csv
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import pandas as pd


STANDARD_COLUMNS = [
    "Date",
    "Season",
    "Div",
    "Time",
    "HomeTeam",
    "AwayTeam",
    "HomeGoals",
    "AwayGoals",
    "Result",
    "HTHomeGoals",
    "HTAwayGoals",
    "HTResult",
    "Referee",
    "HomeShots",
    "AwayShots",
    "HomeShotsTarget",
    "AwayShotsTarget",
    "HomeFouls",
    "AwayFouls",
    "HomeCorners",
    "AwayCorners",
    "HomeYellow",
    "AwayYellow",
    "HomeRed",
    "AwayRed",
    "B365H",
    "B365D",
    "B365A",
    "SourceFile",
]

COLUMN_MAP = {
    "Date": "Date",
    "Div": "Div",
    "Time": "Time",
    "HomeTeam": "HomeTeam",
    "AwayTeam": "AwayTeam",
    "FTHG": "HomeGoals",
    "FTAG": "AwayGoals",
    "FTR": "Result",
    "HTHG": "HTHomeGoals",
    "HTAG": "HTAwayGoals",
    "HTR": "HTResult",
    "Referee": "Referee",
    "HS": "HomeShots",
    "AS": "AwayShots",
    "HST": "HomeShotsTarget",
    "AST": "AwayShotsTarget",
    "HF": "HomeFouls",
    "AF": "AwayFouls",
    "HC": "HomeCorners",
    "AC": "AwayCorners",
    "HY": "HomeYellow",
    "AY": "AwayYellow",
    "HR": "HomeRed",
    "AR": "AwayRed",
    "B365H": "B365H",
    "B365D": "B365D",
    "B365A": "B365A",
}

REQUIRED_BASE_COLUMNS = ["Date", "HomeTeam", "AwayTeam", "FTHG", "FTAG", "FTR"]
ENCODINGS = ("utf-8-sig", "cp1252", "latin-1")


@dataclass
class FileSummary:
    source_file: str
    rows_read: int
    season: str
    missing_standard_columns: list[str]


def discover_input_files(root: Path) -> list[Path]:
    candidates = []
    standard_raw_dir = root / "data" / "raw"
    if standard_raw_dir.exists():
        candidates.extend(sorted(standard_raw_dir.rglob("E0*.csv")))
    candidates.extend(sorted(root.glob("E0*.csv")))

    unique_files = []
    seen = set()
    for path in candidates:
        resolved = path.resolve()
        if resolved not in seen:
            seen.add(resolved)
            unique_files.append(path)
    return unique_files


def read_csv_rows(path: Path) -> tuple[list[str], list[list[str]]]:
    last_error: Exception | None = None
    for encoding in ENCODINGS:
        try:
            with path.open("r", encoding=encoding, newline="") as handle:
                reader = csv.reader(handle)
                header = next(reader)
                rows = list(reader)
            return header, rows
        except Exception as exc:  # pragma: no cover - defensive fallback
            last_error = exc
    raise RuntimeError(f"Failed to read {path}") from last_error


def normalize_rows(header: list[str], rows: Iterable[list[str]]) -> list[dict[str, str | None]]:
    normalized_rows = []
    header_width = len(header)

    for row in rows:
        current = list(row[:header_width])
        if len(current) < header_width:
            current.extend([""] * (header_width - len(current)))
        normalized_rows.append(dict(zip(header, current)))

    return normalized_rows


def parse_match_date(series: pd.Series) -> pd.Series:
    parsed = pd.Series(pd.NaT, index=series.index, dtype="datetime64[ns]")
    normalized = series.astype("string").str.strip()
    for date_format in ("%d/%m/%y", "%d/%m/%Y", "%Y-%m-%d"):
        missing = parsed.isna() & normalized.notna()
        if missing.any():
            parsed.loc[missing] = pd.to_datetime(
                normalized.loc[missing], format=date_format, errors="coerce"
            )
    return parsed


def season_from_date(dt: pd.Timestamp) -> str:
    start_year = dt.year if dt.month >= 7 else dt.year - 1
    end_year = (start_year + 1) % 100
    return f"{start_year}/{end_year:02d}"


def clean_file(path: Path) -> tuple[pd.DataFrame, FileSummary]:
    header, rows = read_csv_rows(path)
    records = normalize_rows(header, rows)
    df = pd.DataFrame.from_records(records)

    missing_required = [col for col in REQUIRED_BASE_COLUMNS if col not in df.columns]
    if missing_required:
        raise ValueError(f"{path.name} missing required columns: {missing_required}")

    for unnamed_col in [col for col in df.columns if col.startswith("Unnamed:")]:
        df.drop(columns=unnamed_col, inplace=True)

    df = df[df["Date"].astype(str).str.strip() != ""].copy()
    df["MatchDate"] = parse_match_date(df["Date"])
    df = df[df["MatchDate"].notna()].copy()

    df["Season"] = df["MatchDate"].map(season_from_date)
    df["SourceFile"] = path.name

    standardized = pd.DataFrame(index=df.index)
    for source_col, target_col in COLUMN_MAP.items():
        standardized[target_col] = df[source_col] if source_col in df.columns else pd.NA

    standardized["Date"] = df["MatchDate"].dt.strftime("%Y-%m-%d")
    standardized["Season"] = df["Season"]
    standardized["SourceFile"] = df["SourceFile"]

    numeric_columns = [
        "HomeGoals",
        "AwayGoals",
        "HTHomeGoals",
        "HTAwayGoals",
        "HomeShots",
        "AwayShots",
        "HomeShotsTarget",
        "AwayShotsTarget",
        "HomeFouls",
        "AwayFouls",
        "HomeCorners",
        "AwayCorners",
        "HomeYellow",
        "AwayYellow",
        "HomeRed",
        "AwayRed",
        "B365H",
        "B365D",
        "B365A",
    ]
    for column in numeric_columns:
        standardized[column] = pd.to_numeric(standardized[column], errors="coerce")

    standardized = standardized.reindex(columns=STANDARD_COLUMNS)
    standardized.sort_values(["Date", "HomeTeam", "AwayTeam"], inplace=True)
    standardized.reset_index(drop=True, inplace=True)

    season = standardized["Season"].mode().iloc[0]
    missing_standard_columns = [
        column
        for column in STANDARD_COLUMNS
        if column not in ("Date", "Season", "SourceFile")
        and standardized[column].isna().all()
    ]

    return standardized, FileSummary(
        source_file=path.name,
        rows_read=len(standardized),
        season=season,
        missing_standard_columns=missing_standard_columns,
    )


def build_dataset(root: Path) -> tuple[pd.DataFrame, list[FileSummary]]:
    input_files = discover_input_files(root)
    if not input_files:
        raise FileNotFoundError("No E0*.csv files found in workspace root or data/raw.")

    cleaned_frames = []
    summaries = []
    for path in input_files:
        frame, summary = clean_file(path)
        cleaned_frames.append(frame)
        summaries.append(summary)

    dataset = pd.concat(cleaned_frames, ignore_index=True)
    dataset.sort_values(["Date", "HomeTeam", "AwayTeam"], inplace=True)
    dataset.reset_index(drop=True, inplace=True)
    return dataset, summaries


def write_outputs(root: Path, dataset: pd.DataFrame, summaries: list[FileSummary]) -> None:
    processed_dir = root / "data" / "processed"
    processed_dir.mkdir(parents=True, exist_ok=True)

    dataset_path = processed_dir / "matches_standardized.csv"
    report_path = processed_dir / "cleaning_report.json"

    dataset.to_csv(dataset_path, index=False)

    report = {
        "total_matches": int(len(dataset)),
        "seasons": sorted(dataset["Season"].dropna().unique().tolist()),
        "date_range": {
            "min": dataset["Date"].min(),
            "max": dataset["Date"].max(),
        },
        "files": [
            {
                "source_file": item.source_file,
                "season": item.season,
                "rows_read": item.rows_read,
                "missing_standard_columns": item.missing_standard_columns,
            }
            for item in summaries
        ],
        "missing_values": dataset.isna().sum().to_dict(),
    }

    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Standardize Football-Data Premier League CSV files into one clean dataset."
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=Path.cwd(),
        help="Project root containing either data/raw or E0*.csv files.",
    )
    args = parser.parse_args()

    dataset, summaries = build_dataset(args.root)
    write_outputs(args.root, dataset, summaries)

    print(f"Cleaned {len(summaries)} files into {len(dataset)} matches.")
    print("Output: data/processed/matches_standardized.csv")
    print("Report: data/processed/cleaning_report.json")


if __name__ == "__main__":
    main()
