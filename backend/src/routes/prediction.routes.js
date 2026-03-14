const express = require("express")

const { createPrediction, createPredictionValidation, listPredictions, listPredictionsValidation } = require("../controllers/prediction.controller")
const { requireAuth } = require("../middleware/auth")

const router = express.Router()

router.get("/", requireAuth, listPredictionsValidation, listPredictions)
router.post("/", requireAuth, createPredictionValidation, createPrediction)

module.exports = router
