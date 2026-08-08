const Team = require("../models/team.model")
const Player = require("../models/player.model")
const Match = require("../models/match.model")

const searchTeams = async (q) => {
  return Team.find({ name: { $regex: q, $options: "i" } }).limit(20)
}

const searchPlayers = async (q) => {
  return Player.find({ name: { $regex: q, $options: "i" } }).limit(20)
}

const searchMatches = async (q) => {
  return Match.find({
    $or: [
      { homeTeamName: { $regex: q, $options: "i" } },
      { awayTeamName: { $regex: q, $options: "i" } },
    ],
  }).limit(20)
}

module.exports = { searchTeams, searchPlayers, searchMatches }
