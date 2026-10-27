"""Regression checks for shared pre-match features; no artifact overwrites."""
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))
import numpy as np
import pandas as pd
from pandas.testing import assert_frame_equal
from src.features.feature_engineering import generate_features, build_fixture_features
from src.models.model_utils import get_feature_columns

def main():
    matches=pd.read_csv(ROOT/'data/processed/matches_standardized.csv').head(100)
    matches['Date']=pd.to_datetime(matches.Date)
    # Remove odds in both paths: fixture API has no odds input.
    matches[['B365H','B365D','B365A']]=np.nan
    train=generate_features(matches)
    columns=get_feature_columns(train)
    for index in [0,20,70,99]:
        row=train.iloc[index]
        actual=build_fixture_features(matches,row.HomeTeam,row.AwayTeam,row.Date)
        expected=train.iloc[[index]].reset_index(drop=True)
        assert_frame_equal(actual[columns],expected[columns],check_dtype=False,atol=1e-10,rtol=1e-10)
        changed=matches.copy()
        mask=changed.Date>=row.Date
        changed.loc[mask,['HomeGoals','AwayGoals']]=50
        changed.loc[mask,'Result']='H'
        after=build_fixture_features(changed,row.HomeTeam,row.AwayTeam,row.Date)
        assert_frame_equal(actual,after)
    unknown=build_fixture_features(matches,'New Team A','New Team B',pd.Timestamp('1994-08-01'))
    assert unknown.HomeEloPre.iloc[0]==1500
    assert unknown.HomeMatchesPlayedPre.iloc[0]==0
    # Unsorted input must produce identical chronological training features.
    assert_frame_equal(generate_features(matches.sample(frac=1,random_state=42)),train)
    duplicate=pd.concat([matches,matches.iloc[[0]]],ignore_index=True)
    try:
        generate_features(duplicate)
    except ValueError:
        pass
    else:
        raise AssertionError('Duplicate same-day team appearance accepted')
    print('PASS: training/inference parity, current/future-result invariance, unseen teams, sorting, duplicate guard')

if __name__=='__main__':
    main()
