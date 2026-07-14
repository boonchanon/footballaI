"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Brain,
  Loader2,
  ChevronRight,
  Calendar,
  Users,
  Zap,
  Shield,
  BarChart3,
  Play,
  Flame,
  Globe2,
  Newspaper,
  Trophy,
  Sparkles,
  Radar,
} from "lucide-react"
import { CompactStandings } from "@/components/compact-standings"
import { NewsFeed } from "@/components/news-feed"
import useSWR from "swr"
import Image from "next/image"
import { HeroBackground } from "@/components/hero-background"
import { WorldCupBanner } from "@/components/worldcup-banner"
import { WorldCupPopup } from "@/components/worldcup-popup"
import { getPageSourcePolicy } from "@/lib/content-sources"
import { PREMIER_LEAGUE_DATA_SEASON } from "@/lib/season"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const playerPhotoOverrides: Record<string, string> = {
  "1100": "/players/haaland.webp",
  "306": "/mohamed-salah-action.png",
  "18784": "/players/isak.jpg",
  "20574": "/players/palmer.webp",
}

function resolvePlayerPhoto(playerId?: string, fallbackPhoto?: string) {
  if (playerId && playerPhotoOverrides[playerId]) {
    return playerPhotoOverrides[playerId]
  }

  return fallbackPhoto || ""
}

export default function Home() {
  const sourcePolicy = getPageSourcePolicy("home")
  const { data: fixturesData } = useSWR("/api/football/fixtures?type=upcoming&limit=6", fetcher)
  const { data: topScorersData } = useSWR("/api/football/topscorers", fetcher)
  const { data: liveData } = useSWR("/api/football/fixtures?type=live", fetcher)
  const { data: aiSnapshotData } = useSWR("/api/football/ai-snapshot", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000,
  })

  const fixtures = fixturesData?.fixtures || []
  const liveMatches = liveData?.fixtures || []

  const upcomingMatches = fixtures.slice(0, 4).map((match: any) => ({
    home: match.homeTeamThai || match.homeTeam,
    away: match.awayTeamThai || match.awayTeam,
    time: match.dateThai || match.date,
    homeLogo: match.homeLogo,
    awayLogo: match.awayLogo,
    fixtureId: match.id,
    venue: match.venue || "สนามแข่งขัน",
  }))

  const scorers = topScorersData?.players || []
  const topScorers = scorers.slice(0, 5).map((player: any) => ({
    id: player.id,
    name: player.name,
    team: player.teamNameThai || player.teamName,
    goals: player.goals,
    photo: resolvePlayerPhoto(player.id, player.photo),
    teamLogo: player.teamLogo,
  }))

  const features = [
    {
      icon: Brain,
      title: "AI ทำนายผล",
      description: "ใช้หลายโมเดลช่วยประเมินเกม เพื่อให้มองภาพก่อนแข่งได้ไวขึ้นและมีเหตุผลมากขึ้น",
    },
    {
      icon: BarChart3,
      title: "สถิติเชิงลึก",
      description: "รวมตัวเลขสำคัญของทีมและนักเตะ เพื่อให้ดูฟอร์ม แนวโน้ม และความได้เปรียบของแต่ละคู่ได้ง่าย",
    },
    {
      icon: Zap,
      title: "อัปเดตรวดเร็ว",
      description: "ติดตามโปรแกรมแข่ง ผลการแข่งขัน และสัญญาณสำคัญของแต่ละเกมได้ในหน้าเดียว",
    },
    {
      icon: Shield,
      title: "ข้อมูลตรวจสอบได้",
      description: "แยกชัดว่าบล็อกไหนเป็นข้อมูลจริง บล็อกไหนเป็น AI Insight เพื่อให้หน้าเว็บดูน่าเชื่อถือขึ้น",
    },
  ]

  const featuredMatch = liveMatches[0] || fixtures[0] || null

  const quickAccessLinks = [
    {
      href: "/worldcup-2026",
      title: "World Cup 2026",
      description: "รวมข่าวเด่น โปรแกรม สกอร์ และประเด็นสำคัญของฟุตบอลโลกไว้ในฮับเดียว",
      icon: Globe2,
      badge: "Special Hub",
    },
    {
      href: "/ai-prediction",
      title: "AI Prediction",
      description: "เลือกคู่เด่นแล้วให้โมเดลช่วยวิเคราะห์ก่อนเกมแบบรวดเร็ว",
      icon: Brain,
      badge: "AI Layer",
    },
    {
      href: "/news",
      title: "Football News",
      description: "ข่าวจริงที่เรียบเรียงให้อ่านง่ายขึ้น พร้อมคัดหัวข้อที่ควรรู้ในแต่ละวัน",
      icon: Newspaper,
      badge: "Editorial",
    },
  ]

  const spotlightPanels = [
    {
      title: "คืนนี้น่าดูอะไร",
      body:
        aiSnapshotData?.summary ||
        "คัดคู่ที่น่าดูที่สุดจากโปรแกรมถัดไป พร้อมมุม AI สั้น ๆ เพื่อช่วยเลือกเกมที่ควรตาม",
      href: "/ai-football-live",
      cta: "ดู AI Snapshot",
      icon: Sparkles,
    },
    {
      title: "เรดาร์ทีมฟอร์มแรง",
      body: "เช็กทีมที่กำลังเร่งจังหวะขึ้นในตาราง และดูว่าใครกำลังมี momentum มากที่สุดในช่วงนี้",
      href: "/standings",
      cta: "ดูตารางคะแนน",
      icon: Radar,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <WorldCupPopup storageKey="footballai-worldcup-popup-home-seen" />
      <WorldCupBanner />
      <Navigation />

      <section className="relative flex min-h-[78vh] items-center overflow-hidden">
        <HeroBackground />

        <div className="container relative z-10 mx-auto max-w-[1320px] px-4 py-12 md:py-16">
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_480px] xl:grid-cols-[minmax(0,1fr)_520px]">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-medium text-primary backdrop-blur-sm md:text-sm">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                {PREMIER_LEAGUE_DATA_SEASON.marketingLabel}
              </div>

              <h1 className="text-4xl font-display leading-[0.98] tracking-tight text-foreground md:text-5xl xl:text-[5rem]">
                วิเคราะห์ฟุตบอล
                <br />
                <span className="text-primary">ด้วยพลัง AI</span>
              </h1>

              <p className="max-w-lg text-base leading-8 text-muted-foreground md:text-lg">
                แพลตฟอร์มฟุตบอลที่รวมบทวิเคราะห์ โปรแกรมแข่ง ตารางคะแนน และสถิติสำคัญไว้ในที่เดียว
                พร้อมเครื่องมือ AI สำหรับช่วยอ่านเกมให้เข้าใจง่ายขึ้น
              </p>

              <div className="flex flex-wrap gap-4">
                <Button asChild size="lg" className="h-11 rounded-lg px-5 shadow-lg shadow-primary/20">
                  <Link href="/ai-prediction" className="gap-2">
                    <Brain className="h-4 w-4" />
                    ทำนายผลด้วย AI
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-11 rounded-lg bg-background/50 px-5 backdrop-blur-sm">
                  <Link href="/matches" className="gap-2">
                    <Play className="h-4 w-4" />
                    ดูโปรแกรมแข่ง
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-border/50 pt-6 md:max-w-xl">
                <div>
                  <p className="text-2xl font-display text-primary md:text-3xl">93.7%</p>
                  <p className="text-xs text-muted-foreground md:text-sm">ความแม่นยำ AI</p>
                </div>
                <div>
                  <p className="text-2xl font-display text-primary md:text-3xl">50K+</p>
                  <p className="text-xs text-muted-foreground md:text-sm">ผู้ใช้งาน</p>
                </div>
                <div>
                  <p className="text-2xl font-display text-primary md:text-3xl">380+</p>
                  <p className="text-xs text-muted-foreground md:text-sm">แมตช์ต่อฤดูกาล</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 lg:max-w-[520px] lg:justify-self-end">
              {liveMatches.length > 0 && (
                <div className="mb-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-2 w-2 animate-live-pulse rounded-full bg-red-500" />
                    <span className="text-sm font-medium text-red-500">กำลังแข่งขันสด</span>
                  </div>
                  {liveMatches.slice(0, 1).map((match: any, i: number) => (
                    <Card key={i} className="border-red-500/50 bg-red-500/5 backdrop-blur-sm">
                      <CardContent className="p-3.5 md:p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {match.homeLogo && <Image src={match.homeLogo || "/placeholder.svg"} alt="" width={34} height={34} className="rounded-full" />}
                            <span className="text-sm font-semibold md:text-base">{match.homeTeamThai || match.homeTeam}</span>
                          </div>
                          <div className="text-xl font-bold md:text-2xl">
                            {match.homeScore ?? 0} - {match.awayScore ?? 0}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold md:text-base">{match.awayTeamThai || match.awayTeam}</span>
                            {match.awayLogo && <Image src={match.awayLogo || "/placeholder.svg"} alt="" width={34} height={34} className="rounded-full" />}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <Card className="border-border/50 bg-card/80 shadow-xl backdrop-blur-md">
                <CardContent className="p-5 md:p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">แมตช์ที่กำลังจะมาถึง</h3>
                    </div>
                    <Link href="/matches" className="text-sm text-primary hover:underline">
                      ดูทั้งหมด
                    </Link>
                  </div>

                  {aiSnapshotData?.summary ? (
                    <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between gap-3">
                        <span>
                          <span className="font-medium text-foreground">AI Snapshot:</span> {aiSnapshotData.summary}
                        </span>
                        <Link href="/ai-football-live" className="shrink-0 text-primary hover:underline">
                          ดู AI
                        </Link>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    {upcomingMatches.length > 0 ? (
                      upcomingMatches.map((match: any, i: number) => (
                        <Link key={i} href={`/ai-prediction?fixture=${match.fixtureId}`} className="block rounded-lg bg-muted/50 p-3.5 transition-colors hover:bg-muted">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex flex-1 items-center gap-2">
                              {match.homeLogo && <Image src={match.homeLogo || "/placeholder.svg"} alt="" width={24} height={24} className="rounded-full" />}
                              <span className="truncate text-sm font-medium">{match.home}</span>
                            </div>
                            <span className="px-2 text-xs text-muted-foreground">vs</span>
                            <div className="flex flex-1 items-center justify-end gap-2">
                              <span className="truncate text-sm font-medium">{match.away}</span>
                              {match.awayLogo && <Image src={match.awayLogo || "/placeholder.svg"} alt="" width={24} height={24} className="rounded-full" />}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{match.time}</span>
                            <span className="text-primary">ทำนายผล →</span>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="flex items-center justify-center py-8 text-muted-foreground">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        กำลังโหลด...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <Badge variant="outline" className="mb-3">
                Portal
              </Badge>
              <h2 className="text-3xl font-display md:text-4xl">เริ่มดูบอลจากจุดที่ใช่</h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                หน้าแรกควรพาไปต่อได้ทันที ทั้งคู่เด่น ข่าวเด่น และฮับคอนเทนต์ที่สำคัญที่สุดของเว็บ
              </p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {quickAccessLinks.map((item) => (
              <Link key={item.href} href={item.href} className="group">
                <Card className="h-full border-border/60 bg-card/80 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10">
                  <CardContent className="p-6">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <item.icon className="h-6 w-6" />
                      </div>
                      <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                        {item.badge}
                      </Badge>
                    </div>
                    <h3 className="text-xl font-semibold transition-colors group-hover:text-primary">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p>
                    <div className="mt-6 flex items-center gap-2 text-sm font-medium text-primary">
                      เข้าไปดู
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/20 py-16">
        <div className="container mx-auto px-4">
          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
            <Card className="overflow-hidden border-border/60 bg-card/90">
              <CardContent className="p-0">
                <div className="grid gap-0 md:grid-cols-[1.2fr_0.8fr]">
                  <div className="relative min-h-[320px] overflow-hidden">
                    <Image src="/hero-football.jpg" alt="Featured football story" fill className="object-cover transition-transform duration-700 hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-r from-background via-background/75 to-transparent" />
                    <div className="absolute inset-0 p-6 md:p-8">
                      <Badge className="mb-4 border-0 bg-primary text-primary-foreground">
                        <Flame className="mr-2 h-3.5 w-3.5" />
                        Featured Match
                      </Badge>
                      <div className="max-w-xl">
                        <h2 className="text-3xl font-display leading-tight md:text-4xl">
                          {featuredMatch
                            ? `${featuredMatch.homeTeamThai || featuredMatch.homeTeam} vs ${featuredMatch.awayTeamThai || featuredMatch.awayTeam}`
                            : "คู่เด่นประจำวัน"}
                        </h2>
                        <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">
                          {featuredMatch
                            ? "โฟกัสแมตช์เด่นจากโปรแกรมล่าสุด พร้อมทางลัดไปดูข้อมูลเกม ทำนายผล และอ่านภาพรวมก่อนแข่งในหน้าเดียว"
                            : "ถ้าไม่มีคู่สด ระบบจะหยิบโปรแกรมที่น่าสนใจที่สุดขึ้นมาเป็นหัวเรื่องของหน้าแรกแทน"}
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="rounded-full border border-border/60 px-3 py-1.5">{featuredMatch?.dateThai || featuredMatch?.date || "Upcoming"}</span>
                          <span className="rounded-full border border-border/60 px-3 py-1.5">{featuredMatch?.venue || "Match Center"}</span>
                        </div>
                        <div className="mt-6 flex flex-wrap gap-3">
                          <Button asChild className="rounded-full">
                            <Link href={featuredMatch ? `/matches/${featuredMatch.id}` : "/matches"}>ดูแมตช์นี้</Link>
                          </Button>
                          <Button asChild variant="outline" className="rounded-full bg-background/50">
                            <Link href={featuredMatch ? `/ai-prediction?fixture=${featuredMatch.id}` : "/ai-prediction"}>ทำนายก่อนเกม</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-6">
                    {spotlightPanels.map((panel) => (
                      <div key={panel.title} className="rounded-3xl border border-border/60 bg-background/70 p-5">
                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <panel.icon className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg font-semibold">{panel.title}</h3>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground">{panel.body}</p>
                        <Link href={panel.href} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                          {panel.cta}
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-5">
              <Card className="border-border/60 bg-card/90">
                <CardContent className="p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        Today
                      </Badge>
                      <h3 className="text-2xl font-display">Tonight Matches</h3>
                    </div>
                    <Link href="/matches" className="text-sm text-primary hover:underline">
                      ดูทั้งหมด
                    </Link>
                  </div>

                  <div className="space-y-3">
                    {upcomingMatches.slice(0, 3).map((match: any, index: number) => (
                      <Link
                        key={`${match.fixtureId}-${index}`}
                        href={`/ai-prediction?fixture=${match.fixtureId}`}
                        className="block rounded-2xl border border-border/60 bg-background/70 p-4 transition-colors hover:border-primary/40 hover:bg-background"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{match.home}</p>
                            <p className="truncate text-sm text-muted-foreground">{match.away}</p>
                          </div>
                          <Badge className="border-0 bg-primary/10 text-primary">Upcoming</Badge>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{match.time}</span>
                          <span>{match.venue}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/90">
                <CardContent className="p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        Signals
                      </Badge>
                      <h3 className="text-2xl font-display">What To Track</h3>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-primary" />
                        <p className="font-semibold">Race Watch</p>
                      </div>
                      <p className="text-sm leading-7 text-muted-foreground">ดูทีมลุ้นแชมป์และทีมที่กำลังไต่ฟอร์มขึ้นในช่วงโปรแกรมถัดไป</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Brain className="h-4 w-4 text-primary" />
                        <p className="font-semibold">AI Angle</p>
                      </div>
                      <p className="text-sm leading-7 text-muted-foreground">ใช้ prediction และ snapshot ช่วยเลือกคู่ที่น่าตามมากกว่าดูตารางแบบแห้ง ๆ</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <Badge variant="outline" className="mb-4">
              ฟีเจอร์
            </Badge>
            <h2 className="mb-4 text-3xl font-display md:text-4xl">ทำไมต้องเลือก FootballAI</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              เครื่องมือฟุตบอลที่รวมข้อมูลสำคัญไว้ครบ ทั้งสถิติ ข่าว โปรแกรมแข่ง และมุมวิเคราะห์จาก AI สำหรับใช้งานจริง
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, i) => (
              <Card key={i} className="group border-border/50 transition-colors hover:border-primary/50">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <Badge variant="outline" className="mb-2">
                สถิติ
              </Badge>
              <h2 className="text-3xl font-display md:text-4xl">ดาวซัลโวสูงสุด</h2>
            </div>
            <Link href="/players" className="flex items-center gap-1 text-sm text-primary hover:underline">
              ดูทั้งหมด
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {topScorers.length > 0 ? (
              topScorers.map((player: any, i: number) => (
                <Card key={i} className="overflow-hidden border-border/50 transition-colors hover:border-primary/50">
                  <div className="relative aspect-[4/5] bg-gradient-to-b from-muted via-muted/80 to-background">
                    {player.photo ? (
                      <Image
                        src={player.photo || "/placeholder.svg"}
                        alt={player.name}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                        className="object-contain object-top p-2"
                        unoptimized={player.photo?.startsWith("http")}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Users className="h-16 w-16 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background via-background/45 to-transparent" />
                    <div className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary font-display text-lg text-primary-foreground">
                      {i + 1}
                    </div>
                    <div className="absolute bottom-3 right-3 rounded-md bg-background/90 px-2 py-1 backdrop-blur-sm">
                      <span className="font-display text-xl text-primary">{player.goals}</span>
                      <span className="ml-1 text-[10px] text-muted-foreground">ประตู</span>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="truncate text-base font-semibold">{player.name}</h3>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {player.teamLogo && <Image src={player.teamLogo || "/placeholder.svg"} alt="" width={14} height={14} className="rounded-full" unoptimized={player.teamLogo?.startsWith("http")} />}
                      <span className="truncate">{player.team}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                กำลังโหลด...
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-border py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="mb-6 flex items-end justify-between">
                <div>
                  <Badge variant="outline" className="mb-2">
                    อัปเดต
                  </Badge>
                  <h2 className="text-3xl font-display md:text-4xl">ข่าวล่าสุด</h2>
                </div>
                <Link href="/news" className="flex items-center gap-1 text-sm text-primary hover:underline">
                  ดูทั้งหมด
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <NewsFeed />
            </div>

            <div>
              <div className="mb-6 flex items-end justify-between">
                <div>
                  <Badge variant="outline" className="mb-2">
                    อันดับ
                  </Badge>
                  <h2 className="text-3xl font-display md:text-4xl">ตารางคะแนน</h2>
                </div>
                <Link href="/standings" className="flex items-center gap-1 text-sm text-primary hover:underline">
                  ดูทั้งหมด
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <CompactStandings href="/standings" seasonLabel={PREMIER_LEAGUE_DATA_SEASON.labelShort} title="Premier League" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-primary/5 py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-display md:text-4xl">พร้อมเริ่มต้นวิเคราะห์ฟุตบอลแล้วหรือยัง?</h2>
          <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
            สมัครฟรีเพื่อเข้าถึงการทำนายผลด้วย AI สถิติเชิงลึก และข้อมูลสำคัญสำหรับตามฟุตบอลแบบจริงจัง
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="h-12 rounded-lg px-8 shadow-lg shadow-primary/20">
              <Link href="/register">สมัครสมาชิกฟรี</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-lg bg-transparent px-8">
              <Link href="/login">เข้าสู่ระบบ</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-muted/20 py-3">
        <div className="container mx-auto px-4">
          <p className="text-xs text-muted-foreground">Data policy: {sourcePolicy.notes}</p>
        </div>
      </section>

      <Footer />
    </div>
  )
}

