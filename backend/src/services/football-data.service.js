const axios = require("axios")
const { ApiError } = require("../utils/api-error")
const footballDataConfig = require("../config/football-data.config")
const footballRepository = require("../repositories/football-data.repository")

const footballClient = axios.create({
  baseURL: footballDataConfig.baseUrl,
  timeout: 20000,
  headers: {
    "X-Auth-Token": footballDataConfig.apiKey,
    Accept: "application/json",
  },
})

function normalizeMatch(match) {
  return {
    id: match.id,
    utcDate: new Date(match.utcDate),
    status: match.status,
    matchday: match.matchday,
    stage: match.stage,
    group: match.group,
    lastUpdated: match.lastUpdated ? new Date(match.lastUpdated) : new Date(),
    homeTeamId: match.homeTeam?.id,
    awayTeamId: match.awayTeam?.id,
    competitionId: match.competition?.id,
    homeScore: match.score?.fullTime?.home ?? null,
    awayScore: match.score?.fullTime?.away ?? null,
  }
}

function normalizeTeam(team) {
  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    tla: team.tla,
    crestUrl: team.crestUrl,
    founded: team.founded,
    venue: team.venue,
  }
}

function normalizePlayer(player) {
  return {
    id: player.id,
    name: player.name,
    position: player.position,
    nationality: player.nationality,
    dateOfBirth: player.dateOfBirth ? new Date(player.dateOfBirth) : null,
    countryOfBirth: player.countryOfBirth,
    teamId: player.team?.id || null,
  }
}

function normalizeScorer(scorer) {
  return {
    playerId: scorer.player?.id,
    teamId: scorer.team?.id,
    goals: scorer.goals,
    assists: scorer.assists ?? 0,
    position: scorer.position ?? null,
  }
}

async function fetchFootballData(endpoint) {
  if (!footballDataConfig.apiKey) {
    throw new ApiError(500, "FOOTBALL_DATA_API_KEY is not configured")
  }

  const response = await footballClient.get(endpoint)
  if (!response.data) {
    throw new ApiError(502, "Football-Data.org returned invalid payload")
  }
  return response.data
}

async function safeApiCall(apiFn, cacheFn, fallbackFn) {
  try {
    const data = await apiFn()
    return { source: "api", data }
  } catch (error) {
    console.error("Football-Data API error:", error.message || error)
    const fallbackData = await cacheFn()
    if (fallbackData) {
      return { source: "cache", data: fallbackData }
    }
    if (fallbackFn) {
      return { source: "empty", data: fallbackFn() }
    }
    return { source: "cache", data: [] }
  }
}

async function getTodayMatches() {
  const today = new Date().toISOString().slice(0, 10)

  const apiResult = await safeApiCall(
    async () => {
      const data = await fetchFootballData(`/matches?dateFrom=${today}&dateTo=${today}`)
      const matches = (data.matches || []).map((match) => {
        return {
          ...normalizeMatch(match),
          homeTeam: normalizeTeam(match.homeTeam),
          awayTeam: normalizeTeam(match.awayTeam),
          competition: {
            id: match.competition?.id,
            name: match.competition?.name,
          },
        }
      })

      await footballRepository.upsertCompetitions([
        {
          id: data.competition?.id || footballDataConfig.defaultCompetitionId,
          name: data.competition?.name || "",
          code: data.competition?.code || null,
          areaName: data.competition?.area?.name || null,
          areaCountry: data.competition?.area?.country || null,
        },
      ])
      await footballRepository.upsertTeams(
        data.matches
          .flatMap((match) => [match.homeTeam, match.awayTeam])
          .filter(Boolean)
          .map(normalizeTeam),
      )
      await footballRepository.upsertMatches(matches.map(normalizeMatch))
      return matches
    },
    async () => {
      return footballRepository.getMatchesByDate(today)
    },
    () => [],
  )

  return apiResult
}

async function getLiveMatches() {
  const apiResult = await safeApiCall(
    async () => {
      const data = await fetchFootballData(`/matches?status=LIVE`)
      const matches = (data.matches || []).map((match) => ({
        ...normalizeMatch(match),
        homeTeam: normalizeTeam(match.homeTeam),
        awayTeam: normalizeTeam(match.awayTeam),
        competition: {
          id: match.competition?.id,
          name: match.competition?.name,
        },
      }))

      await footballRepository.upsertTeams(
        data.matches
          .flatMap((match) => [match.homeTeam, match.awayTeam])
          .filter(Boolean)
          .map(normalizeTeam),
      )
      await footballRepository.upsertMatches(matches.map(normalizeMatch))
      return matches
    },
    async () => {
      return footballRepository.getLiveMatches()
    },
    () => [],
  )

  return apiResult
}

async function getMatchById(id) {
  const apiResult = await safeApiCall(
    async () => {
      const data = await fetchFootballData(`/matches/${id}`)
      const match = data.match
      if (!match) {
        throw new ApiError(404, "Match not found")
      }

      await footballRepository.upsertTeams([normalizeTeam(match.homeTeam), normalizeTeam(match.awayTeam)])
      await footballRepository.upsertCompetitions([
        {
          id: match.competition?.id,
          name: match.competition?.name,
          code: match.competition?.code,
          areaName: match.competition?.area?.name,
          areaCountry: match.competition?.area?.country,
        },
      ])

      const normalized = {
        ...normalizeMatch(match),
        homeTeam: normalizeTeam(match.homeTeam),
        awayTeam: normalizeTeam(match.awayTeam),
        competition: {
          id: match.competition?.id,
          name: match.competition?.name,
        },
      }
      await footballRepository.upsertMatches([normalizeMatch(match)])
      return normalized
    },
    async () => {
      return footballRepository.getMatchById(id)
    },
    () => null,
  )

  return apiResult
}

async function getStandingsByCompetition(competitionId) {
  const parsedCompetitionId = Number(competitionId)
  const apiResult = await safeApiCall(
    async () => {
      const data = await fetchFootballData(`/competitions/${parsedCompetitionId}/standings`)
      const standings = (data.standings || []).flatMap((group) =>
        (group.table || []).map((row) => ({
          position: row.position,
          teamId: row.team.id,
          teamName: row.team.name,
          playedGames: row.playedGames,
          points: row.points,
          goalsFor: row.goalsFor,
          goalsAgainst: row.goalsAgainst,
          goalDifference: row.goalDifference,
          form: row.form,
        })),
      )

      await footballRepository.upsertCompetition({
        id: parsedCompetitionId,
        name: data.competition?.name || "",
        code: data.competition?.code || null,
        areaName: data.competition?.area?.name || null,
        areaCountry: data.competition?.area?.country || null,
      })
      await footballRepository.upsertTeams(
        standings.map((row) => ({
          id: row.teamId,
          name: row.teamName,
          shortName: null,
          tla: null,
          crestUrl: null,
          founded: null,
          venue: null,
        })),
      )
      await footballRepository.replaceStandings(parsedCompetitionId, standings)
      return standings
    },
    async () => {
      return footballRepository.getStandingsByCompetition(parsedCompetitionId)
    },
    () => [],
  )

  return apiResult
}

async function getTeamById(id) {
  const apiResult = await safeApiCall(
    async () => {
      const data = await fetchFootballData(`/teams/${id}`)
      const team = data
      if (!team) {
        throw new ApiError(404, "Team not found")
      }

      await footballRepository.upsertTeams([normalizeTeam(team)])
      return team
    },
    async () => {
      return footballRepository.getTeamById(id)
    },
    () => null,
  )

  return apiResult
}

async function getPlayerById(id) {
  const apiResult = await safeApiCall(
    async () => {
      const data = await fetchFootballData(`/players/${id}`)
      const player = data
      if (!player) {
        throw new ApiError(404, "Player not found")
      }

      await footballRepository.upsertPlayers([normalizePlayer(player)])
      return player
    },
    async () => {
      return footballRepository.getPlayerById(id)
    },
    () => null,
  )

  return apiResult
}

async function getScorersByCompetition(competitionId) {
  const parsedCompetitionId = Number(competitionId)
  const apiResult = await safeApiCall(
    async () => {
      const data = await fetchFootballData(`/competitions/${parsedCompetitionId}/scorers`)
      const scorers = (data.scorers || []).map((item, index) => ({
        ...normalizeScorer(item),
        position: index + 1,
      }))

      await footballRepository.upsertCompetition({
        id: parsedCompetitionId,
        name: data.competition?.name || "",
        code: data.competition?.code || null,
        areaName: data.competition?.area?.name || null,
        areaCountry: data.competition?.area?.country || null,
      })
      await footballRepository.upsertTeams(
        data.scorers.map((item) => ({
          id: item.team?.id,
          name: item.team?.name || "",
          shortName: null,
          tla: null,
          crestUrl: item.team?.crestUrl,
          founded: null,
          venue: null,
        })),
      )
      await footballRepository.upsertPlayers(
        data.scorers.map((item) => ({
          id: item.player?.id,
          name: item.player?.name || "",
          position: item.player?.position || null,
          nationality: item.player?.nationality || null,
          dateOfBirth: item.player?.dateOfBirth ? new Date(item.player.dateOfBirth) : null,
          countryOfBirth: item.player?.countryOfBirth || null,
          teamId: item.team?.id,
        })),
      )
      await footballRepository.replaceScorers(parsedCompetitionId, scorers)
      return scorers
    },
    async () => {
      return footballRepository.getScorersByCompetition(parsedCompetitionId)
    },
    () => [],
  )

  return apiResult
}

async function refreshFixtures() {
  const today = new Date()
  const from = new Date(today)
  from.setDate(today.getDate() - 1)
  const to = new Date(today)
  to.setDate(today.getDate() + 7)
  const fromDate = from.toISOString().slice(0, 10)
  const toDate = to.toISOString().slice(0, 10)

  const data = await fetchFootballData(`/matches?dateFrom=${fromDate}&dateTo=${toDate}`)
  const matches = (data.matches || []).map((match) => ({
    ...normalizeMatch(match),
  }))
  await footballRepository.upsertTeams(
    data.matches
      .flatMap((match) => [match.homeTeam, match.awayTeam])
      .filter(Boolean)
      .map(normalizeTeam),
  )
  await footballRepository.upsertMatches(matches)
  return matches
}

async function refreshStandings() {
  const competitionId = footballDataConfig.defaultCompetitionId
  const data = await fetchFootballData(`/competitions/${competitionId}/standings`)
  const standings = (data.standings || []).flatMap((group) =>
    (group.table || []).map((row) => ({
      position: row.position,
      teamId: row.team.id,
      teamName: row.team.name,
      playedGames: row.playedGames,
      points: row.points,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      goalDifference: row.goalDifference,
      form: row.form,
    })),
  )

  await footballRepository.upsertCompetition({
    id: competitionId,
    name: data.competition?.name || "",
    code: data.competition?.code || null,
    areaName: data.competition?.area?.name || null,
    areaCountry: data.competition?.area?.country || null,
  })
  await footballRepository.upsertTeams(
    standings.map((row) => ({
      id: row.teamId,
      name: row.teamName,
      shortName: null,
      tla: null,
      crestUrl: null,
      founded: null,
      venue: null,
    })),
  )
  await footballRepository.replaceStandings(competitionId, standings)
  return standings
}

async function refreshLiveMatches() {
  const data = await fetchFootballData(`/matches?status=LIVE`)
  const matches = (data.matches || []).map((match) => normalizeMatch(match))
  await footballRepository.upsertTeams(
    data.matches
      .flatMap((match) => [match.homeTeam, match.awayTeam])
      .filter(Boolean)
      .map(normalizeTeam),
  )
  await footballRepository.upsertMatches(matches)
  return matches
}

async function refreshScorers() {
  const competitionId = footballDataConfig.defaultCompetitionId
  const data = await fetchFootballData(`/competitions/${competitionId}/scorers`)
  const scorers = (data.scorers || []).map((item, index) => ({
    ...normalizeScorer(item),
    position: index + 1,
  }))

  await footballRepository.upsertCompetition({
    id: competitionId,
    name: data.competition?.name || "",
    code: data.competition?.code || null,
    areaName: data.competition?.area?.name || null,
    areaCountry: data.competition?.area?.country || null,
  })
  await footballRepository.upsertTeams(
    data.scorers.map((item) => ({
      id: item.team.id,
      name: item.team.name,
      shortName: null,
      tla: null,
      crestUrl: item.team.crestUrl,
      founded: null,
      venue: null,
    })),
  )
  await footballRepository.upsertPlayers(
    data.scorers.map((item) => normalizePlayer({
      id: item.player.id,
      name: item.player.name,
      position: item.player.position,
      nationality: item.player.nationality,
      dateOfBirth: item.player.dateOfBirth,
      countryOfBirth: item.player.countryOfBirth,
      team: item.team,
    })),
  )
  await footballRepository.replaceScorers(competitionId, scorers)
  return scorers
}

module.exports = {
  getTodayMatches,
  getLiveMatches,
  getMatchById,
  getStandingsByCompetition,
  getTeamById,
  getPlayerById,
  getScorersByCompetition,
  refreshFixtures,
  refreshStandings,
  refreshLiveMatches,
  refreshScorers,
}
