import { NextRequest } from "next/server"

import { canManageCommunityAdmin } from "@/lib/admin-access"
import { getAuthUser, requireAuthUser } from "@/lib/server/auth"
import { canViewerSeeModeratedContent, isApprovedCommentVisible, mapCommunityPostWithMedia } from "@/lib/server/community"
import { buildThreadDbSort, buildThreadActionPermissions, normalizeCommunityThreadCategory } from "@/lib/server/community-threads"
import { createModerationLog, moderateCommunityText } from "@/lib/server/content-moderation"
import { getMatchRoomFixture } from "@/lib/server/community-match-room"
import { createCommunityNotification } from "@/lib/server/community-notifications"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, getTimeAgoThai, ok } from "@/lib/server/http"
import { Comment, CommunityPost, PostLike } from "@/lib/server/models"

function mapCommentItem(comment: any, viewer: any, canModerate: boolean, replies: any[] = []) {
  const userId = comment.user?._id?.toString?.() || ""
  const viewerId = viewer?._id?.toString?.() || ""
  const isDeleted = Boolean(comment.isDeleted)
  return {
    id: comment._id.toString(),
    parentCommentId: comment.parentComment?.toString?.() || "",
    content: isDeleted ? "ความคิดเห็นนี้ถูกลบแล้ว" : comment.content,
    moderationStatus: comment.moderation?.status || "approved",
    createdAt: comment.createdAt,
    timeAgo: getTimeAgoThai(comment.createdAt),
    lastEditedAt: comment.lastEditedAt || null,
    isEdited: Boolean(comment.lastEditedAt),
    isDeleted,
    isHidden: Boolean(comment.isHidden),
    isOwner: Boolean(viewerId && viewerId === userId),
    canModerate,
    permalink: `#comment-${comment._id.toString()}`,
    user: {
      id: userId,
      name: comment.user?.name || "ผู้ใช้งาน",
      avatar: comment.user?.avatar || "",
    },
    replies,
  }
}

function canViewerSeeComment(comment: any, viewer: any, canModerate: boolean) {
  if (canModerate) return true
  if (comment.isHidden) return false
  if (comment.isDeleted) return false
  if (isApprovedCommentVisible(comment)) return true
  return viewer?._id?.toString?.() === comment.user?._id?.toString?.() && comment.moderation?.status === "pending_review"
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  try {
    await connectDatabase()
    const viewer = await getAuthUser(request)
    const { threadId } = await params
    const matchId = String(request.nextUrl.searchParams.get("matchId") || "").trim()
    if (!matchId) return errorResponse("Match not found", 404)

    const fixture = await getMatchRoomFixture(matchId)
    if (!fixture || fixture.id !== matchId) return errorResponse("Match not found", 404)
    const commentsLimit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("commentsLimit") || 10), 5), 40)
    const canModerate = canManageCommunityAdmin(viewer?.role)

    const thread = await CommunityPost.findById(threadId).populate("author", "name avatar favoriteTeam role fanBadges communityStats")
    if (!thread || !thread.isThreadRoot || String(thread.matchId || "") !== matchId || !canViewerSeeModeratedContent(thread, viewer)) {
      return errorResponse("Thread not found", 404)
    }

    const topLevelDocs = await Comment.find({
      targetType: "post",
      targetId: thread._id.toString(),
      parentComment: null,
    })
      .populate("user", "name avatar favoriteTeam")
      .sort({ createdAt: 1 })
      .limit(commentsLimit)

    const topLevelIds = topLevelDocs.map((comment: any) => comment._id)
    const replyDocs = topLevelIds.length
      ? await Comment.find({
          targetType: "post",
          targetId: thread._id.toString(),
          parentComment: { $in: topLevelIds },
        })
          .populate("user", "name avatar favoriteTeam")
          .sort({ createdAt: 1 })
          .limit(topLevelIds.length * 3)
      : []
    const totalTopLevel = await Comment.countDocuments({ targetType: "post", targetId: thread._id.toString(), parentComment: null })

    const repliesByParent = new Map<string, any[]>()
    for (const reply of replyDocs.filter((comment: any) => canViewerSeeComment(comment, viewer, canModerate))) {
      const parentId = reply.parentComment.toString()
      repliesByParent.set(parentId, [...(repliesByParent.get(parentId) || []), reply])
    }

    const comments = topLevelDocs
      .map((comment: any) => {
        const replies = (repliesByParent.get(comment._id.toString()) || []).map((reply) => mapCommentItem(reply, viewer, canModerate))
        if (!canViewerSeeComment(comment, viewer, canModerate) && !(comment.isDeleted && replies.length)) return null
        return mapCommentItem(comment, viewer, canModerate, replies)
      })
      .filter(Boolean)

    const relatedThreads = await CommunityPost.find({
      _id: { $ne: thread._id },
      matchId,
      isThreadRoot: true,
      status: "published",
      isHidden: { $ne: true },
      isDeleted: { $ne: true },
      "moderation.status": { $in: [null, "approved"] },
    })
      .populate("author", "name avatar favoriteTeam role fanBadges communityStats")
      .sort(buildThreadDbSort("active"))
      .limit(3)

    const [item, relatedItems, liked] = await Promise.all([
      mapCommunityPostWithMedia(thread, viewer),
      Promise.all(relatedThreads.map((post: any) => mapCommunityPostWithMedia(post, viewer))),
      viewer ? PostLike.exists({ post: thread._id, user: viewer._id }) : Promise.resolve(false),
    ])

    return ok({
      fixture,
      item: { ...item, isLiked: Boolean(liked) },
      comments,
      commentsPagination: {
        limit: commentsLimit,
        total: totalTopLevel,
        hasMore: totalTopLevel > commentsLimit,
      },
      relatedThreads: relatedItems,
      permissions: {
        canPin: canModerate,
        canComment: Boolean(viewer?._id),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load thread"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  try {
    await connectDatabase()
    const viewer = await requireAuthUser(request)

    const { threadId } = await params
    const thread = await CommunityPost.findById(threadId)
    if (!thread || !thread.isThreadRoot) return errorResponse("Thread not found", 404)

    const body = await request.json()
    const canModerate = canManageCommunityAdmin(viewer.role)
    const permissions = buildThreadActionPermissions({
      viewerId: viewer._id.toString(),
      authorId: thread.author?.toString?.() || "",
      canModerate,
      isDeleted: thread.status === "hidden",
    })

    if (typeof body.title === "string" || typeof body.content === "string" || typeof body.threadCategory === "string") {
      if (!permissions.canEdit) return errorResponse("Not allowed to edit thread", 403)
      const title = String(body.title || thread.title || "").trim()
      const content = String(body.content || thread.content || "").trim()
      const threadCategory = normalizeCommunityThreadCategory(body.threadCategory) || thread.threadCategory || "general"
      if (!title || title.length > 180 || !content || content.length > 5000) {
        return errorResponse("Validation failed", 422)
      }
      const moderation = await moderateCommunityText({ title, content })
      if (moderation.status === "rejected") {
        await createModerationLog({
          userId: viewer._id.toString(),
          contentType: "post",
          contentId: thread._id.toString(),
          status: moderation.status,
          action: "thread_update_rejected",
          reasons: moderation.reasons,
          scores: moderation.scores,
          provider: moderation.provider,
        })
        return errorResponse("Thread rejected by moderation", 422, { reasons: moderation.reasons })
      }

      if (moderation.status === "pending_review" && !canModerate) {
        thread.pendingRevision = {
          title,
          content,
          threadCategory,
          moderation,
          submittedAt: new Date(),
          baseEditVersion: Number(thread.editVersion || 1),
        }
        thread.hasPendingRevision = true
      } else {
        thread.title = title
        thread.content = content
        thread.threadCategory = threadCategory
        thread.category = threadCategory === "tactics" ? "match-discussion" : threadCategory === "post_match" ? "match-discussion" : "general"
        thread.moderation = {
          ...(thread.moderation?.toObject?.() || thread.moderation || {}),
          ...moderation,
          reviewedBy: canModerate ? viewer._id : null,
          reviewedAt: canModerate ? new Date() : null,
        }
        thread.status = "published"
        thread.lastEditedAt = new Date()
        thread.editVersion = Number(thread.editVersion || 1) + 1
        thread.hasPendingRevision = false
        thread.pendingRevision = null
      }
      await thread.save()
      return ok({ success: true, moderationStatus: moderation.status, hasPendingRevision: thread.hasPendingRevision })
    }

    if (!canModerate) {
      return errorResponse("Not allowed to update thread", 403)
    }

    const nextPinned = Boolean(body.isPinned)
    const nextOfficial = typeof body.isOfficialThread === "boolean" ? Boolean(body.isOfficialThread) : thread.isOfficialThread

    if (nextPinned) {
      const pinnedCount = await CommunityPost.countDocuments({
        _id: { $ne: thread._id },
        matchId: thread.matchId,
        isThreadRoot: true,
        isPinned: true,
      })
      if (pinnedCount >= 3) {
        return errorResponse("Pinned thread limit reached for this match", 422)
      }
    }

    thread.isPinned = nextPinned
    thread.isOfficialThread = nextOfficial
    await thread.save()

    if (nextPinned && thread.author?.toString?.() && thread.author.toString() !== viewer._id.toString()) {
      await createCommunityNotification({
        recipientId: thread.author.toString(),
        actorId: viewer._id.toString(),
        type: "thread_pinned",
        postId: thread._id.toString(),
        dedupeKey: `thread-pinned:${thread._id.toString()}:${thread.author.toString()}`,
      })
    }

    return ok({ success: true, isPinned: thread.isPinned, isOfficialThread: thread.isOfficialThread })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update thread"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  try {
    await connectDatabase()
    const viewer = await requireAuthUser(request)
    const { threadId } = await params
    const thread = await CommunityPost.findById(threadId)
    if (!thread || !thread.isThreadRoot || thread.status === "hidden") return errorResponse("Thread not found", 404)

    const canModerate = canManageCommunityAdmin(viewer.role)
    const permissions = buildThreadActionPermissions({
      viewerId: viewer._id.toString(),
      authorId: thread.author?.toString?.() || "",
      canModerate,
    })
    if (!permissions.canDelete) return errorResponse("Not allowed to delete thread", 403)

    thread.status = "hidden"
    thread.isPinned = false
    thread.isOfficialThread = false
    thread.moderation = {
      ...(thread.moderation?.toObject?.() || thread.moderation || {}),
      status: "approved",
      metadata: {
        ...((thread.moderation?.metadata?.toObject?.() || thread.moderation?.metadata || {}) as Record<string, unknown>),
        deletedAt: new Date().toISOString(),
        deletedBy: viewer._id.toString(),
      },
    }
    await thread.save()

    return ok({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete thread"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
