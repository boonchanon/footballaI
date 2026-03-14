const { body, param, query } = require("express-validator")

const Favorite = require("../models/favorite.model")
const { ApiError } = require("../utils/api-error")
const { asyncHandler } = require("../utils/async-handler")
const { normalizePagination } = require("../utils/football")
const { ensureValidRequest } = require("../utils/validators")

const favoriteValidation = [
  body("itemType").isIn(["team", "player", "match", "article", "post"]),
  body("itemId").trim().notEmpty(),
  body("title").trim().notEmpty(),
  body("subtitle").optional().isString(),
  body("image").optional().isString()
]

const listFavoritesValidation = [query("page").optional().isInt({ min: 1 }), query("limit").optional().isInt({ min: 1, max: 100 })]
const removeFavoriteValidation = [param("id").isMongoId()]

const listFavorites = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const { page, limit, skip } = normalizePagination(req.query)
  const filter = { user: req.user._id }

  const [items, total] = await Promise.all([
    Favorite.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Favorite.countDocuments(filter)
  ])

  res.json({
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  })
})

const createFavorite = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const payload = {
    user: req.user._id,
    itemType: req.body.itemType,
    itemId: req.body.itemId,
    title: req.body.title,
    subtitle: req.body.subtitle || "",
    image: req.body.image || "",
    meta: req.body.meta || {}
  }

  const existing = await Favorite.findOne({
    user: payload.user,
    itemType: payload.itemType,
    itemId: payload.itemId
  })

  if (existing) {
    throw new ApiError(409, "Favorite already exists")
  }

  const favorite = await Favorite.create(payload)
  res.status(201).json({ item: favorite })
})

const removeFavorite = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const favorite = await Favorite.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id
  })

  if (!favorite) {
    throw new ApiError(404, "Favorite not found")
  }

  res.json({ message: "Favorite removed" })
})

module.exports = {
  createFavorite,
  favoriteValidation,
  listFavorites,
  listFavoritesValidation,
  removeFavorite,
  removeFavoriteValidation
}
