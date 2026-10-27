"""Rebuild isolated features/model and verify every validation/test date as-of."""
import hashlib
import json
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))
import joblib
import numpy as np
import pandas as pd
from src.features.feature_engineering import generate_features,build_fixtures_for_date
from src.models.model_utils import split_by_season
from src.models.poisson_model import fit_poisson_models,_prepare_matrix,FEATURE_COLUMNS
from src.evaluation.poisson_goal_calibration import evaluate

def main():
    out=ROOT/'data/processed/asof_rebuild_v1'
    out.mkdir(parents=True,exist_ok=True)
    protected=[ROOT/'models/saved_models/poisson_model.joblib',ROOT/'data/processed/predictions_2026_2027_harddraw_v3.csv',ROOT/'data/processed/features_matches.csv']
    digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
    hashes={str(p):digest(p) for p in protected}
    matches=pd.read_csv(ROOT/'data/processed/matches_standardized.csv')
    matches['Date']=pd.to_datetime(matches.Date)
    features=generate_features(matches)
    features.to_csv(out/'features_matches.csv',index=False)
    splits=split_by_season(features)
    assert splits['train'].Date.max()<splits['validation'].Date.min()
    assert splits['validation'].Date.max()<splits['test'].Date.min()
    home,away,fill=fit_poisson_models(splits['train'])
    joblib.dump(dict(home_goals_model=home,away_goals_model=away,feature_columns=FEATURE_COLUMNS,fill_values=fill.to_dict()),out/'poisson_train_only.joblib')
    target=pd.concat([splits['validation'],splits['test']]).sort_values(['Date','HomeTeam','AwayTeam'])
    records=[]
    dates=list(target.groupby('Date'))
    for i,(day,expected) in enumerate(dates):
        actual=build_fixtures_for_date(matches,expected[['HomeTeam','AwayTeam']],day)
        keys=['Date','HomeTeam','AwayTeam']
        actual=actual.set_index(keys).loc[expected.set_index(keys).index].reset_index()
        x,_=_prepare_matrix(actual,fill)
        ref,_=_prepare_matrix(expected,fill)
        np.testing.assert_allclose(x.to_numpy(),ref.to_numpy(),rtol=1e-10,atol=1e-10)
        rates=np.clip(np.column_stack([home.predict(x),away.predict(x)]),.05,None)
        ref_rates=np.clip(np.column_stack([home.predict(ref),away.predict(ref)]),.05,None)
        np.testing.assert_allclose(rates,ref_rates,rtol=1e-10,atol=1e-10)
        rows=expected[keys+['Season','HomeGoals','AwayGoals']].copy()
        rows['expected_home_goals'],rows['expected_away_goals']=rates[:,0],rates[:,1]
        rows['predicted_score']=[f'{h}-{a}' for h,a in np.floor(rates).astype(int)]
        records.append(rows)
        if i%10==0 or i+1==len(dates):
            print(f'Validated {i+1}/{len(dates)} dates ({sum(len(r) for r in records)} matches)',flush=True)
    result=pd.concat(records,ignore_index=True)
    result.to_csv(out/'asof_predictions.csv',index=False)
    report=dict(train_rows=len(splits['train']),validated_dates=len(dates),validated_matches=len(result),feature_parity=True,prediction_parity=True,metrics={},protected_sha256=hashes,
        notes=['Poisson only, train through 2022/23; no parameter tuning.',
               'All validation/test fixtures passed through the same date-batch builder delegated to by single-match inference.',
               'Only Poisson feature columns checked; full CatBoost/XGBoost and HTTP API not evaluated.',
               'Sequential pre-match history, not a preseason forecast. Previously viewed seasons are diagnostic.'])
    for season,frame in list(result.groupby('Season'))+[('test_all',result[result.Season.isin(['2024/25','2025/26'])])]:
        report['metrics'][season]=evaluate(frame,frame[['expected_home_goals','expected_away_goals']].to_numpy())[0]
    assert all(digest(p)==hashes[str(p)] for p in protected)
    (out/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2),flush=True)

if __name__=='__main__':
    main()
