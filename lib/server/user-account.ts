import { Comment, CommunityPost, CommunityReport, Favorite, PostLike, Prediction, User } from "./models"

export async function deleteUserAccount(userId: string) {
  const authoredPosts = await CommunityPost.find({ author: userId }).select("_id")
  const postIds = authoredPosts.map((post: any) => post._id)
  const postIdStrings = postIds.map((id: any) => id.toString())

  const likedPosts = await PostLike.find({ user: userId }).select("post")
  const likedPostIds = likedPosts.map((item: any) => item.post?.toString?.()).filter(Boolean)

  const commentedPosts = await Comment.find({ user: userId, targetType: "post" }).select("targetId")
  const commentedPostIds = commentedPosts.map((item: any) => item.targetId).filter(Boolean)

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
    const counts = commentedPostIds.reduce<Record<string, number>>((acc, postId) => {
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
