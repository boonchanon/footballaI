const CommunityPost = require("../models/community-post.model")
const Comment = require("../models/comment.model")
const PostLike = require("../models/post-like.model")

const listPosts = async ({ q, page = 1, limit = 20 }) => {
  const filter = q
    ? {
        $or: [{ title: { $regex: q, $options: "i" } }, { content: { $regex: q, $options: "i" } }],
      }
    : {}

  const skip = (page - 1) * limit
  const [posts, total] = await Promise.all([
    CommunityPost.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("author", "name email avatar"),
    CommunityPost.countDocuments(filter),
  ])

  return { posts, total }
}

const getPostById = async (id) => {
  return CommunityPost.findById(id).populate("author", "name email avatar")
}

const createPost = async ({ title, content, authorId }) => {
  return CommunityPost.create({
    title,
    content,
    author: authorId,
    status: "published",
  })
}

const updatePost = async ({ id, title, content }) => {
  return CommunityPost.findByIdAndUpdate(id, { title, content }, { new: true })
}

const deletePost = async (id) => {
  return CommunityPost.findByIdAndDelete(id)
}

const listComments = async ({ postId }) => {
  return Comment.find({ targetType: "post", targetId: String(postId) }).sort({ createdAt: -1 }).populate("user", "name email avatar")
}

const createComment = async ({ postId, authorId, content }) => {
  return Comment.create({
    user: authorId,
    targetType: "post",
    targetId: String(postId),
    content,
    isApproved: true,
  })
}

const findLike = async ({ postId, userId }) => {
  return PostLike.findOne({ post: postId, user: userId })
}

const createLike = async ({ postId, userId }) => {
  return PostLike.create({ post: postId, user: userId })
}

const deleteLike = async ({ postId, userId }) => {
  return PostLike.findOneAndDelete({ post: postId, user: userId })
}

const countPostLikes = async (postId) => {
  return PostLike.countDocuments({ post: postId })
}

module.exports = {
  listPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  listComments,
  createComment,
  findLike,
  createLike,
  deleteLike,
  countPostLikes,
}
