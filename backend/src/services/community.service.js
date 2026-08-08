const {
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
} = require("../repositories/community.repository")
const { ApiError } = require("../utils/api-error")

const listAllPosts = async ({ q, page, limit }) => {
  return listPosts({ q, page, limit })
}

const getPost = async (id) => {
  const post = await getPostById(id)
  if (!post) {
    throw new ApiError(404, "Post not found")
  }
  return post
}

const createNewPost = async ({ title, content, authorId }) => {
  return createPost({ title, content, authorId })
}

const updateExistingPost = async ({ id, title, content, userId }) => {
  const post = await getPostById(id)
  if (!post) {
    throw new ApiError(404, "Post not found")
  }
  if (String(post.author) !== String(userId)) {
    throw new ApiError(403, "Not authorized")
  }
  return updatePost({ id, title, content })
}

const deleteExistingPost = async ({ id, userId }) => {
  const post = await getPostById(id)
  if (!post) {
    throw new ApiError(404, "Post not found")
  }
  if (String(post.author) !== String(userId)) {
    throw new ApiError(403, "Not authorized")
  }
  return deletePost(id)
}

const listPostComments = async ({ postId }) => {
  return listComments({ postId })
}

const addComment = async ({ postId, authorId, content }) => {
  const post = await getPostById(postId)
  if (!post) {
    throw new ApiError(404, "Post not found")
  }
  return createComment({ postId, authorId, content })
}

const togglePostLike = async ({ postId, userId }) => {
  const post = await getPostById(postId)
  if (!post) {
    throw new ApiError(404, "Post not found")
  }

  const existingLike = await findLike({ postId, userId })
  if (existingLike) {
    await deleteLike({ postId, userId })
    const count = await countPostLikes(postId)
    return { liked: false, likes: count }
  }

  await createLike({ postId, userId })
  const count = await countPostLikes(postId)
  return { liked: true, likes: count }
}

module.exports = {
  listAllPosts,
  getPost,
  createNewPost,
  updateExistingPost,
  deleteExistingPost,
  listPostComments,
  addComment,
  togglePostLike,
}
