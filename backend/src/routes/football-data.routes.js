const express = require("express")
const {
  getTodayMatches,
  getLiveMatches,
  getMatchById,
  getStandings,
  getTeamById,
  getPlayerById,
  getScorers,
} = require("../controllers/football-data.controller")

const router = express.Router()

router.get("/today", getTodayMatches)
router.get("/live", getLiveMatches)
router.get("/:id", getMatchById)
router.get("/standings/:competition", getStandings)
router.get("/teams/:id", getTeamById)
router.get("/players/:id", getPlayerById)
router.get("/scorers/:competition", getScorers)

module.exports = router
