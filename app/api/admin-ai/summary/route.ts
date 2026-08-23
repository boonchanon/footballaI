import { NextResponse } from "next/server"

const PREDICTION_API_BASE_URL =
  process.env.NEXT_PUBLIC_epl_PREDICTION_API_BASE_URL?.trim() ||
  "https://football-epl-prediction-api.onrender.com"

export const maxDuration = 60

type JsonRecord = Record<string, any>

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

function normalizeTeamOptions(statusPayload: JsonRecord) {
  const aliasMap = new Map<string, string>([
    ["Bournemouth", "AFC Bournemouth"],
    ["Coventry", "Coventry City"],
    ["Ipswich", "Ipswich Town"],
    ["Leeds", "Leeds United"],
    ["Newcastle", "Newcastle United"],
    ["Tottenham", "Tottenham Hotspur"],
  ])

  const prediction = toRecord(statusPayload.prediction)
  const deduped = new Set<string>()
  for (const team of [...toStringList(statusPayload.teams), ...toStringList(prediction.teams)]) {
    deduped.add(aliasMap.get(team) ?? team)
  }

  return Array.from(deduped).sort((left, right) => left.localeCompare(right))
}

async function fetchUpstreamJson(path: string) {
  const response = await fetch(`${PREDICTION_API_BASE_URL.replace(/\/+$/, "")}${path}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const errorMessage =
      payload?.error || payload?.detail || payload?.message || `Request failed with status ${response.status}`
    throw new Error(errorMessage)
  }

  return payload
}

export async function GET() {
  try {
    const healthPayload = toRecord(await fetchUpstreamJson("/health"))
    const statusPayload = toRecord(await fetchUpstreamJson("/pipeline/status"))

    const summary = toRecord(statusPayload.summary)
    const inventory = toRecord(statusPayload.inventory)
    const evaluation = toRecord(statusPayload.evaluation)
    const prediction = toRecord(statusPayload.prediction)

    const files = toArray(inventory.recognized_files).map((item, index) => {
      const file = toRecord(item)
      return {
        filename: toStringValue(file.filename ?? file.file_name ?? file.name, `File ${index + 1}`),
        season: toStringValue(file.season, "-"),
        matches: toNumber(file.matches ?? file.match_count ?? file.rows) ?? 0,
      }
    })

    const modelSource = toArray(statusPayload.models?.length ? statusPayload.models : evaluation.models)
    const models = modelSource.map((item, index) => {
      const model = toRecord(item)
      return {
        key: toStringValue(model.key ?? model.name ?? model.label, `model-${index + 1}`),
        label: toStringValue(model.label ?? model.name ?? model.key, `Model ${index + 1}`),
        accuracy: normalizePercent(model.accuracy),
        f1Macro: toNumber(model.f1_macro ?? model.f1Macro),
        logLoss: toNumber(model.log_loss ?? model.logLoss),
        brierScore: toNumber(model.brier_score ?? model.brierScore),
        isBest: Boolean(model.is_best ?? model.isBest),
      }
    })

    const bestModel =
      models.find((item) => item.isBest) ||
      [...models].sort((left, right) => (right.accuracy ?? -1) - (left.accuracy ?? -1))[0] ||
      null

    const seasonsAvailable = toStringList(summary.seasons_available)
    const result = {
      teamsLoaded: toNumber(summary.teamsLoaded) ?? normalizeTeamOptions(statusPayload).length,
      bestModelLabel: bestModel?.label || toStringValue(evaluation.bestModel, "ยังไม่มีผลประเมิน"),
      bestModelAccuracy: bestModel?.accuracy ?? normalizePercent(evaluation.bestAccuracy),
      latestSeason: toStringValue(summary.latestSeason || seasonsAvailable.at(-1), "-"),
      latestPredictionFile: toStringValue(
        prediction.latestPredictionFile ?? prediction.latest_prediction_file,
        "ยังไม่มีไฟล์",
      ),
      rawFileCount: toNumber(inventory.rawFileCount ?? summary.rawFileCount) ?? files.length,
      totalMatches: toNumber(summary.totalMatches) ?? files.reduce((sum, file) => sum + file.matches, 0),
      seasonCount: toNumber(summary.seasonCount) ?? seasonsAvailable.length,
      files,
      models: models.map((model) => ({
        ...model,
        isBest: bestModel != null && model.key === bestModel.key,
      })),
      teams: normalizeTeamOptions(statusPayload),
      healthLabel: toStringValue(healthPayload.status ?? healthPayload.message, "พร้อมใช้งาน"),
    }

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "โหลด summary ไม่สำเร็จ",
      },
      { status: 500 },
    )
  }
}
