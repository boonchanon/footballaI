import Link from "next/link"
import { ArrowRight, Compass, FileText, LayoutGrid, ShieldCheck, Sparkles, Users } from "lucide-react"

import { SitePageShell } from "@/components/site-page-shell"

const sitemapGroups = [
  {
    title: "สำรวจข้อมูลฟุตบอล",
    icon: LayoutGrid,
    links: [
      { href: "/", label: "หน้าแรก", description: "ภาพรวมข่าว ตารางคะแนน และแมตช์เด่น" },
      { href: "/matches", label: "โปรแกรมการแข่งขัน", description: "ดูโปรแกรมสด นัดถัดไป และผลย้อนหลัง" },
      { href: "/standings", label: "ตารางคะแนน", description: "ติดตามอันดับพรีเมียร์ลีกล่าสุด" },
      { href: "/teams", label: "ทีม", description: "ดูข้อมูลสโมสรและขุมกำลัง" },
      { href: "/players", label: "นักเตะ", description: "สำรวจสถิติรายบุคคลและฟอร์ม" },
      { href: "/stats", label: "สถิติ", description: "ดาวซัลโว แอสซิสต์ และคลีนชีต" },
      { href: "/news", label: "ข่าว", description: "รวมข่าวฟุตบอลและสรุปข่าวแปลไทย" },
    ],
  },
  {
    title: "เครื่องมือและ AI",
    icon: Sparkles,
    links: [
      { href: "/ai-prediction", label: "AI ทำนายผล", description: "วิเคราะห์คู่แข่งขันด้วย AI" },
      { href: "/compare", label: "เปรียบเทียบ", description: "เทียบทีมและข้อมูลสำคัญก่อนแข่ง" },
      { href: "/heatmap", label: "Heat Map", description: "ดู heatmap และจุดเคลื่อนไหวในสนาม" },
      { href: "/games", label: "เกมและกิจกรรม", description: "โหมดทายผล ควิซ และเกมฟุตบอล" },
      { href: "/worldcup-2026", label: "World Cup 2026", description: "คอนเทนต์พิเศษทัวร์นาเมนต์ระดับโลก" },
      { href: "/ai-football-live", label: "AI Snapshot", description: "หน้าโปรดลอง snapshot จาก IntelSphere" },
    ],
  },
  {
    title: "ชุมชนและบัญชีผู้ใช้",
    icon: Users,
    links: [
      { href: "/community", label: "ชุมชน", description: "พูดคุย แชร์โพสต์ และร่วมวิเคราะห์" },
      { href: "/login", label: "เข้าสู่ระบบ", description: "ล็อกอินเพื่อใช้งานฟีเจอร์ส่วนตัว" },
      { href: "/register", label: "สมัครสมาชิก", description: "สร้างบัญชีใหม่ใน FootballAI" },
      { href: "/profile", label: "โปรไฟล์", description: "จัดการบัญชี รายการโปรด และกิจกรรม" },
      { href: "/forgot-password", label: "ลืมรหัสผ่าน", description: "ขอรีเซ็ตรหัสผ่านผ่านอีเมล" },
    ],
  },
  {
    title: "ข้อมูลบริษัทและนโยบาย",
    icon: ShieldCheck,
    links: [
      { href: "/about", label: "เกี่ยวกับเรา", description: "รู้จักแนวคิดและทีมงานของ FootballAI" },
      { href: "/contact", label: "ติดต่อเรา", description: "ช่องทางติดต่อทีมงานและ support" },
      { href: "/careers", label: "ร่วมงานกับเรา", description: "ตำแหน่งงานและโอกาสร่วมทีม" },
      { href: "/privacy", label: "นโยบายความเป็นส่วนตัว", description: "รายละเอียดการเก็บและใช้ข้อมูล" },
      { href: "/terms", label: "ข้อกำหนดการใช้งาน", description: "เงื่อนไขและข้อกำหนดของบริการ" },
      { href: "/cookies", label: "นโยบายคุกกี้", description: "รายละเอียดการใช้คุกกี้บนเว็บไซต์" },
      { href: "/sitemap.xml", label: "XML Sitemap", description: "ไฟล์ sitemap สำหรับ search engine" },
    ],
  },
]

export default function SiteMapPage() {
  return (
    <SitePageShell
      badge="Site Map"
      title="ผังเว็บไซต์ FootballAI"
      description="รวมลิงก์สำคัญของเว็บไซต์สำหรับผู้ใช้งานทั่วไป ช่วยให้เข้าถึงหน้าเนื้อหา เครื่องมือ AI ชุมชน และเอกสารนโยบายได้เร็วขึ้น"
    >
      <div className="grid gap-6 md:grid-cols-2">
        {sitemapGroups.map((group) => {
          const Icon = group.icon

          return (
            <section key={group.title} className="rounded-2xl border border-border/70 bg-background/60 p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="!text-xl">{group.title}</h2>
                </div>
              </div>

              <div className="space-y-3">
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-card/70 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">{link.label}</div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{link.description}</p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <div className="rounded-2xl border border-border/70 bg-background/60 p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Compass className="h-5 w-5" />
          </div>
          <h2 className="!text-xl">วิธีใช้งาน Site Map</h2>
        </div>
        <ul>
          <li>ถ้าต้องการดูคอนเทนต์ฟุตบอลแบบเร็ว เริ่มจาก หน้าแรก ข่าว โปรแกรมการแข่งขัน และตารางคะแนน</li>
          <li>ถ้าต้องการใช้ฟีเจอร์วิเคราะห์ เริ่มจาก AI ทำนายผล เปรียบเทียบ และ Heat Map</li>
          <li>ถ้าต้องการข้อมูลบัญชีหรือชุมชน ให้ดูหน้า เข้าสู่ระบบ สมัครสมาชิก โปรไฟล์ และชุมชน</li>
          <li>สำหรับ search engine และ indexing ใช้ไฟล์ [XML Sitemap](/d:/bundesliga-clubs-display%20(1)/app/sitemap.ts#L1) แยกจากหน้าผังเว็บไซต์นี้</li>
        </ul>
      </div>

      <div className="rounded-2xl border border-border/70 bg-background/60 p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <h2 className="!text-xl">ลิงก์ที่เกี่ยวข้อง</h2>
        </div>
        <ul>
          <li>
            ถ้าต้องการไฟล์ sitemap สำหรับ search engine ให้ใช้{" "}
            <a href="/sitemap.xml" className="text-primary underline underline-offset-4">
              `/sitemap.xml`
            </a>
          </li>
          <li>หน้านี้ออกแบบสำหรับผู้ใช้ทั่วไป เพื่อกดเข้าแต่ละหน้าของเว็บไซต์ได้สะดวกขึ้น</li>
        </ul>
      </div>
    </SitePageShell>
  )
}
