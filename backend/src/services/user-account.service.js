const Comment = require("../models/comment.model")
const CommunityPost = require("../models/community-post.model")
const CommunityReport = require("../models/community-report.model")
const Favorite = require("../models/favorite.model")
const PostLike = require("../models/post-like.model")
const Prediction = require("../models/prediction.model")
const User = require("../models/user.model")

async function deleteUserAccount(userId) {
  const authoredPosts = await CommunityPost.find({ author: userId }).select("_id")
  const postIds = authoredPosts.map((post) => post._id)
  const postIdStrings = postIds.map((id) => id.toString())

  const likedPosts = await PostLike.find({ user: userId }).select("post")
  const likedPostIds = likedPosts.map((item) => item.post?.toString?.()).filter(Boolean)

  const commentedPosts = await Comment.find({ user: userId, targetType: "post" }).select("targetId")
  const commentedPostIds = commentedPosts.map((item) => item.targetId).filter(Boolean)

  await Promise.all([
    Favorite.deleteMany({ user: userId }),
    Prediction.deleteMany({ user: userId }),
    CommunityReport.deleteMany({ reporter: userId }),
    Comment.deleteMany({ user: userId }),
    PostLike.deleteMany({ user: userId }),
    CommunityReport.deleteMany({ post: { $in: postIds } }),
    Comment.deleteMany({ targetType: "post", targetId: { $in: postIdStrings } }),
    PostLike.deleteMany({ post: { $in: postIds } }),
    CommunityPost.deleteMany({ author: userId }),
    User.findByIdAndDelete(userId),
  ])

  if (likedPostIds.length > 0) {
    await CommunityPost.updateMany({ _id: { $in: likedPostIds } }, { $inc: { likesCount: -1 } })
    await CommunityPost.updateMany({ likesCount: { $lt: 0 } }, { $set: { likesCount: 0 } })
  }

  if (commentedPostIds.length > 0) {
    const counts = commentedPostIds.reduce((acc, postId) => {
      acc[postId] = (acc[postId] || 0) + 1
      return acc
    }, {})

    await Promise.all(
      Object.entries(counts).map(([postId, count]) =>
        CommunityPost.findByIdAndUpdate(postId, {
          $inc: { commentsCount: -count },
        }),
      ),
    )
    await CommunityPost.updateMany({ commentsCount: { $lt: 0 } }, { $set: { commentsCount: 0 } })
  }
}

module.exports = { deleteUserAccount }
