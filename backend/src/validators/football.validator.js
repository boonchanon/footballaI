const { query, param } = require("express-validator")
const { ensureValidRequest } = require("../utils/validators")

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

function validateDateString(fieldName) {
  return query(fieldName)
    .optional()
    .matches(dateRegex)
    .withMessage(`${fieldName} must use YYYY-MM-DD format`)
}

const validateLeagueId = [param("leagueId").isInt().withMessage("leagueId must be an integer"), (req, res, next) => {
  ensureValidRequest(req)
  next()
}]

const validateMatchId = [param("matchId").isInt().withMessage("matchId must be an integer"), (req, res, next) => {
  ensureValidRequest(req)
  next()
}]

const validateTeamId = [param("teamId").isInt().withMessage("teamId must be an integer"), (req, res, next) => {
  ensureValidRequest(req)
  next()
}]

const validatePlayerId = [param("playerId").isInt().withMessage("playerId must be an integer"), (req, res, next) => {
  ensureValidRequest(req)
  next()
}]

const validateFixturesQuery = [
  query("leagueId").optional().isInt().withMessage("leagueId must be an integer"),
  query("teamId").optional().isInt().withMessage("teamId must be an integer"),
  query("matchId").optional().isInt().withMessage("matchId must be an integer"),
  validateDateString("from"),
  validateDateString("to"),
  (req, res, next) => {
    ensureValidRequest(req)
    next()
  },
]

const validateTeamFixturesQuery = [
  param("teamId").isInt().withMessage("teamId must be an integer"),
  query("status").optional().isString(),
  query("season").optional().isString(),
  validateDateString("from"),
  validateDateString("to"),
  (req, res, next) => {
    ensureValidRequest(req)
    next()
  },
]

const validateLiveQuery = [
  query("leagueId").optional().isInt().withMessage("leagueId must be an integer"),
  (req, res, next) => {
    ensureValidRequest(req)
    next()
  },
]

const validateTeamsQuery = [
  query("leagueId").optional().isInt().withMessage("leagueId must be an integer"),
  query("teamId").optional().isInt().withMessage("teamId must be an integer"),
  (req, res, next) => {
    ensureValidRequest(req)
    next()
  },
]

const validateH2HQuery = [
  query("firstTeamId").isInt().withMessage("firstTeamId must be an integer"),
  query("secondTeamId").isInt().withMessage("secondTeamId must be an integer"),
  (req, res, next) => {
    ensureValidRequest(req)
    next()
  },
]

const validateSearchQuery = [
  query("q").isString().notEmpty().withMessage("q is required"),
  (req, res, next) => {
    ensureValidRequest(req)
    next()
  },
]

module.exports = {
  validateLeagueId,
  validateMatchId,
  validateTeamId,
  validatePlayerId,
  validateFixturesQuery,
  validateTeamFixturesQuery,
  validateLiveQuery,
  validateTeamsQuery,
  validateH2HQuery,
  validateSearchQuery,
}
