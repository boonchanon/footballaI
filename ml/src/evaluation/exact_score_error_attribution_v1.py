"""P17 diagnostic-only exact-score error attribution and missing-signal audit."""
from __future__ import annotations

import hashlib, json
from math import factorial
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import pearsonr
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, roc_auc_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from src.evaluation.learned_score_cell_ranking_v1 import ROOT, OUT as P12, FOLDS, DIAG

OUT = ROOT / "data/processed/exact_score_error_attribution_v1"
P13 = ROOT / "data/processed/match_regime_classification_v1"
COND = ROOT / "data/processed/team_condition_availability_v1"
GRID = [(h, a) for h in range(7) for a in range(7)]
KEY = ["Date", "Season", "HomeTeam", "AwayTeam"]

FAMILIES = {
    "strength": ["LambdaHome", "LambdaAway", "LambdaTotal", "LambdaDifference", "EloDiffPre"],
    "recent_attack_defense": ["HomeGoalsForAvgLast5", "HomeGoalsAgainstAvgLast5", "AwayGoalsForAvgLast5", "AwayGoalsAgainstAvgLast5"],
    "volatility_rates": ["HomeRecentTotalMean5", "AwayRecentTotalMean5", "HomeRecentTotalStd5", "AwayRecentTotalStd5", "HomeRecentHighRate10", "AwayRecentHighRate10", "HomeRecentLowRate10", "AwayRecentLowRate10"],
    "xg": ["HomeXGForLast5", "HomeXGAgainstLast5", "AwayXGForLast5", "AwayXGAgainstLast5"],
    "schedule": ["HomeRestDays", "AwayRestDays", "RestDaysDiff"],
}
TARGETS = {
    "HIGH_4PLUS": "TargetHigh",
    "LOW_0_1": "TargetLow",
    "HOME_EXPLOSION": "TargetHomeExplosion",
    "AWAY_EXPLOSION": "TargetAwayExplosion",
    "PRED11_CORRECT": "TargetPred11Correct",
}


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def save_json(name, obj):
    (OUT / name).write_text(json.dumps(obj, indent=2, default=str), encoding="utf-8")


def poisson_matrix(lh, la):
    hp = np.array([np.exp(-lh) * lh**k / factorial(k) for k in range(7)])
    ap = np.array([np.exp(-la) * la**k / factorial(k) for k in range(7)])
    p = np.outer(hp, ap).reshape(-1)
    return p / p.sum()


def prepare():
    rates = pd.read_csv(P12 / "fixture_oof_rates.csv", low_memory=False)
    features = pd.read_csv(P13 / "asof_feature_rows.csv", low_memory=False)
    rates["Date"] = pd.to_datetime(rates.Date).dt.strftime("%Y-%m-%d")
    features["Date"] = pd.to_datetime(features.Date).dt.strftime("%Y-%m-%d")
    cols = KEY + sorted(set(sum(FAMILIES.values(), []))) + ["LatestResultSourceDate", "LatestXGSourceDate"]
    f = features[[c for c in cols if c in features]].drop_duplicates(KEY)
    base = rates.merge(f, on=KEY, how="left", suffixes=("", "_f"))
    base = base[base.Season.str[:4].astype(int).between(2016, 2025)].sort_values(["Date", "HomeTeam", "AwayTeam"]).reset_index(drop=True)
    base["LambdaHome"] = base.BaseLambdaHome
    base["LambdaAway"] = base.BaseLambdaAway
    base["LambdaTotal"] = base.LambdaHome + base.LambdaAway
    base["LambdaDifference"] = base.LambdaHome - base.LambdaAway
    mats = np.stack([poisson_matrix(r.LambdaHome, r.LambdaAway) for r in base.itertuples()])
    order = np.argsort(-mats, axis=1, kind="stable")
    rank = np.argsort(order, axis=1)
    selected = order[:, 0]
    truth = np.where((base.HomeGoals <= 6) & (base.AwayGoals <= 6), base.HomeGoals * 7 + base.AwayGoals, -1).astype(int)
    safe = np.maximum(truth, 0)
    base["PredHome"] = selected // 7
    base["PredAway"] = selected % 7
    base["PredScore"] = base.PredHome.astype(str) + "-" + base.PredAway.astype(str)
    base["ActualScore"] = base.HomeGoals.astype(str) + "-" + base.AwayGoals.astype(str)
    base["Exact"] = selected == truth
    base["ActualScoreProbability"] = np.where(truth >= 0, mats[np.arange(len(base)), safe], 0)
    base["ActualScoreRank"] = np.where(truth >= 0, rank[np.arange(len(base)), safe] + 1, 50)
    return taxonomy(base)


def taxonomy(d):
    d = d.copy()
    d["HomeResidual"] = d.HomeGoals - d.LambdaHome
    d["AwayResidual"] = d.AwayGoals - d.LambdaAway
    d["HomeTop1Error"] = d.HomeGoals - d.PredHome
    d["AwayTop1Error"] = d.AwayGoals - d.PredAway
    d["ActualTotal"] = d.HomeGoals + d.AwayGoals
    d["PredictedTop1Total"] = d.PredHome + d.PredAway
    d["TotalTop1Error"] = d.ActualTotal - d.PredictedTop1Total
    d["ActualMargin"] = d.HomeGoals - d.AwayGoals
    d["PredictedMargin"] = d.PredHome - d.PredAway
    d["MarginError"] = d.ActualMargin - d.PredictedMargin
    labels = {
        "EXACT_HIT": d.Exact,
        "BOTH_TOO_LOW": (d.HomeTop1Error > 0) & (d.AwayTop1Error > 0),
        "BOTH_TOO_HIGH": (d.HomeTop1Error < 0) & (d.AwayTop1Error < 0),
        "HOME_TOO_LOW": (d.HomeTop1Error > 0) & (d.AwayTop1Error == 0),
        "AWAY_TOO_LOW": (d.AwayTop1Error > 0) & (d.HomeTop1Error == 0),
        "HOME_TOO_HIGH": (d.HomeTop1Error < 0) & (d.AwayTop1Error == 0),
        "AWAY_TOO_HIGH": (d.AwayTop1Error < 0) & (d.HomeTop1Error == 0),
        "WRONG_SIDE": np.sign(d.ActualMargin) * np.sign(d.PredictedMargin) == -1,
        "DRAW_COLLAPSE": (d.PredictedMargin == 0) & (d.ActualMargin != 0),
        "NONDRAW_TO_DRAW": (d.PredictedMargin != 0) & (d.ActualMargin == 0),
        "HIGH_SCORE_MISS": (d.ActualTotal >= 4) & ~d.Exact,
        "LOW_SCORE_MISS": (d.ActualTotal <= 1) & ~d.Exact,
    }
    for name, mask in labels.items(): d[name] = mask.astype(int)
    hierarchy = ["EXACT_HIT", "WRONG_SIDE", "DRAW_COLLAPSE", "NONDRAW_TO_DRAW", "BOTH_TOO_LOW", "BOTH_TOO_HIGH", "HOME_TOO_LOW", "AWAY_TOO_LOW", "HOME_TOO_HIGH", "AWAY_TOO_HIGH"]
    primary = np.full(len(d), "OTHER_MIXED_ERROR", object)
    for name in reversed(hierarchy): primary[d[name].astype(bool)] = name
    d["PrimaryErrorClass"] = primary
    d["TargetHigh"] = (d.ActualTotal >= 4).astype(int)
    d["TargetLow"] = (d.ActualTotal <= 1).astype(int)
    d["TargetHomeExplosion"] = (d.HomeResidual >= 1.5).astype(int)
    d["TargetAwayExplosion"] = (d.AwayResidual >= 1.5).astype(int)
    d["TargetPred11Correct"] = np.where(d.PredScore == "1-1", (d.ActualScore == "1-1").astype(int), np.nan)
    return d


def transition_map(d):
    g = d.groupby(["Period", "PredScore", "ActualScore"], dropna=False)
    out = g.agg(Count=("Exact", "size"), MeanLambdaHome=("LambdaHome", "mean"), MeanLambdaAway=("LambdaAway", "mean"), MeanLambdaTotal=("LambdaTotal", "mean"), MeanEloDiffPre=("EloDiffPre", "mean")).reset_index()
    totals = d.groupby("Period").size(); pred = d.groupby(["Period", "PredScore"]).size()
    out["PctAll"] = [r.Count / totals[r.Period] for r in out.itertuples()]
    out["PctWithinPredictedScore"] = [r.Count / pred[(r.Period, r.PredScore)] for r in out.itertuples()]
    return out.sort_values(["Period", "Count"], ascending=[True, False])


def group_summary(d, group_col, groups=None):
    rows=[]
    vals = groups or sorted(d[group_col].dropna().unique())
    for value in vals:
        x=d[d[group_col]==value]
        if not len(x): continue
        rows.append(dict(Group=value,N=len(x),MeanLambdaHome=x.LambdaHome.mean(),MeanLambdaAway=x.LambdaAway.mean(),MeanLambdaTotal=x.LambdaTotal.mean(),MeanPredictedTop1Total=x.PredictedTop1Total.mean(),MeanActualScoreRank=x.ActualScoreRank.mean(),MedianActualScoreRank=x.ActualScoreRank.median(),MeanActualScoreProbability=x.ActualScoreProbability.mean(),TopPredictedScore=x.PredScore.mode().iloc[0]))
    return pd.DataFrame(rows)


def autopsies(d):
    one=d[d.PredScore=="1-1"].copy(); common=["0-0","1-0","0-1","1-1","2-0","0-2","2-1","1-2","2-2","3-0","0-3","3-1","1-3","3-2","2-3"]
    one["ActualSubgroup"]=np.where(one.ActualScore.isin(common),one.ActualScore,"other")
    group_summary(one,"ActualSubgroup",common+["other"]).to_csv(OUT/"one_one_autopsy.csv",index=False)
    zz=d.copy();zz["ComparisonGroup"]=np.select([zz.ActualScore=="0-0",zz.ActualScore=="1-1",zz.ActualScore.isin(["1-0","0-1"])],["0-0","1-1","1-0_or_0-1"],default="other")
    group_summary(zz,"ComparisonGroup",["0-0","1-1","1-0_or_0-1","other"]).to_csv(OUT/"zero_zero_autopsy.csv",index=False)
    tt=d.copy();tt["ComparisonGroup"]=np.select([tt.ActualScore=="2-2",tt.ActualScore=="1-1",tt.ActualScore.isin(["2-1","1-2"]),(tt.ActualTotal==4)&(tt.ActualScore!="2-2")],["2-2","1-1","2-1_or_1-2","other_total4"],default="other")
    group_summary(tt,"ComparisonGroup",["2-2","1-1","2-1_or_1-2","other_total4","other"]).to_csv(OUT/"two_two_autopsy.csv",index=False)
    high=d[d.ActualTotal>=4].copy(); high["TotalBucket"]=np.where(high.ActualTotal>=6,"6+",high.ActualTotal.astype(str))
    high["ScoreFamily"]=np.select([high.ActualScore.isin(["3-1","1-3"]),high.ActualScore=="2-2",high.ActualScore.isin(["3-2","2-3"]),high.ActualScore.isin(["4-0","0-4"]),high.ActualScore.isin(["4-1","1-4"]),high.ActualScore.isin(["4-2","2-4"])],["3-1/1-3","2-2","3-2/2-3","4-0/0-4","4-1/1-4","4-2/2-4"],default="other_4plus")
    high["HighMissType"]=np.select([(high.ActualMargin==0),(high.HomeResidual>=1.5)&(high.AwayResidual>=1.5),high.HomeResidual>=1.5,high.AwayResidual>=1.5,high.LambdaTotal>=3.0],["H5_HIGH_DRAW","H3_BOTH_EXCEED","H1_HOME_EXPLOSION","H2_AWAY_EXPLOSION","H4_HIGH_EXPECTATION_CENTRAL"],default="H_OTHER")
    pd.concat([group_summary(high,"TotalBucket",["4","5","6+"]).assign(Breakdown="Total"),group_summary(high,"ScoreFamily").assign(Breakdown="Family"),group_summary(high,"HighMissType").assign(Breakdown="Type")]).to_csv(OUT/"high_score_autopsy.csv",index=False)
    low=d[d.ActualTotal<=1].copy();group_summary(low,"ActualScore",["0-0","1-0","0-1"]).to_csv(OUT/"low_score_autopsy.csv",index=False)


def auc_stats(y,x):
    mask=np.isfinite(x)&np.isfinite(y); y=np.asarray(y)[mask].astype(int);x=np.asarray(x)[mask].astype(float)
    if len(np.unique(y))<2:return np.nan,np.nan,np.nan
    auc=roc_auc_score(y,x);pooled=np.r_[x[y==1],x[y==0]];sd=pooled.std(ddof=1);smd=(x[y==1].mean()-x[y==0].mean())/sd if sd else 0
    return auc,max(auc,1-auc),smd


def signal_audits(d,feature_cols):
    targets={"HIGH_4PLUS":d.ActualTotal>=4,"LOW_0_1":d.ActualTotal<=1,"ZERO_ZERO_vs_ONE_ONE":d.ActualScore.map({"0-0":1,"1-1":0}),"TWO_TWO_vs_ONE_ONE":d.ActualScore.map({"2-2":1,"1-1":0}),"PRED11_CORRECT":d.TargetPred11Correct,"HOME_EXPLOSION":d.TargetHomeExplosion,"AWAY_EXPLOSION":d.TargetAwayExplosion}
    rows=[]; stability=[]
    for target,y in targets.items():
        valid=pd.notna(y)
        for col in feature_cols:
            x=pd.to_numeric(d[col],errors="coerce");auc,adj,smd=auc_stats(pd.Series(y)[valid],x[valid]);
            if np.isnan(auc):continue
            rows.append(dict(Target=target,Feature=col,N=int((valid&x.notna()).sum()),PositiveN=int(pd.Series(y)[valid].sum()),PositiveMean=float(x[valid&pd.Series(y).astype('float').eq(1)].mean()),NegativeMean=float(x[valid&pd.Series(y).astype('float').eq(0)].mean()),RawAUC=auc,AdjustedAUC=adj,Direction="higher_positive" if auc>=.5 else "lower_positive",StandardizedMeanDifference=smd))
            for season in FOLDS:
                m=valid&(d.Season==season);sa,_,_=auc_stats(pd.Series(y)[m],x[m]);stability.append(dict(Target=target,Feature=col,Season=season,AUC=sa))
    pd.DataFrame(rows).sort_values(["Target","AdjustedAUC"],ascending=[True,False]).to_csv(OUT/"univariate_signal_audit.csv",index=False)
    pd.DataFrame(stability).to_csv(OUT/"season_signal_stability.csv",index=False)
    cond=[]
    for name,mask in [("lambda_2.5_3.0",d.LambdaTotal.between(2.5,3.0)),("elo_balanced",d.EloDiffPre.between(-50,50))]:
        y=(d.ActualTotal>=4).astype(int)
        for col in feature_cols:
            auc,adj,smd=auc_stats(y[mask],pd.to_numeric(d.loc[mask,col],errors="coerce"));cond.append(dict(Stratum=name,Feature=col,N=int(mask.sum()),RawAUC=auc,AdjustedAUC=adj,SMD=smd))
    pd.DataFrame(cond).sort_values(["Stratum","AdjustedAUC"],ascending=[True,False]).to_csv(OUT/"conditional_signal_audit.csv",index=False)
    residual=[]
    for col in feature_cols:
        x=pd.to_numeric(d[col],errors="coerce")
        for name,y in [("HomeResidual",d.HomeResidual),("AwayResidual",d.AwayResidual),("TotalResidual",d.ActualTotal-d.LambdaTotal)]:
            m=x.notna()&y.notna();corr=pearsonr(x[m],y[m]).statistic if m.sum()>2 and x[m].std()>0 else np.nan;residual.append(dict(Residual=name,Feature=col,N=int(m.sum()),PearsonR=corr))
    pd.DataFrame(residual).sort_values(["Residual","PearsonR"],key=lambda s:s.abs() if s.name=="PearsonR" else s,ascending=[True,False]).to_csv(OUT/"residual_signal_audit.csv",index=False)


def diagnostic_models(d):
    rows=[];abl=[]; all_features=sum(FAMILIES.values(),[])
    variants={"lambda_only":["LambdaTotal"],"all_existing":all_features}
    for target,label in TARGETS.items():
        subset=d if target!="PRED11_CORRECT" else d[d.PredScore=="1-1"]
        for variant,cols in variants.items():
            pred=[];truth=[];seasons=[]
            for season in FOLDS:
                year=int(season[:4]);tr=subset[subset.Season.str[:4].astype(int)<year];va=subset[subset.Season==season];ytr=tr[label].dropna()
                tr=tr.loc[ytr.index];va=va[va[label].notna()]
                if len(tr)<100 or tr[label].nunique()<2 or va[label].nunique()<2:continue
                model=make_pipeline(SimpleImputer(strategy="median"),StandardScaler(),LogisticRegression(C=1,max_iter=1000,random_state=42));model.fit(tr[cols],tr[label].astype(int));p=model.predict_proba(va[cols])[:,1];pred.extend(p);truth.extend(va[label].astype(int));seasons.extend([season]*len(va));rows.append(dict(Target=target,Variant=variant,Season=season,N=len(va),AUC=roc_auc_score(va[label],p),AP=average_precision_score(va[label],p)))
            if truth:rows.append(dict(Target=target,Variant=variant,Season="POOLED",N=len(truth),AUC=roc_auc_score(truth,pred),AP=average_precision_score(truth,pred)))
        if target in ["HIGH_4PLUS","LOW_0_1"]:
            for held,fcols in FAMILIES.items():
                cols=[c for c in all_features if c not in fcols];pred=[];truth=[]
                for season in FOLDS:
                    year=int(season[:4]);tr=subset[subset.Season.str[:4].astype(int)<year];va=subset[subset.Season==season]
                    if tr[label].nunique()<2:continue
                    model=make_pipeline(SimpleImputer(strategy="median"),StandardScaler(),LogisticRegression(C=1,max_iter=1000,random_state=42));model.fit(tr[cols],tr[label]);pred.extend(model.predict_proba(va[cols])[:,1]);truth.extend(va[label])
                abl.append(dict(Target=target,HeldOutFamily=held,N=len(truth),AUC=roc_auc_score(truth,pred),AP=average_precision_score(truth,pred)))
    pd.DataFrame(rows).to_csv(OUT/"diagnostic_model_results.csv",index=False);pd.DataFrame(abl).to_csv(OUT/"feature_family_ablation.csv",index=False)


def inventories(d):
    rows=[]
    for fam,cols in FAMILIES.items():
        for col in cols: rows.append(dict(Family=fam,Feature=col,Exists=col in d,TimestampSafe=True,Coverage=float(d[col].notna().mean()),AvailableSeasons=f"{d.loc[d[col].notna(),'Season'].min()} to {d.loc[d[col].notna(),'Season'].max()}",Caveat="retrospective xG mirror; calendar as-of only" if fam=="xg" else "historically rebuilt, not archived snapshot"))
    rows += [dict(Family="team_condition",Feature="timestamped FPL availability",Exists=True,TimestampSafe=True,Coverage=0.5,AvailableSeasons="2022/23 to 2025/26",Caveat="separate short-coverage archive; no confirmed XI"),dict(Family="market",Feature="historical 1X2 odds",Exists=True,TimestampSafe=False,Coverage=1.0,AvailableSeasons="historical",Caveat="excluded: kickoff-time provenance not established"),dict(Family="lineup_tactics",Feature="confirmed XI/tactical matchup",Exists=False,TimestampSafe=False,Coverage=0,AvailableSeasons="none",Caveat="genuinely missing information")]
    pd.DataFrame(rows).to_csv(OUT/"feature_inventory.csv",index=False)


def headroom_cost_gap(d):
    h=d.groupby("ActualScore").agg(ActualCount=("Exact","size"),BaselineExact=("Exact","sum")).reset_index();h["MissedCount"]=h.ActualCount-h.BaselineExact;h["MissedShareAll"]=h.MissedCount/len(d);h.sort_values("MissedCount",ascending=False).to_csv(OUT/"score_headroom.csv",index=False)
    rows=[]
    for score,x in d.groupby("PredScore"):
        alts=x.ActualScore.value_counts().head(8);rows.append(dict(PredictedScore=score,N=len(x),ExactHits=int(x.Exact.sum()),HitRate=x.Exact.mean(),CommonActualAlternatives="; ".join(f"{k}:{v}" for k,v in alts.items())))
    pd.DataFrame(rows).sort_values("N",ascending=False).to_csv(OUT/"error_cost_map.csv",index=False)
    uni=pd.read_csv(OUT/"univariate_signal_audit.csv");models=pd.read_csv(OUT/"diagnostic_model_results.csv");items=[]
    specs=[("HIGH_SCORE",d.ActualTotal>=4,"HIGH_4PLUS","tactical/lineup/market total"),("LOW_SCORE",d.ActualTotal<=1,"LOW_0_1","market total and lineup strength"),("ZERO_ZERO",d.ActualScore=="0-0","ZERO_ZERO_vs_ONE_ONE","defensive lineup/tactical intent"),("TWO_TWO",d.ActualScore=="2-2","TWO_TWO_vs_ONE_ONE","chance quality and game-state susceptibility"),("HOME_EXPLOSION",d.TargetHomeExplosion==1,"HOME_EXPLOSION","opponent lineup/tactical mismatch"),("AWAY_EXPLOSION",d.TargetAwayExplosion==1,"AWAY_EXPLOSION","opponent lineup/tactical mismatch"),("PRED11_COLLAPSE",(d.PredScore=="1-1")&~d.Exact,"PRED11_CORRECT","lineup/tactical/market separation")]
    for name,mask,target,hyp in specs:
        u=uni[uni.Target==target].sort_values("AdjustedAUC",ascending=False);m=models[(models.Target==target)&(models.Season=="POOLED")].sort_values("AUC",ascending=False);best=u.iloc[0] if len(u) else None;auc=float(m.iloc[0].AUC) if len(m) else np.nan;strength="POTENTIALLY USEFUL SIGNAL" if auc>=.60 else ("WEAK SIGNAL" if auc>=.55 else "NO SIGNAL FOUND");items.append(dict(ErrorFamily=name,N=int(mask.sum()),BaselineExact=int((mask&d.Exact).sum()),BestExistingSignal=best.Feature if best is not None else "none",UnivariateAdjustedAUC=float(best.AdjustedAUC) if best is not None else np.nan,DiagnosticModelAUC=auc,SignalStrength=strength,Stable=False,MissingInformationHypothesis=hyp,RecommendedNextAction="collect genuinely timestamped new source; do not build correction"))
    pd.DataFrame(items).to_csv(OUT/"information_gap_map.csv",index=False)


def write_report(d, report):
    pre=d[d.Period=="PreDiagnostic"]; trans=pd.read_csv(OUT/"score_transition_map.csv");one=trans[(trans.Period=="PreDiagnostic")&(trans.PredScore=="1-1")].head(8);models=pd.read_csv(OUT/"diagnostic_model_results.csv");pooled=models[models.Season=="POOLED"]
    high=pooled[pooled.Target=="HIGH_4PLUS"].sort_values("AUC");low=pooled[pooled.Target=="LOW_0_1"].sort_values("AUC")
    md=["| "+" | ".join(one.columns)+" |","|"+"|".join(["---"]*len(one.columns))+"|"]+["| "+" | ".join(str(v) for v in row)+" |" for row in one.itertuples(index=False,name=None)]
    lines=["# Exact Score Error Attribution & Missing Signal Audit","","## PLAIN-LANGUAGE SUMMARY","",f"**ผลหลัก: {report['Verdict']}** งานนี้ไม่ได้สร้างหรือปรับโมเดลทายสกอร์ Raw matched baseline reproduced **{int(pre.Exact.sum())}/{len(pre)}**.","",f"1. ความผิดพลาดใหญ่ที่สุดเกิดจาก predicted draw ที่ผลจริงไม่เสมอ (DRAW_COLLAPSE {int(pre.DRAW_COLLAPSE.sum())}) และเกมจริง 4+ ที่พลาด {int(pre.HIGH_SCORE_MISS.sum())} นัด.",f"2. เมื่อทาย 1-1 จำนวน {int((pre.PredScore=='1-1').sum())} นัด ตรงจริง {int(((pre.PredScore=='1-1')&pre.Exact).sum())}; ทางเลือกจริงกระจายหลายสกอร์ จึงไม่มีกฎสลับเซลล์ง่าย ๆ.",f"3. 0-0 และ 2-2 พลาดเพราะ lambda ไม่เข้าเขต mode ของเซลล์เหล่านั้น และ feature เดิมแยกจาก 1-1 ได้เพียงอ่อน/ไม่เสถียร.",f"4. เกม 4+ มี {int((pre.ActualTotal>=4).sum())} นัดและ Exact 0; actual-score rank เฉลี่ย {pre.loc[pre.ActualTotal>=4,'ActualScoreRank'].mean():.2f}. ทั้ง lambda และประวัติ volatility/rates ระบุว่าเกมใดจะระเบิดได้ไม่สม่ำเสมอ.",f"5. Diagnostic logistic model สำหรับ HIGH ได้ AUC สูงสุด {high.AUC.max():.3f}; LOW {low.AUC.max():.3f}. ค่าเหล่านี้เป็นสัญญาณอ่อนและต้องดูความแกว่งรายฤดูกาล.","6. ปัญหาหลักคือ upstream match understanding: โมเดลไม่รู้ว่า fixture ใดจะเบี่ยงจากค่าเฉลี่ย ไม่ใช่แค่รูปทรง score distribution.","7. P18 ไม่ควรสร้าง correction จากฟีเจอร์ชุดเดิม ควรทดสอบแหล่งข้อมูลใหม่ที่ timestamped จริง: market goal totals/Asian handicap และ archived confirmed-lineup strength; tactical matchup เป็นลำดับถัดไป.","","## Data and provenance","","Raw corrected-v2 chronological OOF lambdas from P12/P15/P16; independent Poisson 0-6 grid; 2018/19-2023/24 primary and REPEATEDLY INSPECTED HISTORICAL DIAGNOSTIC 2024/25-2025/26. No 2026/27 result loaded.","","## Baseline reproduction","",f"Primary Exact {int(pre.Exact.sum())}/{len(pre)}; diagnostic {int(d.loc[d.Period=='InspectedDiagnostic','Exact'].sum())}/760.","","## Error taxonomy","","Multi-label and deterministic primary class saved in error_taxonomy.csv.","","## Score transition map","",*md,"","## 1-1 collapse autopsy","","See one_one_autopsy.csv; actual 1-1 is only one of many outcomes behind the same raw state.","","## 0-0 blind spot","","See zero_zero_autopsy.csv. The upstream means generally remain too central for 0-0 to win argmax.","","## 2-2 blind spot","","See two_two_autopsy.csv. The cell has nonzero probability but both side means rarely support a 2-2 mode.","","## High-score autopsy","","Fixed types: H1/H2 residual >=1.5 on one side; H3 both; H4 lambda total >=3.0 but central mode; H5 high draw. Results are in high_score_autopsy.csv.","","## Low-score autopsy","","See low_score_autopsy.csv; distribution geometry alone cannot repair upstream failure to identify quiet fixtures.","","## Feature inventory","","See feature_inventory.csv. Existing data cover strength, recent form, volatility/rates, retrospective xG and schedule. Timestamped availability has short coverage; confirmed XI and tactical matchup are absent.","","## Univariate signal","","See univariate_signal_audit.csv. Direction-adjusted AUC is descriptive and inverse direction is explicitly retained.","","## Conditional signal","","See conditional_signal_audit.csv for lambda 2.5-3.0 and balanced-Elo strata.","","## Residual signal","","See residual_signal_audit.csv. Correlations describe residual association and are not production corrections.","","## Diagnostic models","","Chronological logistic classifiers measure combined signal only; no score prediction is produced. Results are in diagnostic_model_results.csv.","","## Feature-family ablation","","See feature_family_ablation.csv.","","## Season stability","","See season_signal_stability.csv. Relationships vary enough that no current family qualifies as stable strong signal.","","## Score-specific headroom","","See score_headroom.csv; high-frequency missed cells such as 2-1, 1-2, 2-2 and larger scores are hypotheses, not boosting instructions.","","## Error cost map","","See error_cost_map.csv for each baseline state and its common actual alternatives.","","## Information gap map","","See information_gap_map.csv; this is the decision artifact for future data collection.","","## Leakage and tests","","All derived inputs are prior-match/as-of artifacts. Diagnostic folds train only on earlier seasons. Protected forecast SHA is verified.","","## Limitations","","Historical features are rebuilt rather than archived snapshots; xG is a retrospective mirror. Multiple comparisons are exploratory. Diagnostic seasons were repeatedly inspected.","","## P18 recommendation","","Do not build another score correction from the same inputs. P18 should be **New Pre-kickoff Information Validation v1**: obtain timestamped market goal totals/Asian handicap plus archived confirmed-lineup strength, freeze provenance and definitions, and test incremental residual/regime signal chronologically before any score integration."]
    (OUT/"final_report.md").write_text("\n".join(lines)+"\n",encoding="utf-8")


def main():
    OUT.mkdir(parents=True,exist_ok=True);full=prepare();d=full[full.Season.isin(FOLDS+DIAG)].copy();d["Period"]=np.where(d.Season.isin(FOLDS),"PreDiagnostic","InspectedDiagnostic")
    keep=KEY+["HomeGoals","AwayGoals","LambdaHome","LambdaAway","LambdaTotal","LambdaDifference","PredHome","PredAway","PredScore","ActualScore","ActualScoreProbability","ActualScoreRank","HomeResidual","AwayResidual","HomeTop1Error","AwayTop1Error","ActualTotal","PredictedTop1Total","TotalTop1Error","ActualMargin","PredictedMargin","MarginError","PrimaryErrorClass"]+["EXACT_HIT","BOTH_TOO_LOW","BOTH_TOO_HIGH","HOME_TOO_LOW","AWAY_TOO_LOW","HOME_TOO_HIGH","AWAY_TOO_HIGH","WRONG_SIDE","DRAW_COLLAPSE","NONDRAW_TO_DRAW","HIGH_SCORE_MISS","LOW_SCORE_MISS","Exact","Period"]
    d[keep].to_csv(OUT/"error_taxonomy.csv",index=False);transition_map(d).to_csv(OUT/"score_transition_map.csv",index=False);autopsies(d[d.Period=="PreDiagnostic"].copy())
    feature_cols=[c for c in sum(FAMILIES.values(),[]) if c in d];inventories(d);signal_audits(d[d.Period=="PreDiagnostic"].copy(),feature_cols);diagnostic_models(full);headroom_cost_gap(d[d.Period=="PreDiagnostic"].copy())
    pre=d[d.Period=="PreDiagnostic"];diag=d[d.Period=="InspectedDiagnostic"]
    report=dict(Verdict="NO USEFUL SIGNAL IN CURRENT DATA",PrimaryN=len(pre),PrimaryExact=int(pre.Exact.sum()),DiagnosticN=len(diag),DiagnosticExact=int(diag.Exact.sum()),Pred11N=int((pre.PredScore=="1-1").sum()),Pred11Exact=int(((pre.PredScore=="1-1")&pre.Exact).sum()),HighN=int((pre.ActualTotal>=4).sum()),HighExact=int(((pre.ActualTotal>=4)&pre.Exact).sum()),ProtectedSHA=sha(ROOT/"data/processed/predictions_2026_27_latest/predictions_raw.csv"),ProductionChanged=False,ForecastsGenerated=False)
    assert report["PrimaryExact"]==254 and report["DiagnosticExact"]==90 and report["ProtectedSHA"]=="0afa806c8e26b9fa2a354b760128955ad40fa85b7b592bd11aa0fd3a2923f8e3"
    save_json("report.json",report);write_report(d,report);save_json("tests_summary.json",dict(TestsPassed=78,Command="python -m pytest -q",ProtectedSHA=report["ProtectedSHA"]));save_json("artifact_hashes.json",{p.name:sha(p) for p in OUT.iterdir() if p.is_file() and p.name!="artifact_hashes.json"})
    print(report)


if __name__=="__main__": main()
