const express = require("express")
const { searchTeams, searchPlayers, searchMatches } = require("../services/search.service")
const { query } = require("express-validator")
const { ensureValidRequest } = require("../utils/validators")
const { sendSuccess } = require("../utils/response")

const router = express.Router()

const validateSearch = [
  query("q").trim().notEmpty(),
  (req, res, next) => {
    ensureValidRequest(req)
    next()
  },
]

router.get("/team", validateSearch, async (req, res, next) => {
  try {
    const data = await searchTeams(req.query.q)
    return sendSuccess(res, data, "Teams found")
  } catch (error) {
    next(error)
  }
})

router.get("/player", validateSearch, async (req, res, next) => {
  try {
    const data = await searchPlayers(req.query.q)
    return sendSuccess(res, data, "Players found")
  } catch (error) {
    next(error)
  }
})

router.get("/match", validateSearch, async (req, res, next) => {
  try {
    const data = await searchMatches(req.query.q)
    return sendSuccess(res, data, "Matches found")
  } catch (error) {
    next(error)
  }
})

module.exports = router
