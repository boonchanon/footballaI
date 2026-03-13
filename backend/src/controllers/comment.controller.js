const { body, param, query } = require("express-validator")

const Comment = require("../models/comment.model")
const { ApiError } = require("../utils/api-error")
const { asyncHandler } = require("../utils/async-handler")
const { normalizePagination } = require("../utils/football")
const { ensureValidRequest } = require("../utils/validators")

const createCommentValidation = [
  body("targetType").isIn(["match", "team", "player", "article", "prediction", "post"]),
  body("targetId").trim().notEmpty(),
  body("content").trim().isLength({ min: 1, max: 1000 })
]

const listCommentsValidation = [
  query("targetType").optional().isIn(["match", "team", "player", "article", "prediction", "post"]),
  query("targetId").optional().isString(),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 })
]

const deleteCommentValidation = [param("id").isMongoId()]

const listComments = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const { page, limit, skip } = normalizePagination(req.query)

  const filter = {}
  if (req.query.targetType) filter.targetType = req.query.targetType
  if (req.query.targetId) filter.targetId = req.query.targetId

  const [items, total] = await Promise.all([
    Comment.find(filter).populate("user", "name avatar favoriteTeam").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Comment.countDocuments(filter)
  ])

  res.json({
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  })
})

const createComment = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const comment = await Comment.create({
    user: req.user._id,
    targetType: req.body.targetType,
    targetId: req.body.targetId,
    content: req.body.content
  })

  const populated = await comment.populate("user", "name avatar favoriteTeam")
  res.status(201).json({ item: populated })
})

const deleteComment = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const filter = { _id: req.params.id }
  if (req.user.role !== "admin") {
    filter.user = req.user._id
  }

  const comment = await Comment.findOneAndDelete(filter)
  if (!comment) {
    throw new ApiError(404, "Comment not found")
  }

  res.json({ message: "Comment deleted" })
})

module.exports = {
  createComment,
  createCommentValidation,
  deleteComment,
  deleteCommentValidation,
  listComments,
  listCommentsValidation
}
