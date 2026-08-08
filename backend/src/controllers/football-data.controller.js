const footballDataService = require("../services/football-data.service")
const { ApiError } = require("../utils/api-error")

async function getTodayMatches(req, res, next) {
  try {
    const result = await footballDataService.getTodayMatches()
    return res.json({ success: true, source: result.source, data: result.data })
  } catch (error) {
    return next(error)
  }
}

async function getLiveMatches(req, res, next) {
  try {
    const result = await footballDataService.getLiveMatches()
    return res.json({ success: true, source: result.source, data: result.data })
  } catch (error) {
    return next(error)
  }
}

async function getMatchById(req, res, next) {
  try {
    const { id } = req.params
    const result = await footballDataService.getMatchById(id)
    if (!result.data) {
      throw new ApiError(404, "Match not found")
    }
    return res.json({ success: true, source: result.source, data: result.data })
  } catch (error) {
    return next(error)
  }
}

async function getStandings(req, res, next) {
  try {
    const { competition } = req.params
    const result = await footballDataService.getStandingsByCompetition(competition)
    return res.json({ success: true, source: result.source, data: result.data })
  } catch (error) {
    return next(error)
  }
}

async function getTeamById(req, res, next) {
  try {
    const { id } = req.params
    const result = await footballDataService.getTeamById(id)
    if (!result.data) {
      throw new ApiError(404, "Team not found")
    }
    return res.json({ success: true, source: result.source, data: result.data })
  } catch (error) {
    return next(error)
  }
}

async function getPlayerById(req, res, next) {
  try {
    const { id } = req.params
    const result = await footballDataService.getPlayerById(id)
    if (!result.data) {
      throw new ApiError(404, "Player not found")
    }
    return res.json({ success: true, source: result.source, data: result.data })
  } catch (error) {
    return next(error)
  }
}

async function getScorers(req, res, next) {
  try {
    const { competition } = req.params
    const result = await footballDataService.getScorersByCompetition(competition)
    return res.json({ success: true, source: result.source, data: result.data })
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  getTodayMatches,
  getLiveMatches,
  getMatchById,
  getStandings,
  getTeamById,
  getPlayerById,
  getScorers,
}
