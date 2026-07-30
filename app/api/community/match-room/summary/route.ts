import { NextRequest } from "next/server"

import { canManageCommunityAdmin } from "@/lib/admin-access"
import { requireAuthUser } from "@/lib/server/auth"
import { buildPublicModeratedContentFilter } from "@/lib/server/community"
import {
  buildFanReactionAggregate,
  getMatchRoomFixture,
  getMatchRoomSummaryHistory,
  regenerateMatchRoomSummaryInDb,
  shouldEmitSummaryReady,
} from "@/lib/server/community-match-room"
import { isAiSafeCommunityCommentSource, isAiSafeThreadSource } from "@/lib/server/community-threads"
import { notifyMatchRoomFollowers } from "@/lib/server/community-notifications"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { Comment, CommunityPost } from "@/lib/server/models"

async function buildSafeFanReaction(matchId: string) {
  const sourcePosts = await CommunityPost.find({
    matchId,
    ...buildPublicModeratedContentFilter(),
  })
    .sort({ createdAt: -1 })
    .limit(40)

  const safeSources = sourcePosts.filter((post: any) =>
    isAiSafeThreadSource({
      status: post.status,
      moderation: post.moderation,
      isDeleted: post.isDeleted,
      isHidden: post.isHidden,
    }),
  )
  const sourceIds = safeSources.map((post: any) => post._id.toString())
  const comments = sourceIds.length
    ? await Comment.find({ targetType: "post", targetId: { $in: sourceIds } }).sort({ createdAt: -1 }).limit(40)
    : []

  return buildFanReactionAggregate({
    polls: safeSources.filter((post: any) => post.poll?.question).map((post: any) => ({ title: post.title, poll: post.poll })),
    texts: [
      ...safeSources.flatMap((post: any) => [post.title, post.content]).map((item) => String(item || "")),
      ...comments
        .filter((comment: any) =>
          isAiSafeCommunityCommentSource({
            isApproved: comment.isApproved,
            moderation: comment.moderation,
            isDeleted: comment.isDeleted,
            isHidden: comment.isHidden,
          }),
        )
        .map((comment: any) => String(comment.content || "")),
    ],
    minApprovedContent: 3,
  })
}

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    const viewer = await requireAuthUser(request)
    if (!canManageCommunityAdmin(viewer.role)) {
      return errorResponse("Not allowed to view summary history", 403)
    }

    const matchId = String(request.nextUrl.searchParams.get("matchId") || "").trim()
    if (!matchId) return errorResponse("Match not found", 404)

    const limit = Number(request.nextUrl.searchParams.get("limit") || 10)
    const history = await getMatchRoomSummaryHistory(matchId, limit)
    return ok(history)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load summary history"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    const viewer = await requireAuthUser(request)
    if (!canManageCommunityAdmin(viewer.role)) {
      return errorResponse("Not allowed to regenerate summary", 403)
    }

    const body = await request.json().catch(() => ({}))
    const matchId = String(body.matchId || "").trim()
    if (!matchId) return errorResponse("Match not found", 404)

    const fixture = await getMatchRoomFixture(matchId)
    if (!fixture || fixture.id !== matchId) return errorResponse("Match not found", 404)
    if (!fixture.isFinished) return errorResponse("Match summary can be generated after full-time only", 422)

    const fanReaction = await buildSafeFanReaction(matchId)
    const result = await regenerateMatchRoomSummaryInDb({
      fixture,
      fanReaction,
      requestedBy: viewer._id.toString(),
      reason: "admin_regenerate",
    })

    if (result.locked) return errorResponse("Summary generation is already running", 409)

    const readyEvent = shouldEmitSummaryReady(result.previous, result.summary)
      ? {
          matchId,
          summaryVersion: result.summary.summaryVersion || "0",
          generatedAt: result.summary.generatedAt || null,
          mode: result.summary.source,
          status: result.summary.status,
        }
      : null
    if (readyEvent) {
      await notifyMatchRoomFollowers({
        matchId,
        actorId: viewer._id.toString(),
        type: "match_summary_ready",
        summaryVersion: readyEvent.summaryVersion,
        message: "AI Summary ของ Match Room พร้อมอ่านแล้ว",
      })
    }

    return ok({
      summary: result.summary,
      fanReaction,
      readyEvent,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to regenerate summary"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
