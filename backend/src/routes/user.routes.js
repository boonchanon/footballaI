const express = require("express")

const { listUsers, listUsersValidation } = require("../controllers/user.controller")
const { requireAdmin, requireAuth } = require("../middleware/auth")

const router = express.Router()

router.get("/", requireAuth, requireAdmin, listUsersValidation, listUsers)

module.exports = router
