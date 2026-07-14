const express = require("express")

const {
  deleteUser,
  getMyActivity,
  getUserById,
  listUsers,
  listUsersValidation,
  updateUser,
  updateUserValidation,
  userIdValidation,
} = require("../controllers/user.controller")
const { requireAdmin, requireAuth } = require("../middleware/auth")

const router = express.Router()

router.get("/me/activity", requireAuth, getMyActivity)
router.get("/", requireAuth, requireAdmin, listUsersValidation, listUsers)
router.get("/:id", requireAuth, requireAdmin, userIdValidation, getUserById)
router.patch("/:id", requireAuth, requireAdmin, updateUserValidation, updateUser)
router.delete("/:id", requireAuth, requireAdmin, userIdValidation, deleteUser)

module.exports = router
