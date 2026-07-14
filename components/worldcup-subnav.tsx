"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BrainCircuit, Globe2, Sparkles } from "lucide-react"

const worldCupLinks = [
  {
    href: "/worldcup-2026",
    label: "ภาพรวมทัวร์นาเมนต์",
    description: "เจ้าภาพ ทีมเด่น โปรแกรมเด่น และภาพรวม World Cup 2026 ในหน้าเดียว",
    icon: Globe2,
  },
  {
    href: "/worldcup-2026/predictions",
    label: "ทำนายผลฟุตบอลโลก",
    description: "พื้นที่แยกสำหรับดูมุมวิเคราะห์และทำนายผลของคู่สำคัญ",
    icon: BrainCircuit,
  },
]

export function WorldcupSubnav() {
  const pathname = usePathname()

  return (
    <div className="mb-10">
      <div className="rounded-[28px] border border-border/70 bg-[linear-gradient(135deg,rgba(184,255,0,0.12),rgba(255,255,255,0.96)_38%,rgba(184,255,0,0.06))] p-3 shadow-[0_20px_60px_rgba(26,26,26,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(184,255,0,0.08),rgba(26,26,26,0.92)_38%,rgba(184,255,0,0.04))] dark:shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
        <div className="mb-3 flex items-center justify-between gap-3 px-2 pt-1">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-primary/80 dark:text-primary/85">World Cup 2026</p>
            <p className="mt-1 text-sm text-muted-foreground dark:text-white/70">เลือกดูหน้าหลักของทัวร์นาเมนต์ หรือเข้าสู่โหมดทำนายผลได้จากตรงนี้</p>
          </div>
          <div className="hidden rounded-full border border-border/70 bg-card/80 px-3 py-1 text-xs text-muted-foreground md:flex md:items-center md:gap-2 dark:border-white/10 dark:bg-white/5 dark:text-white/75">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Special Coverage
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {worldCupLinks.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group rounded-[22px] border p-4 transition-all ${
                  isActive
                    ? "border-primary/35 bg-primary/10 shadow-[0_12px_30px_rgba(184,255,0,0.16)] dark:border-primary/35 dark:bg-white/12 dark:shadow-[0_12px_30px_rgba(184,255,0,0.12)]"
                    : "border-border/70 bg-card/80 hover:border-primary/30 hover:bg-card dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/25 dark:hover:bg-white/[0.08]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      isActive ? "bg-primary text-primary-foreground dark:bg-primary dark:text-black" : "bg-primary/10 text-primary dark:bg-white/10 dark:text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold ${isActive ? "text-foreground dark:text-white" : "text-foreground/90 dark:text-white/90"}`}>{link.label}</p>
                      {isActive ? (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-black">
                          หน้านี้
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground dark:text-white/65">{link.description}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
