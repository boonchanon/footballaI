import { NextRequest } from "next/server"

import { getAuthUser, requireAuthUser } from "@/lib/server/auth"
import { mapCommunityPost } from "@/lib/server/community"
import { getLegacyComments, getLegacyLikeState } from "@/lib/server/community-admin"
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

    const nextViews = Math.max(Number(post.viewsCount || 0), Number(post.views || 0)) + 1
    post.viewsCount = nextViews
    if (typeof post.views === "number") {
      post.views = nextViews
    }
    await post.save()

    const isLiked = viewer ? await PostLike.exists({ post: post._id, user: viewer._id }) : false
    const legacyLiked = viewer ? getLegacyLikeState(post, viewer._id.toString()) : false

    const dbComments = await Comment.find({ targetType: "post", targetId: post._id.toString(), isApproved: true })
      .populate("user", "name avatar favoriteTeam")
      .sort({ createdAt: -1 })

    const comments =
      dbComments.length > 0
        ? dbComments.map((comment: any) => ({
            id: comment._id.toString(),
            content: comment.content,
            createdAt: comment.createdAt,
            timeAgo: getTimeAgoThai(comment.createdAt),
            user: {
              id: comment.user?._id?.toString?.() || "",
              name: comment.user?.name || "?????????",
              avatar: comment.user?.avatar || "",
            },
          }))
        : getLegacyComments(post).map((comment: any, index: number) => ({
            id: comment?._id?.toString?.() || `legacy-${post._id.toString()}-${index}`,
            content: comment?.content || comment?.text || "",
            createdAt: comment?.createdAt || post.createdAt,
            timeAgo: getTimeAgoThai(comment?.createdAt || post.createdAt),
            user: {
              id: comment?.user?._id?.toString?.() || comment?.user?.toString?.() || "",
              name: comment?.user?.name || comment?.authorName || "?????????",
              avatar: comment?.user?.avatar || "",
            },
          }))

    return ok({
      item: {
        ...mapCommunityPost(post, viewer, new Set(isLiked || legacyLiked ? [post._id.toString()] : [])),
      },
      comments,
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

    const sharedPostId =
      post.sharedItem && typeof post.sharedItem === "object" && post.sharedItem.type === "post" && typeof post.sharedItem.postId === "string"
        ? post.sharedItem.postId
        : ""

    await Promise.all([
      CommunityPost.findByIdAndDelete(post._id),
      sharedPostId ? CommunityPost.findByIdAndUpdate(sharedPostId, { $inc: { repostsCount: -1 } }) : Promise.resolve(null),
      PostLike.deleteMany({ post: post._id }),
      Comment.deleteMany({ targetType: "post", targetId: post._id.toString() }),
    ])

    if (sharedPostId) {
      await CommunityPost.updateOne({ _id: sharedPostId, repostsCount: { $lt: 0 } }, { $set: { repostsCount: 0 } })
    }

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
