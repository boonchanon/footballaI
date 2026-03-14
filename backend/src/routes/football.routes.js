const express = require("express")

const {
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
} = require("../controllers/football.controller")

const router = express.Router()

router.get("/standings", standings)
router.get("/teams", teams)
router.get("/fixtures", fixturesValidation, fixtures)
router.get("/live", liveFixtures)
router.get("/results", results)
router.get("/topscorers", topScorers)
router.get("/topassists", topAssists)
router.get("/cleansheets", cleanSheets)
router.get("/player-stats", playerStats)
router.get("/injuries", injuries)
router.get("/suspensions", suspensions)
router.get("/transfers", transfers)
router.get("/players/:id", playerValidation, playerDetails)
router.get("/predictions/:id", predictionValidation, fixturePrediction)
router.get("/lineups/:id", fixtureIdValidation, fixtureLineups)
router.get("/events/:id", fixtureIdValidation, fixtureEvents)

module.exports = router
