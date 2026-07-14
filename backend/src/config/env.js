const path = require("path")

try {
  require("dotenv").config({ path: path.resolve(__dirname, "../../.env") })
  require("dotenv").config({ path: path.resolve(__dirname, "../../../.env.local") })
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
  mongoUri: process.env.MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientUrls: parseClientUrls(process.env.CLIENT_URL),
  apiFootballKey: process.env.API_FOOTBALL_KEY || "",
  gnewsApiKey: process.env.GNEWS_API_KEY || "",
  intelsphereApiKey: process.env.INTELSPHERE_API_KEY || "",
  intelsphereBaseUrl: process.env.INTELSPHERE_BASE_URL || "",
  intelsphereModel: process.env.INTELSPHERE_MODEL || "",
}

env.isProduction = env.nodeEnv === "production"

module.exports = { env }
