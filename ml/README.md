# ml/ — ระบบ AI ทำนายผลพรีเมียร์ลีก

โค้ด ข้อมูล และแบบจำลองที่ย้ายมาจากโปรเจกต์ ai-score (ทำงานบน CPU ได้ทั้งหมด)
ผู้ดูแลระบบสั่งงานผ่านหน้าแอดมิน `/admin/ai` โดยมี `prediction-service/` (127.0.0.1:8000) เป็นตัวกลาง

| โฟลเดอร์ | เนื้อหา |
|---|---|
| `src/` | โค้ด: ทำความสะอาดข้อมูล ฟีเจอร์ ฝึก ประเมิน และ `models/weekly_refresh.py` (อัปเดตผลรายสัปดาห์) |
| `models/saved_models/` | แบบจำลองที่ฝึกแล้ว และ `model_report.json` (ผลประเมินทุกแบบจำลอง) |
| `data/raw/` | ไฟล์ผลการแข่งขันรายฤดูกาล (`uploads/` = ไฟล์ที่อัปโหลดเพิ่มจากหน้าแอดมิน) |
| `data/processed/weekly/` | ผลทำนายทุกรอบสัปดาห์ (ไม่เขียนทับ) |
| `tests/` | ชุดทดสอบ (`72 passed, 6 xfailed`) |
| `logs/` | ประวัติงานที่สั่งจากหน้าแอดมิน (`jobs.json`) — ไม่อยู่ใน git |

## ติดตั้งบนเครื่อง Windows (เช่น VM คณะ)

1. ติดตั้ง Python 3.11 (ติ๊ก "Add python.exe to PATH")
2. ดับเบิลคลิก `scripts\vm\setup-ml.bat` — สร้าง `ml\.venv` ลงไลบรารี และรันเทสต์ (ครั้งเดียว)
3. เปิดเว็บตามปกติ (`npm run build` แล้ว start)
4. ดับเบิลคลิก `scripts\vm\start-prediction-service.bat` — ต้องเปิดค้างไว้
5. (ทางเลือก) ตั้ง Task Scheduler ให้รัน `scripts\vm\weekly-predict.bat` ทุกสัปดาห์:
   ```
   schtasks /Create /TN "FootballAI Weekly Prediction" /TR "<โฟลเดอร์เว็บ>\scripts\vm\weekly-predict.bat" /SC WEEKLY /D MON /ST 06:00
   ```
   ผลการรันอยู่ที่ `ml\logs\weekly-task.log`

ค่าที่ตั้งได้ (ไม่ตั้งก็ใช้ค่าเริ่มต้น): `PREDICTION_SERVICE_URL` (เว็บ, ค่าเริ่มต้น `http://127.0.0.1:8000`),
`PREDICTION_FIXTURES_API_URL` (API ตารางแข่งของเว็บ, ไฟล์ .bat ตั้งเป็นพอร์ต 80 ให้แล้ว)

## คำสั่ง

```
npm run predict:weekly                                   # อัปเดตผลทำนายและเผยแพร่ขึ้นเว็บ (เว็บต้องเปิดอยู่)
ml\.venv\Scripts\python.exe -m src.pipeline.train_job    # ฝึกใหม่ + ประเมิน (รันในโฟลเดอร์ ml)
ml\.venv\Scripts\python.exe -m src.evaluation.model_report
ml\.venv\Scripts\python.exe -m pytest tests -q
```
