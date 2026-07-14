# FootballAI Website Sitemap

อัปเดตล่าสุด: 2026-03-27

## สถานะที่ใช้ในเอกสารนี้

- `เสร็จแล้ว` ใช้งานได้จริงใน flow หลักของเว็บ
- `ใช้งานได้/ยังทดลอง` ใช้งานได้ แต่ยังเป็นฟีเจอร์ทดลองหรือ source ข้อมูลยังไม่เสถียร 100%
- `หน้าเนื้อหา` เป็นหน้าข้อมูลคงที่หรือ informational page
- `หลังบ้าน` เป็นหน้า admin

## 1. Public Pages

### `/`
- ชื่อหน้า: หน้าแรก
- ฟังก์ชัน:
  - แสดง hero section ของเว็บ
  - แสดงแมตช์สดและแมตช์ถัดไป
  - แสดง top scorers
  - แสดงข่าวล่าสุด
  - แสดง compact standings
  - ถ้ามี AI snapshot จะดึง snapshot มาแสดงแทนบางส่วน
- สถานะ: `เสร็จแล้ว`

### `/matches`
- ชื่อหน้า: โปรแกรมการแข่งขัน
- ฟังก์ชัน:
  - ดูแมตช์สด
  - ดูแมตช์ที่กำลังจะเล่น
  - ดูแมตช์ที่แข่งจบแล้ว
  - filter ตามทีม
  - filter ตามรอบ
  - ดูรายละเอียดแมตช์รายคู่
- สถานะ: `เสร็จแล้ว`

### `/matches/[id]`
- ชื่อหน้า: รายละเอียดแมตช์
- ฟังก์ชัน:
  - ดูสกอร์
  - ดู event timeline
  - ดู lineups
  - ดูข้อมูลเชิงลึกของแมตช์
- สถานะ: `เสร็จแล้ว`

### `/standings`
- ชื่อหน้า: ตารางคะแนน
- ฟังก์ชัน:
  - แสดงอันดับพรีเมียร์ลีก
  - แสดงสถิติชนะ/เสมอ/แพ้
  - แสดงผลต่างประตู
  - แสดง form ล่าสุด
- สถานะ: `เสร็จแล้ว`

### `/teams`
- ชื่อหน้า: ทีม
- ฟังก์ชัน:
  - แสดงรายชื่อทีม
  - เข้าหน้าทีมรายสโมสร
- สถานะ: `เสร็จแล้ว`

### `/teams/[id]`
- ชื่อหน้า: รายละเอียดทีม
- ฟังก์ชัน:
  - ดูข้อมูลทีม
  - ดูผู้เล่น
  - ดูสถิติและข้อมูลเชิงทีม
- สถานะ: `เสร็จแล้ว`

### `/players`
- ชื่อหน้า: นักเตะ
- ฟังก์ชัน:
  - ดูรายชื่อนักเตะ
  - ดูสถิติเด่น
  - ดู clean sheets / scorers / assists บางส่วน
- สถานะ: `เสร็จแล้ว`

### `/players/[id]`
- ชื่อหน้า: รายละเอียดนักเตะ
- ฟังก์ชัน:
  - ดูข้อมูลนักเตะ
  - ดู shot map
  - ดู season stats
  - ดูประวัติย้ายทีม
- สถานะ: `ใช้งานได้/ยังทดลอง`

### `/stats`
- ชื่อหน้า: สถิติ
- ฟังก์ชัน:
  - top scorers
  - top assists
  - clean sheets
  - ตารางคะแนนเชิงสถิติ
- สถานะ: `เสร็จแล้ว`

### `/news`
- ชื่อหน้า: ข่าว
- ฟังก์ชัน:
  - ดึงข่าวฟุตบอล
  - แปลข่าวเป็นภาษาไทย
  - แสดง featured article และ news cards
- สถานะ: `เสร็จแล้ว`
- หมายเหตุ: มี AI translation/fallback translation

### `/community`
- ชื่อหน้า: ชุมชน
- ฟังก์ชัน:
  - ดูโพสต์ชุมชน
  - สร้างโพสต์
  - กดไลก์
  - แสดงความคิดเห็น
  - รายงานโพสต์
- สถานะ: `เสร็จแล้ว`

### `/community/[id]`
- ชื่อหน้า: รายละเอียดโพสต์ชุมชน
- ฟังก์ชัน:
  - ดูโพสต์เดี่ยว
  - ดู comment
  - เพิ่ม comment
  - รายงานโพสต์
- สถานะ: `เสร็จแล้ว`

### `/ai-prediction`
- ชื่อหน้า: AI ทำนายผล
- ฟังก์ชัน:
  - เลือกแมตช์เพื่อทำนาย
  - ดูบทวิเคราะห์และความน่าจะเป็น
- สถานะ: `เสร็จแล้ว`

### `/ai-football-live`
- ชื่อหน้า: AI Snapshot
- ฟังก์ชัน:
  - ดู standings snapshot จาก IntelSphere
  - ดู fixtures snapshot จาก IntelSphere
  - ดู source URLs ที่โมเดลคืนมา
- สถานะ: `ใช้งานได้/ยังทดลอง`

### `/compare`
- ชื่อหน้า: เปรียบเทียบ
- ฟังก์ชัน:
  - เปรียบเทียบข้อมูลทีม/นักเตะ
- สถานะ: `ใช้งานได้/ยังทดลอง`

### `/heatmap`
- ชื่อหน้า: Heat Map
- ฟังก์ชัน:
  - เลือกนักเตะ
  - ดู heatmap จำลอง/แสดงผลภาพในสนาม
- สถานะ: `ใช้งานได้/ยังทดลอง`

### `/games`
- ชื่อหน้า: เกมและกิจกรรม
- ฟังก์ชัน:
  - hub รวม minigames
  - prediction games
  - quiz
  - first scorer
  - who-am-i
- สถานะ: `เสร็จแล้ว`

### `/games/predict-score`
- ชื่อหน้า: ทายสกอร์
- ฟังก์ชัน: ทายผลสกอร์แมตช์
- สถานะ: `เสร็จแล้ว`

### `/games/first-scorer`
- ชื่อหน้า: ทายคนยิงประตูแรก
- ฟังก์ชัน: เลือกแมตช์และเลือกผู้เล่น
- สถานะ: `เสร็จแล้ว`

### `/games/quiz`
- ชื่อหน้า: ควิซฟุตบอล
- ฟังก์ชัน: ทำแบบทดสอบฟุตบอลหลายหมวด
- สถานะ: `เสร็จแล้ว`

### `/games/who-am-i`
- ชื่อหน้า: Who Am I
- ฟังก์ชัน: เกมทายตัวนักเตะจากคำใบ้
- สถานะ: `เสร็จแล้ว`

### `/worldcup-2026`
- ชื่อหน้า: World Cup 2026
- ฟังก์ชัน:
  - หน้า special event content
  - timeline / venues / teams / highlights
- สถานะ: `หน้าเนื้อหา`

### `/leagues`
- ชื่อหน้า: ลีก
- ฟังก์ชัน: ดูลีกหรือภาพรวมการแข่งขัน
- สถานะ: `ใช้งานได้/ยังทดลอง`

### `/clubs`
- ชื่อหน้า: สโมสร
- ฟังก์ชัน: ดูรายชื่อสโมสรทั้งหมด
- สถานะ: `ใช้งานได้/ยังทดลอง`

### `/profile`
- ชื่อหน้า: โปรไฟล์ผู้ใช้
- ฟังก์ชัน:
  - แก้ไขข้อมูลโปรไฟล์
  - เปลี่ยนรหัสผ่าน
  - ลบบัญชี
  - ดูรายการโปรด
  - ดูกิจกรรมของตัวเอง
- สถานะ: `เสร็จแล้ว`

### `/login`
- ชื่อหน้า: เข้าสู่ระบบ
- ฟังก์ชัน:
  - login ด้วย email/password
  - social login
  - validation และ error handling
- สถานะ: `เสร็จแล้ว`

### `/register`
- ชื่อหน้า: สมัครสมาชิก
- ฟังก์ชัน:
  - สมัครสมาชิก
  - validate ชื่อซ้ำ อีเมลซ้ำ รหัสผ่านซ้ำ
- สถานะ: `เสร็จแล้ว`

### `/forgot-password`
- ชื่อหน้า: ลืมรหัสผ่าน
- ฟังก์ชัน: ขอ OTP/reset flow
- สถานะ: `เสร็จแล้ว`

### `/reset-password`
- ชื่อหน้า: รีเซ็ตรหัสผ่าน
- ฟังก์ชัน: ตั้งรหัสผ่านใหม่
- สถานะ: `เสร็จแล้ว`

### `/verify-otp`
- ชื่อหน้า: ยืนยัน OTP
- ฟังก์ชัน: ยืนยันรหัส OTP ของ reset flow
- สถานะ: `เสร็จแล้ว`

### `/auth/complete`
- ชื่อหน้า: OAuth Complete
- ฟังก์ชัน: รับผลลัพธ์จาก social login แล้วสร้าง session
- สถานะ: `เสร็จแล้ว`

### `/about`
- ชื่อหน้า: เกี่ยวกับเรา
- ฟังก์ชัน: แนะนำแพลตฟอร์ม
- สถานะ: `หน้าเนื้อหา`

### `/contact`
- ชื่อหน้า: ติดต่อเรา
- ฟังก์ชัน: แสดงช่องทางติดต่อ support
- สถานะ: `หน้าเนื้อหา`

### `/careers`
- ชื่อหน้า: ร่วมงานกับเรา
- ฟังก์ชัน: หน้าเนื้อหาเกี่ยวกับงาน
- สถานะ: `หน้าเนื้อหา`

### `/privacy`
- ชื่อหน้า: นโยบายความเป็นส่วนตัว
- ฟังก์ชัน: หน้าเอกสาร policy
- สถานะ: `หน้าเนื้อหา`

### `/terms`
- ชื่อหน้า: ข้อกำหนดการใช้งาน
- ฟังก์ชัน: หน้าเอกสาร policy
- สถานะ: `หน้าเนื้อหา`

### `/cookies`
- ชื่อหน้า: นโยบายคุกกี้
- ฟังก์ชัน: หน้าเอกสาร policy
- สถานะ: `หน้าเนื้อหา`

### `/site-map`
- ชื่อหน้า: Site Map
- ฟังก์ชัน:
  - รวมลิงก์ public pages
  - ช่วยผู้ใช้ดูโครงเว็บ
  - ใช้เป็น manual sitemap ฝั่ง user
- สถานะ: `เสร็จแล้ว`

### `/sitemap.xml`
- ชื่อหน้า: XML Sitemap
- ฟังก์ชัน:
  - ใช้สำหรับ search engine indexing
  - ระบุหน้า public สำคัญของเว็บ
- สถานะ: `เสร็จแล้ว`

## 2. Admin Pages

### `/admin`
- dashboard หลังบ้าน
- สถานะ: `หลังบ้าน`

### `/admin/login`
- ล็อกอินแอดมินผ่าน `admins` collection
- สถานะ: `เสร็จแล้ว`

### `/admin/ai`
- ตั้งค่า AI
- กด sync ข้อมูลพรีเมียร์ลีกลง Atlas
- ดู sync status
- สถานะ: `เสร็จแล้ว`

### `/admin/analytics`
- ดู analytics dashboard
- สถานะ: `หลังบ้าน`

### `/admin/community/*`
- จัดการโพสต์ รายงาน คำต้องห้าม และ settings ของ community
- สถานะ: `หลังบ้าน`

### `/admin/heatmap`
- จัดการ heatmap entries
- สถานะ: `หลังบ้าน`

### `/admin/leagues/*`
- จัดการลีก season standings
- สถานะ: `หลังบ้าน`

### `/admin/matches/*`
- จัดการ fixtures results lineups add match
- สถานะ: `หลังบ้าน`

### `/admin/news`
- จัดการข่าว
- สถานะ: `หลังบ้าน`

### `/admin/players/*`
- จัดการนักเตะ compare stats sync
- สถานะ: `หลังบ้าน`

### `/admin/settings`
- ตั้งค่าระบบ
- สถานะ: `หลังบ้าน`

### `/admin/teams/*`
- จัดการทีม squads stats
- สถานะ: `หลังบ้าน`

### `/admin/users/*`
- จัดการ user และ roles
- สถานะ: `หลังบ้าน`

## 3. Data/API Flows ที่สำคัญ

### Auth
- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/me`
- `/api/auth/forgot-password`
- `/api/auth/reset-password`
- สถานะ: `เสร็จแล้ว`

### Admin Auth
- `/api/admin/login`
- ใช้ `admins` collection
- สถานะ: `เสร็จแล้ว`

### Football Data
- `/api/football/fixtures`
- `/api/football/standings`
- `/api/football/topscorers`
- `/api/football/topassists`
- `/api/football/cleansheets`
- `/api/football/players/[id]`
- สถานะ: `เสร็จแล้ว`
- หมายเหตุ: บาง route ยังมี fallback/mock เมื่อ source จริง fail

### AI Snapshot / Atlas Sync
- `/api/football/ai-snapshot`
- `/api/football/snapshot-db`
- `/api/admin/sync/premier-league`
- สถานะ: `ใช้งานได้/ยังทดลอง`

### News
- `/api/news`
- แปลข่าวผ่าน IntelSphere + fallback translation
- สถานะ: `เสร็จแล้ว`

### Community
- `/api/community/posts`
- `/api/community/posts/[id]`
- `/api/community/posts/[id]/comments`
- `/api/community/posts/[id]/like`
- `/api/community/posts/[id]/report`
- สถานะ: `เสร็จแล้ว`

## 4. สิ่งที่เสร็จแล้วชัดเจน

- ระบบ auth ฝั่ง user
- โปรไฟล์ผู้ใช้
- ข่าวและระบบแปลไทย
- ตารางคะแนน / โปรแกรม / สถิติหลัก
- ชุมชน
- เกมฟุตบอล
- XML sitemap
- user-facing site map page
- admin login ผ่าน `admins`
- admin sync ลง Atlas

## 5. สิ่งที่ยังถือว่า experimental หรือควรไล่ต่อ

- AI snapshot จาก IntelSphere
- การใช้ snapshot จาก Atlas แทน source หลักทุกหน้า
- บางหน้าเชิงลึกของผู้เล่น/เปรียบเทียบ/heatmap ที่ยังมีลักษณะทดลองหรือผสม mock
- บาง route ฟุตบอลยังมี fallback เมื่อ source จริง fail

## 6. เอกสารที่เกี่ยวข้อง

- route XML sitemap: [app/sitemap.ts](/d:/bundesliga-clubs-display%20(1)/app/sitemap.ts#L1)
- user site map page: [app/site-map/page.tsx](/d:/bundesliga-clubs-display%20(1)/app/site-map/page.tsx#L1)
