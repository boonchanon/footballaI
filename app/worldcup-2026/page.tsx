"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { CalendarDays, Globe2, MapPin, Sparkles, Trophy, Users } from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { WorldcupBestXiSection } from "@/components/worldcup-best-xi-section"
import { WorldCupPopup } from "@/components/worldcup-popup"
import { WorldcupPortalSection } from "@/components/worldcup-portal-section"
import { WorldcupSubnav } from "@/components/worldcup-subnav"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { getPageSourcePolicy } from "@/lib/content-sources"

const featureCards = [
  {
    title: "เจ้าภาพร่วม 3 ประเทศ",
    body: "สหรัฐอเมริกา, เม็กซิโก และแคนาดา จะร่วมกันจัดฟุตบอลโลกครั้งแรกในประวัติศาสตร์แบบสามชาติ",
    icon: Globe2,
  },
  {
    title: "48 ทีม 104 นัด",
    body: "ทัวร์นาเมนต์ปี 2026 จะขยายจำนวนทีมและเพิ่มจำนวนแมตช์ ทำให้เนื้อหาข่าว, สกอร์ และพรีวิวเข้มข้นกว่าเดิม",
    icon: Users,
  },
  {
    title: "นัดชิงที่ MetLife Stadium",
    body: "รอบชิงชนะเลิศวางคิวไว้ที่รัฐนิวเจอร์ซีย์ พร้อมบรรยากาศแบบเวทีเมเจอร์ระดับโลก",
    icon: Trophy,
  },
]

const editorialHighlights = [
  {
    label: "โฟกัสวันนี้",
    title: "บอลโลก 2026 ต้องเล่าแบบเว็บกีฬา ไม่ใช่แค่หน้าสรุปข้อมูล",
    body: "แกนหลักของหน้านี้จึงแบ่งชัดระหว่างข่าวจริง, สกอร์จริง และชั้นวิเคราะห์จาก AI เพื่อให้ผู้ใช้แยกได้ว่าอะไรคือ fact และอะไรคือ recap หรือ insight",
  },
  {
    label: "มุมกองบรรณาธิการ",
    title: "ทีมเจ้าภาพและชาติเต็งต้องมีพื้นที่เล่าเรื่อง",
    body: "คอนเทนต์ที่ดีไม่ควรมีแค่สกอร์ แต่ต้องมีมุมเจ้าภาพ, ทีมที่น่าจับตา, เกมคลาสสิก และบริบทของทัวร์นาเมนต์ที่กำลังจะมา",
  },
]

const heroBackgrounds = [
  "/worldcup/logofifawordcup.jpg",
  "/worldcup-2026-popup-bg.jpg",
  "/worldcup/trophy.jpg",
  "/worldcup/worldcup4.webp",
]

export default function WorldCupPage() {
  const sourcePolicy = getPageSourcePolicy("worldCup")
  const [activeHeroIndex, setActiveHeroIndex] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveHeroIndex((current) => (current + 1) % heroBackgrounds.length)
    }, 4800)

    return () => window.clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <WorldCupPopup storageKey="footballai-worldcup-popup-worldcup-seen" />
      <Navigation />

      <main className="pt-16">
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0">
            {heroBackgrounds.map((src, index) => (
              <Image
                key={src}
                src={src}
                alt="FIFA World Cup 2026"
                fill
                priority={index === 0}
                className={`object-cover transition-opacity duration-[1400ms] ${
                  index === activeHeroIndex ? "opacity-24 dark:opacity-30" : "opacity-0"
                }`}
              />
            ))}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(248,250,247,0.62),rgba(248,250,247,0.94)_55%,rgba(248,250,247,1))] dark:bg-[linear-gradient(180deg,rgba(17,17,17,0.34),rgba(17,17,17,0.9)_55%,rgba(17,17,17,1))]" />
          </div>

          <div className="container relative mx-auto px-4 py-10 md:py-16">
            <div className="mx-auto max-w-[1280px]">
              <WorldcupSubnav />

              <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline" className="gap-2 bg-background/60 backdrop-blur-sm">
                      <Sparkles className="h-3.5 w-3.5" />
                      World Cup Special
                    </Badge>
                    <Badge variant="outline" className="bg-background/60 backdrop-blur-sm">
                      Policy: {sourcePolicy.kind}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <h1 className="max-w-4xl text-4xl font-display leading-tight md:text-6xl">
                      World Cup 2026 Hub
                    </h1>
                    <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                      หน้ารวมข่าว สกอร์ โปรแกรม และรีแคปของฟุตบอลโลก 2026 โดยแยกชัดว่าอะไรคือข้อมูลจาก API จริง
                      อะไรคือบทสรุปจาก AI และอะไรคือมุม editorial เพื่อให้หน้า World Cup ดูเป็นเว็บกีฬาจริงมากขึ้น
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="rounded-full border border-border/70 bg-card/80 px-4 py-2 backdrop-blur-sm">ข่าวจริงจาก `/api/news?topic=worldcup`</span>
                    <span className="rounded-full border border-border/70 bg-card/80 px-4 py-2 backdrop-blur-sm">สกอร์จริงจาก `/api/worldcup/scores`</span>
                    <span className="rounded-full border border-border/70 bg-card/80 px-4 py-2 backdrop-blur-sm">AI recap จาก `/api/worldcup/ai-hub`</span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                  <Card className="border-border/70 bg-background/85 backdrop-blur-md dark:bg-card/80">
                    <CardContent className="flex items-start gap-3 p-4">
                      <CalendarDays className="mt-1 h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">ช่วงแข่งขัน</p>
                        <p className="mt-1 font-semibold">11 มิ.ย. - 19 ก.ค. 2026</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-border/70 bg-background/85 backdrop-blur-md dark:bg-card/80">
                    <CardContent className="flex items-start gap-3 p-4">
                      <MapPin className="mt-1 h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">สนามชิงชนะเลิศ</p>
                        <p className="mt-1 font-semibold">MetLife Stadium</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-border/70 bg-background/85 backdrop-blur-md dark:bg-card/80">
                    <CardContent className="flex items-start gap-3 p-4">
                      <Users className="mt-1 h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">รูปแบบ</p>
                        <p className="mt-1 font-semibold">48 ทีม / 104 นัด</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10">
          <div className="mx-auto grid max-w-[1280px] gap-5 md:grid-cols-3">
            {featureCards.map((item) => {
              const Icon = item.icon
              return (
                <Card key={item.title} className="border-border/60 bg-card shadow-[0_18px_40px_rgba(26,26,26,0.06)] dark:bg-card/80 dark:shadow-none">
                  <CardContent className="space-y-4 p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">{item.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        <section className="container mx-auto px-4 pb-2">
          <div className="mx-auto grid max-w-[1280px] gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            {editorialHighlights.map((item) => (
              <Card key={item.title} className="border-border/60 bg-card shadow-[0_18px_40px_rgba(26,26,26,0.05)] dark:bg-card dark:shadow-none">
                <CardContent className="space-y-4 p-6">
                  <Badge variant="outline">{item.label}</Badge>
                  <div>
                    <h2 className="text-2xl font-semibold leading-tight">{item.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.body}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <WorldcupBestXiSection />

        <WorldcupPortalSection />

        <section className="container mx-auto px-4 pb-14">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 rounded-[28px] border border-border/60 bg-card px-6 py-5 shadow-[0_18px_40px_rgba(26,26,26,0.06)] dark:bg-card dark:shadow-none">
            <div>
              <p className="text-sm font-semibold">ต้องการดูมุมทำนายผลแยกจากหน้าหลัก</p>
              <p className="mt-1 text-sm text-muted-foreground">
                ใช้หน้า prediction แยกเพื่อให้หน้าหลักยังคงเป็นศูนย์รวมข่าวและข้อมูลทัวร์นาเมนต์
              </p>
            </div>
            <Link
              href="/worldcup-2026/predictions"
              className="rounded-full border border-primary/30 bg-primary/10 px-5 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
            >
              ไปหน้า World Cup Predictions
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
