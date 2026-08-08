const mongoose = require("mongoose")

const matchSchema = new mongoose.Schema(
  {
    _id: { type: Number, required: true },
    utcDate: { type: Date, required: true },
    status: { type: String, default: "" },
    matchday: { type: Number, default: null },
    stage: { type: String, default: "" },
    group: { type: String, default: "" },
    lastUpdated: { type: Date, default: null },
    homeTeamId: { type: Number, required: true },
    awayTeamId: { type: Number, required: true },
    competitionId: { type: Number, required: true },
    homeScore: { type: Number, default: null },
    awayScore: { type: Number, default: null },
  },
  { timestamps: true, _id: false }
)

module.exports = mongoose.model("Match", matchSchema)
