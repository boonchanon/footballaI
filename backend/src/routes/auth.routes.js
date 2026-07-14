const express = require("express")

const {
  changePassword,
  changePasswordValidation,
  deleteAccount,
  deleteAccountValidation,
  login,
  loginValidation,
  me,
  register,
  registerValidation,
  updateProfile,
  updateProfileValidation,
} = require("../controllers/auth.controller")
const {
  forgotPassword,
  forgotPasswordValidation,
  resetPassword,
  resetPasswordValidation,
  verifyResetOtp,
  verifyResetOtpValidation,
} = require("../controllers/password.controller")
const { requireAuth } = require("../middleware/auth")

const router = express.Router()

router.post("/register", registerValidation, register)
router.post("/login", loginValidation, login)
router.post("/forgot-password", forgotPasswordValidation, forgotPassword)
router.post("/verify-reset-otp", verifyResetOtpValidation, verifyResetOtp)
router.post("/reset-password", resetPasswordValidation, resetPassword)
router.get("/me", requireAuth, me)
router.patch("/me", requireAuth, updateProfileValidation, updateProfile)
router.delete("/me", requireAuth, deleteAccountValidation, deleteAccount)
router.patch("/change-password", requireAuth, changePasswordValidation, changePassword)

module.exports = router
