export const FOOTBALL_PREDICTION_API_BASE_URL =
  process.env.WORLDCUP_PREDICTION_API_BASE_URL?.trim() ||
  process.env.VITE_API_BASE_URL?.trim() ||
  "http://127.0.0.1:8000"

export type PredictionRequest = {
  home_team: string
  away_team: string
  neutral: boolean
  tournament_weight: number
  round_name?: string
}

type UnknownRecord = Record<string, any>

type ModelApiName = "Poisson" | "balanced_random_forest" | "xgboost"

export type ModelComparisonItem = {
  key: string
  apiName: ModelApiName
  label: string
  prediction: string
  score: string
  confidence: number | null
  homeProbability: number | null
  drawProbability: number | null
  awayProbability: number | null
}

export type ParsedPredictionResponse = {
  officialPrediction: string
  predictedScore: string
  confidence: number | null
  confidenceLabel: string
  resultLabel: string
  scoreLabel: string
  homeProbability: number | null
  drawProbability: number | null
  awayProbability: number | null
  officialModel: string
  match: UnknownRecord | null
  poissonSummary: UnknownRecord | null
  bestPick: UnknownRecord | null
  models: UnknownRecord[]
  comparison: ModelComparisonItem[]
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : null
}

function pickNumber(...values: unknown[]) {
  for (const value of values) {
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

function formatPercent(value: number | null) {
  return value == null ? null : Math.max(0, Math.min(100, value <= 1 ? value * 100 : value))
}

function formatScore(source: UnknownRecord | null) {
  if (!source) return "-"
  const predictedScore = source.predicted_score
  if (typeof predictedScore === "string" && predictedScore.trim()) {
    return predictedScore.trim()
  }
  const predictedScoreRecord = asRecord(predictedScore)
  const home = pickNumber(
    predictedScoreRecord?.home,
    predictedScoreRecord?.home_score,
    source.home_score,
    source.homeGoals,
    source.home_goals,
    source.home,
  )
  const away = pickNumber(
    predictedScoreRecord?.away,
    predictedScoreRecord?.away_score,
    source.away_score,
    source.awayGoals,
    source.away_goals,
    source.away,
  )
  if (home == null || away == null) {
    return pickString(source.scoreline, source.score) || "-"
  }
  return `${home}-${away}`
}

function parseScoreValues(source: UnknownRecord | null) {
  if (!source) return null
  const predictedScore = source.predicted_score
  const predictedScoreRecord = asRecord(predictedScore)
  const home = pickNumber(
    predictedScoreRecord?.home,
    predictedScoreRecord?.home_score,
    source.home_score,
    source.homeGoals,
    source.home_goals,
    source.home,
  )
  const away = pickNumber(
    predictedScoreRecord?.away,
    predictedScoreRecord?.away_score,
    source.away_score,
    source.awayGoals,
    source.away_goals,
    source.away,
  )

  if (home == null || away == null) return null
  return { home, away }
}

function derivePredictionFromScore(source: UnknownRecord | null) {
  const score = parseScoreValues(source)
  if (!score) return ""
  if (score.home > score.away) return "Home Win"
  if (score.home < score.away) return "Away Win"
  return "Draw"
}

function derivePrediction(source: UnknownRecord | null) {
  const rawPrediction = pickString(
    source?.predicted_result,
    source?.prediction,
    source?.predicted_outcome,
    source?.outcome,
    source?.result_label,
    source?.winner,
  )
  const scoreBasedPrediction = derivePredictionFromScore(source)

  if (rawPrediction && scoreBasedPrediction) {
    const normalizedRaw = rawPrediction.toLowerCase()
    const normalizedScore = scoreBasedPrediction.toLowerCase()
    const rawLooksHome = /home|เจ้าบ้าน/.test(normalizedRaw)
    const rawLooksAway = /away|ทีมเยือน/.test(normalizedRaw)
    const rawLooksDraw = /draw|เสมอ/.test(normalizedRaw)
    const scoreLooksHome = normalizedScore === "home win"
    const scoreLooksAway = normalizedScore === "away win"
    const scoreLooksDraw = normalizedScore === "draw"

    const isConsistent =
      (rawLooksHome && scoreLooksHome) ||
      (rawLooksAway && scoreLooksAway) ||
      (rawLooksDraw && scoreLooksDraw)

    if (!isConsistent) {
      console.log("[prediction-parser] prediction/score mismatch", {
        rawPrediction,
        scoreBasedPrediction,
        score: formatScore(source),
      })
      return scoreBasedPrediction
    }
  }

  return rawPrediction || scoreBasedPrediction || "-"
}

function extractProbabilities(source: UnknownRecord | null) {
  return {
    homeProbability: formatPercent(
      pickNumber(source?.home_win, source?.home_win_prob, source?.home_probability, source?.homeProb, source?.prob_home_win),
    ),
    drawProbability: formatPercent(
      pickNumber(source?.draw, source?.draw_prob, source?.draw_probability, source?.drawProb, source?.prob_draw),
    ),
    awayProbability: formatPercent(
      pickNumber(source?.away_win, source?.away_win_prob, source?.away_probability, source?.awayProb, source?.prob_away_win),
    ),
  }
}

function getModelsArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => asRecord(item)).filter(Boolean) as UnknownRecord[] : []
}

function getModelByName(models: UnknownRecord[], name: ModelApiName) {
  return models.find((model) => model.name === name) || null
}

function getModelLabel(name: ModelApiName) {
  if (name === "balanced_random_forest") return "Balanced Random Forest"
  if (name === "xgboost") return "XGBoost"
  return "Poisson"
}

function parseModelItem(apiName: ModelApiName, source: UnknownRecord | null): ModelComparisonItem {
  const probabilities = extractProbabilities(source)
  return {
    key: apiName,
    apiName,
    label: getModelLabel(apiName),
    prediction: derivePrediction(source),
    score: formatScore(source),
    confidence: pickNumber(source?.confidence),
    ...probabilities,
  }
}

export function parsePredictionResponse(payload: unknown): ParsedPredictionResponse {
  const root = asRecord(payload) || {}
  const officialModel = pickString(root.official_model) || "-"
  const match = asRecord(root.match)
  const poissonSummary = asRecord(root.poisson_summary)
  const bestPick = asRecord(root.best_pick)
  const models = getModelsArray(root.models)
  const primaryModel = models[0] || null
  const poisson = getModelByName(models, "Poisson")
  const balancedRandomForest = getModelByName(models, "balanced_random_forest")
  const xgboost = getModelByName(models, "xgboost")
  const roundName = pickString(match?.round_name).toUpperCase()
  const isDeepRound = roundName === "QF" || roundName === "SF" || roundName === "FINAL"

  if (!poisson || !balancedRandomForest || !xgboost) {
    console.log("Prediction API response:", JSON.stringify(root, null, 2))
  }

  const primaryPredictionSource = bestPick || primaryModel || poisson || poissonSummary || root
  const officialPredictionSource = primaryPredictionSource
  const scoreSource = primaryPredictionSource
  const officialPrediction = derivePrediction(officialPredictionSource)
  const predictedScore = formatScore(scoreSource)
  const probabilities = extractProbabilities(primaryPredictionSource)
  const confidence = pickNumber(bestPick?.confidence, primaryModel?.confidence)
  const confidenceLabel =
    confidence == null ? "No confidence data" : confidence < 0.55 ? "Close matchup" : confidence >= 0.7 ? "High confidence" : "Balanced edge"

  return {
    officialPrediction,
    predictedScore,
    confidence,
    confidenceLabel,
    resultLabel: isDeepRound ? "Best pick" : "Official result",
    scoreLabel: isDeepRound ? "Projected score" : "Predicted score",
    ...probabilities,
    officialModel,
    match,
    poissonSummary,
    bestPick,
    models,
    comparison: [
      parseModelItem("Poisson", poisson),
      parseModelItem("balanced_random_forest", balancedRandomForest),
      parseModelItem("xgboost", xgboost),
    ],
  }
}
