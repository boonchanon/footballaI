"use client"

import Image from "next/image"
import useSWR from "swr"
import { Activity, ArrowRight, Radio, Trophy } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type ScoreCard = {
  id: string
  stage: string
  date: string
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  homeFlag: string
  awayFlag: string
  homeBadge: string
  awayBadge: string
  venue: string
  status: "live" | "finished" | "upcoming"
  note: string
}

type WorldcupScoresResponse = {
  recentResults: ScoreCard[]
  upcomingFixtures: ScoreCard[]
  source: string
  note?: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const fallbackScoreCards: ScoreCard[] = [
  {
    id: "fallback-1",
    stage: "Final",
    date: "2022-12-18",
    homeTeam: "Argentina",
    awayTeam: "France",
    homeScore: 3,
    awayScore: 3,
    homeFlag: "🇦🇷",
    awayFlag: "🇫🇷",
    homeBadge: "",
    awayBadge: "",
    venue: "Lusail Iconic Stadium",
    status: "finished",
    note: "Argentina won 4-2 on penalties.",
  },
  {
    id: "fallback-2",
    stage: "Semi-final",
    date: "2022-12-14",
    homeTeam: "France",
    awayTeam: "Morocco",
    homeScore: 2,
    awayScore: 0,
    homeFlag: "🇫🇷",
    awayFlag: "🇲🇦",
    homeBadge: "",
    awayBadge: "",
    venue: "Al Bayt Stadium",
    status: "finished",
    note: "France advanced to the final.",
  },
  {
    id: "fallback-3",
    stage: "Group Stage",
    date: "2022-11-22",
    homeTeam: "Argentina",
    awayTeam: "Saudi Arabia",
    homeScore: 1,
    awayScore: 2,
    homeFlag: "🇦🇷",
    awayFlag: "🇸🇦",
    homeBadge: "",
    awayBadge: "",
    venue: "Lusail Iconic Stadium",
    status: "finished",
    note: "One of the biggest early upsets of the tournament.",
  },
]

function formatMatchDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value))
}

function statusBadge(status: ScoreCard["status"]) {
  if (status === "live") {
    return (
      <Badge className="gap-1 border-0 bg-red-600 text-white hover:bg-red-600">
        <Radio className="h-3 w-3" />
        Live
      </Badge>
    )
  }

  if (status === "finished") {
    return <Badge variant="secondary">FT</Badge>
  }

  return <Badge variant="outline">Upcoming</Badge>
}

function TeamChip({ name, flag, badge }: { name: string; flag: string; badge: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-card/90 dark:border-white/10 dark:bg-black/30">
        {badge ? (
          <Image src={badge} alt={name} width={22} height={22} className="h-6 w-6 object-contain" unoptimized />
        ) : (
          <span className="text-base leading-none">{flag}</span>
        )}
      </div>
      <span className="truncate text-sm font-medium">{name}</span>
    </div>
  )
}

export function WorldcupScoreSection() {
  const { data } = useSWR<WorldcupScoresResponse>("/api/worldcup/scores", fetcher, {
    refreshInterval: 15 * 60 * 1000,
    revalidateOnFocus: false,
  })

  const featuredCards = data?.recentResults?.length ? data.recentResults.slice(0, 3) : fallbackScoreCards
  const upcomingFixture = data?.upcomingFixtures?.[0]

  return (
    <section className="border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge variant="outline" className="mb-3">
              <Activity className="mr-1 h-3 w-3" />
              Match Center
            </Badge>
            <h2 className="text-2xl font-display md:text-3xl">สรุปผลเด่นแบบเร็ว แล้วค่อยไปอ่านข่าวต่อ</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
              ย่อ block สกอร์ให้ทำหน้าที่เป็น summary ที่อ่านไว และเปิดทางให้ข่าวเด่นของฟุตบอลโลกขึ้นมาเป็นพระเอกของหน้า
            </p>
          </div>
          <Button asChild variant="outline" className="h-11 rounded-xl bg-transparent">
            <a href="/worldcup-2026/predictions">
              ไปหน้าโหมดทำนายผลบอลโลก
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="grid gap-4 md:grid-cols-3">
            {featuredCards.map((card, index) => (
              <Card key={card.id} className="rounded-[24px] border-border/70 bg-card/80 py-0 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))]">
                <CardContent className="space-y-4 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-card text-[10px] font-semibold text-primary dark:border-white/10 dark:bg-black/20">
                        {index + 1}
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {card.stage}
                      </Badge>
                    </div>
                    {statusBadge(card.status)}
                  </div>

                  <p className="text-xs text-muted-foreground">{formatMatchDate(card.date)}</p>

                  <div className="space-y-2.5 rounded-2xl border border-border/70 bg-card/80 p-3 dark:border-white/8 dark:bg-black/20">
                    <div className="flex items-center justify-between gap-3">
                      <TeamChip name={card.homeTeam} flag={card.homeFlag} badge={card.homeBadge} />
                      <span className="font-display text-3xl text-primary">{card.homeScore ?? "-"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <TeamChip name={card.awayTeam} flag={card.awayFlag} badge={card.awayBadge} />
                      <span className="font-display text-3xl text-primary">{card.awayScore ?? "-"}</span>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-border/60 pt-3 dark:border-white/5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Venue</p>
                    <p className="text-xs text-muted-foreground">{card.venue}</p>
                    <p className="text-sm leading-6 text-foreground/85">{card.note}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-[24px] border-border/70 bg-card/80 py-0 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))]">
            <CardContent className="space-y-4 px-4 py-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">คู่ถัดไปที่ควรจับตา</h3>
              </div>

              {upcomingFixture ? (
                <div className="rounded-2xl border border-border/70 bg-card/80 p-4 dark:border-white/8 dark:bg-black/20">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <Badge variant="outline">{upcomingFixture.stage}</Badge>
                    {statusBadge(upcomingFixture.status)}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <TeamChip name={upcomingFixture.homeTeam} flag={upcomingFixture.homeFlag} badge={upcomingFixture.homeBadge} />
                      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">vs</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <TeamChip name={upcomingFixture.awayTeam} flag={upcomingFixture.awayFlag} badge={upcomingFixture.awayBadge} />
                      <span className="text-xs text-muted-foreground">{formatMatchDate(upcomingFixture.date)}</span>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">{upcomingFixture.venue}</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-card/80 p-4 text-sm text-muted-foreground dark:border-white/10 dark:bg-black/20">
                  ยังไม่มีโปรแกรมถัดไปให้แสดง
                </div>
              )}

              <div className="rounded-2xl border border-primary/15 bg-primary/[0.05] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-primary/75">Editorial Flow</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  ส่วนนี้ถูกย่อให้เป็น score summary เพื่อให้ข่าวเด่นด้านบนของหน้าเป็นเนื้อหาหลักมากขึ้น
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
