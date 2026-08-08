const { env } = require("./env")

const apiConfig = {
  baseURL: env.allSportsApiBaseUrl,
  apiKey: env.allSportsApiKey,
  timeout: env.apiTimeoutMs,
  retryCount: env.apiRetryCount,
}

module.exports = { apiConfig }
