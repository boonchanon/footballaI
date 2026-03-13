const express = require("express")

const {
  createPost,
  createPostComment,
  createPostValidation,
  deletePost,
  getPostById,
  listPosts,
  listPostsValidation,
  postIdValidation,
  createReport,
  createReportValidation,
  listReports,
  listReportsValidation,
  resolveReport,
  resolveReportValidation,
  toggleLike,
  updateModeration,
  updateModerationValidation,
} = require("../controllers/community.controller")
const { requireAdmin, requireAuth } = require("../middleware/auth")

const router = express.Router()

router.get("/posts", listPostsValidation, listPosts)
router.post("/posts", requireAuth, createPostValidation, createPost)
router.get("/reports", requireAuth, requireAdmin, listReportsValidation, listReports)
router.get("/posts/:id", postIdValidation, getPostById)
router.post("/posts/:id/like", requireAuth, postIdValidation, toggleLike)
router.post("/posts/:id/comments", requireAuth, postIdValidation, createPostComment)
router.post("/posts/:id/report", requireAuth, createReportValidation, createReport)
router.patch("/posts/:id/moderation", requireAuth, requireAdmin, updateModerationValidation, updateModeration)
router.patch("/reports/:id", requireAuth, requireAdmin, resolveReportValidation, resolveReport)
router.delete("/posts/:id", requireAuth, postIdValidation, deletePost)

module.exports = router
