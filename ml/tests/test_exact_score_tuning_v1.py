import hashlib,json
import numpy as np,pandas as pd

from src.evaluation.exact_score_tuning_v1 import (ALPHAS,CAP,ELO_EDGES,FOLDS,METHODS,OUT,P12,ROOT,
    actual_cell,apply,correction,fit_params,historical_prior,matrix,normalize)

def test_matrix_and_all_adjustments_are_valid_and_deterministic():
    frame=pd.read_csv(P12/'fixture_oof_rates.csv',low_memory=False).head(120)
    raw=np.stack([matrix(r.BaseLambdaHome,r.BaseLambdaAway) for r in frame.itertuples()])
    assert np.allclose(raw.sum(axis=1),1) and (raw>=0).all() and np.isfinite(raw).all()
    for method in METHODS:
        params=fit_params(frame,raw,method,.25)
        first,_=apply(method,raw,frame,params); second,_=apply(method,raw,frame,params)
        np.testing.assert_array_equal(first,second)
        assert np.allclose(first.sum(axis=1),1) and (first>=0).all() and np.isfinite(first).all()

def test_prior_fit_cannot_change_from_current_or_future_result():
    frame=pd.read_csv(P12/'fixture_oof_rates.csv',low_memory=False)
    train=frame[frame.Season.str[:4].astype(int).between(2016,2017)].copy()
    raw=np.stack([matrix(r.BaseLambdaHome,r.BaseLambdaAway) for r in train.itertuples()])
    base=fit_params(train,raw,'ELO_PRIOR')
    changed=train.copy(); changed.loc[changed.Season=='2017/18',['HomeGoals','AwayGoals']]=[6,6]
    # Parameters for predicting 2017/18 are built from the prior 2016/17 only.
    mask=train.Season=='2016/17'
    prior=fit_params(train[mask],raw[mask],'ELO_PRIOR')
    after=fit_params(changed[mask],raw[mask],'ELO_PRIOR')
    assert json.dumps(prior,default=lambda x:np.asarray(x).tolist(),sort_keys=True)==json.dumps(after,default=lambda x:np.asarray(x).tolist(),sort_keys=True)
    assert base.keys()=={'corr'}

def test_frozen_design_and_raw_baseline_reproduction():
    manifest=json.loads((OUT/'experiment_manifest.json').read_text())
    assert manifest['Methods']==METHODS and manifest['Alphas']==ALPHAS
    assert manifest['RatioCap']==list(CAP) and manifest['No2026'] is True
    pred=pd.read_csv(OUT/'walk_forward_predictions.csv')
    raw=pred[pred.Method=='RAW']
    assert len(raw)==2280 and int(raw.BaselineExact.sum())==254 and int(raw.TunedExact.sum())==254
    assert (raw.BaselineCell==raw.TunedCell).all()
    folds=pd.read_csv(OUT/'fold_results.csv')
    assert set(folds.Season)==set(FOLDS)
    assert (folds.N==380).all()

def test_selection_before_diagnostic_and_protected_forecasts():
    selection=json.loads((OUT/'selection_decision.json').read_text())
    assert selection['Selected']=='ELO_PRIOR' and selection['NoDiagnosticSelection'] is True
    diag=pd.read_csv(OUT/'diagnostic_predictions.csv')
    assert len(diag)==760 and not diag.Season.str.startswith('2026').any()
    report=json.loads((OUT/'report.json').read_text())
    assert report['FutureForecastsFrozen'] is False and report['ProductionChanged'] is False
    raw=ROOT/'data/processed/predictions_2026_27_latest/predictions_raw.csv'
    assert hashlib.sha256(raw.read_bytes()).hexdigest()=='0afa806c8e26b9fa2a354b760128955ad40fa85b7b592bd11aa0fd3a2923f8e3'
