const path = require("path")

try {
  require("dotenv").config({ path: path.resolve(__dirname, "../../.env") })
  require("dotenv").config({ path: path.resolve(__dirname, "../../.env.local") })
} catch (error) {
  // Env injection may come from the runtime directly.
}

function parseClientUrls(rawValue) {
  return (rawValue || "http://localhost:3000")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientUrls: parseClientUrls(process.env.CLIENT_URL),
  allSportsApiBaseUrl:
    process.env.ALLSPORTS_API_BASE_URL ||
    process.env.API_BASE_URL ||
    "https://apiv2.allsportsapi.com/football/",
  allSportsApiKey: process.env.ALLSPORTS_API_KEY || process.env.API_KEY || "",
  defaultLeagueId: process.env.PREMIER_LEAGUE_ID || process.env.DEFAULT_LEAGUE_ID || "152",
  apiTimeoutMs: Number(process.env.ALLSPORTS_API_TIMEOUT_MS || process.env.API_TIMEOUT_MS || 10000),
  apiRetryCount: Number(process.env.ALLSPORTS_API_RETRY_COUNT || process.env.API_RETRY_COUNT || 0),
}

env.isProduction = env.nodeEnv === "production"

module.exports = { env }
