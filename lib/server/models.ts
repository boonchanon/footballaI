import bcrypt from "bcryptjs"
import mongoose from "mongoose"

const { Schema, models, model } = mongoose

const userSchema =
  models.User?.schema ||
  new Schema(
    {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      password: { type: String, required: true, minlength: 6 },
      avatar: { type: String, default: "" },
      favoriteTeam: { type: String, default: "" },
      role: { type: String, enum: ["user", "admin"], default: "user" },
      bio: { type: String, default: "", maxlength: 280 },
      googleId: { type: String, default: "" },
      githubId: { type: String, default: "" },
      resetPasswordOtpHash: { type: String, default: "" },
      resetPasswordOtpExpiresAt: { type: Date, default: null },
      resetPasswordOtpAttempts: { type: Number, default: 0 },
      resetPasswordToken: { type: String, default: "" },
      resetPasswordExpiresAt: { type: Date, default: null },
    },
    { timestamps: true },
  )

if (!models.User) {
  userSchema.pre("save", async function hashPassword(next) {
    if (!this.isModified("password")) return next()
    this.password = await bcrypt.hash(this.password, 10)
    next()
  })

  userSchema.methods.comparePassword = function comparePassword(candidatePassword: string) {
    return bcrypt.compare(candidatePassword, this.password)
  }
}

const favoriteSchema =
  models.Favorite?.schema ||
  new Schema(
    {
      user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
      itemType: { type: String, enum: ["team", "player", "match", "article", "post"], required: true },
      itemId: { type: String, required: true, trim: true },
      title: { type: String, required: true, trim: true },
      subtitle: { type: String, default: "" },
      image: { type: String, default: "" },
      meta: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true },
  )

if (!models.Favorite) {
  favoriteSchema.index({ user: 1, itemType: 1, itemId: 1 }, { unique: true })
}

const commentSchema =
  models.Comment?.schema ||
  new Schema(
    {
      user: { type: Schema.Types.ObjectId, ref: "User", required: true },
      targetType: { type: String, enum: ["match", "team", "player", "article", "prediction", "post"], required: true },
      targetId: { type: String, required: true, index: true },
      content: { type: String, required: true, trim: true, maxlength: 1000 },
      isApproved: { type: Boolean, default: true },
      likesCount: { type: Number, default: 0 },
    },
    { timestamps: true },
  )

const communityPostSchema =
  models.CommunityPost?.schema ||
  new Schema(
    {
      author: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
      title: { type: String, required: true, trim: true, maxlength: 180 },
      content: { type: String, required: true, trim: true, maxlength: 5000 },
      category: {
        type: String,
        enum: ["match-discussion", "transfer-rumors", "player-discussion", "predictions", "general"],
        default: "general",
        index: true,
      },
      status: { type: String, enum: ["published", "flagged", "hidden"], default: "published", index: true },
      isPinned: { type: Boolean, default: false },
      likesCount: { type: Number, default: 0 },
      commentsCount: { type: Number, default: 0 },
      viewsCount: { type: Number, default: 0 },
      reportsCount: { type: Number, default: 0 },
      tags: { type: [String], default: [] },
    },
    { timestamps: true },
  )

const communityReportSchema =
  models.CommunityReport?.schema ||
  new Schema(
    {
      post: { type: Schema.Types.ObjectId, ref: "CommunityPost", required: true, index: true },
      reporter: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
      reason: { type: String, enum: ["spam", "abuse", "hate", "off-topic", "other"], required: true },
      description: { type: String, default: "", maxlength: 1000 },
      status: { type: String, enum: ["pending", "resolved", "dismissed"], default: "pending", index: true },
      resolutionNote: { type: String, default: "", maxlength: 1000 },
    },
    { timestamps: true },
  )

if (!models.CommunityReport) {
  communityReportSchema.index({ post: 1, reporter: 1 }, { unique: true })
}

const postLikeSchema =
  models.PostLike?.schema ||
  new Schema(
    {
      post: { type: Schema.Types.ObjectId, ref: "CommunityPost", required: true, index: true },
      user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    },
    { timestamps: true },
  )

if (!models.PostLike) {
  postLikeSchema.index({ post: 1, user: 1 }, { unique: true })
}

const predictionSchema =
  models.Prediction?.schema ||
  new Schema(
    {
      user: { type: Schema.Types.ObjectId, ref: "User", default: null },
      homeTeam: { type: String, required: true },
      awayTeam: { type: String, required: true },
      model: { type: String, default: "gpt-5" },
      fixtureId: { type: String, default: "" },
      homeWinProbability: Number,
      drawProbability: Number,
      awayWinProbability: Number,
      predictedScore: {
        home: Number,
        away: Number,
      },
      confidence: Number,
      analysis: String,
      keyFactors: { type: [String], default: [] },
    },
    { timestamps: true },
  )

export const User = models.User || model("User", userSchema)
export const Favorite = models.Favorite || model("Favorite", favoriteSchema)
export const Comment = models.Comment || model("Comment", commentSchema)
export const CommunityPost = models.CommunityPost || model("CommunityPost", communityPostSchema)
export const CommunityReport = models.CommunityReport || model("CommunityReport", communityReportSchema)
export const PostLike = models.PostLike || model("PostLike", postLikeSchema)
export const Prediction = models.Prediction || model("Prediction", predictionSchema)
