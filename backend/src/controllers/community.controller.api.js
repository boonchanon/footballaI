const {
  listAllPosts,
  getPost,
  createNewPost,
  updateExistingPost,
  deleteExistingPost,
  listPostComments,
  addComment,
  togglePostLike,
} = require("../services/community.service")
const { sendSuccess } = require("../utils/response")

const listPosts = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 20 } = req.query
    const data = await listAllPosts({ q, page: Number(page), limit: Number(limit) })
    return sendSuccess(res, data, "Posts retrieved")
  } catch (error) {
    next(error)
  }
}

const getPostById = async (req, res, next) => {
  try {
    const data = await getPost(Number(req.params.id))
    return sendSuccess(res, data, "Post retrieved")
  } catch (error) {
    next(error)
  }
}

const createPost = async (req, res, next) => {
  try {
    const data = await createNewPost({ title: req.body.title, content: req.body.content, authorId: req.user._id || req.user.id })
    return sendSuccess(res, data, "Post created", 201)
  } catch (error) {
    next(error)
  }
}

const updatePost = async (req, res, next) => {
  try {
    const data = await updateExistingPost({ id: req.params.id, title: req.body.title, content: req.body.content, userId: req.user._id || req.user.id })
    return sendSuccess(res, data, "Post updated")
  } catch (error) {
    next(error)
  }
}

const deletePost = async (req, res, next) => {
  try {
    await deleteExistingPost({ id: req.params.id, userId: req.user._id || req.user.id })
    return sendSuccess(res, {}, "Post deleted")
  } catch (error) {
    next(error)
  }
}

const listComments = async (req, res, next) => {
  try {
    const data = await listPostComments({ postId: req.params.id })
    return sendSuccess(res, data, "Comments retrieved")
  } catch (error) {
    next(error)
  }
}

const createPostComment = async (req, res, next) => {
  try {
    const data = await addComment({ postId: req.params.id, authorId: req.user._id || req.user.id, content: req.body.content })
    return sendSuccess(res, data, "Comment added", 201)
  } catch (error) {
    next(error)
  }
}

const toggleLike = async (req, res, next) => {
  try {
    const data = await togglePostLike({ postId: req.params.id, userId: req.user._id || req.user.id })
    return sendSuccess(res, data, "Like toggled")
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  listComments,
  createPostComment,
  toggleLike,
}
