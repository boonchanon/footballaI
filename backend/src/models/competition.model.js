const mongoose = require("mongoose")

const competitionSchema = new mongoose.Schema(
  {
    _id: { type: Number, required: true },
    name: { type: String, required: true },
    code: { type: String, default: "" },
    areaName: { type: String, default: "" },
    areaCountry: { type: String, default: "" },
  },
  { timestamps: true, _id: false }
)

module.exports = mongoose.model("Competition", competitionSchema)
