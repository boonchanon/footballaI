import hashlib
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from src.features.elo_rating import add_elo_features,EloConfig
from src.features.goal_rate_feature_expansion_v1 import add_expansion_features,FAMILIES,ALL_NEW
from src.models.input_parity_no_odds import prepare,ODDS_COLUMNS
from src.models.score_dependency import independent_matrix,top_scores
from src.evaluation.goal_rate_feature_expansion_v1 import OUT,P3,P4,P5,P6,SOURCE,VARIANTS,variant_columns,phase3_meta,load_data


def small_history():
    raw=pd.DataFrame([
        dict(Date="2024-01-01",HomeTeam="A",AwayTeam="B",HomeGoals=2,AwayGoals=0,Result="H"),
        dict(Date="2024-01-03",HomeTeam="C",AwayTeam="A",HomeGoals=0,AwayGoals=1,Result="A"),
        dict(Date="2024-01-05",HomeTeam="A",AwayTeam="D",HomeGoals=1,AwayGoals=1,Result="D"),
        dict(Date="2024-01-10",HomeTeam="A",AwayTeam="B",HomeGoals=0,AwayGoals=0,Result="D"),
        dict(Date="2024-01-11",HomeTeam="B",AwayTeam="D",HomeGoals=2,AwayGoals=1,Result="H")])
    raw.Date=pd.to_datetime(raw.Date)
    return add_elo_features(raw,EloConfig())


def test_frozen_phase3_baseline_targets_fixtures_and_matrices():
    report=json.loads((OUT/"report.json").read_text())
    assert report["methods"]["A_baseline"]["exact_hits"]==96
    assert report["methods"]["A_baseline"]["dc_exact_hits"]==99
    base,splits=load_data()
    assert [len(splits[k]) for k in ("train","validation","test")]==[11564,380,760]
    assert list(json.loads((OUT/"data_manifest.json").read_text())["target_columns"])==["HomeGoals","AwayGoals"]
    rates=np.load(OUT/"A_baseline_rates.npy")
    assert np.array_equal(rates,np.load(P3/"diagnostic_rates.npz")["xgb"])
    predictions=pd.read_csv(OUT/"predictions.csv")
    frame=predictions[predictions.Variant=="A_baseline"]
    old=pd.read_csv(P3/"pure_xgb_matches.csv")
    assert frame.Top1Score.tolist()==old.PredictedScore.tolist()
    assert list(frame[["Date","HomeTeam","AwayTeam"]].itertuples(index=False,name=None))==list(
        old[["Date","HomeTeam","AwayTeam"]].itertuples(index=False,name=None))
    for name in VARIANTS:
        rates=np.load(OUT/f"{name}_rates.npy")
        assert rates.shape==(760,2) and np.isfinite(rates).all() and (rates>0).all()
        matrix=independent_matrix(*rates[0])
        assert (matrix>=0).all() and np.isclose(matrix.sum(),1)
        h,a=map(int,top_scores(matrix,1)[0][0].split("-"))
        assert 0<=h<=6 and 0<=a<=6


def test_current_and_future_result_mutations_do_not_change_current_features():
    original=small_history()
    target=3
    before,trace=add_expansion_features(original,trace_indices={target})
    changed_current=original.copy()
    changed_current.loc[target,["HomeGoals","AwayGoals","Result"]]=[6,0,"H"]
    after_current,_=add_expansion_features(changed_current)
    changed_future=original.copy()
    changed_future.loc[4,["HomeGoals","AwayGoals","Result"]]=[0,4,"A"]
    after_future,_=add_expansion_features(changed_future)
    pd.testing.assert_series_equal(before.loc[target],after_current.loc[target])
    pd.testing.assert_series_equal(before.loc[target],after_future.loc[target])
    assert all(item["date"]<trace[target]["fixture_date"] for key in
        ("home_prior_matches","away_prior_matches") for item in trace[target][key])


def test_elo_venue_opponent_and_congestion_are_strictly_prior():
    base=small_history()
    feature,_=add_expansion_features(base)
    target=feature.iloc[3]
    assert np.isclose(target.HomeHomeGFLast5,1.5) # A's two earlier HOME games: 2 and 1.
    assert np.isclose(target.HomeHomeGALast5,.5)
    assert np.isclose(target.HomeHomePointsLast5,2)
    assert np.isclose(target.HomeHomeWinRateLast5,.5)
    assert target.HomeMatchesLast7Days==2 and target.AwayMatchesLast7Days==0
    assert target.HomeMatchesLast14Days==3 and target.AwayMatchesLast14Days==1
    # Last five all-venue Elo trajectory uses ratings after prior matches, not target result.
    assert np.isclose(target.HomeEloTrendLast5,
        base.loc[3,"HomeEloPre"]-base.loc[0,"HomeEloPre"],atol=1e-10)
    varied=base.copy()
    varied.loc[1,"HomeEloPre"]=1600 # Prior opponent C's PRE-match strength only.
    adjusted,_=add_expansion_features(varied)
    assert np.isclose(adjusted.loc[3,"HomeOpponentAdjustedGFLast5"]-
        feature.loc[3,"HomeOpponentAdjustedGFLast5"],.25/3)
    assert np.isclose(adjusted.loc[3,"HomeOpponentAdjustedGALast5"]-
        feature.loc[3,"HomeOpponentAdjustedGALast5"],-.25/3)


def test_feature_order_and_saved_training_fills_no_odds():
    old=phase3_meta()
    trained=json.loads((OUT/"training_manifest.json").read_text())
    source,splits=load_data()
    new=pd.read_csv(OUT/"new_features.csv")
    for name in VARIANTS:
        record=trained["variants"][name]
        meta=joblib.load(OUT/f"{name}_metadata.joblib")
        assert meta["feature_columns"]==variant_columns(name,old["feature_columns"])
        assert meta["feature_columns"]==record["feature_columns"]
        assert not set(meta["feature_columns"])&set(ODDS_COLUMNS)
        assert all(meta["imputation_values"][column]==old["imputation_values"][column]
                   for column in old["feature_columns"])
        for column in meta["feature_columns"][123:]:
            train=new.loc[splits["train"].index,column]
            expected=float(train.median()) if train.notna().any() else 0.0
            assert np.isclose(meta["imputation_values"][column],expected)
        one=pd.concat([source.loc[[splits["test"].index[0]],old["feature_columns"]],
                       new.loc[[splits["test"].index[0]],meta["feature_columns"][123:]]],axis=1)
        prepared=prepare(one[meta["feature_columns"]],meta)
        assert list(prepared.columns)==meta["feature_columns"] and not prepared.isna().any().any()


def test_combined_composition_fixed_and_prior_hashes():
    manifest=json.loads((OUT/"data_manifest.json").read_text())
    trained=json.loads((OUT/"training_manifest.json").read_text())
    assert manifest["diagnostic_outcomes_used_to_choose_features"] is False
    assert trained["combined_composition_fixed_before_diagnostic"] is True
    assert manifest["pre_registered_variants"]["F_combined"]==list(FAMILIES)
    digest=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
    assert digest(SOURCE)==manifest["source_sha256"]
    for name,expected in manifest["phase3_artifact_sha256"].items():
        assert digest(P3/name)==expected
    assert digest(P4/"score_matrices.npz")==manifest["phase4_matrices_sha256"]
    assert json.loads((OUT/"report.json").read_text())["fixed_dc_rho"]==manifest["fixed_dc_rho"]
    for parent,key in ((P5,"phase5_protected_sha256"),(P6,"phase6_protected_sha256")):
        for name,expected in manifest[key].items():
            assert digest(parent/name)==expected
    phase2=json.loads(Path("data/processed/input_parity_no_odds_v1/baseline_manifest.json").read_text())
    for name,expected in phase2["source_sha256"].items():
        assert digest(Path(name))==expected
