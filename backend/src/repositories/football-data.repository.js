const Competition = require("../models/competition.model")
const Team = require("../models/team.model")
const Player = require("../models/player.model")
const Match = require("../models/match.model")
const Standing = require("../models/standing.model")
const Scorer = require("../models/scorer.model")

async function upsertCompetition(competition) {
  return Competition.findOneAndUpdate(
    { _id: competition.id },
    {
      name: competition.name,
      code: competition.code || "",
      areaName: competition.areaName || "",
      areaCountry: competition.areaCountry || "",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
}

async function upsertCompetitions(competitions) {
  return Promise.all(competitions.map((competition) => upsertCompetition(competition)))
}

async function upsertTeams(teams) {
  return Promise.all(
    teams.map((team) =>
      Team.findOneAndUpdate(
        { _id: team.id },
        {
          name: team.name,
          shortName: team.shortName || "",
          tla: team.tla || "",
          crestUrl: team.crestUrl || "",
          founded: team.founded || null,
          venue: team.venue || "",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    )
  )
}

async function upsertPlayers(players) {
  return Promise.all(
    players.map((player) =>
      Player.findOneAndUpdate(
        { _id: player.id },
        {
          name: player.name,
          position: player.position || "",
          nationality: player.nationality || "",
          dateOfBirth: player.dateOfBirth || null,
          countryOfBirth: player.countryOfBirth || "",
          teamId: player.teamId || null,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    )
  )
}

async function upsertMatches(matches) {
  return Promise.all(
    matches.map((match) =>
      Match.findOneAndUpdate(
        { _id: match.id },
        {
          utcDate: match.utcDate,
          status: match.status || "",
          matchday: match.matchday || null,
          stage: match.stage || "",
          group: match.group || "",
          lastUpdated: match.lastUpdated || new Date(),
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          competitionId: match.competitionId,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    )
  )
}

async function replaceStandings(competitionId, standings) {
  await Standing.deleteMany({ competitionId })
  if (!standings || standings.length === 0) return []
  return Standing.insertMany(
    standings.map((row) => ({
      competitionId,
      teamId: row.teamId,
      position: row.position,
      playedGames: row.playedGames,
      points: row.points,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      goalDifference: row.goalDifference,
      form: row.form || "",
      lastUpdated: new Date(),
    })),
    { ordered: false }
  )
}

async function replaceScorers(competitionId, scorers) {
  await Scorer.deleteMany({ competitionId })
  if (!scorers || scorers.length === 0) return []
  return Scorer.insertMany(
    scorers.map((scorer) => ({
      competitionId,
      playerId: scorer.playerId,
      teamId: scorer.teamId,
      goals: scorer.goals,
      assists: scorer.assists || 0,
      position: scorer.position || null,
      lastUpdated: new Date(),
    })),
    { ordered: false }
  )
}

async function getMatchesByDate(date) {
  const start = new Date(`${date}T00:00:00.000Z`)
  const end = new Date(`${date}T23:59:59.999Z`)
  return Match.find({
    utcDate: { $gte: start, $lte: end },
  })
    .sort({ utcDate: 1 })
    .lean()
}

async function getLiveMatches() {
  return Match.find({ status: { $in: ["LIVE", "IN_PLAY", "PAUSED"] } })
    .sort({ utcDate: 1 })
    .lean()
}

async function getMatchById(id) {
  return Match.findById(Number(id)).lean()
}

async function getStandingsByCompetition(competitionId) {
  return Standing.find({ competitionId: Number(competitionId) })
    .sort({ position: 1 })
    .lean()
}

async function getTeamById(id) {
  return Team.findById(Number(id)).lean()
}

async function getPlayerById(id) {
  return Player.findById(Number(id)).lean()
}

async function getScorersByCompetition(competitionId) {
  return Scorer.find({ competitionId: Number(competitionId) })
    .sort({ goals: -1 })
    .lean()
}

module.exports = {
  upsertCompetition,
  upsertCompetitions,
  upsertTeams,
  upsertPlayers,
  upsertMatches,
  replaceStandings,
  replaceScorers,
  getMatchesByDate,
  getLiveMatches,
  getMatchById,
  getStandingsByCompetition,
  getTeamById,
  getPlayerById,
  getScorersByCompetition,
}
