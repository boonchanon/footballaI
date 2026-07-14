"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Loader2,
  Lock,
  MapPin,
  Sparkles,
  Target,
  WandSparkles,
  XCircle,
} from "lucide-react"

import { fetchJson } from "@/lib/api-client"
import type { ParsedPredictionResponse, PredictionRequest } from "@/lib/football-prediction"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type FixtureRoundKey = "round32" | "round16" | "quarterfinals" | "semifinals" | "final"

type FeaturedFixture = {
  id: string
  stage: string
  dateLabel: string
  venue: string
  home_team: string
  away_team: string
  neutral: boolean
  tournament_weight: number
  preview: {
    home: number
    draw: number
    away: number
  }
}

type QuarterfinalPredictionResponse = {
  ok: boolean
  official_model?: string
  match?: {
    home_team?: string
    away_team?: string
    round_name?: string
  }
  poisson_summary?: {
    home_xg?: number
    away_xg?: number
    home_win_prob?: number
    draw_prob?: number
    away_win_prob?: number
  }
  models?: Array<{
    name?: string
    predicted_result?: string
    predicted_score?: string
    confidence?: number
    home_win_prob?: number
    draw_prob?: number
    away_win_prob?: number
    notes?: string
  }>
  best_pick?: {
    name?: string
    predicted_result?: string
    predicted_score?: string
    confidence?: number
    home_win_prob?: number
    draw_prob?: number
    away_win_prob?: number
    notes?: string
  }
  error?: string
}

type DeepRoundPredictionItem = {
  fixture: FeaturedFixture
  response: QuarterfinalPredictionResponse
}

type HealthResponse = {
  ok?: boolean
  status?: string
  error?: string
}

type RoundOption = {
  key: FixtureRoundKey
  label: string
  shortLabel: string
  enabled: boolean
}

type ActualOutcomeStatus = "correct" | "incorrect" | "pending" | "unavailable"

type PredictionAuditEntry = {
  fixtureId: string
  predictedResult: "Home win" | "Away win" | "Draw"
  predictedScore: string
  actualScore: string
  actualWinner: "home" | "away" | "draw" | "pending"
  notes?: string
}

const roundOptions: RoundOption[] = [
  { key: "round32", label: "Round of 32", shortLabel: "32", enabled: true },
  { key: "round16", label: "Round of 16", shortLabel: "16", enabled: true },
  { key: "quarterfinals", label: "Quarter-finals", shortLabel: "8", enabled: true },
  { key: "semifinals", label: "Semi-finals", shortLabel: "4", enabled: true },
  { key: "final", label: "Final", shortLabel: "ชิง", enabled: false },
]

const fixturesByRound: Record<FixtureRoundKey, FeaturedFixture[]> = {
  round32: [
    { id: "wc26-r32-bra-jpn", stage: "Round of 32", dateLabel: "June 29, 2026", venue: "Houston Stadium", home_team: "Brazil", away_team: "Japan", neutral: true, tournament_weight: 8, preview: { home: 54, draw: 24, away: 22 } },
    { id: "wc26-r32-ger-par", stage: "Round of 32", dateLabel: "June 29, 2026", venue: "Boston Stadium", home_team: "Germany", away_team: "Paraguay", neutral: true, tournament_weight: 8, preview: { home: 49, draw: 26, away: 25 } },
    { id: "wc26-r32-ned-mar", stage: "Round of 32", dateLabel: "June 29, 2026", venue: "Monterrey Stadium", home_team: "Netherlands", away_team: "Morocco", neutral: true, tournament_weight: 8, preview: { home: 37, draw: 30, away: 33 } },
    { id: "wc26-r32-civ-nor", stage: "Round of 32", dateLabel: "June 30, 2026", venue: "Dallas Stadium", home_team: "Ivory Coast", away_team: "Norway", neutral: true, tournament_weight: 8, preview: { home: 28, draw: 31, away: 41 } },
    { id: "wc26-r32-fra-swe", stage: "Round of 32", dateLabel: "June 30, 2026", venue: "New York/New Jersey Stadium", home_team: "France", away_team: "Sweden", neutral: true, tournament_weight: 8, preview: { home: 56, draw: 23, away: 21 } },
    { id: "wc26-r32-mex-ecu", stage: "Round of 32", dateLabel: "June 30, 2026", venue: "Mexico City Stadium", home_team: "Mexico", away_team: "Ecuador", neutral: false, tournament_weight: 8, preview: { home: 42, draw: 29, away: 29 } },
    { id: "wc26-r32-eng-cod", stage: "Round of 32", dateLabel: "July 1, 2026", venue: "Atlanta Stadium", home_team: "England", away_team: "DR Congo", neutral: true, tournament_weight: 8, preview: { home: 62, draw: 20, away: 18 } },
    { id: "wc26-r32-bel-sen", stage: "Round of 32", dateLabel: "July 1, 2026", venue: "Seattle Stadium", home_team: "Belgium", away_team: "Senegal", neutral: true, tournament_weight: 8, preview: { home: 43, draw: 28, away: 29 } },
    { id: "wc26-r32-usa-bih", stage: "Round of 32", dateLabel: "July 1, 2026", venue: "San Francisco Bay Stadium", home_team: "United States", away_team: "Bosnia and Herzegovina", neutral: false, tournament_weight: 8, preview: { home: 45, draw: 27, away: 28 } },
    { id: "wc26-r32-esp-aut", stage: "Round of 32", dateLabel: "July 2, 2026", venue: "Los Angeles Stadium", home_team: "Spain", away_team: "Austria", neutral: true, tournament_weight: 8, preview: { home: 58, draw: 22, away: 20 } },
    { id: "wc26-r32-por-cro", stage: "Round of 32", dateLabel: "July 2, 2026", venue: "Toronto Stadium", home_team: "Portugal", away_team: "Croatia", neutral: true, tournament_weight: 8, preview: { home: 39, draw: 30, away: 31 } },
    { id: "wc26-r32-sui-alg", stage: "Round of 32", dateLabel: "July 2, 2026", venue: "BC Place Vancouver", home_team: "Switzerland", away_team: "Algeria", neutral: true, tournament_weight: 8, preview: { home: 47, draw: 27, away: 26 } },
    { id: "wc26-r32-aus-egy", stage: "Round of 32", dateLabel: "July 3, 2026", venue: "Dallas Stadium", home_team: "Australia", away_team: "Egypt", neutral: true, tournament_weight: 8, preview: { home: 30, draw: 31, away: 39 } },
    { id: "wc26-r32-arg-cpv", stage: "Round of 32", dateLabel: "July 3, 2026", venue: "Miami Stadium", home_team: "Argentina", away_team: "Cabo Verde", neutral: true, tournament_weight: 8, preview: { home: 53, draw: 25, away: 22 } },
    { id: "wc26-r32-col-gha", stage: "Round of 32", dateLabel: "July 3, 2026", venue: "Kansas City Stadium", home_team: "Colombia", away_team: "Ghana", neutral: true, tournament_weight: 8, preview: { home: 46, draw: 28, away: 26 } },
  ],
  round16: [
    { id: "wc26-r16-mar-can", stage: "Round of 16", dateLabel: "July 4, 2026", venue: "Mexico City Stadium", home_team: "Morocco", away_team: "Canada", neutral: true, tournament_weight: 5, preview: { home: 38, draw: 28, away: 34 } },
    { id: "wc26-r16-fra-par", stage: "Round of 16", dateLabel: "July 4, 2026", venue: "New York/New Jersey Stadium", home_team: "France", away_team: "Paraguay", neutral: true, tournament_weight: 5, preview: { home: 53, draw: 25, away: 22 } },
    { id: "wc26-r16-bra-nor", stage: "Round of 16", dateLabel: "July 5, 2026", venue: "Houston Stadium", home_team: "Brazil", away_team: "Norway", neutral: true, tournament_weight: 5, preview: { home: 49, draw: 24, away: 27 } },
    { id: "wc26-r16-mex-eng", stage: "Round of 16", dateLabel: "July 5, 2026", venue: "Monterrey Stadium", home_team: "Mexico", away_team: "England", neutral: true, tournament_weight: 5, preview: { home: 27, draw: 29, away: 44 } },
    { id: "wc26-r16-usa-bel", stage: "Round of 16", dateLabel: "July 6, 2026", venue: "Atlanta Stadium", home_team: "United States", away_team: "Belgium", neutral: true, tournament_weight: 5, preview: { home: 31, draw: 30, away: 39 } },
    { id: "wc26-r16-por-esp", stage: "Round of 16", dateLabel: "July 6, 2026", venue: "Los Angeles Stadium", home_team: "Portugal", away_team: "Spain", neutral: true, tournament_weight: 5, preview: { home: 34, draw: 31, away: 35 } },
    { id: "wc26-r16-arg-egy", stage: "Round of 16", dateLabel: "July 7, 2026", venue: "Miami Stadium", home_team: "Argentina", away_team: "Egypt", neutral: true, tournament_weight: 5, preview: { home: 58, draw: 23, away: 19 } },
    { id: "wc26-r16-sui-col", stage: "Round of 16", dateLabel: "July 7, 2026", venue: "BC Place Vancouver", home_team: "Switzerland", away_team: "Colombia", neutral: true, tournament_weight: 5, preview: { home: 29, draw: 31, away: 40 } },
  ],
  quarterfinals: [
    { id: "wc26-qf-fra-mar", stage: "Quarter-finals", dateLabel: "July 9, 2026", venue: "Los Angeles Stadium", home_team: "France", away_team: "Morocco", neutral: true, tournament_weight: 5, preview: { home: 53, draw: 24, away: 23 } },
    { id: "wc26-qf-esp-bel", stage: "Quarter-finals", dateLabel: "July 10, 2026", venue: "Mexico City Stadium", home_team: "Spain", away_team: "Belgium", neutral: true, tournament_weight: 5, preview: { home: 46, draw: 27, away: 27 } },
    { id: "wc26-qf-eng-nor", stage: "Quarter-finals", dateLabel: "July 10, 2026", venue: "Atlanta Stadium", home_team: "Norway", away_team: "England", neutral: true, tournament_weight: 5, preview: { home: 19, draw: 24, away: 57 } },
    { id: "wc26-qf-arg-sui", stage: "Quarter-finals", dateLabel: "July 11, 2026", venue: "Miami Stadium", home_team: "Argentina", away_team: "Switzerland", neutral: true, tournament_weight: 5, preview: { home: 55, draw: 24, away: 21 } },
  ],
  semifinals: [
    { id: "wc26-sf-fra-esp", stage: "Semi-finals", dateLabel: "July 14, 2026", venue: "Dallas Stadium", home_team: "France", away_team: "Spain", neutral: true, tournament_weight: 5, preview: { home: 44, draw: 28, away: 28 } },
    { id: "wc26-sf-eng-arg", stage: "Semi-finals", dateLabel: "July 15, 2026", venue: "New York/New Jersey Stadium", home_team: "England", away_team: "Argentina", neutral: true, tournament_weight: 5, preview: { home: 31, draw: 29, away: 40 } },
  ],
  final: [],
}

const predictionAuditByRound: Record<FixtureRoundKey, PredictionAuditEntry[]> = {
  round32: [
    { fixtureId: "wc26-r32-bra-jpn", predictedResult: "Home win", predictedScore: "1-0", actualScore: "2-1", actualWinner: "home" },
    { fixtureId: "wc26-r32-ger-par", predictedResult: "Home win", predictedScore: "1-0", actualScore: "1-2", actualWinner: "away" },
    { fixtureId: "wc26-r32-ned-mar", predictedResult: "Home win", predictedScore: "1-0", actualScore: "1-2", actualWinner: "away" },
    { fixtureId: "wc26-r32-civ-nor", predictedResult: "Away win", predictedScore: "0-1", actualScore: "0-2", actualWinner: "away" },
    { fixtureId: "wc26-r32-fra-swe", predictedResult: "Home win", predictedScore: "2-0", actualScore: "3-0", actualWinner: "home" },
    { fixtureId: "wc26-r32-mex-ecu", predictedResult: "Home win", predictedScore: "1-0", actualScore: "2-0", actualWinner: "home" },
    { fixtureId: "wc26-r32-eng-cod", predictedResult: "Home win", predictedScore: "2-0", actualScore: "2-1", actualWinner: "home" },
    { fixtureId: "wc26-r32-bel-sen", predictedResult: "Home win", predictedScore: "1-0", actualScore: "3-2 AET", actualWinner: "home" },
    { fixtureId: "wc26-r32-usa-bih", predictedResult: "Home win", predictedScore: "1-0", actualScore: "2-0", actualWinner: "home" },
    { fixtureId: "wc26-r32-esp-aut", predictedResult: "Home win", predictedScore: "1-0", actualScore: "3-0", actualWinner: "home" },
    { fixtureId: "wc26-r32-por-cro", predictedResult: "Home win", predictedScore: "1-0", actualScore: "2-1", actualWinner: "home" },
    { fixtureId: "wc26-r32-sui-alg", predictedResult: "Home win", predictedScore: "1-0", actualScore: "1-0", actualWinner: "home" },
    { fixtureId: "wc26-r32-aus-egy", predictedResult: "Home win", predictedScore: "1-0", actualScore: "0-1", actualWinner: "away" },
    { fixtureId: "wc26-r32-arg-cpv", predictedResult: "Home win", predictedScore: "-", actualScore: "3-1", actualWinner: "home", notes: "Prediction API returned 422: Missing Elo rating for Cabo Verde" },
    { fixtureId: "wc26-r32-col-gha", predictedResult: "Home win", predictedScore: "2-0", actualScore: "2-0", actualWinner: "home" },
  ],
  round16: [
    { fixtureId: "wc26-r16-mar-can", predictedResult: "Home win", predictedScore: "-", actualScore: "1-0", actualWinner: "home" },
    { fixtureId: "wc26-r16-fra-par", predictedResult: "Home win", predictedScore: "-", actualScore: "2-1", actualWinner: "home" },
    { fixtureId: "wc26-r16-bra-nor", predictedResult: "Home win", predictedScore: "-", actualScore: "-", actualWinner: "pending" },
    { fixtureId: "wc26-r16-mex-eng", predictedResult: "Away win", predictedScore: "-", actualScore: "-", actualWinner: "pending" },
    { fixtureId: "wc26-r16-usa-bel", predictedResult: "Away win", predictedScore: "-", actualScore: "-", actualWinner: "pending" },
    { fixtureId: "wc26-r16-por-esp", predictedResult: "Away win", predictedScore: "-", actualScore: "-", actualWinner: "pending" },
    { fixtureId: "wc26-r16-arg-egy", predictedResult: "Home win", predictedScore: "-", actualScore: "-", actualWinner: "pending" },
    { fixtureId: "wc26-r16-sui-col", predictedResult: "Away win", predictedScore: "-", actualScore: "-", actualWinner: "pending" },
  ],
  quarterfinals: [],
  semifinals: [],
  final: [],
}

type PredictionApiResponse = {
  raw: unknown
  parsed: ParsedPredictionResponse
}

function formatProbability(value: number | null) {
  return value == null ? "-" : `${value.toFixed(1)}%`
}

function formatApiProbability(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-"
  const normalized = value <= 1 ? value * 100 : value
  return `${normalized.toFixed(1)}%`
}

function formatApiXg(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-"
  return value.toFixed(2)
}

function formatConfidence(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-"
  return `${(value * 100).toFixed(0)}%`
}

function pickStringValue(source: Record<string, unknown>, key: string) {
  const value = source[key]
  return typeof value === "string" ? value : ""
}

function pickNumberValue(source: Record<string, unknown>, key: string) {
  const value = source[key]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function getConfidenceLabel(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "No confidence data"
  if (value < 0.55) return "Close matchup"
  if (value >= 0.7) return "High confidence"
  return "Balanced edge"
}

function getFriendlyErrorMessage(message: string) {
  if (/Missing Elo rating for\s+(.+)/i.test(message)) {
    const matched = message.match(/Missing Elo rating for\s+(.+)/i)
    const team = matched?.[1]?.trim() || "ทีมที่เลือก"
    return `ระบบยังไม่มีค่า Elo ของ ${team} จึงยังทำนายคู่นี้ไม่ได้`
  }
  if (/timed out/i.test(message)) return "Prediction API ตอบกลับช้าเกินเวลา ลองใหม่อีกครั้ง"
  if (/unavailable|failed to fetch|network/i.test(message)) return "ยังเชื่อมต่อไปที่ Prediction API ไม่สำเร็จ"
  return message
}

function getResultTone(result: string) {
  if (!result || result === "-") return "ระบบยังสรุปผลหลักจากโมเดลไม่ได้"
  if (/home/i.test(result)) return "โมเดลให้น้ำหนักฝั่งเจ้าบ้านมากกว่าในคู่นี้"
  if (/away/i.test(result)) return "โมเดลมองว่าทีมเยือนมีภาษีดีกว่าในเกมนี้"
  if (/draw/i.test(result)) return "คู่นี้ออกได้หลายหน้าและมีโอกาสเบียดกันสูง"
  return "นี่คือผลหลักที่ระบบสรุปจากโมเดลทั้งหมด"
}

function getConsensusSummary(comparison: ParsedPredictionResponse["comparison"]) {
  const normalized = comparison.map((item) => item.prediction.toLowerCase()).filter(Boolean)
  if (normalized.length === 0) return "ยังสรุปฉันทามติของโมเดลไม่ได้"
  if (normalized.every((item) => item.includes("home"))) return "ทุกโมเดลเทไปทางเจ้าบ้าน"
  if (normalized.every((item) => item.includes("away"))) return "ทุกโมเดลเทไปทางทีมเยือน"
  if (normalized.every((item) => item.includes("draw"))) return "ทุกโมเดลมองว่ามีโอกาสเสมอ"
  return "โมเดลยังให้มุมมองแตกต่างกันอยู่"
}

function ProbabilityRail({ home, draw, away, compact = false }: { home: number; draw: number; away: number; compact?: boolean }) {
  return (
    <div className={cn("space-y-2", compact && "space-y-1.5")}>
      <div className="grid grid-cols-3 text-center text-[11px] font-semibold text-muted-foreground">
        <span className="text-left text-foreground">{home}%</span>
        <span>{draw}%</span>
        <span className="text-right text-primary">{away}%</span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted/80">
        <div className="bg-foreground/70" style={{ width: `${home}%` }} />
        <div className="bg-border" style={{ width: `${draw}%` }} />
        <div className="bg-primary" style={{ width: `${away}%` }} />
      </div>
    </div>
  )
}

function getPredictionOutcomeStatus(entry: PredictionAuditEntry): ActualOutcomeStatus {
  if (entry.notes?.includes("422")) return "unavailable"
  if (entry.actualWinner === "pending") return "pending"
  if (entry.actualWinner === "draw" && entry.predictedResult === "Draw") return "correct"
  if (entry.actualWinner === "home" && entry.predictedResult === "Home win") return "correct"
  if (entry.actualWinner === "away" && entry.predictedResult === "Away win") return "correct"
  return "incorrect"
}

function getPredictionStatusLabel(status: ActualOutcomeStatus) {
  if (status === "correct") return "ทายถูก"
  if (status === "incorrect") return "ทายผิด"
  if (status === "unavailable") return "ข้อมูลไม่ครบ"
  return "ยังไม่แข่ง"
}

function getPredictionStatusTone(status: ActualOutcomeStatus) {
  if (status === "correct") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  if (status === "incorrect") return "border-rose-500/30 bg-rose-500/10 text-rose-300"
  if (status === "unavailable") return "border-amber-500/30 bg-amber-500/10 text-amber-300"
  return "border-border/60 bg-muted/40 text-muted-foreground"
}

function getPredictionStatusIcon(status: ActualOutcomeStatus) {
  if (status === "correct") return CheckCircle2
  if (status === "incorrect") return XCircle
  return Clock3
}

export function WorldcupPredictionPanel() {
  const [activeRound, setActiveRound] = useState<FixtureRoundKey>("round32")
  const activeFixtures = fixturesByRound[activeRound]
  const firstActiveFixture = activeFixtures[0]

  const [form, setForm] = useState<PredictionRequest>({
    home_team: firstActiveFixture?.home_team ?? "",
    away_team: firstActiveFixture?.away_team ?? "",
    neutral: firstActiveFixture?.neutral ?? true,
    tournament_weight: firstActiveFixture?.tournament_weight ?? 5,
  })
  const [result, setResult] = useState<ParsedPredictionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>(firstActiveFixture?.id ?? "")
  const [deepRoundPredictions, setDeepRoundPredictions] = useState<Record<"quarterfinals" | "semifinals", DeepRoundPredictionItem[]>>({
    quarterfinals: [],
    semifinals: [],
  })
  const [deepRoundLoading, setDeepRoundLoading] = useState<Record<"quarterfinals" | "semifinals", boolean>>({
    quarterfinals: false,
    semifinals: false,
  })
  const [deepRoundError, setDeepRoundError] = useState<Record<"quarterfinals" | "semifinals", string | null>>({
    quarterfinals: null,
    semifinals: null,
  })

  useEffect(() => {
    const nextFixture = fixturesByRound[activeRound][0]
    setSelectedFixtureId(nextFixture?.id ?? "")
    setForm({
      home_team: nextFixture?.home_team ?? "",
      away_team: nextFixture?.away_team ?? "",
      neutral: nextFixture?.neutral ?? true,
      tournament_weight: nextFixture?.tournament_weight ?? 5,
    })
    setResult(null)
    setError(null)
  }, [activeRound])

  const activePredictionAudit = useMemo(
    () =>
      predictionAuditByRound[activeRound]
        .map((entry) => {
          const fixture = activeFixtures.find((item) => item.id === entry.fixtureId)
          if (!fixture) return null
          const status = getPredictionOutcomeStatus(entry)
          return { fixture, entry, status }
        })
        .filter(Boolean) as Array<{ fixture: FeaturedFixture; entry: PredictionAuditEntry; status: ActualOutcomeStatus }>,
    [activeFixtures, activeRound],
  )

  const auditSummary = useMemo(() => {
    const played = activePredictionAudit.filter((item) => item.status === "correct" || item.status === "incorrect")
    const correct = played.filter((item) => item.status === "correct").length
    const unavailable = activePredictionAudit.filter((item) => item.status === "unavailable").length
    const pending = activePredictionAudit.filter((item) => item.status === "pending").length

    return {
      played: played.length,
      correct,
      incorrect: played.length - correct,
      unavailable,
      pending,
      accuracy: played.length > 0 ? Math.round((correct / played.length) * 100) : 0,
    }
  }, [activePredictionAudit])

  const activeRoundMeta = roundOptions.find((option) => option.key === activeRound) ?? roundOptions[0]
  const friendlyError = error ? getFriendlyErrorMessage(error) : null

  async function callPredictMatch(payload: PredictionRequest) {
    const data = await fetchJson<{ raw?: QuarterfinalPredictionResponse; error?: string }>("/worldcup-prediction", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    if (data.raw?.ok === false) {
      throw new Error(data.raw.error || data.error || "Prediction API request failed")
    }

    if (!data.raw) {
      throw new Error(data.error || "Prediction API returned no payload")
    }

    return data.raw
  }

  async function fetchDeepRoundPredictions(roundKey: "quarterfinals" | "semifinals") {
    setDeepRoundLoading((current) => ({ ...current, [roundKey]: true }))
    setDeepRoundError((current) => ({ ...current, [roundKey]: null }))

    try {
      const health = await fetchJson<HealthResponse>("/worldcup-prediction")
      if (health.ok === false) {
        throw new Error(health.error || "Prediction service is not ready")
      }

      const fixtures = fixturesByRound[roundKey]
      const roundName = roundKey === "quarterfinals" ? "QF" : "SF"
      const responses = await Promise.all(
        fixtures.map(async (fixture) => ({
          fixture,
          response: await callPredictMatch({
            home_team: fixture.home_team,
            away_team: fixture.away_team,
            neutral: fixture.neutral,
            tournament_weight: fixture.tournament_weight,
            round_name: roundName,
          }),
        })),
      )

      setDeepRoundPredictions((current) => ({ ...current, [roundKey]: responses }))
    } catch (requestError) {
      setDeepRoundPredictions((current) => ({ ...current, [roundKey]: [] }))
      setDeepRoundError((current) => ({
        ...current,
        [roundKey]: requestError instanceof Error ? requestError.message : "Prediction request failed",
      }))
    } finally {
      setDeepRoundLoading((current) => ({ ...current, [roundKey]: false }))
    }
  }

  useEffect(() => {
    if (
      (activeRound === "quarterfinals" || activeRound === "semifinals") &&
      deepRoundPredictions[activeRound].length === 0 &&
      !deepRoundLoading[activeRound] &&
      !deepRoundError[activeRound]
    ) {
      void fetchDeepRoundPredictions(activeRound)
    }
  }, [activeRound, deepRoundError, deepRoundLoading, deepRoundPredictions])

  async function handlePredict() {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchJson<PredictionApiResponse>("/worldcup-prediction", {
        method: "POST",
        body: JSON.stringify(form),
      })
      setResult(data.parsed)
    } catch (requestError) {
      setResult(null)
      setError(requestError instanceof Error ? requestError.message : "Prediction request failed")
    } finally {
      setLoading(false)
    }
  }

  function handleFixtureSelect(fixture: FeaturedFixture) {
    setSelectedFixtureId(fixture.id)
    setForm({
      home_team: fixture.home_team,
      away_team: fixture.away_team,
      neutral: fixture.neutral,
      tournament_weight: fixture.tournament_weight,
      round_name: fixture.id.includes("-qf-") ? "QF" : fixture.id.includes("-sf-") ? "SF" : fixture.id.includes("-final-") ? "Final" : undefined,
    })
    setResult(null)
    setError(null)
  }

  return (
    <section className="relative overflow-hidden border-t border-border py-14">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(184,255,0,0.06),transparent_28%),linear-gradient(180deg,#121212_0%,#1a1a1a_100%)]" />

      <div className="relative container mx-auto px-4">
        <div className="mx-auto mb-10 max-w-4xl text-center">
          <Badge variant="outline" className="mb-5 border-primary/30 bg-primary/10 px-4 py-1.5 text-primary">
            <Brain className="mr-2 h-3.5 w-3.5" />
            Prediction Studio
          </Badge>
          <h2 className="text-4xl font-display leading-tight md:text-6xl">
            World Cup Knockout Predictions
            <span className="block bg-gradient-to-r from-white via-zinc-200 to-primary bg-clip-text text-transparent">
              เลือกรอบ แล้วค่อยเลือกคู่
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
            รองรับรอบ 32 ทีม, รอบ 16 ทีม และรอบ 8 ทีมในหน้าเดียว โดยให้เลือกคู่จากรายการด้านซ้ายแล้วค่อยเปิดผลทำนายด้านขวา
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          {roundOptions.map((option) => (
            <Button
              key={option.key}
              type="button"
              variant={activeRound === option.key ? "default" : "outline"}
              disabled={!option.enabled}
              onClick={() => option.enabled && setActiveRound(option.key)}
              className={cn(
                "rounded-full px-5",
                activeRound === option.key && "bg-primary text-primary-foreground hover:bg-primary/90",
                !option.enabled && "cursor-not-allowed opacity-60",
              )}
            >
              {!option.enabled ? <Lock className="mr-2 h-3.5 w-3.5" /> : null}
              {option.label}
            </Button>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[460px_minmax(0,1fr)]">
          <Card className="overflow-hidden border-border/70 bg-card/90 shadow-[0_24px_60px_rgba(0,0,0,0.2)]">
            <CardHeader className="border-b border-border/60 pb-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl">Upcoming Matches</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{activeRoundMeta.label} • เลือกคู่ที่อยากดู แล้วค่อยโหลดผลทำนาย</p>
                </div>
                <Badge className="bg-primary text-primary-foreground">{activeFixtures.length} Matches</Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Accordion type="single" collapsible value={selectedFixtureId} onValueChange={(value) => value && setSelectedFixtureId(value)}>
                {activeFixtures.map((fixture) => {
                  const isSelected = selectedFixtureId === fixture.id

                  return (
                    <AccordionItem
                      key={fixture.id}
                      value={fixture.id}
                      className={cn("border-b border-border/60 px-5 last:border-b-0", isSelected && "bg-primary/[0.045]")}
                    >
                      <AccordionTrigger className="py-5 hover:no-underline" onClick={() => handleFixtureSelect(fixture)}>
                        <div className="w-full pr-3 text-left">
                          <div className="mb-3 flex items-center justify-between gap-4">
                            <span className="text-sm font-medium text-muted-foreground">{fixture.stage}</span>
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                          </div>

                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                            <div className="min-w-0 text-left">
                              <p className="truncate text-base font-semibold">{fixture.home_team}</p>
                            </div>
                            <div className="rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground">VS</div>
                            <div className="min-w-0 text-right">
                              <p className="truncate text-base font-semibold">{fixture.away_team}</p>
                            </div>
                          </div>

                          <div className="mt-4">
                            <ProbabilityRail home={fixture.preview.home} draw={fixture.preview.draw} away={fixture.preview.away} compact />
                          </div>

                          <p className="mt-3 text-center text-xs uppercase tracking-[0.18em] text-muted-foreground">{fixture.dateLabel}</p>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent>
                        <div className="pb-5">
                          <div className="rounded-[22px] border border-border/60 bg-background/70 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{fixture.stage}</Badge>
                              <Badge variant="outline">{fixture.neutral ? "Neutral Venue" : "Host Advantage"}</Badge>
                            </div>

                            <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                              <p className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary" />
                                {fixture.dateLabel}
                              </p>
                              <p className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                {fixture.venue}
                              </p>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-3">
                              <Button type="button" onClick={() => handleFixtureSelect(fixture)} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                                เลือกคู่นี้
                              </Button>
                              <Button type="button" variant="outline" onClick={handlePredict} disabled={loading} className="rounded-full">
                                {loading && selectedFixtureId === fixture.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                ทำนายทันที
                              </Button>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Prediction Error</AlertTitle>
                <AlertDescription>{friendlyError}</AlertDescription>
              </Alert>
            )}

            {!result && !error && (
              <Card className="border-border/70 bg-card/90">
                <CardContent className="flex min-h-[420px] flex-col items-center justify-center px-6 py-10 text-center">
                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] bg-primary/10 text-primary">
                    <Target className="h-10 w-10" />
                  </div>
                  <p className="text-2xl font-semibold">รอผลทำนาย</p>
                  <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">
                    เลือกคู่จากรายการด้านซ้าย แล้วกดทำนายเพื่อเปิดผลวิเคราะห์ของแมตช์นั้น
                  </p>
                </CardContent>
              </Card>
            )}

            {result && (
              <div className="space-y-6">
                <Card className="overflow-hidden border-primary/20 bg-[linear-gradient(135deg,rgba(184,255,0,0.08),rgba(255,255,255,0.03))]">
                  <CardContent className="p-7">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 py-1.5 text-sm text-primary">
                      <WandSparkles className="h-4 w-4" />
                      AI Summary
                    </div>
                    <h3 className="text-3xl font-display leading-tight md:text-5xl">{result.officialPrediction}</h3>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">{getResultTone(result.officialPrediction)}</p>
                    <div className="mt-6 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-border/60 bg-card/80 px-4 py-4">
                        <p className="text-xs text-muted-foreground">Round</p>
                        <p className="mt-1 font-semibold">{activeRoundMeta.label}</p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-card/80 px-4 py-4">
                        <p className="text-xs text-muted-foreground">{result.resultLabel}</p>
                        <p className="mt-1 text-xl font-semibold">{result.officialPrediction}</p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-card/80 px-4 py-4">
                        <p className="text-xs text-muted-foreground">Confidence</p>
                        <p className="mt-1 text-xl font-semibold">{result.confidence == null ? "-" : formatConfidence(result.confidence)}</p>
                        <p className="text-xs text-primary">{result.confidenceLabel}</p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-card/80 px-4 py-4 md:col-span-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Match</p>
                            <p className="mt-1 font-semibold">{form.home_team} vs {form.away_team}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">{result.scoreLabel}</p>
                            <p className="mt-1 font-semibold">{result.predictedScore}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/70 bg-card/90">
                  <CardHeader>
                    <CardTitle className="text-xl">Win Probabilities</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{form.home_team}</span>
                        <span className="font-semibold">{formatProbability(result.homeProbability)}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-foreground/80" style={{ width: `${result.homeProbability ?? 0}%` }} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Draw</span>
                        <span className="font-semibold">{formatProbability(result.drawProbability)}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-border" style={{ width: `${result.drawProbability ?? 0}%` }} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{form.away_team}</span>
                        <span className="font-semibold text-primary">{formatProbability(result.awayProbability)}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${result.awayProbability ?? 0}%` }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/70 bg-card/90">
                  <CardHeader>
                    <CardTitle className="text-xl">Model Comparison</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-3">
                    {result.comparison.map((model) => (
                      <div key={model.key} className="rounded-[22px] border border-border/60 bg-background/60 p-4">
                        <p className="text-sm text-muted-foreground">{model.label}</p>
                        <p className="mt-2 text-xl font-semibold">{model.prediction}</p>
                        <p className="mt-2 text-sm text-muted-foreground">Score: {model.score}</p>
                        <p className="mt-2 text-sm text-muted-foreground">Consensus: {getConsensusSummary(result.comparison)}</p>
                        <div className="mt-4 space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Home</span>
                            <span>{formatProbability(model.homeProbability)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Draw</span>
                            <span>{formatProbability(model.drawProbability)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Away</span>
                            <span>{formatProbability(model.awayProbability)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-border/70 bg-card/90">
                  <CardHeader>
                    <CardTitle className="text-xl">All Models</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    {result.models.length > 0 ? (
                      result.models.map((model, index) => (
                        <div key={`${pickStringValue(model, "name") || "model"}-${index}`} className="rounded-[22px] border border-border/60 bg-background/60 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold">{pickStringValue(model, "name") || `Model ${index + 1}`}</p>
                            <Badge variant="outline">{formatConfidence(pickNumberValue(model, "confidence"))}</Badge>
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-xs text-muted-foreground">Predicted result</p>
                              <p className="mt-1 font-semibold">{pickStringValue(model, "predicted_result") || "-"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Predicted score</p>
                              <p className="mt-1 font-semibold">{pickStringValue(model, "predicted_score") || "-"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Home win</p>
                              <p className="mt-1 font-semibold">{formatApiProbability(pickNumberValue(model, "home_win_prob") ?? undefined)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Draw</p>
                              <p className="mt-1 font-semibold">{formatApiProbability(pickNumberValue(model, "draw_prob") ?? undefined)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Away win</p>
                              <p className="mt-1 font-semibold">{formatApiProbability(pickNumberValue(model, "away_win_prob") ?? undefined)}</p>
                            </div>
                          </div>
                          <p className="mt-4 text-sm leading-6 text-muted-foreground">{pickStringValue(model, "notes") || "No notes from this model"}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล model comparison จาก API</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <Card className="border-border/70 bg-card/90">
            <CardHeader className="border-b border-border/60 pb-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl">Prediction vs Actual</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">เทียบผลที่ระบบทำนายไว้กับผลจริงของแต่ละคู่ใน {activeRoundMeta.label}</p>
                </div>
                <Badge className="bg-primary text-primary-foreground">Accuracy {auditSummary.correct}/{auditSummary.played}</Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-[22px] border border-border/60 bg-background/60 p-4">
                  <p className="text-xs text-muted-foreground">ความแม่นที่วัดได้</p>
                  <p className="mt-2 text-3xl font-semibold text-primary">{auditSummary.accuracy}%</p>
                  <p className="mt-2 text-sm text-muted-foreground">นับเฉพาะคู่ที่มีผลจริงและมี prediction ใช้วัดได้</p>
                </div>
                <div className="rounded-[22px] border border-border/60 bg-background/60 p-4">
                  <p className="text-xs text-muted-foreground">ทายถูก</p>
                  <p className="mt-2 text-3xl font-semibold">{auditSummary.correct}</p>
                  <p className="mt-2 text-sm text-muted-foreground">คู่ที่ผู้ชนะตรงกับผลจริง</p>
                </div>
                <div className="rounded-[22px] border border-border/60 bg-background/60 p-4">
                  <p className="text-xs text-muted-foreground">ทายผิด</p>
                  <p className="mt-2 text-3xl font-semibold">{auditSummary.incorrect}</p>
                  <p className="mt-2 text-sm text-muted-foreground">คู่ที่ผลทำนายสวนกับผลจริง</p>
                </div>
                <div className="rounded-[22px] border border-border/60 bg-background/60 p-4">
                  <p className="text-xs text-muted-foreground">รอผล / ข้อมูลไม่ครบ</p>
                  <p className="mt-2 text-3xl font-semibold">{auditSummary.pending + auditSummary.unavailable}</p>
                  <p className="mt-2 text-sm text-muted-foreground">รวมคู่ที่ยังไม่แข่งหรือ model ยังไม่มี data</p>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {activePredictionAudit.map(({ fixture, entry, status }) => {
                  const StatusIcon = getPredictionStatusIcon(status)

                  return (
                    <div key={fixture.id} className="rounded-[24px] border border-border/60 bg-background/60 p-5">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{fixture.stage}</p>
                          <h3 className="mt-2 text-lg font-semibold">
                            {fixture.home_team} vs {fixture.away_team}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {fixture.dateLabel} • {fixture.venue}
                          </p>
                        </div>
                        <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold", getPredictionStatusTone(status))}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {getPredictionStatusLabel(status)}
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
                          <p className="text-xs text-muted-foreground">Prediction</p>
                          <p className="mt-2 font-semibold">{entry.predictedResult}</p>
                          <p className="mt-1 text-sm text-muted-foreground">Score: {entry.predictedScore}</p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
                          <p className="text-xs text-muted-foreground">Actual</p>
                          <p className="mt-2 font-semibold">{entry.actualWinner === "pending" ? "Pending" : entry.actualScore}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{entry.actualWinner === "pending" ? "ยังไม่มีผลแข่งจริง" : "ผลจริงของแมตช์นี้"}</p>
                        </div>
                      </div>

                      {entry.notes ? <p className="mt-4 text-sm text-amber-300">{entry.notes}</p> : null}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

