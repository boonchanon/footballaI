# Phase 3 — ml_goal_rates_v1

## 1. Implementation and data safety

Four isolated regressors were trained: XGBoost home/away and CatBoost home/away. The actual repository targets are `HomeGoals` and `AwayGoals`; neither is a feature. The XGBoost objective is `count:poisson` (installed 3.1.2) and the CatBoost objective is `Poisson` (installed 1.2.8). Both return continuous goal-rate estimates, passed through a fixed `0.05` validity floor, never rounded into scores. The 50/50 XGB+Cat variant averages each side's rates with fixed weights. Official objective descriptions: [XGBoost](https://xgboost.readthedocs.io/en/stable/parameter.html), [CatBoost](https://catboost.ai/docs/en/concepts/loss-functions-regression).

The experiment code is `src/models/ml_goal_rates_v1.py` and `src/evaluation/ml_goal_rates_v1.py`; relevant checks are in `tests/test_ml_goal_rates_v1.py`. Models, metadata and results are saved only in this new directory. Production, Poisson and Phase 2 artifacts were not overwritten.

Training used 11,564 matches from 1993/94–2022/23. Validation used 380 matches in 2023/24 for early stopping. Historical diagnostic evaluation used the same 760 matches from 2024/25–2025/26 as Phase 2. All regressors use Phase 2's exact 123-feature no-odds list, `legacy_v1` semantics and saved train-only medians. No new feature, Elo algorithm, score prior, ensemble weight or forced-draw rule was introduced. Feature names/order and metadata version are checked at inference; all four model feature lists are checked against metadata. The target seasons were not used for training, preprocessing, selection of objectives, hyperparameters or ensemble weights.

Leakage status: **PASS** for train-only imputation, no current-match target among features, no odds in new models and chronological split; **UNCERTAIN** for full kickoff-time availability because the archive has date-based historical feature rows and no prospective forecast freeze. The evaluation path is offline and does not claim to be 760 live fixture/API calls.

## 2. Reproduced Phase 2 baseline

Before training, the Phase 2 no-odds classifiers, frozen Poisson rates and unchanged score-selection functions reproduced **75/760 (9.87%)** with **zero per-match score or rate mismatches**. Hashes of Phase 2 models, match output, rates, feature data and code references are in `baseline_freeze.json`. Its baseline is the saved historical pre-match feature-row path from Phase 2; it must not be interchanged with earlier 89/760 or 88/760 artifacts.

## 3. Comparison A — pure independent-Poisson goal-rate path

Each rate pair was converted with the unchanged 0–6 per-side independent-Poisson score matrix, normalized within that grid, and Top-1 chosen by matrix argmax. This path applies no classifier blend, score prior or forced draw.

| Goal-rate source | Exact hits | Exact Top-1 | Delta vs pure Poisson | Verdict |
|---|---:|---:|---:|---|
| Current frozen Poisson | 85/760 | 11.18% | — | reference |
| XGBoost goals | 96/760 | 12.63% | +1.45 pp | promising historical diagnostic |
| CatBoost goals | 89/760 | 11.71% | +0.53 pp | promising historical diagnostic |
| 50/50 XGB+Cat goals | 94/760 | 12.37% | +1.18 pp | promising historical diagnostic |

## 4. Comparison B — Phase 2 pipeline with only lambda source replaced

The Phase 2 CatBoost/XGBoost outcome probabilities, 50/50 classifier blend, 75/25 Poisson-outcome blend, score weighting, forced-draw rules and Top-1 selection are kept unchanged. Only `lambda_home` and `lambda_away` change. The integrated frozen-Poisson path reproduces the Phase 2 score for every match.

| Goal-rate source | Exact hits | Exact Top-1 | Delta vs Phase 2 | Verdict |
|---|---:|---:|---:|---|
| Phase 2, current Poisson rates | 75/760 | 9.87% | — | reference |
| XGBoost goals | 85/760 | 11.18% | +1.32 pp | promising historical diagnostic |
| CatBoost goals | 81/760 | 10.66% | +0.79 pp | promising historical diagnostic |
| 50/50 XGB+Cat goals | 79/760 | 10.39% | +0.53 pp | promising historical diagnostic |

These are two separate comparisons with different relevant baselines. XGBoost is the best preregistered Phase 3 variant for both exact-score paths. The gain is not proof of prospective improvement; 2024/25 and 2025/26 were inspected previously.

## 5. Goal-rate and probability quality

The figures below evaluate continuous rates against actual goal counts, rather than the selected integer score.

| Source | Home MAE | Away MAE | Home RMSE | Away RMSE | Mean home rate | Mean away rate | Independent-Poisson NLL |
|---|---:|---:|---:|---:|---:|---:|---:|
| Current Poisson | 0.951 | 0.856 | 1.171 | 1.105 | 1.576 | 1.198 | 2.934 |
| XGBoost | 0.975 | 0.861 | 1.188 | 1.108 | 1.608 | 1.236 | 2.947 |
| CatBoost | 0.964 | 0.865 | 1.190 | 1.108 | 1.554 | 1.224 | 2.949 |
| 50/50 ensemble | 0.967 | 0.861 | 1.184 | 1.106 | 1.581 | 1.230 | 2.943 |

Actual mean goals were **1.520 home** and **1.322 away**. None of the ML variants improved continuous goal MAE or untruncated independent-Poisson joint NLL over the frozen Poisson rates. The NLL above is mathematically valid for the *underlying untruncated independent-Poisson model* at actual goals, including scores above 6. It does **not** measure the integrated forced-draw/score-adjusted distribution; no clipped Phase 2 NLL is reused as a final-matrix calibration claim.

Rate ranges and variance, in home/away order: Poisson min 0.661/0.533, max 3.641/2.436, variance 0.214/0.125; XGB min 0.658/0.519, max 3.236/2.635, variance 0.225/0.125; CatBoost min 0.583/0.567, max 3.742/2.683, variance 0.282/0.144; ensemble min 0.621/0.543, max 3.271/2.648, variance 0.242/0.129. All evaluated rates were finite and positive. Neither regressor shows lower variance than Poisson overall, although rates still cluster around central score modes. Full medians and distributions are in `report.json`.

## 6. Score distribution, mode collapse and conditional precision

Counts in the **pure** path (760 matches each):

| Score | Actual | Phase 2 integrated | Pure Poisson | Pure XGB | Pure Cat | Pure 50/50 |
|---|---:|---:|---:|---:|---:|---:|
| 0-0 | 43 | 0 | 0 | 0 | 0 | 0 |
| 1-0 | 51 | 49 | 128 | 115 | 136 | 122 |
| 0-1 | 57 | 26 | 28 | 28 | 63 | 39 |
| 1-1 | 92 | 158 | 460 | 437 | 388 | 429 |
| 2-0 | 50 | 172 | 116 | 116 | 114 | 115 |
| 0-2 | 43 | 21 | 22 | 12 | 26 | 18 |
| 2-1 | 70 | 213 | 1 | 38 | 18 | 23 |
| 1-2 | 56 | 119 | 0 | 10 | 6 | 7 |
| 2-2 | 57 | 0 | 0 | 0 | 0 | 0 |
| 3-0 | 38 | 2 | 5 | 3 | 6 | 4 |
| 0-3 | 22 | 0 | 0 | 0 | 0 | 0 |
| 3-1 | 37 | 0 | 0 | 1 | 3 | 3 |
| 1-3 | 20 | 0 | 0 | 0 | 0 | 0 |

The `1-1` pure selection rate is **60.5% Poisson, 57.5% XGB, 51.1% CatBoost, 56.4% ensemble**, versus **12.1% actual**. Each pure variant's most common score remains `1-1`; unique predicted scorelines are 7, 9, 9 and 9 respectively. ML rates reduced the collapse somewhat and XGB began selecting `2-1` (38 times), but the pure matrix still misses all `0-0` and `2-2` actuals as Top-1. It did not solve mode collapse.

In the **integrated** path, `1-1` counts are 158 Phase 2, 138 XGB, 157 CatBoost, 152 ensemble; draw prediction rates are 20.8%, 18.3%, 21.1% and 20.1%, versus 25.9% actual draws. Integrated XGB's most frequent score is `2-1` (196/760, 25.8%), well above its actual 70/760 (9.2%); it trades some `1-1` concentration for another score bias. The integrated score frequency and percentages for all requested scores are in `integrated_score_distribution.csv`; the pure counterpart is in `pure_score_distribution.csv`.

For common *pure* predictions, conditional exact precision illustrates the limits: Poisson `1-1` was correct 59/460 (12.8%); XGB `1-1` 57/437 (13.0%), `2-0` 18/116 (15.5%), and `2-1` 5/38 (13.2%); CatBoost `1-1` 53/388 (13.7%) and `2-1` 3/18 (16.7%); ensemble `1-1` 56/429 (13.1%) and `2-1` 3/23 (13.0%). Empty predicted-score bins have no precision estimate. Full counts for 0-0, 1-0, 0-1, 1-1, 2-0, 2-1, 1-2 and 2-2 are in `report.json`.

## 7. Match flips, tests and interpretation

Against Phase 2, integrated XGB gained **35** exact hits and lost **25**, net +10. Examples: Wolves–Liverpool (2024-09-28), actual 1-2, Phase 2 0-2, XGB 1-2; old/new rates 0.913/2.118 → 1.056/1.875. Arsenal–Man United (2024-12-04), actual 2-0, Phase 2 2-1, XGB 2-0; rates 2.080/1.008 → 2.333/0.882. Loss example: Ipswich–Liverpool (2024-08-17), actual 0-2, Phase 2 0-2, XGB 1-2; rates 0.661/2.260 → 1.153/2.143. Full gained/lost CSVs include all dates, teams, scores and rate pairs.

`python -m pytest -q tests` passed **9/9**. Checks cover correct targets, odds exclusion, strict feature parity, saved train-only imputation, positive rates, finite/nonnegative/normalized score matrices, valid integer Top-1, future-row invariance and unchanged Phase 2/production hashes.

The honest answer is **yes for historical Exact Top-1 in both controlled paths, no for generally better goal-rate error or likelihood**. XGB goal rates changed which score wins the matrix more usefully on these 760 matches, while still showing substantial central-score and `2-1` selection bias. The only recommended next experiment is prospective pre-kickoff freezing of the isolated XGB integrated variant alongside the Phase 2 baseline, with both scored after results arrive. That next experiment is not implemented here.
