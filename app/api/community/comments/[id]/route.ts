import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, getTimeAgoThai, ok } from "@/lib/server/http"
import { Comment, CommunityPost } from "@/lib/server/models"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const { id } = await params
    const body = await request.json()
    const content = String(body.content || "").trim()

    if (!content || content.length > 1000) {
      return errorResponse("Validation failed", 422)
    }

    const comment = await Comment.findById(id).populate("user", "name avatar favoriteTeam")
    if (!comment) return errorResponse("Comment not found", 404)
    if (user.role !== "admin" && comment.user?._id?.toString?.() !== user._id.toString()) {
      return errorResponse("Not allowed to edit this comment", 403)
    }

    comment.content = content
    await comment.save()

    return ok({
      item: {
        id: comment._id.toString(),
        content: comment.content,
        createdAt: comment.createdAt,
        timeAgo: getTimeAgoThai(comment.createdAt),
        user: {
          id: comment.user?._id?.toString?.() || "",
          name: comment.user?.name || "ผู้ใช้งาน",
          avatar: comment.user?.avatar || "",
        },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update comment"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const { id } = await params
    const comment = await Comment.findById(id)

    if (!comment) return errorResponse("Comment not found", 404)
    if (user.role !== "admin" && comment.user.toString() !== user._id.toString()) {
      return errorResponse("Not allowed to delete this comment", 403)
    }

    await Comment.findByIdAndDelete(comment._id)

    if (comment.targetType === "post") {
      await CommunityPost.findByIdAndUpdate(comment.targetId, {
        $inc: { commentsCount: -1 },
      })
    }

    return ok({ message: "Comment deleted" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete comment"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
