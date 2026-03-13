const { query } = require("express-validator")

const User = require("../models/user.model")
const { asyncHandler } = require("../utils/async-handler")
const { normalizePagination } = require("../utils/football")
const { ensureValidRequest } = require("../utils/validators")

const listUsersValidation = [query("page").optional().isInt({ min: 1 }), query("limit").optional().isInt({ min: 1, max: 100 })]

const listUsers = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const { page, limit, skip } = normalizePagination(req.query)

  const [items, total] = await Promise.all([
    User.find().select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments()
  ])

  res.json({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  })
})

module.exports = { listUsers, listUsersValidation }
