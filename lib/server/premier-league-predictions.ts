import { promises as fs } from "fs"
import path from "path"

import { CsvPrediction, getDisplayTeamName, getPredictionLookupKey, parsePredictionCsv } from "@/lib/premier-league-predictions"

let cachedPredictions: CsvPrediction[] | null = null

export async function loadPremierLeaguePredictions() {
  if (cachedPredictions) return cachedPredictions
  const filePath = path.join(process.cwd(), "public", "predictions_2026_2027_retrained_h2h.csv")
  const csvText = await fs.readFile(filePath, "utf8")
  cachedPredictions = parsePredictionCsv(csvText)
  return cachedPredictions
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

  return null
}
