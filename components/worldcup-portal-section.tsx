"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo, useState } from "react"
import useSWR from "swr"
import { ArrowRight, Clock3, Newspaper, Sparkles, Target, Trophy } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type NewsArticle = {
  id: string
  title: string
  description?: string
  url: string
  image: string
  source: string
  timeAgo: string
  category?: string
}

type NewsResponse = {
  articles: NewsArticle[]
  lastUpdatedThai?: string
}

type ScoreCard = {
  id: string
  stage: string
  date: string
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  venue: string
  status: "live" | "finished" | "upcoming"
}

type ScoreResponse = {
  recentResults: ScoreCard[]
  upcomingFixtures: ScoreCard[]
}

type AiHubResponse = {
  recaps: Array<{
    title: string
    body: string
    matchLabel: string
    image: string
  }>
  preview: {
    title: string
    body: string
    kickoffLabel: string
  }
  insights: Array<{
    title: string
    body: string
    tag: string
  }>
}

type PortalTab = "news" | "headlines" | "scores" | "recaps" | "photos"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const topNavItems: Array<{ key: PortalTab; label: string }> = [
  { key: "news", label: "ข่าว" },
  { key: "headlines", label: "พาดหัว" },
  { key: "scores", label: "สกอร์" },
  { key: "recaps", label: "รีแคป" },
  { key: "photos", label: "ภาพ" },
]

function formatMatchDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value))
}

function categoryLabel(category?: string) {
  switch (category) {
    case "result":
      return "ผลการแข่งขัน"
    case "preview":
      return "พรีวิว"
    case "transfer":
      return "ขุมกำลัง"
    case "match":
      return "สถานการณ์ทีม"
    default:
      return "ข่าวเด่น"
  }
}

function statusText(status: ScoreCard["status"]) {
  if (status === "live") return "สด"
  if (status === "finished") return "จบ"
  return "โปรแกรม"
}

function PortalNavButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-b-2 pb-2 text-sm font-semibold uppercase tracking-[0.16em] transition-colors",
        active ? "border-primary text-primary" : "border-transparent text-foreground/72 hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

export function WorldcupPortalSection() {
  const [activeTab, setActiveTab] = useState<PortalTab>("news")

  const { data: newsData } = useSWR<NewsResponse>("/api/news?topic=worldcup", fetcher, {
    refreshInterval: 30 * 60 * 1000,
    revalidateOnFocus: false,
  })
  const { data: scoreData } = useSWR<ScoreResponse>("/api/worldcup/scores", fetcher, {
    refreshInterval: 15 * 60 * 1000,
    revalidateOnFocus: false,
  })
  const { data: aiData } = useSWR<AiHubResponse>("/api/worldcup/ai-hub", fetcher, {
    refreshInterval: 30 * 60 * 1000,
    revalidateOnFocus: false,
  })

  const featured = newsData?.articles?.[0]
  const headlines = newsData?.articles?.slice(1, 6) || []
  const latestNews = newsData?.articles?.slice(6, 10) || newsData?.articles?.slice(1, 5) || []
  const recapCards = aiData?.recaps?.slice(0, 3) || []
  const scoreCards = scoreData?.recentResults?.slice(0, 3) || []
  const photoCards = newsData?.articles?.slice(0, 8) || []
  const upcoming = scoreData?.upcomingFixtures?.[0]
  const insightCards = aiData?.insights?.slice(0, 3) || []

  const heroContent = useMemo(() => {
    switch (activeTab) {
      case "headlines":
        return {
          title: headlines[0]?.title || featured?.title || "พาดหัวฟุตบอลโลก",
          description:
            headlines[0]?.description || featured?.description || "สรุปพาดหัวสำคัญจากประเด็นบอลโลกล่าสุด",
          image: headlines[0]?.image || featured?.image || "/worldcup-2026-popup-bg.jpg",
          url: headlines[0]?.url || featured?.url || "#",
          badge: "พาดหัว",
          meta: headlines[0]?.timeAgo || newsData?.lastUpdatedThai || "อัปเดตล่าสุด",
        }
      case "scores":
        return {
          title: scoreCards[0]
            ? `${scoreCards[0].homeTeam} ${scoreCards[0].homeScore ?? "-"}-${scoreCards[0].awayScore ?? "-"} ${scoreCards[0].awayTeam}`
            : "ผลการแข่งขันเด่นฟุตบอลโลก",
          description: scoreCards[0]
            ? `${scoreCards[0].stage} ที่ ${scoreCards[0].venue} เป็นหนึ่งในเกมที่ควรหยิบมาพูดต่อ ทั้งในเชิงผลการแข่งขันและผลกระทบต่อทัวร์นาเมนต์`
            : "ติดตามผลเด่นและเกมสำคัญในรูปแบบที่อ่านเร็วและชัดเจน",
          image: recapCards[0]?.image || featured?.image || "/worldcup/trophy.jpg",
          url: "/worldcup-2026",
          badge: "สกอร์เด่น",
          meta: scoreCards[0] ? formatMatchDate(scoreCards[0].date) : "ผลล่าสุด",
        }
      case "recaps":
        return {
          title: recapCards[0]?.title || "AI Match Recap",
          description: recapCards[0]?.body || "สรุปเกมประวัติศาสตร์หลายปีของฟุตบอลโลกในมุมบทความที่อ่านง่ายขึ้น",
          image: recapCards[0]?.image || "/worldcup/trophy.jpg",
          url: "/worldcup-2026",
          badge: "รีแคป",
          meta: recapCards[0]?.matchLabel || "ฟุตบอลโลกคลาสสิก",
        }
      case "photos":
        return {
          title: "โฟโต้สตอรี่ฟุตบอลโลก",
          description: "รวมภาพประกอบจากข่าวและแมตช์สำคัญเพื่อให้หน้า World Cup ดูมีบรรยากาศแบบ sports portal มากขึ้น",
          image: photoCards[0]?.image || featured?.image || "/worldcup-2026-popup-bg.jpg",
          url: "/worldcup-2026",
          badge: "ภาพเด่น",
          meta: `${photoCards.length} ภาพล่าสุด`,
        }
      default:
        return {
          title: featured?.title || "ข่าวบอลโลกเด่น",
          description:
            featured?.description || "สรุปข่าวฟุตบอลโลกเด่นจากแหล่งข่าวจริง พร้อมภาษาไทยที่อ่านลื่นขึ้น",
          image: featured?.image || "/worldcup-2026-popup-bg.jpg",
          url: featured?.url || "#",
          badge: categoryLabel(featured?.category),
          meta: featured?.timeAgo || newsData?.lastUpdatedThai || "อัปเดตล่าสุด",
        }
    }
  }, [activeTab, featured, headlines, newsData?.lastUpdatedThai, photoCards, recapCards, scoreCards])

  return (
    <section className="border-t border-border bg-background py-10">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-[1280px] overflow-hidden rounded-[28px] border border-primary/15 bg-card shadow-[0_30px_80px_rgba(26,26,26,0.12)] dark:shadow-[0_30px_80px_rgba(0,0,0,0.32)]">
          <div className="border-b border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,247,0.94))] px-5 py-5 md:px-7 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.005))]">
            <div className="flex items-center gap-3">
              <span className="font-display text-4xl tracking-tight text-foreground">WORLD</span>
              <span className="font-display text-4xl tracking-tight text-primary">CUP</span>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-primary/80">
                2026
              </span>
            </div>
            <p className="mt-2 text-sm uppercase tracking-[0.18em] text-muted-foreground">
              ข่าว รีแคป โปรแกรม และเรื่องเด่นของฟุตบอลโลกในหน้าเดียว
            </p>
          </div>

          <div className="grid gap-0 xl:grid-cols-[1.6fr_0.82fr]">
            <div className="border-r border-primary/10">
              <div className="border-b border-primary/10 px-5 py-3 md:px-7">
                <div className="flex flex-wrap items-center gap-6">
                  {topNavItems.map((item) => (
                    <PortalNavButton key={item.key} active={activeTab === item.key} onClick={() => setActiveTab(item.key)}>
                      {item.label}
                    </PortalNavButton>
                  ))}
                </div>
              </div>

              <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
                <div className="border-b border-primary/10 p-5 md:p-7">
                  <div className="overflow-hidden rounded-[20px] border border-primary/10 bg-background">
                    <div className="relative aspect-[16/9]">
                      <Image
                        src={heroContent.image}
                        alt={heroContent.title}
                        fill
                        className="object-cover"
                        unoptimized={heroContent.image.startsWith("http")}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent dark:from-black dark:via-black/20" />
                      <div className="absolute inset-x-0 bottom-0 p-5">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <Badge className="border-0 bg-primary text-primary-foreground">{heroContent.badge}</Badge>
                          <Badge variant="secondary" className="border border-primary/15 bg-background/80 text-foreground">
                            เลือกจากหมวด
                          </Badge>
                        </div>
                        <h3 className="max-w-2xl text-2xl font-semibold text-foreground md:text-3xl dark:text-white">{heroContent.title}</h3>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground/80 md:text-base dark:text-white/80">{heroContent.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-primary/10 px-5 py-4 text-sm">
                      <span className="text-muted-foreground">{heroContent.meta}</span>
                      <a
                        href={heroContent.url}
                        target={heroContent.url.startsWith("http") ? "_blank" : undefined}
                        rel={heroContent.url.startsWith("http") ? "noreferrer" : undefined}
                        className="inline-flex items-center gap-2 font-medium text-primary"
                      >
                        อ่านต่อ
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="border-b border-primary/10 p-5 md:p-7">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">พาดหัวล่าสุด</h3>
                    <Badge variant="outline">API</Badge>
                  </div>
                  <div className="space-y-4">
                    {headlines.map((item) => (
                      <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block border-b border-border/60 pb-4 last:border-none last:pb-0"
                      >
                        <p className="text-xs text-muted-foreground">{item.timeAgo}</p>
                        <p className="mt-1 text-sm font-medium leading-6 transition-colors hover:text-primary">{item.title}</p>
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 p-5 md:grid-cols-2 md:p-7">
                {latestNews.slice(0, 2).map((item) => (
                  <Card key={item.id} className="overflow-hidden border-border/60 bg-background">
                    <div className="relative aspect-[16/10]">
                      <Image
                        src={item.image || "/worldcup-2026-popup-bg.jpg"}
                        alt={item.title}
                        fill
                        className="object-cover"
                        unoptimized={item.image?.startsWith("http")}
                      />
                    </div>
                    <CardContent className="space-y-3 p-4">
                      <p className="text-xs text-muted-foreground">{item.timeAgo}</p>
                      <h4 className="line-clamp-2 text-lg font-semibold">{item.title}</h4>
                      <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="border-t border-primary/10 p-5 md:p-7">
                <div className="mb-5 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">AI Match Recap</h3>
                </div>
                <div className="grid gap-5 lg:grid-cols-3">
                  {recapCards.map((recap) => (
                    <Card key={recap.title} className="overflow-hidden border-border/60 bg-background">
                      <div className="relative aspect-[16/10]">
                        <Image src={recap.image} alt={recap.title} fill className="object-cover" />
                      </div>
                      <CardContent className="space-y-3 p-4">
                        <Badge variant="outline">{recap.matchLabel}</Badge>
                        <h4 className="text-lg font-semibold leading-7">{recap.title}</h4>
                        <p className="line-clamp-5 text-sm leading-6 text-muted-foreground">{recap.body}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-background">
              <div className="border-b border-primary/10 p-5 md:p-7">
                <div className="mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">สกอร์และโปรแกรม</h3>
                </div>
                <div className="space-y-4">
                  {scoreCards.map((match) => (
                    <div key={match.id} className="rounded-2xl border border-border/60 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <Badge variant="outline">{match.stage}</Badge>
                        <Badge className="bg-primary/10 text-primary">{statusText(match.status)}</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{match.homeTeam}</span>
                          <span className="text-2xl font-semibold text-primary">{match.homeScore ?? "-"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{match.awayTeam}</span>
                          <span className="text-2xl font-semibold text-primary">{match.awayScore ?? "-"}</span>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">{match.venue}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-b border-primary/10 p-5 md:p-7">
                <div className="mb-4 flex items-center gap-2">
                  <Clock3 className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">แมตช์ถัดไป</h3>
                </div>
                {upcoming ? (
                  <div className="rounded-2xl border border-border/60 p-4">
                    <p className="text-sm text-muted-foreground">{upcoming.stage}</p>
                    <div className="mt-3 space-y-2 text-lg font-semibold">
                      <div>{upcoming.homeTeam}</div>
                      <div className="text-sm font-normal text-muted-foreground">vs</div>
                      <div>{upcoming.awayTeam}</div>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">{formatMatchDate(upcoming.date)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{upcoming.venue}</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    ยังไม่มีข้อมูลโปรแกรมถัดไป
                  </div>
                )}
              </div>

              <div className="border-b border-primary/10 p-5 md:p-7">
                <div className="mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">AI World Cup Insight</h3>
                </div>
                <div className="space-y-3">
                  {insightCards.map((insight) => (
                    <div key={insight.title} className="rounded-2xl border border-border/60 p-4">
                      <Badge variant="secondary" className="mb-3">
                        {insight.tag}
                      </Badge>
                      <h4 className="font-semibold">{insight.title}</h4>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{insight.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 md:p-7">
                <div className="mb-4 flex items-center gap-2">
                  <Newspaper className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">ภาพเด่น</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {photoCards.slice(0, 6).map((item) => (
                    <Link key={item.id} href={item.url} target="_blank" className="group block overflow-hidden rounded-2xl">
                      <div className="relative aspect-square">
                        <Image
                          src={item.image || "/worldcup-2026-popup-bg.jpg"}
                          alt={item.title}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          unoptimized={item.image?.startsWith("http")}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
