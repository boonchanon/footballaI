const { body, query } = require("express-validator")

const Prediction = require("../models/prediction.model")
const { asyncHandler } = require("../utils/async-handler")
const { normalizePagination } = require("../utils/football")
const { ensureValidRequest } = require("../utils/validators")
const { buildPrediction } = require("../services/prediction.service")

const createPredictionValidation = [
  body("homeTeam").trim().notEmpty(),
  body("awayTeam").trim().notEmpty(),
  body("model").optional().isString(),
  body("fixtureId").optional().isString()
]

const listPredictionsValidation = [query("page").optional().isInt({ min: 1 }), query("limit").optional().isInt({ min: 1, max: 100 })]

const createPrediction = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const predictionPayload = buildPrediction(req.body)

  const prediction = await Prediction.create({
    ...predictionPayload,
    user: req.user ? req.user._id : null
  })

  res.status(201).json(prediction)
})

const listPredictions = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const { page, limit, skip } = normalizePagination(req.query)
  const filter = req.user ? { user: req.user._id } : {}

  const [items, total] = await Promise.all([
    Prediction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Prediction.countDocuments(filter)
  ])

  res.json({
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  })
})

module.exports = {
  createPrediction,
  createPredictionValidation,
  listPredictions,
  listPredictionsValidation
}
