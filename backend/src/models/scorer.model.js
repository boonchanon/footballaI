const mongoose = require("mongoose")

const scorerSchema = new mongoose.Schema(
  {
    competitionId: { type: Number, required: true, index: true },
    playerId: { type: Number, required: true },
    teamId: { type: Number, required: true },
    goals: { type: Number, default: 0 },
    assists: { type: Number, default: 0 },
    position: { type: Number, default: null },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

scorerSchema.index({ competitionId: 1, playerId: 1 }, { unique: true })

module.exports = mongoose.model("Scorer", scorerSchema)
