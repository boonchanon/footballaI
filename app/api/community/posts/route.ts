import { NextRequest } from "next/server"
import type { SortOrder } from "mongoose"

import { getAuthUser, requireAuthUser } from "@/lib/server/auth"
import { buildViewerVisibleModeratedContentFilter, mapCommunityPostWithMedia } from "@/lib/server/community"
import { getLegacyLikeState } from "@/lib/server/community-admin"
import {
  assertCommunityPostingAllowed,
  createModerationLog,
  getPublicationStatusForModeration,
  moderateCommunityText,
  notifyContentModerationOutcome,
  registerModerationStrike,
} from "@/lib/server/content-moderation"
import { awardCommunityFanBadges } from "@/lib/server/community-fan-profile"
import { buildMatchContext, canOpenPostMatchPoll, getMatchRoomFixture } from "@/lib/server/community-match-room"
import { validateCommunityPollDraft } from "@/lib/server/community-poll-policy"
import { validateCommunityPreferences } from "@/lib/server/community-preferences"
import { createCommunityNotification, notifyFriendsAboutApprovedPost, notifyMatchRoomFollowers } from "@/lib/server/community-notifications"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok, parsePagination } from "@/lib/server/http"
import { CommunityMedia, CommunityPost, PostLike } from "@/lib/server/models"

type MediaAttachmentValidation = {
  records: any[]
  approvedUrls: string[]
  hasPendingReview: boolean
  hasProcessing: boolean
}

async function addOwnerPendingPreviews(mapped: any, post: any, viewer: any) {
  const authorId = post.author?._id?.toString?.() || post.author?.toString?.() || ""
  if (!viewer || authorId !== viewer._id.toString() || post.moderation?.status !== "pending_review") {
    return mapped
  }

  const pendingImages = await CommunityMedia.find({
    owner: viewer._id,
    contentType: "post",
    contentId: post._id.toString(),
    mediaType: "image",
    status: "pending_review",
    pendingKey: { $exists: true, $ne: "" },
  }).select("_id")

  mapped.pendingImagePreviewUrls = pendingImages.map((media: any) => `/api/community/media/${media._id.toString()}/preview`)
  return mapped
}

function parseMediaIdList(value: unknown, limit: number) {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, limit)
}

function parseMetadataIdList(value: unknown, limit: number) {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string" || typeof item === "number")
        .map((item) => String(item).trim())
        .filter((item) => /^[A-Za-z0-9_-]{1,80}$/.test(item))
        .slice(0, limit),
    ),
  )
}

function getPostEngagement(post: any) {
  return Math.max(Number(post.likesCount || 0), Array.isArray(post.likedBy) ? post.likedBy.length : 0) +
    Math.max(Number(post.commentsCount || 0), Array.isArray(post.comments) ? post.comments.length : 0) * 2 +
    Number(post.repostsCount || 0) * 3
}

function getRecencyBoost(createdAt: unknown, max = 30) {
  const ageMs = Date.now() - new Date(createdAt as any).getTime()
  if (!Number.isFinite(ageMs) || ageMs < 0) return max
  const ageHours = ageMs / 36e5
  return Math.max(0, max - ageHours * 1.25)
}

function scoreForYouPost(post: any, user: any) {
  const teamIds = new Set<string>(Array.isArray(post.teamIds) ? post.teamIds.map((id: unknown) => String(id)) : [])
  const playerIds = new Set<string>(Array.isArray(post.playerIds) ? post.playerIds.map((id: unknown) => String(id)) : [])
  const favoriteTeamIds: string[] = Array.isArray(user?.favoriteTeamIds) ? user.favoriteTeamIds.map((id: unknown) => String(id)) : []
  const favoritePlayerIds: string[] = Array.isArray(user?.favoritePlayerIds) ? user.favoritePlayerIds.map((id: unknown) => String(id)) : []
  const preferredContentTypes = new Set<string>(
    Array.isArray(user?.preferredContentTypes) ? user.preferredContentTypes.map((id: unknown) => String(id)) : [],
  )
  const teamScore = favoriteTeamIds.some((id) => teamIds.has(id)) ? 40 : 0
  const playerScore = favoritePlayerIds.some((id) => playerIds.has(id)) ? 30 : 0
  const typeScore = preferredContentTypes.has(String(post.category || "")) ? 20 : 0
  const engagementScore = Math.min(15, getPostEngagement(post))

  return teamScore + playerScore + typeScore + engagementScore + getRecencyBoost(post.createdAt)
}

function scoreTrendingPost(post: any) {
  return getPostEngagement(post) + getRecencyBoost(post.createdAt, 20)
}

async function validateAttachedMedia(params: {
  mediaIds: string[]
  mediaType: "image" | "video"
  ownerId: string
}) {
  const { mediaIds, mediaType, ownerId } = params
  if (!mediaIds.length) {
    return {
      records: [],
      approvedUrls: [],
      hasPendingReview: false,
      hasProcessing: false,
    } satisfies MediaAttachmentValidation
  }

  const records = await CommunityMedia.find({
    _id: { $in: mediaIds },
    mediaType,
  })

  const mediaById = new Map(records.map((record: any) => [record._id.toString(), record]))
  if (records.length !== mediaIds.length) {
    throw new Error(`Some ${mediaType} attachments could not be found`)
  }

  for (const mediaId of mediaIds) {
    const record = mediaById.get(mediaId)
    if (!record) {
      throw new Error(`Some ${mediaType} attachments could not be found`)
    }
    if (record.owner?.toString?.() !== ownerId) {
      throw new Error(`You do not own one of the selected ${mediaType} attachments`)
    }
    if (String(record.contentType || "") !== "upload") {
      throw new Error(`One of the selected ${mediaType} attachments is already linked elsewhere`)
    }
    if (["rejected", "failed"].includes(String(record.status || ""))) {
      throw new Error(`One of the selected ${mediaType} attachments is not available`)
    }
  }

  return {
    records: mediaIds.map((mediaId) => mediaById.get(mediaId)),
    approvedUrls: mediaIds
      .map((mediaId) => mediaById.get(mediaId))
      .filter((record) => record?.status === "approved" && typeof record.publicUrl === "string" && record.publicUrl.trim())
      .map((record) => record.publicUrl.trim()),
    hasPendingReview: mediaIds.some((mediaId) => mediaById.get(mediaId)?.status === "pending_review"),
    hasProcessing: mediaIds.some((mediaId) => mediaById.get(mediaId)?.status === "processing"),
  } satisfies MediaAttachmentValidation
}

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    const viewer = await getAuthUser(request)
    const searchParams = request.nextUrl.searchParams
    const { page, limit, skip } = parsePagination(searchParams)
    const filter: Record<string, unknown> = {}

    const category = searchParams.get("category")
    const status = searchParams.get("status")
    const mine = searchParams.get("mine")
    const q = searchParams.get("q")
    const feed = String(searchParams.get("feed") || "latest")
    const feedMode = ["for-you", "latest", "favorites", "trending"].includes(feed) ? feed : "latest"

    if (category && category !== "all") filter.category = category
    if (status && status !== "all") filter.status = status
    if (mine === "true" && viewer) filter.author = viewer._id
    if (!viewer || viewer.role !== "admin") {
      const viewerId = viewer && mine === "true" ? viewer._id.toString() : null
      Object.assign(filter, buildViewerVisibleModeratedContentFilter(viewerId))
    }
    if (q) {
      const searchFilter = [
        { title: { $regex: q, $options: "i" } },
        { content: { $regex: q, $options: "i" } },
      ]
      if (Array.isArray(filter.$or)) {
        filter.$and = [{ $or: filter.$or }, { $or: searchFilter }]
        delete filter.$or
      } else {
        filter.$or = searchFilter
      }
    }
    if (feedMode === "favorites") {
      if (!viewer) return errorResponse("Authentication required", 401)
      const favoriteTeamIds = Array.isArray(viewer.favoriteTeamIds) ? viewer.favoriteTeamIds.filter(Boolean) : []
      if (!favoriteTeamIds.length) {
        return ok({
          items: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
          stats: { total: 0, published: 0, flagged: 0, hidden: 0 },
          feed: feedMode,
          emptyReason: "no_favorite_teams",
        })
      }
      filter.teamIds = { $in: favoriteTeamIds }
    }
    if (feedMode === "trending") {
      filter.createdAt = { $gte: new Date(Date.now() - 48 * 36e5) }
    }

    const shouldRankInMemory = feedMode === "for-you" || feedMode === "trending"
    const candidateLimit = shouldRankInMemory ? Math.min(200, Math.max(limit * 8, 60)) : limit
    const dbSort: Record<string, SortOrder> = feedMode === "trending" ? { createdAt: -1 } : { isPinned: -1, createdAt: -1 }

    const [candidatePosts, total, stats] = await Promise.all([
      CommunityPost.find(filter)
        .populate("author", "name avatar favoriteTeam role fanBadges communityStats")
        .sort(dbSort)
        .skip(shouldRankInMemory ? 0 : skip)
        .limit(candidateLimit),
      CommunityPost.countDocuments(filter),
      Promise.all([
        CommunityPost.countDocuments({ status: "published" }),
        CommunityPost.countDocuments({ status: "flagged" }),
        CommunityPost.countDocuments({ status: "hidden" }),
      ]),
    ])
    const rankedPosts = shouldRankInMemory
      ? [...candidatePosts].sort((a: any, b: any) => {
          const scoreA = feedMode === "trending" ? scoreTrendingPost(a) : scoreForYouPost(a, viewer)
          const scoreB = feedMode === "trending" ? scoreTrendingPost(b) : scoreForYouPost(b, viewer)
          if (scoreB !== scoreA) return scoreB - scoreA
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
      : candidatePosts
    const posts = shouldRankInMemory ? rankedPosts.slice(skip, skip + limit) : rankedPosts

    const likedPostIds =
      viewer && posts.length > 0
        ? new Set(
            (await PostLike.find({ user: viewer._id, post: { $in: posts.map((post: any) => post._id) } }).select("post")).map((item: any) =>
              item.post.toString(),
            ),
          )
        : new Set<string>()

    return ok({
      items: await Promise.all(posts.map(async (post: any) => {
        const legacyLiked = viewer ? getLegacyLikeState(post, viewer._id.toString()) : false
        const likedSet = legacyLiked && !likedPostIds.has(post._id.toString()) ? new Set([...likedPostIds, post._id.toString()]) : likedPostIds
        return addOwnerPendingPreviews(await mapCommunityPostWithMedia(post, viewer), post, viewer)
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: { total, published: stats[0], flagged: stats[1], hidden: stats[2] },
      feed: feedMode,
    })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Failed to load posts", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    await assertCommunityPostingAllowed(user._id.toString())
    const body = await request.json()
    const title = String(body.title || "").trim()
    const content = String(body.content || "").trim()
    const category = String(body.category || "general")
    const imageMediaIds = parseMediaIdList(body.imageMediaIds, 4)
    const videoMediaIds = parseMediaIdList(body.videoMediaIds, 1)
    const teamIds = parseMetadataIdList(body.teamIds, 6)
    const playerIds = parseMetadataIdList(body.playerIds, 12)
    const matchId = typeof body.matchId === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(body.matchId.trim()) ? body.matchId.trim() : ""
    const matchFixture = matchId ? await getMatchRoomFixture(matchId) : null
    const matchContext = matchFixture && matchFixture.id === matchId ? buildMatchContext(matchFixture) : null
    const visibility = body.visibility === "friends" ? "friends" : "public"
    const poll =
      body.poll && typeof body.poll === "object"
        ? {
            question: String(body.poll.question || "").trim(),
            options: Array.isArray(body.poll.options)
              ? body.poll.options
                  .map((item: unknown, index: number) => ({
                    id:
                      item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string"
                        ? String((item as { id: string }).id).trim()
                        : `option-${index + 1}`,
                    text:
                      item && typeof item === "object" && typeof (item as { text?: unknown }).text === "string"
                        ? String((item as { text: string }).text).trim()
                        : "",
                  }))
                  .filter((item: { text: string }) => item.text)
                  .slice(0, 6)
              : [],
          }
        : null
    const sharedItem =
      body.sharedItem && typeof body.sharedItem === "object"
        ? {
            type: String(body.sharedItem.type || "").trim(),
            title: String(body.sharedItem.title || "").trim(),
            url: String(body.sharedItem.url || "").trim(),
            image: String(body.sharedItem.image || "").trim(),
            source: String(body.sharedItem.source || "").trim(),
            postId: String(body.sharedItem.postId || "").trim(),
          }
        : null

    if (title.length < 4 || title.length > 180 || content.length < 8 || content.length > 5000) {
      return errorResponse("Validation failed", 422)
    }
    if (videoMediaIds.length > 1) {
      return errorResponse("You can attach up to 1 video", 422)
    }
    if (matchId && !matchContext) {
      return errorResponse("Match not found", 422)
    }

    const [imageAttachments, videoAttachments] = await Promise.all([
      validateAttachedMedia({ mediaIds: imageMediaIds, mediaType: "image", ownerId: user._id.toString() }),
      validateAttachedMedia({ mediaIds: videoMediaIds, mediaType: "video", ownerId: user._id.toString() }),
    ])
    if (teamIds.length || playerIds.length) {
      await validateCommunityPreferences({
        favoriteTeamIds: teamIds,
        favoritePlayerIds: playerIds,
        preferredContentTypes: [],
      })
    }

    const images = imageAttachments.approvedUrls
    const videos = videoAttachments.approvedUrls

    if (process.env.NODE_ENV === "development") {
      console.log("[community-posts:create]", {
        userId: user._id.toString(),
        title,
        imageMediaIds,
        videoMediaIds,
        approvedImages: images,
        approvedVideos: videos,
        imagePendingReview: imageAttachments.hasPendingReview,
        videoPendingReview: videoAttachments.hasPendingReview,
        videoProcessing: videoAttachments.hasProcessing,
      })
    }

    const normalizedPoll =
      poll?.question && poll.options.length >= 2
        ? {
            question: poll.question,
            options: poll.options.map((option: { id: string; text: string }) => ({ ...option, votes: 0 })),
            totalVotes: 0,
          }
        : null

    if (poll && (poll.question || poll.options.length > 0) && !normalizedPoll) {
      return errorResponse("Poll needs a question and at least 2 options", 422)
    }
    if (normalizedPoll) {
      const pollValidation = validateCommunityPollDraft(normalizedPoll)
      if (!pollValidation.ok) return errorResponse(pollValidation.error, 422)
    }
    if (normalizedPoll && matchId && !canOpenPostMatchPoll(matchFixture)) {
      return errorResponse("Post-match poll opens after the match is finished", 422)
    }

    const normalizedSharedItem = sharedItem?.type && sharedItem?.title ? sharedItem : null
    if (normalizedSharedItem?.type === "post" && normalizedSharedItem.postId) {
      const existingRepost = await CommunityPost.findOne({
        author: user._id,
        "sharedItem.type": "post",
        "sharedItem.postId": normalizedSharedItem.postId,
        status: { $ne: "hidden" },
      }).select("_id")

      if (existingRepost) {
        return errorResponse("You already reposted this post", 409)
      }
    }

    const moderation = await moderateCommunityText({
      title,
      content: [content, normalizedPoll?.question || "", ...(normalizedPoll?.options || []).map((option: { text: string }) => option.text)].filter(Boolean).join("\n"),
      urls: [normalizedSharedItem?.url || "", ...images, ...videos].filter(Boolean),
      imageUrls: images,
    })

    if (moderation.status === "rejected") {
      await createModerationLog({
        userId: user._id.toString(),
        contentType: "post",
        status: moderation.status,
        action: "create_rejected",
        reasons: moderation.reasons,
        scores: moderation.scores,
        provider: moderation.provider,
      })
      await registerModerationStrike({
        userId: user._id.toString(),
        contentType: "post",
        contentId: `auto-rejected:${title.slice(0, 24)}:${Date.now()}`,
        reasons: moderation.reasons,
      })
      return errorResponse("Post rejected by moderation", 422, { reasons: moderation.reasons })
    }

    const hasPendingMedia =
      imageAttachments.hasPendingReview ||
      videoAttachments.hasPendingReview ||
      videoAttachments.hasProcessing

    const finalModerationStatus = moderation.status === "approved" && hasPendingMedia ? "pending_review" : moderation.status
    const pendingReviewSource =
      finalModerationStatus !== "pending_review"
        ? ""
        : moderation.status === "approved" && hasPendingMedia
          ? "media"
          : "text"
    const finalReasons =
      pendingReviewSource === "media" ? [...new Set([...moderation.reasons, "media:pending-review"])] : moderation.reasons

    const post = await CommunityPost.create({
      author: user._id,
      title,
      content,
      category,
      teamIds,
      playerIds,
      matchId,
      matchContext: matchContext || undefined,
      images,
      videos,
      visibility,
      poll: normalizedPoll || undefined,
      sharedItem: normalizedSharedItem || undefined,
      status: getPublicationStatusForModeration(finalModerationStatus),
      moderation: {
        ...moderation,
        status: finalModerationStatus,
        reasons: finalReasons,
        metadata: {
          ...(moderation.metadata || {}),
          attachedMedia: {
            imageMediaIds,
            videoMediaIds,
            hasPendingMedia,
            pendingReviewSource,
          },
          personalization: {
            teamIds,
            playerIds,
            contentType: category,
          },
          matchRoom: matchContext ? { matchId, ...matchContext } : null,
        },
      },
    })

    const attachedRecords = [...imageAttachments.records, ...videoAttachments.records].filter(Boolean)
    if (attachedRecords.length) {
      await CommunityMedia.updateMany(
        {
          _id: { $in: attachedRecords.map((record) => record._id) },
        },
        {
          $set: {
            contentType: "post",
            contentId: post._id.toString(),
          },
        },
      )
    }

    await createModerationLog({
      userId: user._id.toString(),
      contentType: "post",
      contentId: post._id.toString(),
      status: finalModerationStatus,
      action: "created",
      reasons: finalReasons,
      scores: moderation.scores,
      provider: moderation.provider,
      metadata: {
        imageMediaIds,
        videoMediaIds,
        teamIds,
        playerIds,
        matchId,
        matchContext,
        hasPendingMedia,
      },
    })

    if (finalModerationStatus === "pending_review") {
      await notifyContentModerationOutcome({
        recipientId: user._id.toString(),
        outcome: "pending_review",
        contentType: "post",
        contentId: post._id.toString(),
      })
    }

    if (normalizedSharedItem?.type === "post" && normalizedSharedItem.postId) {
      await CommunityPost.findByIdAndUpdate(normalizedSharedItem.postId, { $inc: { repostsCount: 1 } })
      const originalPost = await CommunityPost.findById(normalizedSharedItem.postId).select("author")
      if (originalPost?.author && finalModerationStatus === "approved") {
        await createCommunityNotification({
          recipientId: originalPost.author.toString(),
          actorId: user._id.toString(),
          postId: normalizedSharedItem.postId,
          type: "post_repost",
        })
      }
    }

    if (finalModerationStatus === "approved") {
      await awardCommunityFanBadges({
        userId: user._id.toString(),
        action: matchId ? "match_room_post_created" : "post_created",
        eventKey: `post:${post._id.toString()}:published`,
        postId: post._id.toString(),
        matchId,
      })
      await notifyFriendsAboutApprovedPost({
        authorId: user._id.toString(),
        actorId: user._id.toString(),
        postId: post._id.toString(),
      })
      if (matchId) {
        await notifyMatchRoomFollowers({
          matchId,
          actorId: user._id.toString(),
          postId: post._id.toString(),
          type: "community_match_room_posted",
          message: `${user.name || "มีผู้ใช้"} โพสต์ใหม่ใน Match Room`,
        })
        await createCommunityNotification({
          recipientId: user._id.toString(),
          actorId: user._id.toString(),
          postId: post._id.toString(),
          type: "community_fan_badge_unlocked",
          referenceType: "fan-badge",
          message: "Match Room Voice",
        })
      }
    }

    const populated = await CommunityPost.findById(post._id).populate("author", "name avatar favoriteTeam role fanBadges communityStats")
    const mapped = await addOwnerPendingPreviews(await mapCommunityPostWithMedia(populated, user), post, user)
    return ok({ item: mapped, moderationStatus: finalModerationStatus }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create post"
    return errorResponse(
      message,
      message === "Authentication required"
        ? 401
        : message.includes("attachments") || message.includes("own one of the selected") || message.includes("already linked")
          ? 422
          : 500,
    )
  }
}
