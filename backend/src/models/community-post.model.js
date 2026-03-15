const mongoose = require("../../../node_modules/mongoose")

const communityPostSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    category: {
      type: String,
      enum: ["match-discussion", "transfer-rumors", "player-discussion", "predictions", "general"],
      default: "general",
      index: true,
    },
    status: {
      type: String,
      enum: ["published", "flagged", "hidden"],
      default: "published",
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    reportsCount: {
      type: Number,
      default: 0,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model("CommunityPost", communityPostSchema)
