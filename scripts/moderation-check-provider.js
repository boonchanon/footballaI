#!/usr/bin/env node
const fs = require("fs")
const path = require("path")
const dotenv = require("dotenv")

const envPath = path.resolve(".env.local")
const hadProcessKeyBeforeLoad = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim())
let envFileHasKey = false

if (fs.existsSync(envPath)) {
  const parsedEnv = dotenv.parse(fs.readFileSync(envPath, "utf8"))
  envFileHasKey = Boolean(parsedEnv.OPENAI_API_KEY && String(parsedEnv.OPENAI_API_KEY).trim())
}

dotenv.config({ path: envPath })

if (!hadProcessKeyBeforeLoad && envFileHasKey && process.env.OPENAI_API_KEY?.trim()) {
  process.env.OPENAI_API_KEY_SOURCE = ".env.local"
} else if (hadProcessKeyBeforeLoad) {
  process.env.OPENAI_API_KEY_SOURCE = "process_environment"
}

const { compileTypeScriptFiles, loadCompiledModule } = require("./load-compiled-module")

function printSection(title, lines) {
  console.log(`${title}:`)
  for (const line of lines) {
    console.log(`- ${line}`)
  }
  console.log("")
}

function formatOperation(label, operation) {
  return [
    `attempted: ${operation.attempted ? "yes" : "no"}`,
    `succeeded: ${operation.succeeded ? "yes" : "no"}`,
    `model: ${operation.model || "-"}`,
    `error category: ${operation.category || "-"}`,
    `HTTP status: ${operation.httpStatus ?? "-"}`,
    `error code: ${operation.errorCode || "-"}`,
    `error type: ${operation.errorType || "-"}`,
    `error name: ${operation.errorName || "-"}`,
    `request id: ${operation.requestId || "-"}`,
    `retryable: ${operation.retryable ? "yes" : "no"}`,
    `attempts: ${operation.attempts ?? "-"}`,
    `retry after: ${operation.retryAfterMs ?? "-"}ms`,
    `provider status: ${operation.providerStatus || "-"}`,
    `likely action: ${operation.recommendedAction || "-"}`,
    `message: ${operation.message || "-"}`,
  ]
}

function buildLikelyActions(result) {
  const categories = [
    result.connectivity?.category,
    result.textModeration?.category,
    result.imageSafety?.category,
    result.vision?.category,
  ].filter(Boolean)
  const actions = []

  if (categories.includes("insufficient_quota")) {
    actions.push("Billing or API credits required for the current OpenAI project")
  }

  if (categories.includes("rate_limited")) {
    actions.push("Wait, reduce request frequency, or review project rate limits")
  }

  if (categories.includes("invalid_api_key")) {
    actions.push("API key ไม่ผ่าน ตรวจว่าค่าใน .env.local ไม่มีช่องว่าง/quote เกิน และ key ยัง active")
  }

  if (categories.includes("permission_denied")) {
    actions.push("โปรเจกต์หรือ key นี้อาจไม่มีสิทธิ์ใช้ operation/model บางตัว")
  }

  if (categories.includes("model_not_found") || categories.includes("unsupported_model")) {
    actions.push("ชื่อ model ที่ตั้งไว้ไม่ตรงกับ operation นี้ หรือ model นั้นใช้กับ endpoint นี้ไม่ได้")
  }

  if (categories.includes("network_error") || categories.includes("dns_error") || categories.includes("timeout")) {
    actions.push("มีปัญหาการเชื่อมต่อเครือข่ายระหว่าง server กับ OpenAI ให้เช็ก proxy / VPN / firewall / DNS")
  }

  if (categories.includes("invalid_request")) {
    actions.push("มี request shape หรือ input format บางส่วนที่ provider ไม่ยอมรับ ควรดู error code/message ของ operation นั้นโดยตรง")
  }

  if (actions.length === 0) {
    actions.push("ยังไม่พบ root cause เพิ่มเติมจาก diagnostics รอบนี้")
  }

  return [...new Set(actions)]
}

function buildSummary(result) {
  const categories = [result.connectivity, result.textModeration, result.imageSafety, result.vision].map((item) => item?.category)
  if (categories.includes("insufficient_quota") || categories.includes("billing_not_enabled")) return "billing_issue"
  if (categories.includes("rate_limited")) return "rate_limit_issue"
  if (categories.some((item) => ["network_error", "dns_error", "timeout", "connection_refused", "tls_error"].includes(item))) return "network_issue"
  if (categories.some((item) => ["invalid_api_key", "permission_denied", "model_not_found", "unsupported_model", "invalid_request"].includes(item))) return "code_issue"
  return "ready"
}

async function main() {
  const compilation = compileTypeScriptFiles(["lib/server/ai-moderation.ts"])

  try {
    const { checkOpenAIProviderReadiness } = loadCompiledModule(compilation, "ai-moderation.js")
    const result = await checkOpenAIProviderReadiness()
    printSection("Environment", [
      `OPENAI_API_KEY configured: ${result.openaiKeyConfigured ? "yes" : "no"}`,
      `OpenAI client created: ${result.openaiClientReady ? "yes" : "no"}`,
      `key source: ${result.keySource || process.env.OPENAI_API_KEY_SOURCE || "unknown"}`,
      `SDK version: ${result.sdkVersion}`,
      `Node.js version: ${process.version}`,
      `fail mode: ${result.failMode}`,
      `text moderation model: ${result.textModerationModel}`,
      `image safety model: ${result.imageModerationModel}`,
      `vision model: ${result.visionModel}`,
      `image safety enabled: ${result.imageSafetyEnabled ? "yes" : "no"}`,
      `vision OCR enabled: ${result.imageTextExtractionEnabled ? "yes" : "no"}`,
      `QR detection enabled: ${result.qrDetectionEnabled ? "yes" : "no"}`,
    ])

    printSection("Connectivity", formatOperation("Connectivity", result.connectivity))
    printSection("Text moderation", formatOperation("Text moderation", result.textModeration))
    printSection("Image safety", formatOperation("Image safety", result.imageSafety))
    printSection("Vision", formatOperation("Vision", result.vision))
    printSection("Summary", [`provider state: ${buildSummary(result)}`])
    printSection("Likely actions", buildLikelyActions(result))

    console.log("Raw JSON:")
    console.log(JSON.stringify(result, null, 2))
  } finally {
    compilation.cleanup()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
