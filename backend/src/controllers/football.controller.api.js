const {
  listAllLeagues,
  listFixtures,
  listLiveScores,
  getStandingsByLeague,
  listTeams,
  getTeam,
  listTopScorersByLeague,
  getMatch,
  getMatchEventsById,
  getMatchLineupsById,
  getTeamFixtures,
  listPlayersByTeam,
  getPlayer,
  getHeadToHead,
} = require("../services/football.service")

function sendFootballResponse(res, result, defaultMessage = "Success") {
  const data = result?.data ?? result
  const message =
    result?.message ||
    (Array.isArray(data) ? (data.length ? defaultMessage : "ไม่พบข้อมูล") : defaultMessage)

  return res.status(200).json({
    success: true,
    message,
    data,
    ...(result?.cached ? { cached: true } : {}),
    ...(result?.stale ? { stale: true } : {}),
  })
}

const listLeagues = async (req, res, next) => {
  try {
    const data = await listAllLeagues()
    return sendFootballResponse(res, { data }, "Success")
  } catch (error) {
    next(error)
  }
}

const listFixturesRoute = async (req, res, next) => {
  try {
    const { leagueId, from, to, teamId, matchId } = req.query
    const result = await listFixtures({ leagueId, from, to, teamId, matchId })
    return sendFootballResponse(res, result)
  } catch (error) {
    next(error)
  }
}

const getLiveScoresRoute = async (req, res, next) => {
  try {
    const { leagueId } = req.query
    const result = await listLiveScores(leagueId)
    return sendFootballResponse(res, result)
  } catch (error) {
    next(error)
  }
}

const getStandings = async (req, res, next) => {
  try {
    const { leagueId } = req.params
    const result = await getStandingsByLeague(leagueId)
    return sendFootballResponse(res, result)
  } catch (error) {
    next(error)
  }
}

const listTeamsByLeague = async (req, res, next) => {
  try {
    const { leagueId, teamId } = req.query
    const result = await listTeams({ leagueId, teamId })
    return sendFootballResponse(res, result)
  } catch (error) {
    next(error)
  }
}

const getTeamById = async (req, res, next) => {
  try {
    const { teamId } = req.params
    const result = await getTeam(teamId)
    return sendFootballResponse(res, result)
  } catch (error) {
    next(error)
  }
}

const listTopScorers = async (req, res, next) => {
  try {
    const { leagueId } = req.params
    const result = await listTopScorersByLeague(leagueId)
    return sendFootballResponse(res, result)
  } catch (error) {
    next(error)
  }
}

const getMatchDetails = async (req, res, next) => {
  try {
    const { matchId } = req.params
    const result = await getMatch(matchId)
    return sendFootballResponse(res, result)
  } catch (error) {
    next(error)
  }
}

const getMatchEvents = async (req, res, next) => {
  try {
    const { matchId } = req.params
    const result = await getMatchEventsById(matchId)
    return sendFootballResponse(res, result)
  } catch (error) {
    next(error)
  }
}

const getMatchLineups = async (req, res, next) => {
  try {
    const { matchId } = req.params
    const result = await getMatchLineupsById(matchId)
    return sendFootballResponse(res, result)
  } catch (error) {
    next(error)
  }
}

const listTeamFixturesRoute = async (req, res, next) => {
  try {
    const { teamId } = req.params
    const { status, from, to } = req.query
    const result = await getTeamFixtures({ teamId, status, from, to })
    return sendFootballResponse(res, result)
  } catch (error) {
    next(error)
  }
}

const listTeamPlayersRoute = async (req, res, next) => {
  try {
    const { teamId } = req.params
    const result = await listPlayersByTeam(teamId)
    return sendFootballResponse(res, result)
  } catch (error) {
    next(error)
  }
}

const getPlayerById = async (req, res, next) => {
  try {
    const { playerId } = req.params
    const result = await getPlayer(playerId)
    return sendFootballResponse(res, result)
  } catch (error) {
    next(error)
  }
}

const getHeadToHeadRoute = async (req, res, next) => {
  try {
    const { firstTeamId, secondTeamId } = req.query
    const result = await getHeadToHead(firstTeamId, secondTeamId)
    return sendFootballResponse(res, result)
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listLeagues,
  listFixtures: listFixturesRoute,
  getLiveScores: getLiveScoresRoute,
  getStandings,
  listTeamsByLeague,
  getTeamById,
  listTopScorers,
  getMatchDetails,
  getMatchEvents,
  getMatchLineups,
  listTeamFixtures: listTeamFixturesRoute,
  listTeamPlayers: listTeamPlayersRoute,
  getPlayerById,
  getHeadToHead: getHeadToHeadRoute,
}
