const mongoose = require("mongoose")

const favoriteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    itemType: { type: String, enum: ["team", "player", "match", "article"], required: true },
    itemId: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: "" },
    image: { type: String, default: "" },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
)

favoriteSchema.index({ user: 1, itemType: 1, itemId: 1 }, { unique: true })

module.exports = mongoose.model("Favorite", favoriteSchema)
