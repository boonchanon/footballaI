import Link from "next/link"
import { Mail, MapPin, Phone, Trophy } from "lucide-react"

export function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    product: [
      { href: "/ai-prediction", label: "AI ทำนายผล" },
      { href: "/matches", label: "โปรแกรมการแข่งขัน" },
      { href: "/standings", label: "ตารางคะแนน" },
      { href: "/players", label: "สถิตินักเตะ" },
      { href: "/games", label: "ทายผลและเกม" },
    ],
    company: [
      { href: "/about", label: "เกี่ยวกับเรา" },
      { href: "/contact", label: "ติดต่อเรา" },
      { href: "/careers", label: "ร่วมงานกับเรา" },
      { href: "/site-map", label: "Site Map" },
    ],
    legal: [
      { href: "/privacy", label: "นโยบายความเป็นส่วนตัว" },
      { href: "/terms", label: "ข้อกำหนดการใช้งาน" },
      { href: "/cookies", label: "นโยบายคุกกี้" },
    ],
  }

  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <span className="font-display text-xl text-primary-foreground">FA</span>
              </div>
              <span className="font-display text-2xl">FootballAI</span>
            </Link>
            <p className="mb-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
              แพลตฟอร์มวิเคราะห์ฟุตบอลด้วย AI ที่ช่วยให้คุณติดตามเกม สถิติ ข่าว และคอมมูนิตี้คอบอลได้ในที่เดียว
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Trophy className="h-4 w-4 text-primary" />
              <span>Football Data & Community Platform</span>
            </div>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">ผลิตภัณฑ์</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">บริษัท</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">ติดต่อ</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>support@footballai.co.th</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>02-123-4567</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4" />
                <span>กรุงเทพมหานคร ประเทศไทย</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">© {currentYear} FootballAI. สงวนลิขสิทธิ์ทั้งหมด</p>
          <div className="flex items-center gap-6">
            {footerLinks.legal.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
