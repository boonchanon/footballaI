import { NextRequest } from "next/server"

import { requireAdminRoles } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http-utils"
import { Comment, CommunityPost, CommunityReport } from "@/lib/server/models"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    await requireAdminRoles(request, ["superadmin", "admincommunity"])
    const { id } = await params
    const body = await request.json()
    const status = String(body.status || "").trim()
    const resolutionNote = typeof body.resolutionNote === "string" ? body.resolutionNote.trim() : ""
    const postAction = typeof body.postAction === "string" ? body.postAction.trim() : ""

    if (!["resolved", "dismissed"].includes(status)) return errorResponse("Validation failed", 422)

    const report = await CommunityReport.findById(id)
    if (!report) return errorResponse("Report not found", 404)

    report.status = status
    report.resolutionNote = resolutionNote
    await report.save()

    if (report.post) {
      const post = await CommunityPost.findById(report.post)
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
      if (comment && postAction === "hide") {
        comment.isHidden = true
        comment.hiddenAt = new Date()
        await comment.save()
      }
    }

    return ok({ message: "Report updated" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update report"
    return errorResponse(message, message === "Admin authentication required" ? 401 : message === "Admin permission denied" ? 403 : 500)
  }
}
