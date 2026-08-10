import bcrypt from "bcryptjs"
import mongoose from "mongoose"

const { Schema, models, model } = mongoose
const adminRoleEnum = ["superadmin", "admin", "admincommunity"] as const
const moderationStatusEnum = ["approved", "pending_review", "rejected"] as const
const moderationProviderEnum = ["local", "openai", "combined", "manual"] as const
const communityMediaStatusEnum = ["processing", "approved", "pending_review", "rejected", "failed"] as const
const communityMatchSummaryStatusEnum = ["not_generated", "generating", "generated", "template", "failed", "stale"] as const
const communityMatchSummaryModeEnum = ["ai", "template"] as const
const communityMatchSummaryProviderStatusEnum = ["ready", "degraded", "unavailable", "template"] as const
const matchRoomTypeEnum = ["main", "tactics", "preview", "post_match"] as const
const communityPostRoomTypeEnum = ["", ...matchRoomTypeEnum] as const
const communityPostContentTypeEnum = [
  "community_post",
  "room_message",
  "thread_root",
  "match_poll",
  "official_match_update",
  "match_summary_preview",
] as const
const matchRoomNotificationTypeEnum = [
  "match_starting",
  "match_live",
  "match_finished",
  "official_poll_opened",
  "match_summary_ready",
] as const

function extendStringEnumPath(path: any, values: readonly string[]) {
  if (!path) return
  const nextValues = Array.from(new Set([...(path.enumValues || []), ...values]))
  path.enumValues = nextValues
  for (const validator of path.validators ?? []) {
    if (validator.type === "enum") {
      validator.enumValues = nextValues
    }
  }
}

function ensureSchemaPathDefault(path: any, defaultValue: unknown) {
  if (!path) return
  path.options = path.options || {}
  path.options.default = defaultValue
  if (typeof path.defaultValue !== "undefined") {
    path.defaultValue = defaultValue
  }
}

if (models.CommunityPost && models.CommunityPost.schema.path("roomType")) {
  ensureSchemaPathDefault(models.CommunityPost.schema.path("roomType"), "main")
}

const moderationSchema = new Schema(
  {
    status: { type: String, enum: moderationStatusEnum, default: "approved", index: true },
    reasons: { type: [String], default: [] },
    scores: { type: Schema.Types.Mixed, default: {} },
    metadata: { type: Schema.Types.Mixed, default: {} },
    provider: { type: String, enum: moderationProviderEnum, default: "local" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    reviewedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const userSchema =
  models.User?.schema ||
  new Schema(
    {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      password: { type: String, required: true, minlength: 6 },
      avatar: { type: String, default: "" },
      coverImage: { type: String, default: "" },
      pendingAvatarMediaId: { type: Schema.Types.ObjectId, ref: "CommunityMedia", default: null },
      pendingCoverMediaId: { type: Schema.Types.ObjectId, ref: "CommunityMedia", default: null },
      coverPositionX: { type: Number, default: 0 },
      coverPositionY: { type: Number, default: 0 },
      coverScale: { type: Number, default: 1 },
      phone: { type: String, unique: true, sparse: true, trim: true },
      favoriteTeam: { type: String, default: "" },
      favoriteTeamIds: { type: [String], default: [] },
      favoritePlayerIds: { type: [String], default: [] },
      preferredContentTypes: { type: [String], default: [] },
      notificationPreferences: { type: Schema.Types.Mixed, default: {} },
      followedMatchRooms: {
        type: [
          new Schema(
            {
              matchId: { type: String, required: true, trim: true },
              followedAt: { type: Date, default: Date.now },
              lastVisitedAt: { type: Date, default: null },
              lastSeenActivityAt: { type: Date, default: null },
            },
            { _id: false },
          ),
        ],
        default: [],
      },
      recentMatchRooms: {
        type: [
          new Schema(
            {
              matchId: { type: String, required: true, trim: true },
              lastVisitedAt: { type: Date, default: Date.now },
            },
            { _id: false },
          ),
        ],
        default: [],
      },
      communityStats: {
        postsCount: { type: Number, default: 0 },
        matchRoomPostsCount: { type: Number, default: 0 },
        pollVotesCount: { type: Number, default: 0 },
        lastMatchRoomAt: { type: Date, default: null },
      },
      fanBadges: { type: [String], default: [] },
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
      moderationState: {
        warningsCount: { type: Number, default: 0 },
        postingRestrictedUntil: { type: Date, default: null },
        suspendedAt: { type: Date, default: null },
        bannedAt: { type: Date, default: null },
        lastActionAt: { type: Date, default: null },
      },
    },
    { timestamps: true },
  )

if (!models.User) {
  userSchema.index({ "followedMatchRooms.matchId": 1 })
  userSchema.index({ "recentMatchRooms.lastVisitedAt": -1 })
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

if (models.User && !models.User.schema.path("pendingAvatarMediaId")) {
  models.User.schema.add({
    pendingAvatarMediaId: { type: Schema.Types.ObjectId, ref: "CommunityMedia", default: null },
    pendingCoverMediaId: { type: Schema.Types.ObjectId, ref: "CommunityMedia", default: null },
  })
}

if (models.User && !models.User.schema.path("coverPositionX")) {
  models.User.schema.add({
    coverPositionX: { type: Number, default: 0 },
    coverPositionY: { type: Number, default: 0 },
    coverScale: { type: Number, default: 1 },
  })
}

if (models.User && !models.User.schema.path("moderationState")) {
  models.User.schema.add({
    moderationState: {
      warningsCount: { type: Number, default: 0 },
      postingRestrictedUntil: { type: Date, default: null },
      suspendedAt: { type: Date, default: null },
      bannedAt: { type: Date, default: null },
      lastActionAt: { type: Date, default: null },
    },
  })
}

if (models.User && !models.User.schema.path("favoriteTeamIds")) {
  models.User.schema.add({
    favoriteTeamIds: { type: [String], default: [] },
    favoritePlayerIds: { type: [String], default: [] },
    preferredContentTypes: { type: [String], default: [] },
    notificationPreferences: { type: Schema.Types.Mixed, default: {} },
  })
}

if (models.User && !models.User.schema.path("communityStats")) {
  models.User.schema.add({
    communityStats: {
      postsCount: { type: Number, default: 0 },
      matchRoomPostsCount: { type: Number, default: 0 },
      pollVotesCount: { type: Number, default: 0 },
      lastMatchRoomAt: { type: Date, default: null },
    },
    fanBadges: { type: [String], default: [] },
  })
}

if (models.User && !models.User.schema.path("followedMatchRooms")) {
  models.User.schema.add({
    followedMatchRooms: {
      type: [
        new Schema(
          {
            matchId: { type: String, required: true, trim: true },
            followedAt: { type: Date, default: Date.now },
            lastVisitedAt: { type: Date, default: null },
            lastSeenActivityAt: { type: Date, default: null },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    recentMatchRooms: {
      type: [
        new Schema(
          {
            matchId: { type: String, required: true, trim: true },
            lastVisitedAt: { type: Date, default: Date.now },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
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
      parentComment: { type: Schema.Types.ObjectId, ref: "Comment", default: null, index: true },
      content: { type: String, required: true, trim: true, maxlength: 1000 },
      isApproved: { type: Boolean, default: true },
      isDeleted: { type: Boolean, default: false, index: true },
      deletedAt: { type: Date, default: null },
      deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
      isHidden: { type: Boolean, default: false, index: true },
      hiddenAt: { type: Date, default: null },
      hiddenBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
      likesCount: { type: Number, default: 0 },
      moderation: { type: moderationSchema, default: () => ({}) },
      lastEditedAt: { type: Date, default: null },
      editVersion: { type: Number, default: 1 },
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
      teamIds: { type: [String], default: [], index: true },
      playerIds: { type: [String], default: [], index: true },
      matchId: { type: String, default: "", trim: true, index: true },
      roomType: { type: String, enum: communityPostRoomTypeEnum, default: "", index: true },
      contentType: { type: String, enum: communityPostContentTypeEnum, default: "community_post", index: true },
      isRoomMessage: { type: Boolean, default: false, index: true },
      archivedAt: { type: Date, default: null, index: true },
      roomClosedAt: { type: Date, default: null },
      roomExpiresAt: { type: Date, default: null, index: true },
      replyToPost: { type: Schema.Types.ObjectId, ref: "CommunityPost", default: null, index: true },
      matchContext: {
        homeTeam: { type: String, default: "", trim: true },
        awayTeam: { type: String, default: "", trim: true },
        homeLogo: { type: String, default: "", trim: true },
        awayLogo: { type: String, default: "", trim: true },
        homeScore: { type: Number, default: null },
        awayScore: { type: Number, default: null },
        status: { type: String, default: "", trim: true },
        kickoff: { type: String, default: "", trim: true },
      },
      isThreadRoot: { type: Boolean, default: false, index: true },
      threadCategory: {
        type: String,
        enum: ["", "tactics", "player", "referee", "post_match", "general"],
        default: "",
        index: true,
      },
      isOfficialThread: { type: Boolean, default: false, index: true },
      latestActivityAt: { type: Date, default: null, index: true },
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
      pollVotes: {
        type: [
          new Schema(
            {
              user: { type: Schema.Types.ObjectId, ref: "User", required: true },
              optionId: { type: String, required: true, trim: true },
              votedAt: { type: Date, default: Date.now },
            },
            { _id: false },
          ),
        ],
        default: [],
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
      moderation: { type: moderationSchema, default: () => ({}) },
      pendingRevision: { type: Schema.Types.Mixed, default: null },
      hasPendingRevision: { type: Boolean, default: false, index: true },
      lastEditedAt: { type: Date, default: null },
      editVersion: { type: Number, default: 1 },
    },
    { timestamps: true },
  )

const communityReportSchema =
  models.CommunityReport?.schema ||
  new Schema(
    {
      post: { type: Schema.Types.ObjectId, ref: "CommunityPost", default: null, index: true },
      comment: { type: Schema.Types.ObjectId, ref: "Comment", default: null, index: true },
      targetType: { type: String, enum: ["post", "comment", "reply", "room_message", "thread_root", "match_poll"], default: "post", index: true },
      targetId: { type: String, default: "", trim: true, index: true },
      reporter: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
      reason: {
        type: String,
        enum: ["spam", "abuse", "hate", "off-topic", "harassment", "inappropriate", "misinformation", "gambling", "other"],
        required: true,
      },
      description: { type: String, default: "", maxlength: 1000 },
      status: { type: String, enum: ["pending", "resolved", "dismissed"], default: "pending", index: true },
      resolutionNote: { type: String, default: "", maxlength: 1000 },
    },
    { timestamps: true },
  )

if (!models.CommunityReport) {
  communityReportSchema.index({ post: 1, reporter: 1 }, { unique: true })
  communityReportSchema.index({ targetType: 1, targetId: 1, reporter: 1 }, { unique: true, sparse: true })
}

if (models.CommunityPost && !models.CommunityPost.schema.path("teamIds")) {
  models.CommunityPost.schema.add({
    teamIds: { type: [String], default: [], index: true },
    playerIds: { type: [String], default: [], index: true },
  })
}

if (models.CommunityPost && !models.CommunityPost.schema.path("matchId")) {
  models.CommunityPost.schema.add({
    matchId: { type: String, default: "", trim: true, index: true },
    matchContext: {
      homeTeam: { type: String, default: "", trim: true },
      awayTeam: { type: String, default: "", trim: true },
      homeLogo: { type: String, default: "", trim: true },
      awayLogo: { type: String, default: "", trim: true },
      homeScore: { type: Number, default: null },
      awayScore: { type: Number, default: null },
      status: { type: String, default: "", trim: true },
      kickoff: { type: String, default: "", trim: true },
    },
    pollVotes: {
      type: [
        new Schema(
          {
            user: { type: Schema.Types.ObjectId, ref: "User", required: true },
            optionId: { type: String, required: true, trim: true },
            votedAt: { type: Date, default: Date.now },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  })
}

if (models.CommunityPost && !models.CommunityPost.schema.path("roomType")) {
  models.CommunityPost.schema.add({
    roomType: { type: String, enum: communityPostRoomTypeEnum, default: "", index: true },
    contentType: { type: String, enum: communityPostContentTypeEnum, default: "community_post", index: true },
    isRoomMessage: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, default: null, index: true },
    roomClosedAt: { type: Date, default: null },
    roomExpiresAt: { type: Date, default: null, index: true },
    replyToPost: { type: Schema.Types.ObjectId, ref: "CommunityPost", default: null, index: true },
  })
}

if (models.CommunityPost?.schema.path("roomType")) {
  extendStringEnumPath(models.CommunityPost.schema.path("roomType"), [""])
}

if (models.CommunityPost && !models.CommunityPost.schema.path("isThreadRoot")) {
  models.CommunityPost.schema.add({
    isThreadRoot: { type: Boolean, default: false, index: true },
    threadCategory: {
      type: String,
      enum: ["", "tactics", "player", "referee", "post_match", "general"],
      default: "",
      index: true,
    },
    isOfficialThread: { type: Boolean, default: false, index: true },
    latestActivityAt: { type: Date, default: null, index: true },
  })
}

if (models.Comment && !models.Comment.schema.path("parentComment")) {
  models.Comment.schema.add({
    parentComment: { type: Schema.Types.ObjectId, ref: "Comment", default: null, index: true },
  })
}

if (models.Comment && !models.Comment.schema.path("isDeleted")) {
  models.Comment.schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    isHidden: { type: Boolean, default: false, index: true },
    hiddenAt: { type: Date, default: null },
    hiddenBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    lastEditedAt: { type: Date, default: null },
    editVersion: { type: Number, default: 1 },
  })
}

if (models.CommunityReport && !models.CommunityReport.schema.path("targetType")) {
  models.CommunityReport.schema.add({
    comment: { type: Schema.Types.ObjectId, ref: "Comment", default: null, index: true },
    targetType: { type: String, enum: ["post", "comment", "reply"], default: "post", index: true },
    targetId: { type: String, default: "", trim: true, index: true },
  })
}

if (models.CommunityReport?.schema.path("targetType")) {
  extendStringEnumPath(models.CommunityReport.schema.path("targetType"), ["room_message", "thread_root", "match_poll"])
}

if (models.CommunityReport?.schema.path("post")) {
  models.CommunityReport.schema.path("post").options.required = false
}

if (models.CommunityReport?.schema.path("reason")) {
  extendStringEnumPath(models.CommunityReport.schema.path("reason"), ["harassment", "inappropriate", "misinformation", "gambling"])
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
      mediaType: { type: String, enum: ["image", "video"], default: "image", index: true },
      image: { type: String, default: "", trim: true },
      video: { type: String, default: "", trim: true },
      mediaId: { type: Schema.Types.ObjectId, ref: "CommunityMedia", default: null, index: true },
      caption: { type: String, default: "", trim: true, maxlength: 180 },
      style: {
        theme: { type: String, enum: ["neon", "midnight", "sunset", "glass"], default: "neon" },
        captionAlign: { type: String, enum: ["top", "center", "bottom"], default: "bottom" },
        captionSize: { type: String, enum: ["sm", "md", "lg"], default: "md" },
        sticker: { type: String, enum: ["", "Matchday", "Breaking", "Hot Take", "Fan Cam"], default: "" },
      },
      status: { type: String, enum: ["published", "hidden"], default: "published", index: true },
      expiresAt: { type: Date, default: null, index: true },
      viewsCount: { type: Number, default: 0 },
      viewedBy: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [] },
      moderation: { type: moderationSchema, default: () => ({}) },
    },
    { timestamps: true },
  )

const moderationLogSchema =
  models.ModerationLog?.schema ||
  new Schema(
    {
      user: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
      contentType: { type: String, enum: ["post", "comment", "story", "image", "video", "room_message", "thread_root", "match_poll"], required: true, index: true },
      contentId: { type: String, default: "", index: true },
      status: { type: String, enum: moderationStatusEnum, required: true, index: true },
      action: { type: String, required: true, trim: true, maxlength: 60 },
      reasons: { type: [String], default: [] },
      scores: { type: Schema.Types.Mixed, default: {} },
      provider: { type: String, enum: moderationProviderEnum, default: "local" },
      reviewedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null, index: true },
      metadata: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true },
  )

if (!models.ModerationLog) {
  moderationLogSchema.index({ contentType: 1, contentId: 1, createdAt: -1 })
  moderationLogSchema.index({ user: 1, createdAt: -1 })
}

if (models.ModerationLog?.schema.path("contentType")) {
  extendStringEnumPath(models.ModerationLog.schema.path("contentType"), ["room_message", "thread_root", "match_poll"])
}

if (models.Comment && !models.Comment.schema.path("moderation")) {
  models.Comment.schema.add({
    moderation: { type: moderationSchema, default: () => ({}) },
  })
}

if (models.Comment && models.Comment.schema.path("moderation") && !models.Comment.schema.path("moderation.metadata")) {
  ;(models.Comment.schema.path("moderation") as any).schema?.add?.({
    metadata: { type: Schema.Types.Mixed, default: {} },
  })
}

if (models.CommunityPost && !models.CommunityPost.schema.path("moderation")) {
  models.CommunityPost.schema.add({
    moderation: { type: moderationSchema, default: () => ({}) },
  })
}

if (models.CommunityPost && models.CommunityPost.schema.path("moderation") && !models.CommunityPost.schema.path("moderation.metadata")) {
  ;(models.CommunityPost.schema.path("moderation") as any).schema?.add?.({
    metadata: { type: Schema.Types.Mixed, default: {} },
  })
}

if (models.CommunityPost && !models.CommunityPost.schema.path("pendingRevision")) {
  models.CommunityPost.schema.add({
    pendingRevision: { type: Schema.Types.Mixed, default: null },
    hasPendingRevision: { type: Boolean, default: false, index: true },
    lastEditedAt: { type: Date, default: null },
    editVersion: { type: Number, default: 1 },
  })
}

if (models.CommunityStory && !models.CommunityStory.schema.path("moderation")) {
  models.CommunityStory.schema.add({
    status: { type: String, enum: ["published", "hidden"], default: "published" },
    moderation: { type: moderationSchema, default: () => ({}) },
  })
}

if (models.CommunityStory && !models.CommunityStory.schema.path("mediaId")) {
  models.CommunityStory.schema.add({
    mediaId: { type: Schema.Types.ObjectId, ref: "CommunityMedia", default: null, index: true },
  })
}

if (models.CommunityStory && !models.CommunityStory.schema.path("mediaType")) {
  models.CommunityStory.schema.add({
    mediaType: { type: String, enum: ["image", "video"], default: "image", index: true },
  })
}

if (models.CommunityStory && !models.CommunityStory.schema.path("video")) {
  models.CommunityStory.schema.add({
    video: { type: String, default: "", trim: true },
  })
}

if (models.CommunityStory && models.CommunityStory.schema.path("expiresAt")?.options?.required === true) {
  models.CommunityStory.schema.path("expiresAt").options.required = false
}

if (models.CommunityStory && models.CommunityStory.schema.path("moderation") && !models.CommunityStory.schema.path("moderation.metadata")) {
  ;(models.CommunityStory.schema.path("moderation") as any).schema?.add?.({
    metadata: { type: Schema.Types.Mixed, default: {} },
  })
}

const communityNotificationSchema =
  models.CommunityNotification?.schema ||
  new Schema(
    {
      recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
      actor: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
      type: {
        type: String,
        enum: [
          "post_like",
          "post_comment",
          "thread_reply",
          "thread_pinned",
          "post_repost",
          "post_poll_vote",
          "community_friend_posted",
          "community_match_room_posted",
          "community_fan_badge_unlocked",
          "community_content_pending",
          "community_content_approved",
          "community_content_rejected",
          "community_content_hidden",
          "community_user_warned",
          "community_user_restricted",
          "community_user_restriction_cleared",
          "community_user_suspended",
          "community_user_unsuspended",
          "community_user_banned",
          "community_user_unbanned",
          "community_moderation_strike_alert",
          ...matchRoomNotificationTypeEnum,
        ],
        required: true,
        index: true,
      },
      post: { type: Schema.Types.ObjectId, ref: "CommunityPost", default: null, index: true },
      comment: { type: Schema.Types.ObjectId, ref: "Comment", default: null },
      story: { type: Schema.Types.ObjectId, ref: "CommunityStory", default: null },
      media: { type: Schema.Types.ObjectId, ref: "CommunityMedia", default: null },
      referenceType: { type: String, default: "", trim: true },
      message: { type: String, default: "", trim: true, maxlength: 240 },
      dedupeKey: { type: String, default: "", trim: true },
      readAt: { type: Date, default: null, index: true },
    },
    { timestamps: true },
  )

if (!models.CommunityNotification) {
  communityNotificationSchema.index({ recipient: 1, createdAt: -1 })
  communityNotificationSchema.index({ recipient: 1, readAt: 1 })
  communityNotificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true })
}

if (models.CommunityNotification?.schema.path("type")) {
  const typePath = models.CommunityNotification.schema.path("type") as any
  for (const value of [
    "post_poll_vote",
    "community_match_room_posted",
    "community_fan_badge_unlocked",
    "thread_reply",
    "thread_pinned",
    "community_user_restriction_cleared",
    "community_user_unsuspended",
    "community_user_unbanned",
  ]) {
    if (Array.isArray(typePath.enumValues) && !typePath.enumValues.includes(value)) {
      typePath.enumValues.push(value)
    }
  }
  for (const value of matchRoomNotificationTypeEnum) {
    if (Array.isArray(typePath.enumValues) && !typePath.enumValues.includes(value)) {
      typePath.enumValues.push(value)
    }
  }
}

const communityFanEventSchema =
  models.CommunityFanEvent?.schema ||
  new Schema(
    {
      user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
      eventKey: { type: String, required: true, trim: true, unique: true, index: true },
      eventType: {
        type: String,
        enum: ["post_created", "match_room_post_created", "poll_voted", "thread_comment_created", "thread_reply_created"],
        required: true,
        index: true,
      },
      post: { type: Schema.Types.ObjectId, ref: "CommunityPost", default: null, index: true },
      matchId: { type: String, default: "", trim: true, index: true },
      metadata: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true },
  )

if (!models.CommunityFanEvent) {
  communityFanEventSchema.index({ user: 1, eventType: 1, createdAt: -1 })
}

if (models.CommunityFanEvent?.schema.path("eventType")) {
  extendStringEnumPath(models.CommunityFanEvent.schema.path("eventType"), ["thread_comment_created", "thread_reply_created"])
}

const communityMediaSchema =
  models.CommunityMedia?.schema ||
  new Schema(
    {
      owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
      contentType: { type: String, enum: ["post", "story", "profile", "chat", "upload"], default: "upload", index: true },
      contentId: { type: String, default: "", index: true },
      mediaType: { type: String, enum: ["image", "video"], required: true, index: true },
      originalName: { type: String, default: "", trim: true },
      storedName: { type: String, default: "", trim: true, index: true },
      mimeType: { type: String, default: "", trim: true },
      size: { type: Number, default: 0 },
      status: { type: String, enum: communityMediaStatusEnum, default: "processing", index: true },
      publicUrl: { type: String, default: "" },
      pendingKey: { type: String, default: "", index: true },
      processingKey: { type: String, default: "", index: true },
      approvedKey: { type: String, default: "", index: true },
      reasons: { type: [String], default: [] },
      scores: { type: Schema.Types.Mixed, default: {} },
      provider: { type: String, enum: moderationProviderEnum, default: "local" },
      reviewedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null, index: true },
      reviewedAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null, index: true },
      technicalStatus: { type: String, default: "" },
      moderation: { type: moderationSchema, default: () => ({}) },
      metadata: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true },
  )

if (!models.CommunityMedia) {
  communityMediaSchema.index({ owner: 1, createdAt: -1 })
  communityMediaSchema.index({ status: 1, mediaType: 1, createdAt: -1 })
}

if (models.CommunityMedia && !models.CommunityMedia.schema.path("moderation")) {
  models.CommunityMedia.schema.add({
    moderation: { type: moderationSchema, default: () => ({}) },
  })
}

if (models.CommunityMedia && models.CommunityMedia.schema.path("moderation") && !models.CommunityMedia.schema.path("moderation.metadata")) {
  ;(models.CommunityMedia.schema.path("moderation") as any).schema?.add?.({
    metadata: { type: Schema.Types.Mixed, default: {} },
  })
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

const paymentOrderStatusValues = ["pending", "reviewing", "paid", "expired", "cancelled", "failed"] as const

const paymentOrderSchema =
  models.PaymentOrder?.schema ||
  new Schema(
    {
      user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
      productCode: {
        type: String,
        enum: [
          "prediction_5_matches",
          "prediction_15_matches",
          "prediction_tournament",
          "basic_monthly",
          "pro_monthly",
          "premium_monthly",
        ],
        required: true,
        index: true,
      },
      productName: { type: String, required: true, trim: true },
      amount: { type: Number, required: true, min: 1 },
      currency: { type: String, default: "THB" },
      status: { type: String, enum: paymentOrderStatusValues, default: "pending", index: true },
      paymentProvider: { type: String, default: "thunder" },
      targetType: { type: String, enum: ["credits", "daypass", "subscription"], required: true },
      targetId: { type: String, default: "", index: true },
      planInterval: { type: String, default: "month" },
      periodStart: { type: Date, default: null },
      periodEnd: { type: Date, default: null, index: true },
      subscriptionRef: { type: Schema.Types.ObjectId, ref: "Subscription", default: null, index: true },
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
        enum: [
          "prediction_5_matches",
          "prediction_15_matches",
          "prediction_tournament",
          "basic_monthly",
          "pro_monthly",
          "premium_monthly",
        ],
        required: true,
      },
      targetType: { type: String, enum: ["credits", "daypass", "subscription"], required: true },
      targetId: { type: String, default: "", index: true },
      amount: { type: Number, required: true, min: 1 },
      active: { type: Boolean, default: true, index: true },
      expiresAt: { type: Date, default: null, index: true },
      metadata: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true },
  )

const subscriptionSchema =
  models.Subscription?.schema ||
  new Schema(
    {
      user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
      productCode: {
        type: String,
        enum: ["basic_monthly", "pro_monthly", "premium_monthly"],
        required: true,
        index: true,
      },
      productName: { type: String, required: true, trim: true },
      status: { type: String, enum: ["pending", "active", "past_due", "cancelled", "expired"], default: "pending", index: true },
      paymentProvider: { type: String, default: "thunder" },
      currentPeriodStart: { type: Date, default: null, index: true },
      currentPeriodEnd: { type: Date, default: null, index: true },
      cancelAtPeriodEnd: { type: Boolean, default: false },
      lastPaymentAt: { type: Date, default: null },
      nextBillingAt: { type: Date, default: null, index: true },
      gracePeriodEnd: { type: Date, default: null },
      latestOrder: { type: Schema.Types.ObjectId, ref: "PaymentOrder", default: null, index: true },
      features: { type: [String], default: [] },
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

const premierLeagueTeamSchema =
  models.PremierLeagueTeam?.schema ||
  new Schema(
    {
      externalId: { type: String, required: true, unique: true, index: true },
      season: { type: String, required: true, index: true },
      name: { type: String, required: true, trim: true, index: true },
      nameEn: { type: String, default: "", trim: true, index: true },
      logo: { type: String, default: "" },
      country: { type: String, default: "" },
      league: { type: String, default: "" },
      founded: { type: Number, default: null },
      website: { type: String, default: "" },
      venue: {
        name: { type: String, default: "" },
        city: { type: String, default: "" },
        capacity: { type: Number, default: 0 },
        image: { type: String, default: "" },
      },
      manager: { type: String, default: "" },
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

const appSettingSchema =
  models.AppSetting?.schema ||
  new Schema(
    {
      key: { type: String, required: true, unique: true, index: true },
      value: { type: Schema.Types.Mixed, default: {} },
      updatedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    },
    { timestamps: true },
  )

const communityMatchSummarySchema =
  models.CommunityMatchSummary?.schema ||
  new Schema(
    {
      matchId: { type: String, required: true, trim: true },
      sourceDataVersion: { type: String, default: "", trim: true, index: true },
      previousSourceDataVersion: { type: String, default: "", trim: true },
      summaryVersion: { type: Number, default: 0, index: true },
      status: { type: String, enum: communityMatchSummaryStatusEnum, default: "not_generated", index: true },
      mode: { type: String, enum: communityMatchSummaryModeEnum, default: "template", index: true },
      summary: { type: Schema.Types.Mixed, default: {} },
      generatedAt: { type: Date, default: null, index: true },
      generatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
      model: { type: String, default: "" },
      providerStatus: { type: String, enum: communityMatchSummaryProviderStatusEnum, default: "template" },
      failureCategory: { type: String, default: "" },
      staleAt: { type: Date, default: null },
      generationStartedAt: { type: Date, default: null },
      generationCompletedAt: { type: Date, default: null },
      lockExpiresAt: { type: Date, default: null, index: true },
      generationToken: { type: String, default: "", index: true },
    },
    { timestamps: true },
  )

const communityMatchSummaryHistorySchema =
  models.CommunityMatchSummaryHistory?.schema ||
  new Schema(
    {
      matchId: { type: String, required: true, trim: true, index: true },
      action: {
        type: String,
        enum: ["initial_generate", "regenerate", "auto_mark_stale", "fallback_generated", "generation_failed"],
        required: true,
        index: true,
      },
      requestedBy: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
      requestedAt: { type: Date, default: Date.now, index: true },
      previousSummaryVersion: { type: Number, default: 0 },
      newSummaryVersion: { type: Number, default: 0 },
      previousSourceDataVersion: { type: String, default: "" },
      newSourceDataVersion: { type: String, default: "" },
      result: { type: String, enum: ["success", "fallback", "failed", "stale"], default: "success", index: true },
      mode: { type: String, enum: communityMatchSummaryModeEnum, default: "template" },
      providerStatus: { type: String, enum: communityMatchSummaryProviderStatusEnum, default: "template" },
      failureCategory: { type: String, default: "" },
      durationMs: { type: Number, default: 0 },
      reason: { type: String, default: "", maxlength: 500 },
    },
    { timestamps: true },
  )

if (!models.CommunityMatchSummary) {
  communityMatchSummarySchema.index({ matchId: 1 }, { unique: true })
  communityMatchSummarySchema.index({ status: 1, lockExpiresAt: 1 })
}

if (!models.CommunityMatchSummaryHistory) {
  communityMatchSummaryHistorySchema.index({ matchId: 1, createdAt: -1 })
  communityMatchSummaryHistorySchema.index({ matchId: 1, newSummaryVersion: -1 })
}

if (!models.CommunityPost) {
  communityPostSchema.index({ matchId: 1, roomType: 1, contentType: 1, status: 1, createdAt: -1 })
  communityPostSchema.index({ isRoomMessage: 1, archivedAt: 1, latestActivityAt: -1 })
  communityPostSchema.index({ replyToPost: 1, createdAt: 1 })
}

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
export const CommunityNotification = models.CommunityNotification || model("CommunityNotification", communityNotificationSchema)
export const CommunityFanEvent = models.CommunityFanEvent || model("CommunityFanEvent", communityFanEventSchema)
export const CommunityMedia = models.CommunityMedia || model("CommunityMedia", communityMediaSchema)
export const ModerationLog = models.ModerationLog || model("ModerationLog", moderationLogSchema)
export const Prediction = models.Prediction || model("Prediction", predictionSchema)
export const PaymentOrder = models.PaymentOrder || model("PaymentOrder", paymentOrderSchema)
export const PaymentEntitlement = models.PaymentEntitlement || model("PaymentEntitlement", paymentEntitlementSchema)
export const Subscription = models.Subscription || model("Subscription", subscriptionSchema)
export const PremierLeagueFixture = models.PremierLeagueFixture || model("PremierLeagueFixture", premierLeagueFixtureSchema)
export const PremierLeagueTeam = models.PremierLeagueTeam || model("PremierLeagueTeam", premierLeagueTeamSchema)
export const PremierLeagueSnapshot =
  models.PremierLeagueSnapshot || model("PremierLeagueSnapshot", premierLeagueSnapshotSchema)
export const AppSetting = models.AppSetting || model("AppSetting", appSettingSchema)
export const CommunityMatchSummary =
  models.CommunityMatchSummary || model("CommunityMatchSummary", communityMatchSummarySchema)
export const CommunityMatchSummaryHistory =
  models.CommunityMatchSummaryHistory || model("CommunityMatchSummaryHistory", communityMatchSummaryHistorySchema)
