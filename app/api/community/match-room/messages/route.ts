import { NextRequest } from "next/server"

import { canManageCommunityAdmin } from "@/lib/admin-access"
import { getMatchDemoRoomAvailabilityPhase } from "@/lib/match-demo-override"
import { getAuthUser, requireAuthUser } from "@/lib/server/auth"
import { canViewerSeeModeratedContent } from "@/lib/server/community"
import { buildMatchContext, getMatchRoomFixture, normalizeMatchRoomId } from "@/lib/server/community-match-room"
import { getMatchDemoOverrideState } from "@/lib/server/community-match-demo-override"
import { buildTacticalTopicTag, extractTacticalTopicFromTags, normalizeTacticalQuickTopic } from "@/lib/match-tactical-room-ui"
import { buildTeamPreviewLoungeTag, buildTeamReactionLoungeTag, normalizeTeamPreviewSide, normalizeTeamReactionSide } from "@/lib/match-preview-lounges"
import {
  buildRoomMessageMetadata,
  buildRoomMessageVisibilityFilter,
  canReadRoom,
  getRoomState,
  normalizeMatchRoomType,
} from "@/lib/server/community-room-conversation"
import {
  assertCommunityPostingAllowed,
  createModerationLog,
  getPublicationStatusForModeration,
  moderateCommunityText,
  notifyContentModerationOutcome,
} from "@/lib/server/content-moderation"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, getTimeAgoThai, ok, parsePagination } from "@/lib/server/http"
import { CommunityMedia, CommunityPost, ModerationLog } from "@/lib/server/models"

function parseMediaIdList(value: unknown, limit: number) {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, limit)
}

async function validateRoomMedia(params: { mediaIds: string[]; mediaType: "image" | "video"; ownerId: string }) {
  const { mediaIds, mediaType, ownerId } = params
  if (!mediaIds.length) return { records: [], approvedUrls: [], hasPendingReview: false, hasProcessing: false }
  const records = await CommunityMedia.find({ _id: { $in: mediaIds }, mediaType })
  if (records.length !== mediaIds.length) throw new Error(`Some ${mediaType} attachments could not be found`)

  const byId = new Map(records.map((record: any) => [record._id.toString(), record]))
  for (const mediaId of mediaIds) {
    const record = byId.get(mediaId)
    if (!record) throw new Error(`Some ${mediaType} attachments could not be found`)
    if (record.owner?.toString?.() !== ownerId) throw new Error(`You do not own one of the selected ${mediaType} attachments`)
    if (String(record.contentType || "") !== "upload") throw new Error(`One of the selected ${mediaType} attachments is already linked elsewhere`)
    if (["rejected", "failed"].includes(String(record.status || ""))) throw new Error(`One of the selected ${mediaType} attachments is not available`)
  }

  return {
    records,
    approvedUrls: mediaIds
      .map((mediaId) => byId.get(mediaId))
      .filter((record) => record?.status === "approved" && typeof record.publicUrl === "string" && record.publicUrl.trim())
      .map((record) => record.publicUrl.trim()),
    hasPendingReview: mediaIds.some((mediaId) => byId.get(mediaId)?.status === "pending_review"),
    hasProcessing: mediaIds.some((mediaId) => byId.get(mediaId)?.status === "processing"),
  }
}

function mapRoomMessage(message: any, viewer: any) {
  const authorId = message.author?._id?.toString?.() || message.author?.toString?.() || ""
  const viewerId = viewer?._id?.toString?.() || ""
  const previewTeam = Array.isArray(message.tags)
    ? normalizeTeamPreviewSide(message.tags.find((tag: unknown) => String(tag || "").startsWith("match-preview:"))?.toString().replace("match-preview:", ""))
    : null
  const reactionTeam = Array.isArray(message.tags)
    ? normalizeTeamReactionSide(message.tags.find((tag: unknown) => String(tag || "").startsWith("match-post-match:"))?.toString().replace("match-post-match:", ""))
    : null
  const tacticalTopic = extractTacticalTopicFromTags(message.tags)
  return {
    id: message._id.toString(),
    matchId: message.matchId || "",
    roomType: message.roomType || "main",
    previewTeam: previewTeam || "",
    reactionTeam: reactionTeam || "",
    tacticalTopic: tacticalTopic || "",
    contentType: message.contentType || "room_message",
    content: message.content || "",
    replyToId: message.replyToPost?.toString?.() || "",
    moderationStatus: message.moderation?.status || "approved",
    status: message.status || "published",
    archivedAt: message.archivedAt || null,
    roomClosedAt: message.roomClosedAt || null,
    roomExpiresAt: message.roomExpiresAt || null,
    createdAt: message.createdAt,
    timeAgo: getTimeAgoThai(message.createdAt),
    images: Array.isArray(message.images) ? message.images : [],
    videos: Array.isArray(message.videos) ? message.videos : [],
    isEdited: Boolean(message.lastEditedAt || Number(message.editVersion || 1) > 1),
    isOwner: Boolean(viewerId && viewerId === authorId),
    canModerate: canManageCommunityAdmin(viewer?.role),
    author: {
      id: authorId,
      name: message.author?.name || "ผู้ใช้งาน",
      avatar: message.author?.avatar || "",
      role: message.author?.role || "",
    },
  }
}

function buildPreviewLoungeFilter(roomType: string, previewTeam: unknown) {
  if (roomType !== "preview") return {}
  const side = normalizeTeamPreviewSide(previewTeam)
  return side ? { tags: buildTeamPreviewLoungeTag(side) } : { tags: "__missing-preview-lounge__" }
}

function buildReactionLoungeFilter(roomType: string, reactionTeam: unknown) {
  if (roomType !== "post_match") return {}
  const side = normalizeTeamReactionSide(reactionTeam)
  return side ? { tags: buildTeamReactionLoungeTag(side) } : { tags: "__missing-post-match-lounge__" }
}

function buildRoomTeamLoungeTags(roomType: string, input: { previewTeam?: unknown; reactionTeam?: unknown; tacticalTopic?: unknown }) {
  const previewTeam = normalizeTeamPreviewSide(input.previewTeam)
  const reactionTeam = normalizeTeamReactionSide(input.reactionTeam)
  const tacticalTopicTag = buildTacticalTopicTag(input.tacticalTopic)
  if (roomType === "preview" && previewTeam) return [buildTeamPreviewLoungeTag(previewTeam)]
  if (roomType === "post_match" && reactionTeam) return [buildTeamReactionLoungeTag(reactionTeam)]
  if (roomType === "tactics" && tacticalTopicTag) return [tacticalTopicTag]
  return []
}

async function getManualTemporaryRoomAction(matchId: string, roomType: string) {
  if (roomType !== "preview" && roomType !== "post_match") return null
  return ModerationLog.findOne({
    contentType: "room_message",
    action: { $in: ["room_manual_close", "room_manual_archive"] },
    "metadata.matchId": matchId,
    "metadata.roomType": roomType,
  })
    .sort({ createdAt: -1 })
    .lean()
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    await connectDatabase()
    const viewer = await getAuthUser(request)
    const searchParams = request.nextUrl.searchParams
    const matchId = normalizeMatchRoomId(searchParams.get("matchId"))
    const roomType = normalizeMatchRoomType(searchParams.get("roomType") || "main")
    const previewTeam = normalizeTeamPreviewSide(searchParams.get("previewTeam"))
    const reactionTeam = normalizeTeamReactionSide(searchParams.get("reactionTeam"))
    const { page, limit, skip } = parsePagination(searchParams)
    const canModerate = canManageCommunityAdmin(viewer?.role)

    if (!matchId) return errorResponse("Match not found", 404, { code: "MATCH_NOT_FOUND", requestId })
    if (!roomType) return errorResponse("Invalid room type", 422)
    const fixture = await getMatchRoomFixture(matchId)
    if (!fixture || normalizeMatchRoomId(fixture.id) !== matchId) return errorResponse("Match not found", 404, { code: "MATCH_NOT_FOUND", requestId })
    const demoOverride = await getMatchDemoOverrideState(matchId, fixture)
    const roomAvailabilityPhase = getMatchDemoRoomAvailabilityPhase(demoOverride)
    const room = getRoomState(fixture, roomType, new Date(), roomAvailabilityPhase)
    const manualRoomAction = await getManualTemporaryRoomAction(matchId, roomType)
    if (!demoOverride.enabled && manualRoomAction?.action === "room_manual_archive" && !canModerate) return errorResponse("Room unavailable", 403, { code: "ROOM_UNAVAILABLE", room })
    if (!canReadRoom(fixture, roomType, new Date(), viewer?.role, roomAvailabilityPhase)) return errorResponse("Room unavailable", 403, { code: "ROOM_UNAVAILABLE", room })

    const filter = {
      matchId,
      roomType,
      ...buildPreviewLoungeFilter(roomType, previewTeam),
      ...buildReactionLoungeFilter(roomType, reactionTeam),
      isRoomMessage: true,
      contentType: "room_message",
      ...buildRoomMessageVisibilityFilter(viewer?._id?.toString?.() || null, canModerate),
    }
    const [messages, total] = await Promise.all([
      CommunityPost.find(filter).populate("author", "name avatar favoriteTeam role").sort({ createdAt: -1 }).skip(skip).limit(limit),
      CommunityPost.countDocuments(filter),
    ])

    return ok({
      items: messages.reverse().filter((message: any) => canModerate || canViewerSeeModeratedContent(message, viewer)).map((message: any) => mapRoomMessage(message, viewer)),
      room,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load room messages"
    const status = message === "Authentication required" ? 401 : 500
    console.error("[match-room-messages] load failed", {
      requestId,
      code: "MESSAGE_LOAD_ERROR",
      message,
    })
    return errorResponse(status === 401 ? message : "โหลดข้อความไม่สำเร็จ", status, { code: status === 401 ? "AUTHENTICATION_REQUIRED" : "MESSAGE_LOAD_ERROR", requestId })
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    await assertCommunityPostingAllowed(user._id.toString())
    const body = await request.json()
    const matchId = normalizeMatchRoomId(body.matchId)
    const roomType = normalizeMatchRoomType(body.roomType || "main")
    const previewTeam = normalizeTeamPreviewSide(body.previewTeam)
    const reactionTeam = normalizeTeamReactionSide(body.reactionTeam)
    const tacticalTopicInput = String(body.tacticalTopic || "").trim()
    const tacticalTopic = normalizeTacticalQuickTopic(tacticalTopicInput)
    const content = String(body.content || "").trim()
    const replyToId = typeof body.replyToId === "string" ? body.replyToId.trim() : ""
    const imageMediaIds = parseMediaIdList(body.imageMediaIds || body.mediaIds, 4)
    const videoMediaIds = parseMediaIdList(body.videoMediaIds, 1)

    if (!matchId) return errorResponse("Match not found", 404, { code: "MATCH_NOT_FOUND", requestId })
    if (!roomType) return errorResponse("Invalid room type", 422)
    if (roomType === "preview" && !previewTeam) return errorResponse("Invalid preview lounge", 422)
    if (roomType === "post_match" && !reactionTeam) return errorResponse("Invalid reaction lounge", 422)
    if (roomType !== "tactics" && tacticalTopicInput) return errorResponse("Invalid tactical topic", 422)
    if (roomType === "tactics" && tacticalTopicInput && !tacticalTopic) return errorResponse("Invalid tactical topic", 422)
    if (!content || content.length > 1000) return errorResponse("Validation failed", 422)

    const fixture = await getMatchRoomFixture(matchId)
    if (!fixture || normalizeMatchRoomId(fixture.id) !== matchId) return errorResponse("Match not found", 404, { code: "MATCH_NOT_FOUND", requestId })
    const demoOverride = await getMatchDemoOverrideState(matchId, fixture)
    const roomAvailabilityPhase = getMatchDemoRoomAvailabilityPhase(demoOverride)
    const room = getRoomState(fixture, roomType, new Date(), roomAvailabilityPhase)
    const manualRoomAction = await getManualTemporaryRoomAction(matchId, roomType)
    if (!demoOverride.enabled && manualRoomAction) return errorResponse("Room is closed for new messages", 403, { code: "ROOM_CLOSED", room, moveTargetRoom: "main" })
    if (!room.canPost) return errorResponse("Room is closed for new messages", 403, { code: "ROOM_CLOSED", room, moveTargetRoom: "main" })

    const replyTo = replyToId
      ? await CommunityPost.findOne({
          _id: replyToId,
          matchId,
          roomType,
          ...buildPreviewLoungeFilter(roomType, previewTeam),
          ...buildReactionLoungeFilter(roomType, reactionTeam),
          isRoomMessage: true,
          contentType: "room_message",
          replyToPost: null,
          status: { $ne: "hidden" },
        }).select("_id")
      : null
    if (replyToId && !replyTo) return errorResponse("Reply target not found", 404)

    const duplicateSince = new Date(Date.now() - 30 * 1000)
    const duplicate = await CommunityPost.findOne({
      author: user._id,
      matchId,
      roomType,
      ...buildPreviewLoungeFilter(roomType, previewTeam),
      ...buildReactionLoungeFilter(roomType, reactionTeam),
      isRoomMessage: true,
      content,
      replyToPost: replyTo?._id || null,
      createdAt: { $gte: duplicateSince },
    }).populate("author", "name avatar favoriteTeam role")
    if (duplicate) {
      return ok({ item: mapRoomMessage(duplicate, user), moderationStatus: duplicate.moderation?.status || "approved", duplicate: true })
    }

    const [imageAttachments, videoAttachments] = await Promise.all([
      validateRoomMedia({ mediaIds: imageMediaIds, mediaType: "image", ownerId: user._id.toString() }),
      validateRoomMedia({ mediaIds: videoMediaIds, mediaType: "video", ownerId: user._id.toString() }),
    ])
    const images = imageAttachments.approvedUrls
    const videos = videoAttachments.approvedUrls

    const moderation = await moderateCommunityText({ content, urls: [...images, ...videos], imageUrls: images })
    if (moderation.status === "rejected") {
      await createModerationLog({
        userId: user._id.toString(),
        contentType: "room_message",
        status: moderation.status,
        action: "room_message_create_rejected",
        reasons: moderation.reasons,
        scores: moderation.scores,
        provider: moderation.provider,
        metadata: { matchId, roomType, reactionTeam: reactionTeam || "" },
      })
      return errorResponse("Message rejected by moderation", 422, { reasons: moderation.reasons })
    }

    const hasPendingMedia = imageAttachments.hasPendingReview || videoAttachments.hasPendingReview || videoAttachments.hasProcessing
    const finalModerationStatus = moderation.status === "approved" && hasPendingMedia ? "pending_review" : moderation.status
    const matchContext = buildMatchContext(fixture)
    const metadata = buildRoomMessageMetadata({
      matchId,
      roomType,
      replyToId,
      roomClosedAt: room.closesAt,
      roomExpiresAt: room.expiresAt,
    })
    const message = await CommunityPost.create({
      author: user._id,
      title: content.slice(0, 80) || "Room message",
      content,
      category: "match-discussion",
      matchContext,
      images,
      videos,
      status: getPublicationStatusForModeration(finalModerationStatus),
      moderation: {
        ...moderation,
        status: finalModerationStatus,
        reasons: hasPendingMedia ? [...new Set([...(moderation.reasons || []), "media:pending-review"])] : moderation.reasons,
        metadata: {
          ...(moderation.metadata || {}),
          roomMessage: { matchId, roomType, previewTeam: previewTeam || "", reactionTeam: reactionTeam || "", tacticalTopic: tacticalTopic || "", replyToId: replyToId || "" },
          attachedMedia: { imageMediaIds, videoMediaIds, hasPendingMedia },
        },
      },
      replyToPost: replyTo?._id || null,
      ...metadata,
      tags: buildRoomTeamLoungeTags(roomType, { previewTeam, reactionTeam, tacticalTopic }),
    })

    const attachedRecords = [...imageAttachments.records, ...videoAttachments.records].filter(Boolean)
    if (attachedRecords.length) {
      await CommunityMedia.updateMany({ _id: { $in: attachedRecords.map((record: any) => record._id) } }, { $set: { contentType: "post", contentId: message._id.toString() } })
    }

    await createModerationLog({
      userId: user._id.toString(),
      contentType: "room_message",
      contentId: message._id.toString(),
      status: finalModerationStatus,
      action: "room_message_created",
      reasons: message.moderation?.reasons || moderation.reasons,
      scores: moderation.scores,
      provider: moderation.provider,
      metadata: { matchId, roomType, previewTeam: previewTeam || "", reactionTeam: reactionTeam || "", tacticalTopic: tacticalTopic || "", replyToId, imageMediaIds, videoMediaIds },
    })

    if (finalModerationStatus === "pending_review") {
      await notifyContentModerationOutcome({
        recipientId: user._id.toString(),
        outcome: "pending_review",
        contentType: "post",
        contentId: message._id.toString(),
      })
    }

    const populated = await CommunityPost.findById(message._id).populate("author", "name avatar favoriteTeam role")
    return ok({ item: mapRoomMessage(populated, user), moderationStatus: finalModerationStatus }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create room message"
    console.error("[match-room-messages] create failed", {
      requestId,
      code: "MESSAGE_LOAD_ERROR",
      message,
    })
    return errorResponse(
      message,
      message === "Authentication required"
        ? 401
        : message.includes("attachments") || message.includes("selected") || message.includes("already linked")
          ? 422
          : 500,
      { code: "MESSAGE_LOAD_ERROR", requestId },
    )
  }
}
