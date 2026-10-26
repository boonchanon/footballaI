# Phase 8 — high_score_underdispersion_audit_v1

## PLAIN-LANGUAGE SUMMARY

1. **AI คาดประตูรวมต่ำเกินไปไหม?** เมื่อดูทั้ง 760 นัด ค่าเฉลี่ยที่คาด **2.844** ใกล้ผลจริง **2.842** มาก จึงไม่ต่ำเกินไปในภาพรวม แต่ในเกมที่ยิงจริง **4+ ประตู 238 นัด** โมเดลคาดเฉลี่ยแค่ **2.849** เทียบกับผลจริง **4.723** ขณะที่เกมอื่นก็คาดใกล้กัน **2.842** ปัญหาคือคาดเกือบเหมือนกันทุกคู่ ไม่รู้ว่าคู่ใดจะยิงสูง ไม่ใช่การกดค่าเฉลี่ยทั้งฤดูกาลลงอย่างเดียว
2. **เกมยิง 4+ AI รู้ล่วงหน้าบ้างไหม?** คะแนน `lambda_home + lambda_away` แยกเกม 4+ จากเกมอื่น **แทบไม่ได้** ในข้อมูลย้อนหลังนี้ (ROC-AUC **0.491**, ใกล้ 0.5 ซึ่งเท่ากับการจัดอันดับแบบสุ่ม) และ Top-1 ของโมเดลเลือกเกม 4+ เพียง **1/760** ทั้งที่เกิดจริง **238/760** คะแนน AUC นี้เป็นการวินิจฉัย ไม่ใช่เกณฑ์ที่นำไปสร้างกฎทำนายใหม่
3. **ปัญหาอยู่ที่ lambda หรือ Poisson argmax?** หลักฐานเป็น **ทั้งสองส่วน**: lambda รวมแยกคู่ยิงสูงไม่ออก และสกอร์จริงของเกมยิงสูงมีอันดับความน่าจะเป็นต่ำ (กลางอันดับ **12**, ไม่มีเกมใดใน Top-3) ขณะเดียวกัน global argmax ของ Poisson เลือกโหมดใกล้ `floor(lambda)` ของแต่ละทีม จึงมักเลือกสกอร์รวม 1–2 ประตู ทั้งที่ matrix ยังคงให้ความน่าจะเป็นกับสกอร์สูงอยู่
4. **ทำไมชอบ 1-1?** ใน **437/760** คู่ lambda_home และ lambda_away ต่างอยู่ระหว่าง 1 ถึง 2; โหมดรายทีมจึงเป็น 1 และ 1 ทำให้เซลล์ **1-1 ชนะ** global argmax โดยไม่ต้องมีกฎบังคับเสมอ ผลจริง 1-1 มีเพียง **92** นัด
5. **ทำไม 0-0 และ 2-2 ไม่ถูกเลือก?** 0-0 ต้องการ lambda ของ **ทั้งสองทีมต่ำกว่า 1** เพื่อเป็นโหมดร่วม และ 2-2 ต้องการ lambda ของ **ทั้งสองทีมอย่างน้อย 2** ในช่วงโหมด 2; ชุด 760 คู่ไม่มีกรณีใดในสองบริเวณนี้เลย ทั้งที่เกิด 0-0 **43** นัดและ 2-2 **57** นัด
6. **ถ้ารู้ประตูรวมจริงล่วงหน้า?** Oracle ที่ใช้จำนวนประตูรวมจากผลแข่งจริง แล้วเลือกสกอร์ที่ดีที่สุดภายใต้ผลรวมนั้น ได้ **360/760 = 47.37%** เทียบกับ baseline 96/760 แต่นี่ **ใช้งานทำนายไม่ได้** เพราะรู้ส่วนหนึ่งของผลจริงก่อนเลือก
7. **ถ้ารู้ทั้ง H/D/A และประตูรวมจริง?** Oracle ที่ใช้ข้อมูลจริงทั้งสองอย่างได้ **633/760 = 83.29%** ซึ่งยิ่งไม่ใช่ผลพยากรณ์หรือเป้าหมายที่รับประกันได้ ข้อจำกัดสองอย่างบีบตัวเลือกสกอร์เหลือน้อยมาก จึงทำให้เลขสูงเป็นพิเศษ
8. **ควรทดลองอะไรต่อเพียงหนึ่งอย่าง?** ทดลอง **โมเดลแยกแยะคู่ที่มีแนวโน้มยิง 4+** ด้วยฟีเจอร์ก่อนแข่งและการตรวจแบบ walk-forward ที่กำหนดไว้ก่อนดูผลทดสอบ แล้วจึงวัดว่ามันช่วย Exact-score Top-1 จริงไหม Phase 8 ยัง **ไม่ฝึกโมเดลใหม่นี้** และไม่ปรับสกอร์ด้วยมือ

คำว่า “ยิงสูงจริง” ในรายงานนี้หมายถึง **ประตูรวมจริง ≥4** เท่านั้น ข้อมูล 760 นัดเคยถูกตรวจซ้ำหลายครั้ง จึงเป็น **historical diagnostic** ไม่ใช่หลักฐาน prospective หรือผลของคู่แข่งในอนาคต

## 1. Frozen baseline and reference reproduction

Frozen Phase-3 XGB rates, Phase-4 independent/DC normalized **0–6 × 0–6 score matrices**, the 760 fixture keys and actual scores were compared **match by match**. Recomputed matrices from identical lambdas matched saved cells; independent/global Top-1 matched Phase-3/4 exactly at **96/760 = 12.63%**. Fixed DC uses the unchanged `rho = -0.0341898781` and matched **99/760 = 13.03%**. Phase-7 E-congestion rates and its E+fixed-DC scorelines/hits also reproduced **101/760 = 13.29%** as a reference only. No model, lambda, distribution, rho, score multiplier, threshold, or selection rule was fitted or changed in Phase 8. Source/protected hashes are in `data_manifest.json`.

The original grid includes scores **0 through 6 goals per team**. One actual **7-0** (Nott'm Forest–Brighton, 2025-02-01) is outside it: the grid probability is recorded as **0**, its rank as sentinel **50** beyond the 49 cells, and every oracle counts it as a miss. That policy is the same for all grid-rank comparisons; it does not silently truncate 7 to 6.

## 2. Actual and selected Top-1 goal totals

The baseline's exact hits are concentrated almost entirely in actual two-goal games. The table shows actual goal totals and **goal totals of selected Top-1 scores**; the two columns are different quantities. Full counts and percentages are in `goal_total_distribution.csv`.

| Total goals | Actual matches | Actual % | Baseline exact hits | Exact within actual group | Predicted Top-1 matches | Predicted % |
|---|---:|---:|---:|---:|---:|---:|
| 0 | 43 | 5.66% | 0 | 0% | 0 | 0% |
| 1 | 108 | 14.21% | 13 | 12.04% | 143 | 18.82% |
| 2 | 185 | 24.34% | **78** | 42.16% | **565** | **74.34%** |
| 3 | 186 | 24.47% | 5 | 2.69% | 51 | 6.71% |
| 4 | 130 | 17.11% | 0 | 0% | 1 | 0.13% |
| 5 | 68 | 8.95% | 0 | 0% | 0 | 0% |
| 6+ | 40 | 5.26% | 0 | 0% | 0 | 0% |

Low 0–1 totals are **151 matches / 13 exact hits (8.61%)**; medium 2–3 **371 / 83 (22.37%)**; high 4+ **238 / 0 (0%)**. The complete low/medium/high means are in `low_medium_high_groups.csv`:

| Actual group | Matches | Mean actual total | Mean lambda total | Mean Top-1 total | Exact hits | Mean λhome / λaway |
|---|---:|---:|---:|---:|---:|---:|
| 0–1 | 151 | 0.715 | 2.831 | 1.887 | 13 | 1.565 / 1.266 |
| 2–3 | 371 | 2.501 | 2.847 | 1.919 | 83 | 1.614 / 1.233 |
| 4+ | 238 | **4.723** | **2.849** | **1.819** | **0** | 1.627 / 1.222 |

## 3. Expected-total dispersion and high-match audit

Across all fixtures, actual total has **mean 2.842, median 3, standard deviation 1.595, variance 2.543, middle half 2–4**. Expected total `lambda_home + lambda_away` has **mean 2.844, median 2.796, standard deviation 0.341, variance 0.116, middle half 2.596–3.034**. Selected Top-1 total has **mean 1.882, median 2, standard deviation 0.496, variance 0.247**. Expected-minus-actual total error averages **+0.002 overall**, because low-goal overestimation and high-goal underestimation cancel. `lambda_total_diagnostics.csv` stores mean, median, variance, standard deviation, min/max and quartiles for home, away, total, selected total and error in all/high/not-high groups.

For actual 4+ matches, actual mean is **4.723**, expected mean **2.849**, selected Top-1 mean **1.819**. Mean absolute errors are **1.170 home**, **1.145 away**, and **1.877 total**; exact hits are **0/238**. Within this high group, λhome has mean **1.627**, median **1.512**, quartiles **1.262–1.911**, range **0.806–3.236**; λaway mean **1.222**, median **1.191**, quartiles **0.947–1.474**, range **0.602–2.385**; λtotal median **2.773**, quartiles **2.590–3.033**, range **2.096–4.193**. The actual 4+ group's λtotal distribution heavily overlaps the other 522 fixtures: non-high λtotal mean **2.842**, median **2.801**, quartiles **2.600–3.036**, range **2.117–4.211**.

This is **poor cross-fixture discrimination**, but the narrow variation of point-estimate lambdas must **not** be confused with underdispersion of the full Poisson count distribution. The untruncated model's mean probability of 4+ total goals is **31.82%**, close to actual **31.32%**; its mixture variance `E[lambda_total] + Var(lambda_total)` is **2.960**, above observed total-goal variance **2.543**. Thus aggregate high-goal probability is roughly right while assigning it to the right fixtures is weak. `count_dispersion_addendum.json` records this distinction. Conditional underprediction among realised high games is real descriptively, but it also reflects unavoidable match-level goal randomness; it alone does not prove a systematically biased probability distribution.

## 4. High-goal discrimination and fixed total bins

Defining high as **actual total ≥4**, λtotal gives ROC-AUC **0.491** on these historical fixtures. AUC measures how often an actual high match outranks a not-high match by λtotal; here it is close to chance. No AUC threshold was used for forecasts. The fixed pre-declared λtotal bins are:

| λtotal bin | N | Mean λtotal | Mean actual total | Median actual total | Actual 4+ rate | Exact hits |
|---|---:|---:|---:|---:|---:|---:|
| <2.0 | 0 | — | — | — | — | 0 |
| 2.0–2.49 | 106 | 2.396 | 2.717 | 2 | 30.19% | 15 |
| 2.5–2.99 | 442 | 2.744 | 2.878 | 3 | 31.67% | 53 |
| 3.0–3.49 | 178 | 3.185 | 2.798 | 3 | 29.21% | 26 |
| ≥3.5 | 34 | 3.752 | 3.000 | 3 | 41.18% | 2 |

The top bin is only **34 matches**; its 4+ rate is higher but the middle bins are nearly flat and the empirical mean does not rise monotonically with predicted total. `goal_total_bins.csv` also records each bin's exact accuracy. The fixed bins were not chosen to make a result look favourable.

## 5. Team-side extreme goals

Actual home goals **≥3** occurred in **156** fixtures: mean actual home **3.404**, mean predicted λhome **1.793**, home-goal MAE **1.611**. Actual away goals **≥3** occurred in **101**: mean actual away **3.485**, mean predicted λaway **1.405**, away-goal MAE **2.080**. On those subsets λhome middle half is **1.415–2.091**, λaway **1.204–1.609**. The complete side-specific lambda distributions are in `report.json`. These selected-on-actual subsets again describe misses and not proof that a pre-kickoff model could identify those extremes.

## 6. Poisson mode mechanics and boundaries

For the implementation's normalized truncated grid, normalization multiplies every cell by the **same constant**, so it cannot change argmax. The joint independent Poisson mode factors into the two marginal modes; absent exact-integer ties, each is `floor(lambda)`. Across the frozen 760 matrices, **all 760** Top-1 scores equal the two `floor(lambda)` values. Actual occupied lambda rectangles are exactly:

| λhome integer interval | λaway interval | Global Top-1 score | Matches |
|---|---|---|---:|
| [0,1) | [1,2) | 0-1 | 28 |
| [0,1) | [2,3) | 0-2 | 12 |
| [1,2) | [0,1) | 1-0 | 115 |
| **[1,2)** | **[1,2)** | **1-1** | **437** |
| [1,2) | [2,3) | 1-2 | 10 |
| [2,3) | [0,1) | 2-0 | 116 |
| [2,3) | [1,2) | 2-1 | 38 |
| [3,4) | [0,1) | 3-0 | 3 |
| [3,4) | [1,2) | 3-1 | 1 |

Theoretical transitions follow **each side's integer lambda boundaries**: 1-1→2-1 when λhome crosses 2 while λaway remains in [1,2); 2-1→2-2 requires λaway crossing 2; 2-1→3-1 requires λhome crossing 3. The dataset has **no** joint [2,3)×[2,3) rectangle and almost no λhome≥3 cases. The full per-fixture nearest-integer distances are in `poisson_mode_boundaries.csv`; lambda-range mapping is in `poisson_mode_regions.csv`. With a fixed diagnostic definition, λhome lies **≤0.10** from an integer boundary in **124/760** fixtures and **≤0.25** in **330/760**; λaway counts are **181** and **452**. The remaining **430 home** and **308 away** are farther than .25. These are geometry checks, not fitted score-mode switching rules or test-derived thresholds.

## 7. Actual-score probability ranks

Ranks use the same stable, descending **49-cell normalized independent matrix**. The one 7-0 outside grid is rank sentinel 50. Full fixture ranks, probabilities, Top-3/Top-5 and oracle scores are in `actual_score_ranks.csv`.

| Actual-score rank | All 760 | Actual 0–1 (151) | Actual 2–3 (371) | Actual 4+ (238) |
|---|---:|---:|---:|---:|
| Top-1 | 96 | 13 | 83 | **0** |
| Top-2 | 60 | 26 | 34 | **0** |
| Top-3 | 59 | 19 | 40 | **0** |
| Rank 4–5 | 138 | 41 | 90 | **7** |
| Rank 6–10 | 226 | 46 | 80 | **100** |
| Rank >10 | 180 | 6 | 44 | **130** |
| Outside 0–6 grid | 1 | 0 | 0 | **1** |

For high actuals, mean rank **13.39**, median **12**; Top-1 **0/238**, Top-3 **0/238**, Top-5 **7/238 (2.94%)**, Top-10 **107/238 (44.96%)**. Lower totals rank much better: medium 2–3 has **157/371 Top-3** and **247/371 Top-5**. High scores rarely just miss the winning cell; most are far below it. That weighs against explaining all misses as a small argmax tie or last-step selection issue.

## 8. True-result oracles — non-deployable

Each oracle **uses actual result information**. It is excluded from every model leaderboard and cannot be frozen before kickoff:

| Diagnostic only | Constraint supplied from actual result | Correct / 760 | Accuracy |
|---|---|---:|---:|
| Independent global baseline | None | 96 | 12.63% |
| Phase-6 true-outcome oracle | Actual H/D/A; best independent cell within outcome | 206 | 27.11% |
| **Phase-8 true-total oracle** | Actual total T; best independent cell where home+away=T | **360** | **47.37%** |
| **Phase-8 combined oracle** | Actual total T **and** H/D/A; best independent cell satisfying both | **633** | **83.29%** |

The true-total oracle gets **87/238** actual high matches; the combined oracle gets **174/238**. The true-total result shows a large artificial gain when the correct total is supplied, yet it still misses **400/760** because allocating that total between teams remains hard. The combined oracle is especially high because two true constraints frequently leave only one feasible score cell. Differences between these oracles are **not additive or causal error components** and cannot be interpreted as achievable model accuracies. `oracle_total_goals.csv` and `oracle_combined.csv` mark every row `OracleNonDeployable=True` and `UsesActualResultInformation=True`. The 7-0 outside grid remains a miss even for both oracles.

## 9. Common score families and the absent 0-0 / 2-2 modes

`score_family_analysis.csv` includes actual count, Top-1 selections, hits, mean actual-cell grid rank and mean λhome/λaway for all 15 requested scorelines. Selected examples:

| Actual score | Actual count | Top-1 selections | Exact hits | Mean actual-cell rank | Mean λhome / λaway |
|---|---:|---:|---:|---:|---:|
| 0-0 | **43** | **0** | 0 | 7.12 | 1.482 / 1.298 |
| 1-1 | 92 | **437** | 57 | 1.93 | 1.594 / 1.224 |
| 2-2 | **57** | **0** | 0 | 8.65 | 1.632 / 1.230 |
| 3-0 | 38 | 3 | 0 | 7.29 | 1.881 / 1.017 |
| 0-3 | 22 | 0 | 0 | 13.45 | 1.438 / 1.392 |
| 3-1 | 37 | 1 | 0 | 8.30 | 1.764 / 1.048 |
| 3-2 | 22 | 0 | 0 | 13.14 | 1.647 / 1.183 |
| 2-3 | 15 | 0 | 0 | 14.00 | 1.485 / 1.320 |

The exact grid-cell probability ratios explain the absent draws without a manual penalty: `P(0-0)/P(1-1) = 1/(λhome λaway)` and `P(2-2)/P(1-1) = λhome λaway/4`; grid normalization cancels. Among actual 0-0 matches, the median first ratio is **0.573**, and their most common competing Top-1 is **1-1 in 25/43**. Among actual 2-2, median second ratio is **0.448**, and **1-1 leads 33/57**. More fundamentally, no frozen lambda pair has **both sides below 1** (needed for 0-0 joint mode) or **both sides ≥2** (needed for 2-2 joint mode). `zero_two_mode_mechanics.csv` and `count_dispersion_addendum.json` retain the competing cells and ratios. Phase 8 adds no hand boost or score correction.

## 10. Ten high-scoring fixture examples

`high_score_examples.csv` contains **ten actual 4+ fixtures**, five with relatively better ranks and five with poor ranks. It includes all dates/teams, actual and Top-1 scores, both lambdas, λtotal, Top-1 and actual-cell probabilities, actual rank and full Top-3/Top-5 strings. The following compact display uses that artifact; `P1` is Top-1 cell probability and `Pactual` is actual grid-cell probability.

| Fixture / actual | λhome/λaway/total | Top-1, P1 | Pactual; rank | Top-3 | Top-5 |
|---|---:|---|---:|---|---|
| Arsenal–Southampton, 2024-10-05; **3-1** | 2.888/0.917/3.805 | 2-0, .0956 | .0843; **4** | 2-0,3-0,2-1 | 2-0,3-0,2-1,3-1,4-0 |
| Man City–Chelsea, 2025-01-25; **3-1** | 2.359/1.154/3.514 | 2-1, .0968 | .0761; **4** | 2-1,2-0,1-1 | 2-1,2-0,1-1,3-1,1-0 |
| Tottenham–Bournemouth, 2025-03-09; **2-2** | 1.790/1.664/3.455 | 1-1, .0945 | .0704; **4** | 1-1,2-1,1-2 | 1-1,2-1,1-2,2-2,1-0 |
| Liverpool–Leicester, 2024-12-26; **3-1** | 2.518/0.701/3.219 | 2-0, .1287 | .0757; **5** | 2-0,3-0,1-0 | 2-0,3-0,1-0,2-1,3-1 |
| Fulham–Bournemouth, 2024-12-29; **2-2** | 1.664/1.500/3.165 | 1-1, .1057 | .0660; **5** | 1-1,2-1,1-2 | 1-1,2-1,1-2,1-0,2-2 |
| Nott'm Forest–Brighton, 2025-02-01; **7-0** | 1.400/1.068/2.468 | 1-1, .1268 | **0 grid; 50/outside** | 1-1,1-0,0-1 | 1-1,1-0,0-1,2-1,0-0 |
| Tottenham–Liverpool, 2024-12-22; **3-6** | 1.358/1.618/2.976 | 1-1, .1123 | .00053; **41** | 1-1,1-2,0-1 | 1-1,1-2,0-1,2-1,1-0 |
| Fulham–Man City, 2025-12-02; **4-5** | 0.930/1.787/2.718 | 0-1, .1183 | .00031; **38** | 0-1,1-1,0-2 | 0-1,1-1,0-2,1-2,0-0 |
| Man City–Tottenham, 2024-11-23; **0-4** | 2.933/1.220/4.153 | 2-1, .0851 | .00150; **36** | 2-1,3-1,2-0 | 2-1,3-1,2-0,3-0,4-1 |
| Wolves–Chelsea, 2024-08-25; **2-6** | 1.160/1.545/2.705 | 1-1, .1200 | .00085; **35** | 1-1,0-1,1-2 | 1-1,0-1,1-2,0-2,1-0 |

Even the comparatively favourable examples reach rank **4–5**, not Top-3. The poor examples include unexpected high totals and incorrect Home/Away allocation; one lies outside the score grid.

## 11. Frozen E-congestion and fixed-DC comparisons

`baseline_vs_congestion.csv` compares identical fixtures' frozen baseline and Phase-7 E lambdas, actual-grid ranks and fixed-DC modes. For actual 4+ matches, E's λtotal mean is **2.844** versus baseline **2.849** (mean change **−0.0046**), total-goal MAE **1.882** versus **1.877**, and mean actual-score independent rank **13.44** versus **13.39**. Both baseline and E+fixed DC get **0/238** exact hits in high games. Thus E's two-hit secondary DC improvement is **not** evidence it learned to forecast high-scoring fixtures; it comes from lower-goal matches.

`independent_vs_dc.csv` uses the **same frozen baseline lambdas** and unchanged rho. On high actual games, both methods score **0/238**; mean actual-cell ranks are **13.387 independent** and **13.391 DC**, and DC changes high-game Top-1 on **32/238** fixtures without adding a high-score hit. DC changes only four low-score cells directly, so its 99-vs-96 historical improvement is largely unrelated to the high-score blind spot. Its higher 1-1 selection count (507 vs 437) remains a separate mode-concentration concern.

## 12. Tests, diagnosis and one deferred experiment

The full relevant test suite passed **37 tests**. Checks cover exact matchwise 96/99 reproduction, same fixtures/lambdas and normalized matrices, frozen rho and Phase-7 E rates, stable actual-cell rank including out-of-grid handling, fixed total/high groups/bins, true-total and combined-oracle constraints, oracle isolation, absence of model retraining/score weighting/test-fitted thresholds and unchanged protected Phase-2 through Phase-7/production hashes. The report and output artifacts document every diagnostic; no old artifact was rewritten.

**Diagnosis: mixed evidence, with poor upstream high-goal discrimination prominent.** Overall predicted high-goal *probability mass* and mean total are close to reality, but λtotal cannot identify *which* fixtures finish 4+, and their exact cells mostly rank far below Top-5. Independent global argmax then exacerbates central Top-1 concentration because frozen lambdas lie chiefly in the 1–2 marginal mode rectangle. Neither manually changing argmax nor treating a true-result oracle as a prediction would solve the as-of discrimination question. These are descriptive findings on inspected seasons, not proof of a future modelling ceiling.

**One next experiment, not implemented:** pre-register and train a **walk-forward high-total discrimination model** using only timestamp-safe pre-kickoff information from earlier seasons, freeze its forecasts before results, and evaluate both 4+ ranking quality and exact-score Top-1 against the frozen Phase-3 independent and fixed-DC baselines. It should use a genuinely as-of validation design rather than the 2023/24 early-stopping-exposed forecasts. Phase 8 ends with this audit; no Phase 9 model or threshold was built.
