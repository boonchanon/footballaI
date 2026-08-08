const express = require("express")

const {
  listLeagues,
  listFixtures,
  getLiveScores,
  getStandings,
  listTeamsByLeague,
  getTeamById,
  listTopScorers,
  getMatchDetails,
  getMatchEvents,
  getMatchLineups,
  listTeamFixtures,
  listTeamPlayers,
  getPlayerById,
  getHeadToHead,
} = require("../controllers/football.controller.api")

const {
  validateLeagueId,
  validateMatchId,
  validateTeamId,
  validatePlayerId,
  validateFixturesQuery,
  validateTeamFixturesQuery,
  validateLiveQuery,
  validateTeamsQuery,
  validateH2HQuery,
} = require("../validators/football.validator")

const router = express.Router()

router.get("/leagues", listLeagues)
router.get("/fixtures", validateFixturesQuery, listFixtures)
router.get("/live", validateLiveQuery, getLiveScores)
router.get("/standings/:leagueId", validateLeagueId, getStandings)
router.get("/topscorers/:leagueId", validateLeagueId, listTopScorers)
router.get("/teams", validateTeamsQuery, listTeamsByLeague)
router.get("/team/:teamId", validateTeamId, getTeamById)
router.get("/team/:teamId/fixtures", validateTeamFixturesQuery, listTeamFixtures)
router.get("/team/:teamId/players", validateTeamId, listTeamPlayers)
router.get("/player/:playerId", validatePlayerId, getPlayerById)
router.get("/match/:matchId", validateMatchId, getMatchDetails)
router.get("/match/:matchId/events", validateMatchId, getMatchEvents)
router.get("/match/:matchId/lineups", validateMatchId, getMatchLineups)
router.get("/h2h", validateH2HQuery, getHeadToHead)

module.exports = router
