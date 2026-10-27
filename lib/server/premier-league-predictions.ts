import { promises as fs } from "fs"
import path from "path"

import { CsvPrediction, getDisplayTeamName, getPredictionLookupKey, parsePredictionCsv } from "@/lib/premier-league-predictions"

const PREDICTIONS_PATH = path.join(process.cwd(), "public", "predictions_2026_2027_retrained_h2h.csv")
const MANIFEST_PATH = path.join(process.cwd(), "public", "predictions_manifest.json")

// The weekly refresh (npm run predict:weekly or the admin AI page) rewrites the CSV while the
// server runs, so the parsed copy is reused only while the file's modification time is unchanged.
let cachedPredictions: { mtimeMs: number; items: CsvPrediction[] } | null = null

export async function loadPremierLeaguePredictions() {
  const { mtimeMs } = await fs.stat(PREDICTIONS_PATH)
  if (cachedPredictions?.mtimeMs === mtimeMs) return cachedPredictions.items
  const csvText = await fs.readFile(PREDICTIONS_PATH, "utf8")
  cachedPredictions = { mtimeMs, items: parsePredictionCsv(csvText) }
  return cachedPredictions.items
}

export type PredictionsManifest = {
  updatedAt: string
  asOf?: string
  lastKnownResultDate?: string | null
  refreshed?: number
  frozen?: number
  modelLabel?: string
}

// Summary written by ml/src/models/weekly_refresh.py --publish; null before the first refresh.
export async function loadPredictionsManifest(): Promise<PredictionsManifest | null> {
  try {
    const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"))
    return typeof manifest?.updatedAt === "string" ? manifest : null
  } catch {
    return null
  }
}

export async function findPremierLeaguePrediction(input: {
  fixtureDate: string
  homeTeam: string
  awayTeam: string
  homeName?: string
  awayName?: string
}) {
  const predictions = await loadPremierLeaguePredictions()
  const keys = [
    getPredictionLookupKey(input.fixtureDate, input.homeTeam, input.awayTeam),
    input.homeName && input.awayName ? getPredictionLookupKey(input.fixtureDate, input.homeName, input.awayName) : null,
    getPredictionLookupKey(input.fixtureDate, getDisplayTeamName(input.homeTeam), getDisplayTeamName(input.awayTeam)),
  ].filter(Boolean) as string[]

  for (const key of keys) {
    const found = predictions.find((item) => getPredictionLookupKey(item.fixtureDate, item.homeTeam, item.awayTeam) === key)
    if (found) return found
  }

  // Each home/away pairing occurs once per season, so the teams alone identify the
  // fixture when it was rescheduled or the feed reports a UTC date shift.
  const pairKeys = new Set([
    getPredictionLookupKey("", input.homeTeam, input.awayTeam),
    getPredictionLookupKey("", getDisplayTeamName(input.homeTeam), getDisplayTeamName(input.awayTeam)),
    ...(input.homeName && input.awayName ? [getPredictionLookupKey("", input.homeName, input.awayName)] : []),
  ])
  return predictions.find((item) => pairKeys.has(getPredictionLookupKey("", item.homeTeam, item.awayTeam))) ?? null
}
