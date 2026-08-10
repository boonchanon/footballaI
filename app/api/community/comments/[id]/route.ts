import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import {
  assertCommunityPostingAllowed,
  assertCommunityInteractionAllowed,
  createModerationLog,
  moderateCommunityText,
} from "@/lib/server/content-moderation"
import { canManageCommunityAdmin } from "@/lib/admin-access"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, getTimeAgoThai, ok } from "@/lib/server/http"
import { Comment, CommunityPost } from "@/lib/server/models"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    await assertCommunityPostingAllowed(user._id.toString())
    const { id } = await params
    const body = await request.json()
    const action = typeof body.action === "string" ? body.action : ""
    const content = String(body.content || "").trim()

    const comment = await Comment.findById(id).populate("user", "name avatar favoriteTeam")
    if (!comment || comment.isDeleted) return errorResponse("Comment not found", 404)

    const isOwner = comment.user?._id?.toString?.() === user._id.toString()
    const canModerate = canManageCommunityAdmin(user.role)
    if (!isOwner && !canModerate) {
      return errorResponse("Not allowed to update this comment", 403)
    }

    if (action === "hide" || action === "unhide") {
      if (!canModerate) return errorResponse("Not allowed to moderate this comment", 403)
      comment.isHidden = action === "hide"
      comment.hiddenAt = action === "hide" ? new Date() : null
      comment.hiddenBy = action === "hide" ? user._id : null
      await comment.save()
      return ok({ success: true, isHidden: comment.isHidden })
    }

    if (!content || content.length > 1000) {
      return errorResponse("Validation failed", 422)
    }

    const moderation = await moderateCommunityText({ content })
    if (moderation.status === "rejected") {
      await createModerationLog({
        userId: user._id.toString(),
        contentType: "comment",
        contentId: comment._id.toString(),
        status: moderation.status,
        action: "update_rejected",
        reasons: moderation.reasons,
        scores: moderation.scores,
        provider: moderation.provider,
      })
      return errorResponse("Comment rejected by moderation", 422, { reasons: moderation.reasons })
    }

    comment.content = content
    comment.isApproved = moderation.status === "approved"
    comment.lastEditedAt = new Date()
    comment.editVersion = Number(comment.editVersion || 1) + 1
    comment.moderation = {
      ...(comment.moderation?.toObject?.() || comment.moderation || {}),
      ...moderation,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date(),
    }
    await comment.save()

    await createModerationLog({
      userId: user._id.toString(),
      contentType: "comment",
      contentId: comment._id.toString(),
      status: moderation.status,
      action: "updated",
      reasons: moderation.reasons,
      scores: moderation.scores,
      provider: moderation.provider,
    })

    return ok({
      item: {
        id: comment._id.toString(),
        content: comment.content,
        moderationStatus: moderation.status,
        isEdited: true,
        lastEditedAt: comment.lastEditedAt,
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

    if (!comment || comment.isDeleted) return errorResponse("Comment not found", 404)
    const canModerate = canManageCommunityAdmin(user.role)
    if (!canModerate && comment.user.toString() !== user._id.toString()) {
      return errorResponse("Not allowed to delete this comment", 403)
    }
    if (!canModerate) await assertCommunityInteractionAllowed(user._id.toString(), "comment")

    const wasPubliclyVisible = comment.isApproved && (!comment.moderation?.status || comment.moderation?.status === "approved")
    comment.isDeleted = true
    comment.deletedAt = new Date()
    comment.deletedBy = user._id
    comment.content = ""
    comment.isApproved = false
    await comment.save()

    if (comment.targetType === "post" && wasPubliclyVisible) {
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
