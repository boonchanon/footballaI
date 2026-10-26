# Phase 7 — goal_rate_feature_expansion_v1

**Primary result:** No pre-registered feature family improved exact-score Top-1 under the required **XGB goal rates + independent Poisson + global argmax** architecture. The frozen Phase-3 baseline reproduced exactly at **96/760 (12.63%)**. Elo trend tied at 96/760; venue form scored 86, opponent-adjusted form 93, congestion 95, and the pre-registered all-family Combined model 93. No primary variant beat the fixed DC historical challenger **99/760 (13.03%)**. In a separate **secondary fixed-DC ablation**, congestion features yielded **101/760**, a two-hit historical increase versus DC global, without improving the primary Independent path. All 760 results are previously inspected historical diagnostics, not prospective proof; no feature/window/model choice was changed after seeing them.

## 1. Baseline, lineage and feature audit

Phase-3 XGB was retrained here using the **same 11,564 training matches (1993/94–2022/23), 380 validation matches (2023/24), 760 diagnostic matches (2024/25–2025/26), 123 ordered no-odds `legacy_v1` columns, saved training fills, targets (`HomeGoals`, `AwayGoals`), `count:poisson` objective, XGB hyperparameters, seed 42, early-stopping policy, positive-rate floor 0.05, normalized 0–6 grid and global cell argmax**. New baseline test lambdas were **bitwise identical** to frozen Phase-3 `diagnostic_rates.npz`; all 760 global Top-1 scorelines were identical; baseline hit count was 96/760. Feeding those same lambdas through the unchanged Phase-4 `rho = -0.0341898781` reproduced DC 99/760. Original XGB and DC artifacts were not overwritten.

The 123-column baseline already contains `HomeEloPre`, `AwayEloPre`, Elo difference/expectations, general Last3/Last5 form, venue **expanding** points, `HomeRestDays`, `AwayRestDays`, and rest difference. Existing Elo uses deterministic initial rating **1500**, K=20 and home advantage 80; it updates after completed matches. New B adds **recent Elo trajectory**, not duplicate pre-match ratings. C adds **last-five correct-venue** form rather than another general or expanding form. D adds a small opponent-pre-Elo adjustment. E adds **fixture counts in prior 7/14 days**; original rest-day columns stay in every baseline feature set. Existing `legacy_v1` H2H/venue-context semantics were deliberately retained for apples-to-apples comparison; their earlier correctness caveat still applies.

## 2. Pre-registered new features and as-of construction

**B Elo trajectory, three columns:** `HomeEloTrendLast5`, `AwayEloTrendLast5`, difference. For each team, this is the latest **prior** match's post-match Elo minus the pre-match Elo before the oldest of up to five prior appearances. It reuses existing pre-match Elo and frozen K=20; no new K fit, initial value or external ratings. If no prior appearance exists, trend is missing and filled from the training median.

**C Venue form, eight columns:** for today's home team, means of goals for, goals against, points and win indicator over its **five previous home matches**; for today's away team, the same four means over its **five previous away matches**. Mixed-venue matches are excluded from these venue histories. Empty histories are missing and use train-derived fills.

**D Opponent-adjusted form, six columns:** prior-five all-venue means per team of `GF + (opponent pre-match Elo − 1500)/400`, `GA − (opponent pre-match Elo − 1500)/400`, and `3 × (actual Elo outcome score − pre-match Elo expected score)`. The first two credit scoring against stronger opponents and discount conceding against them; the third is an outcome residual against pre-match strength. These **fixed exploratory formulas** were set before diagnostic evaluation. They do not claim to be calibrated expected goals or causal strength effects. The opponent rating is from **before that historical match**, never a future or season-end rating.

**E Schedule congestion, six columns:** each side's count of strictly prior team matches **1–7 and 1–14 calendar days** before today's date, plus home-minus-away count for each window. First history gives zero. These counts add schedule context to the existing rest-day columns; no cap or window was selected on test results.

**F Combined:** baseline plus **all 23 columns from B, C, D and E**, fixed before the diagnostic evaluation. Individual families were fitted and checked on pre-test validation in order B–E; F was then fitted with the already fixed composition. No family was dropped because its 760-match result hurt.

The isolated builder reads **all fixtures on a date before applying any results from that date**. Historical source entries are added only afterward. Thus every new venue/opponent/Elo/congestion source has `source_date < fixture_date`. This whole-date rule is conservative when kickoff times are absent. `feature_integrity.csv` defines every one of the 23 columns, source, window, first season, shift rule, pre-kickoff availability and fill policy. `asof_spot_checks.json` traces three diagnostic fixtures' prior team matches, opponent pre-Elo and venue history. For Man United–Fulham on **2024-08-16**, for example, the latest source match for each side is **2024-05-19**, strictly before the fixture. Mutation tests changed the current and a future match's result/goals and verified the current fixture's **all 23 feature values remained unchanged**; synthetic checks also verified correct venue, Elo pre-match, opponent-pre-Elo and congestion semantics.

The retained baseline features have their own historical builder behaviour and documented `legacy_v1` limitations; these tests certify the **new** Phase-7 columns, not universal prospective correctness of the entire 123-column baseline. Historical feature rows are not archived pre-kickoff prediction snapshots.

## 3. Training and inference parity

Each XGB home/away pair kept the Phase-3 `n_estimators=500`, depth 6, learning rate .05, subsample .9, column subsample .9, L2=1, histogram tree method, 30-round early stopping and seed 42. The **2023/24 validation targets were used for early stopping**, so that season is not a pristine validation holdout. The only varied model input was the pre-registered feature column list. The Phase-3 saved training fill values remained **unchanged for all 123 original columns**; each new column used its **training-split numeric median**, with zero only if that entire training column was missing. Metadata saves exact list/order/fills per variant and inference checks that exact order. All variants exclude odds. Rates are finite and positive; independent and fixed-DC matrices are finite, nonnegative and normalized.

Validation exact counts (diagnostic before 760 test, with early-stopping exposure) were **A45, B44, C38, D40, E47, F39 out of 380**. No threshold, feature subset or model setup was tuned from the 760 outcomes. Model/metadata/rate hashes and the fixed Combined composition are in `training_manifest.json`; source and protected Phase-3 through Phase-6 hashes are in `data_manifest.json`.

## 4. Primary independent-Poisson exact-score Top-1

Exact score means both integer goals match. Deltas below are against A=96/760. This is the **primary decision table**; MAE, NLL, feature importance and DC are secondary.

| Variant | Features | Hits / 760 | Accuracy | Δ hits | Δ percentage points | Historical verdict |
|---|---:|---:|---:|---:|---:|---|
| A clean baseline | 123 | **96** | **12.63%** | 0 | 0.00 | Reproduced control |
| B +Elo trajectory | 126 | **96** | **12.63%** | 0 | 0.00 | **NEUTRAL** |
| C +venue-specific form | 131 | 86 | 11.32% | −10 | −1.32 | **FAILED** |
| D +opponent-adjusted form | 129 | 93 | 12.24% | −3 | −0.39 | **FAILED** |
| E +rest/congestion context | 129 | 95 | 12.50% | −1 | −0.13 | **NEUTRAL / essentially unchanged**, numerically worse |
| F all-family Combined | 146 | 93 | 12.24% | −3 | −0.39 | **FAILED** |

No primary variant exceeds 96/760; none beats DC's 99/760. Calling E “neutral” describes a one-hit historical difference, **not** a gain. The best primary Phase-7 model is the clean A baseline, tied on hits with B; A retains fewer new assumptions.

## 5. Fixed-DC secondary ablation and temporal stability

Every new lambda pair was also scored with **exactly the frozen Phase-4 rho**, with global DC cell argmax. This is a separate architecture from the required primary comparison.

| Variant | Independent 2024/25 | Independent 2025/26 | Fixed DC total | DC 2024/25 | DC 2025/26 |
|---|---:|---:|---:|---:|---:|
| A | 46/380 | 50/380 | **99/760** | 47/380 | 52/380 |
| B | 47/380 | 49/380 | 96/760 | 45/380 | 51/380 |
| C | 39/380 | 47/380 | 89/760 | 39/380 | 50/380 |
| D | 44/380 | 49/380 | 98/760 | 47/380 | 51/380 |
| E | 47/380 | 48/380 | **101/760** | **49/380** | 52/380 |
| F | 45/380 | 48/380 | 97/760 | 49/380 | 48/380 |

E+fixed DC beats the historical DC count by **two hits (+0.26 percentage points)**, both gained in 2024/25; it ties DC in 2025/26. It does **not** improve the primary Independent result (95 vs 96). This is a narrow, season-concentrated **secondary historical diagnostic**, not evidence to change the primary feature selection or a prospective improvement. `fixed_dc_score_distribution.csv` shows DC 1-1 selections change from **507 A to 489 E**, still versus **92 actual**, so the severe DC central mode remains.

## 6. Goal-rate and score likelihood diagnostics

These are secondary measures under the **untruncated independent-Poisson joint distribution** at the actual goal counts. The fixed-DC hit table uses normalized grid matrices for selection; DC NLL was not refitted or invented.

| Variant | Home goal MAE | Away goal MAE | Mean of two MAEs | Independent joint NLL |
|---|---:|---:|---:|---:|
| A | 0.9746 | 0.8605 | 0.9175 | 2.94729 |
| B | 0.9679 | 0.8612 | 0.9146 | 2.94518 |
| C | 0.9685 | 0.8612 | 0.9149 | 2.94298 |
| D | 0.9697 | 0.8685 | 0.9191 | 2.94951 |
| E | 0.9721 | 0.8693 | 0.9207 | 2.95192 |
| F | 0.9669 | 0.8621 | 0.9145 | 2.94213 |

C and F improve likelihood/MAE slightly yet lose 10 and 3 primary exact hits. These metrics cannot replace exact-score Top-1.

## 7. Lambda dispersion, boundary crossings and match types

The full `lambda_diagnostics.csv` stores **mean, population standard deviation, variance, minimum, 25th percentile, median, 75th percentile and maximum** for home, away and home-minus-away lambda for **all six variants**. Core dispersion values:

| Variant | Mean λhome / std | Mean λaway / std | Mean λdiff / std |
|---|---:|---:|---:|
| A | 1.608 / 0.474 | 1.236 / 0.354 | 0.372 / 0.764 |
| B | 1.611 / 0.490 | 1.237 / 0.375 | 0.373 / 0.801 |
| C | 1.611 / 0.468 | 1.227 / 0.357 | 0.384 / 0.760 |
| D | 1.606 / 0.451 | 1.233 / 0.365 | 0.373 / 0.753 |
| E | 1.605 / 0.480 | 1.234 / 0.377 | 0.372 / 0.785 |
| F | 1.597 / 0.456 | 1.237 / 0.363 | 0.360 / 0.760 |

The baseline middle half lies at **λhome 1.262–1.897**, **λaway 0.952–1.467**, **λdiff −0.195–0.921**. B modestly widens dispersion, especially lambda difference, but ties Exact. D/F narrow lambda-diff dispersion and lose three hits. More variance is **not automatically** more useful match discrimination. All variants still concentrate around moderate scores.

`lambda_error_by_match_type.csv` reports mean lambdas, home/away MAE and exact hits for actual **H/D/A** and actual total-goal groups **0–1, 2, 3, 4+** for every variant. In the clean baseline, exact hits by actual outcome are **H32, D57, A7**; by total-goal group **13, 78, 5, 0** respectively. The large number of hits at exactly two total goals, and zero at 4+, illustrates weak high-score mode selection. These groups use actual results **only for post-test diagnostics**, never feature fitting or model choice.

## 8. Selected score distribution and mode collapse

Counts below are Independent/global Top-1 selections; `score_distribution.csv` includes **count and percentage** for every actual or selected scoreline and all six variants. Required common cells:

| Score | Actual | A | B | C | D | E | F |
|---|---:|---:|---:|---:|---:|---:|---:|
| 0-0 | 43 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1-0 | 51 | 115 | 128 | 128 | 128 | 121 | 121 |
| 0-1 | 57 | 28 | 30 | 25 | 16 | 24 | 23 |
| 1-1 | **92** | **437** | **416** | **426** | **440** | **435** | **440** |
| 2-0 | 50 | 116 | 116 | 116 | 111 | 107 | 112 |
| 0-2 | 43 | 12 | 17 | 8 | 10 | 13 | 8 |
| 2-1 | 70 | 38 | 38 | 34 | 34 | 38 | 34 |
| 1-2 | 56 | 10 | 12 | 19 | 16 | 17 | 20 |
| 2-2 | 57 | 0 | 0 | 0 | 0 | 0 | 0 |
| 3-0 | 38 | 3 | 2 | 4 | 3 | 4 | 2 |
| 0-3 | 22 | 0 | 0 | 0 | 0 | 0 | 0 |
| 3-1 | 37 | 1 | 1 | 0 | 2 | 1 | 0 |
| 1-3 | 20 | 0 | 0 | 0 | 0 | 0 | 0 |
| 3-2 | 22 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2-3 | 15 | 0 | 0 | 0 | 0 | 0 | 0 |

Every variant's dominant selected score remains **1-1**, ranging from **416/760 (54.74%) B** to **440/760 (57.89%) D/F**, versus actual **92/760 (12.11%)**. B reduces 1-1 by 21 selections but simply scores the same 96 hits; other families largely retain the collapse. Top-1 entropy is **1.315 A, 1.369 B, 1.330 C, 1.293 D, 1.338 E, 1.295 F nats**. None selects 0-0 or 2-2 despite 43/57 actual occurrences; `report.json` gives dominant count, 2-1/1-0/0-1 counts and unique-score count per variant. Reducing the most common mode is not enough without exact-hit gains.

## 9. Score-mode boundary flips and fixture examples

Only lambda changes that cross a score-cell mode boundary can alter exact Top-1. The full `rank_flips.csv` includes all changed matches and both lambda pairs, both selected scores, delta lambdas, actual score and gain/loss flag.

| Variant vs A | Changed scores | Baseline wrong→variant correct | Baseline correct→variant wrong | Wrong→different wrong | Net exact hits |
|---|---:|---:|---:|---:|---:|
| B | 96 | 9 | 9 | 78 | 0 |
| C | 91 | 4 | 14 | 73 | **−10** |
| D | 96 | 8 | 11 | 77 | −3 |
| E | 97 | 11 | 12 | 74 | −1 |
| F | 104 | 10 | 13 | 81 | −3 |

Representative frozen gain/loss examples for **each family** (λ pairs are home/away, change is variant minus A):

| Variant / effect | Fixture; actual | A λ → score | Variant λ → score | Δλhome / Δλaway |
|---|---|---|---|---:|
| B gain | Man United–Fulham, 2024-08-16; 1-0 | 2.062/0.858 → 2-0 | 1.832/0.905 → **1-0** | −0.230 / +0.047 |
| B loss | Fulham–Arsenal, 2024-12-08; 1-1 | 1.218/1.909 → **1-1** | 1.122/2.101 → 1-2 | −0.096 / +0.193 |
| C gain | Wolves–Liverpool, 2024-09-28; 1-2 | 1.056/1.875 → 1-1 | 1.094/2.090 → **1-2** | +0.038 / +0.215 |
| C loss | Liverpool–Aston Villa, 2024-11-09; 2-0 | 2.065/0.855 → **2-0** | 1.915/0.880 → 1-0 | −0.149 / +0.024 |
| D gain | Man United–Fulham, 2024-08-16; 1-0 | 2.062/0.858 → 2-0 | 1.916/0.847 → **1-0** | −0.146 / −0.010 |
| D loss | Leicester–Tottenham, 2024-08-19; 1-1 | 1.116/1.907 → **1-1** | 1.138/2.046 → 1-2 | +0.022 / +0.139 |
| E gain | Man United–Fulham, 2024-08-16; 1-0 | 2.062/0.858 → 2-0 | 1.907/0.848 → **1-0** | −0.155 / −0.010 |
| E loss | Leicester–Tottenham, 2024-08-19; 1-1 | 1.116/1.907 → **1-1** | 1.066/2.209 → 1-2 | −0.050 / +0.302 |
| F gain | Man United–Fulham, 2024-08-16; 1-0 | 2.062/0.858 → 2-0 | 1.967/0.820 → **1-0** | −0.095 / −0.038 |
| F loss | Fulham–Arsenal, 2024-12-08; 1-1 | 1.218/1.909 → **1-1** | 1.110/2.055 → 1-2 | −0.109 / +0.146 |

Examples are descriptive; no feature formula or window was revised using these outcomes.

## 10. Feature importance, redundancy and missingness

`feature_importance_home.csv` and `feature_importance_away.csv` contain **top 20 XGB split-gain features for each of all six models**, and `new_feature_importance_ranks.csv` shows every new feature's rank when used. Importance is diagnostic, not a causal or accuracy criterion. Notable ranks: B home Elo-trend best **47**, away best **64**; C home venue best **21**, away best **29**; D home opponent feature best **13**, away **28**; E home 7-day fixture count **5**, away **12**; F home congestion features **6, 10, 13**. E's importance and secondary DC count do not change its primary 95/760 verdict.

`feature_redundancy.csv` flags **four** new-vs-existing pairs with Pearson |r|≥.90: home/away opponent-adjusted GF against general Last5 GF (**r≈.984**) and opponent-adjusted GA against general Last5 GA (**r≈.982**). This is expected from modest Elo adjustments and may limit added signal. No correlated feature was dropped after seeing test performance.

`feature_missingness.csv` records train, validation and diagnostic percentages for all 23 features. New Elo/opponent history misses **roughly 0.2–0.34% training**, venue history about **0.43% training**, most validation at **0–0.26%**, and all diagnostic new features at **0%**; schedule counts have **0%** missing in all splits. The differences reflect first historical appearances/venue games and are small, but the diagnostic period is fully populated whereas initial training rows need train-derived fills. Inference parity tests verified the exact saved order, fills and absence of odds.

## 11. Team, inferred promoted-team and stability diagnostics

`team_level_stability.csv` reports hits and misses by fixture-involved team for every variant. These team counts **overlap** because each match has two teams and cannot be summed as match totals. E Independent's per-team deltas versus A range from **−2** (Aston Villa, West Ham, Tottenham) to **+2** (Bournemouth); there is no broad, stable team-level improvement. `promoted_team_diagnostic.csv` uses **season team-set differences**, not invented external promotion metadata: inferred new Premier League teams are **Ipswich, Leicester, Southampton** in 2024/25 and **Burnley, Leeds, Sunderland** in 2025/26. Each season has 108 fixtures involving at least one of these teams. A Exact is **12/108 and 16/108**; B **13 and 16**, C **8 and 14**, D **12 and 15**, E **11 and 16**, F **10 and 15**. Existing Elo initialises any team with no historical Premier League rating at 1500; returning clubs can retain older stored PL history. New venue/opponent trends use the training median if truly unseen. These entrant diagnoses are descriptive and did not influence the feature design.

## 12. Tests, verdict and one deferred next experiment

The full relevant suite passed: **32 passed**. It covers bitwise Phase-3 baseline reproduction, same 760 fixture keys/targets, frozen DC rho, positive finite rates and normalized valid score modes, current/future result mutation invariance, pre-match Elo/venue/opponent/schedule construction, exact feature order and training fills, no odds, fixed Combined composition and protected Phase-2 through Phase-6/production hashes. `asof_spot_checks.json`, `data_manifest.json`, `training_manifest.json` and per-variant artifacts make the design auditable.

**Primary verdicts:** A reproduced **96/760**; B **NEUTRAL 96/760**; C **FAILED 86/760**; D **FAILED 93/760**; E **NEUTRAL numerically worse 95/760**; F **FAILED 93/760**. None of these **primary Independent** variants beats **99/760 fixed DC**. F was no better than D and worse than B/E, consistent with redundancy, model interaction or modest sample signal; this is interpretation, not proof. Richer strength information changed lambdas and about 91–104 mode boundaries per family, but gains were offset or outweighed by losses. Only B showed a small reduction in 1-1 selections while tying exact hits; no family provided clear, stable primary signal across both seasons. E+fixed DC's 101/760 remains a **narrow secondary** historical observation with only 2024/25 gains and persistent 1-1 collapse.

**One next experiment, not implemented:** conduct a **prospective pre-kickoff freeze** of Phase-3 XGB+Independent global, fixed XGB+DC global, and frozen E-congestion XGB+fixed DC on future fixtures, recording model version, feature snapshot, lambdas and score matrix before kickoff. This directly tests whether the two-hit secondary DC observation persists without revisiting the inspected 760 outcomes. No future results or performance are fabricated here; Phase 7 stops at this report.
