const express = require("express")

const { getProfile, updateProfile } = require("../controllers/user.controller.api")
const { requireAuth } = require("../middleware/auth.middleware")
const { validateUpdateProfile } = require("../validators/auth.validator")

const router = express.Router()

router.get("/profile", requireAuth, getProfile)
router.put("/profile", requireAuth, validateUpdateProfile, updateProfile)

module.exports = router
