const { param, query } = require("express-validator")

const { asyncHandler } = require("../utils/async-handler")
const { getCleanSheets, getFixturePrediction, getFixtures, getPlayerDetails, getPlayerStatsSummary, getStandings, getTeams, getTopAssists, getTopScorers } = require("../services/football.service")
const { ensureValidRequest } = require("../utils/validators")

const fixturesValidation = [
  query("type").optional().isIn(["all", "upcoming", "live", "finished"]),
  query("round").optional().isString(),
  query("limit").optional().isInt({ min: 1, max: 100 })
]

const playerValidation = [param("id").notEmpty()]
const predictionValidation = [param("id").notEmpty()]

const standings = asyncHandler(async (req, res) => {
  const data = await getStandings()
  res.json({ data, season: "2024-2025", source: "api-football" })
})

const teams = asyncHandler(async (req, res) => {
  const data = await getTeams()
  res.json({ data, source: "api-football" })
})

const fixtures = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const data = await getFixtures(req.query)
  const availableRounds = [...new Set(data.map((item) => item.roundNumber).filter(Boolean))].sort((a, b) => a - b)

  res.json({
    data,
    type: req.query.type || "all",
    source: "api-football",
    rounds: {
      available: availableRounds,
      total: 38,
      current: req.query.round ? Number(req.query.round) : null
    },
    totalMatches: data.length
  })
})

const topScorers = asyncHandler(async (req, res) => {
  const players = await getTopScorers()
  res.json({ players, source: "api-football" })
})

const topAssists = asyncHandler(async (req, res) => {
  const players = await getTopAssists()
  res.json({ players, source: "api-football" })
})

const cleanSheets = asyncHandler(async (req, res) => {
  const teams = await getCleanSheets()
  res.json({ teams, source: "api-football" })
})

const playerStats = asyncHandler(async (req, res) => {
  const data = await getPlayerStatsSummary()
  res.json({ data, source: "api-football" })
})

const playerDetails = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const data = await getPlayerDetails(req.params.id)
  res.json(data)
})

const fixturePrediction = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const data = await getFixturePrediction(req.params.id)
  res.json({ data, source: "api-football" })
})

module.exports = {
  cleanSheets,
  fixturePrediction,
  fixtures,
  fixturesValidation,
  playerDetails,
  playerStats,
  playerValidation,
  predictionValidation,
  standings,
  teams,
  topAssists,
  topScorers
}
