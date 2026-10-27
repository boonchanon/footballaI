import { NextResponse } from "next/server"

import { footballService } from "@/app/api/football/service"
import { CsvPrediction, getDisplayTeamName, getPredictionLookupKey } from "@/lib/premier-league-predictions"
import { loadPredictionsManifest, loadPremierLeaguePredictions } from "@/lib/server/premier-league-predictions"

type Outcome = "home" | "draw" | "away"

// Public, unauthenticated teaser data. Exact probabilities, scores and per-match
// past predictions stay behind the coin unlock, so this only exposes:
// - a coarse lean (rounded to 10%) for matches that have not finished
// - aggregate correct/total counts per matchweek for finished matches
const CACHE_MS = 5 * 60 * 1000
// The cache also resets as soon as a weekly refresh publishes new predictions.
let cached: { at: number; updatedAt: string | null; body: unknown } | null = null

function predictedOutcome(prediction: CsvPrediction): Outcome | null {
  if (prediction.predictedResult === "เจ้าบ้านชนะ") return "home"
  if (prediction.predictedResult === "เสมอ") return "draw"
  if (prediction.predictedResult === "ทีมเยือนชนะ") return "away"
  return null
}

function actualOutcome(home: number, away: number): Outcome {
  return home > away ? "home" : home < away ? "away" : "draw"
}

function roundToTen(value: number | null) {
  if (value == null) return null
  const percent = value <= 1 ? value * 100 : value
  return Math.round(percent / 10) * 10
}

function pairKey(home: string, away: string) {
  return getPredictionLookupKey("", getDisplayTeamName(home), getDisplayTeamName(away))
}

export async function GET() {
  const manifest = await loadPredictionsManifest()
  const updatedAt = manifest?.updatedAt ?? null
  if (cached && cached.updatedAt === updatedAt && Date.now() - cached.at < CACHE_MS) return NextResponse.json(cached.body)

  try {
    const [predictions, fixtures] = await Promise.all([loadPremierLeaguePredictions(), footballService.getFixtures({ type: "all" })])
    // Each home/away pairing occurs once per season, so the pair identifies the fixture.
    const byPair = new Map(predictions.map((item) => [pairKey(item.homeTeam, item.awayTeam), item]))

    const leans: Record<string, { home: number | null; draw: number | null; away: number | null; outcome: Outcome | null }> = {}
    const weeks = new Map<number, { correct: number; total: number }>()

    for (const fixture of fixtures as any[]) {
      const prediction =
        byPair.get(pairKey(fixture.teams?.home?.nameEn || fixture.teams?.home?.name || "", fixture.teams?.away?.nameEn || fixture.teams?.away?.name || "")) ??
        byPair.get(pairKey(fixture.teams?.home?.name || "", fixture.teams?.away?.name || ""))
      if (!prediction) continue

      const outcome = predictedOutcome(prediction)
      const homeGoals = fixture.goals?.home
      const awayGoals = fixture.goals?.away

      if (fixture.status?.isFinished && typeof homeGoals === "number" && typeof awayGoals === "number") {
        if (!outcome || !fixture.roundNumber) continue
        const week = weeks.get(fixture.roundNumber) ?? { correct: 0, total: 0 }
        week.total += 1
        if (outcome === actualOutcome(homeGoals, awayGoals)) week.correct += 1
        weeks.set(fixture.roundNumber, week)
        continue
      }

      leans[String(fixture.id)] = {
        home: roundToTen(prediction.homeWin),
        draw: roundToTen(prediction.draw),
        away: roundToTen(prediction.awayWin),
        outcome,
      }
    }

    const record = [...weeks.entries()].sort((left, right) => left[0] - right[0]).map(([week, value]) => ({ week, ...value }))
    const season = record.reduce((sum, item) => ({ correct: sum.correct + item.correct, total: sum.total + item.total }), { correct: 0, total: 0 })
    const lastUpdate = manifest ? { updatedAt: manifest.updatedAt, lastKnownResultDate: manifest.lastKnownResultDate ?? null } : null
    const body = { leans, record, season, lastUpdate }
    cached = { at: Date.now(), updatedAt, body }
    return NextResponse.json(body)
  } catch (error) {
    console.error("[ai-prediction/insights] failed", error)
    return NextResponse.json({ leans: {}, record: [], season: { correct: 0, total: 0 } }, { status: 500 })
  }
}
