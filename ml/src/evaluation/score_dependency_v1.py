"""Frozen XGB goal rates; validation-only dependency fitting and 760-match ablation."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from scipy.optimize import minimize_scalar

from src.models.ml_goal_rates_v1 import OUT as P3, ROOT, load_splits, predict_rates, sha
from src.models.score_dependency import (GRID_MAX, independent_matrix, dixon_coles_matrix,
    dc_actual_probability, bivariate_matrix, bivariate_actual_probability, shared_components, top_scores)
from src.models.input_parity_no_odds import FEATURE_VERSION

OUT = ROOT / "data/processed/score_dependency_v1"
SCORES = ("0-0","1-0","0-1","1-1","2-0","0-2","2-1","1-2","2-2","3-0",
          "0-3","3-1","1-3","3-2","2-3")
PRECISION_SCORES = ("0-0","1-0","0-1","1-1","2-0","0-2","2-1","1-2","2-2","3-0","3-1")
RHO_BOUNDS = (-0.05, 0.05)  # Fixed conservative bounds; keep low-score factors positive.
SHARED_BOUNDS = (0.0, 0.95)  # Global fraction of min(home,away), preserving both marginal means.


def timestamp():
    return datetime.now(timezone.utc).isoformat()


def frame_for_split(frame: pd.DataFrame, rates: np.ndarray) -> pd.DataFrame:
    result = frame[["Date","Season","HomeTeam","AwayTeam","HomeGoals","AwayGoals"]].copy()
    result["Date"] = result.Date.dt.strftime("%Y-%m-%d")
    result = result.rename(columns={"HomeGoals":"ActualHomeGoals","AwayGoals":"ActualAwayGoals"})
    result["lambda_home_xgb"] = rates[:,0]
    result["lambda_away_xgb"] = rates[:,1]
    return result


def freeze():
    if OUT.exists():
        raise FileExistsError("Refusing to overwrite Phase 4 outputs")
    p3 = json.loads((P3 / "training_manifest.json").read_text(encoding="utf-8"))
    for filename, expected in p3["artifacts"].items():
        if sha(P3 / filename) != expected:
            raise ValueError(f"Phase 3 artifact changed: {filename}")
    metadata = joblib.load(P3 / "metadata.joblib")
    if metadata["feature_version"] != FEATURE_VERSION or metadata["odds_included"] is not False:
        raise ValueError("Phase 3 feature version or odds mismatch")
    splits = load_splits()
    test = splits["test"]
    val = splits["validation"]
    test_rates = predict_rates(test[metadata["feature_columns"]])["xgb"]
    val_rates = predict_rates(val[metadata["feature_columns"]])["xgb"]
    old = np.load(P3 / "diagnostic_rates.npz")["xgb"]
    if not np.array_equal(test_rates, old):
        raise ValueError("XGB lambdas differ from Phase 3 frozen rates")
    prior = pd.read_csv(P3 / "pure_xgb_matches.csv")
    frozen = frame_for_split(test, test_rates)
    if list(frozen[["Date","HomeTeam","AwayTeam"]].itertuples(index=False,name=None)) != list(
        prior[["Date","HomeTeam","AwayTeam"]].itertuples(index=False,name=None)):
        raise ValueError("Phase 3 match keys differ")
    if not np.allclose(test_rates, prior[["lambda_home","lambda_away"]].to_numpy(), rtol=0, atol=1e-12):
        raise ValueError("Phase 3 rate rows differ")
    scores = [top_scores(independent_matrix(*rates),1)[0][0] for rates in test_rates]
    if scores != prior.PredictedScore.tolist() or sum(score==actual for score,actual in zip(scores,prior.ActualScore)) != 96:
        raise ValueError("Independent control did not reproduce 96/760")
    OUT.mkdir(parents=True)
    frozen.to_csv(OUT / "frozen_test_inputs.csv", index=False)
    frame_for_split(val,val_rates).to_csv(OUT / "validation_fit_inputs.csv", index=False)
    np.save(OUT / "frozen_test_rates.npy", test_rates)
    np.save(OUT / "validation_rates.npy", val_rates)
    manifest = dict(experiment="score_dependency_v1", created_utc=timestamp(), baseline_exact_hits=96,
                    baseline_matches=760, baseline_match_sha256=sha(P3 / "pure_xgb_matches.csv"),
                    phase3_rate_sha256=sha(P3 / "diagnostic_rates.npz"),
                    feature_version=FEATURE_VERSION, score_grid=f"0..{GRID_MAX} per side", normalization="divide by truncated-grid mass",
                    lambda_source="frozen Phase-3 xgb_home.json and xgb_away.json",
                    phase3_artifact_sha256=p3["artifacts"],
                    training_seasons="1993/94-2022/23", validation_seasons="2023/24",
                    diagnostic_seasons="2024/25-2025/26", diagnostic_dates="2024-08-16 to 2026-05-24",
                    test_inputs_sha256=sha(OUT / "frozen_test_inputs.csv"),
                    validation_inputs_sha256=sha(OUT / "validation_fit_inputs.csv"),
                    code_sha256={str(p.relative_to(ROOT)):sha(p) for p in (ROOT / "src/models/score_dependency.py",
                        ROOT / "src/evaluation/score_dependency_v1.py",ROOT / "src/models/ml_goal_rates_v1.py")})
    (OUT / "baseline_freeze.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")
    print("Phase 3 XGB independent reproduced: 96/760, exact rates and scores")


def validation_nll(frame: pd.DataFrame, rates: np.ndarray, method: str, parameter: float) -> float:
    actual = frame[["ActualHomeGoals","ActualAwayGoals"]].to_numpy(dtype=int)
    if method == "dc":
        values = [dc_actual_probability(h,a,int(x),int(y),parameter) for (h,a),(x,y) in zip(rates,actual)]
    elif method == "bivariate":
        values = [bivariate_actual_probability(h,a,int(x),int(y),parameter) for (h,a),(x,y) in zip(rates,actual)]
    else:
        raise ValueError("Unknown likelihood method")
    probabilities = np.asarray(values)
    if not np.isfinite(probabilities).all() or (probabilities <= 0).any():
        return float("inf")
    return float(-np.log(probabilities).mean())


def fit_parameters(validation: pd.DataFrame, rates: np.ndarray) -> dict:
    if len(validation) != 380 or rates.shape != (380,2):
        raise ValueError("Only the 380-match validation rate set may fit dependency parameters")
    dc_obj = lambda value:validation_nll(validation,rates,"dc",value)
    bv_obj = lambda value:validation_nll(validation,rates,"bivariate",value)
    dc = minimize_scalar(dc_obj,bounds=RHO_BOUNDS,method="bounded",options={"xatol":1e-6})
    bv = minimize_scalar(bv_obj,bounds=SHARED_BOUNDS,method="bounded",options={"xatol":1e-6})
    if not dc.success or not bv.success:
        raise RuntimeError("Validation likelihood optimizer failed")
    # Explicitly compare a boundary negative control. This is validation-only.
    rho = float(dc.x) if dc.fun < dc_obj(0.0) else 0.0
    shared = float(bv.x) if bv.fun < bv_obj(0.0) else 0.0
    return dict(rho=rho, shared_fraction=shared,
                dc=dict(bounds=RHO_BOUNDS, nll_at_zero=dc_obj(0.0), selected_validation_nll=dc_obj(rho),
                        optimizer_success=bool(dc.success), evaluations=int(dc.nfev)),
                bivariate=dict(bounds=SHARED_BOUNDS, nll_at_zero=bv_obj(0.0),
                               selected_validation_nll=bv_obj(shared), optimizer_success=bool(bv.success),
                               evaluations=int(bv.nfev)))


def fit():
    if (OUT / "parameter_fit.json").exists():
        raise FileExistsError("Refusing to overwrite fitted parameters")
    frozen = json.loads((OUT / "baseline_freeze.json").read_text(encoding="utf-8"))
    if sha(OUT / "validation_fit_inputs.csv") != frozen["validation_inputs_sha256"]:
        raise ValueError("Validation input changed")
    validation = pd.read_csv(OUT / "validation_fit_inputs.csv")
    rates = np.load(OUT / "validation_rates.npy")
    if not np.allclose(rates,validation[["lambda_home_xgb","lambda_away_xgb"]].to_numpy(),rtol=0,atol=1e-12):
        raise ValueError("Validation rate mismatch")
    result = fit_parameters(validation,rates)
    report = dict(experiment="score_dependency_v1", created_utc=timestamp(), validation_seasons="2023/24",
                  validation_dates=[validation.Date.min(),validation.Date.max()], validation_matches=len(validation),
                  fitting_objective="Minimize untruncated joint score NLL on validation only; compare zero-dependence boundary on validation only",
                  time_decay="none", parameterization="DC standard tau; bivariate shared_i=q*min(lambda_home_i,lambda_away_i)",
                  validation_input_sha256=frozen["validation_inputs_sha256"],
                  test_outcomes_used=False, **result)
    (OUT / "parameter_fit.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
    print(json.dumps(report,indent=2))


def actual_probability(method: str, home: float, away: float, x: int, y: int, parameters: dict) -> float:
    if method == "independent":
        from scipy.stats import poisson
        return float(poisson.pmf(x,home)*poisson.pmf(y,away))
    if method == "dc":
        return dc_actual_probability(home,away,x,y,parameters["rho"])
    if method == "bivariate":
        return bivariate_actual_probability(home,away,x,y,parameters["shared_fraction"])
    raise ValueError("Unknown dependency method")


def method_matrix(method: str, home: float, away: float, parameters: dict) -> np.ndarray:
    if method == "independent":
        return independent_matrix(home,away)
    if method == "dc":
        return dixon_coles_matrix(home,away,parameters["rho"])
    if method == "bivariate":
        return bivariate_matrix(home,away,parameters["shared_fraction"])
    raise ValueError("Unknown dependency method")


def summarize_predictions(frame: pd.DataFrame) -> dict:
    counts = frame.Top1Score.value_counts().to_dict()
    actual_counts = frame.ActualScore.value_counts().to_dict()
    p = np.array(list(counts.values()))/len(frame)
    conditional = {}
    for score in PRECISION_SCORES:
        part = frame[frame.Top1Score==score]
        conditional[score] = dict(predicted=len(part),correct=int(part.ExactCorrect.sum()),
                                  precision=float(part.ExactCorrect.mean()) if len(part) else None)
    return dict(matches=len(frame),exact_hits=int(frame.ExactCorrect.sum()),exact_top1=float(frame.ExactCorrect.mean()),
                top3_hits=int(frame.Top3Correct.sum()),top3_exact=float(frame.Top3Correct.mean()),
                joint_untruncated_nll=float(frame.JointNLL.mean()),
                grid_supported_matches=int(frame.ActualWithinGrid.sum()),
                predicted_scores=counts,actual_scores=actual_counts,
                most_common_score=max(counts,key=counts.get),most_common_count=max(counts.values()),
                most_common_pct=float(max(counts.values())/len(frame)),unique_scorelines=len(counts),
                top1_entropy_nats=float(-(p*np.log(p)).sum()),
                predicted_draw_rate=float(frame.Top1Score.map(lambda s:s.split('-')[0]==s.split('-')[1]).mean()),
                actual_draw_rate=float(frame.ActualScore.map(lambda s:s.split('-')[0]==s.split('-')[1]).mean()),
                score_conditional_precision=conditional)


def evaluate():
    if (OUT / "report.json").exists():
        raise FileExistsError("Refusing to overwrite Phase 4 evaluation")
    frozen = json.loads((OUT / "baseline_freeze.json").read_text(encoding="utf-8"))
    parameters = json.loads((OUT / "parameter_fit.json").read_text(encoding="utf-8"))
    if sha(OUT / "frozen_test_inputs.csv") != frozen["test_inputs_sha256"]:
        raise ValueError("Frozen test inputs changed")
    if sha(OUT / "validation_fit_inputs.csv") != frozen["validation_inputs_sha256"]:
        raise ValueError("Validation fit inputs changed")
    for name,expected in frozen["phase3_artifact_sha256"].items():
        if sha(P3 / name) != expected:
            raise ValueError("Phase 3 model/metadata changed")
    test = pd.read_csv(OUT / "frozen_test_inputs.csv")
    rates = np.load(OUT / "frozen_test_rates.npy")
    if len(test) != 760 or not np.allclose(rates,test[["lambda_home_xgb","lambda_away_xgb"]].to_numpy(),rtol=0,atol=1e-12):
        raise ValueError("Frozen test rates mismatched")
    methods = ("independent","dc","bivariate")
    # Mandatory zero-dependence controls before any diagnostic interpretation.
    control_dc = [np.max(abs(independent_matrix(h,a)-dixon_coles_matrix(h,a,0))) for h,a in rates]
    control_bv = [np.max(abs(independent_matrix(h,a)-bivariate_matrix(h,a,0))) for h,a in rates]
    if max(control_dc)>1e-12 or max(control_bv)>1e-12:
        raise ValueError("Zero-dependence control failed")
    matrices = {}
    frames = {}
    metrics = {}
    for method in methods:
        mat = np.stack([method_matrix(method,h,a,parameters) for h,a in rates])
        if not np.isfinite(mat).all() or (mat<0).any() or not np.allclose(mat.sum(axis=(1,2)),1,atol=1e-12):
            raise ValueError(f"Invalid {method} matrices")
        matrices[method] = mat
        rows = []
        for i,match in enumerate(test.itertuples(index=False)):
            h,a = rates[i]
            x,y = int(match.ActualHomeGoals),int(match.ActualAwayGoals)
            score = f"{x}-{y}"
            top = top_scores(mat[i],3)
            likelihood = actual_probability(method,h,a,x,y,parameters)
            if not np.isfinite(likelihood) or likelihood<=0:
                raise ValueError(f"Invalid actual score likelihood for {method}")
            rows.append(dict(Date=match.Date,Season=match.Season,HomeTeam=match.HomeTeam,AwayTeam=match.AwayTeam,
                             ActualHomeGoals=x,ActualAwayGoals=y,ActualScore=score,
                             lambda_home_xgb=float(h),lambda_away_xgb=float(a),
                             Top1Score=top[0][0],Top1Probability=top[0][1],
                             Top3="|".join(item[0] for item in top),
                             Top3Correct=score in [item[0] for item in top],
                             ExactCorrect=top[0][0]==score,ActualJointProbability=likelihood,
                             JointNLL=float(-np.log(likelihood)),ActualWithinGrid=x<=GRID_MAX and y<=GRID_MAX,
                             ActualGridProbability=float(mat[i,x,y]) if x<=GRID_MAX and y<=GRID_MAX else np.nan,
                             method=method))
        frame = pd.DataFrame(rows)
        frame.to_csv(OUT / f"{method}_predictions.csv",index=False)
        frames[method]=frame
        metrics[method]=summarize_predictions(frame)
    np.savez_compressed(OUT / "score_matrices.npz",**matrices)
    old = pd.read_csv(P3 / "pure_xgb_matches.csv")
    if sha(P3 / "pure_xgb_matches.csv") != frozen["baseline_match_sha256"] or \
       metrics["independent"]["exact_hits"] != 96 or \
       frames["independent"].Top1Score.tolist() != old.PredictedScore.tolist():
        raise ValueError("Independent XGB did not reproduce Phase 3 96/760")
    actual_counts = frames["independent"].ActualScore.value_counts().to_dict()
    dist = pd.DataFrame([dict(Score=score,ActualCount=int(actual_counts.get(score,0)),ActualPct=100*actual_counts.get(score,0)/760,
                              **{f"{method}Count":int((frames[method].Top1Score==score).sum()) for method in methods},
                              **{f"{method}Pct":100*(frames[method].Top1Score==score).sum()/760 for method in methods})
                         for score in SCORES])
    dist.to_csv(OUT / "score_distribution.csv",index=False)
    changes=[]
    flip_counts={}
    base=frames["independent"]
    for method in ("dc","bivariate"):
        fresh=frames[method]
        gained=int(((~base.ExactCorrect)&fresh.ExactCorrect).sum())
        lost=int((base.ExactCorrect&(~fresh.ExactCorrect)).sum())
        changed=np.flatnonzero(base.Top1Score.to_numpy()!=fresh.Top1Score.to_numpy())
        flip_counts[method]=dict(gained=gained,lost=lost,changed_top1=len(changed))
        for i in changed:
            x,y=int(base.iloc[i].ActualHomeGoals),int(base.iloc[i].ActualAwayGoals)
            h,a=rates[i]
            b_score=base.iloc[i].Top1Score
            n_score=fresh.iloc[i].Top1Score
            bh,ba=map(int,b_score.split('-'))
            nh,na=map(int,n_score.split('-'))
            changes.append(dict(Method=method,Date=base.iloc[i].Date,HomeTeam=base.iloc[i].HomeTeam,
                                AwayTeam=base.iloc[i].AwayTeam,ActualScore=f"{x}-{y}",
                                IndependentScore=b_score,DependencyScore=n_score,
                                IndependentCorrect=bool(base.iloc[i].ExactCorrect),DependencyCorrect=bool(fresh.iloc[i].ExactCorrect),
                                lambda_home_xgb=float(h),lambda_away_xgb=float(a),
                                IndependentTop1Probability=float(matrices["independent"][i,bh,ba]),
                                DependencyTop1Probability=float(matrices[method][i,nh,na]),
                                IndependentActualProbability=float(base.iloc[i].ActualJointProbability),
                                DependencyActualProbability=float(fresh.iloc[i].ActualJointProbability)))
    pd.DataFrame(changes,columns=["Method","Date","HomeTeam","AwayTeam","ActualScore","IndependentScore",
        "DependencyScore","IndependentCorrect","DependencyCorrect","lambda_home_xgb","lambda_away_xgb",
        "IndependentTop1Probability","DependencyTop1Probability","IndependentActualProbability",
        "DependencyActualProbability"]).to_csv(OUT / "match_flips.csv",index=False)
    q=parameters["shared_fraction"]
    sensitivity={}
    for cell in ((0,0),(1,1),(2,2),(2,1),(1,2)):
        sensitivity[f"{cell[0]}-{cell[1]}"]=dict(independent_mean=float(matrices["independent"][:,cell[0],cell[1]].mean()),
            bivariate_mean=float(matrices["bivariate"][:,cell[0],cell[1]].mean()))
    shared_values=np.array([shared_components(h,a,q)[2] for h,a in rates])
    report=dict(experiment="score_dependency_v1",created_utc=timestamp(),score_grid=f"0..{GRID_MAX} per side",
                baseline="Phase 3 frozen XGB rates + independent Poisson matrix",feature_version=FEATURE_VERSION,
                parameters=dict(rho=parameters["rho"],shared_fraction=q),
                parameter_fit_file="parameter_fit.json",baseline_freeze_file="baseline_freeze.json",
                methods=metrics,flips=flip_counts,score_distribution=dist.to_dict("records"),
                zero_controls=dict(dc_max_abs_difference=max(control_dc),bivariate_max_abs_difference=max(control_bv)),
                bivariate_sensitivity=dict(shared_covariance_mean=float(shared_values.mean()),
                    shared_covariance_min=float(shared_values.min()),shared_covariance_max=float(shared_values.max()),
                    implied_correlation_mean=float(np.mean(shared_values/np.sqrt(rates[:,0]*rates[:,1]))),
                    selected_cell_mean_probabilities=sensitivity),
                nll_definition="Proper untruncated joint score NLL at actual counts for all 760 matches; grid matrix is separately normalized for Top-1/Top-3. Out-of-grid actual scores retain nonzero untruncated likelihood.",
                limitations=["Diagnostic seasons previously inspected, not pristine holdout.",
                             "Frozen historical pre-match feature rows, not prospective forecast snapshots.",
                             "No time decay, no test-outcome-based dependence parameter selection."])
    (OUT / "report.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
    print(json.dumps({name:{key:metrics[name][key] for key in ("exact_hits","exact_top1","top3_hits","joint_untruncated_nll",
        "most_common_score","most_common_count","unique_scorelines")} for name in methods},indent=2))
    print("flips",flip_counts)


if __name__ == "__main__":
    import sys
    if sys.argv[1:] == ["freeze"]:
        freeze()
    elif sys.argv[1:] == ["fit"]:
        fit()
    elif sys.argv[1:] == ["evaluate"]:
        evaluate()
    else:
        raise SystemExit("Use freeze, fit or evaluate")
