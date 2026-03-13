const { body, param, query } = require("express-validator")

const Comment = require("../models/comment.model")
const CommunityPost = require("../models/community-post.model")
const PostLike = require("../models/post-like.model")
const CommunityReport = require("../models/community-report.model")
const { ApiError } = require("../utils/api-error")
const { asyncHandler } = require("../utils/async-handler")
const { getTimeAgoThai, normalizePagination } = require("../utils/football")
const { ensureValidRequest } = require("../utils/validators")

const categoryLabels = {
  "match-discussion": "วิเคราะห์แมตช์",
  "transfer-rumors": "ข่าวย้ายทีม",
  "player-discussion": "พูดคุยนักเตะ",
  predictions: "ทายผล",
  general: "ทั่วไป",
}

const createPostValidation = [
  body("title").trim().isLength({ min: 4, max: 180 }),
  body("content").trim().isLength({ min: 8, max: 5000 }),
  body("category").optional().isIn(["match-discussion", "transfer-rumors", "player-discussion", "predictions", "general"]),
]

const listPostsValidation = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("category").optional().isIn(["all", "match-discussion", "transfer-rumors", "player-discussion", "predictions", "general"]),
  query("status").optional().isIn(["all", "published", "flagged", "hidden"]),
  query("mine").optional().isIn(["true", "false"]),
  query("q").optional().isString(),
]

const postIdValidation = [param("id").isMongoId()]

const updateModerationValidation = [
  param("id").isMongoId(),
  body("status").optional().isIn(["published", "flagged", "hidden"]),
  body("isPinned").optional().isBoolean(),
]

const createReportValidation = [
  param("id").isMongoId(),
  body("reason").isIn(["spam", "abuse", "hate", "off-topic", "other"]),
  body("description").optional().isLength({ max: 1000 }),
]

const listReportsValidation = [
  query("status").optional().isIn(["all", "pending", "resolved", "dismissed"]),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
]

const resolveReportValidation = [
  param("id").isMongoId(),
  body("status").isIn(["resolved", "dismissed"]),
  body("resolutionNote").optional().isLength({ max: 1000 }),
]

function mapPost(post, viewer, likedPostIds = new Set()) {
  return {
    id: post._id.toString(),
    title: post.title,
    excerpt: post.content.length > 220 ? `${post.content.slice(0, 220)}...` : post.content,
    content: post.content,
    category: post.category,
    categoryLabel: categoryLabels[post.category] || "ทั่วไป",
    status: post.status,
    isPinned: post.isPinned,
    isHot: post.likesCount >= 20 || post.commentsCount >= 10,
    likes: post.likesCount,
    comments: post.commentsCount,
    views: post.viewsCount,
    reports: post.reportsCount,
    timeAgo: getTimeAgoThai(post.createdAt),
    createdAt: post.createdAt,
    author: {
      id: post.author?._id?.toString?.() || "",
      name: post.author?.name || "ผู้ใช้งาน",
      avatar: post.author?.avatar || "",
      favoriteTeam: post.author?.favoriteTeam || "",
      role: post.author?.role || "user",
    },
    isLiked: viewer ? likedPostIds.has(post._id.toString()) : false,
    canModerate: viewer?.role === "admin",
  }
}

const listPosts = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const { page, limit, skip } = normalizePagination(req.query)

  const filter = {}
  if (req.query.category && req.query.category !== "all") filter.category = req.query.category
  if (req.query.status && req.query.status !== "all") filter.status = req.query.status
  if (req.query.mine === "true" && req.user) filter.author = req.user._id
  if (!req.user || req.user.role !== "admin") filter.status = "published"
  if (req.query.q) {
    filter.$or = [
      { title: { $regex: req.query.q, $options: "i" } },
      { content: { $regex: req.query.q, $options: "i" } },
    ]
  }

  const [posts, total] = await Promise.all([
    CommunityPost.find(filter)
      .populate("author", "name avatar favoriteTeam role")
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    CommunityPost.countDocuments(filter),
  ])

  const likedPostIds = req.user
    ? new Set(
        (await PostLike.find({ user: req.user._id, post: { $in: posts.map((post) => post._id) } }).select("post")).map((item) =>
          item.post.toString(),
        ),
      )
    : new Set()

  const items = posts.map((post) => mapPost(post, req.user, likedPostIds))

  res.json({
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    stats: {
      total,
      published: await CommunityPost.countDocuments({ status: "published" }),
      flagged: await CommunityPost.countDocuments({ status: "flagged" }),
      hidden: await CommunityPost.countDocuments({ status: "hidden" }),
    },
  })
})

const createPost = asyncHandler(async (req, res) => {
  ensureValidRequest(req)

  const post = await CommunityPost.create({
    author: req.user._id,
    title: req.body.title,
    content: req.body.content,
    category: req.body.category || "general",
  })

  const populated = await CommunityPost.findById(post._id).populate("author", "name avatar favoriteTeam role")
  res.status(201).json({ item: mapPost(populated, req.user) })
})

const getPostById = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const post = await CommunityPost.findById(req.params.id).populate("author", "name avatar favoriteTeam role")
  if (!post || (post.status !== "published" && req.user?.role !== "admin")) {
    throw new ApiError(404, "Post not found")
  }

  await CommunityPost.findByIdAndUpdate(post._id, { $inc: { viewsCount: 1 } })
  const isLiked = req.user ? await PostLike.exists({ post: post._id, user: req.user._id }) : false
  const comments = await Comment.find({ targetType: "post", targetId: post._id.toString(), isApproved: true })
    .populate("user", "name avatar favoriteTeam")
    .sort({ createdAt: -1 })

  res.json({
    item: {
      ...mapPost(post, req.user, new Set(isLiked ? [post._id.toString()] : [])),
      views: post.viewsCount + 1,
    },
    comments: comments.map((comment) => ({
      id: comment._id.toString(),
      content: comment.content,
      createdAt: comment.createdAt,
      timeAgo: getTimeAgoThai(comment.createdAt),
      user: {
        id: comment.user?._id?.toString?.() || "",
        name: comment.user?.name || "ผู้ใช้งาน",
        avatar: comment.user?.avatar || "",
      },
    })),
  })
})

const toggleLike = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const post = await CommunityPost.findById(req.params.id)
  if (!post) throw new ApiError(404, "Post not found")

  const existingLike = await PostLike.findOne({ post: post._id, user: req.user._id })
  let liked = false

  if (existingLike) {
    await existingLike.deleteOne()
    post.likesCount = Math.max(0, post.likesCount - 1)
  } else {
    await PostLike.create({ post: post._id, user: req.user._id })
    post.likesCount += 1
    liked = true
  }

  await post.save()
  res.json({ liked, likes: post.likesCount })
})

const createPostComment = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const post = await CommunityPost.findById(req.params.id)
  if (!post) throw new ApiError(404, "Post not found")

  const comment = await Comment.create({
    user: req.user._id,
    targetType: "post",
    targetId: post._id.toString(),
    content: req.body.content,
  })

  post.commentsCount += 1
  await post.save()

  const populated = await comment.populate("user", "name avatar favoriteTeam")
  res.status(201).json({
    item: {
      id: populated._id.toString(),
      content: populated.content,
      createdAt: populated.createdAt,
      timeAgo: getTimeAgoThai(populated.createdAt),
      user: {
        id: populated.user?._id?.toString?.() || "",
        name: populated.user?.name || "ผู้ใช้งาน",
        avatar: populated.user?.avatar || "",
      },
    },
    commentsCount: post.commentsCount,
  })
})

const createReport = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const post = await CommunityPost.findById(req.params.id)
  if (!post) throw new ApiError(404, "Post not found")
  if (post.author.toString() === req.user._id.toString()) {
    throw new ApiError(400, "You cannot report your own post")
  }

  const report = await CommunityReport.create({
    post: post._id,
    reporter: req.user._id,
    reason: req.body.reason,
    description: req.body.description || "",
  })

  post.reportsCount += 1
  if (post.reportsCount > 0 && post.status === "published") {
    post.status = "flagged"
  }
  await post.save()

  res.status(201).json({ item: report })
})

const listReports = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const { page, limit, skip } = normalizePagination(req.query)
  const filter = {}
  if (req.query.status && req.query.status !== "all") filter.status = req.query.status

  const [items, total] = await Promise.all([
    CommunityReport.find(filter)
      .populate("post", "title status")
      .populate("reporter", "name avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    CommunityReport.countDocuments(filter),
  ])

  res.json({
    items: items.map((item) => ({
      id: item._id.toString(),
      reason: item.reason,
      description: item.description,
      status: item.status,
      resolutionNote: item.resolutionNote,
      createdAt: item.createdAt,
      post: {
        id: item.post?._id?.toString?.() || "",
        title: item.post?.title || "",
        status: item.post?.status || "",
      },
      reporter: {
        id: item.reporter?._id?.toString?.() || "",
        name: item.reporter?.name || "ผู้ใช้งาน",
        avatar: item.reporter?.avatar || "",
      },
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

const resolveReport = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const report = await CommunityReport.findById(req.params.id).populate("post")
  if (!report) throw new ApiError(404, "Report not found")

  report.status = req.body.status
  report.resolutionNote = req.body.resolutionNote || ""
  await report.save()

  if (report.post && req.body.status === "dismissed") {
    const pendingCount = await CommunityReport.countDocuments({ post: report.post._id, status: "pending" })
    if (pendingCount === 0 && report.post.status === "flagged") {
      report.post.status = "published"
      await report.post.save()
    }
  }

  res.json({ item: report })
})

const updateModeration = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const post = await CommunityPost.findById(req.params.id)
  if (!post) throw new ApiError(404, "Post not found")

  if (typeof req.body.status !== "undefined") post.status = req.body.status
  if (typeof req.body.isPinned !== "undefined") post.isPinned = req.body.isPinned

  await post.save()
  const populated = await CommunityPost.findById(post._id).populate("author", "name avatar favoriteTeam role")
  res.json({ item: mapPost(populated, req.user) })
})

const deletePost = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const post = await CommunityPost.findById(req.params.id)
  if (!post) throw new ApiError(404, "Post not found")
  if (req.user.role !== "admin" && post.author.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not allowed to delete this post")
  }

  await Promise.all([
    CommunityPost.findByIdAndDelete(post._id),
    PostLike.deleteMany({ post: post._id }),
    Comment.deleteMany({ targetType: "post", targetId: post._id.toString() }),
  ])

  res.json({ message: "Post deleted" })
})

module.exports = {
  createPost,
  createPostComment,
  createPostValidation,
  deletePost,
  getPostById,
  listPosts,
  listPostsValidation,
  postIdValidation,
  createReport,
  createReportValidation,
  listReports,
  listReportsValidation,
  resolveReport,
  resolveReportValidation,
  toggleLike,
  updateModeration,
  updateModerationValidation,
}
