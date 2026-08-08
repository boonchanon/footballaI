const express = require("express")

const {
  listPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  listComments,
  createPostComment,
  toggleLike,
} = require("../controllers/community.controller.api")
const { requireAuth } = require("../middleware/auth.middleware")
const {
  validatePostId,
  validatePostCreate,
  validatePostUpdate,
  validateCommentCreate,
} = require("../validators/community.validator")

const router = express.Router()

router.get("/", listPosts)
router.get("/:id", validatePostId, getPostById)
router.post("/", requireAuth, validatePostCreate, createPost)
router.put("/:id", requireAuth, validatePostId, validatePostUpdate, updatePost)
router.delete("/:id", requireAuth, validatePostId, deletePost)
router.get("/:id/comments", validatePostId, listComments)
router.post("/:id/comments", requireAuth, validatePostId, validateCommentCreate, createPostComment)
router.post("/:id/like", requireAuth, validatePostId, toggleLike)
router.delete("/:id/like", requireAuth, validatePostId, toggleLike)

module.exports = router
