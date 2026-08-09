import { NextRequest } from "next/server"

import { requireAdminRoles } from "@/lib/server/auth"
import {
  applyUserModerationAction,
  createModerationLog,
  normalizeRestrictionDuration,
  notifyUserModerationAction,
  type UserModerationAction,
} from "@/lib/server/content-moderation"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http-utils"
import { Comment, CommunityPost, CommunityReport } from "@/lib/server/models"

const USER_ACTIONS = new Set<UserModerationAction>(["warn", "restrict", "clear_restriction", "suspend", "unsuspend", "ban", "unban"])

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    const admin = await requireAdminRoles(request, ["superadmin", "admincommunity"])
    const { id } = await params
    const body = await request.json()
    const status = String(body.status || "").trim()
    const resolutionNote = typeof body.resolutionNote === "string" ? body.resolutionNote.trim() : ""
    const postAction = typeof body.postAction === "string" ? body.postAction.trim() : ""
    const userAction = String(body.userAction || "").trim() as "" | UserModerationAction
    const duration = normalizeRestrictionDuration(body.duration)

    if (!["resolved", "dismissed"].includes(status)) return errorResponse("Validation failed", 422)
    if (resolutionNote.length < 6) return errorResponse("Resolution reason is required", 422)

    const report = await CommunityReport.findById(id)
    if (!report) return errorResponse("Report not found", 404)

    const previousStatus = report.status
    report.status = status
    report.resolutionNote = resolutionNote
    await report.save()

    const targetPostId = report.post?.toString?.() || report.targetId || ""
    const post = targetPostId ? await CommunityPost.findById(targetPostId) : null
    let targetAuthorId = ""
    if (post) {
      targetAuthorId = post.author?.toString?.() || ""
      if (post) {
        if (status === "dismissed") {
          const remainingPending = await CommunityReport.countDocuments({ post: post._id, status: "pending" })
          if (remainingPending === 0 && post.status === "flagged") post.status = "published"
        }

        if (status === "resolved") {
          if (postAction === "hide") post.status = "hidden"
          else if (postAction === "publish") post.status = "published"
          else if (post.status === "published") post.status = "flagged"
        }

        await post.save()
      }
    }

    if (report.comment && status === "resolved") {
      const comment = await Comment.findById(report.comment)
      if (comment) targetAuthorId = comment.user?.toString?.() || targetAuthorId
      if (comment && postAction === "hide") {
        comment.isHidden = true
        comment.hiddenAt = new Date()
        await comment.save()
      }
    }

    if (userAction) {
      if (!USER_ACTIONS.has(userAction)) return errorResponse("Validation failed", 422)
      if (!targetAuthorId) return errorResponse("Target author not found", 404)
      await applyUserModerationAction({ userId: targetAuthorId, action: userAction, duration })
      await notifyUserModerationAction({
        recipientId: targetAuthorId,
        action: userAction,
        referenceType: report.targetType || "report",
        referenceId: report.targetId || report.post?.toString?.() || report.comment?.toString?.() || id,
      })
    }

    await createModerationLog({
      userId: targetAuthorId || null,
      contentType: report.targetType === "room_message" ? "room_message" : report.targetType === "thread_root" ? "thread_root" : report.targetType === "match_poll" ? "match_poll" : report.comment ? "comment" : "post",
      contentId: report.targetId || report.post?.toString?.() || report.comment?.toString?.() || id,
      status: "approved",
      action: userAction ? `report_${status}_${userAction}` : `report_${status}`,
      provider: "manual",
      reviewedBy: admin._id.toString(),
      metadata: {
        reportId: id,
        previousStatus,
        status,
        postAction,
        reason: resolutionNote,
        actorRole: admin.role,
      },
    })

    return ok({ message: "Report updated" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update report"
    return errorResponse(message, message === "Admin authentication required" ? 401 : message === "Admin permission denied" ? 403 : 500)
  }
}
