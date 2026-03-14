import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, getTimeAgoThai, ok } from "@/lib/server/http"
import { Comment, CommunityPost, Favorite, Prediction } from "@/lib/server/models"

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)

    const [posts, comments, predictions, favorites] = await Promise.all([
      CommunityPost.find({ author: user._id }).sort({ createdAt: -1 }).limit(5),
      Comment.find({ user: user._id }).sort({ createdAt: -1 }).limit(5),
      Prediction.find({ user: user._id }).sort({ createdAt: -1 }).limit(5),
      Favorite.find({ user: user._id }).sort({ createdAt: -1 }).limit(12),
    ])

    return ok({
      posts: posts.map((post: any) => ({
        id: post._id.toString(),
        title: post.title,
        excerpt: post.content.length > 160 ? `${post.content.slice(0, 160)}...` : post.content,
        category: post.category,
        createdAt: post.createdAt,
        timeAgo: getTimeAgoThai(post.createdAt),
        likes: post.likesCount,
        comments: post.commentsCount,
      })),
      comments: comments.map((comment: any) => ({
        id: comment._id.toString(),
        content: comment.content,
        targetType: comment.targetType,
        targetId: comment.targetId,
        createdAt: comment.createdAt,
        timeAgo: getTimeAgoThai(comment.createdAt),
      })),
      predictions: predictions.map((prediction: any) => ({
        id: prediction._id.toString(),
        fixtureId: prediction.fixtureId,
        homeTeam: prediction.homeTeam,
        awayTeam: prediction.awayTeam,
        predictedScore: prediction.predictedScore,
        confidence: prediction.confidence,
        createdAt: prediction.createdAt,
        timeAgo: getTimeAgoThai(prediction.createdAt),
      })),
      saved: {
        articles: favorites.filter((item: any) => item.itemType === "article").map((item: any) => ({
          id: item._id.toString(),
          itemId: item.itemId,
          title: item.title,
          subtitle: item.subtitle,
          image: item.image,
          createdAt: item.createdAt,
          timeAgo: getTimeAgoThai(item.createdAt),
        })),
        posts: favorites.filter((item: any) => item.itemType === "post").map((item: any) => ({
          id: item._id.toString(),
          itemId: item.itemId,
          title: item.title,
          subtitle: item.subtitle,
          image: item.image,
          createdAt: item.createdAt,
          timeAgo: getTimeAgoThai(item.createdAt),
        })),
        players: favorites.filter((item: any) => item.itemType === "player").map((item: any) => ({
          id: item._id.toString(),
          itemId: item.itemId,
          title: item.title,
          subtitle: item.subtitle,
          image: item.image,
          createdAt: item.createdAt,
          timeAgo: getTimeAgoThai(item.createdAt),
        })),
        teams: favorites.filter((item: any) => item.itemType === "team").map((item: any) => ({
          id: item._id.toString(),
          itemId: item.itemId,
          title: item.title,
          subtitle: item.subtitle,
          image: item.image,
          createdAt: item.createdAt,
          timeAgo: getTimeAgoThai(item.createdAt),
        })),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load activity"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
