const express = require("express")

const adminRoutes = require("./admin.routes")
const authRoutes = require("./auth.routes")
const commentRoutes = require("./comment.routes")
const communityRoutes = require("./community.routes")
const favoriteRoutes = require("./favorite.routes")
const footballRoutes = require("./football.routes")
const newsRoutes = require("./news.routes")
const predictionRoutes = require("./prediction.routes")
const userRoutes = require("./user.routes")

const router = express.Router()

router.use("/auth", authRoutes)
router.use("/users", userRoutes)
router.use("/favorites", favoriteRoutes)
router.use("/comments", commentRoutes)
router.use("/community", communityRoutes)
router.use("/predictions", predictionRoutes)
router.use("/football", footballRoutes)
router.use("/news", newsRoutes)
router.use("/admin", adminRoutes)

module.exports = router
