const mongoose = require("../../../node_modules/mongoose")

const predictionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    homeTeam: { type: String, required: true },
    awayTeam: { type: String, required: true },
    model: { type: String, default: "gpt-5" },
    fixtureId: { type: String, default: "" },
    homeWinProbability: Number,
    drawProbability: Number,
    awayWinProbability: Number,
    predictedScore: {
      home: Number,
      away: Number
    },
    confidence: Number,
    analysis: String,
    keyFactors: { type: [String], default: [] }
  },
  { timestamps: true }
)

module.exports = mongoose.model("Prediction", predictionSchema)
