const mongoose = require("mongoose")

const communityReportSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommunityPost",
      required: true,
      index: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: ["spam", "abuse", "hate", "off-topic", "other"],
      required: true,
    },
    description: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["pending", "resolved", "dismissed"],
      default: "pending",
      index: true,
    },
    resolutionNote: {
      type: String,
      default: "",
      maxlength: 1000,
    },
  },
  { timestamps: true },
)

communityReportSchema.index({ post: 1, reporter: 1 }, { unique: true })

module.exports = mongoose.model("CommunityReport", communityReportSchema)
