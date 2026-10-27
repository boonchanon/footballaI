"""Frozen Phase-8 high-score audit; diagnostics and non-deployable oracles only."""
from __future__ import annotations

import json
from datetime import datetime,timezone

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

from src.models.ml_goal_rates_v1 import ROOT,OUT as P3,sha
from src.evaluation.score_calibration_v1 import reproduce,OUT as P5
from src.evaluation.score_dependency_v1 import OUT as P4
from src.evaluation.outcome_aware_score_selection_v1 import OUT as P6
from src.evaluation.goal_rate_feature_expansion_v1 import OUT as P7
from src.models.score_dependency import independent_matrix,dixon_coles_matrix,top_scores
from src.models.outcome_aware_score_selection import outcome_of_score,masks

OUT=ROOT/"data/processed/high_score_underdispersion_audit_v1"
GRID=7
RANGES=((0,2,"<2.0"),(2,2.5,"2.0–2.49"),(2.5,3,"2.5–2.99"),
        (3,3.5,"3.0–3.49"),(3.5,float("inf"),"≥3.5"))
FAMILIES=("0-0","1-0","0-1","1-1","2-0","0-2","2-1","1-2","2-2",
          "3-0","0-3","3-1","1-3","3-2","2-3")
TOTAL_LABELS=("0","1","2","3","4","5","6+")


def timestamp():
    return datetime.now(timezone.utc).isoformat()


def actual_rank(matrix: np.ndarray,home: int,away: int):
    """Stable grid rank; outside-grid actuals have sentinel rank 50 and probability 0."""
    if matrix.shape!=(GRID,GRID) or not np.isclose(matrix.sum(),1,atol=1e-12):
        raise ValueError("Expected normalized 0..6 matrix")
    if home<0 or away<0:
        raise ValueError("Goals must be nonnegative")
    if home>=GRID or away>=GRID:
        return 50,0.0,True
    index=home*GRID+away
    order=np.argsort(-matrix.ravel(),kind="stable")
    return int(np.flatnonzero(order==index)[0]+1),float(matrix[home,away]),False


def constrained_top(matrix: np.ndarray,total: int,actual_outcome: str|None=None):
    """True-total / true-outcome oracle: never a deployable prediction."""
    home,away=np.indices(matrix.shape)
    eligible=(home+away==total)
    if actual_outcome is not None:
        eligible &= masks(matrix.shape)[actual_outcome]
    positions=np.flatnonzero(eligible.ravel())
    if not len(positions):
        return None,None
    flat=matrix.ravel()
    index=positions[np.argsort(-flat[positions],kind="stable")][0]
    return f"{index//GRID}-{index%GRID}",float(flat[index])


def describe(values):
    values=np.asarray(values,dtype=float)
    return dict(matches=len(values),mean=float(values.mean()),median=float(np.median(values)),
        std=float(values.std(ddof=0)),variance=float(values.var(ddof=0)),
        min=float(values.min()),q25=float(np.quantile(values,.25)),q75=float(np.quantile(values,.75)),
        max=float(values.max()))


def rank_bucket(rank):
    return "outside_grid" if rank==50 else "Top1" if rank==1 else "Top2" if rank==2 else \
        "Top3" if rank==3 else "Top4–5" if rank<=5 else "Top6–10" if rank<=10 else ">10"


def total_bucket(total):
    return "6+" if total>=6 else str(total)


def scoring_group(total):
    return "LOW_0-1" if total<=1 else "MEDIUM_2-3" if total<=3 else "HIGH_4+"


def prepare():
    if OUT.exists():
        raise FileExistsError("Refusing to overwrite Phase-8 outputs")
    source,rates,fit=reproduce()
    phase4=np.load(P4/"score_matrices.npz")
    independent,dc=phase4["independent"],phase4["dc"]
    phase4_i=pd.read_csv(P4/"independent_predictions.csv")
    phase4_d=pd.read_csv(P4/"dc_predictions.csv")
    phase3=pd.read_csv(P3/"pure_xgb_matches.csv")
    actual=[f"{int(h)}-{int(a)}" for h,a in source[["ActualHomeGoals","ActualAwayGoals"]].itertuples(index=False,name=None)]
    keys=["Date","HomeTeam","AwayTeam"]
    if len(source)!=760 or not np.array_equal(rates,np.load(P3/"diagnostic_rates.npz")["xgb"]) or \
       actual!=phase4_i.ActualScore.tolist() or actual!=phase4_d.ActualScore.tolist() or \
       list(source[keys].itertuples(index=False,name=None))!=list(phase4_i[keys].itertuples(index=False,name=None)):
        raise ValueError("Frozen fixtures, actuals or lambdas changed")
    baseline=[top_scores(matrix,1)[0][0] for matrix in independent]
    dc_score=[top_scores(matrix,1)[0][0] for matrix in dc]
    if baseline!=phase4_i.Top1Score.tolist() or baseline!=phase3.PredictedScore.tolist() or \
       dc_score!=phase4_d.Top1Score.tolist() or sum(a==b for a,b in zip(actual,baseline))!=96 or \
       sum(a==b for a,b in zip(actual,dc_score))!=99:
        raise ValueError("Frozen baseline matchwise reproduction failed")
    if max(np.max(abs(independent[i]-independent_matrix(*rate))) for i,rate in enumerate(rates))>1e-14 or \
       max(np.max(abs(dc[i]-dixon_coles_matrix(*rate,fit["rho"]))) for i,rate in enumerate(rates))>1e-14:
        raise ValueError("Frozen matrices/rho changed")
    p7=json.loads((P7/"training_manifest.json").read_text())
    erates=np.load(P7/"E_congestion_rates.npy")
    if sha(P7/"E_congestion_rates.npy")!=p7["variants"]["E_congestion"]["rates_sha256"] or erates.shape!=(760,2):
        raise ValueError("Frozen Phase-7 E rates changed")
    p7pred=pd.read_csv(P7/"predictions.csv")
    epred=p7pred[p7pred.Variant=="E_congestion"]
    if len(epred)!=760 or epred.ActualScore.tolist()!=actual or \
       not np.allclose(epred[["lambda_home","lambda_away"]],erates,rtol=0,atol=1e-12) or \
       int(epred.DCExactCorrect.sum())!=101:
        raise ValueError("Phase-7 E+DC reference differs")
    OUT.mkdir(parents=True)
    manifest=dict(experiment="high_score_underdispersion_audit_v1",created_utc=timestamp(),
        test_matches=760,feature_version="legacy_v1",lambda_source="frozen Phase-3 XGB",
        score_grid="0..6 per side, normalized",fixed_dc_rho=fit["rho"],
        phase3_artifact_sha256=json.loads((P3/"training_manifest.json").read_text())["artifacts"],
        phase4_matrix_sha256=sha(P4/"score_matrices.npz"),
        phase4_test_inputs_sha256=sha(P4/"frozen_test_inputs.csv"),
        phase5_protected_sha256={n:sha(P5/n) for n in ("report.json","final_report.md")},
        phase6_protected_sha256={n:sha(P6/n) for n in ("report.json","final_report.md")},
        phase7_protected_sha256={n:sha(P7/n) for n in ("report.json","final_report.md",
            "training_manifest.json","E_congestion_rates.npy")},
        no_model_training=True,no_lambda_modification=True,no_score_weighting=True,
        fixed_total_bins=[label for _,_,label in RANGES],
        boundary_distance_definition="distance to nearest integer lambda boundary in {1,..,6}; close if <=0.10, near if <=0.25; defined before outcome inspection",
        outside_grid_policy="actual 7-0 has grid probability 0 and rank sentinel 50; oracle can route total but cannot recover missing actual cell",
        limitation="760 repeatedly inspected historical fixtures; all oracle paths use actual result information and are non-deployable")
    (OUT/"data_manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")
    return source,rates,fit,independent,dc,erates


def evaluate():
    source,rates,fit,independent,dc,erates=prepare()
    rows=[]
    congestion=[]
    compare_dc=[]
    for i,match in enumerate(source.itertuples(index=False)):
        x,y=int(match.ActualHomeGoals),int(match.ActualAwayGoals)
        actual=f"{x}-{y}"; total=x+y; outcome=outcome_of_score(actual)
        raw=independent[i]; dc_matrix=dc[i]
        top=top_scores(raw,5); dc_top=top_scores(dc_matrix,5)
        rank,prob,outside=actual_rank(raw,x,y)
        dcrank,dcprob,_=actual_rank(dc_matrix,x,y)
        score=top[0][0]
        top_total=sum(map(int,score.split("-")))
        total_oracle,total_oracle_prob=constrained_top(raw,total)
        combined_oracle,combined_prob=constrained_top(raw,total,outcome)
        if total_oracle is None or combined_oracle is None:
            raise ValueError("Actual total/outcome region absent from grid")
        ehome,eaway=map(float,erates[i]); eraw=independent_matrix(ehome,eaway)
        edc=dixon_coles_matrix(ehome,eaway,fit["rho"])
        erank,eprob,_=actual_rank(eraw,x,y)
        edcrank,edcprob,_=actual_rank(edc,x,y)
        e_score=top_scores(eraw,1)[0][0]; edc_score=top_scores(edc,1)[0][0]
        rows.append(dict(Date=match.Date,HomeTeam=match.HomeTeam,AwayTeam=match.AwayTeam,
            ActualScore=actual,ActualOutcome=outcome,ActualHomeGoals=x,ActualAwayGoals=y,
            ActualTotalGoals=total,ActualGoalGroup=scoring_group(total),ActualTotalBucket=total_bucket(total),
            LambdaHome=float(rates[i,0]),LambdaAway=float(rates[i,1]),LambdaTotal=float(rates[i].sum()),
            ExpectedTotalError=float(rates[i].sum()-total),
            Top1Score=score,Top1Probability=top[0][1],Top1TotalGoals=top_total,
            Top1TotalBucket=total_bucket(top_total),ExactCorrect=score==actual,
            ActualScoreGridProbability=prob,ActualScoreGridRank=rank,
            ActualScoreRankBucket=rank_bucket(rank),OutsideGrid=outside,
            Top3Scores="|".join(item[0] for item in top[:3]),
            Top5Scores="|".join(item[0] for item in top),
            TrueTotalOracleScore=total_oracle,TrueTotalOracleProbability=total_oracle_prob,
            TrueTotalOracleCorrect=total_oracle==actual,
            CombinedOracleScore=combined_oracle,CombinedOracleProbability=combined_prob,
            CombinedOracleCorrect=combined_oracle==actual,
            HomeGoalAbsError=abs(float(rates[i,0])-x),AwayGoalAbsError=abs(float(rates[i,1])-y),
            TotalGoalAbsError=abs(float(rates[i].sum())-total)))
        congestion.append(dict(Date=match.Date,HomeTeam=match.HomeTeam,AwayTeam=match.AwayTeam,
            ActualScore=actual,ActualTotalGoals=total,HighActual=total>=4,
            BaselineLambdaHome=float(rates[i,0]),BaselineLambdaAway=float(rates[i,1]),
            BaselineLambdaTotal=float(rates[i].sum()),EHome=ehome,EAway=eaway,ETotal=ehome+eaway,
            DeltaLambdaTotal=ehome+eaway-float(rates[i].sum()),
            BaselineTotalAbsError=abs(float(rates[i].sum())-total),
            ETotalAbsError=abs(ehome+eaway-total),BaselineActualGridRank=rank,
            EActualGridRank=erank,BaselineTop1Score=score,ETop1Score=e_score,
            BaselineDCTop1Score=dc_top[0][0],EDCTop1Score=edc_score,
            BaselineDCCorrect=dc_top[0][0]==actual,EDCCorrect=edc_score==actual,
            EActualGridProbability=eprob,EActualDCGridRank=edcrank,EActualDCGridProbability=edcprob))
        compare_dc.append(dict(Date=match.Date,HomeTeam=match.HomeTeam,AwayTeam=match.AwayTeam,
            ActualScore=actual,ActualTotalGoals=total,HighActual=total>=4,
            LambdaHome=float(rates[i,0]),LambdaAway=float(rates[i,1]),
            IndependentTop1=score,DCTop1=dc_top[0][0],
            IndependentCorrect=score==actual,DCCorrect=dc_top[0][0]==actual,
            IndependentActualRank=rank,DCActualRank=dcrank,
            IndependentActualGridProbability=prob,DCActualGridProbability=dcprob,
            IndependentTop3="|".join(item[0] for item in top[:3]),
            DCTop3="|".join(item[0] for item in dc_top[:3])))
    frame=pd.DataFrame(rows)
    eframe=pd.DataFrame(congestion)
    dframe=pd.DataFrame(compare_dc)
    frame.to_csv(OUT/"actual_score_ranks.csv",index=False)
    eframe.to_csv(OUT/"baseline_vs_congestion.csv",index=False)
    dframe.to_csv(OUT/"independent_vs_dc.csv",index=False)
    frame[["Date","HomeTeam","AwayTeam","ActualScore","ActualOutcome","ActualTotalGoals",
           "TrueTotalOracleScore","TrueTotalOracleProbability","TrueTotalOracleCorrect"]].assign(
        OracleNonDeployable=True,UsesActualResultInformation=True).to_csv(OUT/"oracle_total_goals.csv",index=False)
    frame[["Date","HomeTeam","AwayTeam","ActualScore","ActualOutcome","ActualTotalGoals",
           "CombinedOracleScore","CombinedOracleProbability","CombinedOracleCorrect"]].assign(
        OracleNonDeployable=True,UsesActualResultInformation=True).to_csv(OUT/"oracle_combined.csv",index=False)
    frame[frame.ActualTotalGoals>=4].to_csv(OUT/"high_score_matches.csv",index=False)
    goal_distribution=[]
    for label in TOTAL_LABELS:
        actual_part=frame[frame.ActualTotalBucket==label]
        goal_distribution.append(dict(TotalBucket=label,ActualMatches=len(actual_part),
            ActualPct=100*len(actual_part)/760,BaselineExactHits=int(actual_part.ExactCorrect.sum()),
            BaselineExactAccuracy=float(actual_part.ExactCorrect.mean()) if len(actual_part) else None,
            PredictedTop1Matches=int((frame.Top1TotalBucket==label).sum()),
            PredictedTop1Pct=100*(frame.Top1TotalBucket==label).sum()/760))
    pd.DataFrame(goal_distribution).to_csv(OUT/"goal_total_distribution.csv",index=False)
    group_table=[]
    for label in ("LOW_0-1","MEDIUM_2-3","HIGH_4+"):
        part=frame[frame.ActualGoalGroup==label]
        group_table.append(dict(ActualGoalGroup=label,Matches=len(part),
            ActualPct=100*len(part)/760,MeanActualGoals=float(part.ActualTotalGoals.mean()),
            MeanExpectedGoals=float(part.LambdaTotal.mean()),MeanTop1Goals=float(part.Top1TotalGoals.mean()),
            ExactHits=int(part.ExactCorrect.sum()),ExactAccuracy=float(part.ExactCorrect.mean()),
            MeanLambdaHome=float(part.LambdaHome.mean()),MeanLambdaAway=float(part.LambdaAway.mean())))
    pd.DataFrame(group_table).to_csv(OUT/"low_medium_high_groups.csv",index=False)
    bins=[]
    for low,high,label in RANGES:
        part=frame[(frame.LambdaTotal>=low)&(frame.LambdaTotal<high)]
        bins.append(dict(LambdaTotalBin=label,Lower=low,Upper=high if np.isfinite(high) else None,
            Matches=len(part),MeanLambdaTotal=float(part.LambdaTotal.mean()) if len(part) else None,
            MeanActualTotal=float(part.ActualTotalGoals.mean()) if len(part) else None,
            MedianActualTotal=float(part.ActualTotalGoals.median()) if len(part) else None,
            ActualHighPct=100*(part.ActualTotalGoals>=4).mean() if len(part) else None,
            ExactHits=int(part.ExactCorrect.sum()),ExactAccuracy=float(part.ExactCorrect.mean()) if len(part) else None))
    pd.DataFrame(bins).to_csv(OUT/"goal_total_bins.csv",index=False)
    lambda_diag=[]
    for label,part in (("all",frame),("actual_high_4+",frame[frame.ActualTotalGoals>=4]),
                       ("actual_not_high",frame[frame.ActualTotalGoals<4])):
        for variable in ("LambdaHome","LambdaAway","LambdaTotal","ActualTotalGoals",
                         "Top1TotalGoals","ExpectedTotalError"):
            lambda_diag.append(dict(Group=label,Variable=variable,**describe(part[variable])))
    pd.DataFrame(lambda_diag).to_csv(OUT/"lambda_total_diagnostics.csv",index=False)
    mechanics=[]
    for i,row in frame.iterrows():
        for side,column in (("Home","LambdaHome"),("Away","LambdaAway")):
            value=row[column]
            nearest=min(range(1,GRID),key=lambda integer:abs(value-integer))
            distance=abs(value-nearest)
            mechanics.append(dict(Date=row.Date,HomeTeam=row.HomeTeam,AwayTeam=row.AwayTeam,
                Side=side,Lambda=value,NearestIntegerBoundary=nearest,DistanceToBoundary=distance,
                CloseWithin0_10=distance<=.1,NearWithin0_25=distance<=.25,
                MarginalMode=int(row.Top1Score.split("-")[0 if side=="Home" else 1])))
    pd.DataFrame(mechanics).to_csv(OUT/"poisson_mode_boundaries.csv",index=False)
    mode_regions=[]
    for homebin in range(GRID):
        for awaybin in range(GRID):
            part=frame[(frame.LambdaHome>=homebin)&(frame.LambdaHome<homebin+1)&
                       (frame.LambdaAway>=awaybin)&(frame.LambdaAway<awaybin+1)]
            mode_regions.append(dict(HomeLambdaRange=f"[{homebin},{homebin+1})",
                AwayLambdaRange=f"[{awaybin},{awaybin+1})",Matches=len(part),
                Top1Scores="|".join(f"{score}:{count}" for score,count in part.Top1Score.value_counts().items())))
    pd.DataFrame(mode_regions).to_csv(OUT/"poisson_mode_regions.csv",index=False)
    family=[]
    for score in FAMILIES:
        part=frame[frame.ActualScore==score]
        family.append(dict(Score=score,ActualCount=len(part),PredictedTop1Count=int((frame.Top1Score==score).sum()),
            CorrectHits=int(((frame.Top1Score==score)&(frame.ActualScore==score)).sum()),
            MeanActualScoreRank=float(part.ActualScoreGridRank.mean()) if len(part) else None,
            MeanLambdaHome=float(part.LambdaHome.mean()) if len(part) else None,
            MeanLambdaAway=float(part.LambdaAway.mean()) if len(part) else None))
    pd.DataFrame(family).to_csv(OUT/"score_family_analysis.csv",index=False)
    high=frame[frame.ActualTotalGoals>=4]
    good=high.sort_values(["ActualScoreGridRank","Date"]).head(5)
    bad=high.sort_values(["ActualScoreGridRank","Date"],ascending=[False,True]).head(5)
    pd.concat([good.assign(ExampleType="better_rank"),bad.assign(ExampleType="poor_rank")])[
        ["ExampleType","Date","HomeTeam","AwayTeam","ActualScore","LambdaHome","LambdaAway",
         "LambdaTotal","Top1Score","Top1Probability","ActualScoreGridProbability",
         "ActualScoreGridRank","Top3Scores","Top5Scores"]].to_csv(OUT/"high_score_examples.csv",index=False)
    report=build_report(frame,eframe,dframe,fit,goal_distribution,group_table,bins)
    (OUT/"report.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
    print(json.dumps({key:report[key] for key in ("baseline_exact_hits","dc_exact_hits","e_congestion_dc_hits",
        "actual_high_matches","high_exact_hits","lambda_total_roc_auc","true_total_oracle_hits",
        "phase6_true_outcome_oracle_hits","combined_oracle_hits")},indent=2))


def build_report(frame,eframe,dframe,fit,goal_distribution,group_table,bins):
    high=frame[frame.ActualTotalGoals>=4]
    nothigh=frame[frame.ActualTotalGoals<4]
    actual_rank_counts={label:int((frame.ActualScoreRankBucket==label).sum()) for label in
        ("Top1","Top2","Top3","Top4–5","Top6–10",">10","outside_grid")}
    rank_by_group={}
    for group,part in frame.groupby("ActualGoalGroup"):
        rank_by_group[group]=dict(matches=len(part),rank_counts=part.ActualScoreRankBucket.value_counts().to_dict(),
            top1=int((part.ActualScoreGridRank<=1).sum()),top3=int((part.ActualScoreGridRank<=3).sum()),
            top5=int((part.ActualScoreGridRank<=5).sum()),top10=int((part.ActualScoreGridRank<=10).sum()),
            mean_rank=float(part.ActualScoreGridRank.mean()),median_rank=float(part.ActualScoreGridRank.median()))
    side_extremes={}
    for side in ("Home","Away"):
        part=frame[frame[f"Actual{side}Goals"]>=3]
        side_extremes[side]=dict(matches=len(part),mean_actual_goals=float(part[f"Actual{side}Goals"].mean()),
            mean_predicted_lambda=float(part[f"Lambda{side}"].mean()),
            goal_mae=float(part[f"{side}GoalAbsError"].mean()),
            lambda_distribution=describe(part[f"Lambda{side}"]))
    boundaries=[]
    for side in ("Home","Away"):
        values=frame[f"Lambda{side}"].to_numpy()
        distance=np.min(abs(values[:,None]-np.arange(1,GRID)[None,:]),axis=1)
        boundaries.append(dict(side=side,close_within_0_10=int((distance<=.1).sum()),
            near_within_0_25=int((distance<=.25).sum()),far_over_0_25=int((distance>.25).sum())))
    zero=frame[frame.ActualScore=="0-0"]
    two=frame[frame.ActualScore=="2-2"]
    zero_two=dict(actual_0_0=len(zero),actual_2_2=len(two),predicted_0_0=int((frame.Top1Score=="0-0").sum()),
        predicted_2_2=int((frame.Top1Score=="2-2").sum()),
        lambda_both_lt_1=int(((frame.LambdaHome<1)&(frame.LambdaAway<1)).sum()),
        lambda_both_ge_2=int(((frame.LambdaHome>=2)&(frame.LambdaAway>=2)).sum()),
        actual_0_0_lambda_distribution={side:describe(zero[f"Lambda{side}"]) for side in ("Home","Away")},
        actual_2_2_lambda_distribution={side:describe(two[f"Lambda{side}"]) for side in ("Home","Away")},
        p_0_0_over_p_1_1_formula="1/(lambda_home*lambda_away)",
        p_2_2_over_p_1_1_formula="lambda_home*lambda_away/4")
    high_compare=eframe[eframe.HighActual]
    high_dc=dframe[dframe.HighActual]
    phase6=json.loads((P6/"report.json").read_text())
    return dict(experiment="high_score_underdispersion_audit_v1",created_utc=timestamp(),
        baseline_exact_hits=int(frame.ExactCorrect.sum()),dc_exact_hits=int(dframe.DCCorrect.sum()),
        e_congestion_dc_hits=int(eframe.EDCCorrect.sum()),matches=len(frame),
        actual_high_matches=len(high),high_exact_hits=int(high.ExactCorrect.sum()),
        actual_goal_total_distribution=goal_distribution,low_medium_high_groups=group_table,
        actual_total_summary=describe(frame.ActualTotalGoals),
        expected_total_summary=describe(frame.LambdaTotal),top1_total_summary=describe(frame.Top1TotalGoals),
        expected_total_error_summary=describe(frame.ExpectedTotalError),
        high_score_summary=dict(matches=len(high),mean_actual_total=float(high.ActualTotalGoals.mean()),
            mean_expected_total=float(high.LambdaTotal.mean()),mean_top1_total=float(high.Top1TotalGoals.mean()),
            home_goal_mae=float(high.HomeGoalAbsError.mean()),away_goal_mae=float(high.AwayGoalAbsError.mean()),
            total_goal_mae=float(high.TotalGoalAbsError.mean()),exact_hits=int(high.ExactCorrect.sum()),
            lambda_home=describe(high.LambdaHome),lambda_away=describe(high.LambdaAway),
            lambda_total=describe(high.LambdaTotal)),
        not_high_lambda_total=describe(nothigh.LambdaTotal),
        lambda_total_roc_auc=float(roc_auc_score(frame.ActualTotalGoals>=4,frame.LambdaTotal)),
        total_goal_fixed_bins=bins,team_side_extreme_goals=side_extremes,
        poisson_mode_boundaries=boundaries,actual_score_rank_counts=actual_rank_counts,
        rank_by_actual_goal_group=rank_by_group,
        high_score_rank=dict(mean=float(high.ActualScoreGridRank.mean()),
            median=float(high.ActualScoreGridRank.median()),
            top1=int((high.ActualScoreGridRank<=1).sum()),top3=int((high.ActualScoreGridRank<=3).sum()),
            top5=int((high.ActualScoreGridRank<=5).sum()),top10=int((high.ActualScoreGridRank<=10).sum()),
            outside_grid=int(high.OutsideGrid.sum())),
        true_total_oracle_hits=int(frame.TrueTotalOracleCorrect.sum()),
        phase6_true_outcome_oracle_hits=phase6["oracle_non_deployable_diagnostic"]["oracle_independent"]["exact_hits"],
        combined_oracle_hits=int(frame.CombinedOracleCorrect.sum()),
        oracles_non_deployable=True,oracle_uses_actual_result_information=True,
        zero_zero_two_two=zero_two,
        congestion_high_comparison=dict(matches=len(high_compare),mean_baseline_lambda_total=float(high_compare.BaselineLambdaTotal.mean()),
            mean_e_lambda_total=float(high_compare.ETotal.mean()),
            mean_delta_lambda_total=float(high_compare.DeltaLambdaTotal.mean()),
            baseline_total_mae=float(high_compare.BaselineTotalAbsError.mean()),
            e_total_mae=float(high_compare.ETotalAbsError.mean()),
            baseline_mean_actual_rank=float(high_compare.BaselineActualGridRank.mean()),
            e_mean_actual_rank=float(high_compare.EActualGridRank.mean()),
            baseline_high_dc_hits=int(high_compare.BaselineDCCorrect.sum()),
            e_high_dc_hits=int(high_compare.EDCCorrect.sum())),
        dc_high_comparison=dict(matches=len(high_dc),independent_high_hits=int(high_dc.IndependentCorrect.sum()),
            dc_high_hits=int(high_dc.DCCorrect.sum()),
            independent_high_mean_actual_rank=float(high_dc.IndependentActualRank.mean()),
            dc_high_mean_actual_rank=float(high_dc.DCActualRank.mean()),
            changed_high_top1=int((high_dc.IndependentTop1!=high_dc.DCTop1).sum())),
        no_model_training=True,no_score_weighting=True,no_test_fitted_threshold=True,
        nll_note="No new score distribution or model fitted; normalized 0..6 grid ranks/conditional probabilities only",
        outside_grid_note="One actual 7-0 lies outside 0..6 grid: probability 0, rank sentinel 50; all oracle hits remain validly counted as misses")


def posthoc_probability_diagnostic():
    """Check predictive count dispersion without fitting or changing frozen diagnostics."""
    from scipy.stats import poisson
    report=json.loads((OUT/"report.json").read_text())
    frame=pd.read_csv(OUT/"actual_score_ranks.csv")
    lambdas=frame.LambdaTotal.to_numpy()
    high_mass=poisson.sf(3,lambdas)
    modes=np.array([tuple(map(int,score.split("-"))) for score in frame.Top1Score])
    floors=np.column_stack([np.floor(frame.LambdaHome).astype(int),
                            np.floor(frame.LambdaAway).astype(int)])
    entries=[]
    for score in ("0-0","2-2"):
        part=frame[frame.ActualScore==score]
        product=part.LambdaHome*part.LambdaAway
        ratio=1/product if score=="0-0" else product/4
        entries.append(dict(Score=score,ActualMatches=len(part),GlobalSelections=int((frame.Top1Score==score).sum()),
            CompetingTop1=part.Top1Score.value_counts().to_dict(),MeanActualGridRank=float(part.ActualScoreGridRank.mean()),
            MedianActualGridRank=float(part.ActualScoreGridRank.median()),
            MeanLambdaProduct=float(product.mean()),MedianCellProbabilityRatioVs1_1=float(ratio.median())))
    pd.DataFrame(entries).to_csv(OUT/"zero_two_mode_mechanics.csv",index=False)
    result=dict(experiment=report["experiment"],created_utc=timestamp(),
        frozen_report_sha256=sha(OUT/"report.json"),
        predicted_poisson_high_4_plus_probability_mean=float(high_mass.mean()),
        actual_high_4_plus_rate=float((frame.ActualTotalGoals>=4).mean()),
        predictive_marginal_total_variance=float(lambdas.mean()+lambdas.var(ddof=0)),
        actual_total_variance=float(frame.ActualTotalGoals.var(ddof=0)),
        lambda_total_across_fixture_variance=float(lambdas.var(ddof=0)),
        top1_marginal_modes_equal_floor_lambdas=int(np.all(modes==floors,axis=1).sum()),
        zero_two_mechanics=entries,
        note="Untruncated Poisson count mixture has Var(T)=E(lambda_total)+Var(lambda_total); this differs from across-fixture variance of point-estimate lambdas. No model or threshold was fitted")
    (OUT/"count_dispersion_addendum.json").write_text(json.dumps(result,indent=2),encoding="utf-8")
    print("Count dispersion diagnostic saved; marginal modes",result["top1_marginal_modes_equal_floor_lambdas"])


if __name__=="__main__":
    import sys
    if sys.argv[1:]==["evaluate"]:
        evaluate()
    elif sys.argv[1:]==["posthoc"]:
        posthoc_probability_diagnostic()
    else:
        raise SystemExit("Use evaluate or posthoc")
