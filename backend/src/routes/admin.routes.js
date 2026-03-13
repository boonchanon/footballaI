const express = require("express")

const { dashboard } = require("../controllers/admin.controller")
const { requireAdmin, requireAuth } = require("../middleware/auth")

const router = express.Router()

router.get("/dashboard", requireAuth, requireAdmin, dashboard)

module.exports = router
