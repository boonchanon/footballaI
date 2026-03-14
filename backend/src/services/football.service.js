const { API_BASE, CURRENT_SEASON, PREMIER_LEAGUE_ID } = require("../config/constants")
const { env } = require("../config/env")
const {
  getMockCleanSheets,
  getMockEvents,
  getMockFixturePrediction,
  getMockFixtures,
  getMockInjuries,
  getMockLineups,
  getMockPlayerDetails,
  getMockPlayerStatsSummary,
  getMockStandings,
  getMockSuspensions,
  getMockTeams,
  getMockTopAssists,
  getMockTopScorers,
  getMockTransfers
} = require("../data/mock-football")
const { ApiError } = require("../utils/api-error")
const { formatDateThai, translateStatus, translateTeamName } = require("../utils/football")

async function fetchFromFootballApi(endpoint) {
  if (!env.apiFootballKey) {
    throw new ApiError(500, "API_FOOTBALL_KEY is not configured")
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "x-apisports-key": env.apiFootballKey
    }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new ApiError(response.status, `Football API request failed: ${text}`)
  }

  const data = await response.json()
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new ApiError(502, `Football API error: ${JSON.stringify(data.errors)}`)
  }

  return data
}

async function withMockFallback(fn, fallback) {
  try {
    return await fn()
  } catch (error) {
    if (!env.apiFootballKey || error instanceof ApiError) {
      return typeof fallback === "function" ? fallback() : fallback
    }
    throw error
  }
}

async function getStandings() {
  return withMockFallback(async () => {
    const data = await fetchFromFootballApi(`/standings?league=${PREMIER_LEAGUE_ID}&season=${CURRENT_SEASON}`)
    const standings = data.response?.[0]?.league?.standings?.[0] || []

    return standings.map((team) => ({
      rank: team.rank,
      team: {
        id: String(team.team.id),
        name: translateTeamName(team.team.name),
        nameEn: team.team.name,
        logo: team.team.logo
      },
      points: team.points,
      goalsDiff: team.goalsDiff,
      form: team.form,
      all: {
        played: team.all.played,
        win: team.all.win,
        draw: team.all.draw,
        lose: team.all.lose,
        goals: {
          for: team.all.goals.for,
          against: team.all.goals.against
        }
      }
    }))
  }, getMockStandings)
}

async function getTeams() {
  return withMockFallback(async () => {
    const data = await fetchFromFootballApi(`/teams?league=${PREMIER_LEAGUE_ID}&season=${CURRENT_SEASON}`)

    return (data.response || []).map((item) => ({
      id: String(item.team.id),
      name: translateTeamName(item.team.name),
      nameEn: item.team.name,
      logo: item.team.logo,
      venue: item.venue
        ? {
            id: String(item.venue.id || ""),
            name: item.venue.name,
            city: item.venue.city,
            capacity: item.venue.capacity,
            image: item.venue.image
          }
        : null
    }))
  }, getMockTeams)
}

function mapStatusToStateId(status) {
  const statusMap = {
    TBD: 21,
    NS: 1,
    "1H": 13,
    HT: 14,
    "2H": 15,
    ET: 16,
    BT: 17,
    P: 18,
    SUSP: 11,
    INT: 12,
    FT: 3,
    AET: 4,
    PEN: 5,
    PST: 6,
    CANC: 7,
    ABD: 8,
    AWD: 9,
    WO: 10,
    LIVE: 2
  }

  return statusMap[status] || 1
}

async function getFixtures({ type = "all", round, limit } = {}) {
  return withMockFallback(async () => {
    let endpoint = `/fixtures?league=${PREMIER_LEAGUE_ID}&season=${CURRENT_SEASON}`
    if (round) endpoint += `&round=${encodeURIComponent(`Regular Season - ${round}`)}`

    const data = await fetchFromFootballApi(endpoint)
    let fixtures = (data.response || []).map((fixture) => {
      const stateId = mapStatusToStateId(fixture.fixture.status.short)
      const statusInfo = translateStatus(stateId, fixture.fixture.status.long)
      const isFinished = [3, 4, 5, 9, 10].includes(stateId)
      const isLive = [2, 13, 14, 15, 16, 17, 18].includes(stateId)
      const isUpcoming = [1, 6, 21].includes(stateId)
      const roundName = fixture.league.round || ""
      const roundNumberMatch = roundName.match(/(\d+)/)
      const roundNumber = roundNumberMatch ? Number(roundNumberMatch[1]) : null

      return {
        id: String(fixture.fixture.id),
        date: fixture.fixture.date,
        dateThai: formatDateThai(fixture.fixture.date),
        roundNumber,
        status: {
          short: statusInfo.short,
          long: statusInfo.long,
          elapsed: fixture.fixture.status.elapsed,
          isLive,
          isFinished,
          isUpcoming
        },
        teams: {
          home: {
            id: String(fixture.teams.home.id),
            name: translateTeamName(fixture.teams.home.name),
            nameEn: fixture.teams.home.name,
            logo: fixture.teams.home.logo,
            winner: fixture.teams.home.winner
          },
          away: {
            id: String(fixture.teams.away.id),
            name: translateTeamName(fixture.teams.away.name),
            nameEn: fixture.teams.away.name,
            logo: fixture.teams.away.logo,
            winner: fixture.teams.away.winner
          }
        },
        goals: {
          home: fixture.goals.home,
          away: fixture.goals.away
        },
        league: {
          id: String(fixture.league.id),
          name: "พรีเมียร์ลีก",
          round: roundNumber ? `นัดที่ ${roundNumber}` : roundName
        },
        venue: {
          name: fixture.fixture.venue?.name || "",
          city: fixture.fixture.venue?.city || ""
        }
      }
    })

    if (type === "upcoming") fixtures = fixtures.filter((item) => item.status.isUpcoming || item.status.isLive)
    if (type === "live") fixtures = fixtures.filter((item) => item.status.isLive)
    if (type === "finished") fixtures = fixtures.filter((item) => item.status.isFinished)

    fixtures.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    if (limit) fixtures = fixtures.slice(0, Number(limit))
    return fixtures
  }, () => getMockFixtures({ type, round, limit }))
}

async function getTopScorers() {
  return withMockFallback(async () => {
    const data = await fetchFromFootballApi(`/players/topscorers?league=${PREMIER_LEAGUE_ID}&season=${CURRENT_SEASON}`)
    return (data.response || []).map((item, index) => ({
      rank: index + 1,
      id: String(item.player.id),
      name: item.player.name,
      photo: item.player.photo,
      nationality: item.player.nationality,
      goals: item.statistics?.[0]?.goals?.total || 0,
      teamName: item.statistics?.[0]?.team?.name || "",
      teamNameThai: translateTeamName(item.statistics?.[0]?.team?.name || ""),
      teamLogo: item.statistics?.[0]?.team?.logo || ""
    }))
  }, getMockTopScorers)
}

async function getTopAssists() {
  return withMockFallback(async () => {
    const data = await fetchFromFootballApi(`/players/topassists?league=${PREMIER_LEAGUE_ID}&season=${CURRENT_SEASON}`)
    return (data.response || []).map((item, index) => ({
      rank: index + 1,
      id: String(item.player.id),
      name: item.player.name,
      photo: item.player.photo,
      nationality: item.player.nationality,
      assists: item.statistics?.[0]?.goals?.assists || 0,
      teamName: item.statistics?.[0]?.team?.name || "",
      teamNameThai: translateTeamName(item.statistics?.[0]?.team?.name || ""),
      teamLogo: item.statistics?.[0]?.team?.logo || ""
    }))
  }, getMockTopAssists)
}

async function getPlayerStatsSummary() {
  return withMockFallback(async () => {
    const [scorers, assists] = await Promise.all([
      fetchFromFootballApi(`/players/topscorers?league=${PREMIER_LEAGUE_ID}&season=${CURRENT_SEASON}`),
      fetchFromFootballApi(`/players/topassists?league=${PREMIER_LEAGUE_ID}&season=${CURRENT_SEASON}`)
    ])

    const merged = new Map()
    ;[...(scorers.response || []), ...(assists.response || [])].forEach((item) => {
      const id = String(item.player?.id || "")
      if (id && !merged.has(id)) merged.set(id, item)
    })

    const list = Array.from(merged.values())
    const extractPlayers = (items, extractor) =>
      items
        .map((item) => {
          const stat = item.statistics?.[0]
          if (!stat) return null
          const value = extractor(stat)
          if (!value || value <= 0) return null
          return {
            id: String(item.player.id),
            name: item.player.name,
            photo: item.player.photo,
            team: translateTeamName(stat.team?.name || ""),
            teamLogo: stat.team?.logo || "",
            value
          }
        })
        .filter(Boolean)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)

    return {
      goals: extractPlayers(scorers.response || [], (stat) => stat.goals?.total || 0),
      assists: extractPlayers(assists.response || [], (stat) => stat.goals?.assists || 0),
      shots: extractPlayers(list, (stat) => stat.shots?.total || 0),
      yellowCards: extractPlayers(list, (stat) => stat.cards?.yellow || 0),
      penalties: extractPlayers(list, (stat) => stat.penalty?.scored || 0),
      appearances: extractPlayers(list, (stat) => stat.games?.appearences || 0)
    }
  }, getMockPlayerStatsSummary)
}

async function getCleanSheets() {
  return withMockFallback(async () => {
    const standings = await fetchFromFootballApi(`/standings?league=${PREMIER_LEAGUE_ID}&season=${CURRENT_SEASON}`)
    const teams = standings.response?.[0]?.league?.standings?.[0] || []

    const results = await Promise.all(
      teams.slice(0, 10).map(async (team) => {
        try {
          const stats = await fetchFromFootballApi(
            `/teams/statistics?league=${PREMIER_LEAGUE_ID}&season=${CURRENT_SEASON}&team=${team.team.id}`
          )

          return {
            teamId: String(team.team.id),
            teamName: translateTeamName(team.team.name),
            teamLogo: team.team.logo,
            cleanSheets: stats.response?.clean_sheet?.total || 0
          }
        } catch (error) {
          return {
            teamId: String(team.team.id),
            teamName: translateTeamName(team.team.name),
            teamLogo: team.team.logo,
            cleanSheets: 0
          }
        }
      })
    )

    return results.sort((a, b) => b.cleanSheets - a.cleanSheets)
  }, getMockCleanSheets)
}

async function getPlayerDetails(playerId) {
  return withMockFallback(async () => {
    const [playerData, transferData] = await Promise.all([
      fetchFromFootballApi(`/players?id=${playerId}&season=${CURRENT_SEASON}`),
      fetchFromFootballApi(`/transfers?player=${playerId}`)
    ])

    const player = playerData.response?.[0]
    if (!player) {
      throw new ApiError(404, "Player not found")
    }

    return {
      data: {
        id: String(player.player.id),
        name: player.player.name,
        firstname: player.player.firstname,
        lastname: player.player.lastname,
        image_path: player.player.photo,
        nationality: player.player.nationality,
        height: player.player.height,
        weight: player.player.weight,
        age: player.player.age,
        birth: player.player.birth,
        position: player.statistics?.[0]?.games?.position || "",
        teams: (player.statistics || []).map((stat) => ({
          id: String(stat.team.id),
          name: translateTeamName(stat.team.name),
          nameEn: stat.team.name,
          logo: stat.team.logo
        })),
        statistics: player.statistics?.[0] || {},
        transfers: (transferData.response || []).map((item) => ({
          date: item.date,
          type: item.type,
          fromTeam: {
            id: String(item.teams.out.id),
            name: translateTeamName(item.teams.out.name),
            logo: item.teams.out.logo
          },
          toTeam: {
            id: String(item.teams.in.id),
            name: translateTeamName(item.teams.in.name),
            logo: item.teams.in.logo
          }
        }))
      },
      source: "api-football"
    }
  }, () => {
    const mockData = getMockPlayerDetails(playerId)
    if (!mockData) {
      throw new ApiError(404, "Player not found")
    }
    return mockData
  })
}

async function getFixturePrediction(fixtureId) {
  return withMockFallback(async () => {
    const data = await fetchFromFootballApi(`/predictions?fixture=${fixtureId}`)
    return data.response?.[0] || null
  }, () => getMockFixturePrediction(fixtureId))
}

async function getFixtureLineups(fixtureId) {
  return withMockFallback(async () => {
    const data = await fetchFromFootballApi(`/fixtures/lineups?fixture=${fixtureId}`)
    return data.response || []
  }, () => getMockLineups(fixtureId))
}

async function getFixtureEvents(fixtureId) {
  return withMockFallback(async () => {
    const data = await fetchFromFootballApi(`/fixtures/events?fixture=${fixtureId}`)
    return data.response || []
  }, () => getMockEvents(fixtureId))
}

async function getInjuries() {
  return withMockFallback(async () => {
    const data = await fetchFromFootballApi(`/injuries?league=${PREMIER_LEAGUE_ID}&season=${CURRENT_SEASON}`)
    return data.response || []
  }, getMockInjuries)
}

async function getSuspensions() {
  return getMockSuspensions()
}

async function getTransfers() {
  return withMockFallback(async () => {
    const data = await fetchFromFootballApi(`/transfers?league=${PREMIER_LEAGUE_ID}&season=${CURRENT_SEASON}`)
    return data.response || []
  }, getMockTransfers)
}

module.exports = {
  getCleanSheets,
  getFixtureEvents,
  getFixtureLineups,
  getFixturePrediction,
  getFixtures,
  getInjuries,
  getPlayerDetails,
  getPlayerStatsSummary,
  getStandings,
  getSuspensions,
  getTeams,
  getTopAssists,
  getTopScorers,
  getTransfers
}
