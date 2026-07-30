import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { assertCommunityPostingAllowed, createModerationLog, moderateCommunityText } from "@/lib/server/content-moderation"
import { awardCommunityFanBadges } from "@/lib/server/community-fan-profile"
import { createCommunityNotification } from "@/lib/server/community-notifications"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, getTimeAgoThai, ok } from "@/lib/server/http"
import { Comment, CommunityPost } from "@/lib/server/models"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    await assertCommunityPostingAllowed(user._id.toString())
    const { id } = await params
    const body = await request.json()
    const content = String(body.content || "").trim()
    const parentCommentId = typeof body.parentCommentId === "string" ? body.parentCommentId.trim() : ""

    if (!content || content.length > 1000) {
      return errorResponse("Validation failed", 422)
    }

    const post = await CommunityPost.findById(id)
    if (!post) return errorResponse("Post not found", 404)

    const duplicateSince = new Date(Date.now() - 60 * 1000)
    const duplicateComment = await Comment.findOne({
      user: user._id,
      targetType: "post",
      targetId: post._id.toString(),
      content,
      createdAt: { $gte: duplicateSince },
    }).select("_id")
    if (duplicateComment) {
      return errorResponse("Duplicate comment detected", 409)
    }

    const parentComment = parentCommentId ? await Comment.findById(parentCommentId).select("_id user targetId parentComment") : null
    if (parentCommentId && !parentComment) {
      return errorResponse("Reply target not found", 404)
    }
    if (parentComment && String(parentComment.targetId || "") !== post._id.toString()) {
      return errorResponse("Reply target mismatch", 422)
    }
    if (parentComment?.parentComment) {
      return errorResponse("Nested replies are limited to one level", 422)
    }

    const moderation = await moderateCommunityText({ content })
    if (moderation.status === "rejected") {
      await createModerationLog({
        userId: user._id.toString(),
        contentType: "comment",
        status: moderation.status,
        action: "create_rejected",
        reasons: moderation.reasons,
        scores: moderation.scores,
        provider: moderation.provider,
      })
      return errorResponse("Comment rejected by moderation", 422, { reasons: moderation.reasons })
    }

    const comment = await Comment.create({
      user: user._id,
      targetType: "post",
      targetId: post._id.toString(),
      parentComment: parentComment?._id || null,
      content,
      isApproved: moderation.status === "approved",
      moderation,
    })

    const nextComments = moderation.status === "approved" ? Math.max(Number(post.commentsCount || 0), Array.isArray(post.comments) ? post.comments.length : 0) + 1 : Number(post.commentsCount || 0)
    if (moderation.status === "approved") {
      post.commentsCount = nextComments
      post.latestActivityAt = new Date()
      if (Array.isArray(post.comments)) {
        post.comments = [
          ...post.comments,
          {
            user: user._id,
            content,
            createdAt: comment.createdAt,
          },
        ]
      }
    }
    await post.save()
    if (moderation.status === "approved") {
      if (post.isThreadRoot && post.matchId) {
        await awardCommunityFanBadges({
          userId: user._id.toString(),
          action: parentComment ? "thread_reply_created" : "thread_comment_created",
          eventKey: `${parentComment ? "thread-reply" : "thread-comment"}:${comment._id.toString()}`,
          postId: post._id.toString(),
          matchId: String(post.matchId || ""),
        })
      }
      if (parentComment?.user?.toString?.() && parentComment.user.toString() !== user._id.toString()) {
        await createCommunityNotification({
          recipientId: parentComment.user.toString(),
          actorId: user._id.toString(),
          postId: post._id.toString(),
          commentId: comment._id.toString(),
          type: "thread_reply",
          dedupeKey: `thread-reply:${comment._id.toString()}:${parentComment.user.toString()}`,
        })
      } else {
        await createCommunityNotification({
          recipientId: post.author.toString(),
          actorId: user._id.toString(),
          postId: post._id.toString(),
          type: "post_comment",
          commentId: comment._id.toString(),
        })
      }
    }

    await createModerationLog({
      userId: user._id.toString(),
      contentType: "comment",
      contentId: comment._id.toString(),
      status: moderation.status,
      action: "created",
      reasons: moderation.reasons,
      scores: moderation.scores,
      provider: moderation.provider,
    })

    const populated = await comment.populate("user", "name avatar favoriteTeam")
    return ok(
      {
        item: {
          id: populated._id.toString(),
          content: populated.content,
          parentCommentId: populated.parentComment?.toString?.() || "",
          moderationStatus: moderation.status,
          createdAt: populated.createdAt,
          timeAgo: getTimeAgoThai(populated.createdAt),
          user: {
            id: populated.user?._id?.toString?.() || "",
            name: populated.user?.name || "?????????",
            avatar: populated.user?.avatar || "",
          },
        },
        commentsCount: nextComments,
        moderationStatus: moderation.status,
      },
      { status: 201 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to comment"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
