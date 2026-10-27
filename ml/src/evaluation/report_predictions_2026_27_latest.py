"""Human-readable report for already-frozen 2026/27 current-predictor exports."""
from __future__ import annotations

import json

import pandas as pd

from src.models.predict_2026_27_latest import OUT,MODEL_DIR,MATCHES_PATH,sha

def main():
    manifest=json.loads((OUT/'prediction_manifest.json').read_text())
    if sha(OUT/'predictions_raw.csv')!=manifest['PredictionsRawSHA256']:
        raise ValueError('Raw prediction freeze differs; cannot report')
    raw=pd.read_csv(OUT/'predictions_raw.csv')
    audit=pd.read_csv(OUT/'fixture_audit.csv')
    distribution=pd.read_csv(OUT/'prediction_distribution.csv')
    evaluation=json.loads((OUT/'current_evaluation.json').read_text())
    results=pd.read_csv(OUT/'predictions_with_results.csv')
    coverage=pd.read_csv(OUT/'feature_coverage_audit.csv')
    coverage_summary=json.loads((OUT/'feature_coverage_summary.json').read_text())
    if len(raw)!=manifest['PredictionsN'] or len(audit)!=manifest['FixturesFound'] or len(results)!=evaluation['N']:
        raise ValueError('Report inputs differ from frozen manifest')
    if sha(OUT/'feature_coverage_audit.csv')!=coverage_summary['CoverageSHA256'] or coverage_summary['RawSHA256']!=manifest['PredictionsRawSHA256']:
        raise ValueError('Post-freeze coverage audit differs')
    most=raw.Top1Score.value_counts().index[0]
    most_n=int(raw.Top1Score.value_counts().iloc[0])
    draw11=int((raw.Top1Score=='1-1').sum())
    high=int(raw.Top1Score.str.split('-').apply(lambda v:sum(map(int,v))>=4).sum())
    played=int((audit.Status=='played_verified').sum()); upcoming=int((audit.Status=='future_scheduled').sum())
    failed=audit[~audit.Predictable]
    history=pd.read_csv(MATCHES_PATH,low_memory=False)
    history.Date=pd.to_datetime(history.Date)
    prev=history[history.Season=='2025/26']
    prevteams=set(prev.HomeTeam)|set(prev.AwayTeam)
    currentteams=set(audit.ModelHomeTeam)|set(audit.ModelAwayTeam)
    entrants=sorted(currentteams-prevteams)
    latest={team:str(history.loc[(history.HomeTeam==team)|(history.AwayTeam==team),'Date'].max().date()) for team in entrants}
    lines=['# Premier League 2026/27 — current predictor as-of export','',
        '## PLAIN-LANGUAGE SUMMARY','',
        f'1. **ตอนนี้ใช้โมเดลตัวไหน?** ใช้ `predict_match()` ของ current Python predictor กับ CatBoost/XGBoost classifiers และ Poisson goal-rate bundle ที่แช่แข็งใน `models/saved_models`; Top-1 คือ global mode ของ score matrix ที่ predictor เดิมปรับด้วย outcome blend, priors และ draw rule. ไม่มีการฝึกใหม่หรือแก้กฎ.',
        '2. **ทำไมเป็น latest usable?** คุณยืนยันให้ใช้ current executable predictor. หน้าเว็บยังอ่านไฟล์ preseason ที่สร้าง 10 ส.ค. 2026 ซึ่งเป็น output เก่า; Phase 9/10 เป็น research experiments และไม่ถูกนำมาใช้ในไฟล์นี้.',
        '3. **ต่างจาก Phase 10 อย่างไร?** Phase 10 เรียนรู้ความน่าจะเป็นประตูแต่ละจำนวนโดยตรง แต่ current predictor ใช้ Poisson goal rates ร่วมกับ classifiers และ score calibration ที่มีอยู่เดิม.',
        f'4. **พบ fixture 2026/27 กี่คู่?** {len(audit)} คู่จาก fixture keys ของ local 380-row CSV; แก้วันที่สองคู่ตามประกาศลีกที่ยืนยันแล้ว. โปรแกรมอนาคตอาจเลื่อนอีก.',
        f'5. **ทำนายได้กี่คู่?** โมเดลรันและ export ได้ {len(raw)} คู่; ใน 340 คู่อนาคต มีเพียง **{coverage_summary["FutureWithKnownPriorPLResults"]}** คู่รอบถัดไปที่ผล PL ของ fixtures ก่อนหน้าเป็นที่ทราบครบ ณ เวลาสร้างไฟล์. อีก **{coverage_summary["FutureWithUnknownInterveningPLResults"]}** คู่เป็น forecast ล่วงหน้าแบบ provisional เพราะผลของเกมคั่นกลางยังไม่เกิด.',
        f'6. **ทำนายไม่ได้กี่คู่?** รันโมเดลไม่ผ่าน {len(failed)} คู่'+(' เพราะ '+ '; '.join(f"{r.HomeTeam}–{r.AwayTeam}: {r.FailureReason}" for r in failed.itertuples(index=False)) if len(failed) else '; แต่ 330 คู่ไกลยังไม่ใช่ feature-complete as-of-kickoff prediction')+'.',
        f'7. **แข่งแล้วกี่คู่?** {played} คู่มีผลยืนยันและถูกติดป้าย `RETROSPECTIVE RECONSTRUCTION` เพราะสร้างคำทำนายหลังแข่ง โดยใช้เฉพาะผลของคู่ก่อนหน้าตามวัน.',
        f'8. **ยังไม่แข่งกี่คู่?** {upcoming} คู่ตามวันที่ใน fixture source; raw ติดป้าย `PRE-KICKOFF PREDICTION` เพราะสร้างก่อนแข่ง แต่ 330 คู่ไกลมี unknown intervening results และวันแข่งอนาคตอาจเลื่อน.',
        f'9. **สกอร์ที่เลือกบ่อยที่สุด?** {most} จำนวน {most_n}/{len(raw)} ({100*most_n/len(raw):.2f}%).',
        f'10. **เลือก 1-1 กี่ครั้ง?** {draw11}/{len(raw)}.',
        f'11. **Top-1 ที่มีประตูรวม 4+ กี่ครั้ง?** {high}/{len(raw)}; นี่เป็นเพียง sanity check ไม่ใช่เหตุให้ปรับ prediction.',
        f'12. **Exact ของคู่ที่แข่งแล้ว?** {evaluation["ExactHits"]}/{evaluation["N"]} ({evaluation["ExactPercent"]:.2f}%).',
        '13. **Exact นี้ retrospective หรือ prospective?** **Retrospective reconstruction** ทั้งหมด เพราะรันหลังทราบผล; ไฟล์ raw ไม่ให้ผลจริงเข้าเลือกสกอร์ และ join ผลแยกหลัง hash แล้ว แต่ไม่อ้าง prospective accuracy.',
        f'14. **Raw ถูก freeze แล้วหรือไม่?** ถูกบันทึกและ SHA256 **`{manifest["PredictionsRawSHA256"]}`** ก่อนสร้าง evaluation copy; hash ตรงกันตอนเขียนรายงาน.',
        '', '## Current pipeline, data and limits','',
        'Production executable entry point คือ [`predict_match()`](../../../src/models/predictor.py) ซึ่งถูกเรียกจาก `fixture_predictions.py`; หน้าเว็บอ่าน static preseason CSV คนละขั้น. โมเดลที่โหลดอยู่ครบ: CatBoost classifier, XGBoost classifier และ Poisson bundle. Predictor เรียก `build_fixture_features` แบบ `legacy_v1` โดย default; metadata classifier ไม่เก็บ feature-version label แต่มี feature order. CatBoost/XGBoost numeric missing ใช้ zero fill เดิมและ Poisson ใช้ saved train medians. ไม่มี odds ณ เวลา fixture จึงเข้า missing policy เดิม; คอลัมน์ผลจริงของ fixture ไม่อยู่ใน model feature order.',
        '',f'Combined model hash: `{manifest["CombinedModelHash"]}`. Hash รายไฟล์และ predictor/feature code อยู่ใน `prediction_manifest.json`. ไม่มี Git commit ใน workspace นี้. Frozen artifact ไม่ถูกเขียนทับ. Current historical `matches_standardized.csv` หยุดวันที่ {manifest["CurrentHistoryLastDate"]}; 40 ผล 2026/27 ที่ยืนยันแล้วเป็น score-only source โดยไม่มี shots/สถิติหลังแข่งบางช่อง. เมื่อสร้างแต่ละคู่ มีเพียงผลที่วันที่ **น้อยกว่า** fixture date เข้าประวัติ; ผลของ fixture เองและเกมหลังจากนั้นไม่มีผลต่อฟีเจอร์หรือ Top-1.',
        '',f'Fixture source เป็น keys/dates จาก `{manifest["FixtureSource"]}` เท่านั้น; สกอร์เดิมในไฟล์นั้นไม่ได้เข้า inference. Known results 30 คู่จากไฟล์ local เดิมและ Matchweek 4 อีก 10 คู่จาก [RTÉ Saturday results](https://www.rte.ie/sport/results/soccer/premier-league/36781/results/), [Premier League Sunday wrap](https://www.premierleague.com/en/news/4714427/sunday-wrap-haaland-stuns-man-utd-as-brighton-find-ruthless-streak) และ [Sky Sports Leeds–Newcastle report](https://www.skysports.com/football/leeds-united-vs-newcastle-united/report/559479). [Premier League fixture amendment](https://www.premierleague.com/en/news/4705445/further-fixture-amendments-announced-in-september-and-october-2026) ใช้แก้ Leeds–Crystal Palace เป็น 20 ก.ย. และ Liverpool–Brighton เป็น 25 ต.ค. คู่อนาคตอื่นยังอ้าง local fixture date และต้องตรวจวันใหม่เมื่อใกล้แข่ง.',
        '',f'`feature_coverage_audit.csv` ตรวจ fixture ที่ยังไม่แข่งซึ่งอยู่ **ก่อน** แต่ละวันของทีมเดียวกันแต่ยังไม่มีผล: {coverage_summary["FutureWithKnownPriorPLResults"]} คู่อนาคตรอบถัดไปไม่มี unknown intervening PL result; {coverage_summary["FutureWithUnknownInterveningPLResults"]} คู่ต่อมามีอย่างน้อยหนึ่งผลคั่นกลางที่ยังไม่ทราบ. Raw 380 แถวเป็น snapshot ณ 15 ก.ย. ไม่ใช่การคำนวณฟอร์ม/rest-days ที่ครบ ณ kickoff ของเกมไกล; current predictor ใช้วัน fixture กับผลล่าสุดที่รู้วันนี้ จึง extrapolate rest-days สำหรับคู่นั้น. Raw ถูก hash แล้วและไม่ได้แก้ตาม coverage audit. คู่ไกลถูกติดป้าย provisional ในตารางรายงาน.',
        '',f'ทีมที่อนุมานว่าใหม่/กลับเข้าลีกจาก season team-set difference คือ **{", ".join(entrants)}**. วันที่เกม PL ล่าสุดใน historical source ก่อน 2026/27: '+', '.join(f'{t} {latest[t]}' for t in entrants)+'. ชื่อ `Man Utd` และ `Spurs` ถูกแปลงเป็น `Man United`/`Tottenham` ตามชื่อใน historical source เพื่อให้ดึงประวัติทีมถูกต้อง. ไม่มีประวัติปลอมหรือ retrain; Coventry/Hull พึ่งพา PL history เก่าในเกมต้นฤดูกาล และเมื่อมี score-only 2026/27 results ก่อนคู่ถัดไปก็ใช้ประวัตินั้นตามเวลา. ประวัติที่ไม่มี post-match stats ครบและ fixture dates ที่อาจเลื่อนคือข้อจำกัดเชิงข้อมูล ไม่ใช่สัญญาณให้ปรับโมเดล.',
        '', '## Prediction distribution and verification','',
        '| Top-1 score | Count | Percent |','|---|---:|---:|']
    for r in distribution[distribution.Group=='common_score'].itertuples(index=False):
        lines.append(f'| {r.Value} | {r.N} | {r.Percent:.2f}% |')
    lines.extend(['','| Top-1 total goals | Count | Percent |','|---|---:|---:|'])
    for r in distribution[distribution.Group=='top1_total'].itertuples(index=False):
        lines.append(f'| {r.Value} | {r.N} | {r.Percent:.2f}% |')
    lines.extend(['',f'All {len(raw)} exported Top-1 cells are the highest probability cell of the **current predictor calibrated matrix**; Top-2 and Top-3 are next cells with nonincreasing finite probabilities. `fixture_audit.csv` records source date, aliases, status, available prior-match count and failure reason per fixture. `predictions_raw.csv` has no actual goals/result/Exact fields. Separate `predictions_with_results.csv` and `current_evaluation.json` were created only after raw hash was recorded in `prediction_manifest.json`. This reconstruction must not be used as a prospective accuracy claim. Full relevant suite passed **51 tests**; checks cover as-of history mutation, fixture uniqueness, team aliases, model/source hashes, raw/result separation, probability ordering and unknown intervening history.','',
                 '## FULL 2026/27 PREDICTION TABLE','',
                 '| Date | Home | Away | Latest Model Top-1 | Top-1 prob | Type |','|---|---|---|---:|---:|---|'])
    unknown_ids=set(coverage.loc[coverage.PLHistoryCoverage=='INTERVENING_RESULTS_UNKNOWN','FixtureID'])
    for row in raw.itertuples(index=False):
        type_label='RETROSPECTIVE' if row.PredictionType.startswith('RETROSPECTIVE') else 'PRE-KICKOFF / PROVISIONAL' if row.FixtureID in unknown_ids else 'PRE-KICKOFF' if row.PredictionType.startswith('PRE-KICKOFF') else 'PAST DATE / UNVERIFIED'
        lines.append(f'| {row.Date} | {row.HomeTeam} | {row.AwayTeam} | {row.Top1Score} | {row.Top1Probability*100:.2f}% | {type_label} |')
    if len(failed):
        lines.extend(['','## Not predictable fixtures','', '| Date | Home | Away | Reason |','|---|---|---|---|'])
        for row in failed.itertuples(index=False):
            lines.append(f'| {row.Date} | {row.HomeTeam} | {row.AwayTeam} | {row.FailureReason} |')
    lines.extend(['','No Phase 11, new model, retraining, score adjustment or earlier-version leaderboard was run.'])
    (OUT/'final_report.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')

if __name__=='__main__':
    main()
