"""Chronological pre-test calibration and frozen 760-match comparison."""
from __future__ import annotations

import json
from datetime import datetime,timezone
from pathlib import Path

import numpy as np
import pandas as pd

from src.models.ml_goal_rates_v1 import ROOT,OUT as P3,sha
from src.evaluation.score_dependency_v1 import OUT as P4
from src.models.score_dependency import independent_matrix,dixon_coles_matrix,top_scores
from src.models.score_calibration import (GRID,SCORE_PRIOR,MIN_EXPECTED_SUPPORT,STRUCTURED_L2,
    TEMPERATURE_BOUNDS,FEATURE_NAMES,fit_temperature,fit_score_specific,fit_structured,apply)

OUT=ROOT/"data/processed/score_calibration_v1"
METHODS=("raw","dc","temperature","score_specific","structured")
CAL_METHODS=("raw","temperature","score_specific","structured")
CUTOFF="2023-12-30"  # whole-date cutoff; no same-day matches cross train/validation.
SCORES=("0-0","1-0","0-1","1-1","2-0","0-2","2-1","1-2","2-2","3-0",
        "0-3","3-1","1-3","3-2","2-3")
PRECISION_SCORES=("0-0","1-0","0-1","1-1","2-0","0-2","2-1","1-2","2-2","3-0","3-1")


def now():
    return datetime.now(timezone.utc).isoformat()


def assert_prior_hashes():
    p3=json.loads((P3/"training_manifest.json").read_text(encoding="utf-8"))
    p4=json.loads((P4/"baseline_freeze.json").read_text(encoding="utf-8"))
    for name,expected in p3["artifacts"].items():
        if sha(P3/name)!=expected:
            raise ValueError(f"Phase 3 artifact changed: {name}")
    for name,expected in p4["phase3_artifact_sha256"].items():
        if sha(P3/name)!=expected:
            raise ValueError(f"Phase 4 frozen artifact changed: {name}")
    if sha(P4/"frozen_test_inputs.csv")!=p4["test_inputs_sha256"]:
        raise ValueError("Phase 4 frozen test inputs changed")
    return p3,p4


def reproduce():
    assert_prior_hashes()
    test=pd.read_csv(P4/"frozen_test_inputs.csv")
    rates=np.load(P4/"frozen_test_rates.npy")
    fitted=json.loads((P4/"parameter_fit.json").read_text(encoding="utf-8"))
    raw=pd.read_csv(P4/"independent_predictions.csv")
    dc=pd.read_csv(P4/"dc_predictions.csv")
    rs=[top_scores(independent_matrix(*r),1)[0][0] for r in rates]
    ds=[top_scores(dixon_coles_matrix(*r,fitted["rho"]),1)[0][0] for r in rates]
    actual=raw.ActualScore.tolist()
    if rs!=raw.Top1Score.tolist() or ds!=dc.Top1Score.tolist() or \
       sum(a==b for a,b in zip(rs,actual))!=96 or sum(a==b for a,b in zip(ds,actual))!=99:
        raise ValueError("Phase 3/4 baseline reproduction failed")
    return test,rates,fitted


def prepare_data():
    if OUT.exists():
        raise FileExistsError("Refusing to overwrite Phase 5 outputs")
    test,rates,fitted=reproduce()
    val=pd.read_csv(P4/"validation_fit_inputs.csv")
    val_rates=np.load(P4/"validation_rates.npy")
    if len(val)!=380 or not np.allclose(val_rates,val[["lambda_home_xgb","lambda_away_xgb"]],rtol=0,atol=1e-12):
        raise ValueError("Pre-test validation rates invalid")
    train=val[val.Date<CUTOFF].copy()
    valid=val[val.Date>=CUTOFF].copy()
    if len(train)!=188 or len(valid)!=192 or train.Date.max()>=valid.Date.min():
        raise ValueError("Calibration chronological split invalid")
    raw_matrices=np.stack([independent_matrix(*r) for r in val_rates])
    OUT.mkdir(parents=True)
    train.to_csv(OUT/"calibration_train.csv",index=False)
    valid.to_csv(OUT/"calibration_validation.csv",index=False)
    np.save(OUT/"calibration_raw_matrices.npy",raw_matrices)
    manifest=dict(experiment="score_calibration_v1",created_utc=now(),feature_version="legacy_v1",
        lambda_source="frozen Phase-3 XGB home/away model",score_grid="0..6 per side",
        train_dates=[train.Date.min(),train.Date.max()],validation_dates=[valid.Date.min(),valid.Date.max()],
        train_matches=len(train),validation_matches=len(valid),diagnostic_test_matches=len(test),
        train_outside_grid=int(((train.ActualHomeGoals>=GRID)|(train.ActualAwayGoals>=GRID)).sum()),
        validation_outside_grid=int(((valid.ActualHomeGoals>=GRID)|(valid.ActualAwayGoals>=GRID)).sum()),
        calibration_source="2023/24 held-out XGB goal-rate predictions from frozen model; chronological date cutoff",
        limitation="XGB used whole 2023/24 season for early stopping; validation targets were not fitted, but this is not a strict prospective walk-forward prediction set",
        test_outcomes_used_for_fit=False,phase3_artifact_sha256=p3_hashes(),
        independent_baseline_hits=96,dc_challenger_hits=99,dc_rho=fitted["rho"],
        input_sha256={name:sha(OUT/name) for name in ("calibration_train.csv","calibration_validation.csv","calibration_raw_matrices.npy")},
        phase4_test_inputs_sha256=sha(P4/"frozen_test_inputs.csv"),
        phase4_matrices_sha256=sha(P4/"score_matrices.npz"))
    (OUT/"data_manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")
    print("Baselines reproduced: independent 96/760, DC 99/760; calibration split",len(train),len(valid))


def p3_hashes():
    return json.loads((P3/"training_manifest.json").read_text(encoding="utf-8"))["artifacts"]


def matrices_for(frame,all_raw):
    return all_raw[frame.index.to_numpy()]


def in_grid(frame,matrices):
    mask=(frame.ActualHomeGoals<GRID)&(frame.ActualAwayGoals<GRID)
    pairs=frame.loc[mask,["ActualHomeGoals","ActualAwayGoals"]].to_numpy(dtype=int)
    return matrices[mask.to_numpy()],pairs,int((~mask).sum())


def summarize(frame):
    counts=frame.Top1Score.value_counts().to_dict()
    p=np.array(list(counts.values()),dtype=float)/len(frame)
    precision={}
    for score in PRECISION_SCORES:
        part=frame[frame.Top1Score==score]
        precision[score]=dict(predicted=len(part),correct=int(part.ExactCorrect.sum()),
            precision=float(part.ExactCorrect.mean()) if len(part) else None)
    actual_mass=frame.ActualScore.value_counts(normalize=True).to_dict()
    predicted_mass=frame.Top1Score.value_counts(normalize=True).to_dict()
    union=set(actual_mass)|set(predicted_mass)
    tv=.5*sum(abs(actual_mass.get(score,0)-predicted_mass.get(score,0)) for score in union)
    supported=frame.ActualGridProbability.notna()
    return dict(matches=len(frame),exact_hits=int(frame.ExactCorrect.sum()),exact_top1=float(frame.ExactCorrect.mean()),
        top3_hits=int(frame.Top3Correct.sum()),top3_exact=float(frame.Top3Correct.mean()),
        conditional_grid_nll=float(-np.log(frame.loc[supported,"ActualGridProbability"]).mean()),
        grid_supported_matches=int(supported.sum()),predicted_scores=counts,
        top1_entropy_nats=float(-(p*np.log(p)).sum()),top1_frequency_tv_distance=float(tv),
        most_common_score=max(counts,key=counts.get),most_common_count=max(counts.values()),
        unique_scorelines=len(counts),count_1_1=int(counts.get("1-1",0)),count_2_1=int(counts.get("2-1",0)),
        predicted_draw_count=int(frame.Top1Score.map(lambda s:s.split('-')[0]==s.split('-')[1]).sum()),
        predicted_draw_rate=float(frame.Top1Score.map(lambda s:s.split('-')[0]==s.split('-')[1]).mean()),
        actual_draw_rate=float(frame.ActualScore.map(lambda s:s.split('-')[0]==s.split('-')[1]).mean()),
        score_conditional_precision=precision)


def evaluate_rows(source,raw_matrices,method,params=None,dc_matrices=None):
    rows=[]
    for i,row in enumerate(source.itertuples(index=False)):
        raw=raw_matrices[i]
        matrix=dc_matrices[i] if method=="dc" else apply(method,raw,params or {})
        if not np.isfinite(matrix).all() or (matrix<0).any() or not np.isclose(matrix.sum(),1,atol=1e-12):
            raise ValueError(f"Invalid calibrated matrix: {method}")
        top=top_scores(matrix,3)
        x,y=int(row.ActualHomeGoals),int(row.ActualAwayGoals)
        actual=f"{x}-{y}"
        inside=x<GRID and y<GRID
        rows.append(dict(Date=row.Date,HomeTeam=row.HomeTeam,AwayTeam=row.AwayTeam,
                         ActualScore=actual,ActualHomeGoals=x,ActualAwayGoals=y,
                         lambda_home_xgb=float(row.lambda_home_xgb),lambda_away_xgb=float(row.lambda_away_xgb),
                         Top1Score=top[0][0],Top1Probability=top[0][1],
                         Top3="|".join(z[0] for z in top),ExactCorrect=top[0][0]==actual,
                         Top3Correct=actual in [z[0] for z in top],
                         ActualGridProbability=float(matrix[x,y]) if inside else np.nan,
                         RawTop1Score=top_scores(raw,1)[0][0],RawTop1Probability=top_scores(raw,1)[0][1],
                         RawActualGridProbability=float(raw[x,y]) if inside else np.nan,
                         Method=method))
    return pd.DataFrame(rows)


def fit():
    if (OUT/"calibration_parameters.json").exists():
        raise FileExistsError("Refusing to overwrite frozen calibration")
    manifest=json.loads((OUT/"data_manifest.json").read_text(encoding="utf-8"))
    for name,expected in manifest["input_sha256"].items():
        if sha(OUT/name)!=expected:
            raise ValueError("Calibration input changed")
    train=pd.read_csv(OUT/"calibration_train.csv")
    val=pd.read_csv(OUT/"calibration_validation.csv")
    all_raw=np.load(OUT/"calibration_raw_matrices.npy")
    raw_train=all_raw[:len(train)]
    raw_val=all_raw[len(train):]
    fit_raw,pairs,excluded=in_grid(train,raw_train)
    temperature=fit_temperature(fit_raw,pairs)
    weights,expected,observed,supported=fit_score_specific(fit_raw,pairs)
    beta=fit_structured(fit_raw,pairs)
    params=dict(temperature=temperature,score_specific_weights=weights.tolist(),structured_beta=beta.tolist())
    validation={}
    val_rows=[]
    for method in CAL_METHODS:
        frame=evaluate_rows(val,raw_val,method,params)
        validation[method]=summarize(frame)
        val_rows.append(frame)
    pd.concat(val_rows).to_csv(OUT/"calibration_validation_results.csv",index=False)
    weights_table=[dict(score=f"{h}-{a}",expected_calibration_count=float(expected[h,a]),
                        observed_calibration_count=int(observed[h,a]),
                        supported=bool(supported[h,a]),multiplier=float(weights[h,a]))
                   for h in range(GRID) for a in range(GRID)]
    early_w,_,_,_=fit_score_specific(fit_raw[:len(fit_raw)//2],pairs[:len(pairs)//2])
    late_w,_,_,_=fit_score_specific(fit_raw[len(fit_raw)//2:],pairs[len(pairs)//2:])
    report=dict(experiment="score_calibration_v1",created_utc=now(),fitting_period="calibration train only",
        calibration_train_dates=manifest["train_dates"],calibration_train_matches=len(train),
        calibration_train_grid_supported=len(fit_raw),calibration_train_outside_grid=excluded,
        calibration_validation_dates=manifest["validation_dates"],calibration_validation_matches=len(val),
        test_outcomes_used=False,methods=("raw","temperature","score_specific","structured"),
        method_design=dict(temperature_bounds=TEMPERATURE_BOUNDS,temperature_objective="train conditional-grid NLL",
            score_specific_formula="w=(observed+10)/(expected+10) when expected>=3; otherwise w=1",
            score_specific_prior=SCORE_PRIOR,score_specific_min_expected_support=MIN_EXPECTED_SUPPORT,
            structured_features=FEATURE_NAMES,structured_l2=STRUCTURED_L2,
            structured_objective="train conditional-grid NLL + 0.5*5*||beta||^2"),
        temperature=temperature,score_specific_weights=weights.tolist(),score_specific_active_parameters=int(supported.sum()),
        score_specific_train_table=weights_table,structured_beta=beta.tolist(),
        validation_results=validation,
        score_specific_subperiod_stability=dict(first_half_1_1=float(early_w[1,1]),second_half_1_1=float(late_w[1,1]),
            first_half_2_1=float(early_w[2,1]),second_half_2_1=float(late_w[2,1])),
        source_sha256=manifest["input_sha256"],
        note="No hyperparameter chosen using 760 diagnostic outcomes; all three method designs and shrinkage constants are fixed")
    (OUT/"calibration_parameters.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
    print(json.dumps({"temperature":temperature,"active_score_weights":int(supported.sum()),
                      "structured_beta":beta.tolist(),"validation_hits":{name:value["exact_hits"] for name,value in validation.items()}},indent=2))


def diagnostic_evaluate():
    if (OUT/"report.json").exists():
        raise FileExistsError("Refusing to overwrite Phase 5 evaluation")
    reproduce()
    data=json.loads((OUT/"data_manifest.json").read_text(encoding="utf-8"))
    params=json.loads((OUT/"calibration_parameters.json").read_text(encoding="utf-8"))
    for name,expected in data["input_sha256"].items():
        if sha(OUT/name)!=expected or params["source_sha256"][name]!=expected:
            raise ValueError("Frozen pre-test calibration source changed")
    if sha(P4/"score_matrices.npz")!=data["phase4_matrices_sha256"]:
        raise ValueError("Phase 4 matrices changed")
    source=pd.read_csv(P4/"frozen_test_inputs.csv")
    phase4=np.load(P4/"score_matrices.npz")
    raw_mats=phase4["independent"]
    dc_mats=phase4["dc"]
    if len(source)!=760:
        raise ValueError("Diagnostic match count changed")
    frames={}
    matrices={}
    summaries={}
    for method in METHODS:
        mat=dc_mats if method=="dc" else np.stack([apply(method,r,params) for r in raw_mats])
        matrices[method]=mat
        frame=evaluate_rows(source,raw_mats,method,params,dc_mats)
        frame.to_csv(OUT/f"{method}_predictions.csv",index=False)
        frames[method]=frame
        summaries[method]=summarize(frame)
    if summaries["raw"]["exact_hits"]!=96 or summaries["dc"]["exact_hits"]!=99 or \
       frames["raw"].Top1Score.tolist()!=pd.read_csv(P4/"independent_predictions.csv").Top1Score.tolist() or \
       frames["dc"].Top1Score.tolist()!=pd.read_csv(P4/"dc_predictions.csv").Top1Score.tolist():
        raise ValueError("Frozen baseline scores changed")
    np.savez_compressed(OUT/"diagnostic_matrices.npz",**matrices)
    actual_counts=frames["raw"].ActualScore.value_counts().to_dict()
    table=pd.DataFrame([dict(Score=score,ActualCount=int(actual_counts.get(score,0)),ActualPct=100*actual_counts.get(score,0)/760,
        **{f"{name}Count":int((frames[name].Top1Score==score).sum()) for name in METHODS},
        **{f"{name}Pct":100*(frames[name].Top1Score==score).sum()/760 for name in METHODS}) for score in SCORES])
    table.to_csv(OUT/"score_distribution.csv",index=False)
    flips={}
    for method in ("temperature","score_specific","structured"):
        fresh=frames[method]
        ref=frames["raw"]
        flips[method]=dict(changed_top1=int((fresh.Top1Score!=ref.Top1Score).sum()),
            gained_vs_raw=int(((~ref.ExactCorrect)&fresh.ExactCorrect).sum()),
            lost_vs_raw=int((ref.ExactCorrect&(~fresh.ExactCorrect)).sum()),
            gained_vs_dc=int(((~frames["dc"].ExactCorrect)&fresh.ExactCorrect).sum()),
            lost_vs_dc=int((frames["dc"].ExactCorrect&(~fresh.ExactCorrect)).sum()))
    # Descriptive best method after every preregistered method is reported; no refitting.
    best=max(("temperature","score_specific","structured"),key=lambda m:(summaries[m]["exact_hits"],
        params["validation_results"][m]["exact_hits"],-METHODS.index(m)))
    changed=[]
    for i in np.flatnonzero(frames[best].Top1Score.to_numpy()!=frames["raw"].Top1Score.to_numpy()):
        row=source.iloc[i]
        changed.append(dict(Date=row.Date,HomeTeam=row.HomeTeam,AwayTeam=row.AwayTeam,
            ActualScore=frames["raw"].iloc[i].ActualScore,IndependentScore=frames["raw"].iloc[i].Top1Score,
            DCScore=frames["dc"].iloc[i].Top1Score,CalibratedScore=frames[best].iloc[i].Top1Score,
            lambda_home_xgb=float(row.lambda_home_xgb),lambda_away_xgb=float(row.lambda_away_xgb),
            RawTop1Probability=float(frames["raw"].iloc[i].Top1Probability),
            CalibratedTop1Probability=float(frames[best].iloc[i].Top1Probability),
            RawActualGridProbability=float(frames["raw"].iloc[i].ActualGridProbability),
            CalibratedActualGridProbability=float(frames[best].iloc[i].ActualGridProbability),
            RawExactCorrect=bool(frames["raw"].iloc[i].ExactCorrect),
            DCExactCorrect=bool(frames["dc"].iloc[i].ExactCorrect),
            CalibratedExactCorrect=bool(frames[best].iloc[i].ExactCorrect)))
    pd.DataFrame(changed).to_csv(OUT/"match_flips.csv",index=False)
    # Fixed confidence bins for calibration diagnostics, never used for method selection.
    bins=[0,.10,.125,.15,.20,1.01]
    confidence={}
    for method,frame in frames.items():
        confidence[method]=[]
        for lo,hi in zip(bins[:-1],bins[1:]):
            part=frame[(frame.Top1Probability>=lo)&(frame.Top1Probability<hi)]
            confidence[method].append(dict(lower=lo,upper=hi,matches=len(part),
                mean_top1_probability=float(part.Top1Probability.mean()) if len(part) else None,
                observed_exact_rate=float(part.ExactCorrect.mean()) if len(part) else None))
    report=dict(experiment="score_calibration_v1",created_utc=now(),
        baseline_independent_hits=96,challenger_dc_hits=99,feature_version="legacy_v1",score_grid="0..6 per side",
        calibration_parameters_file="calibration_parameters.json",data_manifest_file="data_manifest.json",
        best_calibration_method=best,methods=summaries,flips=flips,score_distribution=table.to_dict("records"),
        confidence_bins=confidence,
        nll_definition="Conditional 0..6-grid score-matrix NLL on identical 759/760 in-grid diagnostic matches; one out-of-grid score excluded explicitly for every method. Not directly comparable to Phase-4 untruncated NLL.",
        limitations=[data["limitation"],"The 760 diagnostic seasons were inspected repeatedly; no prospective proof.",
                     "No test-outcome-based multiplier, threshold, temperature or coefficient fit."])
    (OUT/"report.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
    print(json.dumps({name:{key:summaries[name][key] for key in ("exact_hits","exact_top1","top3_hits",
        "conditional_grid_nll","count_1_1","count_2_1","top1_frequency_tv_distance")} for name in METHODS},indent=2))
    print("best",best,"flips",flips)


def posthoc_diagnostics():
    """Describe frozen predictions without refitting or changing the evaluation."""
    report=json.loads((OUT/"report.json").read_text(encoding="utf-8"))
    source={name:pd.read_csv(OUT/f"{name}_predictions.csv") for name in METHODS}
    mats=np.load(OUT/"diagnostic_matrices.npz")
    rows=[]
    for method in ("temperature","score_specific","structured"):
        for i in np.flatnonzero(source[method].Top1Score.to_numpy()!=source["raw"].Top1Score.to_numpy()):
            raw=source["raw"].iloc[i]
            dc=source["dc"].iloc[i]
            cal=source[method].iloc[i]
            old=tuple(map(int,raw.Top1Score.split("-")))
            new=tuple(map(int,cal.Top1Score.split("-")))
            rows.append(dict(Method=method,Date=raw.Date,HomeTeam=raw.HomeTeam,AwayTeam=raw.AwayTeam,
                ActualScore=raw.ActualScore,RawScore=raw.Top1Score,DCScore=dc.Top1Score,
                CalibratedScore=cal.Top1Score,RawCorrect=bool(raw.ExactCorrect),
                DCCorrect=bool(dc.ExactCorrect),CalibratedCorrect=bool(cal.ExactCorrect),
                FlipType="gain" if cal.ExactCorrect else "loss" if raw.ExactCorrect else "other",
                LambdaHome=float(raw.lambda_home_xgb),LambdaAway=float(raw.lambda_away_xgb),
                RawOldScoreProbability=float(mats["raw"][i][old]),
                RawNewScoreProbability=float(mats["raw"][i][new]),
                CalibratedOldScoreProbability=float(mats[method][i][old]),
                CalibratedNewScoreProbability=float(mats[method][i][new])))
    columns=("Method","Date","HomeTeam","AwayTeam","ActualScore","RawScore","DCScore",
             "CalibratedScore","RawCorrect","DCCorrect","CalibratedCorrect","FlipType",
             "LambdaHome","LambdaAway","RawOldScoreProbability","RawNewScoreProbability",
             "CalibratedOldScoreProbability","CalibratedNewScoreProbability")
    pd.DataFrame(rows,columns=columns).to_csv(OUT/"all_calibration_rank_flips.csv",index=False)
    summary={}
    for name,frame in source.items():
        predicted=np.array([
            "H" if int(s.split("-")[0])>int(s.split("-")[1]) else
            "A" if int(s.split("-")[0])<int(s.split("-")[1]) else "D" for s in frame.Top1Score])
        actual=np.array(["H" if int(s.split("-")[0])>int(s.split("-")[1]) else
            "A" if int(s.split("-")[0])<int(s.split("-")[1]) else "D" for s in frame.ActualScore])
        summary[name]=dict(hda_top1_hits=int((predicted==actual).sum()),
            hda_top1_accuracy=float((predicted==actual).mean()),
            mean_draw_probability=float(np.trace(mats[name],axis1=1,axis2=2).mean()))
    (OUT/"posthoc_diagnostics.json").write_text(json.dumps(dict(experiment=report["experiment"],
        frozen_report_sha256=sha(OUT/"report.json"),methods=summary,
        rank_flip_rows=len(rows),test_outcomes_used_for_fitting=False),indent=2),encoding="utf-8")
    print("Posthoc rank-flip rows:",len(rows))


if __name__=="__main__":
    import sys
    if sys.argv[1:]==["prepare"]:
        prepare_data()
    elif sys.argv[1:]==["fit"]:
        fit()
    elif sys.argv[1:]==["evaluate"]:
        diagnostic_evaluate()
    elif sys.argv[1:]==["posthoc"]:
        posthoc_diagnostics()
    else:
        raise SystemExit("Use prepare, fit or evaluate")
