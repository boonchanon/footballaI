import { SitePageShell } from "@/components/site-page-shell"

export default function CareersPage() {
  return (
    <SitePageShell
      badge="ร่วมงานกับเรา"
      title="ร่วมสร้าง FootballAI"
      description="เรามองหาคนที่ชอบฟุตบอล เข้าใจผู้ใช้ และอยากช่วยสร้างแพลตฟอร์มข้อมูลกีฬาและคอมมูนิตี้ที่เติบโตได้จริง"
    >
      <h2>ตำแหน่งที่เราสนใจ</h2>
      <ul>
        <li>Frontend / Full-stack Developer</li>
        <li>Sports Data Analyst</li>
        <li>Content Editor / Community Moderator</li>
        <li>Product Designer</li>
      </ul>

      <h2>สิ่งที่เราคาดหวัง</h2>
      <ul>
        <li>ทำงานเป็นระบบ สื่อสารตรง และรับผิดชอบงานตัวเองได้</li>
        <li>สนใจผลิตภัณฑ์ดิจิทัลที่ขยับเร็วและต้องปรับตลอด</li>
        <li>รักฟุตบอลหรือสนใจข้อมูลเชิงลึกของกีฬา</li>
      </ul>

      <h2>วิธีสมัคร</h2>
      <p>ส่งประวัติย่อ ผลงาน และตำแหน่งที่สนใจมาที่ support@footballai.co.th โดยระบุหัวข้ออีเมลว่า Careers - ชื่อตำแหน่ง</p>
    </SitePageShell>
  )
}
