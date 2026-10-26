"""Versioned feature correctness audit; never writes production artifacts."""
import hashlib
import json
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))
import joblib
import numpy as np
import pandas as pd
from pandas.testing import assert_frame_equal
from src.features.feature_engineering import generate_features,build_fixture_features,build_head_to_head_features,add_difference_features
from src.models.model_utils import split_by_season,prepare_feature_matrices,CATEGORICAL_COLUMNS
from src.models.poisson_model import fit_poisson_models,_prepare_matrix,FEATURE_COLUMNS
from src.models.predictor import _prepare_catboost_frame,_prepare_xgboost_frame,_prepare_poisson_frame
from src.evaluation.poisson_goal_calibration import evaluate
from src.evaluation.compare_score_selection import scores

OUT=ROOT/'data/processed/correctness_audit_v1'
VERSION='correctness_v2'

def regression_tests(matches):
    history=pd.DataFrame([dict(HomeTeam='Arsenal',AwayTeam='Chelsea',HomeGoals=3,AwayGoals=1,Result='H'),
                          dict(HomeTeam='Chelsea',AwayTeam='Arsenal',HomeGoals=0,AwayGoals=2,Result='A')])
    def fixture(h,a,version):
        query=pd.DataFrame([dict(HomeTeam=h,AwayTeam=a,HomeGoals=0,AwayGoals=0,Result='D')])
        return build_head_to_head_features(pd.concat([history,query],ignore_index=True),feature_version=version).iloc[-1]
    h=fixture('Arsenal','Chelsea',VERSION); a=fixture('Chelsea','Arsenal',VERSION)
    for c in ['H2HPointsDiffPre','H2HPointsDiffLast3Pre','H2HGoalsDiffLast3Pre','H2HLastMeetingGoalDiffPre']:
        assert h[c]==-a[c] and h[c]!=0,c
    assert h.H2HLastMeetingTotalGoalsPre==a.H2HLastMeetingTotalGoalsPre==2
    assert h.H2HHomePointsAvgPre==a.H2HAwayPointsAvgPre==3
    assert h.H2HAwayPointsAvgPre==a.H2HHomePointsAvgPre==0
    assert h.H2HHomeGoalsAvgLast3Pre==a.H2HAwayGoalsAvgLast3Pre==2.5
    assert h.H2HAwayGoalsAvgLast3Pre==a.H2HHomeGoalsAvgLast3Pre==.5
    assert h.H2HLastMeetingHomePointsPre==3 and a.H2HLastMeetingHomePointsPre==0
    assert fixture('Chelsea','Arsenal','legacy_v1').H2HPointsDiffPre==3
    sample=generate_features(matches.head(80))
    sample['HomeHomePointsAvgPre']=2.5
    sample['AwayHomePointsAvgPre']=2
    sample['AwayAwayPointsAvgPre']=.5
    assert (add_difference_features(sample,feature_version=VERSION).HomeVsAwayPointsContextDiff==2).all()
    corrected=generate_features(matches.head(80),feature_version=VERSION)
    for index in (20,79):
        row=corrected.iloc[index]
        actual=build_fixture_features(matches.head(80),row.HomeTeam,row.AwayTeam,row.Date,feature_version=VERSION)
        assert_frame_equal(actual[FEATURE_COLUMNS],corrected.iloc[[index]][FEATURE_COLUMNS].reset_index(drop=True),check_dtype=False,atol=1e-10,rtol=1e-10)
        changed=matches.head(80).copy()
        changed.loc[changed.Date>=row.Date,['HomeGoals','AwayGoals']]=99
        assert_frame_equal(actual,build_fixture_features(changed,row.HomeTeam,row.AwayTeam,row.Date,feature_version=VERSION))
    return ['H2H sign reversal and team coordinates','Last meeting total invariant','Legacy bug reproduced',
            'Venue context formula','Corrected shared-path parity','Current/future result invariance']

def main():
    if (OUT/'evaluation.json').exists():
        raise FileExistsError('Audit already exists; use a new experiment directory for another run')
    matches=pd.read_csv(ROOT/'data/processed/matches_standardized.csv')
    matches['Date']=pd.to_datetime(matches.Date)
    tests=regression_tests(matches)
    (OUT/'test_results.json').write_text(json.dumps(dict(passed=tests,failed=[]),indent=2))
    old=generate_features(matches)
    new=generate_features(matches,feature_version=VERSION)
    new.to_csv(OUT/'features_correctness_v2.csv',index=False)
    changed={c:int((~(old[c].eq(new[c])|(old[c].isna()&new[c].isna()))).sum()) for c in old.columns}
    changed={c:n for c,n in changed.items() if n}
    split=split_by_season(new)
    assert split['train'].Date.max()<split['validation'].Date.min() and split['validation'].Date.max()<split['test'].Date.min()
    home,away,fill=fit_poisson_models(split['train'])
    bundle=dict(home_goals_model=home,away_goals_model=away,fill_values=fill.to_dict(),feature_columns=FEATURE_COLUMNS,feature_version=VERSION)
    joblib.dump(bundle,OUT/'poisson_correctness_v2.joblib')
    result={}; baseline={'2023/24':47,'2024/25':51,'2025/26':38,'test_all':89}
    frozen=pd.read_csv(ROOT/'data/processed/asof_rebuild_v1/asof_predictions.csv')
    rows=[]
    for season,f in list(pd.concat([split['validation'],split['test']]).groupby('Season'))+[('test_all',split['test'])]:
        x,_=_prepare_matrix(f,fill)
        assert_frame_equal(x,_prepare_poisson_frame(f,bundle),check_dtype=False)
        rates=np.clip(np.column_stack([home.predict(x),away.predict(x)]),.05,None)
        metric,pred=evaluate(f,rates)
        result[season]=dict(baseline_hits=baseline[season],corrected=metric,delta_hits=metric['exact_hits']-baseline[season])
        if season!='test_all':
            out=f[['Date','Season','HomeTeam','AwayTeam','HomeGoals','AwayGoals']].copy()
            out['corrected_score']=[f'{h}-{a}' for h,a in pred]
            out['expected_home_goals'],out['expected_away_goals']=rates[:,0],rates[:,1]
            rows.append(out)
    joined=pd.concat(rows,ignore_index=True)
    frozen.Date=pd.to_datetime(frozen.Date)
    joined=joined.merge(frozen[['Date','HomeTeam','AwayTeam','predicted_score']],on=['Date','HomeTeam','AwayTeam'],validate='one_to_one').rename(columns={'predicted_score':'frozen_baseline_score'})
    assert len(joined)==1140
    joined.to_csv(OUT/'prediction_comparison.csv',index=False)
    parity={}
    oldsplit=split_by_season(old)
    for name in ['catboost','xgboost']:
        meta=joblib.load(ROOT/f'models/saved_models/{name}_metadata.joblib')
        columns=meta['feature_columns']
        matrices,_=prepare_feature_matrices(oldsplit,columns)
        infer=_prepare_catboost_frame(oldsplit['validation'],columns) if name=='catboost' else _prepare_xgboost_frame(oldsplit['validation'],meta)
        different=[c for c in columns if not np.allclose(matrices['validation'][c].to_numpy(dtype=float),infer[c].to_numpy(dtype=float),equal_nan=True)]
        missing=pd.DataFrame([{c:np.nan for c in columns}])
        infer_missing=_prepare_catboost_frame(missing,columns) if name=='catboost' else _prepare_xgboost_frame(missing,meta)
        med=oldsplit['train'][columns].median(numeric_only=True)
        mismatch=[c for c in columns if pd.notna(med[c]) and med[c]!=float(infer_missing[c].iloc[0])]
        parity[name]=dict(feature_count=len(columns),categorical_used=[c for c in CATEGORICAL_COLUMNS if c in columns],
            affected_features=[c for c in changed if c in columns],odds_columns=[c for c in columns if c.startswith('market_') or c.startswith('B365')],
            validation_preprocessing_mismatch_columns=different,missing_input_mismatch_columns=mismatch,
            metadata_keys=list(meta),missing_training='train median',missing_inference='zero')
    predpath=ROOT/'data/processed/predictions_2026_2027_harddraw_v3.csv'
    pred=pd.read_csv(predpath).head(30)
    mismatch=0
    for r in pred.itertuples():
        reconstruction=scores(r.expected_home_goals,r.expected_away_goals,np.array([r.away_win,r.draw,r.home_win]))['current_reconstructed']
        mismatch+= reconstruction!=r.ensemble_predicted_score.removeprefix('="').removesuffix('"')
    provenance=dict(git='No repository found',reconstruction_mismatches_first30=int(mismatch),
        file_sha256=hashlib.sha256(predpath.read_bytes()).hexdigest(),file_mtime_ns=predpath.stat().st_mtime_ns,
        interpretation='mtime is not proof of generation version; original logic remains unknown')
    protected=json.loads((OUT/'protected_hashes.json').read_text())
    alterations=[p for p,h in protected.items() if hashlib.sha256(Path(p).read_bytes()).hexdigest()!=h]
    assert not alterations,alterations
    report=dict(feature_version=VERSION,changed_features=changed,evaluation=result,parity=parity,provenance=provenance,
                protected_files_verified=len(protected),train_rows=len(split['train']),validation_rows=len(split['validation']),test_rows=len(split['test']))
    (OUT/'evaluation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(dict(evaluation=result,changed_features=changed,parity=parity,provenance=provenance),indent=2))

if __name__=='__main__':
    main()
