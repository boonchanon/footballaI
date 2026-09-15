"use client"

import { type ReactNode, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import useSWR from "swr"
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  RefreshCw,
  Shield,
  Trophy,
} from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { PREMIER_LEAGUE_DATA_SEASON } from "@/lib/season"
import { cn } from "@/lib/utils"

const fetcher = (url: string) => fetch(url).then((res) => res.json())
const FIXTURES_REFRESH_INTERVAL_MS = 15000
const MATCH_DETAILS_REFRESH_INTERVAL_MS = 30000
const THAI_TIME_ZONE = "Asia/Bangkok"

type MatchStatus = "live" | "finished" | "upcoming"
type MatchFilter = "all" | MatchStatus
type DetailTab = "overview" | "events" | "statistics" | "lineups" | "standings"

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
  statusShort: string
  elapsed: number | null
  venue: string
}

type MatchEvent = {
  time?: { elapsed?: number | null }
  team?: { id?: string | number | null; name?: string | null }
  player?: { name?: string | null }
  assist?: { name?: string | null }
  type?: string | null
  detail?: string | null
}

type MatchStatistic = {
  type: string
  home: string | null
  away: string | null
}

type LineupSide = {
  formation?: string
  coach?: { name?: string }
  startXI?: Array<{ player?: { id?: number; name?: string; number?: number; pos?: string } }>
  substitutes?: Array<{ player?: { id?: number; name?: string; number?: number; pos?: string } }>
}

type LiveStreamSnapshot = {
  generatedAt?: string
  fixtures?: {
    live?: any[]
    upcoming?: any[]
    finished?: any[]
  }
  matchId?: string | null
  events?: MatchEvent[]
  lineups?: LineupSide[]
}

const fullDateFormatter = new Intl.DateTimeFormat("th-TH", {
  timeZone: THAI_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
})

const shortWeekdayFormatter = new Intl.DateTimeFormat("th-TH", {
  timeZone: THAI_TIME_ZONE,
  weekday: "short",
})

const shortDayMonthFormatter = new Intl.DateTimeFormat("th-TH", {
  timeZone: THAI_TIME_ZONE,
  day: "numeric",
  month: "short",
})

const timeFormatter = new Intl.DateTimeFormat("th-TH", {
  timeZone: THAI_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
})

function getThaiDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: THAI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const year = parts.find((part) => part.type === "year")?.value || "1970"
  const month = parts.find((part) => part.type === "month")?.value || "01"
  const day = parts.find((part) => part.type === "day")?.value || "01"

  return { year, month, day }
}

function startOfDay(date: Date) {
  const { year, month, day } = getThaiDateParts(date)
  return new Date(Number(year), Number(month) - 1, Number(day))
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function buildDateKey(date: Date) {
  const { year, month, day } = getThaiDateParts(date)
  return `${year}-${month}-${day}`
}

function buildFixtureWindow(centerDate: Date) {
  return {
    from: buildDateKey(addDays(centerDate, -3)),
    to: buildDateKey(addDays(centerDate, 3)),
  }
}

function buildDateLabel(targetDate: Date, now: Date) {
  const currentKey = buildDateKey(now)
  const targetKey = buildDateKey(targetDate)
  const current = parseDateKey(currentKey)
  const target = parseDateKey(targetKey)
  if (!current || !target) return fullDateFormatter.format(targetDate)
  const diffDays = Math.round((target.getTime() - current.getTime()) / 86400000)

  if (diffDays === 0) return "วันนี้"
  if (diffDays === 1) return "พรุ่งนี้"
  if (diffDays === -1) return "เมื่อวาน"
  return fullDateFormatter.format(targetDate)
}

function buildStatusLabel(status: MatchStatus) {
  if (status === "live") return "LIVE"
  if (status === "finished") return "Finished"
  return "ยังไม่แข่ง"
}

function buildStatusTone(status: MatchStatus) {
  if (status === "live") return "bg-red-500 text-white"
  if (status === "finished") return "bg-primary/15 text-primary"
  return "bg-muted text-muted-foreground"
}

function normalizeStatusShort(statusShort?: string) {
  return String(statusShort || "").trim().toLowerCase()
}

function buildMatchStatusLabel(status: MatchStatus, statusShort?: string) {
  const normalized = normalizeStatusShort(statusShort)

  if (status === "finished") return "จบ"
  if (status === "upcoming") return "ยังไม่แข่ง"

  if (normalized === "1" || normalized === "1h") return "ครึ่งแรก"
  if (normalized === "ht" || normalized.includes("half")) return "พักครึ่ง"
  if (normalized === "2" || normalized === "2h") return "ครึ่งหลัง"
  if (normalized === "et" || normalized === "aet") return "ต่อเวลา"
  if (normalized.includes("pen")) return "จุดโทษ"
  if (/^\d+$/.test(normalized) && Number(normalized) > 2) return `${normalized}'`

  return "LIVE"
}

function buildMatchStatusTone(status: MatchStatus, statusShort?: string) {
  const normalized = normalizeStatusShort(statusShort)
  if (status === "live") {
    if (normalized === "ht" || normalized.includes("half")) return "bg-amber-500 text-black"
    return "bg-red-500 text-white"
  }

  if (status === "finished") return "bg-primary/15 text-primary"
  return "bg-muted text-muted-foreground"
}

function formatScore(match: MatchItem) {
  if (match.status === "upcoming") return "vs"
  return `${match.homeScore ?? 0} - ${match.awayScore ?? 0}`
}

function normalizeEventType(type?: string | null) {
  const value = String(type || "").toLowerCase()
  if (value.includes("goal")) return "⚽"
  if (value.includes("card")) return "▰"
  if (value.includes("subst")) return "↔"
  return "•"
}

function getEventTeamSide(event: MatchEvent, match: MatchItem) {
  const eventTeamId = String(event.team?.id || "")
  const eventTeamName = String(event.team?.name || "")
  if (eventTeamId && eventTeamId === match.homeId) return "home"
  if (eventTeamId && eventTeamId === match.awayId) return "away"
  if (eventTeamName && eventTeamName === match.homeTeam) return "home"
  if (eventTeamName && eventTeamName === match.awayTeam) return "away"
  return "neutral"
}

export default function MatchesContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [selectedDateKey, setSelectedDateKey] = useState("")
  const [selectedMatchId, setSelectedMatchId] = useState("")
  const [matchFilter, setMatchFilter] = useState<MatchFilter>("all")
  const [activeTab, setActiveTab] = useState<DetailTab>("overview")
  const [streamSnapshot, setStreamSnapshot] = useState<LiveStreamSnapshot | null>(null)
  const requestedDateKey = searchParams.get("date")
  const initialWindowDate = parseDateKey(requestedDateKey || "") || new Date()
  const windowCenterDate = parseDateKey(selectedDateKey) || initialWindowDate
  const fixtureWindow = buildFixtureWindow(windowCenterDate)
  const upcomingFixturesUrl = `/api/football/fixtures?type=upcoming&from=${fixtureWindow.from}&to=${fixtureWindow.to}`
  const finishedFixturesUrl = `/api/football/fixtures?type=finished&from=${fixtureWindow.from}&to=${fixtureWindow.to}`
  const liveStreamUrl = `/api/football/live/stream?from=${fixtureWindow.from}&to=${fixtureWindow.to}`

  const { data: liveData, isLoading: liveLoading, mutate: mutateLive, error: liveError } = useSWR("/api/football/fixtures?type=live", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: FIXTURES_REFRESH_INTERVAL_MS,
    dedupingInterval: FIXTURES_REFRESH_INTERVAL_MS,
  })
  const { data: upcomingData, isLoading: upcomingLoading, mutate: mutateUpcoming, error: upcomingError } = useSWR(upcomingFixturesUrl, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: FIXTURES_REFRESH_INTERVAL_MS,
    dedupingInterval: FIXTURES_REFRESH_INTERVAL_MS,
  })
  const { data: finishedData, isLoading: finishedLoading, mutate: mutateFinished, error: finishedError } = useSWR(finishedFixturesUrl, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: FIXTURES_REFRESH_INTERVAL_MS * 2,
    dedupingInterval: FIXTURES_REFRESH_INTERVAL_MS,
  })
  const isLoading = liveLoading || upcomingLoading || finishedLoading
  const error = liveError || upcomingError || finishedError
  const mutateFixtures = () => Promise.all([mutateLive(), mutateUpcoming(), mutateFinished()])
  const { data: standingsData } = useSWR("/api/football/standings", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000,
  })

  useEffect(() => {
    const eventSource = new EventSource(`${liveStreamUrl}${selectedMatchId ? `&matchId=${selectedMatchId}` : ""}`)

    eventSource.addEventListener("snapshot", (event) => {
      try {
        setStreamSnapshot(JSON.parse((event as MessageEvent).data))
      } catch {}
    })

    return () => {
      eventSource.close()
    }
  }, [fixtureWindow.from, fixtureWindow.to, liveStreamUrl, selectedMatchId])

  const allFixtures: MatchItem[] = useMemo(() => {
    const now = new Date()
    const fixtureSources = [
      ...(Array.isArray(streamSnapshot?.fixtures?.live) ? streamSnapshot.fixtures.live : []),
      ...(Array.isArray(streamSnapshot?.fixtures?.upcoming) ? streamSnapshot.fixtures.upcoming : []),
      ...(Array.isArray(streamSnapshot?.fixtures?.finished) ? streamSnapshot.fixtures.finished : []),
      ...(Array.isArray(liveData?.data) ? liveData.data : []),
      ...(Array.isArray(upcomingData?.data) ? upcomingData.data : []),
      ...(Array.isArray(finishedData?.data) ? finishedData.data : []),
    ]
    const dedupedFixtures = Array.from(new Map(fixtureSources.map((fixture: any) => [String(fixture?.id ?? ""), fixture])).values())

    return dedupedFixtures
      .map((fixture: any) => {
        const fixtureDate = new Date(fixture.date)
        if (Number.isNaN(fixtureDate.getTime())) return null
        return {
          id: String(fixture.id ?? ""),
          round: fixture.roundNumber || 1,
          homeTeam: fixture.teams?.home?.name || "Home",
          awayTeam: fixture.teams?.away?.name || "Away",
          homeId: String(fixture.teams?.home?.id || ""),
          awayId: String(fixture.teams?.away?.id || ""),
          homeLogo: fixture.teams?.home?.logo || "",
          awayLogo: fixture.teams?.away?.logo || "",
          homeScore: fixture.goals?.home ?? null,
          awayScore: fixture.goals?.away ?? null,
          dateLabel: buildDateLabel(fixtureDate, now),
          timeLabel: timeFormatter.format(fixtureDate),
          isoDate: fixture.date,
          dateKey: buildDateKey(fixtureDate),
          status: fixture.status?.isLive ? "live" : fixture.status?.isFinished ? "finished" : "upcoming",
          statusShort: String(fixture.status?.short || ""),
          elapsed: Number.isFinite(Number(fixture.status?.elapsed)) ? Number(fixture.status.elapsed) : null,
          venue: fixture.venue?.name || "สนามแข่งขัน",
        } satisfies MatchItem
      })
      .filter(Boolean) as MatchItem[]
  }, [finishedData, liveData, streamSnapshot, upcomingData])

  const liveMatches = useMemo(() => allFixtures.filter((match) => match.status === "live"), [allFixtures])
  const hasLiveMatches = liveMatches.length > 0
  const fallbackDateKey = useMemo(() => {
    if (hasLiveMatches) return ""

    const upcomingMatch = allFixtures
      .filter((match) => match.status === "upcoming")
      .sort((left, right) => new Date(left.isoDate).getTime() - new Date(right.isoDate).getTime())[0]
    if (upcomingMatch) return upcomingMatch.dateKey

    const latestFinishedMatch = allFixtures
      .filter((match) => match.status === "finished")
      .sort((left, right) => new Date(right.isoDate).getTime() - new Date(left.isoDate).getTime())[0]
    return latestFinishedMatch?.dateKey || ""
  }, [allFixtures, hasLiveMatches])

  const matchesByDate = useMemo(() => {
    const grouped = new Map<string, MatchItem[]>()
    for (const match of allFixtures) {
      const list = grouped.get(match.dateKey) || []
      list.push(match)
      grouped.set(match.dateKey, list)
    }
    for (const [key, value] of grouped) {
      grouped.set(
        key,
        value.sort((a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime()),
      )
    }
    return grouped
  }, [allFixtures])

  useEffect(() => {
    const dateFromUrl = searchParams.get("date")
    const matchFromUrl = searchParams.get("match")
    if (dateFromUrl && parseDateKey(dateFromUrl)) setSelectedDateKey(dateFromUrl)
    if (matchFromUrl) setSelectedMatchId(matchFromUrl)
  }, [searchParams])

  useEffect(() => {
    if (!allFixtures.length) return

    if (hasLiveMatches) {
      const firstLiveDateKey = liveMatches[0]?.dateKey || buildDateKey(new Date())
      if (selectedDateKey !== firstLiveDateKey) {
        setSelectedDateKey(firstLiveDateKey)
      }
      return
    }

    if (selectedDateKey) return
    const todayKey = buildDateKey(new Date())
    const today = matchesByDate.has(todayKey) ? todayKey : ""
    const nextFixture = allFixtures.find((match) => new Date(match.isoDate) >= startOfDay(new Date()))
    setSelectedDateKey(today || nextFixture?.dateKey || fallbackDateKey || allFixtures[0]?.dateKey || todayKey)
  }, [allFixtures, fallbackDateKey, hasLiveMatches, liveMatches, matchesByDate, selectedDateKey])

  const effectiveDateKey = hasLiveMatches ? selectedDateKey || liveMatches[0]?.dateKey || fallbackDateKey : selectedDateKey || fallbackDateKey
  const selectedDate = parseDateKey(effectiveDateKey) || new Date()
  const selectedDateMatches = matchesByDate.get(effectiveDateKey) || []
  const filteredMatches = selectedDateMatches.filter((match) => matchFilter === "all" || match.status === matchFilter)

  useEffect(() => {
    if (!effectiveDateKey) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("date", effectiveDateKey)
    if (selectedMatchId) params.set("match", selectedMatchId)
    else params.delete("match")
    const next = `${pathname}?${params.toString()}`
    const current = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
    if (next !== current) router.replace(next, { scroll: false })
  }, [effectiveDateKey, pathname, router, searchParams, selectedMatchId])

  useEffect(() => {
    if (!selectedDateMatches.length) {
      setSelectedMatchId("")
      return
    }
    if (selectedMatchId && selectedDateMatches.some((match) => match.id === selectedMatchId)) return
    const preferred =
      selectedDateMatches.find((match) => match.status === "live") ||
      selectedDateMatches.find((match) => match.status === "upcoming") ||
      selectedDateMatches[0]
    setSelectedMatchId(preferred.id)
  }, [selectedDateMatches, selectedMatchId])

  const selectedMatch = selectedDateMatches.find((match) => match.id === selectedMatchId) || selectedDateMatches[0] || null
  const standings = standingsData?.data || []
  const totalMatchesLoaded = allFixtures.length
  const expectedMatches =
    Number(liveData?.expectedMatches || upcomingData?.expectedMatches || finishedData?.expectedMatches || 380) || 380
  const isCompleteSeason = Boolean(liveData?.isCompleteSeason || upcomingData?.isCompleteSeason || finishedData?.isCompleteSeason)

  const { data: eventsData, isLoading: eventsLoading } = useSWR(
    selectedMatch ? `/api/football/events/${selectedMatch.id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: selectedMatch?.status === "live" ? MATCH_DETAILS_REFRESH_INTERVAL_MS : 0,
      dedupingInterval: selectedMatch?.status === "live" ? MATCH_DETAILS_REFRESH_INTERVAL_MS : 300000,
    },
  )
  const { data: lineupsData, isLoading: lineupsLoading } = useSWR(
    selectedMatch ? `/api/football/lineups/${selectedMatch.id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: selectedMatch?.status === "live" ? MATCH_DETAILS_REFRESH_INTERVAL_MS : 0,
      dedupingInterval: selectedMatch?.status === "live" ? MATCH_DETAILS_REFRESH_INTERVAL_MS : 300000,
    },
  )
  const { data: statisticsData, isLoading: statisticsLoading } = useSWR(
    selectedMatch ? `/api/football/statistics/${selectedMatch.id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: selectedMatch?.status === "live" ? MATCH_DETAILS_REFRESH_INTERVAL_MS : 0,
      dedupingInterval: selectedMatch?.status === "live" ? MATCH_DETAILS_REFRESH_INTERVAL_MS : 300000,
    },
  )

  const events: MatchEvent[] = Array.isArray(streamSnapshot?.events) ? streamSnapshot.events : Array.isArray(eventsData?.data) ? eventsData.data : []
  const statistics: MatchStatistic[] = Array.isArray(statisticsData?.data) ? statisticsData.data : []
  const lineups: LineupSide[] = Array.isArray(streamSnapshot?.lineups)
    ? streamSnapshot.lineups
    : Array.isArray(lineupsData?.data)
      ? lineupsData.data
      : []
  const detailTabs: Array<{ key: DetailTab; label: string }> = [
    { key: "overview", label: "ภาพรวม" },
    { key: "events", label: "ไทม์ไลน์" },
    { key: "statistics", label: "สถิติ" },
    { key: "lineups", label: "ไลน์อัพ" },
    { key: "standings", label: "ตารางคะแนน" },
  ]

  useEffect(() => {
    if (detailTabs.some((item) => item.key === activeTab)) return
    setActiveTab("overview")
  }, [activeTab, detailTabs])

  const dateTabs = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(selectedDate, index - 3)
      const key = buildDateKey(date)
      return {
        key,
        date,
        day: shortWeekdayFormatter.format(date),
        label: shortDayMonthFormatter.format(date),
        matches: matchesByDate.get(key)?.length || 0,
      }
    })
  }, [matchesByDate, selectedDate])

  const selectedDateTitle = fullDateFormatter.format(selectedDate)
  const liveCount = selectedDateMatches.filter((match) => match.status === "live").length
  const upcomingCount = selectedDateMatches.filter((match) => match.status === "upcoming").length
  const finishedCount = selectedDateMatches.filter((match) => match.status === "finished").length

  const changeDate = (date: Date) => {
    setSelectedDateKey(buildDateKey(date))
    setSelectedMatchId("")
    setActiveTab("overview")
  }

  const selectMatch = (match: MatchItem) => {
    setSelectedDateKey(match.dateKey)
    setSelectedMatchId(match.id)
    setActiveTab("overview")
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="mx-auto max-w-[1540px] px-3 pb-10 pt-24 sm:px-4 md:px-6 lg:px-8 xl:pt-20">
        <header className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] border border-border bg-card text-primary shadow-[0_0_28px_rgba(184,255,0,0.08)] md:h-20 md:w-20 md:rounded-[24px]">
              <Trophy className="h-8 w-8 md:h-10 md:w-10" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Premier League</p>
              <h1 className="text-2xl font-black leading-tight tracking-normal text-foreground sm:text-3xl md:text-5xl">โปรแกรมพรีเมียร์ลีก</h1>
              <p className="mt-1 text-sm leading-6 text-muted-foreground md:mt-2 md:text-base">โปรแกรมและผลการแข่งขัน ฤดูกาล {PREMIER_LEAGUE_DATA_SEASON.labelLong}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center xl:justify-end">
            <Button variant="outline" className="h-11 rounded-[14px] border-border bg-card px-3 text-foreground hover:bg-accent-soft sm:h-12 sm:px-4">
              <CalendarDays className="mr-2 h-4 w-4" />
              {PREMIER_LEAGUE_DATA_SEASON.labelShort}
              <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground" />
            </Button>
            <Button onClick={() => void mutateFixtures()} disabled={isLoading} className="h-11 rounded-[14px] bg-primary px-3 font-bold text-primary-foreground hover:bg-primary/90 sm:h-12 sm:px-5">
              <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
              รีเฟรชข้อมูล
            </Button>
          </div>
        </header>

        <section className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex min-w-0 flex-1 items-center rounded-[14px] border border-border bg-card p-1 sm:p-2 lg:p-1">
            <button
              type="button"
              onClick={() => changeDate(addDays(selectedDate, -1))}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-muted text-foreground transition-colors hover:bg-accent-soft"
              aria-label="วันก่อนหน้า"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 [scrollbar-width:none] lg:grid lg:grid-cols-7 lg:overflow-hidden [&::-webkit-scrollbar]:hidden">
              {dateTabs.map((item) => {
                const active = item.key === effectiveDateKey
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => changeDate(item.date)}
                    className={cn(
                      "min-h-[58px] min-w-[86px] rounded-[10px] px-2 text-center transition-all sm:min-w-[104px] lg:min-w-0",
                      active
                        ? "bg-primary text-primary-foreground shadow-[0_12px_28px_rgba(184,255,0,0.18)]"
                        : "text-muted-foreground hover:bg-accent-soft hover:text-foreground",
                    )}
                    aria-pressed={active}
                  >
                    <span className="block text-xs font-semibold">{item.day}</span>
                    <span className="mt-1 block text-sm font-bold leading-tight">{item.label}</span>
                    <span className="mt-1 block text-[10px] leading-tight opacity-70">{item.matches ? `${item.matches} แมตช์` : "ไม่มีแมตช์"}</span>
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => changeDate(addDays(selectedDate, 1))}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-muted text-foreground transition-colors hover:bg-accent-soft"
              aria-label="วันถัดไป"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-12 w-full rounded-[14px] border-border bg-card px-5 text-foreground hover:bg-accent-soft xl:h-14 xl:w-auto">
                <CalendarDays className="mr-2 h-4 w-4" />
                ปฏิทิน
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto rounded-[18px] border-border bg-popover p-2 text-popover-foreground">
              <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && changeDate(date)} className="rounded-[14px]" />
            </PopoverContent>
          </Popover>
        </section>

        {error || liveData?.source === "error" || upcomingData?.source === "error" || finishedData?.source === "error" ? (
          <section className="mb-5 rounded-[18px] border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            โหลดโปรแกรมไม่สำเร็จจากผู้ให้บริการ กรุณาลองรีเฟรชอีกครั้ง
          </section>
        ) : null}

        {!isLoading ? (
          <section
            className={cn(
              "mb-5 rounded-[18px] border p-4 text-sm",
              isCompleteSeason ? "border-primary/25 bg-primary/10 text-foreground" : "border-amber-500/25 bg-amber-500/10 text-foreground",
            )}
          >
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:gap-x-5">
              <span>โหลดแล้ว {totalMatchesLoaded}/{expectedMatches} แมตช์</span>
              <span>กำลังแข่งวันนี้ {liveCount}</span>
              <span>ยังไม่แข่งวันนี้ {upcomingCount}</span>
              <span>จบแล้ววันนี้ {finishedCount}</span>
            </div>
          </section>
        ) : null}

        {isLoading ? (
          <section className="flex min-h-[560px] items-center justify-center rounded-[18px] border border-border bg-card">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">กำลังโหลดโปรแกรมการแข่งขัน...</span>
          </section>
        ) : (
          <section className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
            <aside className="rounded-[16px] border border-border bg-card p-3">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold">การแข่งขันวัน{selectedDateTitle}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{selectedDateMatches.length} แมตช์จากข้อมูล provider</p>
                </div>
                <Badge className="border-0 bg-primary/15 text-primary">{selectedDateMatches.length} แมตช์</Badge>
              </div>

              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                {[
                  ["all", "ทั้งหมด"],
                  ["live", "สด"],
                  ["upcoming", "ยังไม่แข่ง"],
                  ["finished", "จบแล้ว"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMatchFilter(key as MatchFilter)}
                    className={cn(
                      "h-9 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
                      matchFilter === key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted text-muted-foreground hover:bg-accent-soft hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {filteredMatches.length > 0 ? (
                  filteredMatches.map((match) => <MatchRow key={match.id} match={match} active={selectedMatch?.id === match.id} onSelect={() => selectMatch(match)} />)
                ) : (
                  <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[14px] border border-dashed border-border bg-muted/45 p-6 text-center">
                    <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground/50" />
                    <p className="font-semibold">ไม่มีแมตช์ในช่วงที่เลือก</p>
                    <p className="mt-1 text-sm text-muted-foreground">ลองเปลี่ยนวันหรือเลือกตัวกรองอื่น</p>
                  </div>
                )}
              </div>
            </aside>

            <section className="min-w-0 rounded-[16px] border border-border bg-card">
              {selectedMatch ? (
                <>
                  <SelectedMatchHeader match={selectedMatch} events={events} />

                  <div className="border-b border-border px-3 md:px-6">
                    <div className="flex gap-7 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {detailTabs.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setActiveTab(item.key)}
                          className={cn(
                            "relative h-11 shrink-0 text-sm font-bold transition-colors",
                            activeTab === item.key ? "text-primary" : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {item.label}
                          {activeTab === item.key ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" /> : null}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 md:p-4">
                    {activeTab === "overview" ? (
                      <OverviewPanel
                        match={selectedMatch}
                        allFixtures={allFixtures}
                        events={events}
                        eventsLoading={eventsLoading}
                      />
                    ) : null}
                    {activeTab === "events" ? <EventsPanel match={selectedMatch} events={events} /> : null}
                    {activeTab === "statistics" ? <StatisticsPanel match={selectedMatch} events={events} eventsLoading={eventsLoading} statistics={statistics} statisticsLoading={statisticsLoading} /> : null}
                    {activeTab === "lineups" ? <LineupsPanel match={selectedMatch} lineups={lineups} loading={lineupsLoading} /> : null}
                    {activeTab === "standings" ? <StandingsPanel standings={standings} selectedMatch={selectedMatch} /> : null}
                  </div>
                </>
              ) : (
                <div className="flex min-h-[560px] flex-col items-center justify-center p-8 text-center">
                  <Trophy className="mb-4 h-12 w-12 text-muted-foreground/40" />
                  <p className="text-lg font-bold">เลือกวันที่มีการแข่งขันเพื่อดูรายละเอียด</p>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">วันนี้ยังไม่มีข้อมูลแมตช์จาก provider หน้า detail จึงยังไม่แสดงคู่แข่งขัน</p>
                </div>
              )}
            </section>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}

function TeamLogo({ src, name, size = "md", className }: { src?: string; name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const dimensions = size === "lg" ? "h-20 w-20" : size === "sm" ? "h-9 w-9" : "h-12 w-12"
  const imageSize = size === "lg" ? 64 : size === "sm" ? 30 : 42

  return (
    <div className={cn("flex shrink-0 items-center justify-center rounded-full border border-border bg-muted p-2", dimensions, className)}>
      {src ? <Image src={src} alt={name} width={imageSize} height={imageSize} className="h-full w-full object-contain" /> : <Shield className="h-1/2 w-1/2 text-muted-foreground" />}
    </div>
  )
}

function MatchRow({ match, active, onSelect }: { match: MatchItem; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-[13px] border p-3 text-left transition-all",
        active ? "border-primary bg-primary/10 shadow-[0_0_0_1px_rgba(184,255,0,0.15)]" : "border-border bg-muted/35 hover:border-border-strong hover:bg-accent-soft",
      )}
    >
      <div className="grid grid-cols-[54px_1fr_auto] items-center gap-3">
        <div className="text-[13px]">
          <p className="font-semibold text-foreground">{match.timeLabel}</p>
          <Badge className={cn("mt-2 border-0 text-[10px]", buildMatchStatusTone(match.status, match.statusShort))}>{buildMatchStatusLabel(match.status, match.statusShort)}</Badge>
          {match.status === "live" && match.elapsed ? <p className="mt-1 text-xs text-primary">{match.elapsed}'</p> : null}
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <TeamLogo src={match.homeLogo} name={match.homeTeam} size="sm" />
              <span className="truncate font-semibold">{match.homeTeam}</span>
            </div>
            <span className="text-base font-black">{match.status === "upcoming" ? "vs" : match.homeScore ?? 0}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <TeamLogo src={match.awayLogo} name={match.awayTeam} size="sm" />
              <span className="truncate font-semibold">{match.awayTeam}</span>
            </div>
            <span className="text-base font-black">{match.status === "upcoming" ? "" : match.awayScore ?? 0}</span>
          </div>
        </div>

        <ChevronRight className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div className="mt-2.5 flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        <span className="truncate">{match.venue}</span>
      </div>
    </button>
  )
}

function SelectedMatchHeader({ match, events }: { match: MatchItem; events: MatchEvent[] }) {
  const scoringEvents = events.filter((event) => String(event.type || "").toLowerCase().includes("goal")).slice(0, 4)

  return (
    <div className="relative overflow-hidden border-b border-border p-4 md:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.18),transparent_38%),linear-gradient(180deg,hsl(var(--muted)/0.36),transparent)]" />
      <div className="relative z-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Trophy className="h-4 w-4 text-primary" />
            <span>Premier League {PREMIER_LEAGUE_DATA_SEASON.labelShort}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{match.venue}</span>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-5">
          <div className="min-w-0 text-center lg:text-right">
            <TeamLogo src={match.homeLogo} name={match.homeTeam} size="sm" className="mx-auto sm:h-12 sm:w-12 lg:ml-auto lg:mr-0" />
            <h2 className="mt-2 truncate text-sm font-black sm:text-lg">{match.homeTeam}</h2>
          </div>

          <div className="text-center">
            <Badge className={cn("mb-1 border-0 text-[10px] sm:mb-2 sm:text-xs", buildMatchStatusTone(match.status, match.statusShort))}>{buildMatchStatusLabel(match.status, match.statusShort)}</Badge>
            {match.status === "live" && match.elapsed ? <p className="text-sm font-semibold text-primary">{match.elapsed}'</p> : null}
            <div className="mt-1 text-3xl font-black tracking-normal sm:text-4xl md:text-6xl">{formatScore(match)}</div>
            <p className="mt-2 max-w-[132px] text-xs leading-5 text-muted-foreground sm:max-w-none sm:text-sm">{match.dateLabel} • {match.timeLabel}</p>
          </div>

          <div className="min-w-0 text-center lg:text-left">
            <TeamLogo src={match.awayLogo} name={match.awayTeam} size="sm" className="mx-auto sm:h-12 sm:w-12 lg:ml-0 lg:mr-auto" />
            <h2 className="mt-2 truncate text-sm font-black sm:text-lg">{match.awayTeam}</h2>
          </div>
        </div>

        {scoringEvents.length > 0 ? (
          <div className="mt-6 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            {scoringEvents.map((event, index) => (
              <div key={`${event.player?.name}-${index}`} className="rounded-[12px] border border-border bg-card/70 px-4 py-3">
                <span className="font-semibold text-foreground">{event.time?.elapsed ? `${event.time.elapsed}'` : "-"}</span>{" "}
                {event.player?.name || "Goal"} {event.assist?.name ? <span>(Assist: {event.assist.name})</span> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function OverviewPanel({
  match,
  allFixtures,
  events,
  eventsLoading,
}: {
  match: MatchItem
  allFixtures: MatchItem[]
  events: MatchEvent[]
  eventsLoading: boolean
}) {
  const eventStats = buildEventStatRows(match, events)
  const recentForms = buildRecentForms(match, allFixtures)
  const nextMatches = [
    { team: match.homeTeam, logo: match.homeLogo, match: findNextMatchForTeam(match, allFixtures, match.homeId) },
    { team: match.awayTeam, logo: match.awayLogo, match: findNextMatchForTeam(match, allFixtures, match.awayId) },
  ]

  return (
    <div className="grid gap-3 xl:grid-cols-[0.9fr_1fr_1fr]">
      <section className="rounded-[14px] border border-border bg-muted/35 p-4">
        <h3 className="text-base font-black">ข้อมูลการแข่งขัน</h3>
        <div className="mt-5 space-y-5 text-[13px]">
          <InfoBlock icon={<Trophy className="h-4 w-4" />} label="การแข่งขัน" value="Premier League" />
          <InfoBlock icon={<Shield className="h-4 w-4" />} label="ฤดูกาล" value={PREMIER_LEAGUE_DATA_SEASON.labelLong} />
          <InfoBlock icon={<CalendarDays className="h-4 w-4" />} label="วันที่" value={match.dateLabel} />
          <InfoBlock icon={<ClockIcon />} label="เวลาแข่งขัน" value={match.timeLabel} />
          <InfoBlock icon={<MapPin className="h-4 w-4" />} label="สนาม" value={match.venue} />
          <InfoBlock icon={<UserIcon />} label="ผู้ตัดสิน" value="ไม่มีข้อมูลจากผู้ให้บริการ" muted />
        </div>
      </section>

      <section className="rounded-[14px] border border-border bg-muted/35 p-4">
        <h3 className="text-base font-black">สถิติสำคัญ</h3>
        <div className="mt-5 space-y-4">
          {eventsLoading ? (
            <div className="flex min-h-[190px] items-center justify-center rounded-[12px] border border-border bg-card">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : eventStats.length > 0 ? (
            eventStats.map((row) => <EventStatBar key={row.label} row={row} />)
          ) : (
            <div className="flex min-h-[190px] flex-col items-center justify-center rounded-[12px] border border-dashed border-border bg-card/70 p-5 text-center">
              <p className="text-sm font-semibold">ยังไม่มีสถิติสำคัญจากผู้ให้บริการ</p>
              <p className="mt-2 text-sm text-muted-foreground">จะแสดงเฉพาะ goal, card และ substitution ที่ provider ส่งมาเท่านั้น</p>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <AiPredictionPendingCard match={match} />

        <div className="rounded-[14px] border border-border bg-muted/35 p-4">
          <h3 className="text-base font-black">ผลงาน 5 นัดล่าสุด</h3>
          <div className="mt-5 space-y-4">
            <FormRow team={match.homeTeam} logo={match.homeLogo} form={recentForms.home} />
            <FormRow team={match.awayTeam} logo={match.awayLogo} form={recentForms.away} />
          </div>
        </div>

        <div className="rounded-[14px] border border-border bg-muted/35 p-4">
          <h3 className="text-base font-black">แมตช์ถัดไป</h3>
          <div className="mt-4 space-y-3">
            {nextMatches.map((item) => (
              <NextMatchCard key={item.team} team={item.team} logo={item.logo} match={item.match} />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  )
}

function InfoBlock({ icon, label, value, muted = false }: { icon: ReactNode; label: string; value: string; muted?: boolean }) {
  return (
    <div className="grid grid-cols-[22px_1fr] gap-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div>
        <p className="text-muted-foreground">{label}</p>
        <p className={cn("mt-1 font-semibold leading-6", muted ? "text-muted-foreground" : "text-foreground")}>{value}</p>
      </div>
    </div>
  )
}

function AiPredictionPendingCard({ match }: { match: MatchItem }) {
  return (
    <div className="rounded-[14px] border border-primary/25 bg-primary/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black">AI ทำนายผล</h3>
          <p className="mt-1 text-xs text-muted-foreground">รอผลวิเคราะห์จากระบบ</p>
        </div>
        <Badge className="border-0 bg-primary/20 text-primary">Pending</Badge>
      </div>
      <div className="mt-4 rounded-[12px] border border-border bg-card/70 p-3 text-sm leading-6 text-muted-foreground">
        AI จะเติมผลทำนายสำหรับ {match.homeTeam} vs {match.awayTeam} เมื่อข้อมูลจาก provider และโมเดลพร้อมใช้งาน
      </div>
    </div>
  )
}

function buildEventStatRows(match: MatchItem, events: MatchEvent[]) {
  if (!events.length) return []

  const rows = [
    { label: "ประตู", home: 0, away: 0 },
    { label: "ใบเหลือง", home: 0, away: 0 },
    { label: "ใบแดง", home: 0, away: 0 },
    { label: "เปลี่ยนตัว", home: 0, away: 0 },
  ]

  for (const event of events) {
    const side = getEventTeamSide(event, match)
    if (side === "neutral") continue
    const type = String(event.type || "").toLowerCase()
    const detail = String(event.detail || "").toLowerCase()
    const target =
      type.includes("goal")
        ? rows[0]
        : detail.includes("red")
          ? rows[2]
          : type.includes("card") || detail.includes("yellow")
            ? rows[1]
            : type.includes("subst")
              ? rows[3]
              : null

    if (!target) continue
    target[side] += 1
  }

  return rows.filter((row) => row.home > 0 || row.away > 0)
}

function EventStatBar({ row }: { row: { label: string; home: number; away: number } }) {
  const total = Math.max(row.home + row.away, 1)
  const homePercent = Math.round((row.home / total) * 100)
  const awayPercent = 100 - homePercent

  return (
    <div>
      <div className="mb-2 grid grid-cols-[52px_1fr_52px] items-center gap-4 text-sm">
        <span className="text-lg font-black">{row.home}</span>
        <span className="text-center font-semibold text-muted-foreground">{row.label}</span>
        <span className="text-right text-lg font-black">{row.away}</span>
      </div>
      <div className="grid grid-cols-[1fr_1fr] overflow-hidden rounded-full bg-muted">
        <div className="flex justify-end bg-primary/20">
          <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(homePercent, row.home ? 12 : 0)}%` }} />
        </div>
        <div className="bg-foreground/10">
          <div className="h-2 rounded-full bg-foreground/70" style={{ width: `${Math.max(awayPercent, row.away ? 12 : 0)}%` }} />
        </div>
      </div>
    </div>
  )
}

function ProviderStatisticRow({ row }: { row: MatchStatistic }) {
  return (
    <div className="rounded-[12px] border border-border bg-card/80 p-4">
      <div className="grid grid-cols-[64px_1fr_64px] items-center gap-3 text-sm">
        <span className="text-lg font-black">{row.home || "-"}</span>
        <span className="text-center font-semibold text-muted-foreground">{row.type}</span>
        <span className="text-right text-lg font-black">{row.away || "-"}</span>
      </div>
    </div>
  )
}

function getTeamResult(match: MatchItem, teamId: string) {
  if (match.status !== "finished" || match.homeScore == null || match.awayScore == null) return null
  const isHome = match.homeId === teamId
  const teamScore = isHome ? match.homeScore : match.awayScore
  const opponentScore = isHome ? match.awayScore : match.homeScore
  if (teamScore > opponentScore) return "W"
  if (teamScore < opponentScore) return "L"
  return "D"
}

function buildRecentForms(match: MatchItem, fixtures: MatchItem[]) {
  const collect = (teamId: string) =>
    fixtures
      .filter((fixture) => fixture.id !== match.id && fixture.status === "finished" && (fixture.homeId === teamId || fixture.awayId === teamId))
      .sort((left, right) => new Date(right.isoDate).getTime() - new Date(left.isoDate).getTime())
      .map((fixture) => getTeamResult(fixture, teamId))
      .filter(Boolean)
      .slice(0, 5) as Array<"W" | "D" | "L">

  return {
    home: collect(match.homeId),
    away: collect(match.awayId),
  }
}

function FormRow({ team, logo, form }: { team: string; logo: string; form: Array<"W" | "D" | "L"> }) {
  return (
    <div className="grid grid-cols-[52px_1fr] items-center gap-4">
      <TeamLogo src={logo} name={team} size="md" />
      <div className="min-w-0">
        <p className="truncate font-bold">{team}</p>
        {form.length > 0 ? (
          <div className="mt-3 flex gap-2">
            {form.map((item, index) => (
              <span
                key={`${team}-${item}-${index}`}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-[7px] text-xs font-black text-white",
                  item === "W" ? "bg-green-600" : item === "D" ? "bg-yellow-500 text-slate-950" : "bg-red-600",
                )}
              >
                {item}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">ไม่มีข้อมูลฟอร์มล่าสุด</p>
        )}
      </div>
    </div>
  )
}

function findNextMatchForTeam(match: MatchItem, fixtures: MatchItem[], teamId: string) {
  const selectedTime = new Date(match.isoDate).getTime()
  return (
    fixtures
      .filter((fixture) => fixture.id !== match.id && fixture.status === "upcoming")
      .filter((fixture) => fixture.homeId === teamId || fixture.awayId === teamId)
      .sort((left, right) => Math.abs(new Date(left.isoDate).getTime() - selectedTime) - Math.abs(new Date(right.isoDate).getTime() - selectedTime))[0] || null
  )
}

function NextMatchCard({ team, logo, match }: { team: string; logo: string; match: MatchItem | null }) {
  if (!match) {
    return (
      <div className="rounded-[12px] border border-dashed border-border bg-card/70 p-3">
        <div className="flex items-center gap-3">
          <TeamLogo src={logo} name={team} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{team}</p>
            <p className="mt-1 text-xs text-muted-foreground">ยังไม่มีแมตช์ถัดไปจากข้อมูล provider</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[12px] border border-border bg-card p-3">
      <p className="mb-3 truncate text-xs font-semibold text-muted-foreground">ถัดไปของ {team}</p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
        <div className="flex justify-center">
          <TeamLogo src={match.homeLogo} name={match.homeTeam} size="sm" />
        </div>
        <div className="text-xs font-black uppercase text-muted-foreground">
          {match.homeTeam.slice(0, 3)} <span className="mx-1.5 text-foreground">vs</span> {match.awayTeam.slice(0, 3)}
        </div>
        <div className="flex justify-center">
          <TeamLogo src={match.awayLogo} name={match.awayTeam} size="sm" />
        </div>
      </div>
      <p className="mt-3 text-center text-sm font-semibold">{match.dateLabel}</p>
      <p className="mt-1 text-center text-xs text-muted-foreground">{match.timeLabel}</p>
      <p className="mt-2 truncate text-center text-xs text-muted-foreground">{match.venue}</p>
    </div>
  )
}

function EventsPanel({ match, events }: { match: MatchItem; events: MatchEvent[] }) {
  if (!events.length) {
    return (
      <EmptyDetailState
        title="ยังไม่มีไทม์ไลน์จากผู้ให้บริการ"
        description="เหตุการณ์จะปรากฏเมื่อ provider ส่ง goal, card หรือ substitution สำหรับแมตช์นี้"
      />
    )
  }

  return (
    <div className="space-y-3">
      {events.map((event, index) => {
        const side = getEventTeamSide(event, match)
        return (
          <div key={`${event.time?.elapsed}-${event.player?.name}-${index}`} className="grid grid-cols-[72px_1fr_72px] items-center gap-3 rounded-[14px] border border-border bg-muted/35 p-4">
            <div className="font-bold text-primary">{event.time?.elapsed ? `${event.time.elapsed}'` : "-"}</div>
            <div className={cn("rounded-[12px] border border-border bg-card p-3", side === "away" && "text-right")}>
              <p className="font-semibold">
                <span className="mr-2">{normalizeEventType(event.type)}</span>
                {event.player?.name || event.detail || event.type || "Match event"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{event.team?.name || "Provider event"}{event.assist?.name ? ` • ${event.assist.name}` : ""}</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">{side === "home" ? match.homeTeam : side === "away" ? match.awayTeam : ""}</div>
          </div>
        )
      })}
    </div>
  )
}

function StatisticsPanel({
  match,
  events,
  eventsLoading,
  statistics,
  statisticsLoading,
}: {
  match: MatchItem
  events: MatchEvent[]
  eventsLoading: boolean
  statistics: MatchStatistic[]
  statisticsLoading: boolean
}) {
  const eventStats = buildEventStatRows(match, events)
  const providerStats = statistics.filter((row) => row.type)

  if (eventsLoading || statisticsLoading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-[14px] border border-border bg-muted/35">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    )
  }

  if (!providerStats.length && !eventStats.length) {
    return (
      <EmptyDetailState
        title="ยังไม่มีสถิติจากผู้ให้บริการ"
        description="หน้านี้ไม่สร้าง possession, shots หรือ xG ปลอม จะแสดงเฉพาะข้อมูลจริงที่ provider ส่งมา"
      />
    )
  }

  return (
    <div className="mx-auto max-w-2xl rounded-[14px] border border-border bg-muted/35 p-5">
      <h3 className="text-base font-black">{providerStats.length ? "สถิติจากผู้ให้บริการ" : "สถิติจากเหตุการณ์จริง"}</h3>
      <div className="mt-5 space-y-4">
        {providerStats.length
          ? providerStats.map((row) => <ProviderStatisticRow key={row.type} row={row} />)
          : eventStats.map((row) => <EventStatBar key={row.label} row={row} />)}
      </div>
    </div>
  )
}

function LineupsPanel({ match, lineups, loading }: { match: MatchItem; lineups: LineupSide[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-[14px] border border-border bg-muted/35">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    )
  }

  if (!lineups.length) {
    return (
      <EmptyDetailState
        title="ยังไม่มีไลน์อัพจากผู้ให้บริการ"
        description="เมื่อ provider มี formation, starting XI หรือ substitutes ระบบจะแสดงในหมวดนี้"
      />
    )
  }

  const sides = [
    { team: match.homeTeam, logo: match.homeLogo, data: lineups[0] },
    { team: match.awayTeam, logo: match.awayLogo, data: lineups[1] },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {sides.map((side) => (
        <div key={side.team} className="rounded-[16px] border border-border bg-muted/35 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <TeamLogo src={side.logo} name={side.team} size="sm" />
              <div>
                <h3 className="font-bold">{side.team}</h3>
                <p className="text-sm text-muted-foreground">{side.data?.formation || "ไม่มีข้อมูลแผนการเล่น"}</p>
              </div>
            </div>
          </div>
          {side.data?.coach?.name ? <p className="mb-4 text-sm text-muted-foreground">Manager: {side.data.coach.name}</p> : null}
          <div className="space-y-2">
            {(side.data?.startXI || []).slice(0, 11).map((item, index) => (
              <div key={`${item.player?.name}-${index}`} className="flex items-center justify-between rounded-[10px] border border-border bg-card px-3 py-2 text-sm">
                <span className="min-w-0 truncate">{item.player?.name || "Player"}</span>
                <span className="ml-3 flex items-center gap-3 text-muted-foreground">
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs">{item.player?.number || "-"}</span>
                  <span>{item.player?.pos || "-"}</span>
                </span>
              </div>
            ))}
          </div>
          {(side.data?.substitutes || []).length ? (
            <div className="mt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Substitutes</p>
              <div className="space-y-2">
                {(side.data?.substitutes || []).map((item, index) => (
                  <div key={`${item.player?.name}-sub-${index}`} className="flex items-center justify-between rounded-[10px] border border-border/70 bg-background px-3 py-2 text-sm">
                    <span className="min-w-0 truncate">{item.player?.name || "Substitute"}</span>
                    <span className="ml-3 flex items-center gap-3 text-muted-foreground">
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs">{item.player?.number || "-"}</span>
                      <span>{item.player?.pos || "SUB"}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function EmptyDetailState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[14px] border border-dashed border-border bg-muted/35 p-6 text-center">
      <p className="text-base font-bold">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}

function StandingsPanel({ standings, selectedMatch }: { standings: any[]; selectedMatch: MatchItem }) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-border">
      {standings.slice(0, 12).map((item: any) => {
        const active = String(item?.team?.id || "") === selectedMatch.homeId || String(item?.team?.id || "") === selectedMatch.awayId
        return (
          <Link
            key={item.team.id}
            href="/standings"
            className={cn("grid grid-cols-[44px_1fr_auto_auto] items-center gap-3 border-b border-border px-4 py-3 text-sm last:border-0 hover:bg-accent-soft", active && "bg-primary/10")}
          >
            <span className="font-semibold text-muted-foreground">{item.rank}</span>
            <span className="flex min-w-0 items-center gap-3">
              <TeamLogo src={item.team.logo} name={item.team.name} size="sm" />
              <span className="truncate font-semibold">{item.team.name}</span>
            </span>
            <span className="text-muted-foreground">{item.all?.played || 0} นัด</span>
            <span className="font-black text-primary">{item.points} แต้ม</span>
          </Link>
        )
      })}
    </div>
  )
}
