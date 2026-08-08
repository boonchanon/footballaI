const mongoose = require("mongoose")

const teamSchema = new mongoose.Schema(
  {
    _id: { type: Number, required: true },
    name: { type: String, required: true },
    shortName: { type: String, default: "" },
    tla: { type: String, default: "" },
    crestUrl: { type: String, default: "" },
    founded: { type: Number, default: null },
    venue: { type: String, default: "" },
  },
  { timestamps: true, _id: false }
)

module.exports = mongoose.model("Team", teamSchema)
