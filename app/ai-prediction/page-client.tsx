"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import useSWR from "swr"
import {
  BrainCircuit,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Coins,
  Loader2,
  Lock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Wallet,
} from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthSession } from "@/hooks/use-auth-session"
import { backendFetcher, fetchJson } from "@/lib/api-client"
import { getDisplayTeamName } from "@/lib/premier-league-predictions"
import { cn } from "@/lib/utils"

type Fixture = {
  id: string
  roundNumber: number | null
  date: string
  venue: {
    name: string
    city?: string
  }
  status: {
    short?: string
    long?: string
    isUpcoming?: boolean
    isLive?: boolean
    isFinished?: boolean
  }
  teams: {
    home: { name: string; nameEn?: string; logo?: string }
    away: { name: string; nameEn?: string; logo?: string }
  }
  goals: {
    home: number | null
    away: number | null
  }
}

type FixturesResponse = {
  data: Fixture[]
  totalMatches: number
  expectedMatches: number
}

type CsvPrediction = {
  fixtureDate: string
  homeTeam: string
  awayTeam: string
  predictedResult: string
  confidence: number | null
  homeWin: number | null
  draw: number | null
  awayWin: number | null
  ensemblePredictedScore: string
  catboostPredictedScore: string
  xgboostPredictedScore: string
  poissonPredictedScore: string
}

type RevealedMap = Record<string, CsvPrediction>

type AccessEntitlement = {
  id: string
  productCode: string
  targetType: "credits" | "daypass"
  targetId: string
  active: boolean
  amount: number
  metadata?: {
    creditsLimit?: number | null
    remainingCredits?: number | null
    unlockedFixtureIds?: string[]
  }
}

type PaymentStateResponse = {
  promptpay: {
    id: string
    accountName: string
  }
  orders: Array<{
    id: string
    productCode: string
    targetType: string
    targetId: string
    status: string
  }>
  entitlements: AccessEntitlement[]
}

function formatThaiDate(dateValue: string) {
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date(dateValue))
}

function formatPercent(value: number | null) {
  if (value == null) return "-"
  const normalized = value <= 1 ? value * 100 : value
  return `${normalized.toFixed(0)}%`
}

function toPercentWidth(value: number | null) {
  if (value == null) return "0%"
  const normalized = value <= 1 ? value * 100 : value
  return `${Math.max(0, Math.min(100, normalized)).toFixed(0)}%`
}

function parseScorePair(value: string) {
  const match = value.match(/(\d+)\s*-\s*(\d+)/)
  if (!match) return { home: null, away: null }
  return { home: Number(match[1]), away: Number(match[2]) }
}

function getWinnerFromScore(home: number | null, away: number | null) {
  if (home == null || away == null) return null
  if (home > away) return "home"
  if (away > home) return "away"
  return "draw"
}

function getFinishedPredictionSummary(fixture: Fixture, prediction: CsvPrediction | null) {
  if (!prediction || !fixture.status.isFinished) return null

  const actualHome = fixture.goals.home
  const actualAway = fixture.goals.away
  const predictedScore = parseScorePair(prediction.ensemblePredictedScore)

  if (actualHome == null || actualAway == null || predictedScore.home == null || predictedScore.away == null) {
    return null
  }

  const actualWinner = getWinnerFromScore(actualHome, actualAway)
  const predictedWinner = getWinnerFromScore(predictedScore.home, predictedScore.away)
  const exactScore = actualHome === predictedScore.home && actualAway === predictedScore.away
  const winnerMatched = actualWinner != null && predictedWinner != null && actualWinner === predictedWinner

  if (exactScore && winnerMatched) {
    return {
      label: "ทายถูก สกอร์ตรง",
      detail: `ทำนาย ${predictedScore.home}-${predictedScore.away} และผลจริงจบ ${actualHome}-${actualAway}`,
      tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    }
  }

  if (winnerMatched) {
    return {
      label: "ทายทีมชนะถูก แต่สกอร์ไม่ตรง",
      detail: `ทำนาย ${predictedScore.home}-${predictedScore.away} แต่ผลจริงจบ ${actualHome}-${actualAway}`,
      tone: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    }
  }

  if (exactScore) {
    return {
      label: "สกอร์ตรง แต่ทิศทางผลไม่ตรง",
      detail: `สกอร์ที่ทำนายคือ ${predictedScore.home}-${predictedScore.away} ตรงกับผลจริง`,
      tone: "border-sky-400/30 bg-sky-400/10 text-sky-200",
    }
  }

  return {
    label: "ทายผิด",
    detail: `ทำนาย ${predictedScore.home}-${predictedScore.away} แต่ผลจริงจบ ${actualHome}-${actualAway}`,
    tone: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  }
}

function getStatusLabel(fixture: Fixture) {
  if (fixture.status.isFinished) return "จบ"
  if (fixture.status.isLive) return fixture.status.short ? `${fixture.status.short}'` : "สด"
  return "ล็อก"
}

function getStatusTone(fixture: Fixture) {
  if (fixture.status.isFinished) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  if (fixture.status.isLive) return "border-red-500/30 bg-red-500/10 text-red-300"
  return "border-white/10 bg-white/5 text-slate-300"
}

function getConfidenceTone(value: number | null) {
  if (value == null) return "text-muted-foreground"
  const normalized = value <= 1 ? value * 100 : value
  if (normalized >= 65) return "text-primary"
  if (normalized >= 50) return "text-amber-300"
  return "text-slate-400"
}

function SupportingModelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-base font-semibold text-white">{value || "-"}</span>
    </div>
  )
}

export default function AIPredictionPageClient() {
  const { token: authToken } = useAuthSession()
  const { data: fixturesData, isLoading: fixturesLoading, error: fixturesError } = useSWR<FixturesResponse>(
    "/football/fixtures?type=all&limit=380",
    backendFetcher,
  )

  const [paymentState, setPaymentState] = useState<PaymentStateResponse | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [selectedWeek, setSelectedWeek] = useState<number>(1)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [revealedPredictions, setRevealedPredictions] = useState<RevealedMap>({})
  const [revealLoadingId, setRevealLoadingId] = useState<string | null>(null)
  const [revealError, setRevealError] = useState<string | null>(null)
  const weekStripRef = useRef<HTMLDivElement | null>(null)

  const fixtures = fixturesData?.data ?? []

  const predictionMatches = useMemo(
    () =>
      fixtures
        .map((fixture, index) => ({
          fixture,
          week: fixture.roundNumber || Math.floor(index / 10) + 1,
        }))
        .sort((left, right) => new Date(left.fixture.date).getTime() - new Date(right.fixture.date).getTime()),
    [fixtures],
  )

  const weeks = useMemo(() => {
    const grouped = new Map<number, Fixture[]>()
    for (const item of predictionMatches) {
      const existing = grouped.get(item.week) || []
      existing.push(item.fixture)
      grouped.set(item.week, existing)
    }
    return Array.from(grouped.entries())
      .sort((left, right) => left[0] - right[0])
      .map(([week, matches]) => ({ week, matches }))
  }, [predictionMatches])

  useEffect(() => {
    if (!weeks.length) return
    if (!weeks.some((item) => item.week === selectedWeek)) {
      setSelectedWeek(weeks[0].week)
      setSelectedMatchId(weeks[0].matches[0]?.id || null)
      return
    }
    const activeWeek = weeks.find((item) => item.week === selectedWeek)
    if (activeWeek && !selectedMatchId) {
      setSelectedMatchId(activeWeek.matches[0]?.id || null)
    }
  }, [weeks, selectedWeek, selectedMatchId])

  useEffect(() => {
    if (!authToken) {
      setPaymentState(null)
      return
    }

    let cancelled = false

    async function loadPaymentState() {
      setPaymentLoading(true)
      setPaymentError(null)
      try {
        const data = await fetchJson<PaymentStateResponse>("/payments/me", {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        if (!cancelled) {
          setPaymentState(data)
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "โหลดข้อมูลเหรียญไม่สำเร็จ"
          setPaymentError(message)
        }
      } finally {
        if (!cancelled) {
          setPaymentLoading(false)
        }
      }
    }

    void loadPaymentState()

    return () => {
      cancelled = true
    }
  }, [authToken])

  const activeWeek = useMemo(() => weeks.find((item) => item.week === selectedWeek) || weeks[0] || null, [weeks, selectedWeek])
  const selectedFixture = useMemo(() => {
    const pool = activeWeek?.matches || fixtures
    return pool.find((fixture) => fixture.id === selectedMatchId) || pool[0] || null
  }, [activeWeek, fixtures, selectedMatchId])

  const activeEntitlements = paymentState?.entitlements ?? []
  const hasDayPass = activeEntitlements.some((item) => item.active && item.targetType === "daypass" && item.targetId === "prediction-access")
  const unlockedFixtureIds = Array.from(
    new Set(
      activeEntitlements.flatMap((item) =>
        item.active && item.targetType === "credits" && item.targetId === "prediction-access" && Array.isArray(item.metadata?.unlockedFixtureIds)
          ? item.metadata.unlockedFixtureIds
          : [],
      ),
    ),
  )
  const remainingCredits = activeEntitlements.reduce((sum, item) => {
    if (!item.active || item.targetType !== "credits" || item.targetId !== "prediction-access") return sum
    return sum + (typeof item.metadata?.remainingCredits === "number" ? item.metadata.remainingCredits : 0)
  }, 0)
  const totalCreditLimit = activeEntitlements.reduce((sum, item) => {
    if (!item.active || item.targetType !== "credits" || item.targetId !== "prediction-access") return sum
    return sum + (typeof item.metadata?.creditsLimit === "number" ? item.metadata.creditsLimit : 0)
  }, 0)
  const accessibleMatchesCount = hasDayPass ? (fixturesData?.totalMatches || fixtures.length) : unlockedFixtureIds.length

  const selectedPrediction = selectedFixture ? revealedPredictions[selectedFixture.id] ?? null : null
  const selectedUnlocked = selectedFixture ? hasDayPass || unlockedFixtureIds.includes(selectedFixture.id) || Boolean(revealedPredictions[selectedFixture.id]) : false
  const finishedSummary = selectedFixture ? getFinishedPredictionSummary(selectedFixture, selectedPrediction) : null

  async function refreshPaymentState() {
    if (!authToken) return
    try {
      const data = await fetchJson<PaymentStateResponse>("/payments/me", {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      setPaymentState(data)
    } catch {}
  }

  async function handleReveal(fixture: Fixture) {
    if (!authToken) {
      setRevealError("กรุณาเข้าสู่ระบบก่อนดูผลทำนาย")
      return
    }

    if (revealedPredictions[fixture.id]) {
      setRevealError(null)
      return
    }

    setRevealLoadingId(fixture.id)
    setRevealError(null)

    try {
      const response = await fetchJson<{ prediction: CsvPrediction }>("/ai-prediction/reveal", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          fixtureId: fixture.id,
          fixtureDate: fixture.date.slice(0, 10),
          homeTeam: getDisplayTeamName(fixture.teams.home.nameEn || fixture.teams.home.name),
          awayTeam: getDisplayTeamName(fixture.teams.away.nameEn || fixture.teams.away.name),
          homeName: getDisplayTeamName(fixture.teams.home.name),
          awayName: getDisplayTeamName(fixture.teams.away.name),
        }),
      })

      setRevealedPredictions((current) => ({ ...current, [fixture.id]: response.prediction }))
      await refreshPaymentState()
    } catch (error) {
      const message = error instanceof Error ? error.message : "ปลดล็อกผลทำนายไม่สำเร็จ"
      if (/prediction_locked/i.test(message)) {
        setRevealError("เหรียญไม่พอ คู่นี้ยังถูกล็อกอยู่")
      } else {
        setRevealError(message)
      }
    } finally {
      setRevealLoadingId(null)
    }
  }

  const scrollWeekStrip = (direction: "left" | "right") => {
    const element = weekStripRef.current
    if (!element) return
    const offset = Math.max(element.clientWidth * 0.72, 240)
    element.scrollBy({ left: direction === "left" ? -offset : offset, behavior: "smooth" })
  }

  const loading = fixturesLoading
  const errorMessage = (fixturesError as Error | undefined)?.message || ""

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(184,255,0,0.10),transparent_22%),linear-gradient(180deg,#060a0b_0%,#091114_45%,#05080a_100%)] text-foreground">
      <Navigation />

      <section className="border-b border-white/8">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <Badge className="mb-5 border-primary/30 bg-primary/10 text-primary hover:bg-primary/10">
            <BrainCircuit className="mr-2 h-3.5 w-3.5" />
            Premier League AI Prediction
          </Badge>

          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="text-4xl font-display leading-tight text-white md:text-6xl">
                ทายผลพรีเมียร์ลีก
                <span className="block text-primary">ทุกคู่ถูกล็อกด้วยเหรียญ</span>
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
                เลือกสัปดาห์ เลือกคู่ แล้วใช้เหรียญปลดล็อกผลทำนายรายคู่ ระบบจะจำสิทธิ์ของคู่ที่เคยเปิดไว้ให้ดูซ้ำได้
              </p>
            </div>

            <Card className="border-primary/20 bg-[linear-gradient(135deg,rgba(184,255,0,0.08),rgba(255,255,255,0.02))] text-white">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Coin Wallet</p>
                    <p className="mt-2 text-4xl font-black text-primary">{hasDayPass ? "Full" : remainingCredits}</p>
                    <p className="mt-2 text-sm text-slate-300">
                      {hasDayPass ? "คุณมีแพ็กปลดล็อกทั้งรายการ ดูได้ทุกคู่" : authToken ? `เหรียญทั้งหมด ${totalCreditLimit} เหลือใช้ ${remainingCredits}` : "ล็อกอินเพื่อดูเหรียญคงเหลือ"}
                    </p>
                  </div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <Coins className="h-6 w-6" />
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{hasDayPass ? "เข้าถึงได้" : "ปลดล็อกแล้ว"}</p>
                    <p className="mt-2 text-2xl font-black">{accessibleMatchesCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">ทั้งฤดูกาล</p>
                    <p className="mt-2 text-2xl font-black">{fixturesData?.totalMatches || fixtures.length}/380</p>
                  </div>
                </div>

                <Button asChild className="mt-5 h-12 w-full rounded-full bg-primary font-black text-primary-foreground hover:bg-primary/90">
                  <Link href="/payment">
                    ซื้อเหรียญเพิ่ม
                    <Wallet className="ml-2 h-4 w-4" />
                  </Link>
                </Button>

                {paymentError ? <p className="mt-3 text-sm text-rose-300">{paymentError}</p> : null}
                {paymentLoading ? <p className="mt-3 text-sm text-slate-400">กำลังโหลดกระเป๋าเหรียญ...</p> : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8 md:py-10">
        {loading ? (
          <div className="flex min-h-[55vh] items-center justify-center">
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-slate-200 backdrop-blur-sm">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              กำลังโหลดบอร์ดทำนาย...
            </div>
          </div>
        ) : errorMessage ? (
          <Card className="border-red-500/20 bg-red-500/10 text-red-100">
            <CardContent className="p-6">
              <p className="text-lg font-semibold">โหลดหน้าทำนายไม่สำเร็จ</p>
              <p className="mt-2 text-sm text-red-100/80">{errorMessage}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <section className="rounded-[30px] border border-white/10 bg-[#091114] p-4 md:p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-300">เลือกสัปดาห์การแข่งขัน</p>
                  <p className="mt-1 text-xs text-slate-500">ทุกคู่ในหน้านี้ต้องใช้เหรียญปลดล็อกก่อนดูผลทำนาย</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="icon" onClick={() => scrollWeekStrip("left")} className="rounded-full border-white/10 bg-white/[0.03]">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" onClick={() => scrollWeekStrip("right")} className="rounded-full border-white/10 bg-white/[0.03]">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div ref={weekStripRef} className="grid auto-cols-[190px] grid-flow-col gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {weeks.map((item) => (
                  <button
                    key={item.week}
                    type="button"
                    onClick={() => {
                      setSelectedWeek(item.week)
                      setSelectedMatchId(item.matches[0]?.id || null)
                    }}
                    className={cn(
                      "rounded-[24px] border px-4 py-4 text-left transition",
                      item.week === selectedWeek
                        ? "border-primary bg-primary text-[#09110b] shadow-[0_0_0_1px_rgba(184,255,0,0.14)]"
                        : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/20 hover:bg-white/[0.05]",
                    )}
                  >
                    <p className="text-[11px] uppercase tracking-[0.22em] opacity-65">Week</p>
                    <p className="mt-2 text-[30px] font-semibold leading-none">{item.week}</p>
                    <p className="mt-3 text-sm opacity-75">{item.matches.length} คู่</p>
                  </button>
                ))}
              </div>
            </section>

            <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
              <Card className="overflow-hidden border-white/10 bg-[#0b1316] text-white">
                <CardHeader className="border-b border-white/8 pb-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-2xl">{activeWeek ? `สัปดาห์ ${activeWeek.week}` : "รายการแข่งขัน"}</CardTitle>
                      <p className="mt-1 text-sm text-slate-400">เลือกแมตช์ทางซ้ายเพื่อดูผลทำนายของคู่นั้น</p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300">
                      {(activeWeek?.matches || []).length} matches
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 p-4 md:p-5">
                  {(activeWeek?.matches || []).map((fixture) => {
                    const selected = selectedFixture?.id === fixture.id
                    const isUnlocked = hasDayPass || unlockedFixtureIds.includes(fixture.id) || Boolean(revealedPredictions[fixture.id])
                    const isBusy = revealLoadingId === fixture.id

                    return (
                      <button
                        key={fixture.id}
                        type="button"
                        onClick={() => setSelectedMatchId(fixture.id)}
                        className={cn(
                          "w-full rounded-[28px] border p-4 text-left transition",
                          selected
                            ? "border-primary bg-[linear-gradient(135deg,rgba(184,255,0,0.14),rgba(24,32,16,0.92))]"
                            : "border-white/10 bg-white/[0.03] hover:border-primary/35 hover:bg-white/[0.05]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="mb-3 flex items-center gap-2">
                              <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", getStatusTone(fixture))}>
                                {getStatusLabel(fixture)}
                              </span>
                              <span
                                className={cn(
                                  "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                                  isUnlocked
                                    ? "border-primary/25 bg-primary/10 text-primary"
                                    : "border-amber-400/20 bg-amber-400/10 text-amber-200",
                                )}
                              >
                                {isUnlocked ? "ปลดล็อกแล้ว" : "ล็อก 1 เหรียญ"}
                              </span>
                            </div>

                            <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-3">
                              <img src={fixture.teams.home.logo || "/placeholder.svg"} alt={fixture.teams.home.name} className="h-11 w-11 rounded-full border border-white/10 bg-white/5 object-contain p-1.5" />
                              <div className="min-w-0">
                                <p className="truncate text-base font-semibold text-white">{getDisplayTeamName(fixture.teams.home.nameEn || fixture.teams.home.name)}</p>
                                {fixture.goals.home != null ? <p className="text-xs text-slate-400">Score {fixture.goals.home}</p> : null}
                              </div>
                              <div className="text-center text-sm font-black text-primary">VS</div>
                              <div className="min-w-0 text-right">
                                <p className="truncate text-base font-semibold text-white">{getDisplayTeamName(fixture.teams.away.nameEn || fixture.teams.away.name)}</p>
                                {fixture.goals.away != null ? <p className="text-xs text-slate-400">Score {fixture.goals.away}</p> : null}
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                              <span className="inline-flex items-center gap-1.5">
                                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                                {formatThaiDate(fixture.date)}
                              </span>
                              {isBusy ? (
                                <span className="inline-flex items-center gap-1.5 text-primary">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  กำลังปลดล็อก
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </CardContent>
              </Card>

              <div className="space-y-6">
                {selectedFixture ? (
                  <>
                    <Card className="overflow-hidden border-primary/20 bg-[linear-gradient(135deg,rgba(184,255,0,0.10),rgba(255,255,255,0.03))] text-white">
                      <CardContent className="p-6 md:p-7">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <Badge className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/10">
                            <Sparkles className="mr-2 h-3.5 w-3.5" />
                            Match Preview
                          </Badge>
                          <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-semibold", getStatusTone(selectedFixture))}>
                            {getStatusLabel(selectedFixture)}
                          </span>
                        </div>

                        <div className="grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                          <div className="text-center">
                            <img src={selectedFixture.teams.home.logo || "/placeholder.svg"} alt={selectedFixture.teams.home.name} className="mx-auto h-16 w-16 rounded-full border border-white/10 bg-white/5 object-contain p-2" />
                            <p className="mt-3 text-2xl font-black">{getDisplayTeamName(selectedFixture.teams.home.nameEn || selectedFixture.teams.home.name)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-5xl font-display text-primary">VS</p>
                            {selectedFixture.goals.home != null && selectedFixture.goals.away != null ? (
                              <p className="mt-3 text-lg font-semibold text-white">สกอร์สด {selectedFixture.goals.home}-{selectedFixture.goals.away}</p>
                            ) : null}
                          </div>
                          <div className="text-center">
                            <img src={selectedFixture.teams.away.logo || "/placeholder.svg"} alt={selectedFixture.teams.away.name} className="mx-auto h-16 w-16 rounded-full border border-white/10 bg-white/5 object-contain p-2" />
                            <p className="mt-3 text-2xl font-black">{getDisplayTeamName(selectedFixture.teams.away.nameEn || selectedFixture.teams.away.name)}</p>
                          </div>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
                          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                            <CalendarDays className="h-4 w-4 text-primary" />
                            {formatThaiDate(selectedFixture.date)}
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            {selectedFixture.venue.name}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-[#0b1316] text-white">
                      <CardHeader className="border-b border-white/8 pb-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <CardTitle className="text-2xl">ผลทำนาย</CardTitle>
                          <div className="flex gap-3">
                            <Badge className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/10">
                              {selectedUnlocked ? "เปิดดูได้แล้ว" : "ยังล็อกอยู่"}
                            </Badge>
                            <Button
                              onClick={() => void handleReveal(selectedFixture)}
                              disabled={revealLoadingId === selectedFixture.id}
                              className="rounded-full px-5"
                            >
                              {revealLoadingId === selectedFixture.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  กำลังปลดล็อก
                                </>
                              ) : selectedUnlocked ? (
                                "ดูผลทำนาย"
                              ) : (
                                <>
                                  ปลดล็อก 1 เหรียญ
                                  <Lock className="ml-2 h-4 w-4" />
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-5 p-6">
                        {revealError ? (
                          <div className="rounded-[24px] border border-rose-500/30 bg-rose-500/10 p-4 text-rose-100">
                            <p className="font-semibold">ปลดล็อกคู่นี้ไม่สำเร็จ</p>
                            <p className="mt-1 text-sm text-rose-100/80">{revealError}</p>
                          </div>
                        ) : null}

                        {selectedPrediction ? (
                          <>
                            <div className="rounded-[28px] border border-primary/20 bg-primary/8 p-5">
                              <p className="text-sm text-slate-300">คำตอบหลัก</p>
                              <p className="mt-2 text-3xl font-black text-white">Predicted score: {selectedPrediction.ensemblePredictedScore}</p>
                              <p className="mt-2 text-base text-primary">ผลทำนาย: {selectedPrediction.predictedResult}</p>
                            </div>

                            {finishedSummary ? (
                              <div className={cn("rounded-[24px] border p-4", finishedSummary.tone)}>
                                <p className="text-base font-bold">{finishedSummary.label}</p>
                                <p className="mt-1 text-sm opacity-90">{finishedSummary.detail}</p>
                              </div>
                            ) : null}

                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                  <ShieldCheck className="h-5 w-5" />
                                </div>
                                <p className="text-sm text-slate-400">ความมั่นใจ</p>
                                <p className={cn("mt-2 text-2xl font-black", getConfidenceTone(selectedPrediction.confidence))}>
                                  {formatPercent(selectedPrediction.confidence)}
                                </p>
                              </div>
                              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                  <Trophy className="h-5 w-5" />
                                </div>
                                <p className="text-sm text-slate-400">ผลทำนาย</p>
                                <p className="mt-2 text-2xl font-black text-white">{selectedPrediction.predictedResult}</p>
                              </div>
                              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                  <Target className="h-5 w-5" />
                                </div>
                                <p className="text-sm text-slate-400">สกอร์หลัก</p>
                                <p className="mt-2 text-2xl font-black text-white">{selectedPrediction.ensemblePredictedScore}</p>
                              </div>
                            </div>

                            <div className="rounded-[28px] border border-white/10 bg-[#0e171a] p-5">
                              <div className="grid grid-cols-3 gap-3 text-sm font-semibold">
                                <div>
                                  <p className="text-slate-300">{getDisplayTeamName(selectedFixture.teams.home.nameEn || selectedFixture.teams.home.name)}</p>
                                  <p className="mt-1 text-2xl font-black text-white">{formatPercent(selectedPrediction.homeWin)}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-slate-400">เสมอ</p>
                                  <p className="mt-1 text-2xl font-black text-white">{formatPercent(selectedPrediction.draw)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-slate-300">{getDisplayTeamName(selectedFixture.teams.away.nameEn || selectedFixture.teams.away.name)}</p>
                                  <p className="mt-1 text-2xl font-black text-primary">{formatPercent(selectedPrediction.awayWin)}</p>
                                </div>
                              </div>

                              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/15">
                                <div className="flex h-full w-full overflow-hidden rounded-full">
                                  <div className="h-full bg-white/70" style={{ width: toPercentWidth(selectedPrediction.homeWin) }} />
                                  <div className="h-full bg-white/25" style={{ width: toPercentWidth(selectedPrediction.draw) }} />
                                  <div className="h-full bg-primary" style={{ width: toPercentWidth(selectedPrediction.awayWin) }} />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3 rounded-[28px] border border-white/10 bg-[#0e171a] p-5">
                              <div className="flex items-center gap-2 text-lg font-semibold text-white">
                                <BrainCircuit className="h-5 w-5 text-primary" />
                                มุมมองจากโมเดลรอง
                              </div>
                              <SupportingModelRow label="CatBoost" value={selectedPrediction.catboostPredictedScore} />
                              <SupportingModelRow label="XGBoost" value={selectedPrediction.xgboostPredictedScore} />
                              <SupportingModelRow label="Poisson" value={selectedPrediction.poissonPredictedScore} />
                            </div>
                          </>
                        ) : (
                          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                              {selectedUnlocked ? <BrainCircuit className="h-7 w-7" /> : <Lock className="h-7 w-7" />}
                            </div>
                            <p className="mt-4 text-2xl font-semibold text-white">
                              {selectedUnlocked ? "กำลังเตรียมผลทำนายของคู่นี้" : "คู่นี้ยังถูกล็อกอยู่"}
                            </p>
                            <p className="mt-2 text-sm leading-7 text-slate-400">
                              {selectedUnlocked
                                ? "ถ้าเพิ่งปลดล็อก ระบบจะโหลดผลทำนายของคู่นี้ขึ้นที่นี่"
                                : "กดปุ่มปลดล็อก 1 เหรียญเพื่อดูสกอร์ที่คาด ความมั่นใจ เปอร์เซ็นต์ชนะ และมุมมองจากแต่ละโมเดล"}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card className="border-white/10 bg-[#0b1316] text-white">
                    <CardContent className="flex min-h-[420px] flex-col items-center justify-center p-6 text-center">
                      <BrainCircuit className="h-12 w-12 text-primary" />
                      <p className="mt-4 text-2xl font-semibold">ยังไม่ได้เลือกแมตช์</p>
                      <p className="mt-2 max-w-md text-sm leading-7 text-slate-400">เลือกคู่ทางซ้ายก่อน แล้วค่อยใช้เหรียญปลดล็อกผลทำนาย</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
