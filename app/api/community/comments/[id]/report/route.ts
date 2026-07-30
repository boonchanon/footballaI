import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { Comment, CommunityPost, CommunityReport } from "@/lib/server/models"

const reasons = new Set(["spam", "abuse", "hate", "off-topic", "harassment", "inappropriate", "misinformation", "gambling", "other"])

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const { id } = await params
    const body = await request.json()
    const reason = String(body.reason || "")
    const description = typeof body.description === "string" ? body.description.trim() : ""

    if (!reasons.has(reason) || description.length > 1000) {
      return errorResponse("Validation failed", 422)
    }

    const comment = await Comment.findById(id).select("_id user targetType targetId parentComment isDeleted isHidden")
    if (!comment || comment.isDeleted) return errorResponse("Comment not found", 404)
    if (comment.user.toString() === user._id.toString()) {
      return errorResponse("You cannot report your own comment", 400)
    }

    const targetType = comment.parentComment ? "reply" : "comment"
    const targetId = comment._id.toString()
    const existing = await CommunityReport.findOne({ targetType, targetId, reporter: user._id }).select("_id")
    if (existing) return errorResponse("You already reported this content", 409)

    const post = comment.targetType === "post" ? await CommunityPost.findById(comment.targetId).select("_id reportsCount") : null
    const item = await CommunityReport.create({
      post: post?._id || null,
      comment: comment._id,
      targetType,
      targetId,
      reporter: user._id,
      reason,
      description,
    })

    if (post) {
      post.reportsCount = Number(post.reportsCount || 0) + 1
      await post.save()
    }

    return ok({ item }, { status: 201 })
  } catch (error: any) {
    if (error?.code === 11000) return errorResponse("You already reported this content", 409)
    const message = error instanceof Error ? error.message : "Failed to report comment"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
