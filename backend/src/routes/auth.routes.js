const express = require("express")

const {
  register,
  login,
  getProfile,
  updateProfile,
} = require("../controllers/auth.controller.api")

const { requireAuth } = require("../middleware/auth.middleware")
const { validateRegister, validateLogin, validateUpdateProfile } = require("../validators/auth.validator")

const router = express.Router()

router.post("/register", validateRegister, register)
router.post("/login", validateLogin, login)
router.get("/profile", requireAuth, getProfile)
router.put("/profile", requireAuth, validateUpdateProfile, updateProfile)

module.exports = router
