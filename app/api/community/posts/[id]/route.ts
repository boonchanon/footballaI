import { NextRequest } from "next/server"

import { getAuthUser, requireAuthUser } from "@/lib/server/auth"
import { mapCommunityPost } from "@/lib/server/community"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, getTimeAgoThai, ok } from "@/lib/server/http"
import { Comment, CommunityPost, PostLike } from "@/lib/server/models"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    const { id } = await params
    const viewer = await getAuthUser(request)
    const post = await CommunityPost.findById(id).populate("author", "name avatar favoriteTeam role")

    if (!post || (post.status !== "published" && viewer?.role !== "admin")) {
      return errorResponse("Post not found", 404)
    }

    await CommunityPost.findByIdAndUpdate(post._id, { $inc: { viewsCount: 1 } })
    const isLiked = viewer ? await PostLike.exists({ post: post._id, user: viewer._id }) : false
    const comments = await Comment.find({ targetType: "post", targetId: post._id.toString(), isApproved: true })
      .populate("user", "name avatar favoriteTeam")
      .sort({ createdAt: -1 })

    return ok({
      item: {
        ...mapCommunityPost(post, viewer, new Set(isLiked ? [post._id.toString()] : [])),
        views: post.viewsCount + 1,
      },
      comments: comments.map((comment: any) => ({
        id: comment._id.toString(),
        content: comment.content,
        createdAt: comment.createdAt,
        timeAgo: getTimeAgoThai(comment.createdAt),
        user: {
          id: comment.user?._id?.toString?.() || "",
          name: comment.user?.name || "ผู้ใช้งาน",
          avatar: comment.user?.avatar || "",
        },
      })),
    })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Failed to load post", 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const { id } = await params
    const post = await CommunityPost.findById(id)

    if (!post) return errorResponse("Post not found", 404)
    if (user.role !== "admin" && post.author.toString() !== user._id.toString()) {
      return errorResponse("Not allowed to delete this post", 403)
    }

    await Promise.all([
      CommunityPost.findByIdAndDelete(post._id),
      PostLike.deleteMany({ post: post._id }),
      Comment.deleteMany({ targetType: "post", targetId: post._id.toString() }),
    ])

    return ok({ message: "Post deleted" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete post"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const { id } = await params
    const post = await CommunityPost.findById(id)

    if (!post) return errorResponse("Post not found", 404)
    if (user.role !== "admin" && post.author.toString() !== user._id.toString()) {
      return errorResponse("Not allowed to edit this post", 403)
    }

    const body = await request.json()
    const title = String(body.title || "").trim()
    const content = String(body.content || "").trim()
    const category = String(body.category || "").trim()

    if (title.length < 4 || title.length > 180 || content.length < 8 || content.length > 5000) {
      return errorResponse("Validation failed", 422)
    }

    const allowedCategories = new Set(["match-discussion", "transfer-rumors", "player-discussion", "predictions", "general"])
    if (!allowedCategories.has(category)) {
      return errorResponse("Validation failed", 422)
    }

    post.title = title
    post.content = content
    post.category = category
    await post.save()
    await post.populate("author", "name avatar favoriteTeam role")

    return ok({
      item: mapCommunityPost(post, user),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update post"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
