const prisma = require("../prisma/client")

function buildCacheKey(endpoint, params = {}) {
  const sortedEntries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))

  return `${endpoint}:${JSON.stringify(Object.fromEntries(sortedEntries))}`
}

async function getApiCache(endpoint, params = {}) {
  const cacheKey = buildCacheKey(endpoint, params)
  return prisma.apiCache.findUnique({ where: { cacheKey } })
}

async function upsertApiCache({ endpoint, params = {}, externalId = null, payload, source = "AllSportsAPI", expiresAt }) {
  const cacheKey = buildCacheKey(endpoint, params)

  return prisma.apiCache.upsert({
    where: { cacheKey },
    update: {
      externalId,
      payload,
      source,
      fetchedAt: new Date(),
      expiresAt,
    },
    create: {
      cacheKey,
      endpoint,
      externalId,
      payload,
      source,
      fetchedAt: new Date(),
      expiresAt,
    },
  })
}

async function listLeagues() {
  return prisma.league.findMany({ orderBy: { name: "asc" } })
}

async function listFixtures({ leagueId, teamId, matchId, from, to }) {
  const where = {}
  if (leagueId) where.leagueId = Number(leagueId)
  if (matchId) where.id = Number(matchId)
  if (teamId) {
    where.OR = [{ homeTeamId: Number(teamId) }, { awayTeamId: Number(teamId) }]
  }
  if (from || to) {
    where.date = {}
    if (from) where.date.gte = new Date(from)
    if (to) where.date.lte = new Date(to)
  }

  return prisma.fixture.findMany({
    where,
    orderBy: [{ date: "asc" }, { time: "asc" }],
    include: {
      league: true,
      homeTeam: true,
      awayTeam: true,
    },
  })
}

async function findLiveFixtures(leagueId) {
  return prisma.fixture.findMany({
    where: {
      leagueId: Number(leagueId),
      status: { in: ["LIVE", "1H", "2H", "HT"] },
    },
    orderBy: [{ date: "asc" }, { time: "asc" }],
    include: {
      league: true,
      homeTeam: true,
      awayTeam: true,
    },
  })
}

async function listStandings(leagueId) {
  return prisma.standing.findMany({
    where: { leagueId: Number(leagueId) },
    orderBy: { rank: "asc" },
    include: { team: true, league: true },
  })
}

async function listTeamsByLeague(leagueId) {
  return prisma.team.findMany({
    where: { leagueId: Number(leagueId) },
    orderBy: { name: "asc" },
  })
}

async function getTeamById(id) {
  return prisma.team.findUnique({ where: { id: Number(id) } })
}

async function listTopScorers(leagueId) {
  return prisma.topScorer.findMany({
    where: { leagueId: Number(leagueId) },
    orderBy: [{ rank: "asc" }, { goals: "desc" }],
    include: { player: true, team: true },
  })
}

async function getMatchById(id) {
  return prisma.match.findUnique({
    where: { id: Number(id) },
    include: {
      league: true,
      homeTeam: true,
      awayTeam: true,
    },
  })
}

async function listMatchEvents(matchId) {
  return prisma.matchEvent.findMany({
    where: { matchId: Number(matchId) },
    orderBy: [{ minute: "asc" }, { id: "asc" }],
  })
}

async function listMatchLineups(matchId) {
  return prisma.lineup.findMany({
    where: { matchId: Number(matchId) },
    orderBy: [{ teamId: "asc" }, { isStarting: "desc" }, { number: "asc" }],
  })
}

async function listTeamFixtures({ teamId, from, to, status }) {
  const where = {
    OR: [{ homeTeamId: Number(teamId) }, { awayTeamId: Number(teamId) }],
  }
  if (status) where.status = status
  if (from || to) {
    where.date = {}
    if (from) where.date.gte = new Date(from)
    if (to) where.date.lte = new Date(to)
  }

  return prisma.fixture.findMany({
    where,
    orderBy: [{ date: "asc" }, { time: "asc" }],
    include: {
      league: true,
      homeTeam: true,
      awayTeam: true,
    },
  })
}

async function listTeamPlayers(teamId) {
  return prisma.player.findMany({
    where: { teamId: Number(teamId) },
    orderBy: { name: "asc" },
  })
}

async function getPlayerById(playerId) {
  return prisma.player.findUnique({ where: { id: Number(playerId) } })
}

async function upsertLeague(league) {
  return prisma.league.upsert({
    where: { id: league.id },
    update: league,
    create: league,
  })
}

async function upsertTeam(team) {
  return prisma.team.upsert({
    where: { id: team.id },
    update: team,
    create: team,
  })
}

async function upsertPlayer(player) {
  return prisma.player.upsert({
    where: { id: player.id },
    update: player,
    create: player,
  })
}

async function upsertFixture(fixture) {
  return prisma.fixture.upsert({
    where: { id: fixture.id },
    update: fixture,
    create: fixture,
  })
}

async function upsertMatch(match) {
  return prisma.match.upsert({
    where: { id: match.id },
    update: match,
    create: match,
  })
}

async function replaceStandings(leagueId, standings) {
  await prisma.$transaction([
    prisma.standing.deleteMany({ where: { leagueId: Number(leagueId) } }),
    ...standings.map((standing) => prisma.standing.create({ data: standing })),
  ])
}

async function replaceTopScorers(leagueId, scorers) {
  await prisma.$transaction([
    prisma.topScorer.deleteMany({ where: { leagueId: Number(leagueId) } }),
    ...scorers.map((scorer) => prisma.topScorer.create({ data: scorer })),
  ])
}

async function replaceMatchEvents(matchId, events) {
  await prisma.$transaction([
    prisma.matchEvent.deleteMany({ where: { matchId: Number(matchId) } }),
    ...events.map((event) => prisma.matchEvent.create({ data: event })),
  ])
}

async function replaceMatchLineups(matchId, lineups) {
  await prisma.$transaction([
    prisma.lineup.deleteMany({ where: { matchId: Number(matchId) } }),
    ...lineups.map((lineup) => prisma.lineup.create({ data: lineup })),
  ])
}

module.exports = {
  getApiCache,
  upsertApiCache,
  listLeagues,
  listFixtures,
  findLiveFixtures,
  listStandings,
  listTeamsByLeague,
  getTeamById,
  listTopScorers,
  getMatchById,
  listMatchEvents,
  listMatchLineups,
  listTeamFixtures,
  listTeamPlayers,
  getPlayerById,
  upsertLeague,
  upsertTeam,
  upsertPlayer,
  upsertFixture,
  upsertMatch,
  replaceStandings,
  replaceTopScorers,
  replaceMatchEvents,
  replaceMatchLineups,
}
