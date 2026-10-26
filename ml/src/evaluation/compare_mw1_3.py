"""Compare frozen harddraw_v3 predictions with sourced MW1-3 final results.

Run from any directory: python src/evaluation/compare_mw1_3.py
No training or prediction regeneration is performed.
"""
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'data/processed'
PREDICTIONS = DATA / 'predictions_2026_2027_harddraw_v3.csv'
SOURCES = [
    'https://fixturedownload.com/results/epl-2026',
    'https://insights.betfred.com/football/competitions/england/premier-league/results/',
    'https://www.oddscalendar.com/football/england/premier-league/results',
]

def read(path):
    with path.open(encoding='utf-8-sig', newline='') as handle:
        return list(csv.DictReader(handle))

def key(row):
    return tuple(row[c] for c in ('fixture_date', 'home_team', 'away_team'))

def clean(score):
    return score.removeprefix('="').removesuffix('"')

def outcome(score):
    home, away = map(int, score.split('-'))
    return 'H' if home > away else 'A' if away > home else 'D'

def main():
    predictions = read(PREDICTIONS)
    lookup = {key(row): row for row in predictions}
    assert len(lookup) == len(predictions), 'Duplicate prediction keys'
    actuals = read(DATA / 'actual_results_2026_2027_mw1_3.csv')
    assert len(actuals) == len({key(row) for row in actuals}) == 30
    assert Counter(r['round'] for r in actuals) == {'1': 10, '2': 10, '3': 10}
    rows = []
    models = ('catboost', 'xgboost', 'poisson', 'ensemble')
    for actual in actuals:
        pred = lookup[key(actual)]  # Exact date/home/away join; unmatched rows fail.
        row = dict(actual, actual_result=outcome(actual['actual_score']))
        row['source_url'] = SOURCES[0]
        for model in models:
            result = pred['predicted_result' if model == 'ensemble' else model + '_predicted_result']
            score = clean(pred[model + '_predicted_score'])
            assert outcome(score) == result
            row[model + '_score'] = score
            row[model + '_result'] = result
            row[model + '_outcome_correct'] = result == row['actual_result']
            row[model + '_exact_correct'] = score == row['actual_score']
        row['probability_argmax_result'] = max(('H', 'D', 'A'), key=lambda x: float(pred[{'H': 'home_win', 'D': 'draw', 'A': 'away_win'}[x]]))
        row['top3_hit'] = actual['actual_score'] in [clean(s) for s in pred['top_scores'].split('|')]
        rows.append(row)

    def summarize(subset, model):
        n = len(subset)
        correct = sum(r[model + '_outcome_correct'] for r in subset)
        exact = sum(r[model + '_exact_correct'] for r in subset)
        draws = sum(r['actual_result'] == 'D' for r in subset)
        draw_hits = sum(r['actual_result'] == r[model + '_result'] == 'D' for r in subset)
        predicted_draws = sum(r[model + '_result'] == 'D' for r in subset)
        return dict(matches=n, outcome_correct=correct, outcome_accuracy=correct/n,
                    exact_correct=exact, exact_accuracy=exact/n,
                    actual_draws=draws, draw_hits=draw_hits, missed_draws=draws-draw_hits,
                    predicted_draws=predicted_draws, false_draws=predicted_draws-draw_hits,
                    correct_outcome_wrong_score=correct-exact,
                    predicted_score_distribution=dict(Counter(r[model + '_score'] for r in subset)))

    report = dict(prediction_file=str(PREDICTIONS.relative_to(ROOT)),
        prediction_sha256=hashlib.sha256(PREDICTIONS.read_bytes()).hexdigest(),
        sources=SOURCES, accessed_date='2026-09-13',
        source_notes='All 30 results transcribed from Fixture Download; MW1-2 and Ipswich-Liverpool cross-checked with Betfred; Hull-Villa, Everton-Man Utd and Arsenal-Chelsea cross-checked with OddsCalendar. Other six MW3 matches have one source.',
        scope='Completed matchweeks 1-3 only, 2026-08-21 through 2026-09-06; MW4 excluded.',
        models={m: summarize(rows,m) for m in models},
        weekly={str(w): {m: summarize([r for r in rows if r['round']==str(w)],m) for m in models} for w in (1,2,3)},
        ensemble_top3_hits=sum(r['top3_hit'] for r in rows),
        probability_argmax_correct=sum(r['probability_argmax_result']==r['actual_result'] for r in rows),
        actual_outcomes=dict(Counter(r['actual_result'] for r in rows)),
        changed_from_argmax=[{k:r[k] for k in ('home_team','away_team','actual_result','ensemble_result','probability_argmax_result')} for r in rows if r['ensemble_result']!=r['probability_argmax_result']])
    with (DATA / 'comparison_harddraw_v3_mw1_3.csv').open('w', encoding='utf-8-sig', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    (DATA / 'comparison_harddraw_v3_mw1_3.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2))

if __name__ == '__main__':
    main()
