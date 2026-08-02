import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { buildViewerVisibleModeratedContentFilter, mapCommunityPostWithMedia } from "@/lib/server/community"
import { awardCommunityFanBadges } from "@/lib/server/community-fan-profile"
import { normalizeCommunityThreadCategory, normalizeCommunityThreadSort, buildThreadDbSort, buildThreadDuplicateKey, computeThreadPopularityScore } from "@/lib/server/community-threads"
import { buildMatchContext, getMatchRoomFixture } from "@/lib/server/community-match-room"
import {
  assertCommunityPostingAllowed,
  createModerationLog,
  getPublicationStatusForModeration,
  moderateCommunityText,
  notifyContentModerationOutcome,
} from "@/lib/server/content-moderation"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { CommunityMedia, CommunityPost } from "@/lib/server/models"

function parseImageMediaIdList(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 1)
}

async function validateThreadImages(mediaIds: string[], ownerId: string) {
  if (!mediaIds.length) {
    return {
      records: [],
      approvedUrls: [],
      hasPendingReview: false,
    }
  }

  const records = await CommunityMedia.find({ _id: { $in: mediaIds }, mediaType: "image" })
  if (records.length !== mediaIds.length) {
    throw new Error("Some image attachments could not be found")
  }

  const byId = new Map(records.map((record: any) => [record._id.toString(), record]))
  for (const mediaId of mediaIds) {
    const record = byId.get(mediaId)
    if (!record) throw new Error("Some image attachments could not be found")
    if (record.owner?.toString?.() !== ownerId) {
      throw new Error("You do not own one of the selected image attachments")
    }
    const contentType = String(record.contentType || "")
    if (contentType !== "upload") {
      throw new Error("One of the selected image attachments is already linked elsewhere")
    }
    if (["rejected", "failed"].includes(String(record.status || ""))) {
      throw new Error("One of the selected image attachments is not available")
    }
  }

  return {
    records,
    approvedUrls: mediaIds
      .map((mediaId) => byId.get(mediaId))
      .filter((record) => record?.status === "approved" && typeof record.publicUrl === "string" && record.publicUrl.trim())
      .map((record) => record.publicUrl.trim()),
    hasPendingReview: mediaIds.some((mediaId) => byId.get(mediaId)?.status === "pending_review"),
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    const searchParams = request.nextUrl.searchParams
    const matchId = String(searchParams.get("matchId") || "").trim()
    const sort = normalizeCommunityThreadSort(searchParams.get("sort"))
    const category = normalizeCommunityThreadCategory(searchParams.get("category"))
    const officialOnly = String(searchParams.get("official") || "").trim() === "1"
    const viewer = await requireAuthUser(request).catch(() => null)

    if (!matchId) return errorResponse("Match not found", 404)
    const fixture = await getMatchRoomFixture(matchId)
    if (!fixture || fixture.id !== matchId) return errorResponse("Match not found", 404)

    const filter: Record<string, unknown> = {
      matchId,
      isThreadRoot: true,
      ...buildViewerVisibleModeratedContentFilter(viewer?._id?.toString?.() || null),
    }
    const andFilters: Record<string, unknown>[] = []
    if (category) andFilters.push({ threadCategory: category })
    if (officialOnly) andFilters.push({ $or: [{ isPinned: true }, { isOfficialThread: true }] })
    if (andFilters.length) {
      filter.$and = andFilters
    }

    const threads = await CommunityPost.find(filter)
      .populate("author", "name avatar favoriteTeam role fanBadges communityStats")
      .sort(buildThreadDbSort(sort))
      .limit(30)

    const mappedThreads = await Promise.all(threads.map((post: any) => mapCommunityPostWithMedia(post, viewer)))
    const items =
      sort === "popular"
        ? mappedThreads.sort((left: any, right: any) => computeThreadPopularityScore(right) - computeThreadPopularityScore(left))
        : sort === "official"
          ? mappedThreads.sort((left: any, right: any) => Number(Boolean(right.isPinned || right.isOfficialThread)) - Number(Boolean(left.isPinned || left.isOfficialThread)))
          : mappedThreads

    return ok({ items, sort, category: category || "", officialOnly })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load threads"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    await assertCommunityPostingAllowed(user._id.toString())
    const body = await request.json()
    const routeMatchId = typeof body.matchId === "string" ? body.matchId.trim() : ""
    const matchId = routeMatchId && /^[A-Za-z0-9_-]{1,80}$/.test(routeMatchId) ? routeMatchId : ""
    const title = String(body.title || "").trim()
    const content = String(body.content || "").trim()
    const threadCategory = normalizeCommunityThreadCategory(body.threadCategory || body.category)
    const imageMediaIds = parseImageMediaIdList(body.imageMediaIds)

    if (!matchId) return errorResponse("Match not found", 404)
    if (title.length < 4 || title.length > 180 || content.length < 8 || content.length > 5000) {
      return errorResponse("Validation failed", 422)
    }
    if (!threadCategory) return errorResponse("Invalid thread category", 422)

    const matchFixture = await getMatchRoomFixture(matchId)
    if (!matchFixture || matchFixture.id !== matchId) return errorResponse("Match not found", 404)

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const threadCountLastHour = await CommunityPost.countDocuments({
      author: user._id,
      isThreadRoot: true,
      createdAt: { $gte: oneHourAgo },
    })
    if (threadCountLastHour >= 5) {
      return errorResponse("Thread creation rate limit reached", 429)
    }

    const duplicateSince = new Date(Date.now() - 15 * 60 * 1000)
    const duplicateKey = buildThreadDuplicateKey({ matchId, title, content, category: threadCategory })
    const duplicate = await CommunityPost.findOne({
      author: user._id,
      isThreadRoot: true,
      matchId,
      createdAt: { $gte: duplicateSince },
      "moderation.metadata.threadDuplicateKey": duplicateKey,
    }).select("_id")
    if (duplicate) {
      return errorResponse("Duplicate thread detected", 409)
    }

    const imageAttachments = await validateThreadImages(imageMediaIds, user._id.toString())
    const moderation = await moderateCommunityText({
      title,
      content,
      urls: imageAttachments.approvedUrls,
      imageUrls: imageAttachments.approvedUrls,
    })

    const finalModerationStatus = moderation.status === "approved" && imageAttachments.hasPendingReview ? "pending_review" : moderation.status
    const reasons =
      finalModerationStatus === "pending_review" && imageAttachments.hasPendingReview
        ? [...new Set([...(moderation.reasons || []), "media:pending-review"])]
        : moderation.reasons

    if (moderation.status === "rejected") {
      await createModerationLog({
        userId: user._id.toString(),
        contentType: "post",
        status: moderation.status,
        action: "thread_create_rejected",
        reasons: moderation.reasons,
        scores: moderation.scores,
        provider: moderation.provider,
        metadata: { matchId, threadCategory },
      })
      return errorResponse("Thread rejected by moderation", 422, { reasons: moderation.reasons })
    }

    const matchContext = buildMatchContext(matchFixture)
    const post = await CommunityPost.create({
      author: user._id,
      title,
      content,
      category: "general",
      matchId,
      roomType: "main",
      contentType: "thread_root",
      isRoomMessage: false,
      matchContext,
      images: imageAttachments.approvedUrls,
      isThreadRoot: true,
      threadCategory,
      isOfficialThread: false,
      latestActivityAt: new Date(),
      status: getPublicationStatusForModeration(finalModerationStatus),
      moderation: {
        ...moderation,
        status: finalModerationStatus,
        reasons,
        metadata: {
          ...(moderation.metadata || {}),
          threadDuplicateKey: duplicateKey,
          matchRoom: { matchId, ...matchContext },
          attachedMedia: {
            imageMediaIds,
            hasPendingMedia: imageAttachments.hasPendingReview,
          },
        },
      },
    })

    if (imageAttachments.records.length) {
      await CommunityMedia.updateMany(
        { _id: { $in: imageAttachments.records.map((record: any) => record._id) } },
        { $set: { contentType: "post", contentId: post._id.toString() } },
      )
    }

    await createModerationLog({
      userId: user._id.toString(),
      contentType: "post",
      contentId: post._id.toString(),
      status: finalModerationStatus,
      action: "thread_created",
      reasons,
      scores: moderation.scores,
      provider: moderation.provider,
      metadata: { matchId, threadCategory, imageMediaIds },
    })

    if (finalModerationStatus === "pending_review") {
      await notifyContentModerationOutcome({
        recipientId: user._id.toString(),
        outcome: "pending_review",
        contentType: "post",
        contentId: post._id.toString(),
      })
    }

    if (finalModerationStatus === "approved") {
      await awardCommunityFanBadges({
        userId: user._id.toString(),
        action: "match_room_post_created",
        eventKey: `thread:${post._id.toString()}:published`,
        postId: post._id.toString(),
        matchId,
      })
    }

    const populated = await CommunityPost.findById(post._id).populate("author", "name avatar favoriteTeam role fanBadges communityStats")
    return ok(
      {
        item: await mapCommunityPostWithMedia(populated, user),
        moderationStatus: finalModerationStatus,
      },
      { status: 201 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create thread"
    return errorResponse(
      message,
      message === "Authentication required"
        ? 401
        : message.includes("attachments") || message.includes("selected image") || message.includes("already linked")
          ? 422
          : 500,
    )
  }
}
