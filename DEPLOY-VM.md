# ติดตั้ง FootballAI บน VM ของมหาวิทยาลัย (Windows)

คู่มือนี้ใช้กับ VM ที่เข้าผ่าน Remote Desktop ที่ `10.198.200.123` เมื่อติดตั้งเสร็จ ผู้ใช้ในเครือข่าย มข. (kku-wifi / VPN) เปิดเว็บได้ที่ **http://10.198.200.123** โดยไม่ต้องใส่พอร์ต

> ทุกคำสั่งรันใน **PowerShell บน VM** คำสั่งที่มีคำว่า *(ผู้ดูแล)* ต้องเปิด PowerShell ด้วย "Run as administrator"

---

## 0. ตรวจ VM ก่อนเริ่ม

```powershell
ipconfig                                            # ยืนยันว่า IP คือ 10.198.200.123
(Invoke-WebRequest https://ifconfig.me -UseBasicParsing).Content   # IP สาธารณะ (ใช้ในขั้นที่ 4)
Invoke-WebRequest https://developer.easyslip.com -UseBasicParsing -Method Head | Select-Object StatusCode
Get-CimInstance Win32_ComputerSystem | Select-Object TotalPhysicalMemory
nvidia-smi                                          # มี GPU NVIDIA หรือไม่ (ใช้ในขั้นที่ 9)
```

- ถ้าคำสั่ง `ifconfig.me` / `easyslip` error แปลว่า VM ออกอินเทอร์เน็ตไม่ได้ ต้องให้ฝ่ายไอทีเปิดก่อน เพราะเว็บต้องเรียก MongoDB Atlas, EasySlip, Cloudinary, GNews และ AllSportsAPI
- ต้องมีสิทธิ์ผู้ดูแล (administrator) บน VM สำหรับขั้นที่ 1, 6 และ 7

## 1. ติดตั้งโปรแกรม *(ผู้ดูแล)*

ติดตั้ง 2 โปรแกรมนี้ (กด Next ตามค่าเริ่มต้นได้เลย):

| โปรแกรม | ดาวน์โหลด | หมายเหตุ |
|---|---|---|
| Node.js **20 LTS** | https://nodejs.org/en/download | เวอร์ชันเดียวกับเครื่องพัฒนา (v20.16) |
| Git for Windows | https://git-scm.com/download/win | |

ปิดแล้วเปิด PowerShell ใหม่ แล้วตรวจ:

```powershell
node -v    # ต้องเป็น v20.x
git --version
```

## 2. ดึงโค้ด

```powershell
git clone https://github.com/boonchanon/footballaI.git C:\footballai
cd C:\footballai
```

repo เป็น private: ตอนแรก Git จะเปิดหน้าต่างให้ล็อกอิน GitHub ให้ล็อกอินด้วยบัญชี `boonchanon`

## 3. คัดลอกไฟล์ที่ไม่ได้อยู่ใน git จากเครื่องพัฒนา

คัดลอกผ่าน Remote Desktop (copy จากเครื่องตัวเองแล้ว paste ใน VM) ไปไว้ใน `C:\footballai`:

| จากเครื่องพัฒนา | ไปที่ VM | คืออะไร |
|---|---|---|
| `.env.local` | `C:\footballai\.env.production.local` | ค่าตั้งค่าและรหัสลับ (เปลี่ยนชื่อไฟล์ด้วย) |
| `public\uploads\` | `C:\footballai\public\uploads\` | รูปที่ผู้ใช้อัปโหลดและเก็บในเครื่อง |
| `storage\` | `C:\footballai\storage\` | ไฟล์รอตรวจของระบบคัดกรองเนื้อหา |

> `.env.production.local` มีรหัสผ่านฐานข้อมูลและ API key ห้ามส่งในแชตหรือ commit ขึ้น git

แก้ค่าเหล่านี้ใน `C:\footballai\.env.production.local`:

```env
NEXT_PUBLIC_APP_URL=http://10.198.200.123
# ชื่อบัญชีรับเงินตามที่ขึ้นในสลิป (ชื่อจริง ไม่มีคำนำหน้า) และเลขพร้อมเพย์
PROMPTPAY_NAME=ชื่อจริง
NEXT_PUBLIC_PROMPTPAY_NAME=ชื่อจริง
PROMPTPAY_ID=08xxxxxxxx
NEXT_PUBLIC_PROMPTPAY_ID=08xxxxxxxx
# บริการวิเคราะห์วิดีโอ ดูขั้นที่ 9
VIDEO_ANALYSIS_API_BASE_URL=http://127.0.0.1:8001
```

## 4. อนุญาต VM ใน MongoDB Atlas

เข้า https://cloud.mongodb.com → โปรเจกต์ → **Network Access** → **Add IP Address** → ใส่ IP สาธารณะจากขั้นที่ 0 (ไม่ใช่ 10.198.200.123)

ถ้าไม่ทำขั้นนี้ เว็บจะเปิดได้แต่ทุกหน้าที่ใช้ข้อมูลจะ error

## 5. ติดตั้งแพ็กเกจและ build

```powershell
cd C:\footballai
npm ci
npm run build
```

ใช้เวลาประมาณ 3–5 นาที บรรทัดท้ายต้องเป็นรายการหน้า (`○ /news` ฯลฯ) ไม่มีคำว่า `Error`

## 6. เปิดพอร์ต 80 ใน Windows Firewall *(ผู้ดูแล)*

```powershell
New-NetFirewallRule -DisplayName "FootballAI HTTP 80" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
```

ถ้ามีไฟร์วอลล์ของมหาวิทยาลัยกั้นหน้า VM อยู่ ให้แจ้งฝ่ายไอทีเปิดพอร์ต 80 ขาเข้าให้ `10.198.200.123` ด้วย

## 7. รันเว็บให้ทำงานตลอดและเปิดเองหลังรีสตาร์ท *(ผู้ดูแล)*

ใช้ pm2 ดูแลโปรเซส ถ้าเว็บพังจะรีสตาร์ทให้เอง:

```powershell
npm install -g pm2 pm2-windows-startup
cd C:\footballai
pm2 start node_modules\next\dist\bin\next --name footballai -- start -p 80
pm2 save
pm2-startup install
```

ตรวจสถานะ:

```powershell
pm2 status             # footballai ต้องเป็น online
pm2 logs footballai    # ดู log (กด Ctrl+C เพื่อออก)
```

## 8. ทดสอบ

1. บน VM: เปิดเบราว์เซอร์ไปที่ http://localhost แล้วล็อกอินด้วยอีเมลและรหัสผ่าน
2. จากเครื่องอื่นที่ต่อ kku-wifi / VPN มข.: เปิด **http://10.198.200.123**
3. ลองหน้าเหล่านี้: หน้าแรก, ข่าว, คอมมูนิตี้ (โพสต์/คอมเมนต์), ฮีตแมป, ล็อกอินแอดมิน `/admin/login`

เมื่อเปิดผ่าน `http://10.198.200.123` ปุ่ม "เข้าสู่ระบบด้วย Google" จะถูกซ่อน เพราะ Google ไม่รับที่อยู่ IP ภายในแบบ http ผู้ใช้ล็อกอินด้วยอีเมลหรือเบอร์โทรแทน ส่วนเกม ปุ่มคัดลอก และปุ่มแชร์ใช้ได้ปกติ

## 9. บริการวิเคราะห์วิดีโอ (ฮีตแมปจากคลิป)

บริการนี้ต้องใช้ GPU NVIDIA ดูผล `nvidia-smi` จากขั้นที่ 0:

**ก. VM มี GPU:** ติดตั้ง sn-gamestate บน VM ตาม README ของ repo `heatmapfootball` แล้วรัน `tools\web_app.py` ที่พอร์ต 8001 ด้วย pm2 เช่นกัน ใช้ `VIDEO_ANALYSIS_API_BASE_URL=http://127.0.0.1:8001` ตามขั้นที่ 3

**ข. VM ไม่มี GPU (กรณีส่วนใหญ่):** ให้บริการวิเคราะห์รันบนโน้ตบุ๊กที่มี GPU เหมือนเดิม แล้วให้ VM เรียกไปที่โน้ตบุ๊ก

1. บนโน้ตบุ๊ก ตั้งรหัสลับร่วมกันแล้วเปิดบริการ:
   ```powershell
   $env:SERVICE_API_TOKEN = "ตั้งรหัสยาวๆ"
   .venv\Scripts\python.exe tools\web_app.py --port 8001
   ```
2. บน VM ใน `.env.production.local`:
   ```env
   VIDEO_ANALYSIS_API_BASE_URL=http://<IP ของโน้ตบุ๊ก>:8001
   VIDEO_ANALYSIS_SERVICE_TOKEN=รหัสเดียวกับข้อ 1
   ```
   แล้วรันขั้นที่ 10 (build ใหม่และรีสตาร์ท)
3. ข้อจำกัด: โน้ตบุ๊กต้องเปิดอยู่, IP ของโน้ตบุ๊กเปลี่ยนได้ (ต้องแก้ค่าใหม่) และเครือข่ายต้องยอมให้ VM เชื่อมไปหาโน้ตบุ๊ก ถ้าเชื่อมไม่ได้ ส่วนอื่นของเว็บยังใช้ได้ปกติ มีแค่หน้า Video Analysis ที่จะแจ้งว่าเชื่อมต่อบริการไม่ได้

## 10. อัปเดตเว็บเมื่อมีโค้ดใหม่

```powershell
cd C:\footballai
git pull
npm ci
npm run build
pm2 restart footballai
```

ถ้าแก้เฉพาะ `.env.production.local`:
- แก้ค่าที่ขึ้นต้นด้วย `NEXT_PUBLIC_` ต้อง `npm run build` ใหม่ก่อน แล้วค่อย `pm2 restart footballai`
- แก้ค่าอื่น ใช้แค่ `pm2 restart footballai --update-env`

## ปัญหาที่พบบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| เครื่องอื่นเปิด http://10.198.200.123 แล้วค้าง | ไฟร์วอลล์ (ขั้นที่ 6) หรือไฟร์วอลล์ของมหาวิทยาลัยกั้นพอร์ต 80 |
| เว็บเปิดได้แต่ข้อมูลไม่ขึ้น / error ฐานข้อมูล | ยังไม่เพิ่ม IP ใน Atlas (ขั้นที่ 4) หรือ VM ออกอินเทอร์เน็ตไม่ได้ |
| `pm2 start` แจ้งว่าใช้พอร์ต 80 ไม่ได้ | มีโปรแกรมอื่นใช้พอร์ต 80 อยู่ (เช่น IIS) ตรวจด้วย `Get-NetTCPConnection -LocalPort 80` |
| ตรวจสลิปไม่ผ่านทั้งที่โอนถูก | `PROMPTPAY_NAME` ไม่ตรงกับชื่อในสลิป (ขั้นที่ 3) |
| ส่ง OTP อีเมลไม่ได้ | เครือข่ายปิดพอร์ต SMTP ขาออก (465/587) ให้ฝ่ายไอทีเปิด |
| ตารางคะแนนว่าง | โควตา AllSportsAPI หมด ไม่เกี่ยวกับ VM |
