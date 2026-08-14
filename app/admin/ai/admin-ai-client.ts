"use client"

export const ADMIN_AI_API_BASE_URL =
  process.env.NEXT_PUBLIC_epl_PREDICTION_API_BASE_URL?.trim() ||
  "https://football-predictionwc-api.onrender.com"

type JsonRecord = Record<string, any>

export type AdminAiStatusSummary = {
  teamsLoaded: number
  bestModelLabel: string
  bestModelAccuracy: number | null
  latestSeason: string
  latestPredictionFile: string
  rawFileCount: number
  totalMatches: number
  seasonCount: number
  files: Array<{
    filename: string
    season: string
    matches: number
  }>
  models: Array<{
    key: string
    label: string
    accuracy: number | null
    f1Macro: number | null
    logLoss: number | null
    brierScore: number | null
    isBest: boolean
  }>
  teams: string[]
  healthLabel: string
}

export type UploadPipelineResult = {
  message: string
  duplicateNotice: string | null
  matchesAdded: number
  duplicatesRemoved: number
  latestSeason: string
  featureRows: number
  processedFiles: number
  uploadedFiles: string[]
  duplicateFiles: string[]
}

export type ExportPipelineResult = {
  season: string
  filename: string
  filePath: string
  predictionCount: number
  dateRange: string
  downloadUrl: string
}

export type MatchPredictionResult = {
  homeWin: number | null
  draw: number | null
  awayWin: number | null
  expectedGoals: {
    home: number | null
    away: number | null
  }
  topScores: Array<{
    score: string
    probability: number | null
  }>
  summary: string
}

export type DeleteRawFileResult = {
  filename: string
  rawFileCount: number
  latestSeason: string
  totalMatches: number
  message: string
}

function toRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function toArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function normalizePercent(value: unknown) {
  const parsed = toNumber(value)
  if (parsed == null) return null
  return parsed <= 1 ? parsed * 100 : parsed
}

function pickFirstNumber(source: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const parsed = toNumber(source[key])
    if (parsed != null) return parsed
  }
  return null
}

function pickFirstString(source: JsonRecord, keys: string[], fallback = "-") {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return fallback
}

function normalizeStringList(value: unknown) {
  return toArray<string>(value)
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
}

function containsDuplicateHint(value: unknown) {
  if (typeof value !== "string") return false
  return /duplicate|already exists|file exists|มีอยู่แล้ว|ไฟล์ซ้ำ/i.test(value)
}

function isNotFoundError(error: unknown) {
  return error instanceof Error && /404|not found/i.test(error.message)
}

async function fetchJson(path: string, init?: RequestInit) {
  const response = await fetch(`${ADMIN_AI_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers || {}),
    },
  })

  const contentType = response.headers.get("content-type") || ""
  const payload = contentType.includes("application/json") ? await response.json().catch(() => null) : await response.text()

  if (!response.ok) {
    const errorMessage =
      typeof payload === "string"
        ? payload
        : payload?.error || payload?.detail || payload?.message || `Request failed with status ${response.status}`
    throw new Error(errorMessage)
  }

  return payload
}

export async function fetchAdminAiSummary(): Promise<AdminAiStatusSummary> {
  const healthRaw = await fetchJson("/health")
  let statusRaw: unknown = null

  try {
    statusRaw = await fetchJson("/pipeline/status")
  } catch (error) {
    if (!isNotFoundError(error)) throw error
  }

  const health = toRecord(healthRaw)
  const status = toRecord(statusRaw)
  const summary = toRecord(status.summary)
  const inventory = toRecord(status.inventory)
  const warehouse = toRecord(status.warehouse)
  const evaluation = toRecord(status.evaluation)
  const prediction = toRecord(status.prediction)

  const rawModels = toArray(status.models ?? evaluation.models).map((item, index) => {
    const model = toRecord(item)
    return {
      key: pickFirstString(model, ["key", "name", "model", "id"], `model-${index + 1}`),
      label: pickFirstString(model, ["label", "name", "model"], `Model ${index + 1}`),
      accuracy: normalizePercent(model.accuracy),
      f1Macro: toNumber(model.f1_macro ?? model.f1Macro),
      logLoss: toNumber(model.log_loss ?? model.logLoss),
      brierScore: toNumber(model.brier_score ?? model.brierScore),
      isBest: Boolean(model.is_best ?? model.isBest),
    }
  })

  const derivedBestAccuracy = [...rawModels]
    .filter((item) => item.accuracy != null)
    .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0))[0]

  const models = rawModels.map((item) => ({
    ...item,
    isBest: item.isBest || item.key === derivedBestAccuracy?.key,
  }))

  const recognizedFilesSource =
    status.files ??
    status.recognized_files ??
    inventory.files ??
    inventory.recognized_files ??
    warehouse.files ??
    warehouse.recognized_files

  const files = toArray(recognizedFilesSource).map((item, index) => {
    const file = toRecord(item)
    return {
      filename: pickFirstString(file, ["filename", "file_name", "name"], `File ${index + 1}`),
      season: pickFirstString(file, ["season", "season_label", "seasonLabel"], "-"),
      matches: pickFirstNumber(file, ["matches", "match_count", "matchCount", "rows"]) ?? 0,
    }
  })

  const seasonsAvailable = Array.from(
    new Set([
      ...normalizeStringList(status.seasons_available),
      ...normalizeStringList(summary.seasons_available),
      ...normalizeStringList(warehouse.seasons_available),
      ...normalizeStringList(inventory.seasons_available),
    ]),
  )

  const teams = Array.from(new Set(normalizeStringList(status.teams ?? summary.teams ?? prediction.teams)))

  return {
    teamsLoaded:
      pickFirstNumber(summary, ["teamsLoaded", "teams_loaded", "teamCount"]) ??
      pickFirstNumber(warehouse, ["teamsLoaded", "teams_loaded", "teamCount"]) ??
      teams.length,
    bestModelLabel:
      models.find((item) => item.isBest)?.label ||
      pickFirstString(evaluation, ["bestModel", "best_model", "bestModelLabel"], "ยังไม่มีผลประเมิน"),
    bestModelAccuracy:
      models.find((item) => item.isBest)?.accuracy ??
      normalizePercent(evaluation.bestAccuracy ?? evaluation.best_accuracy),
    latestSeason:
      pickFirstString(summary, ["latestSeason", "latest_season"]) ||
      pickFirstString(warehouse, ["latestSeason", "latest_season"]) ||
      pickFirstString(inventory, ["latestSeason", "latest_season"]) ||
      seasonsAvailable[seasonsAvailable.length - 1] ||
      "-",
    latestPredictionFile:
      pickFirstString(prediction, ["latestPredictionFile", "latest_prediction_file", "latestExport", "latest_export"], "ยังไม่มีไฟล์"),
    rawFileCount:
      pickFirstNumber(inventory, ["rawFileCount", "raw_file_count", "fileCount"]) ??
      pickFirstNumber(summary, ["rawFileCount", "raw_file_count"]) ??
      files.length,
    totalMatches:
      pickFirstNumber(warehouse, ["totalMatches", "total_matches", "matchCount"]) ??
      pickFirstNumber(summary, ["totalMatches", "total_matches"]) ??
      files.reduce((sum, item) => sum + item.matches, 0),
    seasonCount:
      pickFirstNumber(warehouse, ["seasonCount", "season_count"]) ??
      pickFirstNumber(summary, ["seasonCount", "season_count"]) ??
      pickFirstNumber(inventory, ["seasonCount", "season_count"]) ??
      seasonsAvailable.length ??
      new Set(files.map((item) => item.season).filter((item) => item !== "-")).size,
    files,
    models,
    teams,
    healthLabel:
      statusRaw == null
        ? "backend พร้อม แต่ deploy ปัจจุบันยังไม่มี pipeline status"
        : pickFirstString(health, ["status", "message"], "พร้อมใช้งาน"),
  }
}

export async function uploadLatestSeasonFile(files: File[]): Promise<UploadPipelineResult> {
  const formData = new FormData()
  for (const file of files) {
    formData.append("file", file)
  }

  const payload = toRecord(await fetchJson("/pipeline/upload", { method: "POST", body: formData }))
  const duplicateDetected =
    payload.duplicate === true ||
    payload.file_exists === true ||
    payload.already_exists === true ||
    containsDuplicateHint(payload.upload_validation) ||
    containsDuplicateHint(payload.notice) ||
    containsDuplicateHint(payload.message) ||
    containsDuplicateHint(payload.status)

  return {
    message: pickFirstString(payload, ["message", "status"], "อัปโหลดและอัปเดตข้อมูลสำเร็จ"),
    duplicateNotice: duplicateDetected
      ? "ไฟล์นี้มีอยู่แล้ว ระบบจะใช้ข้อมูลเดิมประมวลผลต่อ"
      : typeof payload.upload_validation === "string" && payload.upload_validation.trim()
        ? payload.upload_validation.trim()
        : typeof payload.notice === "string" && payload.notice.trim()
          ? payload.notice.trim()
          : null,
    matchesAdded: pickFirstNumber(payload, ["matches_added", "matchesAdded", "new_matches"]) ?? 0,
    duplicatesRemoved: pickFirstNumber(payload, ["duplicates_removed", "duplicatesRemoved", "removed_duplicates"]) ?? 0,
    latestSeason: pickFirstString(payload, ["latest_season", "latestSeason", "season"], "-"),
    featureRows: pickFirstNumber(payload, ["feature_rows", "featureRows", "rows"]) ?? 0,
    processedFiles: pickFirstNumber(payload, ["processed_files", "processedFiles"]) ?? files.length,
    uploadedFiles: normalizeStringList(payload.uploaded_files ?? payload.uploadedFiles),
    duplicateFiles: normalizeStringList(payload.duplicate_files ?? payload.duplicateFiles),
  }
}

export async function rebuildFromRawArchive(): Promise<UploadPipelineResult> {
  const payload = toRecord(await fetchJson("/pipeline/full", { method: "POST" }))
  return {
    message: pickFirstString(payload, ["message", "status"], "สร้างข้อมูลใหม่จากไฟล์ดิบทั้งหมดสำเร็จ"),
    duplicateNotice: null,
    matchesAdded: pickFirstNumber(payload, ["matches_added", "matchesAdded", "processed_matches"]) ?? 0,
    duplicatesRemoved: pickFirstNumber(payload, ["duplicates_removed", "duplicatesRemoved", "removed_duplicates"]) ?? 0,
    latestSeason: pickFirstString(payload, ["latest_season", "latestSeason", "season"], "-"),
    featureRows: pickFirstNumber(payload, ["feature_rows", "featureRows", "rows"]) ?? 0,
    processedFiles: 0,
    uploadedFiles: [],
    duplicateFiles: [],
  }
}

export async function deleteRawArchiveFile(filename: string): Promise<DeleteRawFileResult> {
  const payload = toRecord(await fetchJson(`/pipeline/files/${encodeURIComponent(filename)}`, { method: "DELETE" }))
  return {
    filename: pickFirstString(payload, ["filename"], filename),
    rawFileCount: pickFirstNumber(payload, ["raw_file_count", "rawFileCount"]) ?? 0,
    latestSeason: pickFirstString(payload, ["latest_season", "latestSeason"], "-"),
    totalMatches: pickFirstNumber(payload, ["total_matches", "totalMatches"]) ?? 0,
    message: pickFirstString(payload, ["message"], "ลบไฟล์ออกจากคลังข้อมูลสำเร็จ"),
  }
}

export async function exportFixturePredictions(file: File, season: string): Promise<ExportPipelineResult> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("season", season)

  const payload = toRecord(await fetchJson("/predictions/export-fixtures", { method: "POST", body: formData }))
  const filename = pickFirstString(payload, ["output_filename", "filename", "file_name", "download_name"], "predictions.csv")

  return {
    season,
    filename,
    filePath: pickFirstString(payload, ["output_path", "file_path", "filePath", "path"], "-"),
    predictionCount: pickFirstNumber(payload, ["prediction_count", "predictionCount", "matches"]) ?? 0,
    dateRange: pickFirstString(payload, ["date_range", "dateRange", "period"], "-"),
    downloadUrl: `${ADMIN_AI_API_BASE_URL}/predictions/download/${encodeURIComponent(filename)}`,
  }
}

export async function predictMatchPair(homeTeam: string, awayTeam: string): Promise<MatchPredictionResult> {
  const payload = toRecord(
    await fetchJson("/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        home_team: homeTeam,
        away_team: awayTeam,
      }),
    }),
  )

  const expectedGoals = toRecord(payload.expected_goals ?? payload.expectedGoals ?? payload.xg)
  const topScores = toArray(payload.top_scores ?? payload.topScores ?? payload.scorelines).map((item) => {
    const score = toRecord(item)
    return {
      score: pickFirstString(score, ["score", "label"], "-"),
      probability: normalizePercent(score.probability ?? score.prob ?? score.value),
    }
  })

  return {
    homeWin: normalizePercent(payload.home_win ?? payload.homeWin),
    draw: normalizePercent(payload.draw),
    awayWin: normalizePercent(payload.away_win ?? payload.awayWin),
    expectedGoals: {
      home: toNumber(expectedGoals.home ?? expectedGoals.home_goals ?? expectedGoals.homeGoals ?? payload.home_xg),
      away: toNumber(expectedGoals.away ?? expectedGoals.away_goals ?? expectedGoals.awayGoals ?? payload.away_xg),
    },
    topScores,
    summary: pickFirstString(payload, ["summary", "message", "analysis"], "ประมวลผลผลทำนายสำเร็จ"),
  }
}
