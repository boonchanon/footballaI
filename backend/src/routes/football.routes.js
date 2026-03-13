const express = require("express")

const { cleanSheets, fixturePrediction, fixtures, fixturesValidation, playerDetails, playerStats, playerValidation, predictionValidation, standings, teams, topAssists, topScorers } = require("../controllers/football.controller")

const router = express.Router()

router.get("/standings", standings)
router.get("/teams", teams)
router.get("/fixtures", fixturesValidation, fixtures)
router.get("/topscorers", topScorers)
router.get("/topassists", topAssists)
router.get("/cleansheets", cleanSheets)
router.get("/player-stats", playerStats)
router.get("/players/:id", playerValidation, playerDetails)
router.get("/predictions/:id", predictionValidation, fixturePrediction)

module.exports = router
