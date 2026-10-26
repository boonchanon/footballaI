"""Frozen Phase-6 two-stage score selection and non-deployable outcome oracle."""
from __future__ import annotations

import json
from datetime import datetime,timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from catboost import CatBoostClassifier
import xgboost as xgb

from src.models.ml_goal_rates_v1 import ROOT,OUT as P3,sha,load_splits
from src.evaluation.score_dependency_v1 import OUT as P4
from src.evaluation.score_calibration_v1 import OUT as P5,reproduce
from src.evaluation.input_parity_no_odds_v1 import OUT as P2
from src.models.input_parity_no_odds import prepare,ODDS_COLUMNS
from src.models.score_dependency import top_scores,independent_matrix,dixon_coles_matrix
from src.models.outcome_aware_score_selection import OUTCOMES,masses,outcome_of_score,selected_outcome,top_within

OUT=ROOT/"data/processed/outcome_aware_score_selection_v1"
METHODS=("independent_global","independent_mass","dc_global","dc_mass",
         "cat_independent","cat_dc","xgb_independent","xgb_dc")
ORACLES=("oracle_independent","oracle_dc")
SCORES=("0-0","1-0","0-1","1-1","2-0","0-2","2-1","1-2","2-2","3-0",
        "0-3","3-1","1-3","3-2","2-3")
PRECISION_SCORES=("0-0","1-0","0-1","1-1","2-0","0-2","2-1","1-2","2-2","3-0","3-1")


def timestamp():
    return datetime.now(timezone.utc).isoformat()


def verify_baselines():
    source,rates,parameters=reproduce()
    prior=np.load(P4/"score_matrices.npz")
    independent,dc=prior["independent"],prior["dc"]
    assert len(source)==len(rates)==len(independent)==len(dc)==760
    if not np.array_equal(rates,np.load(P3/"diagnostic_rates.npz")["xgb"]):
        raise ValueError("Frozen XGB lambdas changed")
    if not np.allclose(rates,source[["lambda_home_xgb","lambda_away_xgb"]],rtol=0,atol=1e-12):
        raise ValueError("Fixture lambda order changed")
    if max(np.max(abs(independent[i]-independent_matrix(*rate))) for i,rate in enumerate(rates))>1e-14:
        raise ValueError("Frozen independent matrices changed")
    if max(np.max(abs(dc[i]-dixon_coles_matrix(*rate,parameters["rho"]))) for i,rate in enumerate(rates))>1e-14:
        raise ValueError("Frozen DC rho/matrices changed")
    global_i=[top_scores(matrix,1)[0][0] for matrix in independent]
    global_d=[top_scores(matrix,1)[0][0] for matrix in dc]
    p4_i=pd.read_csv(P4/"independent_predictions.csv")
    p4_d=pd.read_csv(P4/"dc_predictions.csv")
    if global_i!=p4_i.Top1Score.tolist() or global_d!=p4_d.Top1Score.tolist():
        raise ValueError("Frozen global scorelines differ match-by-match")
    actual=[f"{int(h)}-{int(a)}" for h,a in source[["ActualHomeGoals","ActualAwayGoals"]].itertuples(index=False,name=None)]
    if actual!=p4_i.ActualScore.tolist() or actual!=p4_d.ActualScore.tolist() or \
       sum(a==b for a,b in zip(actual,global_i))!=96 or sum(a==b for a,b in zip(actual,global_d))!=99:
        raise ValueError("Frozen fixtures, actuals or baseline hits changed")
    return source,rates,parameters,{"independent":independent,"dc":dc}


def classifier_audit(test_source: pd.DataFrame):
    """Reinfer fixed no-odds classifiers; return valid raw A/D/H probabilities."""
    audit=dict(experiment="outcome_aware_score_selection_v1",created_utc=timestamp(),
        status="NOT EVALUATED",class_mapping={"0":"A","1":"D","2":"H"},
        class_mapping_basis="feature_engineering.py Target=Result.map({'A':0,'D':1,'H':2}); verified against stored goal signs")
    try:
        comparison=json.loads((P2/"comparison.json").read_text(encoding="utf-8"))
        for relative,expected in comparison["artifact_sha256"].items():
            if sha(ROOT/relative)!=expected:
                raise ValueError(f"Classifier artifact hash mismatch: {relative}")
        meta=joblib.load(P2/"catboost_metadata.joblib")
        if meta!=joblib.load(P2/"xgboost_metadata.joblib") or meta["odds_included"] is not False or \
           meta["feature_version"]!="legacy_v1" or len(meta["feature_columns"])!=123 or \
           any(name in ODDS_COLUMNS for name in meta["feature_columns"]):
            raise ValueError("Classifier metadata/odds invalid")
        if set(meta["imputation_values"])!=set(meta["feature_columns"]):
            raise ValueError("Saved training medians incomplete")
        cb=CatBoostClassifier(); cb.load_model(P2/"catboost_no_odds.cbm")
        xb=xgb.XGBClassifier(); xb.load_model(P2/"xgboost_no_odds.json")
        if list(cb.feature_names_)!=meta["feature_columns"] or list(xb.get_booster().feature_names)!=meta["feature_columns"] or \
           list(cb.classes_)!=[0,1,2] or list(xb.classes_)!=[0,1,2]:
            raise ValueError("Model feature or class order invalid")
        split=load_splits()["test"]
        keys=["Date","HomeTeam","AwayTeam"]
        split_keys=split.assign(Date=split.Date.dt.strftime("%Y-%m-%d"))[keys]
        if list(split_keys.itertuples(index=False,name=None))!=list(test_source[keys].itertuples(index=False,name=None)):
            raise ValueError("Classifier test fixture order differs")
        feature=prepare(split[meta["feature_columns"]],meta)
        cat=cb.predict_proba(feature)
        xprob=xb.predict_proba(feature)
        phase2=pd.read_csv(P2/"experiment_matches.csv")
        if len(phase2)!=760 or not np.allclose(cat,phase2[["CatA","CatD","CatH"]],rtol=0,atol=1e-12) or \
           not np.allclose(xprob,phase2[["XgbA","XgbD","XgbH"]],rtol=0,atol=1e-12):
            raise ValueError("Raw classifier probabilities do not reproduce Phase 2")
        if not np.allclose(cat.sum(axis=1),1) or not np.allclose(xprob.sum(axis=1),1):
            raise ValueError("Classifier probabilities invalid")
        audit.update(status="VALID",feature_version=meta["feature_version"],feature_count=123,
            imputation_policy=meta["imputation_policy"],training_seasons=meta["train_seasons"],
            validation_seasons="2023/24 used for early stopping",diagnostic_seasons="2024/25-2025/26",
            odds_included=False,probability_semantics="raw predict_proba; no draw promotion, forcing or blending",
            classifier_artifact_sha256=comparison["artifact_sha256"],
            phase2_probability_reproduction="exact within 1e-12 for all 760 rows",
            limitation="Historical saved feature rows; no pre-kickoff prospective freeze")
        return audit,{"cat":cat,"xgb":xprob}
    except Exception as exc:
        audit["reason"]=str(exc)
        return audit,{}


def outcome_probabilities(matrix: np.ndarray,external: np.ndarray|None=None):
    if external is None:
        return masses(matrix)
    return {"A":float(external[0]),"D":float(external[1]),"H":float(external[2])}


def predictions(source: pd.DataFrame,matrix_set: np.ndarray,method: str,
                external: np.ndarray|None=None,oracle: bool=False) -> pd.DataFrame:
    rows=[]
    for i,match in enumerate(source.itertuples(index=False)):
        matrix=matrix_set[i]
        mass=masses(matrix)
        global_top=top_scores(matrix,3)
        global_outcome=outcome_of_score(global_top[0][0])
        actual_score=f"{int(match.ActualHomeGoals)}-{int(match.ActualAwayGoals)}"
        actual_outcome=outcome_of_score(actual_score)
        probability=outcome_probabilities(matrix,None if external is None else external[i])
        chosen=actual_outcome if oracle else global_outcome if method.endswith("_global") else selected_outcome(probability)
        top=global_top if method.endswith("_global") and not oracle else top_within(matrix,chosen,3)
        score=top[0][0]
        if outcome_of_score(score)!=chosen:
            raise AssertionError("Selected score/outcome mismatch")
        rows.append(dict(Method=method,Date=match.Date,HomeTeam=match.HomeTeam,AwayTeam=match.AwayTeam,
            ActualScore=actual_score,ActualOutcome=actual_outcome,
            lambda_home_xgb=float(match.lambda_home_xgb),lambda_away_xgb=float(match.lambda_away_xgb),
            GlobalScore=global_top[0][0],GlobalScoreProbability=global_top[0][1],
            GlobalImpliedOutcome=global_outcome,PH=mass["H"],PD=mass["D"],PA=mass["A"],
            SourcePH=probability["H"],SourcePD=probability["D"],SourcePA=probability["A"],
            SelectedOutcome=chosen,Top1Score=score,Top1Probability=top[0][1],
            Top3="|".join(item[0] for item in top),Top3Correct=actual_score in [item[0] for item in top],
            ExactCorrect=score==actual_score,OutcomeCorrect=chosen==actual_outcome,
            OracleNonDeployable=oracle))
    return pd.DataFrame(rows)


def summary(frame: pd.DataFrame):
    counts=frame.Top1Score.value_counts().to_dict()
    values=np.asarray(list(counts.values()),dtype=float)/len(frame)
    conditional=frame[frame.OutcomeCorrect]
    precision={}
    for score in PRECISION_SCORES:
        part=frame[frame.Top1Score==score]
        precision[score]=dict(predicted=len(part),correct=int(part.ExactCorrect.sum()),
            precision=float(part.ExactCorrect.mean()) if len(part) else None)
    return dict(matches=len(frame),exact_hits=int(frame.ExactCorrect.sum()),exact_top1=float(frame.ExactCorrect.mean()),
        top3_hits=int(frame.Top3Correct.sum()),top3_exact=float(frame.Top3Correct.mean()),
        outcome_hits=int(frame.OutcomeCorrect.sum()),outcome_accuracy=float(frame.OutcomeCorrect.mean()),
        exact_given_correct_outcome=int(conditional.ExactCorrect.sum()),
        conditional_exact_accuracy=float(conditional.ExactCorrect.mean()) if len(conditional) else None,
        predicted_outcomes=frame.SelectedOutcome.value_counts().to_dict(),
        predicted_scores=counts,most_common_score=max(counts,key=counts.get),
        most_common_count=max(counts.values()),unique_scorelines=len(counts),
        entropy_nats=float(-(values*np.log(values)).sum()),draw_rate=float((frame.SelectedOutcome=="D").mean()),
        score_conditional_precision=precision)


def confusion(frame: pd.DataFrame):
    return [dict(Method=frame.Method.iloc[0],Actual=actual,Predicted=predicted,
        Count=int(((frame.ActualOutcome==actual)&(frame.SelectedOutcome==predicted)).sum()))
        for actual in OUTCOMES for predicted in OUTCOMES]


def flips(global_frame: pd.DataFrame,aware_frame: pd.DataFrame):
    changed=global_frame.Top1Score!=aware_frame.Top1Score
    gain=(~global_frame.ExactCorrect)&aware_frame.ExactCorrect
    loss=global_frame.ExactCorrect&(~aware_frame.ExactCorrect)
    other=changed&(~gain)&(~loss)
    result=dict(changed_top1=int(changed.sum()),wrong_to_correct=int(gain.sum()),
        correct_to_wrong=int(loss.sum()),wrong_to_different_wrong=int(other.sum()),
        net_exact_hits=int(gain.sum()-loss.sum()),
        global_outcome_vs_selected_disagreement=int((global_frame.GlobalImpliedOutcome!=aware_frame.SelectedOutcome).sum()))
    rows=[]
    for i in np.flatnonzero(changed.to_numpy()):
        row=aware_frame.iloc[i]
        rows.append(dict(Method=row.Method,Date=row.Date,HomeTeam=row.HomeTeam,AwayTeam=row.AwayTeam,
            ActualScore=row.ActualScore,ActualOutcome=row.ActualOutcome,
            lambda_home_xgb=row.lambda_home_xgb,lambda_away_xgb=row.lambda_away_xgb,
            GlobalScore=row.GlobalScore,GlobalScoreProbability=row.GlobalScoreProbability,
            GlobalImpliedOutcome=row.GlobalImpliedOutcome,PH=row.PH,PD=row.PD,PA=row.PA,
            SelectedOutcome=row.SelectedOutcome,OutcomeAwareScore=row.Top1Score,
            OutcomeAwareScoreProbability=row.Top1Probability,
            GlobalCorrect=bool(global_frame.iloc[i].ExactCorrect),OutcomeAwareCorrect=bool(row.ExactCorrect),
            FlipType="wrong_to_correct" if gain.iloc[i] else "correct_to_wrong" if loss.iloc[i] else "wrong_to_different_wrong"))
    return result,rows


def pretest_validation():
    source=pd.read_csv(P4/"validation_fit_inputs.csv")
    rates=np.load(P4/"validation_rates.npy")
    if len(source)!=380 or not np.allclose(rates,source[["lambda_home_xgb","lambda_away_xgb"]],rtol=0,atol=1e-12):
        raise ValueError("Pre-test validation rates mismatch")
    rho=json.loads((P4/"parameter_fit.json").read_text(encoding="utf-8"))["rho"]
    results=[]
    for family,matrices in (("independent",np.stack([independent_matrix(*r) for r in rates])),
                            ("dc",np.stack([dixon_coles_matrix(*r,rho) for r in rates]))):
        global_frame=predictions(source,matrices,f"{family}_global")
        aware_frame=predictions(source,matrices,f"{family}_mass")
        for kind,frame in (("global",global_frame),("mass",aware_frame)):
            results.append(dict(Matrix=family,Selector=kind,**{key:summary(frame)[key] for key in
                ("matches","exact_hits","outcome_hits","outcome_accuracy","draw_rate")}))
        results[-1]["global_outcome_vs_mass_disagreement"]=int((global_frame.SelectedOutcome!=aware_frame.SelectedOutcome).sum())
    return pd.DataFrame(results)


def evaluate():
    if OUT.exists():
        raise FileExistsError("Refusing to overwrite Phase-6 outputs")
    source,rates,params,matrices=verify_baselines()
    audit,external=classifier_audit(source)
    OUT.mkdir(parents=True)
    (OUT/"classifier_audit.json").write_text(json.dumps(audit,indent=2),encoding="utf-8")
    pretest_validation().to_csv(OUT/"pretest_validation.csv",index=False)
    manifest=dict(experiment="outcome_aware_score_selection_v1",created_utc=timestamp(),
        feature_version="legacy_v1",lambda_source="frozen Phase-3 XGB home/away rates",
        score_grid="0..6 per side",test_matches=760,dc_rho=params["rho"],
        phase3_artifact_sha256=json.loads((P3/"training_manifest.json").read_text())["artifacts"],
        phase4_score_matrices_sha256=sha(P4/"score_matrices.npz"),
        phase4_test_inputs_sha256=sha(P4/"frozen_test_inputs.csv"),
        phase5_protected_sha256={name:sha(P5/name) for name in ("data_manifest.json","calibration_parameters.json",
            "report.json","diagnostic_matrices.npz","final_report.md")},
        classifier_status=audit["status"],classifier_hashes=audit.get("classifier_artifact_sha256"),
        class_mapping=audit["class_mapping"],test_outcomes_used_to_fit=False,
        no_thresholds_no_blends_no_retraining=True,
        limitation="Previously inspected historical diagnostics, not prospective pre-kickoff freezes")
    (OUT/"data_manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")
    active=list(METHODS[:4])+(list(METHODS[4:]) if audit["status"]=="VALID" else [])
    frames={}
    for method in active:
        family="dc" if method.startswith("dc_") or method.endswith("_dc") else "independent"
        model=method.split("_")[0]
        ext=external[model] if model in external else None
        frames[method]=predictions(source,matrices[family],method,ext)
    for name,family in (("oracle_independent","independent"),("oracle_dc","dc")):
        frames[name]=predictions(source,matrices[family],name,oracle=True)
    if int(frames["independent_global"].ExactCorrect.sum())!=96 or int(frames["dc_global"].ExactCorrect.sum())!=99:
        raise ValueError("Phase-6 baselines failed")
    for family in ("independent","dc"):
        original=frames[f"{family}_global"]
        for i,matrix in enumerate(matrices[family]):
            if top_within(matrix,original.GlobalImpliedOutcome.iloc[i],1)[0][0]!=original.Top1Score.iloc[i]:
                raise ValueError("Negative control failed")
    pd.concat([frames[name] for name in active]).to_csv(OUT/"predictions.csv",index=False)
    for method in active:
        frames[method].to_csv(OUT/f"{method}_predictions.csv",index=False)
    pd.concat([frames[name] for name in ORACLES]).to_csv(OUT/"oracle_diagnostic.csv",index=False)
    pd.DataFrame([entry for method in active for entry in confusion(frames[method])]).to_csv(
        OUT/"outcome_confusion.csv",index=False)
    actual=frames["independent_global"].ActualScore.value_counts().to_dict()
    full_scores=sorted(set(actual)|set().union(*(set(frames[name].Top1Score) for name in active)),
                       key=lambda s:tuple(map(int,s.split("-"))))
    pd.DataFrame([dict(Score=score,ActualCount=int(actual.get(score,0)),ActualPct=100*actual.get(score,0)/760,
        **{f"{method}Count":int((frames[method].Top1Score==score).sum()) for method in active},
        **{f"{method}Pct":100*(frames[method].Top1Score==score).sum()/760 for method in active})
        for score in full_scores]).to_csv(OUT/"score_distribution.csv",index=False)
    flip_results={}
    flip_rows=[]
    for method in active:
        if method.endswith("_global"):
            continue
        family="dc" if method.startswith("dc_") or method.endswith("_dc") else "independent"
        result,rows=flips(frames[f"{family}_global"],frames[method])
        flip_results[method]=result
        flip_rows.extend(rows)
    pd.DataFrame(flip_rows).to_csv(OUT/"rank_flips.csv",index=False)
    deployed={name:summary(frames[name]) for name in active}
    oracle={name:summary(frames[name]) for name in ORACLES}
    if any(name in deployed for name in ORACLES):
        raise AssertionError("Oracle entered deployable leaderboard")
    report=dict(experiment="outcome_aware_score_selection_v1",created_utc=timestamp(),
        deployable_methods=deployed,oracle_non_deployable_diagnostic=oracle,flips=flip_results,
        classifier_status=audit["status"],actual_outcome_counts=frames["independent_global"].ActualOutcome.value_counts().to_dict(),
        underlying_matrix_nll_unchanged={family:json.loads((P4/"report.json").read_text())["methods"][family]["joint_untruncated_nll"]
            for family in ("independent","dc")},
        nll_note="Outcome-aware argmax is a decision rule; original Phase-4 matrix NLL is unchanged and no new selection NLL exists",
        top3_note="Global: three highest grid cells; two-stage: three highest cells within selected outcome",
        best_deployable=max(active,key=lambda m:(deployed[m]["exact_hits"],-active.index(m))),
        test_outcomes_used_to_fit=False,oracle_cannot_be_deployed=True)
    (OUT/"report.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
    print(json.dumps({"classifier":audit["status"],"hits":{name:value["exact_hits"] for name,value in deployed.items()},
        "oracle_hits":{name:value["exact_hits"] for name,value in oracle.items()},
        "flips":flip_results,"best":report["best_deployable"]},indent=2))


if __name__=="__main__":
    import sys
    if sys.argv[1:]==["evaluate"]:
        evaluate()
    else:
        raise SystemExit("Use evaluate")
