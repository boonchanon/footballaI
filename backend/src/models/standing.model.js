const mongoose = require("mongoose")

const standingSchema = new mongoose.Schema(
  {
    competitionId: { type: Number, required: true, index: true },
    teamId: { type: Number, required: true },
    position: { type: Number, required: true },
    playedGames: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    goalsFor: { type: Number, default: 0 },
    goalsAgainst: { type: Number, default: 0 },
    goalDifference: { type: Number, default: 0 },
    form: { type: String, default: "" },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

standingSchema.index({ competitionId: 1, teamId: 1 }, { unique: true })

module.exports = mongoose.model("Standing", standingSchema)
