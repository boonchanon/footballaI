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
}

env.isProduction = env.nodeEnv === "production"

module.exports = { env }
