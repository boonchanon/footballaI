# Phase 5 — score_calibration_v1

**Primary result:** None of the frozen calibration layers improves exact-score Top-1 over XGB + independent Poisson (96/760), and none beats the fixed Dixon–Coles challenger (99/760). Temperature ties independent at 96/760; score-specific shrinkage falls to 90/760; structured calibration falls to 88/760. These 760 matches are historical diagnostics, not prospective proof. Parameters were frozen before their outcomes were evaluated and were not revised afterward.

## 1. Reproduction and provenance

The frozen Phase-3 XGB home and away lambdas are identical for every variant. Recomputing the independent and fixed-rho Dixon–Coles score matrices reproduced the earlier Top-1 scoreline **match by match**: independent **96/760 = 12.63%**, DC **99/760 = 13.03%**. The independent control is the clean modelling baseline; DC is a fixed challenger. No XGB model, feature, imputation, lambda, or DC rho was changed. `data_manifest.json` records Phase-3 artifact hashes, the Phase-4 input/matrix hashes, feature version `legacy_v1`, the lambda source, score grid and timestamps. The experiment uses a normalized 0–6 by 0–6 grid for all methods.

## 2. Pre-test calibration data and chronology

All 380 Premier League 2023/24 matches precede the 760-match 2024/25–2025/26 diagnostic period. Their goal rates came from the **frozen Phase-3 XGB models**, which fitted goal targets on 1993/94–2022/23. The stored `validation_fit_inputs.csv` and `validation_rates.npy` were joined in their original order, and raw independent score matrices were generated from those rates. The split is by entire fixture date: calibration train **188 matches, 2023-08-11 through 2023-12-28**; calibration validation **192 matches, 2023-12-30 through 2024-05-19**. One train result is outside the 0–6 grid; all validation results are inside. The 760 diagnostic outcomes entered only the final evaluation.

There is a material qualification to the requested “leakage-safe/as-of” claim. The frozen XGB training procedure used the **whole 2023/24 season for early stopping**. It did not fit the goal targets of these matches, but their outcomes influenced model iteration selection. Thus these calibration probabilities are out of target-fitting sample and before the diagnostic period, yet **not strictly prospective, outcome-blind, or chronological out-of-fold predictions**. This limits any generalization claim. Replacing them with truly as-of forecasts would require rebuilding the XGB training design, which Phase 5 expressly forbids. No such forecasts or prospective results are claimed here.

## 3. Pre-registered calibration methods and frozen parameters

All transformations start from the same independent grid matrix `P_raw`, end with normalization, and then use argmax. Designs and shrinkage constants were fixed before opening diagnostic outcomes.

| Method | Transformation | Train-only parameters |
|---|---|---:|
| Raw control | `P_raw` | 0 |
| Global temperature | `P(s) ∝ P_raw(s)^(1/T)`; train conditional-grid NLL, `0.5 ≤ T ≤ 3` | 1; `T = 1.073748` |
| Score-specific shrinkage | `P(s) ∝ P_raw(s) w_s`; `w_s = (observed_s + 10)/(expected_s + 10)` when expected count ≥3; otherwise `w_s = 1` | 17 supported cells of 49; prior 10 |
| Structured correction | `P(s) ∝ P_raw(s) exp(β·f(s))`; features: draw, total goals/4, absolute margin/3, signed margin/3, both teams score; train NLL + `0.5 × 5 × ||β||²` | 5; `β = [-0.189304, 0.044981, 0.082909, 0.041435, 0.263308]` |

Score-specific expected counts are **sums of raw probabilities on calibration train only**, not counts of test Top-1 selections. The fixed prior and minimum support shrink rare/unseen cells to neutrality; no unconstrained 49-cell fit was used. The structured features were specified as low-dimensional football score relations, without a hand-written 1-1 or draw cap. Global temperature is rank preserving for positive `T`, so it cannot improve Top-1.

## 4. Calibration validation before diagnostic evaluation

The four controls/variants were evaluated on the later 192 pre-test matches before the 760-match evaluation. No validation result triggered a method redesign, hyperparameter change, or test-based selection.

| Method | Exact Top-1 | Top-3 exact | Conditional 0–6 NLL |
|---|---:|---:|---:|
| Raw | 24/192 | 53/192 | 3.15146 |
| Temperature | 24/192 | 53/192 | 3.13969 |
| Score-specific | 24/192 | 54/192 | 3.13375 |
| Structured | 23/192 | 55/192 | 3.12872 |

The fit was stored in `calibration_parameters.json` before diagnostic evaluation. Lower validation NLL did **not** establish better exact-score ranking.

## 5. Frozen 760-match diagnostic comparison

Exact-score Top-1 is the primary decision measure. Deltas are exact-hit counts; all methods have the same denominator.

| Method | Exact Top-1 | Accuracy | Δ vs independent | Δ vs DC | Top-3 exact | H/D/A Top-1 |
|---|---:|---:|---:|---:|---:|---:|
| XGB + independent/raw | 96/760 | 12.63% | 0 | −3 | 215/760 | 315/760 |
| XGB + fixed DC | **99/760** | **13.03%** | +3 | 0 | 228/760 | 297/760 |
| Temperature | 96/760 | 12.63% | 0 | −3 | 215/760 | 315/760 |
| Score-specific | 90/760 | 11.84% | −6 | −9 | 235/760 | 308/760 |
| Structured | 88/760 | 11.58% | −8 | −11 | 223/760 | 336/760 |

Top-3 and H/D/A are secondary diagnostics. The score-specific method has the largest Top-3 count, and structured has the largest H/D/A count; neither compensates for the primary Top-1 loss.

## 6. Score-matrix likelihood and calibration quality

The matrices are finite, nonnegative and normalized. The NLL below is the **joint score probability conditioned on the same 0–6 grid**, evaluated on the identical **759 in-grid diagnostic matches**; one out-of-grid result is excluded for every method. It is therefore directly comparable **within this table** and not directly comparable to the untruncated NLL in Phase 4. No forced-draw clipping is used.

| Raw | DC | Temperature | Score-specific | Structured |
|---:|---:|---:|---:|---:|
| 2.93568 | 2.93457 | 2.93786 | **2.93165** | 2.94919 |

Score-specific slightly improves conditional NLL while losing six exact hits. Mean predicted **draw probability mass** is 23.21% raw, 23.95% DC, 22.73% temperature, 21.29% score-specific and 20.07% structured, versus 25.92% actual draws. This probability-mass diagnostic differs from the rate of **Top-1 predictions that are draws**. Fixed Top-1 confidence-bin counts, mean probabilities and observed correct rates for each method are in `report.json`; the small high-confidence bins should not be interpreted as reliable calibration evidence.

## 7. Score distribution, mode concentration and distance

Counts below are actual scorelines versus each method's **Top-1 selected scoreline**, not predicted probability masses. They sum to 760 over all scorelines; this table lists common and diagnostically important cells, with the complete table in `score_distribution.csv`.

| Score | Actual | Raw | DC | Temperature | Score-specific | Structured |
|---|---:|---:|---:|---:|---:|---:|
| 0-0 | 43 | 0 | 0 | 0 | 0 | 0 |
| 1-0 | 51 | 115 | 67 | 115 | 40 | 46 |
| 0-1 | 57 | 28 | 12 | 28 | 30 | 9 |
| 1-1 | **92** | **437** | **507** | **437** | **404** | **292** |
| 2-0 | 50 | 116 | 122 | 116 | 67 | 39 |
| 0-2 | 43 | 12 | 12 | 12 | 19 | 2 |
| 2-1 | **70** | **38** | **29** | **38** | **133** | **260** |
| 1-2 | 56 | 10 | 7 | 10 | 37 | 101 |
| 2-2 | 57 | 0 | 0 | 0 | 0 | 0 |

All methods still select **1-1 as their most common Top-1 score**, versus only 92 actual 1-1 results. Structured reduces 1-1 from 437 to 292, but creates a new strong 2-1 concentration: **260 selections versus 70 actual**. Score-specific reduces 1-1 to 404 while selecting 2-1 133 times. The missing 0-0 and 2-2 modes also remain.

| Diagnostic | Raw | DC | Temperature | Score-specific | Structured |
|---|---:|---:|---:|---:|---:|
| Top-1 draw rate | 57.50% | 66.71% | 57.50% | 53.16% | 38.42% |
| Dominant score count | 437 | 507 | 437 | 404 | 292 |
| Unique Top-1 scorelines | 9 | 9 | 9 | 9 | 9 |
| Top-1 score entropy, nats | 1.315 | 1.107 | 1.315 | 1.529 | 1.459 |
| Top-1 frequency TV distance to actual | 0.625 | 0.662 | 0.625 | **0.516** | 0.572 |

Actual draw rate is **25.92%**. Total variation here compares empirical distributions of **selected Top-1 scorelines** with empirical actual scorelines; it is not a proper probability forecast metric. A visually better selection distribution, including lower TV distance, is insufficient when exact-score Top-1 deteriorates.

## 8. Score-conditional precision

Precision means `correct / times this score was selected as Top-1`; blank means the method never selected that score. The full per-score audit is in `report.json`.

| Selected score | Raw | DC | Temperature | Score-specific | Structured |
|---|---:|---:|---:|---:|---:|
| 1-1 | 57/437 = 13.04% | 66/507 = 13.02% | 57/437 = 13.04% | 52/404 = 12.87% | 39/292 = 13.36% |
| 2-1 | 5/38 = 13.16% | 4/29 = 13.79% | 5/38 = 13.16% | 10/133 = 7.52% | 28/260 = 10.77% |
| 2-0 | 18/116 = 15.52% | 18/122 = 14.75% | 18/116 = 15.52% | 10/67 = 14.93% | 3/39 = 7.69% |

The added 2-1 selections have low precision, especially under score-specific shrinkage. That explains why less 1-1 concentration did not improve exact accuracy.

## 9. Rank flips and fixture examples

Only a change of argmax can alter exact-score Top-1. Gain/loss below compares each calibration against the independent raw control. The same `report.json` also gives gain/loss against DC.

| Method | Changed Top-1 vs raw | Wrong → correct | Correct → wrong | Net hits |
|---|---:|---:|---:|---:|
| Temperature | 0 | 0 | 0 | 0 |
| Score-specific | 223 | 17 | 23 | −6 |
| Structured | 353 | 35 | 43 | −8 |

Examples from the frozen diagnostic comparison (descriptive, **not** used to tune parameters):

| Method | Fixture | Actual | Raw → calibrated | Consequence |
|---|---|---|---|---|
| Score-specific | Man City–Brentford, 2024-09-14 | 2-1 | 2-0 → 2-1 | gained a hit |
| Score-specific | Tottenham–Fulham, 2024-12-01 | 1-1 | 1-1 → 2-1 | lost a hit |
| Score-specific | Arsenal–Man United, 2024-12-04 | 2-0 | 2-0 → 2-1 | lost a hit |
| Structured | Newcastle–Tottenham, 2024-09-01 | 2-1 | 1-1 → 2-1 | gained a hit |
| Structured | Liverpool–Brentford, 2024-08-25 | 2-0 | 2-0 → 2-1 | lost a hit |

`all_calibration_rank_flips.csv` contains **all 576 score-specific/structured changed rows** with the two competing raw and calibrated cell probabilities, lambdas, actual result, and gain/loss label. Temperature has no rank-flip rows by mathematical construction. The original `match_flips.csv` is empty because the descriptive best Phase-5 calibration is temperature; the all-method table supplies the required losing-method examples.

## 10. Train-only correction evidence and stability

The train-period score-specific corrections reveal central-score behaviour **before** diagnostic evaluation:

| Score | Raw expected train count | Observed train count | Frozen multiplier |
|---|---:|---:|---:|
| 0-0 | 11.35 | 4 | 0.656 |
| 1-0 | 17.11 | 13 | 0.848 |
| 1-1 | 19.98 | 18 | 0.934 |
| 2-1 | 15.30 | 17 | 1.067 |
| 2-2 | 9.16 | 12 | 1.148 |

These are modest, mechanically derived train corrections, not test-based caps. A diagnostic half-period recalculation gives 1-1 multiplier **0.858** first half and **1.041** second half; 2-1 gives **1.024** and **1.072**. The 1-1 correction even crosses neutral, indicating **instability/overfitting risk** for a small score-cell sample. No subperiod result was used to reselect parameters. Temperature is the hit-count leader among Phase-5 calibration methods only because it leaves ranking intact.

## 11. Verification and verdict

The full relevant test suite passed: **21 passed**. Tests cover both frozen baseline hit counts and matchwise score reproduction, unchanged XGB rates, the pre-test-only fit path and chronological split, prior artifact hashes, finite/nonnegative/normalized matrices, neutral calibration, temperature mathematics, rare/unseen-cell shrinkage, valid integer argmax scorelines, and absence of test-derived multipliers. The stored frozen-input and report hashes support audit; details are in `data_manifest.json`, `calibration_parameters.json`, `report.json`, and `posthoc_diagnostics.json`.

| Calibration method | Primary verdict | Beat DC 99/760? |
|---|---|---|
| Temperature | **NEUTRAL:** 96/760; confidence changed, ranking did not | No |
| Score-specific | **FAILED:** 90/760 despite lower NLL and less Top-1 frequency mismatch | No |
| Structured | **FAILED:** 88/760; shifts the 1-1 concentration toward 2-1 | No |

**Best Phase-5 calibration by the primary metric is temperature (96/760, tied with raw).** The fixed DC challenger remains the historical exact-score leader at 99/760, although it predicts 1-1 and draws even more often. Calibration did alter ranking under score-specific and structured corrections and reduced 1-1 selections, but the changed choices lost more hits than they gained. Better likelihood or selection distribution did not translate into better exact-score Top-1. These conclusions are constrained by the early-stopping exposure of the calibration season and by repeated prior inspection of the diagnostic seasons.

## 12. One next experiment, deferred

Conduct a **prospective pre-kickoff freezing comparison** of XGB + independent, fixed XGB + DC and the frozen temperature layer on future fixtures, logging score matrices before kickoff and measuring exact-score Top-1 after results arrive. This tests whether the small historical DC lead persists under genuinely unseen fixtures and avoids treating the inspected 760 matches as proof. Predictions and results are **not fabricated here**; no next experiment was implemented in Phase 5.
