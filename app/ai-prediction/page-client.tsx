"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import {
  BrainCircuit,
  CalendarDays,
  ChevronRight,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { backendFetcher } from "@/lib/api-client"
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

type PredictionMatch = {
  fixture: Fixture
  prediction: CsvPrediction | null
  week: number
}

type CsvRow = Record<string, string>

const TEAM_NAME_ALIASES: Record<string, string> = {
  "man utd": "manchester united",
  "manchester utd": "manchester united",
  "man united": "manchester united",
  "man city": "manchester city",
  spurs: "tottenham hotspur",
  tottenham: "tottenham hotspur",
  "nottm forest": "nottingham forest",
  "nott'm forest": "nottingham forest",
  nottingham: "nottingham forest",
  wolves: "wolverhampton wanderers",
  brighton: "brighton hove albion",
  westham: "west ham united",
  westhamunited: "west ham united",
  newcastle: "newcastle united",
}

const TEAM_DISPLAY_NAMES: Record<string, string> = {
  "Manchester Utd": "Manchester United",
  Tottenham: "Tottenham Hotspur",
  Nottingham: "Nottingham Forest",
}

function getDisplayTeamName(value: string) {
  return TEAM_DISPLAY_NAMES[value] || value
}

function normalizeTeamName(value: string) {
  const normalized = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")

  return TEAM_NAME_ALIASES[normalized] || normalized
}

function normalizePredictionResult(value: string) {
  const normalized = value.trim().toUpperCase()
  if (normalized === "H") return "เจ้าบ้านชนะ"
  if (normalized === "A") return "ทีมเยือนชนะ"
  if (normalized === "D") return "เสมอ"
  return value || "-"
}

function normalizeScoreText(value: string) {
  return value.replace(/^="?/, "").replace(/"$/, "").trim()
}

function parseCsvLine(line: string) {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const nextChar = line[index + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      values.push(current)
      current = ""
      continue
    }

    current += char
  }

  values.push(current)
  return values
}

function parsePredictionCsv(csvText: string) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length <= 1) return [] as CsvPrediction[]

  const headers = parseCsvLine(lines[0])
  const rows: CsvRow[] = lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    return headers.reduce<CsvRow>((accumulator, header, index) => {
      accumulator[header] = values[index] ?? ""
      return accumulator
    }, {})
  })

  return rows.map((row) => ({
    fixtureDate: row.fixture_date,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    predictedResult: normalizePredictionResult(row.predicted_result),
    confidence: Number.isFinite(Number(row.confidence)) ? Number(row.confidence) : null,
    homeWin: Number.isFinite(Number(row.home_win)) ? Number(row.home_win) : null,
    draw: Number.isFinite(Number(row.draw)) ? Number(row.draw) : null,
    awayWin: Number.isFinite(Number(row.away_win)) ? Number(row.away_win) : null,
    ensemblePredictedScore: normalizeScoreText(row.ensemble_predicted_score || "-"),
    catboostPredictedScore: normalizeScoreText(row.catboost_predicted_score || "-"),
    xgboostPredictedScore: normalizeScoreText(row.xgboost_predicted_score || "-"),
    poissonPredictedScore: normalizeScoreText(row.poisson_predicted_score || "-"),
  }))
}

function formatThaiDate(dateValue: string) {
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date(dateValue))
}

function formatConfidence(value: number | null) {
  if (value == null) return "-"
  const normalized = value <= 1 ? value * 100 : value
  return `${normalized.toFixed(0)}%`
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
  if (!match) {
    return { home: null, away: null }
  }

  return {
    home: Number(match[1]),
    away: Number(match[2]),
  }
}

function getWinnerFromScore(home: number | null, away: number | null) {
  if (home == null || away == null) return null
  if (home > away) return "home"
  if (away > home) return "away"
  return "draw"
}

function getFinishedPredictionSummary(match: PredictionMatch | null) {
  if (!match?.prediction) return null
  if (!match.fixture.status.isFinished) return null

  const actualHome = match.fixture.goals.home
  const actualAway = match.fixture.goals.away
  const predictedScore = parseScorePair(match.prediction.ensemblePredictedScore)

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

  if (exactScore) {
    return {
      label: "สกอร์ตรง",
      detail: `สกอร์ที่ทำนายตรงกับผลจริง ${actualHome}-${actualAway}`,
      tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    }
  }

  if (winnerMatched) {
    const drawText = actualWinner === "draw" ? "ทายผลเสมอถูก" : "ทายทีมชนะถูก"
    return {
      label: `${drawText} แต่สกอร์ไม่ตรง`,
      detail: `ทำนาย ${predictedScore.home}-${predictedScore.away} แต่ผลจริงจบ ${actualHome}-${actualAway}`,
      tone: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    }
  }

  return {
    label: "ทายผิด",
    detail: `ทำนาย ${predictedScore.home}-${predictedScore.away} แต่ผลจริงจบ ${actualHome}-${actualAway}`,
    tone: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  }
}

function getConfidenceTone(value: number | null) {
  if (value == null) return "text-muted-foreground"
  const normalized = value <= 1 ? value * 100 : value
  if (normalized >= 65) return "text-primary"
  if (normalized >= 50) return "text-amber-300"
  return "text-slate-400"
}

function getStatusLabel(fixture: Fixture) {
  if (fixture.status.isFinished) return "จบ"
  if (fixture.status.isLive) return fixture.status.short ? `${fixture.status.short}'` : "สด"
  return "ยังไม่แข่ง"
}

function getStatusTone(fixture: Fixture) {
  if (fixture.status.isFinished) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  if (fixture.status.isLive) return "border-red-500/30 bg-red-500/10 text-red-300"
  return "border-white/10 bg-white/5 text-slate-300"
}

function getWeekLabel(week: number) {
  return `สัปดาห์ ${week}`
}

function getPredictionLookupKey(date: string, homeTeam: string, awayTeam: string) {
  return `${date}__${normalizeTeamName(homeTeam)}__${normalizeTeamName(awayTeam)}`
}

function matchPredictionToFixture(fixtures: Fixture[], predictions: CsvPrediction[]) {
  const predictionMap = new Map(predictions.map((item) => [getPredictionLookupKey(item.fixtureDate, item.homeTeam, item.awayTeam), item]))

  return fixtures
    .map<PredictionMatch>((fixture, index) => {
      const dateKey = fixture.date.slice(0, 10)
      const homeName = getDisplayTeamName(fixture.teams.home.nameEn || fixture.teams.home.name)
      const awayName = getDisplayTeamName(fixture.teams.away.nameEn || fixture.teams.away.name)
      const directKey = getPredictionLookupKey(dateKey, homeName, awayName)
      const fallbackKey = getPredictionLookupKey(dateKey, getDisplayTeamName(fixture.teams.home.name), getDisplayTeamName(fixture.teams.away.name))
      const prediction = predictionMap.get(directKey) || predictionMap.get(fallbackKey) || null

      return {
        fixture,
        prediction,
        week: fixture.roundNumber || Math.floor(index / 10) + 1,
      }
    })
    .sort((left, right) => new Date(left.fixture.date).getTime() - new Date(right.fixture.date).getTime())
}

async function csvFetcher(path: string) {
  const response = await fetch(path, { cache: "no-store" })
  if (!response.ok) {
    throw new Error("โหลดไฟล์ prediction ไม่สำเร็จ")
  }
  return response.text()
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
  const { data: fixturesData, isLoading: fixturesLoading, error: fixturesError } = useSWR<FixturesResponse>("/football/fixtures?type=all&limit=380", backendFetcher)
  const { data: csvText, isLoading: csvLoading, error: csvError } = useSWR("/predictions_2026_2027_retrained_h2h.csv", csvFetcher)

  const predictions = useMemo(() => (csvText ? parsePredictionCsv(csvText) : []), [csvText])
  const predictionMatches = useMemo(() => matchPredictionToFixture(fixturesData?.data || [], predictions), [fixturesData?.data, predictions])

  const weeks = useMemo(() => {
    const grouped = new Map<number, PredictionMatch[]>()

    for (const match of predictionMatches) {
      const existing = grouped.get(match.week) || []
      existing.push(match)
      grouped.set(match.week, existing)
    }

    return Array.from(grouped.entries())
      .sort((left, right) => left[0] - right[0])
      .map(([week, matches]) => ({ week, matches }))
  }, [predictionMatches])

  const [selectedWeek, setSelectedWeek] = useState<number>(1)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [revealedMatchIds, setRevealedMatchIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!weeks.length) return

    if (!weeks.some((item) => item.week === selectedWeek)) {
      setSelectedWeek(weeks[0].week)
      setSelectedMatchId(weeks[0].matches[0]?.fixture.id || null)
      return
    }

    const activeWeek = weeks.find((item) => item.week === selectedWeek)
    if (activeWeek && !selectedMatchId) {
      setSelectedMatchId(activeWeek.matches[0]?.fixture.id || null)
    }
  }, [weeks, selectedWeek, selectedMatchId])

  const activeWeek = useMemo(() => weeks.find((item) => item.week === selectedWeek) || weeks[0] || null, [weeks, selectedWeek])

  const selectedMatch = useMemo(() => {
    const pool = activeWeek?.matches || predictionMatches
    return pool.find((item) => item.fixture.id === selectedMatchId) || pool[0] || null
  }, [activeWeek, predictionMatches, selectedMatchId])

  const totalPredicted = predictions.length
  const totalFixtures = fixturesData?.totalMatches || predictionMatches.length
  const completeWeeks = weeks.length
  const loading = fixturesLoading || csvLoading
  const errorMessage = (fixturesError as Error | undefined)?.message || (csvError as Error | undefined)?.message || ""
  const isRevealed = selectedMatch ? Boolean(revealedMatchIds[selectedMatch.fixture.id]) : false
  const finishedPredictionSummary = getFinishedPredictionSummary(selectedMatch)

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(184,255,0,0.10),transparent_22%),linear-gradient(180deg,#060a0b_0%,#091114_45%,#05080a_100%)] text-foreground">
      <Navigation />

      <section className="border-b border-white/8">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <Badge className="mb-5 border-primary/30 bg-primary/10 text-primary hover:bg-primary/10">
            <BrainCircuit className="mr-2 h-3.5 w-3.5" />
            Premier League AI Prediction
          </Badge>

          <div className="grid gap-8 lg:grid-cols-[1.35fr_0.85fr] lg:items-end">
            <div>
              <h1 className="text-4xl font-display leading-tight text-white md:text-6xl">
                บอร์ดทำนายพรีเมียร์ลีก
                <span className="block text-primary">กดดูผลทำนายทีละคู่ได้</span>
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
                ดูคู่แข่งขันทั้งฤดูกาลแบบแยกตามสัปดาห์ เลือกแมตช์ที่สนใจ แล้วค่อยเปิดผลทำนายเมื่อผู้ใช้ต้องการดู
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div className="rounded-[26px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Weeks</p>
                <p className="mt-2 text-3xl font-black text-white">{completeWeeks}/38</p>
                <p className="mt-1 text-sm text-slate-400">สัปดาห์ที่พร้อมแสดง</p>
              </div>
              <div className="rounded-[26px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Fixtures</p>
                <p className="mt-2 text-3xl font-black text-white">{totalFixtures}/380</p>
                <p className="mt-1 text-sm text-slate-400">คู่ที่โหลดจากระบบแข่ง</p>
              </div>
              <div className="rounded-[26px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Predictions</p>
                <p className="mt-2 text-3xl font-black text-white">{totalPredicted}</p>
                <p className="mt-1 text-sm text-slate-400">คู่ที่จับกับไฟล์ทำนายแล้ว</p>
              </div>
            </div>
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
            <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm md:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-display text-white">เลือกสัปดาห์การแข่งขัน</h2>
                  <p className="mt-1 text-sm text-slate-400">เปลี่ยนสัปดาห์ทางซ้าย แล้วเลือกแมตช์เพื่อเปิดผลทำนาย</p>
                </div>
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                  {activeWeek ? `${getWeekLabel(activeWeek.week)} | ${activeWeek.matches.length} แมตช์` : "ยังไม่มีข้อมูล"}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                {weeks.map((item) => (
                  <button
                    key={item.week}
                    type="button"
                    onClick={() => {
                      setSelectedWeek(item.week)
                      setSelectedMatchId(item.matches[0]?.fixture.id || null)
                    }}
                    className={cn(
                      "rounded-[24px] border px-4 py-4 text-left transition",
                      item.week === activeWeek?.week
                        ? "border-primary bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(184,255,0,0.18)]"
                        : "border-white/10 bg-white/5 text-slate-200 hover:border-primary/40 hover:bg-white/8",
                    )}
                  >
                    <p className="text-xs uppercase tracking-[0.18em] opacity-80">Week</p>
                    <p className="mt-2 text-xl font-black">{item.week}</p>
                    <p className="mt-2 text-sm opacity-80">{item.matches.length} คู่</p>
                  </button>
                ))}
              </div>
            </section>

            <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
              <Card className="overflow-hidden border-white/10 bg-[#0b1316] text-white">
                <CardHeader className="border-b border-white/8 pb-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-2xl">{activeWeek ? getWeekLabel(activeWeek.week) : "รายการแมตช์"}</CardTitle>
                      <p className="mt-1 text-sm text-slate-400">เลือกแมตช์ทางซ้ายเพื่อดูผลทำนายของคู่นั้น</p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300">
                      {(activeWeek?.matches || []).length} matches
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 p-4 md:p-5">
                  {(activeWeek?.matches || []).map((item) => {
                    const { fixture, prediction } = item
                    const selected = selectedMatch?.fixture.id === fixture.id
                    const revealed = Boolean(revealedMatchIds[fixture.id])

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
                              {prediction ? (
                                <span className="inline-flex rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                  {revealed ? "เปิดผลแล้ว" : "กดดูผลได้"}
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-400">
                                  ยังไม่จับ prediction
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-3">
                              <img src={fixture.teams.home.logo || "/placeholder.svg"} alt={fixture.teams.home.name} className="h-11 w-11 rounded-full border border-white/10 bg-white/5 object-contain p-1.5" />
                              <div className="min-w-0">
                                <p className="truncate text-base font-semibold text-white">{getDisplayTeamName(fixture.teams.home.name)}</p>
                                {fixture.goals.home != null ? <p className="text-xs text-slate-400">Score {fixture.goals.home}</p> : null}
                              </div>
                              <div className="text-center text-sm font-black text-primary">VS</div>
                              <div className="min-w-0 text-right">
                                <p className="truncate text-base font-semibold text-white">{getDisplayTeamName(fixture.teams.away.name)}</p>
                                {fixture.goals.away != null ? <p className="text-xs text-slate-400">Score {fixture.goals.away}</p> : null}
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-primary" />{formatThaiDate(fixture.date)}</span>
                            </div>
                          </div>

                          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-500" />
                        </div>
                      </button>
                    )
                  })}
                </CardContent>
              </Card>

              <div className="space-y-6">
                {selectedMatch ? (
                  <>
                    <Card className="overflow-hidden border-primary/20 bg-[linear-gradient(135deg,rgba(184,255,0,0.10),rgba(255,255,255,0.03))] text-white">
                      <CardContent className="p-6 md:p-7">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <Badge className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/10">
                            <Sparkles className="mr-2 h-3.5 w-3.5" />
                            Match Preview
                          </Badge>
                          <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-semibold", getStatusTone(selectedMatch.fixture))}>
                            {getStatusLabel(selectedMatch.fixture)}
                          </span>
                        </div>

                        <div className="grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                          <div className="text-center">
                            <img src={selectedMatch.fixture.teams.home.logo || "/placeholder.svg"} alt={selectedMatch.fixture.teams.home.name} className="mx-auto h-16 w-16 rounded-full border border-white/10 bg-white/5 object-contain p-2" />
                            <p className="mt-3 text-2xl font-black">{getDisplayTeamName(selectedMatch.fixture.teams.home.name)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-5xl font-display text-primary">VS</p>
                            {selectedMatch.fixture.goals.home != null && selectedMatch.fixture.goals.away != null ? (
                              <p className="mt-3 text-lg font-semibold text-white">สกอร์สด {selectedMatch.fixture.goals.home}-{selectedMatch.fixture.goals.away}</p>
                            ) : null}
                          </div>
                          <div className="text-center">
                            <img src={selectedMatch.fixture.teams.away.logo || "/placeholder.svg"} alt={selectedMatch.fixture.teams.away.name} className="mx-auto h-16 w-16 rounded-full border border-white/10 bg-white/5 object-contain p-2" />
                            <p className="mt-3 text-2xl font-black">{getDisplayTeamName(selectedMatch.fixture.teams.away.name)}</p>
                          </div>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
                          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2"><CalendarDays className="h-4 w-4 text-primary" />{formatThaiDate(selectedMatch.fixture.date)}</span>
                          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2"><MapPin className="h-4 w-4 text-primary" />{selectedMatch.fixture.venue.name}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-[#0b1316] text-white">
                      <CardHeader className="border-b border-white/8 pb-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <CardTitle className="text-2xl">ผลทำนาย</CardTitle>
                          {selectedMatch.prediction ? (
                            <Button
                              onClick={() => setRevealedMatchIds((current) => ({ ...current, [selectedMatch.fixture.id]: !current[selectedMatch.fixture.id] }))}
                              className="rounded-full px-5"
                            >
                              {isRevealed ? "ซ่อนผลทำนาย" : "ดูผลทำนาย"}
                            </Button>
                          ) : null}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-5 p-6">
                        {selectedMatch.prediction ? (
                          isRevealed ? (
                            <>
                              <div className="rounded-[28px] border border-primary/20 bg-primary/8 p-5">
                                <p className="text-sm text-slate-300">คำตอบหลัก</p>
                                <p className="mt-2 text-3xl font-black text-white">Predicted score: {selectedMatch.prediction.ensemblePredictedScore}</p>
                                <p className="mt-2 text-base text-primary">ผลทำนาย: {selectedMatch.prediction.predictedResult}</p>
                              </div>

                              {finishedPredictionSummary ? (
                                <div className={cn("rounded-[24px] border p-4", finishedPredictionSummary.tone)}>
                                  <p className="text-base font-bold">{finishedPredictionSummary.label}</p>
                                  <p className="mt-1 text-sm opacity-90">{finishedPredictionSummary.detail}</p>
                                </div>
                              ) : null}

                              <div className="grid gap-4 md:grid-cols-3">
                                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                    <ShieldCheck className="h-5 w-5" />
                                  </div>
                                  <p className="text-sm text-slate-400">ความมั่นใจ</p>
                                  <p className={cn("mt-2 text-2xl font-black", getConfidenceTone(selectedMatch.prediction.confidence))}>{formatConfidence(selectedMatch.prediction.confidence)}</p>
                                </div>
                                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                    <Trophy className="h-5 w-5" />
                                  </div>
                                  <p className="text-sm text-slate-400">ผลทำนาย</p>
                                  <p className="mt-2 text-2xl font-black text-white">{selectedMatch.prediction.predictedResult}</p>
                                </div>
                                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                    <Target className="h-5 w-5" />
                                  </div>
                                  <p className="text-sm text-slate-400">สกอร์หลัก</p>
                                  <p className="mt-2 text-2xl font-black text-white">{selectedMatch.prediction.ensemblePredictedScore}</p>
                                </div>
                              </div>

                              <div className="rounded-[28px] border border-white/10 bg-[#0e171a] p-5">
                                <div className="grid grid-cols-3 gap-3 text-sm font-semibold">
                                  <div>
                                    <p className="text-slate-300">{getDisplayTeamName(selectedMatch.fixture.teams.home.name)}</p>
                                    <p className="mt-1 text-2xl font-black text-white">{formatPercent(selectedMatch.prediction.homeWin)}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-slate-400">เสมอ</p>
                                    <p className="mt-1 text-2xl font-black text-white">{formatPercent(selectedMatch.prediction.draw)}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-slate-300">{getDisplayTeamName(selectedMatch.fixture.teams.away.name)}</p>
                                    <p className="mt-1 text-2xl font-black text-primary">{formatPercent(selectedMatch.prediction.awayWin)}</p>
                                  </div>
                                </div>

                                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/15">
                                  <div className="flex h-full w-full overflow-hidden rounded-full">
                                    <div className="h-full bg-white/70" style={{ width: toPercentWidth(selectedMatch.prediction.homeWin) }} />
                                    <div className="h-full bg-white/25" style={{ width: toPercentWidth(selectedMatch.prediction.draw) }} />
                                    <div className="h-full bg-primary" style={{ width: toPercentWidth(selectedMatch.prediction.awayWin) }} />
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-3 rounded-[28px] border border-white/10 bg-[#0e171a] p-5">
                                <div className="flex items-center gap-2 text-lg font-semibold text-white">
                                  <BrainCircuit className="h-5 w-5 text-primary" />
                                  มุมมองจากโมเดลรอง
                                </div>
                                <SupportingModelRow label="CatBoost" value={selectedMatch.prediction.catboostPredictedScore} />
                                <SupportingModelRow label="XGBoost" value={selectedMatch.prediction.xgboostPredictedScore} />
                                <SupportingModelRow label="Poisson" value={selectedMatch.prediction.poissonPredictedScore} />
                              </div>
                            </>
                          ) : (
                            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 text-center">
                              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <Sparkles className="h-7 w-7" />
                              </div>
                              <p className="mt-4 text-2xl font-semibold text-white">กดดูผลก่อน</p>
                              <p className="mt-2 text-sm leading-7 text-slate-400">เมื่อกดปุ่ม ระบบจะแสดงสกอร์ที่ทำนาย ความมั่นใจ เปอร์เซ็นต์ชนะ และรายละเอียดจากโมเดลแต่ละตัว</p>
                            </div>
                          )
                        ) : (
                          <div className="rounded-[28px] border border-amber-300/20 bg-amber-300/10 p-5 text-amber-100">
                            <p className="text-lg font-semibold">คู่นี้ยังไม่จับกับ prediction ในไฟล์</p>
                            <p className="mt-2 text-sm text-amber-100/80">มักเกิดจากชื่อทีมใน fixture กับ CSV ยังไม่ตรงกันแบบพอดี</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card className="border-white/10 bg-[#0b1316] text-white">
                    <CardContent className="flex min-h-[420px] flex-col items-center justify-center p-6 text-center">
                      <TrendingUp className="h-12 w-12 text-primary" />
                      <p className="mt-4 text-2xl font-semibold">ยังไม่ได้เลือกแมตช์</p>
                      <p className="mt-2 max-w-md text-sm leading-7 text-slate-400">เมื่อโหลดข้อมูลครบแล้ว คุณสามารถเลือกคู่ใดก็ได้เพื่อดูผลทำนายตรงนี้</p>
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
