# Phase 4 — score_dependency_v1

## Reproduction and controlled implementation

Frozen Phase-3 XGBoost home/away goal rates reproduce the independent-Poisson baseline **96/760 (12.63%)**, with exactly the same 760 goal-rate pairs, match order and Top-1 scores as Phase 3. `frozen_test_inputs.csv`, `frozen_test_rates.npy` and `baseline_freeze.json` record the inputs and hashes. Neither XGB model was retrained or modified. All three methods use the same lambda pairs and a 0–6 score grid per side; matrices are normalized by their truncated-grid mass before Top-1/Top-3 ranking. This is a historical pre-match feature-row comparison, not a prospective forecast log.

The existing `src/evaluation/dixon_coles_experiment.py` was audited: its standard four-cell tau formula is correct, but it uses another saved goal-rate set, a wider score grid and validation **exact-hit** selection. The new reusable `src/models/score_dependency.py` applies the same standard correction to the frozen XGB rates and 0–6 grid. Specifically, tau for `(0,0),(0,1),(1,0),(1,1)` is `1-h*a*rho`, `1+h*rho`, `1+a*rho`, `1-rho`; other raw joint cells are unchanged before grid normalization. The experiment driver is `src/evaluation/score_dependency_v1.py`.

Bivariate Poisson uses independent `U1 ~ Pois(theta1)`, `U2 ~ Pois(theta2)`, `U3 ~ Pois(shared)` with home=`U1+U3` and away=`U2+U3`. A single global fraction `q` gives fixture-specific `shared=q*min(lambda_home,lambda_away)`, `theta1=lambda_home-shared`, and `theta2=lambda_away-shared`. Thus the two XGB marginal means remain unchanged, while covariance equals `shared` and correlation is `shared/sqrt(lambda_home*lambda_away)`. This is a simple positive-dependence ablation; it cannot express negative covariance.

## Parameter fitting and data safety

Both parameters were selected by minimizing **untruncated joint score NLL on the 380 validation matches in 2023/24** (2023-08-11 to 2024-05-19). Fixed bounds were `rho ∈ [-0.05,0.05]` to keep low-score factors valid and `q ∈ [0,0.95)`. Zero-dependence boundaries were compared using validation likelihood only. No time decay was used. The 760 diagnostic outcomes were not read by the fit procedure, and changing those outcomes in memory did not alter the fitted values in tests. Validation itself had already been used for XGB early stopping, so this is not an untouched parameter-fit set. `parameter_fit.json` records objective, bounds, fit input hash and optimizer status.

Fitted **Dixon–Coles `rho=-0.0341898781`**: validation NLL moved from 3.093827 at zero to 3.093577. Fitted **bivariate `q=0`**: its best validation likelihood was the zero-shared boundary, with NLL 3.093827. The evaluated shared covariance/correlation is consequently zero. No dependence value was changed after inspecting the 760 diagnostic results.

Data-safety status: **PASS** for identical frozen XGB rates, same matches/grid/evaluator, fit on validation only, no added odds/features and unchanged Phase-3/production artifact hashes. **UNCERTAIN** for full kickoff-time availability and prospective accuracy because the archive stores historical date-based feature rows, and 2024/25–2025/26 were previously inspected.

## Primary Exact Top-1 and secondary metrics

| Method with frozen XGB rates | Exact hits | Exact Top-1 | Delta vs independent | Verdict |
|---|---:|---:|---:|---|
| Independent Poisson | 96/760 | 12.63% | — | baseline |
| Dixon–Coles | **99/760** | **13.03%** | **+0.39 pp** | promising historical diagnostic for Top-1; distribution worsened |
| Bivariate Poisson | 96/760 | 12.63% | 0.00 pp | neutral; validation selected zero dependence |

| Secondary metric | Independent | Dixon–Coles | Bivariate |
|---|---:|---:|---:|
| Top-3 exact hits | 215/760 (28.29%) | 228/760 (30.00%) | 215/760 (28.29%) |
| Proper untruncated joint NLL | 2.947295 | 2.946183 | 2.947295 |
| Actuals inside 0–6 grid | 759/760 | 759/760 | 759/760 |

NLL uses each method's **untruncated** joint probability of the actual score, so the one actual score outside the 0–6 matrix has a valid nonzero likelihood. Top-1/Top-3 use the separately normalized 0–6 matrices. No arbitrary log-probability clipping or forced-draw NLL was used. Top-3 and NLL are secondary and do not determine the Exact Top-1 verdict.

## Score distribution, collapse and draws

Counts (each method predicted one Top-1 score per 760 matches; percentages are in `score_distribution.csv`):

| Score | Actual | Independent | Dixon–Coles | Bivariate |
|---|---:|---:|---:|---:|
| 0-0 | 43 | 0 | 0 | 0 |
| 1-0 | 51 | 115 | 67 | 115 |
| 0-1 | 57 | 28 | 12 | 28 |
| 1-1 | 92 | 437 | **507** | 437 |
| 2-0 | 50 | 116 | 122 | 116 |
| 0-2 | 43 | 12 | 12 | 12 |
| 2-1 | 70 | 38 | 29 | 38 |
| 1-2 | 56 | 10 | 7 | 10 |
| 2-2 | 57 | 0 | 0 | 0 |
| 3-0 | 38 | 3 | 3 | 3 |
| 0-3 | 22 | 0 | 0 | 0 |
| 3-1 | 37 | 1 | 1 | 1 |
| 1-3 | 20 | 0 | 0 | 0 |
| 3-2 | 22 | 0 | 0 | 0 |
| 2-3 | 15 | 0 | 0 | 0 |

`1-1` was the most common Top-1 for all three methods: **57.50% independent, 66.71% DC, 57.50% bivariate**, versus **12.11% actual**. All predicted 9 distinct scorelines. Top-1 score-frequency entropy fell from 1.315 nats to 1.107 nats under DC, showing **stronger**, not weaker, mode collapse. `2-1` predictions fell from 38 to 29 even though 70 matches actually ended `2-1`. DC did not move the collapse to `2-1`; it concentrated more heavily on `1-1`.

Actual draw rate was **25.92%**. Predicted draw rates were **57.50% independent, 66.71% DC, 57.50% bivariate**. All methods selected zero `0-0` and zero `2-2` Top-1 scores even though those occurred 43 and 57 times. Their draw predictions were almost entirely `1-1`. DC's negative rho increases `0-0` and `1-1` cell masses and decreases `0-1`/`1-0` masses; for this XGB rate set the resulting Top-1 changes mostly favor `1-1`.

## Conditional precision and match flips

For common selected scores, counts are predictions/correct (bivariate equals independent exactly):

| Score | Independent | Dixon–Coles | Bivariate |
|---|---:|---:|---:|
| 0-0 | 0/0 | 0/0 | 0/0 |
| 1-0 | 115/9 (7.8%) | 67/5 (7.5%) | 115/9 (7.8%) |
| 0-1 | 28/4 (14.3%) | 12/3 (25.0%) | 28/4 (14.3%) |
| 1-1 | 437/57 (13.0%) | 507/66 (13.0%) | 437/57 (13.0%) |
| 2-0 | 116/18 (15.5%) | 122/18 (14.8%) | 116/18 (15.5%) |
| 0-2 | 12/3 (25.0%) | 12/3 (25.0%) | 12/3 (25.0%) |
| 2-1 | 38/5 (13.2%) | 29/4 (13.8%) | 38/5 (13.2%) |
| 1-2 | 10/0 | 7/0 | 10/0 |
| 2-2 | 0/0 | 0/0 | 0/0 |
| 3-0 | 3/0 | 3/0 | 3/0 |
| 3-1 | 1/0 | 1/0 | 1/0 |

DC changed Top-1 on **78** matches, gaining **9** exact hits and losing **6**, net +3. Example gain: Aston Villa–Bournemouth on 2024-10-26 ended 1-1; independent selected 2-1, DC selected 1-1, with unchanged rates 2.037/1.055 and actual-score untruncated probability 0.09761→0.10094. Example loss: Nott'm Forest–Ipswich on 2024-11-30 ended 1-0; independent selected 1-0, DC selected 1-1. Bivariate changed **zero** Top-1 scores and had **zero** gains/losses because fitted `q=0`. `match_flips.csv` records all changes, both selected-cell probabilities under the normalized grid, actual-score probabilities under untruncated joints, unchanged rates and match keys. High-score raw DC cells are unchanged; their normalized-grid probabilities can shift slightly because the common denominator changes.

The fitted bivariate model has mean shared covariance and correlation **0**. Mean probabilities for `0-0`, `1-1`, `2-2`, `2-1`, `1-2` are identical to independent (see `report.json`), so it did not materially change the distribution. A separate validity test with nonzero shared fraction confirmed preserved marginal means rather than accidentally adding shared goals to the XGB rates.

## Validity, verdict and one next experiment

Mandatory negative controls were exact: **DC `rho=0` and bivariate `q=0` matched independent with maximum matrix difference 0** on all 760 frozen rate pairs. All generated matrices were finite, nonnegative and normalized; the nonzero-shared wide-grid bivariate test preserved intended home/away means within `1e-8`. `python -m pytest -q tests` passed **15/15**, including baseline reproduction, low-score tau cells, zero controls, score validity, validation-only parameter fitting and protected artifact hashes.

**Best historical Exact Top-1 method: Dixon–Coles, 99/760.** The gain is only three matches on heavily inspected seasons, while its `1-1` and draw overprediction increased sharply. It therefore does **not** demonstrate a healthier score distribution or verified generalization. Bivariate was neutral because validation likelihood did not support positive shared dependence. The only recommended next experiment is a prospective pre-kickoff freeze of **independent XGB and fitted DC XGB side by side**, with scores and hashes locked before each new match and Exact Top-1 evaluated after results arrive. That experiment is not implemented here.
