import hashlib

import pandas as pd

from src.evaluation.exact_score_error_attribution_v1 import OUT, P12, prepare, taxonomy


def test_raw_baseline_reproduction_and_no_future_season():
    d = prepare()
    primary = d[d.Season.isin(["2018/19", "2019/20", "2020/21", "2021/22", "2022/23", "2023/24"])]
    diagnostic = d[d.Season.isin(["2024/25", "2025/26"])]
    assert len(primary) == 2280 and int(primary.Exact.sum()) == 254
    assert len(diagnostic) == 760 and int(diagnostic.Exact.sum()) == 90
    assert not d.Season.str.startswith("2026").any()


def test_taxonomy_is_deterministic_and_transition_counts_sum():
    d = prepare()
    first = taxonomy(d)
    second = taxonomy(d)
    assert first.PrimaryErrorClass.equals(second.PrimaryErrorClass)
    transitions = pd.read_csv(OUT / "score_transition_map.csv")
    assert int(transitions[transitions.Period == "PreDiagnostic"].Count.sum()) == 2280
    assert int(transitions[transitions.Period == "InspectedDiagnostic"].Count.sum()) == 760


def test_high_and_low_autopsy_partitions_are_complete():
    high = pd.read_csv(OUT / "high_score_autopsy.csv")
    low = pd.read_csv(OUT / "low_score_autopsy.csv")
    assert int(high[high.Breakdown == "Total"].N.sum()) == 740
    assert int(high[high.Breakdown == "Type"].N.sum()) == 740
    assert int(low.N.sum()) == 487


def test_oof_chronology_and_asof_sources():
    d = prepare()
    rates = pd.read_csv(P12 / "fixture_oof_rates.csv", parse_dates=["Date"])
    for season in ["2018/19", "2019/20", "2020/21", "2021/22", "2022/23", "2023/24"]:
        year = int(season[:4])
        assert rates.loc[rates.Season.str[:4].astype(int) < year, "Date"].max() < rates.loc[rates.Season == season, "Date"].min()
    # Saved as-of builders use sources strictly before the fixture calendar date.
    for source in ["LatestResultSourceDate", "LatestXGSourceDate"]:
        valid = d[source].notna()
        assert (pd.to_datetime(d.loc[valid, source]) < pd.to_datetime(d.loc[valid, "Date"])).all()


def test_protected_forecast_hash_unchanged():
    path = "data/processed/predictions_2026_27_latest/predictions_raw.csv"
    assert hashlib.sha256(open(path, "rb").read()).hexdigest() == "0afa806c8e26b9fa2a354b760128955ad40fa85b7b592bd11aa0fd3a2923f8e3"
