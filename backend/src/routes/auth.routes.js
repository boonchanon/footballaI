const express = require("express")

const { changePassword, changePasswordValidation, login, loginValidation, me, register, registerValidation, updateProfile, updateProfileValidation } = require("../controllers/auth.controller")
const { requireAuth } = require("../middleware/auth")

const router = express.Router()

router.post("/register", registerValidation, register)
router.post("/login", loginValidation, login)
router.get("/me", requireAuth, me)
router.patch("/me", requireAuth, updateProfileValidation, updateProfile)
router.patch("/change-password", requireAuth, changePasswordValidation, changePassword)

module.exports = router
