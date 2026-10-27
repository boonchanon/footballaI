"""Pre-test learned calibration of a normalized 0..6 score matrix."""
from __future__ import annotations

import numpy as np
from scipy.optimize import minimize, minimize_scalar

GRID=7
SCORE_PRIOR=10.0
MIN_EXPECTED_SUPPORT=3.0
STRUCTURED_L2=5.0
TEMPERATURE_BOUNDS=(0.5,3.0)


def normalize(values):
    array=np.asarray(values,dtype=float)
    if not np.isfinite(array).all() or (array<0).any() or array.sum()<=0:
        raise ValueError("Invalid calibrated matrix")
    result=array/array.sum()
    if not np.isclose(result.sum(),1,atol=1e-12):
        raise ValueError("Calibration did not normalize")
    return result


def temperature_matrix(raw,temperature):
    if not np.isfinite(temperature) or temperature<=0:
        raise ValueError("Temperature must be positive")
    logits=np.log(raw)/temperature
    logits-=np.max(logits)
    return normalize(np.exp(logits))


def score_specific_matrix(raw,weights):
    if np.asarray(weights).shape != raw.shape or not np.isfinite(weights).all() or (np.asarray(weights)<=0).any():
        raise ValueError("Score-specific multipliers must be positive and match grid")
    return normalize(raw*weights)


def score_features():
    h,a=np.meshgrid(np.arange(GRID),np.arange(GRID),indexing="ij")
    return np.stack([(h==a).astype(float), (h+a)/4.0, np.abs(h-a)/3.0,
                     (h-a)/3.0, ((h>0)&(a>0)).astype(float)],axis=-1)


FEATURE_NAMES=("is_draw","total_goals_over_4","absolute_margin_over_3",
               "signed_margin_over_3","both_teams_score")
FEATURES=score_features()


def structured_matrix(raw,beta):
    coeff=np.asarray(beta,dtype=float)
    if coeff.shape!=(5,) or not np.isfinite(coeff).all():
        raise ValueError("Structured coefficient vector invalid")
    logits=np.log(raw)+np.einsum("ijk,k->ij",FEATURES,coeff)
    logits-=np.max(logits)
    return normalize(np.exp(logits))


def fit_temperature(raw_matrices,actual_pairs):
    if len(raw_matrices)!=len(actual_pairs):
        raise ValueError("Calibration train rows differ")
    def objective(t):
        return -np.mean([np.log(temperature_matrix(mat,t)[x,y]) for mat,(x,y) in zip(raw_matrices,actual_pairs)])
    result=minimize_scalar(objective,bounds=TEMPERATURE_BOUNDS,method="bounded",options={"xatol":1e-6})
    if not result.success:
        raise RuntimeError("Temperature optimizer failed")
    return float(result.x)


def fit_score_specific(raw_matrices,actual_pairs):
    expected=np.sum(raw_matrices,axis=0)
    observed=np.zeros((GRID,GRID),dtype=float)
    for x,y in actual_pairs:
        observed[x,y]+=1
    weights=np.ones((GRID,GRID),dtype=float)
    supported=expected>=MIN_EXPECTED_SUPPORT
    weights[supported]=(observed[supported]+SCORE_PRIOR)/(expected[supported]+SCORE_PRIOR)
    return weights,expected,observed,supported


def fit_structured(raw_matrices,actual_pairs):
    pairs=np.asarray(actual_pairs,dtype=int)
    def objective(beta):
        log_likelihood=0.0
        for mat,(x,y) in zip(raw_matrices,pairs):
            log_likelihood+=np.log(structured_matrix(mat,beta)[x,y])
        return -log_likelihood+0.5*STRUCTURED_L2*float(np.dot(beta,beta))
    result=minimize(objective,np.zeros(5),method="L-BFGS-B",options={"maxiter":200,"ftol":1e-10})
    if not result.success:
        raise RuntimeError(f"Structured calibration optimizer failed: {result.message}")
    return np.asarray(result.x,dtype=float)


def apply(method,raw,params):
    if method=="raw":
        return normalize(raw)
    if method=="temperature":
        return temperature_matrix(raw,params["temperature"])
    if method=="score_specific":
        return score_specific_matrix(raw,np.asarray(params["score_specific_weights"]))
    if method=="structured":
        return structured_matrix(raw,np.asarray(params["structured_beta"]))
    raise ValueError("Unknown calibration method")
