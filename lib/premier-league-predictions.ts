export type CsvPrediction = {
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

export function getDisplayTeamName(value: string) {
  return TEAM_DISPLAY_NAMES[value] || value
}

export function normalizeTeamName(value: string) {
  const normalized = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[â€™']/g, "")
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")

  return TEAM_NAME_ALIASES[normalized] || normalized
}

export function getPredictionLookupKey(date: string, homeTeam: string, awayTeam: string) {
  return `${date}__${normalizeTeamName(homeTeam)}__${normalizeTeamName(awayTeam)}`
}

export function parsePredictionCsv(csvText: string) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length <= 1) return [] as CsvPrediction[]

  const headers = parseCsvLine(lines[0])
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    return headers.reduce<Record<string, string>>((accumulator, header, index) => {
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
