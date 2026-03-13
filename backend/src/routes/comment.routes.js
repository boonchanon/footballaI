const express = require("express")

const { createComment, createCommentValidation, deleteComment, deleteCommentValidation, listComments, listCommentsValidation } = require("../controllers/comment.controller")
const { requireAuth } = require("../middleware/auth")

const router = express.Router()

router.get("/", listCommentsValidation, listComments)
router.post("/", requireAuth, createCommentValidation, createComment)
router.delete("/:id", requireAuth, deleteCommentValidation, deleteComment)

module.exports = router
