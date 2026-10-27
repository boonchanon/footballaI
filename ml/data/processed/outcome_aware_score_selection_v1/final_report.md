# Phase 6 — outcome_aware_score_selection_v1

**Primary finding:** The frozen two-stage rule did **not** improve exact-score Top-1. Independent matrix-mass selection scored **70/760 (9.21%)**, down from independent global argmax **96/760 (12.63%)**. Fixed DC matrix-mass selection scored **69/760 (9.08%)**, down from fixed DC global argmax **99/760 (13.03%)**. Valid, frozen Phase-2 no-odds classifier outcome sources scored **71–72/760** with either score matrix. No Phase-6 outcome-aware deployable method beats either clean baseline or DC. The 760 fixtures are previously inspected historical diagnostics, not prospective performance.

## 1. Frozen baseline reproduction

Before Phase-6 evaluation, the Phase-3 XGB lambda array was checked exactly against the Phase-4 760 rows and the Phase-3 diagnostic array. Independent and DC matrices were regenerated using those same rates and the frozen DC `rho = -0.0341898781`; all normalized grid cells agreed with Phase-4 saved matrices. The 760 fixture keys, actual scores and global Top-1 scorelines reproduced **match by match**: independent **96/760**, DC **99/760**. The grid is 0–6 goals per side; no rate, feature, rho, or probability correction was fitted or changed.

## 2. Hypothesis and decision mechanics

A single high-probability cell such as 1-1 can be the global mode even when the **sum** of all Home- or Away-win cells exceeds draw mass. For each normalized matrix `P(i,j)`, Phase 6 computes `P(H) = Σ(i>j)P(i,j)`, `P(D) = Σ(i=j)P(i,j)` and `P(A) = Σ(i<j)P(i,j)`. These regions partition the grid and their masses sum to one. The two-stage rule selects `argmax{P(H),P(D),P(A)}`, then the highest **original** score-cell probability within that outcome. It does not renormalize the selected region, threshold probabilities, force Home, cap draws, or change the matrix. Conditional Top-3 comprises the three highest cells **within the selected outcome**; global Top-3 retains its original all-grid meaning.

The negative control passed for **all 760 independent and all 760 DC matrices**: supplying the outcome implied by the global score mode to the within-outcome selector returns exactly that global score. Every selected score has the selected H/D/A outcome. The selector and oracle are separate paths; the oracle cannot enter the deployable leaderboard.

## 3. Frozen no-odds classifier audit

Phase-2 `catboost_no_odds.cbm` and `xgboost_no_odds.json` were valid for separate classifier-outcome ablations. Actual training code maps target `A→0`, `D→1`, `H→2`; stored data show those target indices agree exactly with goal signs. Both loaded model class orders are `[0,1,2]`. Saved metadata agree across models: **123 ordered `legacy_v1` features**, no odds columns, saved numeric **training medians** and fallback policy. Inference used the saved training fills and exact feature order, never the old zero-fill serve path. Model feature names and saved Phase-2 model hashes were verified. Raw `predict_proba` arrays reproduced the Phase-2 `CatA/CatD/CatH` and `XgbA/XgbD/XgbH` columns for all 760 fixtures within `1e-12`. No classifier was retrained; no draw promotion, forced-draw rule, Poisson blend or classifier blend was applied. Both CatBoost and XGBoost outcome sources were reported separately, with independent and optional DC within-outcome score selection.

The classifier models trained on **1993/94–2022/23** and used **2023/24 for early stopping**. The diagnostic seasons are **2024/25–2025/26**. Stored historical feature rows are not archived pre-kickoff snapshots; this is not a prospective claim. Full hashes and class provenance are in `classifier_audit.json`.

## 4. Earlier pre-test validation diagnostic

Existing frozen 2023/24 XGB rates allowed a parameter-free 380-match check. These validation outcomes did not change the rule or select a threshold. They were also used earlier for XGB early stopping and DC rho fitting, so they are **not** a clean prospective holdout.

| Matrix | Global exact | Outcome-aware exact | Global outcome correct | Mass outcome correct | Global/mass disagreement |
|---|---:|---:|---:|---:|---:|
| Independent | 45/380 | 39/380 | 172/380 | 224/380 | 207/380 |
| DC, fixed rho | 48/380 | 42/380 | 161/380 | 224/380 | 236/380 |

The pre-test pattern already showed better H/D/A selection alongside worse exact score. Classifier pre-test predictions were not inferred as an additional validation ablation.

## 5. Primary 760-match exact-score leaderboard

All deployable variants use identical frozen fixtures and goal rates. Deltas are **exact hits**, with a shared denominator 760. Matrix-mass variants use their own matrix's H/D/A masses; classifier variants use **raw frozen classifier probabilities** and the indicated matrix only for score selection.

| Deployable method | Exact hits | Accuracy | Δ vs independent global | Δ vs DC global | Top-3 exact | H/D/A correct |
|---|---:|---:|---:|---:|---:|---:|
| Independent global | 96/760 | 12.63% | 0 | −3 | 215/760, global | 315/760 |
| Independent matrix-mass → independent score | 70/760 | 9.21% | −26 | −29 | 195/760, conditional | 383/760 |
| **DC global** | **99/760** | **13.03%** | +3 | 0 | 228/760, global | 297/760 |
| DC matrix-mass → DC score | 69/760 | 9.08% | −27 | −30 | 196/760, conditional | 383/760 |
| CatBoost outcome → independent score | 72/760 | 9.47% | −24 | −27 | 196/760, conditional | 380/760 |
| CatBoost outcome → DC score | 72/760 | 9.47% | −24 | −27 | 197/760, conditional | 380/760 |
| XGBoost classifier outcome → independent score | 71/760 | 9.34% | −25 | −28 | 194/760, conditional | 376/760 |
| XGBoost classifier outcome → DC score | 72/760 | 9.47% | −24 | −27 | 195/760, conditional | 376/760 |

Top-3 and H/D/A are secondary. The larger outcome accuracy of mass selection **did not** improve exact-score Top-1. Outcome-aware argmax is a **decision rule**, so it creates no new score distribution or selection NLL. The underlying Phase-4 untruncated joint score NLL remains **2.94729 independent** and **2.94618 DC** for all selectors using those respective matrices; no NLL improvement is claimed.

## 6. Outcome counts, confusion and mode disagreement

Actual outcomes were **H=317, D=197, A=246**. Predicted H/D/A counts and confusion for each deployable source are fully in `outcome_confusion.csv` and `report.json`. The principal matrix-mass confusion is identical for independent and DC:

| Actual \ predicted | H | D | A |
|---|---:|---:|---:|
| H | 256 | 0 | 61 |
| D | 131 | 0 | 66 |
| A | 119 | 0 | 127 |

Thus matrix mass selected **H=506, D=0, A=254** and got 383 outcomes correct. CatBoost selected **H=501, D=2, A=257** and got 380 correct; classifier XGBoost selected **H=506, D=2, A=252** and got 376 correct. Global score modes instead implied **H=273, D=437, A=50** for independent and **H=222, D=507, A=31** for DC. The global-mode and matrix-mass outcomes disagreed on **437/760 independent** and **507/760 DC** fixtures. Every independent disagreement moved a global 1-1 draw mode to H or A: **233 to H, 204 to A**. A high single draw cell and a higher aggregate win mass coexist in these predictions.

Actual draw rate was **197/760 = 25.92%**. Independent global Top-1 draw rate was **57.50%**, DC global **66.71%**. Both independent and DC matrix-mass selected draw rate and final outcome-aware-score draw rate were **0%**. The two latter rates must equal, and do. CatBoost/XGBoost each selected just two draw fixtures. This demonstrates a different pathology: the two-stage argmax removes almost every draw because the draw region rarely has the greatest **aggregate** mass; no manual draw suppression occurred.

## 7. Selected score distribution and second-stage concentration

These are **Top-1 scoreline counts**, not matrix probability mass. The complete artifact `score_distribution.csv` gives count and percentage for **every actual or selected scoreline** and every deployable method, including all 15 requested common cells. Key counts:

| Score | Actual | Independent global | Independent mass | DC global | DC mass | Cat→independent | Cat→DC | XGB→independent | XGB→DC |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0-0 | 43 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1-0 | 51 | 115 | **283** | 67 | **248** | 276 | 241 | 286 | 252 |
| 0-1 | 57 | 28 | **162** | 12 | **138** | 167 | 144 | 157 | 132 |
| 1-1 | 92 | **437** | 0 | **507** | 0 | 2 | 2 | 2 | 2 |
| 2-0 | 50 | 116 | 116 | 122 | 127 | 116 | 127 | 116 | 127 |
| 0-2 | 43 | 12 | 12 | 12 | 13 | 12 | 13 | 12 | 13 |
| 2-1 | 70 | 38 | 103 | 29 | 127 | 105 | 129 | 100 | 123 |
| 1-2 | 56 | 10 | 80 | 7 | 103 | 78 | 100 | 83 | 107 |
| 2-2 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 3-0 | 38 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 |
| 0-3 | 22 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 3-1 | 37 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| 1-3 | 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 3-2 | 22 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2-3 | 15 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Independent outcome-aware's dominant score shifted from **1-1 (437/760, 57.50%)** to **1-0 (283/760, 37.24%)**. DC outcome-aware shifted from **1-1 (507/760, 66.71%)** to **1-0 (248/760, 32.63%)**. XGB-classifier→independent selected 1-0 **286/760 (37.63%)**, the largest 1-0 concentration. All variants still select **0-0 and 2-2 zero times**, despite 43 and 57 actual instances. Unique selected scorelines are 9 global, 8 matrix-mass, and 9 classifier variants. Entropy rises from **1.315 to 1.588 nats** for independent and **1.107 to 1.644** for DC, but the exact-hit losses remain decisive.

The second-stage mechanics artifact `within_outcome_score_mechanics.csv` gives score frequencies conditional on each selected outcome. For independent matrix-mass **Home=506**: 1-0 wins 283, 2-0 116, 2-1 103; for **Away=254**: 0-1 wins 162, 1-2 80, 0-2 12. DC Home=506: 1-0 wins 248, 2-0 127, 2-1 127; DC Away=254: 0-1 wins 138, 1-2 103, 0-2 13. Neither matrix-mass rule ever selects Draw, so no 0-0/1-1/2-2 draw winner occurs. The collapse was moved largely from 1-1 toward 1-0/0-1, with a sizable 2-1 increase; its lower dominant-score count is not an accuracy gain.

## 8. Score-conditional precision

The full per-score precision for all eight deployable methods is in `report.json`. Each fraction is `correct / times selected`; zero selections have undefined precision.

| Score | Independent global | Independent mass | DC global | DC mass |
|---|---:|---:|---:|---:|
| 0-0 | 0 selections | 0 selections | 0 selections | 0 selections |
| 1-0 | 9/115 = 7.83% | 18/283 = 6.36% | 5/67 = 7.46% | 16/248 = 6.45% |
| 0-1 | 4/28 = 14.29% | 16/162 = 9.88% | 3/12 = 25.00% | 12/138 = 8.70% |
| 1-1 | 57/437 = 13.04% | 0 selections | 66/507 = 13.02% | 0 selections |
| 2-0 | 18/116 = 15.52% | 18/116 = 15.52% | 18/122 = 14.75% | 18/127 = 14.17% |
| 0-2 | 3/12 = 25.00% | 3/12 = 25.00% | 3/12 = 25.00% | 3/13 = 23.08% |
| 2-1 | 5/38 = 13.16% | 11/103 = 10.68% | 4/29 = 13.79% | 13/127 = 10.24% |
| 1-2 | 0/10 | 4/80 = 5.00% | 0/7 | 7/103 = 6.80% |
| 2-2 | 0 selections | 0 selections | 0 selections | 0 selections |
| 3-0 | 0/3 | 0/3 | 0/3 | 0/3 |
| 3-1 | 0/1 | 0/1 | 0/1 | 0/1 |

Adding many 1-0/0-1/2-1 selections at low conditional precision is a key reason the new rule loses exact hits.

## 9. Rank flips and probability examples

Comparisons below use each outcome-aware method's **corresponding global matrix**. The full `rank_flips.csv` contains all changed fixture rows with actual result/outcome, frozen lambdas, global score and cell probability, `P(H/D/A)`, selected outcome, new score/cell probability and flip type.

| Outcome-aware method | Changed Top-1 | Wrong→correct | Correct→wrong | Wrong→different wrong | Net exact hits |
|---|---:|---:|---:|---:|---:|
| Independent mass | 437 | 31 | 57 | 349 | **−26** |
| DC mass | 507 | 36 | 66 | 405 | **−30** |
| Cat→independent | 435 | 32 | 56 | 347 | −24 |
| Cat→DC | 505 | 38 | 65 | 402 | −27 |
| XGB→independent | 436 | 32 | 57 | 347 | −25 |
| XGB→DC | 505 | 39 | 66 | 400 | −27 |

Representative **independent** conflicts illustrate the research hypothesis and its failure; examples are descriptive and did not change the selector:

| Fixture | λhome/λaway | Global 1-1 cell | P(H)/P(D)/P(A) | New region best cell | Actual |
|---|---:|---:|---:|---:|---:|
| Nott'm Forest–Bournemouth, 2024-08-17 | 1.398/1.278 | 0.1231 | **0.3980**/0.2593/0.3428 | Home 1-0, 0.0963 | **1-1**; hit lost |
| Crystal Palace–West Ham, 2024-08-24 | 1.629/1.181 | 0.1160 | **0.4773**/0.2456/0.2771 | Home 1-0, 0.0982 | 0-2; wrong→different wrong |
| Everton–Brighton, 2024-08-17 | 1.135/1.310 | 0.1290 | 0.3219/0.2724/**0.4057** | Away 0-1, 0.1136 | 0-3; wrong→different wrong |
| West Ham–Aston Villa, 2024-08-17 | 1.270/1.354 | 0.1248 | 0.3494/0.2625/**0.3882** | Away 0-1, 0.0983 | 1-2; wrong→different wrong |

The aggregate win mass can outrank draw mass while 1-1 is the most probable individual cell. Moving to the win region often discards an actual draw and selects a narrow win cell that is still wrong.

## 10. Conditional score accuracy and non-deployable oracle

Among fixtures for which the selected outcome was correct, exact-score Top-1 remained modest: independent mass **70/383 = 18.28%**, DC mass **69/383 = 18.02%**, CatBoost outcome **72/380 = 18.95%** with either matrix, classifier XGB **71/376 = 18.88%** independent or **72/376 = 19.15%** DC. More correct H/D/A decisions alone therefore leave most scores wrong.

**TRUE-OUTCOME ORACLE — NON-DEPLOYABLE DIAGNOSTIC ONLY:** supplying actual H/D/A and taking the best cell within that actual outcome scored **206/760 = 27.11%** with the independent matrix and **214/760 = 28.16%** with DC. This uses the actual result, is **not a model or valid prediction**, and is excluded from all deployable rankings. Relative to independent mass's 70 hits, the independent oracle has 136 additional possible hits from perfect outcome routing while keeping the same within-region rule; even that oracle misses **554/760** exact scores. DC has analogous 145-hit oracle/mass difference and **546/760** oracle misses. These differences are **diagnostic headroom**, not a causal proof or forecast. They show both a severe draw/outcome-selection issue in mass argmax and substantial within-outcome score-ranking weakness.

## 11. Tests, verdict and one deferred next experiment

The full relevant suite passed: **27 passed**. New tests cover frozen 96/99-hit baselines and matchwise reproduction, lambdas/rho, exact H/D/A masks and mass partition, within-outcome argmax, the 760-matrix negative control, score validity, classifier class/probability/preprocessing parity, isolated oracle path, absence of fitted test thresholds, and protected Phase-2 through Phase-5/production hashes. `data_manifest.json` records source and protected hashes; no previous artifact was rewritten.

| Method | Phase-6 primary verdict | Beat fixed DC 99/760? |
|---|---|---|
| Independent matrix-mass outcome-aware | **FAILED:** 70 < 96 | No |
| DC matrix-mass outcome-aware | **FAILED:** 69 < 96 | No |
| CatBoost classifier outcome with either matrix | **FAILED:** 72 < 96 | No |
| XGB classifier outcome with independent/DC | **FAILED:** 71/72 < 96 | No |

**Best deployable Phase-6 result remains the fixed DC global argmax, 99/760 (13.03%).** It retains pathological 1-1 concentration, but no two-stage variant improved the required exact-score objective. Matrix-mass H/D/A disagreed with global score mode often and increased H/D/A accuracy, yet selected no draws and shifted Top-1 toward 1-0/0-1. Oracle headroom exists, while within-outcome exact ranking is also weak. The historical dataset's repeated inspection and absence of prospective freezes limit claims about future performance.

**One next experiment, not implemented:** freeze XGB-independent-global, fixed DC-global and the best valid Phase-6 two-stage candidate (**CatBoost outcome→independent, 72/760**, tied on exact hits with other classifier variants) **before kickoff** on future unseen fixtures, then compare exact-score Top-1 after results arrive. Such a prospective comparison can test whether the historical DC edge and the two-stage failure persist without using inspected seasons to tune decisions. No prospective performance is fabricated here. Phase 6 stops at this report.
