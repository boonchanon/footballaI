"use client"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { WorldcupPredictionPanel } from "@/components/worldcup-prediction-panel"
import { WorldcupSubnav } from "@/components/worldcup-subnav"
import { Badge } from "@/components/ui/badge"
import { BrainCircuit, Layers3, Sparkles } from "lucide-react"

export default function WorldCupPredictionsPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.14),transparent_28%),linear-gradient(180deg,#f8f3ea_0%,#efe5d2_38%,#f6f1e7_100%)] text-foreground dark:bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.14),transparent_28%),linear-gradient(180deg,#07111f_0%,#091425_38%,#050914_100%)]">
      <Navigation />

      <section className="border-b border-border/70 dark:border-white/10">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <Badge className="mb-5 border-amber-300/30 bg-amber-300/10 text-amber-200 hover:bg-amber-300/10">
            <BrainCircuit className="mr-2 h-3.5 w-3.5" />
            FIFA World Cup 2026
          </Badge>
          <div className="max-w-3xl">
            <h1 className="text-4xl font-display leading-tight text-foreground md:text-6xl">
              ทำนายผลบอลโลก 2026
              <span className="block text-primary dark:text-amber-300">รองรับหลายรอบในหน้าเดียว</span>
            </h1>
            <p className="mt-5 text-base leading-8 text-muted-foreground md:text-lg">
              ใช้โครงสร้าง prediction เดิมของโปรเจกต์ แต่เพิ่มการเลือกดูแยกตามรอบ 32 ทีม และรอบ 16 ทีม พร้อมปุ่มรอบลึกที่แสดงไว้ล่วงหน้า
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <div className="rounded-full border border-border/70 bg-card/80 px-4 py-2 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                <Layers3 className="mr-2 inline h-4 w-4 text-primary dark:text-amber-300" />
                Round of 32 + Round of 16
              </div>
              <div className="rounded-full border border-border/70 bg-card/80 px-4 py-2 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                <Sparkles className="mr-2 inline h-4 w-4 text-primary dark:text-sky-300" />
                ปุ่มรอบ 8 / 4 / ชิง แสดงไว้แต่ยัง disabled
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8 md:py-10">
        <WorldcupSubnav />
      </main>

      <WorldcupPredictionPanel />
      <Footer />
    </div>
  )
}
