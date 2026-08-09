import { NextRequest } from "next/server"

import { requireAdminRoles } from "@/lib/server/auth"
import { createModerationLog } from "@/lib/server/content-moderation"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { Comment, CommunityPost, CommunityReport, CommunityStory, PostLike } from "@/lib/server/models"

const ACTIONS = new Set(["hide", "unhide", "pin", "unpin", "official", "unofficial", "delete"])

function sanitizeReason(value: unknown) {
  return String(value || "").trim().slice(0, 500)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    const admin = await requireAdminRoles(request, ["superadmin", "admincommunity"])
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const action = String(body.action || "").trim()
    const type = String(body.type || "post").trim()
    const reason = sanitizeReason(body.reason)

    if (!ACTIONS.has(action)) return errorResponse("Invalid action", 422)
    if (reason.length < 6) return errorResponse("Reason is required", 422)

    if (type === "story") {
      const story = await CommunityStory.findById(id)
      if (!story) return errorResponse("Story not found", 404)
      if (action === "hide") story.status = "hidden"
      else if (action === "unhide") story.status = "published"
      else if (action === "delete") {
        await story.deleteOne()
        await createModerationLog({
          userId: story.author?.toString?.() || null,
          contentType: "story",
          contentId: id,
          status: "approved",
          action: "story_delete",
          provider: "manual",
          reviewedBy: admin._id.toString(),
          metadata: { reason, actorRole: admin.role },
        })
        return ok({ success: true })
      } else {
        return errorResponse("Action is not supported for story", 422)
      }
      story.moderation = {
        ...(story.moderation?.toObject?.() || story.moderation || {}),
        status: action === "hide" ? "pending_review" : "approved",
        provider: "manual",
        reviewedBy: admin._id,
        reviewedAt: new Date(),
        metadata: {
          ...((story.moderation?.metadata?.toObject?.() || story.moderation?.metadata || {}) as Record<string, unknown>),
          adminAction: action,
          adminReason: reason,
        },
      }
      await story.save()
      await createModerationLog({
        userId: story.author?.toString?.() || null,
        contentType: "story",
        contentId: id,
        status: action === "hide" ? "pending_review" : "approved",
        action: `story_${action}`,
        provider: "manual",
        reviewedBy: admin._id.toString(),
        metadata: { reason, actorRole: admin.role },
      })
      return ok({ success: true, status: story.status })
    }

    const post = await CommunityPost.findById(id)
    if (!post) return errorResponse("Content not found", 404)

    if (action === "hide") post.status = "hidden"
    if (action === "unhide") post.status = "published"
    if (action === "pin") post.isPinned = true
    if (action === "unpin") post.isPinned = false
    if (action === "official") {
      if (!post.isThreadRoot) return errorResponse("Only threads can be marked official", 422)
      post.isOfficialThread = true
    }
    if (action === "unofficial") post.isOfficialThread = false

    if (action === "delete") {
      await Promise.all([
        CommunityPost.findByIdAndDelete(post._id),
        PostLike.deleteMany({ post: post._id }),
        Comment.deleteMany({ targetType: "post", targetId: post._id.toString() }),
        CommunityReport.deleteMany({ $or: [{ post: post._id }, { targetId: post._id.toString() }] }),
      ])
      await createModerationLog({
        userId: post.author?.toString?.() || null,
        contentType: post.contentType === "match_poll" ? "match_poll" : post.isThreadRoot ? "thread_root" : "post",
        contentId: id,
        status: "approved",
        action: "content_delete",
        provider: "manual",
        reviewedBy: admin._id.toString(),
        metadata: { reason, actorRole: admin.role, matchId: post.matchId || "", roomType: post.roomType || "" },
      })
      return ok({ success: true })
    }

    post.moderation = {
      ...(post.moderation?.toObject?.() || post.moderation || {}),
      status: action === "hide" ? "pending_review" : action === "unhide" ? "approved" : post.moderation?.status || "approved",
      provider: "manual",
      reviewedBy: admin._id,
      reviewedAt: new Date(),
      metadata: {
        ...((post.moderation?.metadata?.toObject?.() || post.moderation?.metadata || {}) as Record<string, unknown>),
        adminAction: action,
        adminReason: reason,
      },
    }
    await post.save()

    const contentType = post.contentType === "match_poll" ? "match_poll" : post.isThreadRoot ? "thread_root" : "post"
    await createModerationLog({
      userId: post.author?.toString?.() || null,
      contentType,
      contentId: id,
      status: action === "hide" ? "pending_review" : "approved",
      action: `content_${action}`,
      provider: "manual",
      reviewedBy: admin._id.toString(),
      metadata: { reason, actorRole: admin.role, matchId: post.matchId || "", roomType: post.roomType || "" },
    })

    return ok({ success: true, status: post.status, isPinned: post.isPinned, isOfficialThread: post.isOfficialThread })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update content"
    return errorResponse(message, message === "Admin authentication required" ? 401 : message === "Admin permission denied" ? 403 : 500)
  }
}
