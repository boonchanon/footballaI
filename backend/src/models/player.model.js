const mongoose = require("mongoose")

const playerSchema = new mongoose.Schema(
  {
    _id: { type: Number, required: true },
    name: { type: String, required: true },
    position: { type: String, default: "" },
    nationality: { type: String, default: "" },
    dateOfBirth: { type: Date, default: null },
    countryOfBirth: { type: String, default: "" },
    teamId: { type: Number, default: null },
  },
  { timestamps: true, _id: false }
)

module.exports = mongoose.model("Player", playerSchema)
