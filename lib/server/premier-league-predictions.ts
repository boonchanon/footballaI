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

  // Fixture feeds can represent an evening kickoff in UTC while the UI presents
  // its local calendar date. Accept a one-day boundary difference only when the
  // two teams still match exactly after normalization.
  const inputHome = getDisplayTeamName(input.homeTeam)
  const inputAway = getDisplayTeamName(input.awayTeam)
  const fixtureTime = Date.parse(`${input.fixtureDate}T00:00:00Z`)
  if (Number.isFinite(fixtureTime)) {
    const closeDateMatch = predictions.find((item) => {
      const predictionTime = Date.parse(`${item.fixtureDate}T00:00:00Z`)
      return (
        Number.isFinite(predictionTime) &&
        Math.abs(predictionTime - fixtureTime) === 24 * 60 * 60 * 1000 &&
        getPredictionLookupKey("", item.homeTeam, item.awayTeam) === getPredictionLookupKey("", inputHome, inputAway)
      )
    })
    if (closeDateMatch) return closeDateMatch
  }

  return null
}
