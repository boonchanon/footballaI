const mongoose = require("mongoose")

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetType: { type: String, enum: ["match", "team", "player", "article", "prediction", "post"], required: true },
    targetId: { type: String, required: true, index: true },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    isApproved: { type: Boolean, default: true },
    likesCount: { type: Number, default: 0 }
  },
  { timestamps: true }
)

module.exports = mongoose.model("Comment", commentSchema)
