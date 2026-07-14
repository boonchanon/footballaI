const { body, param, query } = require("express-validator")

const Comment = require("../models/comment.model")
const CommunityPost = require("../models/community-post.model")
const Favorite = require("../models/favorite.model")
const Prediction = require("../models/prediction.model")
const User = require("../models/user.model")
const { deleteUserAccount } = require("../services/user-account.service")
const { ApiError } = require("../utils/api-error")
const { asyncHandler } = require("../utils/async-handler")
const { getTimeAgoThai, normalizePagination } = require("../utils/football")
const { ensureValidRequest } = require("../utils/validators")

const listUsersValidation = [query("page").optional().isInt({ min: 1 }), query("limit").optional().isInt({ min: 1, max: 100 })]
const userIdValidation = [param("id").isMongoId()]
const updateUserValidation = [
  param("id").isMongoId(),
  body("name").optional().trim().isLength({ min: 2, max: 80 }),
  body("email").optional().isEmail().normalizeEmail(),
  body("avatar").optional().isString(),
  body("favoriteTeam").optional().isString(),
  body("bio").optional().isLength({ max: 280 }),
  body("role").optional().isIn(["user", "superadmin", "admin", "admincommunity"]),
]

const listUsers = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const { page, limit, skip } = normalizePagination(req.query)

  const [items, total] = await Promise.all([
    User.find().select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(),
  ])

  res.json({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
})

const getUserById = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const user = await User.findById(req.params.id).select("-password")
  if (!user) {
    throw new ApiError(404, "User not found")
  }

  res.json({ item: user })
})

const updateUser = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const user = await User.findById(req.params.id)
  if (!user) {
    throw new ApiError(404, "User not found")
  }

  const { name, email, avatar, favoriteTeam, bio, role } = req.body

  if (typeof email !== "undefined" && email !== user.email) {
    const existingUser = await User.findOne({ email })
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      throw new ApiError(409, "Email already in use")
    }
    user.email = email
  }

  if (typeof name !== "undefined") user.name = name.trim()
  if (typeof avatar !== "undefined") user.avatar = avatar.trim()
  if (typeof favoriteTeam !== "undefined") user.favoriteTeam = favoriteTeam.trim()
  if (typeof bio !== "undefined") user.bio = bio.trim()
  if (typeof role !== "undefined") user.role = role

  await user.save()
  res.json({ item: sanitizeUser(user) })
})

const deleteUser = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  if (req.user._id.toString() === req.params.id) {
    throw new ApiError(400, "Use account deletion endpoint for your own account")
  }

  const user = await User.findById(req.params.id)
  if (!user) {
    throw new ApiError(404, "User not found")
  }

  await deleteUserAccount(user._id.toString())
  res.json({ message: "User deleted successfully" })
})

const getMyActivity = asyncHandler(async (req, res) => {
  const [posts, comments, predictions, favorites] = await Promise.all([
    CommunityPost.find({ author: req.user._id }).sort({ createdAt: -1 }).limit(5),
    Comment.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(5),
    Prediction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(5),
    Favorite.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(12),
  ])

  res.json({
    posts: posts.map((post) => ({
      id: post._id.toString(),
      title: post.title,
      excerpt: post.content.length > 160 ? `${post.content.slice(0, 160)}...` : post.content,
      category: post.category,
      createdAt: post.createdAt,
      timeAgo: getTimeAgoThai(post.createdAt),
      likes: post.likesCount,
      comments: post.commentsCount,
    })),
    comments: comments.map((comment) => ({
      id: comment._id.toString(),
      content: comment.content,
      targetType: comment.targetType,
      targetId: comment.targetId,
      createdAt: comment.createdAt,
      timeAgo: getTimeAgoThai(comment.createdAt),
    })),
    predictions: predictions.map((prediction) => ({
      id: prediction._id.toString(),
      fixtureId: prediction.fixtureId,
      homeTeam: prediction.homeTeam,
      awayTeam: prediction.awayTeam,
      predictedScore: prediction.predictedScore,
      confidence: prediction.confidence,
      createdAt: prediction.createdAt,
      timeAgo: getTimeAgoThai(prediction.createdAt),
    })),
    saved: {
      articles: favorites
        .filter((item) => item.itemType === "article")
        .map((item) => ({
          id: item._id.toString(),
          itemId: item.itemId,
          title: item.title,
          subtitle: item.subtitle,
          image: item.image,
          createdAt: item.createdAt,
          timeAgo: getTimeAgoThai(item.createdAt),
        })),
      posts: favorites
        .filter((item) => item.itemType === "post")
        .map((item) => ({
          id: item._id.toString(),
          itemId: item.itemId,
          title: item.title,
          subtitle: item.subtitle,
          image: item.image,
          createdAt: item.createdAt,
          timeAgo: getTimeAgoThai(item.createdAt),
        })),
      players: favorites
        .filter((item) => item.itemType === "player")
        .map((item) => ({
          id: item._id.toString(),
          itemId: item.itemId,
          title: item.title,
          subtitle: item.subtitle,
          image: item.image,
          createdAt: item.createdAt,
          timeAgo: getTimeAgoThai(item.createdAt),
        })),
      teams: favorites
        .filter((item) => item.itemType === "team")
        .map((item) => ({
          id: item._id.toString(),
          itemId: item.itemId,
          title: item.title,
          subtitle: item.subtitle,
          image: item.image,
          createdAt: item.createdAt,
          timeAgo: getTimeAgoThai(item.createdAt),
        })),
    },
  })
})

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    favoriteTeam: user.favoriteTeam,
    bio: user.bio,
    role: user.role,
    createdAt: user.createdAt,
  }
}

module.exports = {
  deleteUser,
  getMyActivity,
  getUserById,
  listUsers,
  listUsersValidation,
  updateUser,
  updateUserValidation,
  userIdValidation,
}
