# Phase 9 — high_total_discrimination_v1

## PLAIN-LANGUAGE SUMMARY

1. **AI แยกเกมที่จะมี 4+ ประตูได้ดีขึ้นไหม?** โมเดลตรวจจับที่เลือกจากฤดูกาลย้อนหลังให้ ROC-AUC **0.507** ใน 760 นัด เทียบกับ lambda รวมและความน่าจะเป็น 4+ จาก Poisson ที่ **0.491** ผลต่างเล็กและทั้งคู่ใกล้ **0.5** จึงยังแยกเกมยิงสูงได้ไม่ชัด
2. **เลือกโมเดลอย่างไร?** กำหนดหกชุดฟีเจอร์และ XGBoost แบบเดียวกันไว้ก่อน ใช้เจ็ด fold ที่ฝึกจากฤดูกาลก่อนหน้าแล้วทำนายฤดูกาลถัดไป ชุด Full ชนะ ROC-AUC รวมย้อนหลัง **0.552** จาก 2,660 นัด แล้วจึงแช่แข็งก่อนดู 760 นัด
3. **ผลสม่ำเสมอไหม?** ไม่มาก ROC-AUC ราย fold ของ Full อยู่ **0.491–0.584** และ fold ล่าสุด 2023/24 อยู่เพียง **0.491**; ช่วงตรวจ 2024/25 และ 2025/26 อยู่ **0.513** และ **0.495** ตามลำดับ
4. **กลุ่มที่โมเดลจัดว่าเสี่ยงสูงจับเกม 4+ ได้ไหม?** ใน 10% เสี่ยงสูงสุดมีเกม 4+ **24/76** (31.6%) ใกล้อัตราจริงทั้งหมด **238/760** (31.3%) และต่ำกว่าการจัดอันดับด้วย lambda ที่จับได้ **27/76**. Top 20% โมเดลจับได้ **47** เทียบ lambda **51** เกม
5. **ความน่าจะเป็นน่าเชื่อแค่ไหน?** ค่าเฉลี่ยที่โมเดลให้ **31.11%** ใกล้อัตราจริง **31.32%** แต่ความใกล้ของค่าเฉลี่ยไม่แปลว่าจัดอันดับคู่แข่งได้ดี; Brier ใน 760 นัด **0.21685** เทียบ Poisson **0.22012**
6. **ช่วยทายสกอร์ตรงได้ไหม?** Phase 9 ยังไม่ใช้คะแนนตรวจจับไปปรับสกอร์และไม่ได้ทดสอบกฎเลือกสกอร์ใหม่ จึงไม่มี Exact-score Top-1 ใหม่ที่อ้างได้ ค่าอ้างอิงเดิมยังเป็น independent **96/760**, fixed DC **99/760**, E+fixed DC **101/760**; baseline ไม่ตรงสักเกมใน **238** เกมที่ยิงจริง 4+
7. **อะไรคือข้อสรุป?** ชุด Full มีสัญญาณย้อนหลังเหนือชุด Base เล็กน้อย แต่ผล 760 นัดและการจับกลุ่มเสี่ยงสูงไม่สนับสนุนว่าแก้ปัญหาแยกคู่ยิงสูงสำเร็จ ข้อมูล 760 นัดเคยถูกตรวจหลายครั้ง จึงเป็น historical diagnostic ไม่ใช่ผลงาน prospective

คำว่า “เกมยิงสูง” หมายถึง **ประตูรวมจริง ≥4**. คะแนนตรวจจับเป็นความน่าจะเป็นของเหตุการณ์นั้น ไม่ใช่สกอร์หรืออัตราประตูของแต่ละทีม.

## Frozen design and as-of provenance

`feature_spec.json` ถูกบันทึกและ hash ก่อนฝึก fold. Target คือ `HomeGoals + AwayGoals >= 4`; ไม่มีคอลัมน์ผลจริง ประตูจริง odds หรือข้อมูลหลังแข่งใน input. ฟีเจอร์ base เจ็ดตัวมาจาก `features_correctness_v2.csv` ที่แก้ข้อผิดพลาด historical context; ใช้เฉพาะ Elo ก่อนแข่งและฟอร์มก่อนแข่ง ไม่ใช้ H2H/context รุ่นเดิม. Mismatch สองตัวเป็นผลคูณฟอร์มยิงกับฟอร์มเสียของคู่แข่งที่กำหนดไว้ก่อน. Recent สิบตัวสรุปประตูรวม, 4+, ยิงทั้งคู่, คลีนชีตและยิงไม่ได้จากห้านัดก่อนหน้าของแต่ละทีม. Venue หกตัวใช้ห้านัดก่อนหน้าที่ venue ถูกต้อง. Schedule หกตัวใช้ rest เดิมและจำนวนเกมก่อนหน้า 7/14 วันจาก Phase 7.

ตัวสร้างประวัติอ่านทุกคู่ในวันเดียวกัน **ก่อน** ใส่ผลของวันนั้น จึงมี source date น้อยกว่า fixture date เสมอ. `asof_spot_checks.json`, `feature_integrity.csv` และ `feature_missingness.csv` ระบุวันที่ต้นทาง, สูตร, หน้าต่างและช่องว่าง. Fold แต่ละชุดใช้ค่ามัธยฐานจาก training ของ fold นั้น; ใช้ศูนย์เฉพาะเมื่อคอลัมน์ training หายทั้งหมด. การทดสอบเปลี่ยนประตู/ผลของเกมปัจจุบันและอนาคตยืนยันว่าฟีเจอร์ของเกมปัจจุบันไม่เปลี่ยน. ฟีเจอร์ historical ที่อ่านจาก correctness_v2 เป็นข้อมูลสร้างย้อนหลัง ไม่ใช่ snapshot ที่เก็บก่อน kickoff จริง.

XGBoost ใช้ `binary:logistic`, 180 trees, depth 4, learning rate .05, subsample และ column subsample .9, L2=5, seed 42, histogram method. ไม่มี early stopping, class weights, post-hoc calibration หรือ threshold. Probabilities เป็น raw `predict_proba`. หก variants ได้แก่ Base, Base+Mismatch, Base+Recent, Base+Venue, Base+Schedule และ Full ทุกชุดถูกกำหนดก่อนประเมิน; Full ใช้ทุกครอบครัว.

## Walk-forward selection before the inspected diagnostic

ฝึกใหม่เจ็ดครั้งต่อ variant: validation seasons **2017/18–2023/24**, training มีเฉพาะ seasons ก่อน validation และวันที่ training ล่าสุดต้องน้อยกว่าวัน validation แรก. รวม OOF **2,660 นัด**, high **851**. จำนวนเกมใน source ไม่เท่ากันทุก fold: 2019/20 มี **314**, 2020/21 มี **446**; ไม่ตัดหรือเติมเกมย้อนหลังเพื่อทำให้ denominator สวยขึ้น. ปี 2023/24 ใช้สำหรับ fold walk-forward ของ detector โดยไม่มี early stopping; frozen Phase-3 goal-rate model เดิมใช้ปีนั้นสำหรับ early stopping จึงไม่เป็นตัวอ้างอิง OOF ที่สะอาด.

| Variant | Pooled OOF ROC-AUC | AP | Log loss | Mean fold AUC |
|---|---:|---:|---:|---:|
| Base | .5383 | .3591 | .6297 | .5391 |
| Mismatch | .5443 | .3619 | .6283 | .5440 |
| Recent | .5399 | .3681 | .6278 | .5390 |
| Venue | .5487 | .3618 | .6278 | .5491 |
| Schedule | .5457 | .3680 | .6272 | .5437 |
| **Full** | **.5518** | **.3700** | **.6258** | .5481 |

กฎที่แช่แข็งเลือก pooled ROC-AUC สูงสุดก่อน ตามด้วย AP, log loss และ Brier เมื่อเสมอ; จึงได้ Full. Fold AUC ของ Full ตามลำดับคือ **.539, .539, .582, .557, .584, .546, .491**. ความไม่สม่ำเสมอ โดยเฉพาะ fold ล่าสุด แสดงความเสี่ยงที่สัญญาณย้อนหลังไม่คงอยู่. `selection_freeze.json` เก็บชุดฟีเจอร์, metrics และ hash ของ OOF ก่อน final training หรือ diagnostic. ไม่มีการเลือก family/hyperparameter โดยอาศัยผล 760 นัด.

ไม่มี frozen Phase-3 lambda หรือ Poisson probability สำหรับ OOF ทุก fold แบบ walk-forward. การสร้าง reference ด้วย goal-rate model ที่เห็น validation target หรือการนำค่าใน 760 นัดกลับไปใช้กับปีเก่าจะไม่ใช่การเปรียบเทียบอย่างยุติธรรม จึงรายงาน reference เฉพาะ 760 diagnostic และไม่สร้าง OOF baseline เทียม.

## Final frozen training and 760-match diagnostic

โมเดล Full สุดท้ายฝึกกับ **ทุกเกมก่อน 2024/25** รวม 2023/24; ค่าทดแทน, feature order และ model hash ถูกเก็บใน `final_metadata.json` และ `training_manifest.json` ก่อนขั้น diagnostic. ไม่มีผล 2024/25–2025/26 ในการฝึก, เติม missing, calibration, threshold หรือเลือกโมเดล. Frozen Phase-3/4 scoreline ถูกตรวจ match by match อีกครั้งก่อน evaluation.

| Historical 760 source | ROC-AUC | AP | Log loss | Brier |
|---|---:|---:|---:|---:|
| **Phase-9 Full detector** | **.50735** | **.33558** | **.62572** | **.21685** |
| Frozen Phase-3 Poisson P(total≥4) | .49056 | .32426 | .63333 | .22012 |
| Frozen Phase-3 lambda total | .49056 | .32426 | — | — |

Lambda total เป็นคะแนนจัดอันดับ ไม่ใช่ความน่าจะเป็น จึงไม่คำนวณ log loss/Brier ให้มัน. Poisson P(4+) เป็นฟังก์ชันเพิ่มทางเดียวของ lambda total จึงมี AUC/AP เท่ากัน. AUC ต่างเพียง **.01679** ระหว่าง detector กับ reference และ detector ยังใกล้สุ่มมาก; การรายงานเป็น historical comparison ไม่ใช่ข้ออ้างว่าดีขึ้นในอนาคต. รายฤดูกาล detector **.51317** (2024/25, high 130/380) และ **.49462** (2025/26, high 108/380); Poisson **.50862** และ **.46116**. ความใกล้สุ่มในปีหลังเป็นข้อจำกัดสำคัญ.

Calibration แบบขอบ probability 0.0–1.0 ช่วงละ .1 อยู่ใน `calibration_bins.csv`; equal-count risk deciles อยู่ใน `risk_deciles.csv`. Decile สูงสุดมี high **24/76**, ต่ำสุด **18/76**, แต่ decile 4 และ 7 มี **27/76** ทำให้ high rate ไม่เพิ่มลงตาม risk อย่างเรียบ. Top 10/20/30/50% capture ทั้ง detector และ lambda อยู่ใน `top_risk_capture.csv`: detector **24/47/71/120** high matches เทียบ lambda **27/51/70/111**. ข้อได้เปรียบ AUC รวมไม่ได้แปลว่าดีกว่าที่ top-risk 10–20% ซึ่งสำคัญกับการคัดคู่ยิงสูง. ไม่ใช้ decile หรือ cutoff ใดสร้าง prediction rule.

Risk detector มี Pearson correlation กับ lambda total **.426** และ Spearman **.376**; มีความแตกต่างของอันดับจริง แต่ความต่างนั้นไม่ได้สร้างกลุ่ม top-risk ที่แม่นยำใน test. `detector_lambda_disagreements.csv` ให้คู่ที่ top quartile ของคะแนนหนึ่งและ bottom quartile ของอีกคะแนนพร้อมผลจริง; เป็นตัวอย่าง diagnostic เท่านั้น. `feature_importance.csv` แสดง split gain โดย EloDiffPre, HomeEloPre, AwayEloPre และ AwayVenueTotalMean5 ติดอันดับต้น ๆ; importance ไม่ใช่หลักฐานเชิงเหตุหรือความแม่นยำ. กลุ่มทีมที่อนุมานว่าเพิ่งเข้าลีกจาก season team sets คือ Ipswich/Leicester/Southampton และ Burnley/Leeds/Sunderland; ทั้งสองปีมี 108 fixtures ที่เกี่ยวข้อง. `promoted_team_diagnostic.csv` เป็น post-test description และไม่ได้ใช้เลือกโมเดล.

## Score-model boundaries, tests and verdict

Phase 9 เป็น **detector-only**. ไม่ปรับ Phase-3 lambdas, independent/DC matrices, rho, score probabilities, Top-1, หรือ deployment outputs. Reference exact hits ยังคง **96 independent, 99 fixed DC, 101 E+fixed DC** จาก 760 นัด. ไม่มี Exact-score improvement ที่พิสูจน์ได้จาก detector นี้ เพราะยังไม่มี pre-registered วิธีเชื่อม risk เข้ากับ score distribution. Baseline independent มี high exact hits **0/238** เหมือน Phase 8.

ชุดทดสอบที่เกี่ยวข้องผ่าน **40 tests**. การตรวจครอบคลุม whole-date as-of, current/future-result mutation, OOF fold chronology, probabilities, frozen feature order/fills/model hashes, ไม่มี target เป็น feature, fixture lineage, protected Phase-3–8 hashes และ baseline 96/99 reproduction. `data_manifest.json`, `feature_spec.json`, `selection_freeze.json`, `training_manifest.json` และ per-fixture predictions รองรับการตรวจซ้ำ; artifact เก่าไม่ถูกแก้.

**Verdict: weak historical signal, no validated high-total discrimination gain.** Full มี OOF AUC .552 แต่ diagnostic AUC .507, ปีหลัง .495, และ top 10–20% จับ high matches น้อยกว่า lambda. Detector มีค่า probability เฉลี่ยใกล้อัตราเกิดจริง แต่ไม่รู้ชัดว่าคู่ไหนจะยิงสูง. ข้อมูล 760 นัดเคยถูกตรวจซ้ำ จึงต้องแช่แข็งและทำนายคู่ใหม่ก่อน kickoff เพื่อทดสอบความคงอยู่ของสัญญาณ; Phase 9 หยุดที่ detector audit นี้ และไม่มี Phase 10 score correction.
