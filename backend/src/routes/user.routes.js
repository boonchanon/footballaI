const express = require("express")

const { getMyActivity, listUsers, listUsersValidation } = require("../controllers/user.controller")
const { requireAdmin, requireAuth } = require("../middleware/auth")

const router = express.Router()

router.get("/me/activity", requireAuth, getMyActivity)
router.get("/", requireAuth, requireAdmin, listUsersValidation, listUsers)

module.exports = router
