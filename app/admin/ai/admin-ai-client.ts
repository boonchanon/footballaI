"use client"

import { getAuthToken } from "@/lib/auth-client"

export const ADMIN_AI_API_BASE_URL = "/api/admin-ai"

function authHeaders(): Record<string, string> {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

type JsonRecord = Record<string, any>

type PipelineStatusPayload = {
  summary?: {
    teamsLoaded?: number
    latestSeason?: string
    seasons_available?: string[]
    totalMatches?: number
    rawFileCount?: number
    seasonCount?: number
  }
  inventory?: {
    rawFileCount?: number
    recognized_files?: Array<{
      filename?: string
      season?: string
      matches?: number
    }>
  }
  models?: Array<{
    key?: string
    name?: string
    label?: string
    accuracy?: number
    f1_macro?: number
    log_loss?: number
    brier_score?: number
    is_best?: boolean
  }>
  evaluation?: {
    bestModel?: string
    bestAccuracy?: number
    models?: Array<{
      key?: string
      name?: string
      label?: string
      accuracy?: number
      f1_macro?: number
      log_loss?: number
      brier_score?: number
      is_best?: boolean
    }>
  }
  prediction?: {
    latestPredictionFile?: string
    latest_prediction_file?: string
    teams?: string[]
  }
  teams?: string[]
}

export type AdminAiStatusSummary = {
  teamsLoaded: number
  bestModelLabel: string
  bestModelAccuracy: number | null
  latestSeason: string
  latestPredictionFile: string
  latestPredictionUpdatedAt: string | null
  evaluationInfo: { testSeasons: string[]; testMatches: number; evaluatedAt: string | null }
  rawFileCount: number
  totalMatches: number
  seasonCount: number
  files: Array<{
    filename: string
    season: string
    matches: number
    uploaded: boolean
    pending: boolean
  }>
  models: Array<{
    key: string
    label: string
    accuracy: number | null
    precisionMacro: number | null
    recallMacro: number | null
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
  checkedFiles: UploadedFileCheck[]
}

export type UploadedFileCheck = {
  originalName: string
  storedFilename: string | null
  duplicate: boolean
  duplicateOf: string | null
  seasons: string[]
  matchRows: number
  isNewSeason: boolean
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
  predictedResult: string
  otherModels: { catboost: string; xgboost: string; poisson: string } | null
  basis: { date: string; lastResultDate: string } | null
}

export type DeleteRawFileResult = {
  filename: string
  rawFileCount: number
  latestSeason: string
  totalMatches: number
  message: string
}

export type WeeklyJobStatus = "queued" | "running" | "done" | "failed"
export type AdminAiJobKind = "weekly_refresh" | "train" | "upload" | "delete_file"

// A job run by prediction-service (weekly refresh, retraining, uploads); history lives in ml/logs/jobs.json.
export type AdminAiJob = {
  id: string
  kind: AdminAiJobKind | string
  label: string
  status: WeeklyJobStatus
  progress: number
  message: string
  error: string | null
  requestedBy: string
  createdAt: string | null
  startedAt: string | null
  finishedAt: string | null
  result: JsonRecord | null
  logTail: string[]
}

export type WeeklyRefreshJob = AdminAiJob

export type ModelReportRow = AdminAiStatusSummary["models"][number]

export type WeeklyRound = {
  manifestFile: string
  createdAt: string | null
  asOf: string | null
  modelLabel: string
  fixtures: number | null
  knownResults: number | null
  lastKnownResultDate: string | null
  startedWithoutResult: number | null
  refreshed: number | null
  frozen: number | null
  isLive: boolean
}

export type WeeklyHistory = {
  rounds: WeeklyRound[]
  activeJob: WeeklyRefreshJob | null
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

function toStringValue(value: unknown, fallback = "-") {
  if (typeof value !== "string") return fallback
  const normalized = value.trim()
  if (!normalized) return fallback
  if (/^(unknown|null|undefined|none|n\/a)$/i.test(normalized)) return fallback
  return normalized
}

function toStringList(value: unknown) {
  return toArray<string>(value)
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
}

function normalizePercent(value: unknown) {
  const parsed = toNumber(value)
  if (parsed == null) return null
  return parsed <= 1 ? parsed * 100 : parsed
}

function containsDuplicateHint(value: unknown) {
  if (typeof value !== "string") return false
  return /duplicate|already exists|file exists|มีอยู่แล้ว|ไฟล์ซ้ำ/i.test(value)
}

async function fetchJson(path: string, init?: RequestInit) {
  const response = await fetch(`${ADMIN_AI_API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...authHeaders(),
      ...(init?.headers || {}),
    },
  })

  const contentType = response.headers.get("content-type") || ""
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text()

  if (!response.ok) {
    const errorMessage =
      typeof payload === "string"
        ? payload
        : payload?.error || payload?.detail || payload?.message || `Request failed with status ${response.status}`
    throw new Error(errorMessage)
  }

  return payload
}

function normalizeTeamOptions(payload: PipelineStatusPayload) {
  const aliasMap = new Map<string, string>([
    ["Bournemouth", "AFC Bournemouth"],
    ["Coventry", "Coventry City"],
    ["Ipswich", "Ipswich Town"],
    ["Leeds", "Leeds United"],
    ["Newcastle", "Newcastle United"],
    ["Tottenham", "Tottenham Hotspur"],
  ])

  const deduped = new Set<string>()
  for (const team of [...toStringList(payload.teams), ...toStringList(payload.prediction?.teams)]) {
    deduped.add(aliasMap.get(team) ?? team)
  }

  return Array.from(deduped).sort((left, right) => left.localeCompare(right))
}

export async function fetchAdminAiSummary(): Promise<AdminAiStatusSummary> {
  return fetchJson("/summary") as Promise<AdminAiStatusSummary>
}

function toNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function normalizeWeeklyJob(value: unknown): AdminAiJob | null {
  const job = toRecord(value)
  if (typeof job.id !== "string") return null
  const status = ["queued", "running", "done", "failed"].includes(job.status) ? (job.status as WeeklyJobStatus) : "failed"
  return {
    id: job.id,
    kind: toStringValue(job.kind, "-"),
    label: toStringValue(job.label, toStringValue(job.kind, "-")),
    status,
    progress: toNumber(job.progress) ?? 0,
    message: typeof job.message === "string" ? job.message : "",
    error: toNullableString(job.error),
    requestedBy: toStringValue(job.requested_by, "-"),
    createdAt: toNullableString(job.created_at),
    startedAt: toNullableString(job.started_at),
    finishedAt: toNullableString(job.finished_at),
    result: job.result && typeof job.result === "object" ? (job.result as JsonRecord) : null,
    logTail: toStringList(job.log_tail),
  }
}

export async function fetchAdminAiJobs(kind?: string): Promise<{ jobs: AdminAiJob[]; activeJob: AdminAiJob | null }> {
  const query = kind ? `?kind=${encodeURIComponent(kind)}&limit=200` : "?limit=200"
  const payload = toRecord(await fetchJson(`/pipeline/jobs${query}`))
  return {
    jobs: toArray(payload.jobs).map(normalizeWeeklyJob).filter((job): job is AdminAiJob => job != null),
    activeJob: normalizeWeeklyJob(payload.active_job),
  }
}

export async function fetchAdminAiJob(jobId: string): Promise<AdminAiJob> {
  const job = normalizeWeeklyJob(toRecord(await fetchJson(`/pipeline/jobs/${encodeURIComponent(jobId)}`)).job)
  if (!job) throw new Error("ไม่พบสถานะงาน")
  return job
}

// Starts retraining (POST /pipeline/full runs as a background job and returns at once).
export async function startModelTraining(): Promise<AdminAiJob> {
  const job = normalizeWeeklyJob(toRecord(await fetchJson("/pipeline/full", { method: "POST" })).job)
  if (!job) throw new Error("ไม่ได้รับรหัสงานจากบริการทำนายผล")
  return job
}

export async function fetchWeeklyHistory(): Promise<WeeklyHistory> {
  const payload = toRecord(await fetchJson("/pipeline/weekly-history"))
  return {
    rounds: toArray(payload.rounds).map((item) => {
      const round = toRecord(item)
      return {
        manifestFile: toStringValue(round.manifest_file, "-"),
        createdAt: toNullableString(round.created_at),
        asOf: toNullableString(round.as_of),
        modelLabel: toStringValue(round.model_label, "-"),
        fixtures: toNumber(round.fixtures),
        knownResults: toNumber(round.known_results),
        lastKnownResultDate: toNullableString(round.last_known_result_date),
        startedWithoutResult: toNumber(round.started_without_result),
        refreshed: toNumber(round.refreshed),
        frozen: toNumber(round.frozen),
        isLive: round.is_live === true,
      }
    }),
    activeJob: normalizeWeeklyJob(payload.active_job),
  }
}

export async function startWeeklyRefresh(): Promise<WeeklyRefreshJob> {
  const payload = toRecord(await fetchJson("/pipeline/weekly-refresh", { method: "POST" }))
  const job = normalizeWeeklyJob(payload.job)
  if (!job) throw new Error("ไม่ได้รับรหัสงานจากบริการทำนายผล")
  return job
}

export async function fetchWeeklyRefreshJob(jobId: string): Promise<WeeklyRefreshJob> {
  const payload = toRecord(await fetchJson(`/pipeline/weekly-refresh/${encodeURIComponent(jobId)}`))
  const job = normalizeWeeklyJob(payload.job)
  if (!job) throw new Error("ไม่พบสถานะงาน")
  return job
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
    message: toStringValue(payload.message ?? payload.status, "อัปโหลดและอัปเดตข้อมูลสำเร็จ"),
    duplicateNotice: duplicateDetected
      ? "ไฟล์นี้มีอยู่แล้ว ระบบจะใช้ข้อมูลเดิมประมวลผลต่อ"
      : typeof payload.upload_validation === "string" && payload.upload_validation.trim()
        ? payload.upload_validation.trim()
        : typeof payload.notice === "string" && payload.notice.trim()
          ? payload.notice.trim()
          : null,
    matchesAdded: toNumber(payload.matches_added ?? payload.matchesAdded ?? payload.new_matches) ?? 0,
    duplicatesRemoved: toNumber(payload.duplicates_removed ?? payload.duplicatesRemoved ?? payload.removed_duplicates) ?? 0,
    latestSeason: toStringValue(payload.latest_season ?? payload.latestSeason ?? payload.season, "-"),
    featureRows: toNumber(payload.feature_rows ?? payload.featureRows ?? payload.rows) ?? 0,
    processedFiles: toNumber(payload.processed_files ?? payload.processedFiles) ?? files.length,
    uploadedFiles: toStringList(payload.uploaded_files ?? payload.uploadedFiles),
    duplicateFiles: toStringList(payload.duplicate_files ?? payload.duplicateFiles),
    checkedFiles: toArray(payload.files).map((item) => {
      const file = toRecord(item)
      return {
        originalName: toStringValue(file.original_name, "-"),
        storedFilename: toNullableString(file.stored_filename),
        duplicate: file.duplicate === true,
        duplicateOf: toNullableString(file.duplicate_of),
        seasons: toStringList(file.seasons),
        matchRows: toNumber(file.match_rows) ?? 0,
        isNewSeason: file.is_new_season === true,
      }
    }),
  }
}

export async function deleteRawArchiveFile(filename: string): Promise<DeleteRawFileResult> {
  const payload = toRecord(await fetchJson(`/pipeline/files/${encodeURIComponent(filename)}`, { method: "DELETE" }))

  return {
    filename: toStringValue(payload.filename, filename),
    rawFileCount: toNumber(payload.raw_file_count ?? payload.rawFileCount) ?? 0,
    latestSeason: toStringValue(payload.latest_season ?? payload.latestSeason, "-"),
    totalMatches: toNumber(payload.total_matches ?? payload.totalMatches) ?? 0,
    message: toStringValue(payload.message, "ลบไฟล์ออกจากคลังข้อมูลสำเร็จ"),
  }
}

export async function exportFixturePredictions(file: File, season: string): Promise<ExportPipelineResult> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("season", season)

  const payload = toRecord(await fetchJson("/predictions/export-fixtures", { method: "POST", body: formData }))
  const filename = toStringValue(
    payload.output_filename ?? payload.filename ?? payload.file_name ?? payload.download_name,
    "predictions.csv",
  )

  return {
    season,
    filename,
    filePath: toStringValue(payload.output_path ?? payload.file_path ?? payload.filePath ?? payload.path, "-"),
    predictionCount: toNumber(payload.prediction_count ?? payload.predictionCount ?? payload.matches) ?? 0,
    dateRange: toStringValue(payload.date_range ?? payload.dateRange ?? payload.period, "-"),
    downloadUrl: `${ADMIN_AI_API_BASE_URL}/predictions/download/${encodeURIComponent(filename)}`,
  }
}

// Downloads go through fetch so the admin token is sent; a plain <a href> cannot carry it.
export async function downloadAdminAiFile(url: string, filename: string) {
  const response = await fetch(url, { cache: "no-store", headers: authHeaders() })
  if (!response.ok) throw new Error(`ดาวน์โหลดไฟล์ไม่สำเร็จ (${response.status})`)
  const objectUrl = URL.createObjectURL(await response.blob())
  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = filename
  anchor.rel = "noopener"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
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
      score: toStringValue(score.score ?? score.label, "-"),
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
    summary: toStringValue(payload.summary ?? payload.message ?? payload.analysis, "ประมวลผลผลทำนายสำเร็จ"),
    predictedResult: toStringValue(payload.predicted_result, "-"),
    otherModels: payload.other_models
      ? {
          catboost: toStringValue(toRecord(payload.other_models).catboost, "-"),
          xgboost: toStringValue(toRecord(payload.other_models).xgboost, "-"),
          poisson: toStringValue(toRecord(payload.other_models).poisson, "-"),
        }
      : null,
    basis: payload.basis
      ? { date: toStringValue(toRecord(payload.basis).date, "-"), lastResultDate: toStringValue(toRecord(payload.basis).last_result_date, "-") }
      : null,
  }
}
