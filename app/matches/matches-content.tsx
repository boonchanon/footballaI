"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import useSWR from "swr"
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Loader2, MapPin, RefreshCw, Shield, Sparkles, Trophy } from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { PREMIER_LEAGUE_DATA_SEASON } from "@/lib/season"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type MatchStatus = "live" | "finished" | "upcoming"
type SidePanel = "detail" | "lineup" | "statistics" | "table"

type MatchItem = {
  id: string
  round: number
  homeTeam: string
  awayTeam: string
  homeId: string
  awayId: string
  homeLogo: string
  awayLogo: string
  homeScore: number | null
  awayScore: number | null
  dateLabel: string
  timeLabel: string
  isoDate: string
  dateKey: string
  status: MatchStatus
  venue: string
}

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  weekday: "short",
  day: "numeric",
  month: "short",
})

const fullDateFormatter = new Intl.DateTimeFormat("th-TH", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
})

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function buildDateLabel(targetDate: Date, now: Date) {
  const current = startOfDay(now)
  const target = startOfDay(targetDate)
  const diffDays = Math.round((target.getTime() - current.getTime()) / 86400000)

  if (diffDays === 0) return "วันนี้"
  if (diffDays === 1) return "พรุ่งนี้"
  if (diffDays === -1) return "เมื่อวาน"
  return fullDateFormatter.format(targetDate)
}

function buildDateKey(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function buildStatusLabel(status: MatchStatus) {
  if (status === "live") return "กำลังแข่ง"
  if (status === "finished") return "จบการแข่งขัน"
  return "ยังไม่แข่ง"
}

function buildStatRows(match: MatchItem) {
  const homeScore = match.homeScore ?? 0
  const awayScore = match.awayScore ?? 0
  const scoreBase = Math.max(homeScore + awayScore, 1)
  const homeMomentum = 50 + (homeScore - awayScore) * 10
  const awayMomentum = 100 - homeMomentum

  return [
    { label: "โมเมนตัม", home: Math.min(Math.max(homeMomentum, 12), 88), away: Math.min(Math.max(awayMomentum, 12), 88) },
    { label: "สัดส่วนประตู", home: Math.max(10, Math.round((homeScore / scoreBase) * 100)), away: Math.max(10, Math.round((awayScore / scoreBase) * 100)) },
    { label: "สถานะเกม", home: match.status === "live" ? 66 : match.status === "finished" ? 52 : 48, away: match.status === "live" ? 34 : match.status === "finished" ? 48 : 52 },
  ]
}

export default function MatchesContent() {
  const { data: allData, isLoading, mutate } = useSWR("/api/football/fixtures?type=all", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })
  const { data: standingsData } = useSWR("/api/football/standings", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000,
  })

  const allFixtures: MatchItem[] = useMemo(() => {
    const now = new Date()
    return (allData?.data || []).map((fixture: any) => {
      const fixtureDate = new Date(fixture.date)
      return {
        id: String(fixture.id ?? ""),
        round: fixture.roundNumber || 1,
        homeTeam: fixture.teams.home.name,
        awayTeam: fixture.teams.away.name,
        homeId: String(fixture.teams.home.id || ""),
        awayId: String(fixture.teams.away.id || ""),
        homeLogo: fixture.teams.home.logo || "",
        awayLogo: fixture.teams.away.logo || "",
        homeScore: fixture.goals.home ?? null,
        awayScore: fixture.goals.away ?? null,
        dateLabel: buildDateLabel(fixtureDate, now),
        timeLabel: fixtureDate.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
        isoDate: fixture.date,
        dateKey: buildDateKey(fixtureDate),
        status: fixture.status.isLive ? "live" : fixture.status.isFinished ? "finished" : "upcoming",
        venue: fixture.venue?.name || "สนามแข่งขัน",
      }
    })
  }, [allData])

  const dateOptions = useMemo(() => {
    const grouped = new Map<string, { key: string; date: Date; label: string; sublabel: string; matches: number }>()
    for (const match of allFixtures) {
      if (!grouped.has(match.dateKey)) {
        const date = new Date(match.isoDate)
        grouped.set(match.dateKey, {
          key: match.dateKey,
          date,
          label: buildDateLabel(date, new Date()),
          sublabel: dateFormatter.format(date),
          matches: 0,
        })
      }
      grouped.get(match.dateKey)!.matches += 1
    }

    return Array.from(grouped.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [allFixtures])

  const [selectedDateKey, setSelectedDateKey] = useState("")
  const [selectedMatchId, setSelectedMatchId] = useState("")
  const [activePanel, setActivePanel] = useState<SidePanel>("detail")

  useEffect(() => {
    if (!dateOptions.length) return
    if (selectedDateKey && dateOptions.some((item) => item.key === selectedDateKey)) return

    const preferred =
      dateOptions.find((item) => item.date >= startOfDay(new Date())) ||
      dateOptions[0]

    setSelectedDateKey(preferred.key)
  }, [dateOptions, selectedDateKey])

  const selectedDateMatches = useMemo(
    () =>
      allFixtures
        .filter((match) => match.dateKey === selectedDateKey)
        .sort((a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime()),
    [allFixtures, selectedDateKey],
  )

  useEffect(() => {
    if (!selectedDateMatches.length) return
    if (selectedMatchId && selectedDateMatches.some((match) => match.id === selectedMatchId)) return

    const preferredMatch =
      selectedDateMatches.find((match) => match.status === "live") ||
      selectedDateMatches.find((match) => match.status === "upcoming") ||
      selectedDateMatches[0]

    setSelectedMatchId(preferredMatch.id)
  }, [selectedDateMatches, selectedMatchId])

  const selectedMatch = selectedDateMatches.find((match) => match.id === selectedMatchId) || selectedDateMatches[0] || null

  const heroStatRows = selectedMatch ? buildStatRows(selectedMatch) : []
  const selectedDateLabel = dateOptions.find((item) => item.key === selectedDateKey)
  const liveCount = allFixtures.filter((match) => match.status === "live").length
  const upcomingCount = allFixtures.filter((match) => match.status === "upcoming").length
  const finishedCount = allFixtures.filter((match) => match.status === "finished").length
  const totalMatchesLoaded = allData?.totalMatches || 0
  const expectedMatches = allData?.expectedMatches || 380
  const availableRounds = allData?.rounds?.available || []
  const expectedRounds = allData?.rounds?.total || 38
  const isCompleteSeason = Boolean(allData?.isCompleteSeason)
  const selectedDateIndex = dateOptions.findIndex((item) => item.key === selectedDateKey)
  const visibleDateStart = selectedDateIndex <= 3 ? 0 : Math.max(0, Math.min(selectedDateIndex - 3, Math.max(0, dateOptions.length - 7)))
  const visibleDateOptions = dateOptions.slice(visibleDateStart, visibleDateStart + 7)
  const calendarSelectedDate = selectedDateLabel?.date
  const enabledCalendarDates = dateOptions.map((item) => item.date)
  const railMatches = useMemo(() => {
    const primary = selectedDateMatches
    const extras = allFixtures.filter((match) => match.dateKey !== selectedDateKey)
    const sortedExtras = [...extras].sort((a, b) => {
      const aDiff = Math.abs(new Date(a.isoDate).getTime() - new Date(selectedDateKey || a.dateKey).getTime())
      const bDiff = Math.abs(new Date(b.isoDate).getTime() - new Date(selectedDateKey || b.dateKey).getTime())
      return aDiff - bDiff
    })

    return [...primary, ...sortedExtras].slice(0, 8)
  }, [allFixtures, selectedDateKey, selectedDateMatches])
  const standings = (standingsData?.data || []).slice(0, 5)
  const quickPanelItems: Array<{ key: SidePanel; label: string }> = [
    { key: "detail", label: "รายละเอียดแมตช์" },
    { key: "lineup", label: "ไลน์อัป" },
    { key: "statistics", label: "สถิติ" },
    { key: "table", label: "ตารางคะแนน" },
  ]

  const DateCard = ({ item }: { item: (typeof dateOptions)[number] }) => {
    const isActive = item.key === selectedDateKey
    const dayName = item.date.toLocaleDateString("th-TH", { weekday: "short" })
    const dayNumber = item.date.getDate()

    return (
      <button
        type="button"
        onClick={() => setSelectedDateKey(item.key)}
        className={`flex min-h-[118px] min-w-[78px] flex-col items-center justify-between rounded-[999px] border px-3 py-4 text-center transition-all ${
          isActive
            ? "border-lime-300 bg-lime-300 text-slate-950 shadow-[0_16px_40px_rgba(190,242,100,0.35)]"
            : "border-white/10 bg-white/5 text-white hover:border-lime-300/40 hover:bg-white/10"
        }`}
        aria-pressed={isActive}
      >
        <div>
          <p className={`text-lg font-medium ${isActive ? "text-slate-800" : "text-white/78"}`}>{dayName}</p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-full text-2xl font-semibold ${
            isActive ? "bg-slate-950 text-white" : "border border-white/10 bg-black/20 text-white"
          }`}
        >
          {dayNumber}
        </div>
        <div className={`text-[11px] ${isActive ? "text-slate-700" : "text-white/45"}`}>{item.matches} แมตช์</div>
      </button>
    )
  }

  const MatchRailCard = ({ match }: { match: MatchItem }) => {
    const isActive = selectedMatch?.id === match.id
    const isSameDay = match.dateKey === selectedDateKey
    return (
      <button
        type="button"
        onClick={() => {
          if (!isSameDay) {
            setSelectedDateKey(match.dateKey)
          }
          setSelectedMatchId(match.id)
        }}
        className={`min-w-[230px] rounded-[28px] border p-4 text-left transition-all ${
          isActive
            ? "border-lime-300 bg-lime-300 text-slate-950 shadow-[0_16px_40px_rgba(190,242,100,0.35)]"
            : "border-white/10 bg-[#262626] text-white hover:border-lime-300/30 hover:bg-[#2d2d2d]"
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <Badge className={isActive ? "border-0 bg-slate-950/10 text-slate-800" : "border-0 bg-white/10 text-white/80"}>
            {isSameDay ? buildStatusLabel(match.status) : match.dateLabel}
          </Badge>
          <span className={`text-xs ${isActive ? "text-slate-700" : "text-white/55"}`}>{match.timeLabel}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              {match.homeLogo ? <Image src={match.homeLogo} alt={match.homeTeam} width={28} height={28} className="h-7 w-7 object-contain" /> : <Shield className="h-7 w-7" />}
              <span className="truncate text-sm font-medium">{match.homeTeam}</span>
            </div>
            <div className="mb-2 flex items-center gap-2">
              {match.awayLogo ? <Image src={match.awayLogo} alt={match.awayTeam} width={28} height={28} className="h-7 w-7 object-contain" /> : <Shield className="h-7 w-7" />}
              <span className="truncate text-sm font-medium">{match.awayTeam}</span>
            </div>
          </div>

          <div className="px-1 text-center">
            {match.status === "upcoming" ? (
              <div className="text-xl font-semibold">พบ</div>
            ) : (
              <div className="text-2xl font-bold">
                {match.homeScore} : {match.awayScore}
              </div>
            )}
          </div>

          <div className={`text-right text-xs ${isActive ? "text-slate-700" : "text-white/60"}`}>
            <p>รอบ {match.round}</p>
            <p className="mt-1 truncate">{match.venue}</p>
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-[#1f1f1f] text-white">
      <Navigation />

      <main className="pb-10 pt-16">
        <section className="border-b border-white/10 bg-[#1f1f1f]">
          <div className="mx-auto max-w-[1400px] px-4 py-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-lime-300 text-slate-950">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-white/55">ศูนย์รวมแมตช์</p>
                  <h1 className="text-2xl font-semibold md:text-3xl">โปรแกรมพรีเมียร์ลีก</h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge className="border-0 bg-lime-300 text-slate-950">{PREMIER_LEAGUE_DATA_SEASON.labelShort}</Badge>
                <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isLoading} className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white">
                  <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  รีเฟรช
                </Button>
              </div>
            </div>

            {!isLoading ? (
              <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${isCompleteSeason ? "border-lime-300/30 bg-lime-300/10 text-white" : "border-amber-400/25 bg-amber-400/10 text-white/88"}`}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span>ฤดูกาล {PREMIER_LEAGUE_DATA_SEASON.labelLong}</span>
                  <span>โหลดแล้ว {totalMatchesLoaded}/{expectedMatches} แมตช์</span>
                  <span>มีแล้ว {availableRounds.length}/{expectedRounds} สัปดาห์แข่งขัน</span>
                  <span>{isCompleteSeason ? "โปรแกรมครบทั้งฤดูกาลแล้ว" : "แหล่งข้อมูลยังไม่ครบ 380 แมตช์"}</span>
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {isLoading
                ? Array.from({ length: 7 }).map((_, index) => (
                    <Card key={index} className="min-w-[78px] rounded-[999px] border-white/10 bg-white/5">
                      <CardContent className="h-[118px] animate-pulse p-4" />
                    </Card>
                  ))
                : visibleDateOptions.map((item) => <DateCard key={item.key} item={item} />)}
              {!isLoading && dateOptions.length > 0 ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex min-h-[118px] min-w-[78px] flex-col items-center justify-center rounded-[999px] border border-white/10 bg-white/5 px-3 py-4 text-center text-white transition-all hover:border-lime-300/40 hover:bg-white/10"
                      aria-label="เปิดปฏิทินแมตช์"
                    >
                      <CalendarDays className="h-6 w-6 text-lime-300" />
                      <span className="mt-3 text-xs text-white/65">ปฏิทิน</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-auto rounded-3xl border-white/10 bg-[#262626] p-2 text-white">
                    <Calendar
                      mode="single"
                      selected={calendarSelectedDate}
                      onSelect={(date) => {
                        if (!date) return
                        const key = buildDateKey(date)
                        const matched = dateOptions.find((item) => item.key === key)
                        if (matched) {
                          setSelectedDateKey(matched.key)
                        }
                      }}
                      disabled={(date) => !enabledCalendarDates.some((item) => item.toDateString() === date.toDateString())}
                      className="rounded-2xl bg-transparent text-white"
                      classNames={{
                        month_caption: "text-white",
                        caption_label: "text-white",
                        weekday: "text-white/55",
                        outside: "text-white/25",
                        disabled: "text-white/20 opacity-100",
                      }}
                    />
                  </PopoverContent>
                </Popover>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-4 py-6">
          {isLoading ? (
            <Card className="rounded-[32px] border-white/10 bg-[#262626]">
              <CardContent className="flex min-h-[520px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-lime-300" />
                <span className="ml-3 text-white/70">กำลังโหลดโปรแกรมการแข่งขัน...</span>
              </CardContent>
            </Card>
          ) : !selectedMatch ? (
            <Card className="rounded-[32px] border-white/10 bg-[#262626]">
              <CardContent className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <CalendarDays className="mb-4 h-12 w-12 text-white/30" />
                <p className="text-lg font-medium">ไม่มีแมตช์ในวันที่เลือก</p>
                <p className="mt-2 max-w-md text-sm text-white/55">ลองเลือกวันอื่นจากแถบวันที่ด้านบน เพื่อดูโปรแกรมและเลือกแมตช์ที่ต้องการ</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="overflow-hidden rounded-[36px] border border-white/10 bg-[#262626]">
                <div className="grid xl:grid-cols-[1.35fr_0.75fr]">
                  <div className="relative overflow-hidden p-6 md:p-8">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(190,242,100,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_25%)]" />
                    <div className="relative z-10">
                      <div className="mb-6 flex flex-wrap items-center gap-3">
                        <Badge className="border-0 bg-lime-300 text-slate-950">{buildStatusLabel(selectedMatch.status)}</Badge>
                        <Badge variant="outline" className="border-white/15 bg-transparent text-white/75">
                          รอบ {selectedMatch.round}
                        </Badge>
                        <span className="text-sm text-white/55">{selectedDateLabel?.label || selectedMatch.dateLabel}</span>
                      </div>

                      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                        <div className="space-y-6">
                          <div>
                            <h2 className="max-w-xl text-4xl font-semibold leading-tight md:text-6xl">
                              เลือกดูฟุตบอล
                              <span className="text-lime-300"> แบบครบทุกแมตช์</span>
                            </h2>
                            <p className="mt-4 max-w-xl text-sm leading-7 text-white/65 md:text-base">
                              เลือกวันก่อน แล้วค่อยสลับไปดูคู่ที่สนใจได้ทันทีจากแถบแมตช์ด้านล่าง โดยไม่ต้องออกจากหน้านี้
                            </p>
                          </div>

                          <div className="rounded-[30px] border border-white/10 bg-black/20 p-5">
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                              <div className="text-center">
                                <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-white/5 p-3">
                                  {selectedMatch.homeLogo ? (
                                    <Image src={selectedMatch.homeLogo} alt={selectedMatch.homeTeam} width={56} height={56} className="h-14 w-14 object-contain" />
                                  ) : (
                                    <Shield className="h-12 w-12 text-white/50" />
                                  )}
                                </div>
                                <p className="text-lg font-semibold">{selectedMatch.homeTeam}</p>
                              </div>

                              <div className="text-center">
                                {selectedMatch.status === "upcoming" ? (
                                  <>
                                    <p className="text-sm text-white/55">{selectedMatch.timeLabel}</p>
                                    <p className="mt-1 text-4xl font-semibold text-lime-300">พบ</p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-sm text-white/55">{selectedMatch.timeLabel}</p>
                                    <div className="mt-1 flex items-center gap-3 text-5xl font-semibold">
                                      <span>{selectedMatch.homeScore}</span>
                                      <span className="text-white/35">:</span>
                                      <span>{selectedMatch.awayScore}</span>
                                    </div>
                                  </>
                                )}
                              </div>

                              <div className="text-center">
                                <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-white/5 p-3">
                                  {selectedMatch.awayLogo ? (
                                    <Image src={selectedMatch.awayLogo} alt={selectedMatch.awayTeam} width={56} height={56} className="h-14 w-14 object-contain" />
                                  ) : (
                                    <Shield className="h-12 w-12 text-white/50" />
                                  )}
                                </div>
                                <p className="text-lg font-semibold">{selectedMatch.awayTeam}</p>
                              </div>
                            </div>

                            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 border-t border-white/10 pt-4 text-sm text-white/55">
                              <span className="inline-flex items-center gap-2">
                                <Clock3 className="h-4 w-4" />
                                {selectedMatch.dateLabel} • {selectedMatch.timeLabel}
                              </span>
                              <span className="inline-flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {selectedMatch.venue}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="relative min-h-[360px] overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]">
                          <div className="absolute inset-0 flex items-end justify-center gap-4 px-4">
                            <div className="relative h-[85%] w-[46%]">
                              {selectedMatch.homeLogo ? (
                                <Image src={selectedMatch.homeLogo} alt={selectedMatch.homeTeam} fill className="object-contain opacity-90 drop-shadow-[0_20px_40px_rgba(0,0,0,0.45)]" />
                              ) : null}
                            </div>
                            <div className="relative h-[85%] w-[46%]">
                              {selectedMatch.awayLogo ? (
                                <Image src={selectedMatch.awayLogo} alt={selectedMatch.awayTeam} fill className="object-contain opacity-90 drop-shadow-[0_20px_40px_rgba(0,0,0,0.45)]" />
                              ) : null}
                            </div>
                          </div>
                          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#262626] to-transparent" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <aside className="border-t border-white/10 bg-[#202020] p-6 xl:border-l xl:border-t-0">
                    <div className="space-y-3">
                      {quickPanelItems.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setActivePanel(item.key)}
                          className={`h-12 w-full rounded-full border px-4 py-3 text-center text-sm transition-colors ${
                            activePanel === item.key
                              ? "border-lime-300 bg-lime-300 text-slate-950"
                              : "border-white/10 text-white/80 hover:border-lime-300/30 hover:bg-white/5"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                      {activePanel === "detail" ? (
                        <div className="space-y-5">
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-white/45">แมตช์ที่เลือก</p>
                            <div className="mt-4 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                {selectedMatch.homeLogo ? <Image src={selectedMatch.homeLogo} alt={selectedMatch.homeTeam} width={38} height={38} className="h-9 w-9 object-contain" /> : <Shield className="h-9 w-9" />}
                                <span className="text-sm font-medium">{selectedMatch.homeTeam}</span>
                              </div>
                              <div className="text-lg font-semibold">{selectedMatch.status === "upcoming" ? "พบ" : `${selectedMatch.homeScore} : ${selectedMatch.awayScore}`}</div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium">{selectedMatch.awayTeam}</span>
                                {selectedMatch.awayLogo ? <Image src={selectedMatch.awayLogo} alt={selectedMatch.awayTeam} width={38} height={38} className="h-9 w-9 object-contain" /> : <Shield className="h-9 w-9" />}
                              </div>
                            </div>
                            <div className="mt-4 grid gap-3 text-sm text-white/60">
                              <div className="flex items-center justify-between">
                                <span>เวลาแข่ง</span>
                                <span className="text-white">{selectedMatch.timeLabel}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>สนาม</span>
                                <span className="text-white">{selectedMatch.venue}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>รอบ</span>
                                <span className="text-white">รอบ {selectedMatch.round}</span>
                              </div>
                            </div>
                          </div>
                          <Link href={`/matches/${selectedMatch.id}`} className="block">
                            <Button className="h-11 w-full rounded-full bg-lime-300 text-slate-950 hover:bg-lime-200">เปิดหน้ารายละเอียดแมตช์</Button>
                          </Link>
                        </div>
                      ) : null}

                      {activePanel === "lineup" ? (
                        <div className="space-y-3">
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-white/45">ภาพรวมแมตช์</p>
                            <div className="mt-4 space-y-3">
                              <div className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-3">
                                <span className="text-sm text-white/65">สถานะ</span>
                                <Badge className="border-0 bg-lime-300 text-slate-950">{buildStatusLabel(selectedMatch.status)}</Badge>
                              </div>
                              <div className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-3">
                                <span className="text-sm text-white/65">วันที่</span>
                                <span className="text-sm text-white">{selectedMatch.dateLabel}</span>
                              </div>
                              <div className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-3">
                                <span className="text-sm text-white/65">เวลาแข่ง</span>
                                <span className="text-sm text-white">{selectedMatch.timeLabel}</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs leading-6 text-white/45">ถ้าต้องการดูไลน์อัปและรายละเอียดเต็มแบบเจาะลึก ให้กด `รายละเอียดแมตช์` เพื่อไปยังหน้ารายละเอียดแมตช์</p>
                        </div>
                      ) : null}

                      {activePanel === "statistics" ? (
                        <div className="space-y-5">
                          <div className="mb-5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {selectedMatch.homeLogo ? <Image src={selectedMatch.homeLogo} alt={selectedMatch.homeTeam} width={38} height={38} className="h-9 w-9 object-contain" /> : <Shield className="h-9 w-9" />}
                              <span className="text-sm font-medium">{selectedMatch.homeTeam}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">{selectedMatch.awayTeam}</span>
                              {selectedMatch.awayLogo ? <Image src={selectedMatch.awayLogo} alt={selectedMatch.awayTeam} width={38} height={38} className="h-9 w-9 object-contain" /> : <Shield className="h-9 w-9" />}
                            </div>
                          </div>

                          <div className="space-y-4">
                            {heroStatRows.map((row) => (
                              <div key={row.label}>
                                <div className="mb-1 flex items-center justify-between text-xs text-white/60">
                                  <span>{row.home}%</span>
                                  <span>{row.label}</span>
                                  <span>{row.away}%</span>
                                </div>
                                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                    <div className="h-full rounded-full bg-lime-300" style={{ width: `${row.home}%` }} />
                                  </div>
                                  <div className="h-2 w-2 rounded-full bg-white/30" />
                                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                    <div className="ml-auto h-full rounded-full bg-lime-300" style={{ width: `${row.away}%` }} />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {activePanel === "table" ? (
                        <div className="space-y-3">
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-white/45">อันดับบนตาราง</p>
                            <div className="mt-4 space-y-2">
                              {standings.length > 0 ? (
                                standings.map((team: any) => (
                                  <Link
                                    key={team.team.id}
                                    href="/standings"
                                    className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-3 text-sm hover:border-lime-300/30 hover:bg-white/5"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="w-5 text-white/55">{team.rank}</span>
                                      {team.team.logo ? <Image src={team.team.logo} alt={team.team.name} width={24} height={24} className="h-6 w-6 object-contain" /> : <Shield className="h-6 w-6" />}
                                      <span>{team.team.name}</span>
                                    </div>
                                    <span className="font-semibold text-lime-300">{team.points} แต้ม</span>
                                  </Link>
                                ))
                              ) : (
                                <p className="text-sm text-white/55">ยังไม่มีข้อมูลตารางคะแนน</p>
                              )}
                            </div>
                          </div>
                          <Link href="/standings" className="block">
                            <Button variant="outline" className="h-11 w-full rounded-full border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white">
                              เปิดตารางคะแนนเต็ม
                            </Button>
                          </Link>
                        </div>
                      ) : null}

                      <div className="mt-6 grid gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-white/45">วันที่ที่เลือก</p>
                          <p className="mt-2 text-base font-semibold">{selectedDateLabel?.label}</p>
                          <p className="mt-1 text-sm text-white/55">{selectedDateLabel?.sublabel}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-white/45">สรุปด่วน</p>
                          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                            <div>
                              <p className="text-lg font-semibold text-lime-300">{liveCount}</p>
                              <p className="text-xs text-white/55">กำลังแข่ง</p>
                            </div>
                            <div>
                              <p className="text-lg font-semibold text-lime-300">{upcomingCount}</p>
                              <p className="text-xs text-white/55">ยังไม่แข่ง</p>
                            </div>
                            <div>
                              <p className="text-lg font-semibold text-lime-300">{finishedCount}</p>
                              <p className="text-xs text-white/55">จบแล้ว</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>

              <div className="mt-6 rounded-[34px] border border-white/10 bg-[#3a3a3a] px-4 py-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-white/55">เลือกแมตช์ประจำวันและคู่ใกล้เคียง</p>
                    <h3 className="text-xl font-semibold">{selectedDateLabel?.label || "โปรแกรมแข่งขัน"}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <ChevronLeft className="h-4 w-4" />
                    เลื่อนดู
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-2">
                  {railMatches.map((match) => (
                    <MatchRailCard key={match.id} match={match} />
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <Card className="rounded-[28px] border-white/10 bg-[#262626] text-white">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300/15 text-lime-300">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <h4 className="text-lg font-semibold">เลือกดูตามวัน</h4>
                    <p className="mt-2 text-sm leading-7 text-white/60">เลือกวันจากแถบด้านบน แล้วระบบจะสลับแมตช์ทั้งหมดของวันนั้นให้ทันที</p>
                  </CardContent>
                </Card>

                <Card className="rounded-[28px] border-white/10 bg-[#262626] text-white">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300/15 text-lime-300">
                      <Clock3 className="h-5 w-5" />
                    </div>
                    <h4 className="text-lg font-semibold">สลับคู่ได้เร็ว</h4>
                    <p className="mt-2 text-sm leading-7 text-white/60">เปลี่ยนคู่ดูต่อจากแถบด้านล่างได้เลย ไม่ต้องรีเฟรชหน้าและไม่ต้องย้อนกลับ</p>
                  </CardContent>
                </Card>

                <Card className="rounded-[28px] border-white/10 bg-[#262626] text-white">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300/15 text-lime-300">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <h4 className="text-lg font-semibold">ต่อไปหน้าลึกได้ทันที</h4>
                    <p className="mt-2 text-sm leading-7 text-white/60">ถ้าต้องการข้อมูลเชิงลึกเพิ่มเติม ค่อยกด `รายละเอียดแมตช์` ไปยังหน้ารายละเอียดของคู่ที่เลือก</p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}
