import OpenAI from "openai"

export type AIModerationOutcome = {
  available: boolean
  flagged: boolean
  categories: Record<string, boolean>
  scores: Record<string, number>
  reasons: string[]
  rawStatus: "ok" | "missing_key" | "disabled" | "error"
  errorCode?: string
  errorMessage?: string
  diagnostic?: OpenAIProviderErrorDetails
}

export type ImageTextExtractionOutcome = {
  available: boolean
  extractedText: string
  urls: string[]
  qrUrls: string[]
  contactHints: string[]
  rawStatus: "ok" | "missing_key" | "disabled" | "error"
  provider: "openai" | "local"
  errorCode?: string
  errorMessage?: string
  diagnostic?: OpenAIProviderErrorDetails
}

export type OpenAIProviderDiagnosticStatus =
  | "ready"
  | "disabled"
  | "missing_api_key"
  | "invalid_api_key"
  | "insufficient_quota"
  | "billing_not_enabled"
  | "model_not_found"
  | "unsupported_model"
  | "permission_denied"
  | "invalid_request"
  | "rate_limited"
  | "timeout"
  | "network_error"
  | "dns_error"
  | "connection_refused"
  | "tls_error"
  | "server_error"
  | "sdk_error"
  | "response_parse_error"
  | "provider_unavailable"
  | "provider_error"

export type OpenAIProviderErrorDetails = {
  category: OpenAIProviderDiagnosticStatus
  httpStatus: number | null
  errorCode: string | null
  errorType: string | null
  errorName: string | null
  requestId: string | null
  retryable: boolean
  retryAfterMs: number | null
  attempts: number
  providerStatus: "ready" | "degraded" | "unavailable"
  recommendedAction: "add_billing_or_credits" | "wait_or_reduce_request_rate" | "fix_configuration" | "check_network" | "retry_later" | "none"
  message: string
}

export type OpenAIProviderOperationDiagnostics = {
  attempted: boolean
  succeeded: boolean
  model: string
  category: OpenAIProviderDiagnosticStatus
  httpStatus: number | null
  errorCode: string | null
  errorType: string | null
  errorName: string | null
  requestId: string | null
  retryable: boolean
  retryAfterMs: number | null
  attempts: number
  providerStatus: "ready" | "degraded" | "unavailable"
  recommendedAction: OpenAIProviderErrorDetails["recommendedAction"]
  message: string
}

export type OpenAIProviderDiagnostics = {
  openaiKeyConfigured: boolean
  openaiClientReady: boolean
  keySource: "process_environment" | ".env.local" | "unknown"
  sdkVersion: string
  imageSafetyEnabled: boolean
  imageTextExtractionEnabled: boolean
  qrDetectionEnabled: boolean
  failMode: string
  textModerationModel: string
  imageModerationModel: string
  visionModel: string
  connectivity: OpenAIProviderOperationDiagnostics
  textModeration: OpenAIProviderOperationDiagnostics
  imageSafety: OpenAIProviderOperationDiagnostics
  vision: OpenAIProviderOperationDiagnostics
}

type TestAdapters = {
  moderateTextWithAI?: (text: string) => Promise<AIModerationOutcome>
  moderateImageWithAI?: (input: { imageUrl?: string; dataUrl?: string }) => Promise<AIModerationOutcome>
  extractImageTextWithAI?: (input: { imageUrl?: string; dataUrl?: string }) => Promise<ImageTextExtractionOutcome>
}

let openAIClient: OpenAI | null = null
let testAdapters: TestAdapters = {}
let missingImageModerationKeyWarned = false
let missingImageTextKeyWarned = false
let providerCircuitOpenUntil = 0
const PROVIDER_PROBE_IMAGE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAACKADAAQAAAABAAAACAAAAACVhHtSAAAC52lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNi4wLjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczpwaG90b3Nob3A9Imh0dHA6Ly9ucy5hZG9iZS5jb20vcGhvdG9zaG9wLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOklwdGM0eG1wRXh0PSJodHRwOi8vaXB0Yy5vcmcvc3RkL0lwdGM0eG1wRXh0LzIwMDgtMDItMjkvIj4KICAgICAgICAgPHBob3Rvc2hvcDpDcmVkaXQ+TWFkZSB3aXRoIEdvb2dsZSBBSTwvcGhvdG9zaG9wOkNyZWRpdD4KICAgICAgICAgPElwdGM0eG1wRXh0OkRpZ2l0YWxTb3VyY2VUeXBlPmh0dHA6Ly9jdi5pcHRjLm9yZy9uZXdzY29kZXMvZGlnaXRhbHNvdXJjZXR5cGUvdHJhaW5lZEFsZ29yaXRobWljTWVkaWE8L0lwdGM0eG1wRXh0OkRpZ2l0YWxTb3VyY2VUeXBlPgogICAgICAgICA8SXB0YzR4bXBFeHQ6RGlnaXRhbFNvdXJjZUZpbGVUeXBlPmh0dHA6Ly9jdi5pcHRjLm9yZy9uZXdzY29kZXMvZGlnaXRhbHNvdXJjZXR5cGUvdHJhaW5lZEFsZ29yaXRobWljTWVkaWE8L0lwdGM0eG1wRXh0OkRpZ2l0YWxTb3VyY2VGaWxlVHlwZT4KICAgICAgPC9yZGY6RGVzY3JpcHRpb24+CiAgIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+Cp6mSPIAAADTSURBVAgdAcgAN/8BZ5bLAQMBDwwILR8TIBYMDQgECwYBCgcABBsTCP0ECAIB/tnZ0trJ4iAXEjY4NwgGFAGyyePKzcy9rJ8V7ugVHyADHhsTCgRkcn4EFALzz8CyHiowRQH/FyIf/zc3GA0FCAH9BOPi2QD++uXl2s7h4QPRC/Ph1zoyL6DLzQFeYFfw7+b39v4G+gTs7+b39/0GCAfy+PIBw7y2CwsI6OflAwQH2NzZ7unuCgsL/wL/Ac3EuggICAoMDQMEBgQCAvr6+f7/AAAA/7h4U4UjullJAAAAAElFTkSuQmCC"

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null

  if (!openAIClient) {
    // SDK retries are disabled so every retry is governed by the moderation policy below.
    openAIClient = new OpenAI({ apiKey, maxRetries: 0, timeout: getOpenAIRequestTimeoutMs() })
  }

  return openAIClient
}

function getPositiveIntegerEnv(name: string, fallback: number, max: number) {
  const parsed = Number.parseInt(String(process.env[name] || ""), 10)
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback
}

function getOpenAIRequestTimeoutMs() {
  return getPositiveIntegerEnv("OPENAI_REQUEST_TIMEOUT_MS", 15_000, 30_000)
}

function getOpenAIMaxRetries() {
  return getPositiveIntegerEnv("OPENAI_MAX_RETRIES", 2, 2)
}

function getOpenAIRetryBaseDelayMs() {
  return getPositiveIntegerEnv("OPENAI_RETRY_BASE_DELAY_MS", 1_000, 4_000)
}

function getCircuitBreakerMs() {
  return getPositiveIntegerEnv("OPENAI_CIRCUIT_BREAKER_SECONDS", 120, 300) * 1_000
}

export function getOpenAIProviderConfig() {
  const keySourceEnv = String(process.env.OPENAI_API_KEY_SOURCE || "").trim()
  const keySource: OpenAIProviderDiagnostics["keySource"] =
    keySourceEnv === ".env.local" ? ".env.local" : keySourceEnv === "process_environment" ? "process_environment" : "unknown"
  return {
    openaiKeyConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    openaiClientReady: Boolean(getOpenAIClient()),
    keySource,
    sdkVersion: "6.48.0",
    imageSafetyEnabled: process.env.IMAGE_MODERATION_ENABLED !== "false" && process.env.AI_MODERATION_ENABLED !== "false",
    imageTextExtractionEnabled: process.env.IMAGE_TEXT_EXTRACTION_ENABLED !== "false" && process.env.AI_MODERATION_ENABLED !== "false",
    qrDetectionEnabled: process.env.IMAGE_QR_DETECTION_ENABLED !== "false",
    failMode: String(process.env.IMAGE_MODERATION_FAIL_MODE || process.env.MODERATION_FAIL_MODE || "pending").trim().toLowerCase(),
    textModerationModel: process.env.OPENAI_IMAGE_MODERATION_MODEL?.trim() || "omni-moderation-latest",
    imageModerationModel: process.env.OPENAI_IMAGE_MODERATION_MODEL?.trim() || "omni-moderation-latest",
    visionModel: process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4.1-mini",
  }
}

function sanitizeProviderMessage(message: string) {
  return String(message || "")
    .replace(/sk-[a-zA-Z0-9_-]+/g, "[redacted-api-key]")
    .replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"']+/gi, "[redacted-mongodb-uri]")
    .replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=]+/g, "[redacted-image-data-url]")
    .replace(/\/Users\/[^\s"'`]+/g, "[redacted-path]")
    .slice(0, 300)
}

export function classifyOpenAIProviderError(error: unknown): OpenAIProviderErrorDetails {
  const root = typeof error === "object" && error ? (error as any) : {}
  const cause = typeof root.cause === "object" && root.cause ? root.cause : {}
  const message =
    typeof root.message === "string"
      ? root.message
      : typeof root.error?.message === "string"
        ? root.error.message
        : typeof cause.message === "string"
          ? cause.message
          : error instanceof Error
            ? error.message
            : String(error || "")
  const httpStatus = typeof root.status === "number" ? root.status : typeof cause.status === "number" ? cause.status : null
  const errorCode = String(root.code ?? root.error?.code ?? cause.code ?? "").trim() || null
  const errorType = String(root.type ?? root.error?.type ?? cause.type ?? "").trim() || null
  const errorName = String(root.name ?? cause.name ?? "").trim() || null
  const headers = root.headers ?? root.response?.headers ?? cause.headers
  const getHeader = (name: string) => {
    if (headers?.get) return headers.get(name) || headers.get(name.toLowerCase()) || null
    return headers?.[name] ?? headers?.[name.toLowerCase()] ?? null
  }
  const retryAfterRaw = getHeader("retry-after")
  const retryAfterSeconds = Number.parseFloat(String(retryAfterRaw || ""))
  const retryAfterMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0 ? Math.round(retryAfterSeconds * 1000) : null
  const requestId = String(root.requestID ?? root.requestId ?? getHeader("x-request-id") ?? cause.requestID ?? "").trim() || null
  const normalizedCode = (errorCode || "").toLowerCase()
  const normalizedType = (errorType || "").toLowerCase()
  const normalizedName = (errorName || "").toLowerCase()
  const normalizedMessage = message.toLowerCase()
  let category: OpenAIProviderDiagnosticStatus = "provider_error"
  if (httpStatus === 401 || normalizedCode === "invalid_api_key" || normalizedType === "invalid_api_key_error") category = "invalid_api_key"
  else if (httpStatus === 429 && (normalizedCode === "insufficient_quota" || normalizedType === "insufficient_quota" || normalizedMessage.includes("insufficient_quota") || normalizedMessage.includes("quota")))
    category = "insufficient_quota"
  else if (
    httpStatus === 402 ||
    normalizedCode === "billing_not_enabled" ||
    normalizedType === "billing_not_enabled" ||
    ((normalizedMessage.includes("billing") || normalizedMessage.includes("payment")) && httpStatus !== 429)
  )
    category = "billing_not_enabled"
  else if (httpStatus === 403 || normalizedCode === "permission_denied" || normalizedType === "permission_error") category = "permission_denied"
  else if (httpStatus === 404 && normalizedMessage.includes("model")) category = "model_not_found"
  else if (normalizedCode === "model_not_found" || normalizedMessage.includes("model_not_found")) category = "model_not_found"
  else if (normalizedMessage.includes("unsupported model")) category = "unsupported_model"
  else if (httpStatus === 429) category = "rate_limited"
  else if (httpStatus === 400 || httpStatus === 422) category = "invalid_request"
  else if (normalizedCode === "etimedout" || normalizedName.includes("abort") || normalizedName.includes("timeout") || normalizedMessage.includes("timed out")) category = "timeout"
  else if (normalizedCode === "enotfound" || normalizedCode === "eai_again") category = "dns_error"
  else if (normalizedCode === "econnrefused") category = "connection_refused"
  else if (
    normalizedCode === "econnreset" ||
    normalizedMessage.includes("fetch failed") ||
    normalizedMessage.includes("network") ||
    normalizedMessage.includes("connection error")
  )
    category = "network_error"
  else if (normalizedMessage.includes("tls") || normalizedMessage.includes("certificate")) category = "tls_error"
  else if (httpStatus !== null && httpStatus >= 500) category = "server_error"
  else if (normalizedName.includes("syntaxerror") || normalizedMessage.includes("json")) category = "response_parse_error"
  else if (normalizedName.includes("openai")) category = "sdk_error"

  const retryable = ["rate_limited", "timeout", "network_error", "dns_error", "connection_refused", "server_error"].includes(category)
  const providerStatus: OpenAIProviderErrorDetails["providerStatus"] =
    category === "rate_limited" ? "degraded" : retryable ? "degraded" : "unavailable"
  const recommendedAction: OpenAIProviderErrorDetails["recommendedAction"] =
    category === "insufficient_quota" || category === "billing_not_enabled"
      ? "add_billing_or_credits"
      : category === "rate_limited"
        ? "wait_or_reduce_request_rate"
        : ["invalid_api_key", "permission_denied", "model_not_found", "unsupported_model", "invalid_request"].includes(category)
          ? "fix_configuration"
          : ["timeout", "network_error", "dns_error", "connection_refused", "tls_error"].includes(category)
            ? "check_network"
            : retryable
              ? "retry_later"
              : "none"

  return {
    category,
    httpStatus,
    errorCode,
    errorType,
    errorName,
    requestId,
    retryable,
    retryAfterMs,
    attempts: 1,
    providerStatus,
    recommendedAction,
    message: sanitizeProviderMessage(message),
  }
}

function logProviderDiagnostic(
  operation: "connectivity" | "text_moderation" | "image_safety" | "vision",
  model: string,
  details: OpenAIProviderErrorDetails,
) {
  if (process.env.NODE_ENV === "production") return
  console.warn("[openai-provider]", {
    provider: "openai",
    operation,
    category: details.category,
    httpStatus: details.httpStatus,
    errorCode: details.errorCode,
    errorType: details.errorType,
    errorName: details.errorName,
    requestId: details.requestId,
    model,
    retryable: details.retryable,
    retryAfterMs: details.retryAfterMs,
    attempts: details.attempts,
    finalOutcome: details.providerStatus,
    message: details.message,
  })
}

function buildOperationDiagnostic(
  operation: "connectivity" | "text_moderation" | "image_safety" | "vision",
  model: string,
  outcome: {
    rawStatus: "ok" | "missing_key" | "disabled" | "error"
    errorCode?: string
    errorMessage?: string
    diagnostic?: OpenAIProviderErrorDetails
  },
): OpenAIProviderOperationDiagnostics {
  if (outcome.rawStatus === "ok") {
    return {
      attempted: true,
      succeeded: true,
      model,
      category: "ready",
      httpStatus: null,
      errorCode: null,
      errorType: null,
      errorName: null,
      requestId: null,
      retryable: false,
      retryAfterMs: null,
      attempts: outcome.diagnostic?.attempts || 1,
      providerStatus: "ready",
      recommendedAction: "none",
      message: "",
    }
  }
  if (outcome.rawStatus === "missing_key") {
    return {
      attempted: false,
      succeeded: false,
      model,
      category: "missing_api_key",
      httpStatus: null,
      errorCode: outcome.errorCode || "missing_api_key",
      errorType: null,
      errorName: null,
      requestId: null,
      retryable: false,
      retryAfterMs: null,
      attempts: 0,
      providerStatus: "unavailable",
      recommendedAction: "fix_configuration",
      message: "",
    }
  }
  if (outcome.rawStatus === "disabled") {
    return {
      attempted: false,
      succeeded: false,
      model,
      category: "disabled",
      httpStatus: null,
      errorCode: outcome.errorCode || "disabled",
      errorType: null,
      errorName: null,
      requestId: null,
      retryable: false,
      retryAfterMs: null,
      attempts: 0,
      providerStatus: "unavailable",
      recommendedAction: "none",
      message: "",
    }
  }
  return {
    attempted: true,
    succeeded: false,
    model,
    category: outcome.diagnostic?.category || (outcome.errorCode as OpenAIProviderDiagnosticStatus) || "provider_error",
    httpStatus: outcome.diagnostic?.httpStatus ?? null,
    errorCode: outcome.diagnostic?.errorCode ?? outcome.errorCode ?? null,
    errorType: outcome.diagnostic?.errorType ?? null,
    errorName: outcome.diagnostic?.errorName ?? null,
    requestId: outcome.diagnostic?.requestId ?? null,
    retryable: outcome.diagnostic?.retryable ?? false,
    retryAfterMs: outcome.diagnostic?.retryAfterMs ?? null,
    attempts: outcome.diagnostic?.attempts || 1,
    providerStatus: outcome.diagnostic?.providerStatus || "unavailable",
    recommendedAction: outcome.diagnostic?.recommendedAction || "none",
    message: sanitizeProviderMessage(outcome.diagnostic?.message || outcome.errorMessage || ""),
  }
}

function buildErrorOutcome(error: unknown, fallbackMessage: string) {
  const details = classifyOpenAIProviderError(error)
  return {
    rawStatus: "error" as const,
    errorCode: details.category,
    errorMessage: details.message || fallbackMessage,
    details,
  }
}

type RetryExecution<T> = { value: T; attempts: number } | { error: OpenAIProviderErrorDetails; attempts: number }

function createCircuitOpenDiagnostic(): OpenAIProviderErrorDetails {
  return {
    category: "provider_unavailable",
    httpStatus: null,
    errorCode: "circuit_breaker_open",
    errorType: null,
    errorName: null,
    requestId: null,
    retryable: false,
    retryAfterMs: Math.max(0, providerCircuitOpenUntil - Date.now()),
    attempts: 0,
    providerStatus: "unavailable",
    recommendedAction: "add_billing_or_credits",
    message: "Image moderation provider is temporarily unavailable",
  }
}

function getRetryDelayMs(details: OpenAIProviderErrorDetails, attempt: number) {
  if (details.retryAfterMs !== null) return Math.min(details.retryAfterMs, 5_000)
  const exponential = getOpenAIRetryBaseDelayMs() * 2 ** Math.max(0, attempt - 1)
  const jitter = Math.floor(Math.random() * Math.min(500, Math.max(100, exponential * 0.25)))
  return Math.min(exponential + jitter, 5_000)
}

async function waitForRetry(delayMs: number) {
  await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
}

export async function runOpenAIProviderRetry<T>(input: {
  operation: "text_moderation" | "image_safety" | "vision"
  model: string
  execute: () => Promise<T>
  wait?: (delayMs: number) => Promise<void>
  maxRetries?: number
  bypassCircuitBreaker?: boolean
}): Promise<RetryExecution<T>> {
  if (!input.bypassCircuitBreaker && providerCircuitOpenUntil > Date.now()) {
    return { error: createCircuitOpenDiagnostic(), attempts: 0 }
  }

  const maxRetries = Math.max(0, Math.min(input.maxRetries ?? getOpenAIMaxRetries(), 2))
  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    try {
      const value = await input.execute()
      return { value, attempts: attempt }
    } catch (error) {
      const details = classifyOpenAIProviderError(error)
      details.attempts = attempt
      if (details.category === "insufficient_quota" || details.category === "billing_not_enabled") {
        providerCircuitOpenUntil = Date.now() + getCircuitBreakerMs()
      }
      const retrying = details.retryable && attempt <= maxRetries
      logProviderDiagnostic(input.operation, input.model, details)
      if (!retrying) return { error: details, attempts: attempt }
      const delayMs = getRetryDelayMs(details, attempt)
      if (process.env.NODE_ENV !== "production") {
        console.warn("[openai-provider] retry", {
          operation: input.operation,
          attempt,
          errorCategory: details.category,
          httpStatus: details.httpStatus,
          retryAfterMs: details.retryAfterMs,
          requestId: details.requestId,
          retrying: true,
          delayMs,
        })
      }
      await (input.wait || waitForRetry)(delayMs)
    }
  }
  return { error: createCircuitOpenDiagnostic(), attempts: 0 }
}

export function __resetOpenAIProviderCircuitBreakerForTests() {
  providerCircuitOpenUntil = 0
}

function buildReasonsFromCategories(categories: Record<string, boolean>) {
  return Object.entries(categories)
    .filter(([, value]) => value)
    .map(([key]) => `ai:${key}`)
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))]
}

function parseJsonObject(content: string) {
  const trimmed = String(content || "").trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf("{")
    const end = trimmed.lastIndexOf("}")
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

export function __setAIModerationTestAdapters(adapters: TestAdapters) {
  testAdapters = adapters
}

export function __resetAIModerationTestAdapters() {
  testAdapters = {}
}

export async function moderateTextWithAI(text: string): Promise<AIModerationOutcome> {
  if (testAdapters.moderateTextWithAI) {
    return testAdapters.moderateTextWithAI(text)
  }

  if (process.env.AI_MODERATION_ENABLED === "false") {
    return { available: false, flagged: false, categories: {}, scores: {}, reasons: [], rawStatus: "disabled", errorCode: "disabled" }
  }

  const client = getOpenAIClient()
  if (!client) {
    return { available: false, flagged: false, categories: {}, scores: {}, reasons: [], rawStatus: "missing_key", errorCode: "missing_api_key" }
  }

  const model = getOpenAIProviderConfig().textModerationModel
  const execution = await runOpenAIProviderRetry({
    operation: "text_moderation",
    model,
    execute: () => client.moderations.create({ model, input: [{ type: "text", text }] }),
  })
  if ("error" in execution) {
    const failure = execution.error
    return {
      available: true,
      flagged: false,
      categories: {},
      scores: {},
      reasons: [],
      rawStatus: "error",
      errorCode: failure.category,
      errorMessage: failure.message || "AI text moderation failed",
      diagnostic: failure,
    }
  }
  try {
    const response = execution.value
    const result = response.results[0]
    const categories = Object.fromEntries(Object.entries(result?.categories || {}).map(([key, value]) => [key, Boolean(value)]))
    const scores = Object.fromEntries(
      Object.entries(result?.category_scores || {}).map(([key, value]) => [key, typeof value === "number" ? value : 0]),
    )

    return {
      available: true,
      flagged: Boolean(result?.flagged),
      categories,
      scores,
      reasons: buildReasonsFromCategories(categories),
      rawStatus: "ok",
      diagnostic: { category: "ready", httpStatus: null, errorCode: null, errorType: null, errorName: null, requestId: null, retryable: false, retryAfterMs: null, attempts: execution.attempts, providerStatus: "ready", recommendedAction: "none", message: "" },
    }
  } catch (error) {
    const failure = buildErrorOutcome(error, "AI text moderation failed")
    logProviderDiagnostic("text_moderation", model, failure.details)
    return {
      available: true,
      flagged: false,
      categories: {},
      scores: {},
      reasons: [],
      rawStatus: failure.rawStatus,
      errorCode: failure.errorCode,
      errorMessage: failure.errorMessage,
      diagnostic: failure.details,
    }
  }
}

export async function moderateImageWithAI(input: { imageUrl?: string; dataUrl?: string }): Promise<AIModerationOutcome> {
  if (testAdapters.moderateImageWithAI) {
    return testAdapters.moderateImageWithAI(input)
  }

  if (process.env.IMAGE_MODERATION_ENABLED === "false" || process.env.AI_MODERATION_ENABLED === "false") {
    return { available: false, flagged: false, categories: {}, scores: {}, reasons: [], rawStatus: "disabled", errorCode: "disabled" }
  }

  const client = getOpenAIClient()
  if (!client) {
    if (process.env.NODE_ENV !== "test" && !missingImageModerationKeyWarned) {
      missingImageModerationKeyWarned = true
      console.warn("[image-moderation] OpenAI key is missing, image safety moderation will fail closed to review")
    }
    return { available: false, flagged: false, categories: {}, scores: {}, reasons: [], rawStatus: "missing_key", errorCode: "missing_api_key" }
  }

  const url = input.dataUrl || input.imageUrl || ""
  if (!url) {
    return {
      available: false,
      flagged: false,
      categories: {},
      scores: {},
      reasons: [],
      rawStatus: "error",
      errorCode: "provider_error",
      errorMessage: "Image input missing",
    }
  }

  const model = getOpenAIProviderConfig().imageModerationModel
  const execution = await runOpenAIProviderRetry({
    operation: "image_safety",
    model,
    execute: () => client.moderations.create({ model, input: [{ type: "image_url", image_url: { url } }] }),
  })
  if ("error" in execution) {
    const failure = execution.error
    return {
      available: true,
      flagged: false,
      categories: {},
      scores: {},
      reasons: [],
      rawStatus: "error",
      errorCode: failure.category,
      errorMessage: failure.message || "AI image moderation failed",
      diagnostic: failure,
    }
  }
  try {
    const response = execution.value
    const result = response.results[0]
    const categories = Object.fromEntries(Object.entries(result?.categories || {}).map(([key, value]) => [key, Boolean(value)]))
    const scores = Object.fromEntries(
      Object.entries(result?.category_scores || {}).map(([key, value]) => [key, typeof value === "number" ? value : 0]),
    )

    return {
      available: true,
      flagged: Boolean(result?.flagged),
      categories,
      scores,
      reasons: buildReasonsFromCategories(categories),
      rawStatus: "ok",
      diagnostic: { category: "ready", httpStatus: null, errorCode: null, errorType: null, errorName: null, requestId: null, retryable: false, retryAfterMs: null, attempts: execution.attempts, providerStatus: "ready", recommendedAction: "none", message: "" },
    }
  } catch (error) {
    const failure = buildErrorOutcome(error, "AI image moderation failed")
    logProviderDiagnostic("image_safety", model, failure.details)
    return {
      available: true,
      flagged: false,
      categories: {},
      scores: {},
      reasons: [],
      rawStatus: failure.rawStatus,
      errorCode: failure.errorCode,
      errorMessage: failure.errorMessage,
      diagnostic: failure.details,
    }
  }
}

export async function extractImageTextWithAI(input: { imageUrl?: string; dataUrl?: string }): Promise<ImageTextExtractionOutcome> {
  if (testAdapters.extractImageTextWithAI) {
    return testAdapters.extractImageTextWithAI(input)
  }

  if (process.env.IMAGE_TEXT_EXTRACTION_ENABLED === "false" || process.env.AI_MODERATION_ENABLED === "false") {
    return {
      available: false,
      extractedText: "",
      urls: [],
      qrUrls: [],
      contactHints: [],
      rawStatus: "disabled",
      provider: "local",
      errorCode: "disabled",
    }
  }

  const client = getOpenAIClient()
  if (!client) {
    if (process.env.NODE_ENV !== "test" && !missingImageTextKeyWarned) {
      missingImageTextKeyWarned = true
      console.warn("[image-moderation] OpenAI key is missing, OCR/Vision extraction will fail closed to review")
    }
    return {
      available: false,
      extractedText: "",
      urls: [],
      qrUrls: [],
      contactHints: [],
      rawStatus: "missing_key",
      provider: "local",
      errorCode: "missing_api_key",
    }
  }

  const url = input.dataUrl || input.imageUrl || ""
  if (!url) {
    return {
      available: false,
      extractedText: "",
      urls: [],
      qrUrls: [],
      contactHints: [],
      rawStatus: "error",
      provider: "openai",
      errorCode: "provider_error",
      errorMessage: "Image input missing",
    }
  }

  const model = getOpenAIProviderConfig().visionModel
  const execution = await runOpenAIProviderRetry({
    operation: "vision",
    model,
    execute: () => client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Extract only text/signals that are visibly present in the image. Return compact JSON only. Do not guess missing text.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "Read the image and return JSON with this shape:",
                '{"extractedText":"","urls":[],"qrUrls":[],"contactHints":[]}',
                "Rules:",
                "- extractedText: plain text visible in the image, as concise as possible.",
                "- urls: any visible URL or domain text.",
                "- qrUrls: decoded QR destinations only if the QR content is directly visible/decodable to you.",
                "- contactHints: visible Line ID, Telegram, phone, DM, inbox, or handle-style contacts.",
                "- Return empty arrays when not found.",
              ].join("\n"),
            },
            {
              type: "image_url",
              image_url: { url },
            },
          ],
        },
      ],
    }),
  })
  if ("error" in execution) {
    const failure = execution.error
    return {
      available: true,
      extractedText: "",
      urls: [],
      qrUrls: [],
      contactHints: [],
      rawStatus: "error",
      provider: "openai",
      errorCode: failure.category,
      errorMessage: failure.message || "AI image text extraction failed",
      diagnostic: failure,
    }
  }
  try {
    const response = execution.value

    const rawContent = response.choices[0]?.message?.content || ""
    const parsed = parseJsonObject(rawContent)
    if (!parsed && String(rawContent || "").trim()) {
      const details: OpenAIProviderErrorDetails = {
        category: "response_parse_error",
        httpStatus: null,
        errorCode: "response_parse_error",
        errorType: null,
        errorName: "SyntaxError",
        requestId: null,
        retryable: false,
        retryAfterMs: null,
        attempts: execution.attempts,
        providerStatus: "unavailable",
        recommendedAction: "none",
        message: "Vision response could not be parsed",
      }
      details.attempts = execution.attempts
      logProviderDiagnostic("vision", model, details)
      return {
        available: true,
        extractedText: "",
        urls: [],
        qrUrls: [],
        contactHints: [],
        rawStatus: "error",
        provider: "openai",
        errorCode: "response_parse_error",
        errorMessage: "Vision response could not be parsed",
        diagnostic: details,
      }
    }
    const extractedText = String((parsed as any).extractedText || "").trim()
    const urls = uniqueStrings(Array.isArray((parsed as any).urls) ? (parsed as any).urls : [])
    const qrUrls = uniqueStrings(Array.isArray((parsed as any).qrUrls) ? (parsed as any).qrUrls : [])
    const contactHints = uniqueStrings(Array.isArray((parsed as any).contactHints) ? (parsed as any).contactHints : [])

    return {
      available: true,
      extractedText,
      urls,
      qrUrls,
      contactHints,
      rawStatus: "ok",
      provider: "openai",
      diagnostic: { category: "ready", httpStatus: null, errorCode: null, errorType: null, errorName: null, requestId: null, retryable: false, retryAfterMs: null, attempts: execution.attempts, providerStatus: "ready", recommendedAction: "none", message: "" },
    }
  } catch (error) {
    const failure = buildErrorOutcome(error, "AI image text extraction failed")
    logProviderDiagnostic("vision", model, failure.details)
    return {
      available: true,
      extractedText: "",
      urls: [],
      qrUrls: [],
      contactHints: [],
      rawStatus: failure.rawStatus,
      provider: "openai",
      errorCode: failure.errorCode,
      errorMessage: failure.errorMessage,
      diagnostic: failure.details,
    }
  }
}

export async function checkOpenAIProviderReadiness(): Promise<OpenAIProviderDiagnostics> {
  const config = getOpenAIProviderConfig()

  if (!config.openaiKeyConfigured || !config.openaiClientReady) {
    return {
      ...config,
      connectivity: buildOperationDiagnostic("connectivity", "models.list", { rawStatus: "missing_key", errorCode: "missing_api_key" }),
      textModeration: buildOperationDiagnostic("text_moderation", config.textModerationModel, { rawStatus: "missing_key", errorCode: "missing_api_key" }),
      imageSafety: buildOperationDiagnostic("image_safety", config.imageModerationModel, { rawStatus: "missing_key", errorCode: "missing_api_key" }),
      vision: buildOperationDiagnostic("vision", config.visionModel, { rawStatus: "missing_key", errorCode: "missing_api_key" }),
    }
  }

  let connectivity = buildOperationDiagnostic("connectivity", "models.list", { rawStatus: "ok" })
  try {
    const client = getOpenAIClient()
    await client?.models.list()
  } catch (error) {
    const failure = buildErrorOutcome(error, "OpenAI connectivity check failed")
    logProviderDiagnostic("connectivity", "models.list", failure.details)
    connectivity = {
      attempted: true,
      succeeded: false,
      model: "models.list",
      category: failure.details.category,
      httpStatus: failure.details.httpStatus,
      errorCode: failure.details.errorCode,
      errorType: failure.details.errorType,
      errorName: failure.details.errorName,
      requestId: failure.details.requestId,
      retryable: failure.details.retryable,
      retryAfterMs: failure.details.retryAfterMs,
      attempts: failure.details.attempts,
      providerStatus: failure.details.providerStatus,
      recommendedAction: failure.details.recommendedAction,
      message: failure.details.message,
    }
  }

  const [textResult, imageResult, visionResult] = await Promise.all([
    moderateTextWithAI("provider readiness check"),
    moderateImageWithAI({ dataUrl: PROVIDER_PROBE_IMAGE_DATA_URL }),
    extractImageTextWithAI({ dataUrl: PROVIDER_PROBE_IMAGE_DATA_URL }),
  ])

  return {
    ...config,
    connectivity,
    textModeration: buildOperationDiagnostic("text_moderation", config.textModerationModel, textResult),
    imageSafety: buildOperationDiagnostic("image_safety", config.imageModerationModel, imageResult),
    vision: buildOperationDiagnostic("vision", config.visionModel, visionResult),
  }
}
