import bcrypt from "bcryptjs"
import mongoose from "mongoose"

const { Schema, models, model } = mongoose
const adminRoleEnum = ["superadmin", "admin", "admincommunity"] as const

const userSchema =
  models.User?.schema ||
  new Schema(
    {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      password: { type: String, required: true, minlength: 6 },
      avatar: { type: String, default: "" },
      coverImage: { type: String, default: "" },
      coverPositionX: { type: Number, default: 0 },
      coverPositionY: { type: Number, default: 0 },
      coverScale: { type: Number, default: 1 },
      phone: { type: String, unique: true, sparse: true, trim: true },
      favoriteTeam: { type: String, default: "" },
      role: { type: String, enum: ["user", "admin"], default: "user" },
      bio: { type: String, default: "", maxlength: 280 },
      googleId: { type: String, default: "" },
      facebookId: { type: String, default: "" },
      phoneOtpHash: { type: String, default: "" },
      phoneOtpExpiresAt: { type: Date, default: null },
      phoneOtpAttempts: { type: Number, default: 0 },
      phoneVerifiedAt: { type: Date, default: null },
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

if (models.User && !models.User.schema.path("coverImage")) {
  models.User.schema.add({
    coverImage: { type: String, default: "" },
  })
}

if (models.User && !models.User.schema.path("coverPositionX")) {
  models.User.schema.add({
    coverPositionX: { type: Number, default: 0 },
    coverPositionY: { type: Number, default: 0 },
    coverScale: { type: Number, default: 1 },
  })
}

const adminSchema =
  models.Admin?.schema ||
  new Schema(
    {
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      password: { type: String, required: true },
      role: { type: String, enum: adminRoleEnum, default: "admin" },
      permissions: { type: [String], default: [] },
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true, collection: "admins" },
  )

if (!models.Admin) {
  adminSchema.methods.comparePassword = function comparePassword(candidatePassword: string) {
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
      repostsCount: { type: Number, default: 0 },
      commentsCount: { type: Number, default: 0 },
      viewsCount: { type: Number, default: 0 },
      reportsCount: { type: Number, default: 0 },
      tags: { type: [String], default: [] },
      images: { type: [String], default: [] },
      videos: { type: [String], default: [] },
      visibility: { type: String, enum: ["public", "friends"], default: "public", index: true },
      poll: {
        question: { type: String, default: "", trim: true, maxlength: 180 },
        options: {
          type: [
            new Schema(
              {
                id: { type: String, required: true, trim: true },
                text: { type: String, required: true, trim: true, maxlength: 120 },
                votes: { type: Number, default: 0 },
              },
              { _id: false },
            ),
          ],
          default: [],
        },
        totalVotes: { type: Number, default: 0 },
      },
      sharedItem: {
        type: {
          type: String,
          enum: ["article", "post"],
          default: null,
        },
        title: { type: String, default: "" },
        description: { type: String, default: "" },
        url: { type: String, default: "" },
        image: { type: String, default: "" },
        source: { type: String, default: "" },
        postId: { type: String, default: "" },
      },
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

const friendRequestSchema =
  models.FriendRequest?.schema ||
  new Schema(
    {
      requester: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
      recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
      status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending", index: true },
    },
    { timestamps: true },
  )

if (!models.FriendRequest) {
  friendRequestSchema.index({ requester: 1, recipient: 1 }, { unique: true })
}

const friendshipSchema =
  models.Friendship?.schema ||
  new Schema(
    {
      users: {
        type: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
        validate: [(value: unknown[]) => Array.isArray(value) && value.length === 2, "Friendship requires two users"],
      },
    },
    { timestamps: true },
  )

if (!models.Friendship) {
  friendshipSchema.index({ users: 1 }, { unique: true })
}

const conversationSchema =
  models.Conversation?.schema ||
  new Schema(
    {
      members: {
        type: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
        validate: [(value: unknown[]) => Array.isArray(value) && value.length >= 2, "Conversation requires at least two members"],
        index: true,
      },
      lastMessageText: { type: String, default: "" },
      lastMessageAt: { type: Date, default: null, index: true },
    },
    { timestamps: true },
  )

const directMessageSchema =
  models.DirectMessage?.schema ||
  new Schema(
    {
      conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
      sender: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
      content: { type: String, default: "", trim: true, maxlength: 2000 },
      images: { type: [String], default: [] },
      sharedItem: {
        type: {
          type: String,
          enum: ["article", "post"],
          default: null,
        },
        title: { type: String, default: "" },
        url: { type: String, default: "" },
        image: { type: String, default: "" },
        source: { type: String, default: "" },
        postId: { type: String, default: "" },
      },
      readBy: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [] },
    },
    { timestamps: true },
  )

const communityStorySchema =
  models.CommunityStory?.schema ||
  new Schema(
    {
      author: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
      image: { type: String, required: true, trim: true },
      caption: { type: String, default: "", trim: true, maxlength: 180 },
      style: {
        theme: { type: String, enum: ["neon", "midnight", "sunset", "glass"], default: "neon" },
        captionAlign: { type: String, enum: ["top", "center", "bottom"], default: "bottom" },
        captionSize: { type: String, enum: ["sm", "md", "lg"], default: "md" },
        sticker: { type: String, enum: ["", "Matchday", "Breaking", "Hot Take", "Fan Cam"], default: "" },
      },
      expiresAt: { type: Date, required: true, index: true },
      viewsCount: { type: Number, default: 0 },
      viewedBy: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [] },
    },
    { timestamps: true },
  )

const communityUploadAssetSchema =
  models.CommunityUploadAsset?.schema ||
  new Schema(
    {
      owner: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
      filename: { type: String, required: true, trim: true },
      mimeType: { type: String, required: true, trim: true, index: true },
      size: { type: Number, required: true, min: 1 },
      kind: { type: String, enum: ["image", "video"], required: true, index: true },
      data: { type: Buffer, required: true },
    },
    { timestamps: true },
  )

const communityNotificationSchema =
  models.CommunityNotification?.schema ||
  new Schema(
    {
      recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
      actor: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
      type: { type: String, enum: ["post_like", "post_comment", "post_repost"], required: true, index: true },
      post: { type: Schema.Types.ObjectId, ref: "CommunityPost", required: true, index: true },
      comment: { type: Schema.Types.ObjectId, ref: "Comment", default: null },
      readAt: { type: Date, default: null, index: true },
    },
    { timestamps: true },
  )

if (!models.CommunityNotification) {
  communityNotificationSchema.index({ recipient: 1, createdAt: -1 })
  communityNotificationSchema.index({ recipient: 1, readAt: 1 })
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

const paymentOrderStatusValues = ["pending", "reviewing", "paid", "expired", "cancelled"] as const

const paymentOrderSchema =
  models.PaymentOrder?.schema ||
  new Schema(
    {
      user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
      productCode: {
        type: String,
        enum: ["prediction_5_matches", "prediction_15_matches", "prediction_tournament"],
        required: true,
        index: true,
      },
      productName: { type: String, required: true, trim: true },
      amount: { type: Number, required: true, min: 1 },
      currency: { type: String, default: "THB" },
      status: { type: String, enum: paymentOrderStatusValues, default: "pending", index: true },
      paymentProvider: { type: String, default: "thunder" },
      targetType: { type: String, enum: ["credits", "daypass"], required: true },
      targetId: { type: String, default: "", index: true },
      slipPayload: { type: String, default: "" },
      slipImageUrl: { type: String, default: "" },
      paidAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null, index: true },
      verificationRef: { type: String, default: "" },
      rawVerification: { type: Schema.Types.Mixed, default: null },
    },
    { timestamps: true },
  )

if (models.PaymentOrder) {
  const statusPath = models.PaymentOrder.schema.path("status") as any
  if (statusPath && Array.isArray(statusPath.enumValues) && !statusPath.enumValues.includes("reviewing")) {
    statusPath.enumValues = [...paymentOrderStatusValues]
    for (const validator of statusPath.validators ?? []) {
      if (validator.type === "enum") {
        validator.enumValues = [...paymentOrderStatusValues]
      }
    }
  }
}

const paymentEntitlementSchema =
  models.PaymentEntitlement?.schema ||
  new Schema(
    {
      user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
      order: { type: Schema.Types.ObjectId, ref: "PaymentOrder", required: true, index: true },
      productCode: {
        type: String,
        enum: ["prediction_5_matches", "prediction_15_matches", "prediction_tournament"],
        required: true,
      },
      targetType: { type: String, enum: ["credits", "daypass"], required: true },
      targetId: { type: String, default: "", index: true },
      amount: { type: Number, required: true, min: 1 },
      active: { type: Boolean, default: true, index: true },
      expiresAt: { type: Date, default: null, index: true },
      metadata: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true },
  )

const premierLeagueFixtureSchema =
  models.PremierLeagueFixture?.schema ||
  new Schema(
    {
      externalId: { type: String, required: true, unique: true, index: true },
      season: { type: String, required: true, index: true },
      roundNumber: { type: Number, default: null, index: true },
      roundLabel: { type: String, default: "" },
      kickoffAt: { type: Date, required: true, index: true },
      kickoffLabel: { type: String, default: "" },
      homeTeam: {
        id: { type: String, default: "" },
        name: { type: String, required: true },
        nameEn: { type: String, default: "" },
        logo: { type: String, default: "" },
      },
      awayTeam: {
        id: { type: String, default: "" },
        name: { type: String, required: true },
        nameEn: { type: String, default: "" },
        logo: { type: String, default: "" },
      },
      venue: {
        name: { type: String, default: "" },
        city: { type: String, default: "" },
      },
      status: {
        short: { type: String, default: "" },
        long: { type: String, default: "" },
        isLive: { type: Boolean, default: false },
        isFinished: { type: Boolean, default: false },
        isUpcoming: { type: Boolean, default: true },
      },
      score: {
        home: { type: Number, default: null },
        away: { type: Number, default: null },
      },
      source: { type: String, default: "internal-football-service" },
      syncedAt: { type: Date, default: Date.now, index: true },
      metadata: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true },
  )

const premierLeagueSnapshotSchema =
  models.PremierLeagueSnapshot?.schema ||
  new Schema(
    {
      key: { type: String, required: true, unique: true, index: true },
      season: { type: String, default: "Premier League" },
      summary: { type: String, default: "" },
      model: { type: String, default: "" },
      searchVerified: { type: Boolean, default: false },
      standings: { type: [Schema.Types.Mixed], default: [] },
      fixtures: { type: [Schema.Types.Mixed], default: [] },
      topScorers: { type: [Schema.Types.Mixed], default: [] },
      topAssists: { type: [Schema.Types.Mixed], default: [] },
      cleanSheets: { type: [Schema.Types.Mixed], default: [] },
      sources: { type: [Schema.Types.Mixed], default: [] },
      warnings: { type: [String], default: [] },
      syncedAt: { type: Date, default: Date.now, index: true },
      status: { type: String, enum: ["ready", "error"], default: "ready" },
      lastError: { type: String, default: "" },
    },
    { timestamps: true },
  )

export const User = models.User || model("User", userSchema)
export const Admin = models.Admin || model("Admin", adminSchema)
export const Favorite = models.Favorite || model("Favorite", favoriteSchema)
export const Comment = models.Comment || model("Comment", commentSchema)
export const CommunityPost = models.CommunityPost || model("CommunityPost", communityPostSchema)
export const CommunityReport = models.CommunityReport || model("CommunityReport", communityReportSchema)
export const PostLike = models.PostLike || model("PostLike", postLikeSchema)
export const FriendRequest = models.FriendRequest || model("FriendRequest", friendRequestSchema)
export const Friendship = models.Friendship || model("Friendship", friendshipSchema)
export const Conversation = models.Conversation || model("Conversation", conversationSchema)
export const DirectMessage = models.DirectMessage || model("DirectMessage", directMessageSchema)
export const CommunityStory = models.CommunityStory || model("CommunityStory", communityStorySchema)
export const CommunityUploadAsset = models.CommunityUploadAsset || model("CommunityUploadAsset", communityUploadAssetSchema)
export const CommunityNotification = models.CommunityNotification || model("CommunityNotification", communityNotificationSchema)
export const Prediction = models.Prediction || model("Prediction", predictionSchema)
export const PaymentOrder = models.PaymentOrder || model("PaymentOrder", paymentOrderSchema)
export const PaymentEntitlement = models.PaymentEntitlement || model("PaymentEntitlement", paymentEntitlementSchema)
export const PremierLeagueFixture = models.PremierLeagueFixture || model("PremierLeagueFixture", premierLeagueFixtureSchema)
export const PremierLeagueSnapshot =
  models.PremierLeagueSnapshot || model("PremierLeagueSnapshot", premierLeagueSnapshotSchema)
