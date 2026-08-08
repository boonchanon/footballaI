const { env } = require("./env")

const footballDataConfig = {
  baseUrl: env.footballDataBaseUrl,
  apiKey: env.footballDataApiKey,
  defaultCompetitionId: Number(process.env.FOOTBALL_DATA_DEFAULT_COMPETITION || 2021),
}

module.exports = footballDataConfig
