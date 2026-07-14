import { SitePageShell } from "@/components/site-page-shell"

export default function ContactPage() {
  return (
    <SitePageShell
      badge="ติดต่อเรา"
      title="ติดต่อทีมงาน"
      description="หากพบปัญหาการใช้งาน ต้องการแจ้งข้อผิดพลาด หรือมีข้อเสนอแนะเกี่ยวกับ FootballAI สามารถติดต่อทีมงานได้ตามช่องทางนี้"
    >
      <h2>ช่องทางหลัก</h2>
      <ul>
        <li>อีเมล: support@footballai.co.th</li>
        <li>โทรศัพท์: 02-123-4567</li>
        <li>เวลาทำการ: 09:00 - 18:00 น.</li>
      </ul>

      <h2>เรื่องที่เราช่วยได้</h2>
      <ul>
        <li>ปัญหาการสมัครสมาชิก เข้าสู่ระบบ และรีเซ็ตรหัสผ่าน</li>
        <li>รายงานโพสต์หรือคอมเมนต์ที่ไม่เหมาะสม</li>
        <li>แจ้งข้อมูลฟุตบอลผิดพลาดหรือเนื้อหาที่ควรปรับปรุง</li>
        <li>ติดต่อเรื่องความร่วมมือทางธุรกิจและคอนเทนต์</li>
      </ul>
    </SitePageShell>
  )
}
