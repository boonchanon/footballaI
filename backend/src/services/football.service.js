const { request } = require("./api.service")
const { ApiError } = require("../utils/api-error")
const { env } = require("../config/env")
const {
  getApiCache,
  upsertApiCache,
  listLeagues: repoListLeagues,
  listFixtures: repoListFixtures,
  findLiveFixtures,
  listStandings: repoListStandings,
  listTeamsByLeague: repoListTeamsByLeague,
  getTeamById: repoGetTeamById,
  listTopScorers: repoListTopScorers,
  getMatchById: repoGetMatchById,
  listMatchEvents: repoListMatchEvents,
  listMatchLineups: repoListMatchLineups,
  listTeamFixtures: repoListTeamFixtures,
  listTeamPlayers: repoListTeamPlayers,
  getPlayerById: repoGetPlayerById,
  upsertLeague,
  upsertTeam,
  upsertPlayer,
  upsertFixture,
  upsertMatch,
  replaceStandings,
  replaceTopScorers,
  replaceMatchEvents,
  replaceMatchLineups,
} = require("../repositories/football.repository")

const TTL = {
  leagues: 24 * 60 * 60 * 1000,
  fixtures: 6 * 60 * 60 * 1000,
  live: 60 * 1000,
  standings: 30 * 60 * 1000,
  teams: 24 * 60 * 60 * 1000,
  players: 24 * 60 * 60 * 1000,
  topscorers: 6 * 60 * 60 * 1000,
  match: 5 * 60 * 1000,
  h2h: 6 * 60 * 60 * 1000,
}

function nowPlus(ms) {
  return new Date(Date.now() + ms)
}

function isCacheFresh(cacheEntry) {
  return cacheEntry && new Date(cacheEntry.expiresAt).getTime() > Date.now()
}

async function readThroughCache({ endpoint, params, ttlMs, externalId, fallback }) {
  const cacheEntry = await getApiCache(endpoint, params)
  if (isCacheFresh(cacheEntry)) {
    return { data: cacheEntry.payload, cached: true, stale: false }
  }

  try {
    const data = await fallback()
    await upsertApiCache({
      endpoint,
      params,
      externalId,
      payload: data,
      expiresAt: nowPlus(ttlMs),
    })
    return { data, cached: false, stale: false }
  } catch (error) {
    if (cacheEntry) {
      return {
        data: cacheEntry.payload,
        cached: true,
        stale: true,
      }
    }
    throw error
  }
}

function ensureResultArray(payload) {
  if (Array.isArray(payload?.result)) return payload.result
  if (payload?.success === 1 && !payload?.result) return []
  return []
}

function mapLeague(item) {
  return {
    id: Number(item.league_key || item.league_id),
    name: item.league_name || null,
    country: item.country_name || null,
    logo: item.league_logo || item.logo || null,
  }
}

function mapTeam(item) {
  return {
    id: Number(item.team_key),
    leagueId: item.league_id ? Number(item.league_id) : null,
    name: item.team_name || null,
    shortName: item.team_name_short || null,
    logo: item.team_logo || null,
    venue: item.venue || null,
    country: item.country_name || null,
    founded: item.founded ? Number(item.founded) : null,
  }
}

function mapPlayer(item, teamId = null) {
  return {
    id: Number(item.player_key),
    teamId: teamId ?? (item.team_key ? Number(item.team_key) : null),
    name: item.player_name || null,
    photo: item.player_image || null,
    position: item.player_type || item.position || null,
    nationality: item.player_country || item.nationality || null,
    dateOfBirth: item.player_bday ? new Date(item.player_bday) : null,
    age: item.player_age ? Number(item.player_age) : null,
    height: item.player_height || item.height || null,
    weight: item.player_weight || item.weight || null,
    preferredFoot: item.player_preferred_foot || item.preferred_foot || null,
    status: item.player_status || item.status || null,
    shirtNumber: item.player_number ? Number(item.player_number) : null,
    updatedAt: new Date(),
  }
}

function parseScore(value) {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

function normalizeFixture(item) {
  return {
    matchId: String(item.match_id || ""),
    league: {
      id: item.league_id ? String(item.league_id) : null,
      name: item.league_name || null,
    },
    date: item.match_date || null,
    time: item.match_time || null,
    status: item.match_status || null,
    stadium: item.match_stadium || item.stadium || null,
    homeTeam: {
      id: item.match_hometeam_id ? String(item.match_hometeam_id) : null,
      name: item.match_hometeam_name || null,
      logo: item.team_home_badge || item.match_hometeam_logo || null,
    },
    awayTeam: {
      id: item.match_awayteam_id ? String(item.match_awayteam_id) : null,
      name: item.match_awayteam_name || null,
      logo: item.team_away_badge || item.match_awayteam_logo || null,
    },
    score: {
      home: parseScore(item.match_hometeam_score),
      away: parseScore(item.match_awayteam_score),
      halfTime:
        item.match_hometeam_score_half_time || item.match_awayteam_score_half_time
          ? `${item.match_hometeam_score_half_time ?? ""}-${item.match_awayteam_score_half_time ?? ""}`
          : null,
      fullTime:
        item.match_hometeam_ft_score || item.match_awayteam_ft_score
          ? `${item.match_hometeam_ft_score ?? ""}-${item.match_awayteam_ft_score ?? ""}`
          : null,
    },
    referee: item.match_referee || null,
  }
}

function mapFixtureForPersistence(item) {
  return {
    id: Number(item.match_id),
    leagueId: Number(item.league_id),
    homeTeamId: Number(item.match_hometeam_id),
    awayTeamId: Number(item.match_awayteam_id),
    season: item.season || null,
    date: new Date(item.match_date),
    time: item.match_time || null,
    status: item.match_status || null,
    round: item.match_round || null,
    venue: item.match_stadium || item.stadium || null,
    homeScore: parseScore(item.match_hometeam_score),
    awayScore: parseScore(item.match_awayteam_score),
    lastUpdated: new Date(),
  }
}

function mapStanding(item) {
  return {
    leagueId: Number(item.league_id),
    teamId: Number(item.team_id),
    rank: Number(item.overall_league_position || item.rank),
    played: Number(item.overall_league_payed || item.overall_gp || 0),
    win: Number(item.overall_league_W || item.overall_w || 0),
    draw: Number(item.overall_league_D || item.overall_d || 0),
    loss: Number(item.overall_league_L || item.overall_l || 0),
    points: Number(item.overall_league_PTS || item.points || 0),
    goalsFor: Number(item.overall_league_GF || item.overall_gs || 0),
    goalsAgainst: Number(item.overall_league_GA || item.overall_ga || 0),
    goalDifference: Number(item.goal_difference || item.overall_gd || 0),
    form: item.form || null,
    lastUpdated: new Date(),
  }
}

function mapTopScorer(item, rank) {
  return {
    leagueId: Number(item.league_id || env.defaultLeagueId),
    playerId: Number(item.player_key),
    teamId: Number(item.team_key),
    goals: Number(item.goals || 0),
    assists: Number(item.assists || 0),
    rank,
    lastUpdated: new Date(),
  }
}

function mapEventList(item) {
  const events = []

  for (const goal of item.goalscorer || []) {
    events.push({
      minute: goal.time || null,
      team: goal.home_scorer ? item.match_hometeam_name : item.match_awayteam_name,
      type: goal.score_info === "Penalty" ? "penalty" : "goal",
      player: goal.home_scorer || goal.away_scorer || "",
      assist: goal.home_assist || goal.away_assist || "",
      detail: goal.score || "",
    })
  }

  for (const card of item.cards || []) {
    events.push({
      minute: card.time || null,
      team: card.home_fault || card.card === "home" ? item.match_hometeam_name : item.match_awayteam_name,
      type: (card.card || "").toLowerCase().includes("red") ? "red_card" : "yellow_card",
      player: card.home_fault || card.away_fault || "",
      assist: "",
      detail: card.card || "",
    })
  }

  for (const sub of item.substitutions || []) {
    events.push({
      minute: sub.time || null,
      team: sub.home_team ? item.match_hometeam_name : item.match_awayteam_name,
      type: "substitution",
      player: sub.home_player || sub.away_player || "",
      assist: "",
      detail: sub.substitution || "",
    })
  }

  return events.sort((left, right) => String(left.minute).localeCompare(String(right.minute), undefined, { numeric: true }))
}

function mapLineups(item) {
  const home = item.lineup?.home || {}
  const away = item.lineup?.away || {}

  return {
    home: {
      coach: home.coach || null,
      startingXI: home.starting_lineups || [],
      substitutes: home.substitutes || [],
    },
    away: {
      coach: away.coach || null,
      startingXI: away.starting_lineups || [],
      substitutes: away.substitutes || [],
    },
  }
}

function mapPrismaFixture(item) {
  return {
    matchId: String(item.id),
    league: item.league ? { id: String(item.league.id), name: item.league.name } : {},
    date: item.date?.toISOString().slice(0, 10) || null,
    time: item.time || null,
    status: item.status || null,
    stadium: item.venue || null,
    homeTeam: item.homeTeam ? { id: String(item.homeTeam.id), name: item.homeTeam.name, logo: item.homeTeam.logo } : {},
    awayTeam: item.awayTeam ? { id: String(item.awayTeam.id), name: item.awayTeam.name, logo: item.awayTeam.logo } : {},
    score: {
      home: item.homeScore,
      away: item.awayScore,
      halfTime: null,
      fullTime: null,
    },
    referee: null,
  }
}

async function listAllLeagues() {
  const { data } = await readThroughCache({
    endpoint: "leagues",
    params: {},
    ttlMs: TTL.leagues,
    fallback: async () => {
      const apiData = await request("GET", "", { params: { met: "Leagues" } })
      const leagues = ensureResultArray(apiData).map(mapLeague)
      await Promise.all(leagues.map(upsertLeague))
      return leagues
    },
  })

  return data
}

async function listFixtures(params) {
  const requestParams = {
    leagueId: params.leagueId || env.defaultLeagueId,
    from: params.from,
    to: params.to,
    teamId: params.teamId,
    matchId: params.matchId,
  }

  const { data, cached, stale } = await readThroughCache({
    endpoint: "fixtures",
    params: requestParams,
    ttlMs: TTL.fixtures,
    externalId: requestParams.matchId || requestParams.teamId || requestParams.leagueId,
    fallback: async () => {
      const apiData = await request("GET", "", { params: { met: "Fixtures", ...requestParams } })
      const fixtures = ensureResultArray(apiData)
      await Promise.all(fixtures.map((item) => upsertFixture(mapFixtureForPersistence(item))))
      return fixtures.map(normalizeFixture)
    },
  })

  return { data, cached, stale }
}

async function listLiveScores(leagueId) {
  const params = { leagueId: leagueId || env.defaultLeagueId }

  try {
    const { data, cached, stale } = await readThroughCache({
      endpoint: "live",
      params,
      ttlMs: TTL.live,
      externalId: params.leagueId,
      fallback: async () => {
        const apiData = await request("GET", "", { params: { met: "Livescore", ...params } })
        return ensureResultArray(apiData).map(normalizeFixture)
      },
    })

    return {
      data,
      cached,
      stale,
      message: data.length ? "Success" : "ขณะนี้ไม่มีการแข่งขันสด",
    }
  } catch (error) {
    const fallback = await findLiveFixtures(Number(params.leagueId))
    return {
      data: fallback.map(mapPrismaFixture),
      cached: true,
      stale: true,
      message: fallback.length ? "Success" : "ขณะนี้ไม่มีการแข่งขันสด",
    }
  }
}

async function getStandingsByLeague(leagueId) {
  const params = { leagueId: leagueId || env.defaultLeagueId }
  const { data, cached, stale } = await readThroughCache({
    endpoint: "standings",
    params,
    ttlMs: TTL.standings,
    externalId: params.leagueId,
    fallback: async () => {
      const apiData = await request("GET", "", { params: { met: "Standings", ...params } })
      const rows = ensureResultArray(apiData).map(mapStanding)
      if (rows.length) {
        await replaceStandings(params.leagueId, rows)
      }
      return rows
    },
  })

  return { data, cached, stale }
}

async function listTeams({ leagueId, teamId }) {
  const params = { leagueId: leagueId || undefined, teamId: teamId || undefined }
  const endpoint = "teams"
  const { data, cached, stale } = await readThroughCache({
    endpoint,
    params,
    ttlMs: TTL.teams,
    externalId: teamId || leagueId || null,
    fallback: async () => {
      const query = { met: "Teams", ...params }
      if (!query.leagueId && !query.teamId) {
        query.leagueId = env.defaultLeagueId
      }
      const apiData = await request("GET", "", { params: query })
      const teams = ensureResultArray(apiData).map(mapTeam)
      await Promise.all(teams.map(upsertTeam))
      return teams
    },
  })

  return { data, cached, stale }
}

async function getTeam(teamId) {
  const { data } = await listTeams({ teamId })
  const team = data[0]
  if (!team) {
    const cachedTeam = await repoGetTeamById(Number(teamId))
    if (!cachedTeam) throw new ApiError(404, "ไม่พบข้อมูล")
    return { data: cachedTeam, cached: true, stale: true }
  }
  return { data: team, cached: false, stale: false }
}

async function listTopScorersByLeague(leagueId) {
  const params = { leagueId: leagueId || env.defaultLeagueId }
  const { data, cached, stale } = await readThroughCache({
    endpoint: "topscorers",
    params,
    ttlMs: TTL.topscorers,
    externalId: params.leagueId,
    fallback: async () => {
      const apiData = await request("GET", "", { params: { met: "Topscorers", ...params } })
      const result = ensureResultArray(apiData)
      const scorers = result.map((item, index) => mapTopScorer(item, index + 1))
      if (scorers.length) {
        await Promise.all(
          result.map((item) =>
            upsertPlayer(
              mapPlayer({
                player_key: item.player_key,
                player_name: item.player_name,
                player_image: item.player_image,
                team_key: item.team_key,
              }),
            ),
          ),
        )
        await replaceTopScorers(params.leagueId, scorers)
      }
      return result.map((item, index) => ({
        rank: index + 1,
        player: {
          id: String(item.player_key),
          name: item.player_name || null,
          photo: item.player_image || null,
        },
        team: {
          id: String(item.team_key),
          name: item.team_name || null,
          logo: item.team_logo || null,
        },
        goals: Number(item.goals || 0),
        assists: Number(item.assists || 0),
      }))
    },
  })

  return { data, cached, stale }
}

async function getMatch(matchId) {
  const { data, cached, stale } = await readThroughCache({
    endpoint: "match",
    params: { matchId },
    ttlMs: TTL.match,
    externalId: matchId,
    fallback: async () => {
      const apiData = await request("GET", "", { params: { met: "Fixtures", matchId } })
      const item = ensureResultArray(apiData)[0]
      if (!item) throw new ApiError(404, "ไม่พบข้อมูล")
      await upsertMatch({
        id: Number(item.match_id),
        leagueId: Number(item.league_id),
        season: item.season || null,
        date: new Date(item.match_date),
        time: item.match_time || null,
        stadium: item.match_stadium || item.stadium || null,
        homeTeamId: Number(item.match_hometeam_id),
        awayTeamId: Number(item.match_awayteam_id),
        homeScore: parseScore(item.match_hometeam_score),
        awayScore: parseScore(item.match_awayteam_score),
        status: item.match_status || null,
        halfTimeHome: parseScore(item.match_hometeam_score_half_time),
        halfTimeAway: parseScore(item.match_awayteam_score_half_time),
        referee: item.match_referee || null,
        attendance: parseScore(item.match_stadium_attendance),
        lastUpdated: new Date(),
      })
      return normalizeFixture(item)
    },
  })

  return { data, cached, stale }
}

async function getMatchEventsById(matchId) {
  const { data, cached, stale } = await readThroughCache({
    endpoint: "match-events",
    params: { matchId },
    ttlMs: TTL.match,
    externalId: matchId,
    fallback: async () => {
      const apiData = await request("GET", "", { params: { met: "Fixtures", matchId } })
      const item = ensureResultArray(apiData)[0]
      if (!item) return []
      const events = mapEventList(item)
      await replaceMatchEvents(
        matchId,
        events.map((event) => ({
          matchId: Number(matchId),
          type: event.type,
          detail: event.detail || null,
          minute: event.minute ? Number.parseInt(String(event.minute), 10) || null : null,
          side: event.team || null,
        })),
      )
      return events
    },
  })

  return { data, cached, stale }
}

async function getMatchLineupsById(matchId) {
  const { data, cached, stale } = await readThroughCache({
    endpoint: "match-lineups",
    params: { matchId },
    ttlMs: TTL.match,
    externalId: matchId,
    fallback: async () => {
      const apiData = await request("GET", "", { params: { met: "Fixtures", matchId } })
      const item = ensureResultArray(apiData)[0]
      if (!item) return { home: { coach: null, startingXI: [], substitutes: [] }, away: { coach: null, startingXI: [], substitutes: [] } }
      const lineups = mapLineups(item)
      const persistRows = [
        ...(lineups.home.startingXI || []).map((player) => ({
          matchId: Number(matchId),
          teamId: Number(item.match_hometeam_id),
          name: player.lineup_player || "",
          number: parseScore(player.lineup_number),
          position: player.lineup_position || null,
          role: "starting",
          isStarting: true,
        })),
        ...(lineups.home.substitutes || []).map((player) => ({
          matchId: Number(matchId),
          teamId: Number(item.match_hometeam_id),
          name: player.lineup_player || "",
          number: parseScore(player.lineup_number),
          position: player.lineup_position || null,
          role: "substitute",
          isStarting: false,
        })),
        ...(lineups.away.startingXI || []).map((player) => ({
          matchId: Number(matchId),
          teamId: Number(item.match_awayteam_id),
          name: player.lineup_player || "",
          number: parseScore(player.lineup_number),
          position: player.lineup_position || null,
          role: "starting",
          isStarting: true,
        })),
        ...(lineups.away.substitutes || []).map((player) => ({
          matchId: Number(matchId),
          teamId: Number(item.match_awayteam_id),
          name: player.lineup_player || "",
          number: parseScore(player.lineup_number),
          position: player.lineup_position || null,
          role: "substitute",
          isStarting: false,
        })),
      ]
      await replaceMatchLineups(matchId, persistRows)
      return lineups
    },
  })

  return { data, cached, stale }
}

async function getTeamFixtures({ teamId, status, from, to }) {
  return listFixtures({ teamId, status, from, to })
}

async function listPlayersByTeam(teamId) {
  const { data, cached, stale } = await readThroughCache({
    endpoint: "team-players",
    params: { teamId },
    ttlMs: TTL.players,
    externalId: teamId,
    fallback: async () => {
      const teamPayload = await request("GET", "", { params: { met: "Teams", teamId } })
      const teamItem = ensureResultArray(teamPayload)[0]
      let players = Array.isArray(teamItem?.players) ? teamItem.players : []

      if (!players.length) {
        const playersPayload = await request("GET", "", { params: { met: "Players", teamId } })
        players = ensureResultArray(playersPayload)
      }

      const normalized = players.map((item) => mapPlayer(item, Number(teamId)))
      await Promise.all(normalized.map(upsertPlayer))
      return normalized
    },
  })

  return { data, cached, stale }
}

async function getPlayer(playerId) {
  const { data, cached, stale } = await readThroughCache({
    endpoint: "player",
    params: { playerId },
    ttlMs: TTL.players,
    externalId: playerId,
    fallback: async () => {
      const apiData = await request("GET", "", { params: { met: "Players", playerId } })
      const item = ensureResultArray(apiData)[0]
      if (!item) {
        const cachedPlayer = await repoGetPlayerById(Number(playerId))
        if (!cachedPlayer) throw new ApiError(404, "ไม่พบข้อมูล")
        return cachedPlayer
      }
      const player = mapPlayer(item)
      await upsertPlayer(player)
      return player
    },
  })

  return { data, cached, stale }
}

async function getHeadToHead(firstTeamId, secondTeamId) {
  const { data, cached, stale } = await readThroughCache({
    endpoint: "h2h",
    params: { firstTeamId, secondTeamId },
    ttlMs: TTL.h2h,
    fallback: async () => {
      const apiData = await request("GET", "", {
        params: { met: "H2H", firstTeamId, secondTeamId },
      })
      return ensureResultArray(apiData).map(normalizeFixture)
    },
  })

  return { data, cached, stale }
}

module.exports = {
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
}
