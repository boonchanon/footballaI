const { param, query } = require("express-validator")

const {
  getCleanSheets,
  getFixtureEvents,
  getFixtureLineups,
  getFixturePrediction,
  getFixtures,
  getInjuries,
  getPlayerDetails,
  getPlayerStatsSummary,
  getStandings,
  getSuspensions,
  getTeams,
  getTopAssists,
  getTopScorers,
  getTransfers
} = require("../services/football.service")
const { asyncHandler } = require("../utils/async-handler")
const { ensureValidRequest } = require("../utils/validators")

const fixturesValidation = [
  query("type").optional().isIn(["all", "upcoming", "live", "finished"]),
  query("round").optional().isString(),
  query("limit").optional().isInt({ min: 1, max: 100 })
]

const playerValidation = [param("id").notEmpty()]
const predictionValidation = [param("id").notEmpty()]
const fixtureIdValidation = [param("id").notEmpty()]

const standings = asyncHandler(async (req, res) => {
  const data = await getStandings()
  res.json({ data, season: "2024-2025", source: "mock-or-api-football" })
})

const teams = asyncHandler(async (req, res) => {
  const data = await getTeams()
  res.json({ data, source: "mock-or-api-football" })
})

const fixtures = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const data = await getFixtures(req.query)
  const availableRounds = [...new Set(data.map((item) => item.roundNumber).filter(Boolean))].sort((a, b) => a - b)

  res.json({
    data,
    type: req.query.type || "all",
    source: "mock-or-api-football",
    rounds: {
      available: availableRounds,
      total: 38,
      current: req.query.round ? Number(req.query.round) : null
    },
    totalMatches: data.length
  })
})

const liveFixtures = asyncHandler(async (req, res) => {
  const data = await getFixtures({ type: "live" })
  res.json({ data, source: "mock-or-api-football" })
})

const results = asyncHandler(async (req, res) => {
  const data = await getFixtures({ type: "finished", limit: req.query.limit })
  res.json({ data, source: "mock-or-api-football" })
})

const topScorers = asyncHandler(async (req, res) => {
  const players = await getTopScorers()
  res.json({ players, source: "mock-or-api-football" })
})

const topAssists = asyncHandler(async (req, res) => {
  const players = await getTopAssists()
  res.json({ players, source: "mock-or-api-football" })
})

const cleanSheets = asyncHandler(async (req, res) => {
  const teams = await getCleanSheets()
  res.json({ teams, source: "mock-or-api-football" })
})

const playerStats = asyncHandler(async (req, res) => {
  const data = await getPlayerStatsSummary()
  res.json({ data, source: "mock-or-api-football" })
})

const playerDetails = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const data = await getPlayerDetails(req.params.id)
  res.json(data)
})

const fixturePrediction = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const data = await getFixturePrediction(req.params.id)
  res.json({ data, source: "mock-or-api-football" })
})

const fixtureLineups = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const data = await getFixtureLineups(req.params.id)
  res.json({ data, source: "mock-or-api-football" })
})

const fixtureEvents = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const data = await getFixtureEvents(req.params.id)
  res.json({ data, source: "mock-or-api-football" })
})

const injuries = asyncHandler(async (req, res) => {
  const data = await getInjuries()
  res.json({ data, source: "mock-or-api-football" })
})

const suspensions = asyncHandler(async (req, res) => {
  const data = await getSuspensions()
  res.json({ data, source: "mock-or-api-football" })
})

const transfers = asyncHandler(async (req, res) => {
  const data = await getTransfers()
  res.json({ data, source: "mock-or-api-football" })
})

module.exports = {
  cleanSheets,
  fixtureEvents,
  fixtureIdValidation,
  fixtureLineups,
  fixturePrediction,
  fixtures,
  fixturesValidation,
  injuries,
  liveFixtures,
  playerDetails,
  playerStats,
  playerValidation,
  predictionValidation,
  results,
  standings,
  suspensions,
  teams,
  topAssists,
  topScorers,
  transfers
}
