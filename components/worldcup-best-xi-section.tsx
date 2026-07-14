"use client"

import { ShieldCheck, Sparkles, Star, Trophy } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { getWorldCupBestXi, type RankedBestXiPlayer } from "@/lib/worldcup-best-xi"

const formationSlots = [
  "left-[6%] top-[11%] md:left-[9%]",
  "left-1/2 top-[7%] -translate-x-1/2",
  "right-[6%] top-[11%] md:right-[9%]",
  "left-[14%] top-[33%] md:left-[18%]",
  "left-1/2 top-[29%] -translate-x-1/2",
  "right-[14%] top-[33%] md:right-[18%]",
  "left-[7%] top-[56%] md:left-[11%]",
  "left-[31%] top-[55%] md:left-[34%]",
  "right-[31%] top-[55%] md:right-[34%]",
  "right-[7%] top-[56%] md:right-[11%]",
  "left-1/2 bottom-[6%] -translate-x-1/2",
] as const

function RatingChip({ value }: { value: number }) {
  return (
    <div className="inline-flex min-w-10 items-center justify-center rounded-lg bg-primary px-2 py-0.5 text-xs font-black text-primary-foreground shadow-[0_8px_20px_rgba(184,255,0,0.22)] sm:min-w-11 sm:text-sm">
      {value.toFixed(1)}
    </div>
  )
}

function PlayerMarker({
  player,
  positionClassName,
}: {
  player: RankedBestXiPlayer
  positionClassName: string
}) {
  return (
    <div className={`absolute w-[80px] text-center sm:w-[92px] ${positionClassName}`}>
      <div className="flex flex-col items-center">
        <div className="relative mb-1.5 flex h-14 w-14 items-center justify-center rounded-full border border-border/70 bg-card shadow-[0_12px_24px_rgba(0,0,0,0.16)] sm:h-16 sm:w-16">
          <div className="absolute -left-2 top-1">
            <RatingChip value={player.rating} />
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/12 text-xs font-black uppercase text-primary sm:h-11 sm:w-11 sm:text-sm">
            {player.name
              .split(" ")
              .map((part) => part[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div className="absolute -right-1.5 bottom-0 rounded-full border border-border/70 bg-background px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            {player.country}
          </div>
        </div>
        <p className="text-xs font-semibold text-foreground sm:text-sm">{player.shortName}</p>
        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{player.role}</p>
      </div>
    </div>
  )
}

export function WorldcupBestXiSection() {
  const { lineup, standouts, recap } = getWorldCupBestXi()

  return (
    <section className="container mx-auto px-4 pb-8">
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge variant="outline" className="mb-2 gap-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              FootballAI Hybrid Rating
            </Badge>
            <h2 className="text-2xl font-display md:text-4xl">ทีมยอดเยี่ยมประจำรอบ</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              คัดจากผู้เล่นที่ลงสนามจริงในรอบนี้เท่านั้น จากนั้นให้คะแนนตามตำแหน่งด้วย FootballAI logic
              แล้วเติมโบนัสจากจังหวะตัดสินเกมเพื่อจัด Best XI แบบที่อิงผลงานจริงมากที่สุด
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/80 px-4 py-2.5 text-sm text-muted-foreground">
            ใช้เฉพาะผู้เล่นที่ <span className="font-semibold text-foreground">minutes &gt; 0</span> และผ่านเกณฑ์คะแนนของรอบ
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
          <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/90 py-0 shadow-[0_20px_50px_rgba(26,26,26,0.1)]">
            <CardContent className="p-0">
              <div className="border-b border-border/60 px-4 py-3 md:px-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Best XI of the Round</p>
                    <p className="mt-1 text-sm text-muted-foreground">จัดในระบบ 4-3-3 จากคะแนนเฉพาะรอบนี้ ไม่ใช่ชื่อชั้นหรือภาพจำเดิม</p>
                  </div>
                  <Badge className="bg-primary text-primary-foreground">Round of 16</Badge>
                </div>
              </div>

              <div className="p-3 md:p-4">
                <div className="relative min-h-[540px] overflow-hidden rounded-[24px] border border-border/70 bg-[radial-gradient(circle_at_top,rgba(184,255,0,0.1),transparent_28%),linear-gradient(180deg,rgba(18,24,18,0.96),rgba(10,14,10,1))] px-2 py-4 sm:px-4">
                  <div className="absolute inset-0 opacity-80">
                    <div className="absolute left-1/2 top-3 h-[calc(100%-1.5rem)] w-[84%] -translate-x-1/2 rounded-[24px] border border-white/10" />
                    <div className="absolute left-1/2 top-[8%] h-[84%] w-px -translate-x-1/2 bg-white/10" />
                    <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
                    <div className="absolute left-1/2 top-[12%] h-16 w-[44%] -translate-x-1/2 rounded-b-[20px] border border-white/10 border-t-0" />
                    <div className="absolute left-1/2 bottom-[12%] h-16 w-[44%] -translate-x-1/2 rounded-t-[20px] border border-white/10 border-b-0" />
                    <div className="absolute left-1/2 top-[7%] h-6 w-[18%] -translate-x-1/2 rounded-b-lg border border-white/10 border-t-0" />
                    <div className="absolute left-1/2 bottom-[7%] h-6 w-[18%] -translate-x-1/2 rounded-t-lg border border-white/10 border-b-0" />
                  </div>

                  {lineup.map((player, index) => (
                    <PlayerMarker key={player.id} player={player} positionClassName={formationSlots[index]} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5">
            <Card className="rounded-[24px] border-border/70 bg-card/90 py-0 shadow-[0_20px_50px_rgba(26,26,26,0.1)]">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
                    <Star className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">ตัวเด่นของรอบ</h3>
                    <p className="text-sm text-muted-foreground">สามผู้เล่นคะแนนสูงสุดจากระบบของเรา</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {standouts.map((player, index) => (
                    <div key={player.id} className="rounded-[20px] border border-border/60 bg-background/70 p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Top {index + 1}</p>
                          <h4 className="mt-1 text-base font-semibold">{player.name}</h4>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            {player.country} • {player.role}
                          </p>
                        </div>
                        <RatingChip value={player.rating} />
                      </div>
                      <p className="mt-2.5 text-sm leading-6 text-muted-foreground">{player.note}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border-border/70 bg-card/90 py-0 shadow-[0_20px_50px_rgba(26,26,26,0.1)]">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">เกณฑ์คัดเลือก</h3>
                    <p className="text-sm text-muted-foreground">FootballAI ใช้สูตรเดียวกันทั้งรอบเพื่อให้ตัดสินได้สม่ำเสมอ</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="rounded-[20px] border border-border/60 bg-background/70 p-3.5">
                    <p className="font-semibold text-foreground">1. คัดสิทธิ์ก่อน</p>
                    <p className="mt-1 leading-6">ผู้เล่นต้องลงจริงในรอบนั้นและมีเวลาเล่นมากกว่า 0 นาที ถึงจะเข้ารอบคำนวณ</p>
                  </div>
                  <div className="rounded-[20px] border border-border/60 bg-background/70 p-3.5">
                    <p className="font-semibold text-foreground">2. ให้คะแนนตามตำแหน่ง</p>
                    <p className="mt-1 leading-6">กองหน้าเน้นประตูและการจบสกอร์ กองกลางเน้นการสร้างเกม กองหลังเน้นเกมรับ ผู้รักษาประตูเน้นการเซฟ</p>
                  </div>
                  <div className="rounded-[20px] border border-border/60 bg-background/70 p-3.5">
                    <p className="font-semibold text-foreground">3. เติม impact bonus</p>
                    <p className="mt-1 leading-6">จังหวะเปลี่ยนเกม ประตูชัย คลีนชีต หรือการเซฟสำคัญ จะเพิ่มน้ำหนักให้คะแนนรวม</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border-border/70 bg-[linear-gradient(135deg,rgba(184,255,0,0.12),rgba(255,255,255,0.03))] py-0 shadow-[0_20px_50px_rgba(26,26,26,0.1)]">
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-2xl bg-primary/15 p-2.5 text-primary">
                    <Trophy className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">AI Recap</h3>
                    <p className="text-sm text-muted-foreground">สรุปจากผลคำนวณของรอบนี้</p>
                  </div>
                </div>

                <p className="text-sm leading-7 text-muted-foreground">{recap}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
