const express = require("express")

const authRoutes = require("./auth.routes")
const communityRoutes = require("./community.routes")
const footballDataRoutes = require("./football-data.routes")
const footballRoutes = require("./football.routes")
const searchRoutes = require("./search.routes")
const userRoutes = require("./user.routes")

const router = express.Router()

router.use("/auth", authRoutes)
router.use("/users", userRoutes)
router.use("/posts", communityRoutes)
router.use("/search", searchRoutes)
router.use("/matches", footballDataRoutes)
router.use("/football", footballRoutes)

module.exports = router
