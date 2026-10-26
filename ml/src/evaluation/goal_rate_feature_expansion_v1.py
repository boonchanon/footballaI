"""Phase-7 frozen XGB feature-family ablations and exact-score diagnostics."""
from __future__ import annotations

import json
from datetime import datetime,timezone

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from scipy.stats import poisson

from src.models.ml_goal_rates_v1 import ROOT,OUT as P3,sha,FLOOR
from src.evaluation.score_dependency_v1 import OUT as P4
from src.evaluation.score_calibration_v1 import reproduce,OUT as P5
from src.evaluation.outcome_aware_score_selection_v1 import OUT as P6
from src.models.model_utils import load_feature_data,split_by_season
from src.models.input_parity_no_odds import prepare,ODDS_COLUMNS
from src.models.score_dependency import independent_matrix,dixon_coles_matrix,top_scores
from src.features.goal_rate_feature_expansion_v1 import FAMILIES,ALL_NEW,add_expansion_features

OUT=ROOT/"data/processed/goal_rate_feature_expansion_v1"
SOURCE=ROOT/"data/processed/features_matches.csv"
VARIANTS=("A_baseline","B_elo","C_venue","D_opponent","E_congestion","F_combined")
VARIANT_GROUPS={"A_baseline":(),"B_elo":("elo",),"C_venue":("venue",),
    "D_opponent":("opponent",),"E_congestion":("congestion",),
    "F_combined":("elo","venue","opponent","congestion")}
SCORES=("0-0","1-0","0-1","1-1","2-0","0-2","2-1","1-2","2-2","3-0",
        "0-3","3-1","1-3","3-2","2-3")


def timestamp():
    return datetime.now(timezone.utc).isoformat()


def phase3_meta():
    meta=joblib.load(P3/"metadata.joblib")
    if meta["feature_version"]!="legacy_v1" or meta["odds_included"] is not False or \
       len(meta["feature_columns"])!=123 or any(name in ODDS_COLUMNS for name in meta["feature_columns"]):
        raise ValueError("Frozen Phase-3 metadata invalid")
    return meta


def load_data():
    base=load_feature_data(SOURCE)
    splits=split_by_season(base)
    if [len(splits[k]) for k in ("train","validation","test")]!=[11564,380,760]:
        raise ValueError("Phase-3 split rows changed")
    return base,splits


def freeze_features():
    if OUT.exists():
        raise FileExistsError("Refusing to overwrite Phase-7 output")
    reproduce() # 96/760 independent and 99/760 fixed DC, match by match.
    meta=phase3_meta()
    base,splits=load_data()
    prior=json.loads((P3/"baseline_freeze.json").read_text(encoding="utf-8"))
    if sha(SOURCE)!=prior["feature_data_sha256"]:
        raise ValueError("Frozen source features changed")
    for name,expected in json.loads((P3/"training_manifest.json").read_text())["artifacts"].items():
        if sha(P3/name)!=expected:
            raise ValueError("Protected Phase-3 model changed")
    traces={base.index[splits["test"].index[0]],base.index[splits["test"].index[200]],
            base.index[splits["test"].index[400]]}
    expanded,trace=add_expansion_features(base,trace_indices=traces)
    if set(ALL_NEW)&set(base.columns) or expanded.shape!=(len(base),len(ALL_NEW)):
        raise ValueError("New features duplicated existing features or changed row count")
    for entry in trace.values():
        fixture=entry["fixture_date"]
        for key in ("home_prior_matches","away_prior_matches"):
            if any(match["date"]>=fixture for match in entry[key]):
                raise ValueError("As-of spot check found current/future source match")
    OUT.mkdir(parents=True)
    expanded.to_csv(OUT/"new_features.csv",index=False)
    (OUT/"asof_spot_checks.json").write_text(json.dumps(trace,indent=2),encoding="utf-8")
    integrity=[]
    for family,columns in FAMILIES.items():
        for column in columns:
            if family=="elo":
                definition="post-match Elo after latest previous appearance minus pre-match Elo before oldest of last five previous appearances; fixed K=20"
                window="last 5 all-venue appearances"
            elif family=="venue":
                definition="mean of prior five team matches at today's home/away venue; GF, GA, points or win indicator"
                window="last 5 prior correct-venue matches"
            elif family=="opponent":
                definition="last-five mean: GF+(opponent pre-Elo−1500)/400, GA−same strength, or 3*(actual Elo score−pre-match expected score)"
                window="last 5 prior all-venue matches"
            else:
                definition="number of strictly prior team fixtures 1–7 or 1–14 calendar days earlier; difference is home minus away"
                window="prior 7/14 days"
            integrity.append(dict(Family=family,Feature=column,Definition=definition,
                DataSource="existing features_matches.csv, dated historical fixtures and frozen existing Elo",
                HistoricalWindow=window,AsOfRule="all fixture rows on date read before same-date updates; source date < fixture date",
                FirstAvailableSeason="1993/94",MissingPolicy="new train numeric median; zero only if entire train column missing",
                PreKickoffAvailable=True))
    pd.DataFrame(integrity).to_csv(OUT/"feature_integrity.csv",index=False)
    missing=[]
    for split,frame in splits.items():
        part=expanded.loc[frame.index]
        for column in ALL_NEW:
            missing.append(dict(Split=split,Feature=column,MissingCount=int(part[column].isna().sum()),
                Matches=len(part),MissingPct=100*part[column].isna().mean()))
    pd.DataFrame(missing).to_csv(OUT/"feature_missingness.csv",index=False)
    correlation=[]
    numeric=base[meta["feature_columns"]].apply(pd.to_numeric,errors="coerce")
    for new in ALL_NEW:
        correlations=numeric.corrwith(expanded[new]).dropna()
        for old,value in correlations.items():
            if abs(value)>=.90:
                correlation.append(dict(NewFeature=new,ExistingFeature=old,PearsonR=float(value)))
    pd.DataFrame(correlation,columns=("NewFeature","ExistingFeature","PearsonR")).to_csv(
        OUT/"feature_redundancy.csv",index=False)
    manifest=dict(experiment="goal_rate_feature_expansion_v1",created_utc=timestamp(),
        source_sha256=sha(SOURCE),new_features_sha256=sha(OUT/"new_features.csv"),
        feature_version="legacy_v1",baseline_feature_columns=meta["feature_columns"],
        pre_registered_families={name:list(columns) for name,columns in FAMILIES.items()},
        pre_registered_variants={name:list(groups) for name,groups in VARIANT_GROUPS.items()},
        train_seasons="1993/94-2022/23",validation_season="2023/24",
        diagnostic_seasons="2024/25-2025/26",rows={key:len(frame) for key,frame in splits.items()},
        xgb_hyperparameters=meta["xgb_hyperparameters"],objective="count:poisson",seed=42,
        target_columns=["HomeGoals","AwayGoals"],lambda_floor=FLOOR,
        imputation="frozen Phase-3 train fills for baseline columns; train numeric medians for new columns",
        score_grid="0..6 per side",fixed_dc_rho=json.loads((P4/"parameter_fit.json").read_text())["rho"],
        phase3_artifact_sha256=json.loads((P3/"training_manifest.json").read_text())["artifacts"],
        phase4_matrices_sha256=sha(P4/"score_matrices.npz"),
        phase5_protected_sha256={n:sha(P5/n) for n in ("report.json","calibration_parameters.json","final_report.md")},
        phase6_protected_sha256={n:sha(P6/n) for n in ("report.json","final_report.md","rank_flips.csv")},
        diagnostic_outcomes_used_to_choose_features=False,
        limitation="Historical diagnostic seasons repeatedly inspected; validation used for early stopping")
    (OUT/"data_manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")
    print("Frozen features",len(base),len(ALL_NEW),"redundant pairs",len(correlation))


def variant_columns(name,base_columns):
    return list(base_columns)+[column for group in VARIANT_GROUPS[name] for column in FAMILIES[group]]


def train_models():
    if (OUT/"training_manifest.json").exists():
        raise FileExistsError("Refusing to overwrite Phase-7 frozen model manifest")
    manifest=json.loads((OUT/"data_manifest.json").read_text())
    if sha(SOURCE)!=manifest["source_sha256"] or sha(OUT/"new_features.csv")!=manifest["new_features_sha256"]:
        raise ValueError("Training source changed")
    base,splits=load_data()
    new=pd.read_csv(OUT/"new_features.csv")
    new.index=base.index
    data=pd.concat([base,new],axis=1)
    old=phase3_meta()
    if manifest["baseline_feature_columns"]!=old["feature_columns"]:
        raise ValueError("Baseline feature list changed")
    fit_records={}
    val_records=[]
    for name in VARIANTS:
        # B-E are independently fit/evaluated on pre-test validation before F.
        columns=variant_columns(name,old["feature_columns"])
        fills=old["imputation_values"].copy()
        for column in columns[123:]:
            numeric=pd.to_numeric(data.loc[splits["train"].index,column],errors="coerce")
            fills[column]=float(numeric.median()) if numeric.notna().any() else 0.0
        metadata=dict(experiment="goal_rate_feature_expansion_v1",variant=name,feature_columns=columns,
            feature_version="legacy_v1",imputation_values=fills,odds_included=False,
            train_seasons="1993/94-2022/23",validation_seasons="2023/24",random_seed=42)
        joblib.dump(metadata,OUT/f"{name}_metadata.joblib")
        features={key:prepare(data.loc[frame.index,columns],metadata) for key,frame in splits.items()}
        rates=[]
        val_rates=[]
        iterations={}
        importance=[]
        for side,target in (("home","HomeGoals"),("away","AwayGoals")):
            model=xgb.XGBRegressor(objective="count:poisson",eval_metric="poisson-nloglik",
                random_state=42,enable_categorical=True,**old["xgb_hyperparameters"])
            model.fit(features["train"],splits["train"][target].astype(float),
                eval_set=[(features["validation"],splits["validation"][target].astype(float))],verbose=False)
            model.save_model(OUT/f"{name}_{side}.json")
            iterations[side]=int(model.best_iteration)
            rates.append(model.predict(features["test"]))
            val_rates.append(model.predict(features["validation"]))
            for feature,value in model.get_booster().get_score(importance_type="gain").items():
                importance.append(dict(Variant=name,Side=side,Feature=feature,Gain=float(value),
                    NewFeature=feature in ALL_NEW))
        test_rates=np.maximum(np.column_stack(rates),FLOOR)
        validation_rates=np.maximum(np.column_stack(val_rates),FLOOR)
        np.save(OUT/f"{name}_rates.npy",test_rates)
        np.save(OUT/f"{name}_validation_rates.npy",validation_rates)
        pd.DataFrame(importance).to_csv(OUT/f"{name}_feature_importance.csv",index=False)
        actual=splits["validation"][["HomeGoals","AwayGoals"]].to_numpy(dtype=int)
        scores=[top_scores(independent_matrix(*r),1)[0][0] for r in validation_rates]
        val_hits=sum(score==f"{h}-{a}" for score,(h,a) in zip(scores,actual))
        val_records.append(dict(Variant=name,ValidationMatches=380,ValidationExactHits=val_hits,
            ValidationAccuracy=val_hits/380,HomeBestIteration=iterations["home"],
            AwayBestIteration=iterations["away"]))
        if name=="A_baseline":
            frozen=np.load(P3/"diagnostic_rates.npz")["xgb"]
            prior=pd.read_csv(P3/"pure_xgb_matches.csv")
            test_scores=[top_scores(independent_matrix(*r),1)[0][0] for r in test_rates]
            if not np.array_equal(test_rates,frozen) or test_scores!=prior.PredictedScore.tolist():
                raise ValueError("Baseline XGB retraining failed")
            print("Phase-3 baseline exact rates and scorelines reproduced; expected hits 96/760")
        fit_records[name]=dict(feature_count=len(columns),feature_columns=columns,
            imputation_values=fills,iterations=iterations,validation_exact_hits=val_hits,
            model_sha256={side:sha(OUT/f"{name}_{side}.json") for side in ("home","away")},
            metadata_sha256=sha(OUT/f"{name}_metadata.joblib"),
            rates_sha256=sha(OUT/f"{name}_rates.npy"),
            validation_rates_sha256=sha(OUT/f"{name}_validation_rates.npy"))
        print(name,"validation",val_hits,"/380",iterations)
    pd.DataFrame(val_records).to_csv(OUT/"pretest_validation.csv",index=False)
    record=dict(experiment="goal_rate_feature_expansion_v1",created_utc=timestamp(),
        fitting="same train/validation split, count:poisson, XGB parameters/seed/early stopping as Phase 3",
        combined_composition_fixed_before_diagnostic=True,diagnostic_outcomes_used_for_training=False,
        baseline_reproduction="test rates bitwise identical to Phase 3; all Top-1 scorelines identical",
        variants=fit_records)
    (OUT/"training_manifest.json").write_text(json.dumps(record,indent=2),encoding="utf-8")


def prediction_rows(source,rates,name,rho):
    rows=[]
    for i,match in enumerate(source.itertuples(index=False)):
        h,a=map(float,rates[i]); x,y=int(match.ActualHomeGoals),int(match.ActualAwayGoals)
        independent=independent_matrix(h,a)
        dc=dixon_coles_matrix(h,a,rho)
        score=top_scores(independent,1)[0][0]
        dc_score=top_scores(dc,1)[0][0]
        actual=f"{x}-{y}"
        rows.append(dict(Variant=name,Date=match.Date,Season=match.Season,HomeTeam=match.HomeTeam,
            AwayTeam=match.AwayTeam,ActualHomeGoals=x,ActualAwayGoals=y,ActualScore=actual,
            lambda_home=h,lambda_away=a,lambda_diff=h-a,
            Top1Score=score,Top1Probability=top_scores(independent,1)[0][1],ExactCorrect=score==actual,
            DCTop1Score=dc_score,DCExactCorrect=dc_score==actual,
            HomeGoalAbsError=abs(h-x),AwayGoalAbsError=abs(a-y),
            PoissonJointNLL=float(-poisson.logpmf(x,h)-poisson.logpmf(y,a)),
            ActualOutcome="H" if x>y else "A" if x<y else "D",
            ActualTotalGoals=x+y))
    return pd.DataFrame(rows)


def describe_column(values):
    return dict(mean=float(values.mean()),std=float(values.std(ddof=0)),variance=float(values.var(ddof=0)),
        min=float(values.min()),q25=float(values.quantile(.25)),median=float(values.median()),
        q75=float(values.quantile(.75)),max=float(values.max()))


def summarize(frame):
    counts=frame.Top1Score.value_counts().to_dict()
    probs=np.array(list(counts.values()),dtype=float)/len(frame)
    return dict(matches=len(frame),feature_count=None,exact_hits=int(frame.ExactCorrect.sum()),
        exact_top1=float(frame.ExactCorrect.mean()),dc_exact_hits=int(frame.DCExactCorrect.sum()),
        home_goal_mae=float(frame.HomeGoalAbsError.mean()),away_goal_mae=float(frame.AwayGoalAbsError.mean()),
        combined_goal_mae=float((frame.HomeGoalAbsError.mean()+frame.AwayGoalAbsError.mean())/2),
        untruncated_poisson_joint_nll=float(frame.PoissonJointNLL.mean()),
        lambda_dispersion={name:describe_column(frame[column]) for name,column in
            (("home","lambda_home"),("away","lambda_away"),("diff","lambda_diff"))},
        score_counts=counts,most_common_score=max(counts,key=counts.get),
        most_common_count=max(counts.values()),unique_scorelines=len(counts),
        top1_entropy_nats=float(-(probs*np.log(probs)).sum()),
        count_1_1=int(counts.get("1-1",0)),count_2_1=int(counts.get("2-1",0)),
        count_1_0=int(counts.get("1-0",0)),count_0_1=int(counts.get("0-1",0)),
        count_0_0=int(counts.get("0-0",0)),count_2_2=int(counts.get("2-2",0)),
        season_exact={season:int(part.ExactCorrect.sum()) for season,part in frame.groupby("Season")},
        season_dc_exact={season:int(part.DCExactCorrect.sum()) for season,part in frame.groupby("Season")})


def evaluate():
    if (OUT/"report.json").exists():
        raise FileExistsError("Refusing to overwrite Phase-7 diagnostic report")
    source,rates0,fit0=reproduce()
    data=json.loads((OUT/"data_manifest.json").read_text())
    trained=json.loads((OUT/"training_manifest.json").read_text())
    if sha(SOURCE)!=data["source_sha256"] or sha(OUT/"new_features.csv")!=data["new_features_sha256"]:
        raise ValueError("Phase-7 source changed")
    for name,record in trained["variants"].items():
        for side,expected in record["model_sha256"].items():
            if sha(OUT/f"{name}_{side}.json")!=expected:
                raise ValueError("Frozen Phase-7 model changed")
        if sha(OUT/f"{name}_rates.npy")!=record["rates_sha256"]:
            raise ValueError("Frozen Phase-7 rates changed")
    frames={}
    methods={}
    for name in VARIANTS:
        rates=np.load(OUT/f"{name}_rates.npy")
        if rates.shape!=(760,2) or not np.isfinite(rates).all() or (rates<=0).any():
            raise ValueError("Invalid goal rates")
        frame=prediction_rows(source,rates,name,fit0["rho"])
        frames[name]=frame
        methods[name]=summarize(frame)
        methods[name]["feature_count"]=trained["variants"][name]["feature_count"]
    if not np.array_equal(np.load(OUT/"A_baseline_rates.npy"),rates0) or \
       int(frames["A_baseline"].ExactCorrect.sum())!=96 or \
       frames["A_baseline"].Top1Score.tolist()!=pd.read_csv(P4/"independent_predictions.csv").Top1Score.tolist() or \
       int(frames["A_baseline"].DCExactCorrect.sum())!=99:
        raise ValueError("Phase-7 baseline diagnostic reproduction failed")
    pd.concat(list(frames.values())).to_csv(OUT/"predictions.csv",index=False)
    pd.DataFrame([dict(Variant=name,FeatureCount=methods[name]["feature_count"],
        IndependentHits=methods[name]["exact_hits"],IndependentAccuracy=methods[name]["exact_top1"],
        DeltaHitsVsBaseline=methods[name]["exact_hits"]-96,
        DeltaPercentagePoints=100*(methods[name]["exact_top1"]-96/760),
        FixedDCHits=methods[name]["dc_exact_hits"],HomeGoalMAE=methods[name]["home_goal_mae"],
        AwayGoalMAE=methods[name]["away_goal_mae"],CombinedGoalMAE=methods[name]["combined_goal_mae"],
        JointPoissonNLL=methods[name]["untruncated_poisson_joint_nll"],
        Hits2024_25=methods[name]["season_exact"]["2024/25"],
        Hits2025_26=methods[name]["season_exact"]["2025/26"])
        for name in VARIANTS]).to_csv(OUT/"variant_metrics.csv",index=False)
    pd.DataFrame([dict(Variant=name,RateType=kind,**values)
        for name in VARIANTS for kind,values in methods[name]["lambda_dispersion"].items()]).to_csv(
        OUT/"lambda_diagnostics.csv",index=False)
    actual=frames["A_baseline"].ActualScore.value_counts().to_dict()
    scores=sorted(set(actual)|set().union(*(set(frame.Top1Score) for frame in frames.values())),
        key=lambda score:tuple(map(int,score.split("-"))))
    pd.DataFrame([dict(Score=score,ActualCount=int(actual.get(score,0)),ActualPct=100*actual.get(score,0)/760,
        **{f"{name}Count":int((frames[name].Top1Score==score).sum()) for name in VARIANTS},
        **{f"{name}Pct":100*(frames[name].Top1Score==score).sum()/760 for name in VARIANTS})
        for score in scores]).to_csv(OUT/"score_distribution.csv",index=False)
    baseline=frames["A_baseline"]
    flips={}
    flip_rows=[]
    for name in VARIANTS[1:]:
        fresh=frames[name]
        changed=baseline.Top1Score!=fresh.Top1Score
        gain=(~baseline.ExactCorrect)&fresh.ExactCorrect
        loss=baseline.ExactCorrect&(~fresh.ExactCorrect)
        other=changed&(~gain)&(~loss)
        flips[name]=dict(changed_top1=int(changed.sum()),gained=int(gain.sum()),
            lost=int(loss.sum()),wrong_to_different_wrong=int(other.sum()),
            net_exact_hits=int(gain.sum()-loss.sum()))
        for i in np.flatnonzero(changed.to_numpy()):
            row=fresh.iloc[i]; old=baseline.iloc[i]
            flip_rows.append(dict(Variant=name,Date=row.Date,HomeTeam=row.HomeTeam,AwayTeam=row.AwayTeam,
                ActualScore=row.ActualScore,BaselineLambdaHome=old.lambda_home,
                BaselineLambdaAway=old.lambda_away,BaselineScore=old.Top1Score,
                VariantLambdaHome=row.lambda_home,VariantLambdaAway=row.lambda_away,
                VariantScore=row.Top1Score,DeltaLambdaHome=row.lambda_home-old.lambda_home,
                DeltaLambdaAway=row.lambda_away-old.lambda_away,
                BaselineCorrect=bool(old.ExactCorrect),VariantCorrect=bool(row.ExactCorrect),
                FlipType="gain" if gain.iloc[i] else "loss" if loss.iloc[i] else "other"))
    pd.DataFrame(flip_rows).to_csv(OUT/"rank_flips.csv",index=False)
    subtypes=[]
    for name,frame in frames.items():
        frame=frame.copy()
        frame["TotalGoalsGroup"]=pd.cut(frame.ActualTotalGoals,[-1,1,2,3,100],labels=["0-1","2","3","4+"])
        for group,column in (("ActualOutcome","ActualOutcome"),("ActualTotalGoals","TotalGoalsGroup")):
            for value,part in frame.groupby(column,observed=True):
                subtypes.append(dict(Variant=name,Group=group,Type=str(value),Matches=len(part),
                    MeanLambdaHome=float(part.lambda_home.mean()),MeanLambdaAway=float(part.lambda_away.mean()),
                    HomeGoalMAE=float(part.HomeGoalAbsError.mean()),AwayGoalMAE=float(part.AwayGoalAbsError.mean()),
                    ExactHits=int(part.ExactCorrect.sum()),ExactAccuracy=float(part.ExactCorrect.mean())))
    pd.DataFrame(subtypes).to_csv(OUT/"lambda_error_by_match_type.csv",index=False)
    teams=[]
    for name,frame in frames.items():
        for team in sorted(set(frame.HomeTeam)|set(frame.AwayTeam)):
            part=frame[(frame.HomeTeam==team)|(frame.AwayTeam==team)]
            teams.append(dict(Variant=name,Team=team,Matches=len(part),ExactHits=int(part.ExactCorrect.sum()),
                Misses=int((~part.ExactCorrect).sum())))
    pd.DataFrame(teams).to_csv(OUT/"team_level_stability.csv",index=False)
    report=dict(experiment="goal_rate_feature_expansion_v1",created_utc=timestamp(),
        primary_metric="exact-score Top-1 under independent Poisson global argmax",
        baseline_reproduction="A rates bitwise identical and Top-1 scorelines identical to Phase 3; 96/760 and fixed DC 99/760",
        methods=methods,flips=flips,best_phase7_variant=max(VARIANTS,key=lambda name:(methods[name]["exact_hits"],-VARIANTS.index(name))),
        fixed_dc_rho=fit0["rho"],pretest_validation_file="pretest_validation.csv",
        diagnostic_outcomes_used_to_tune=False,combined_composition_fixed=True,
        limitations=["2023/24 used for early stopping; not pristine prospective validation",
                     "2024/25–2025/26 repeatedly inspected historical diagnostics, not prospective proof",
                     "Existing legacy_v1 features retained, including previously documented H2H/context semantics"])
    (OUT/"report.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
    print(json.dumps({"independent_hits":{n:v["exact_hits"] for n,v in methods.items()},
        "fixed_dc_hits":{n:v["dc_exact_hits"] for n,v in methods.items()},
        "flips":flips,"best":report["best_phase7_variant"]},indent=2))


def posthoc_diagnostics():
    """Describe frozen outputs, without model fitting or changing score results."""
    report=json.loads((OUT/"report.json").read_text())
    predictions=pd.read_csv(OUT/"predictions.csv")
    actual_counts=predictions[predictions.Variant=="A_baseline"].ActualScore.value_counts().to_dict()
    dc_scores=sorted(set(actual_counts)|set(predictions.DCTop1Score),
        key=lambda score:tuple(map(int,score.split("-"))))
    pd.DataFrame([dict(Score=score,ActualCount=int(actual_counts.get(score,0)),
        ActualPct=100*actual_counts.get(score,0)/760,
        **{f"{name}Count":int(((predictions.Variant==name)&(predictions.DCTop1Score==score)).sum())
           for name in VARIANTS},
        **{f"{name}Pct":100*((predictions.Variant==name)&(predictions.DCTop1Score==score)).sum()/760
           for name in VARIANTS}) for score in dc_scores]).to_csv(
        OUT/"fixed_dc_score_distribution.csv",index=False)
    importance=[]
    for name in VARIANTS:
        part=pd.read_csv(OUT/f"{name}_feature_importance.csv")
        for side in ("home","away"):
            ranked=part[part.Side==side].sort_values("Gain",ascending=False).copy()
            ranked["Rank"]=np.arange(1,len(ranked)+1)
            importance.extend(ranked.head(20).to_dict("records"))
    combined=pd.DataFrame(importance)
    for side in ("home","away"):
        combined[combined.Side==side].to_csv(OUT/f"feature_importance_{side}.csv",index=False)
    all_ranks=[]
    for name in VARIANTS:
        part=pd.read_csv(OUT/f"{name}_feature_importance.csv")
        for side in ("home","away"):
            ranked=part[part.Side==side].sort_values("Gain",ascending=False).copy()
            ranked["Rank"]=np.arange(1,len(ranked)+1)
            all_ranks.extend(ranked[ranked.NewFeature].to_dict("records"))
    pd.DataFrame(all_ranks).to_csv(OUT/"new_feature_importance_ranks.csv",index=False)
    source,_=load_data()
    seasons=["2023/24","2024/25","2025/26"]
    entrants={}
    for season,previous in zip(seasons[1:],seasons[:-1]):
        now=source[source.Season==season]
        before=source[source.Season==previous]
        teams=set(now.HomeTeam)|set(now.AwayTeam)
        old=set(before.HomeTeam)|set(before.AwayTeam)
        entrants[season]=sorted(teams-old)
    promoted=[]
    for name in VARIANTS:
        frame=predictions[predictions.Variant==name]
        for season,teams in entrants.items():
            part=frame[(frame.Season==season)&((frame.HomeTeam.isin(teams))|(frame.AwayTeam.isin(teams)))]
            promoted.append(dict(Variant=name,Season=season,InferredNewTeams="|".join(teams),
                Matches=len(part),ExactHits=int(part.ExactCorrect.sum()),FixedDCHits=int(part.DCExactCorrect.sum())))
    pd.DataFrame(promoted).to_csv(OUT/"promoted_team_diagnostic.csv",index=False)
    (OUT/"posthoc_diagnostics.json").write_text(json.dumps(dict(experiment=report["experiment"],
        report_sha256=sha(OUT/"report.json"),inferred_new_premier_league_teams=entrants,
        note="New-to-league teams inferred from season team-set difference; no external promoted metadata or fitting"),indent=2),encoding="utf-8")
    print("Posthoc diagnostics saved",entrants)


if __name__=="__main__":
    import sys
    if sys.argv[1:]==["freeze"]:freeze_features()
    elif sys.argv[1:]==["train"]:train_models()
    elif sys.argv[1:]==["evaluate"]:evaluate()
    elif sys.argv[1:]==["posthoc"]:posthoc_diagnostics()
    else:raise SystemExit("Use freeze, train, evaluate")
