import { NextRequest } from "next/server"

import { requireAdminRoles } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http-utils"
import { Comment, CommunityPost, CommunityReport, PostLike } from "@/lib/server/models"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    await requireAdminRoles(request, ["superadmin", "admincommunity"])
    const { id } = await params
    const body = await request.json()
    const post = await CommunityPost.findById(id)

    if (!post) return errorResponse("Post not found", 404)

    if (typeof body.isPinned === "boolean") post.isPinned = body.isPinned
    if (typeof body.status === "string") {
      const nextStatus = body.status.trim()
      if (!["published", "flagged", "hidden"].includes(nextStatus)) return errorResponse("Validation failed", 422)
      post.status = nextStatus
      post.moderation = {
        ...(post.moderation?.toObject?.() || post.moderation || {}),
        status: nextStatus === "published" ? "approved" : nextStatus === "hidden" ? "pending_review" : post.moderation?.status || "approved",
        provider: "manual",
        reviewedAt: new Date(),
      }
    }

    await post.save()
    return ok({ message: "Post updated" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update post"
    return errorResponse(message, message === "Admin authentication required" ? 401 : message === "Admin permission denied" ? 403 : 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    await requireAdminRoles(request, ["superadmin", "admincommunity"])
    const { id } = await params
    const post = await CommunityPost.findById(id)

    if (!post) return errorResponse("Post not found", 404)

    await Promise.all([
      CommunityPost.findByIdAndDelete(post._id),
      PostLike.deleteMany({ post: post._id }),
      Comment.deleteMany({ targetType: "post", targetId: post._id.toString() }),
      CommunityReport.deleteMany({ post: post._id }),
    ])

    return ok({ message: "Post deleted" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete post"
    return errorResponse(message, message === "Admin authentication required" ? 401 : message === "Admin permission denied" ? 403 : 500)
  }
}
