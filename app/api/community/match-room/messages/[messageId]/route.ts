import { NextRequest } from "next/server"

import { canManageCommunityAdmin } from "@/lib/admin-access"
import { requireAuthUser } from "@/lib/server/auth"
import { buildTeamPreviewLoungeTag, buildTeamReactionLoungeTag, normalizeTeamPreviewSide, normalizeTeamReactionSide } from "@/lib/match-preview-lounges"
import { getMatchRoomFixture } from "@/lib/server/community-match-room"
import { getRoomState, normalizeMatchRoomType } from "@/lib/server/community-room-conversation"
import { createModerationLog, moderateCommunityText } from "@/lib/server/content-moderation"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { CommunityPost } from "@/lib/server/models"

function canMutateMessage(message: any, viewer: any) {
  const authorId = message.author?.toString?.() || ""
  return canManageCommunityAdmin(viewer.role) || (viewer._id?.toString?.() && viewer._id.toString() === authorId)
}

function buildRoomTeamLoungeFilter(roomType: string, input: { previewTeam?: unknown; reactionTeam?: unknown }) {
  if (roomType === "preview") {
    const side = normalizeTeamPreviewSide(input.previewTeam)
    return side ? { tags: buildTeamPreviewLoungeTag(side) } : { tags: "__missing-preview-lounge__" }
  }
  if (roomType === "post_match") {
    const side = normalizeTeamReactionSide(input.reactionTeam)
    return side ? { tags: buildTeamReactionLoungeTag(side) } : { tags: "__missing-post-match-lounge__" }
  }
  return {}
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    await connectDatabase()
    const viewer = await requireAuthUser(request)
    const { messageId } = await params
    const body = await request.json()
    const matchId = String(body.matchId || "").trim()
    const roomType = normalizeMatchRoomType(body.roomType || "main")
    const previewTeam = normalizeTeamPreviewSide(body.previewTeam)
    const reactionTeam = normalizeTeamReactionSide(body.reactionTeam)
    const content = String(body.content || "").trim()

    if (!matchId) return errorResponse("Match not found", 404)
    if (!roomType) return errorResponse("Invalid room type", 422)
    if (roomType === "preview" && !previewTeam) return errorResponse("Invalid preview lounge", 422)
    if (roomType === "post_match" && !reactionTeam) return errorResponse("Invalid reaction lounge", 422)
    if (!content || content.length > 1000) return errorResponse("Validation failed", 422)

    const fixture = await getMatchRoomFixture(matchId)
    if (!fixture || fixture.id !== matchId) return errorResponse("Match not found", 404)
    const room = getRoomState(fixture, roomType)
    if (!room.canPost && !canManageCommunityAdmin(viewer.role)) {
      return errorResponse("Room is closed for edits", 403, { code: "ROOM_CLOSED", room, moveTargetRoom: "main" })
    }

    const message = await CommunityPost.findOne({
      _id: messageId,
      matchId,
      roomType,
      ...buildRoomTeamLoungeFilter(roomType, { previewTeam, reactionTeam }),
      isRoomMessage: true,
      contentType: "room_message",
      status: { $ne: "hidden" },
    })
    if (!message) return errorResponse("Message not found", 404)
    if (!canMutateMessage(message, viewer)) return errorResponse("Not allowed to edit message", 403)

    const moderation = await moderateCommunityText({ content })
    if (moderation.status === "rejected") {
      await createModerationLog({
        userId: viewer._id.toString(),
        contentType: "room_message",
        contentId: message._id.toString(),
        status: moderation.status,
        action: "room_message_update_rejected",
        reasons: moderation.reasons,
        scores: moderation.scores,
        provider: moderation.provider,
        metadata: { matchId, roomType, reactionTeam: reactionTeam || "" },
      })
      return errorResponse("Message rejected by moderation", 422, { reasons: moderation.reasons })
    }

    message.content = content
    message.title = content.slice(0, 80) || "Room message"
    message.status = moderation.status === "approved" ? "published" : "published"
    message.moderation = {
      ...(message.moderation?.toObject?.() || message.moderation || {}),
      ...moderation,
      metadata: {
        ...((message.moderation?.metadata?.toObject?.() || message.moderation?.metadata || {}) as Record<string, unknown>),
        editedAt: new Date().toISOString(),
        editedBy: viewer._id.toString(),
      },
    }
    message.lastEditedAt = new Date()
    message.editVersion = Number(message.editVersion || 1) + 1
    await message.save()

    await createModerationLog({
      userId: viewer._id.toString(),
      contentType: "room_message",
      contentId: message._id.toString(),
      status: moderation.status,
      action: "room_message_updated",
      reasons: moderation.reasons,
      scores: moderation.scores,
      provider: moderation.provider,
      metadata: { matchId, roomType, previewTeam: previewTeam || "", reactionTeam: reactionTeam || "" },
    })

    return ok({ success: true, moderationStatus: moderation.status })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update room message"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    await connectDatabase()
    const viewer = await requireAuthUser(request)
    const { messageId } = await params
    const matchId = String(request.nextUrl.searchParams.get("matchId") || "").trim()
    const roomType = normalizeMatchRoomType(request.nextUrl.searchParams.get("roomType") || "main")
    const previewTeam = normalizeTeamPreviewSide(request.nextUrl.searchParams.get("previewTeam"))
    const reactionTeam = normalizeTeamReactionSide(request.nextUrl.searchParams.get("reactionTeam"))

    if (!matchId) return errorResponse("Match not found", 404)
    if (!roomType) return errorResponse("Invalid room type", 422)
    if (roomType === "preview" && !previewTeam) return errorResponse("Invalid preview lounge", 422)
    if (roomType === "post_match" && !reactionTeam) return errorResponse("Invalid reaction lounge", 422)

    const message = await CommunityPost.findOne({
      _id: messageId,
      matchId,
      roomType,
      ...buildRoomTeamLoungeFilter(roomType, { previewTeam, reactionTeam }),
      isRoomMessage: true,
      contentType: "room_message",
      status: { $ne: "hidden" },
    })
    if (!message) return errorResponse("Message not found", 404)
    if (!canMutateMessage(message, viewer)) return errorResponse("Not allowed to delete message", 403)

    message.status = "hidden"
    message.isPinned = false
    message.moderation = {
      ...(message.moderation?.toObject?.() || message.moderation || {}),
      status: "approved",
      metadata: {
        ...((message.moderation?.metadata?.toObject?.() || message.moderation?.metadata || {}) as Record<string, unknown>),
        deletedAt: new Date().toISOString(),
        deletedBy: viewer._id.toString(),
      },
    }
    await message.save()

    return ok({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete room message"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
