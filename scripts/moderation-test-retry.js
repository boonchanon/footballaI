#!/usr/bin/env node

const { compileTypeScriptFiles, loadCompiledModule } = require("./load-compiled-module")

function providerError(status, code, message, retryAfter) {
  return {
    status,
    code,
    message,
    headers: retryAfter === undefined ? undefined : { "retry-after": String(retryAfter) },
  }
}

async function runCase(runOpenAIProviderRetry, name, failures, expectedAttempts) {
  let calls = 0
  const delays = []
  const result = await runOpenAIProviderRetry({
    operation: "image_safety",
    model: "mock-model",
    maxRetries: 2,
    bypassCircuitBreaker: true,
    wait: async (delayMs) => delays.push(delayMs),
    execute: async () => {
      const failure = failures[calls]
      calls += 1
      if (failure) throw failure
      return { ok: true }
    },
  })
  if (calls !== expectedAttempts) throw new Error(`${name}: expected ${expectedAttempts} attempts, received ${calls}`)
  console.log(JSON.stringify({ name, attempts: calls, delays, outcome: "value" in result ? "success" : result.error.category }))
}

async function main() {
  const compilation = compileTypeScriptFiles(["lib/server/ai-moderation.ts"])
  try {
    const { runOpenAIProviderRetry, __resetOpenAIProviderCircuitBreakerForTests } = loadCompiledModule(compilation, "ai-moderation.js")
    __resetOpenAIProviderCircuitBreakerForTests()
    await runCase(runOpenAIProviderRetry, "rate limited then success", [providerError(429, "rate_limit_exceeded", "Too many requests"), providerError(429, "rate_limit_exceeded", "Too many requests")], 3)
    await runCase(runOpenAIProviderRetry, "insufficient quota stops immediately", [providerError(429, "insufficient_quota", "You exceeded your current quota")], 1)
    __resetOpenAIProviderCircuitBreakerForTests()
    await runCase(runOpenAIProviderRetry, "server error then success", [providerError(500, "server_error", "Internal server error")], 2)
    await runCase(runOpenAIProviderRetry, "timeout then success", [{ name: "APIConnectionTimeoutError", code: "ETIMEDOUT", message: "Request timed out" }], 2)
    await runCase(runOpenAIProviderRetry, "invalid key stops immediately", [providerError(401, "invalid_api_key", "Incorrect API key")], 1)
    console.log("Retry policy mock tests passed")
  } finally {
    compilation.cleanup()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
