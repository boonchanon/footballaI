import { NextRequest } from "next/server"

import { getMatchDemoRoomAvailabilityPhase } from "@/lib/match-demo-override"
import {
  buildAdminPollFilter,
  buildAdminRoomMessageFilter,
  buildAdminThreadFilter,
  isTemporaryMatchRoomType,
  normalizeAdminMatchRoomAction,
  normalizeAdminMatchRoomContentTab,
  validateAdminActionReason,
} from "@/lib/server/admin-community-match-rooms"
import { requireAdminRoles } from "@/lib/server/auth"
import {
  getMatchDemoOverrideState,
  normalizeMatchDemoOverridePhase,
  setMatchDemoOverride,
  validateDemoOverrideReason,
} from "@/lib/server/community-match-demo-override"
import { createModerationLog } from "@/lib/server/content-moderation"
import { getMatchRoomFixture } from "@/lib/server/community-match-room"
import { getMatchRoomChannels, normalizeMatchRoomType } from "@/lib/server/community-room-conversation"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, getTimeAgoThai, ok, parsePagination } from "@/lib/server/http"
import { CommunityPost, CommunityReport, ModerationLog } from "@/lib/server/models"

function sanitizeReason(value: unknown) {
  return String(value || "").trim().slice(0, 500)
}

function mapAdminPost(post: any) {
  return {
    id: post._id.toString(),
    matchId: post.matchId || "",
    roomType: post.roomType || "",
    contentType: post.contentType || "community_post",
    title: post.title || "",
    content: post.content || "",
    status: post.status || "published",
    moderationStatus: post.moderation?.status || "approved",
    isPinned: Boolean(post.isPinned),
    isOfficialThread: Boolean(post.isOfficialThread),
    isThreadRoot: Boolean(post.isThreadRoot),
    archivedAt: post.archivedAt || null,
    roomClosedAt: post.roomClosedAt || null,
    roomExpiresAt: post.roomExpiresAt || null,
    reportsCount: post.reportsCount || 0,
    replyToId: post.replyToPost?.toString?.() || "",
    poll: post.poll?.question
      ? {
          question: post.poll.question,
          totalVotes: post.poll.totalVotes || 0,
          options: Array.isArray(post.poll.options) ? post.poll.options.map((option: any) => ({ id: option.id, text: option.text, votes: option.votes || 0 })) : [],
        }
      : null,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    timeAgo: getTimeAgoThai(post.createdAt),
    author: {
      id: post.author?._id?.toString?.() || "",
      name: post.author?.name || "ผู้ใช้งาน",
      avatar: post.author?.avatar || "",
      role: post.author?.role || "",
    },
  }
}

async function getMatchContentIds(matchId: string) {
  const rows = await CommunityPost.find({ matchId }).select("_id").lean()
  return rows.map((row: any) => row._id.toString())
}

async function getOverview(matchId: string) {
  const [aggregate] = await CommunityPost.aggregate([
    { $match: { matchId } },
    {
      $group: {
        _id: "$matchId",
        roomMessages: { $sum: { $cond: [{ $eq: ["$contentType", "room_message"] }, 1, 0] } },
        threads: { $sum: { $cond: [{ $eq: ["$contentType", "thread_root"] }, 1, 0] } },
        polls: { $sum: { $cond: [{ $eq: ["$contentType", "match_poll"] }, 1, 0] } },
        reports: { $sum: "$reportsCount" },
        hidden: { $sum: { $cond: [{ $eq: ["$status", "hidden"] }, 1, 0] } },
        archivedMessages: { $sum: { $cond: [{ $ne: ["$archivedAt", null] }, 1, 0] } },
        latestActivityAt: { $max: "$latestActivityAt" },
        latestCreatedAt: { $max: "$createdAt" },
      },
    },
  ])
  return {
    roomMessages: aggregate?.roomMessages || 0,
    threads: aggregate?.threads || 0,
    polls: aggregate?.polls || 0,
    reports: aggregate?.reports || 0,
    hidden: aggregate?.hidden || 0,
    archivedMessages: aggregate?.archivedMessages || 0,
    latestActivityAt: aggregate?.latestActivityAt || aggregate?.latestCreatedAt || null,
  }
}

async function logAdminAction(input: {
  admin: any
  action: string
  matchId: string
  roomType?: string
  targetType: "room_message" | "thread_root" | "match_poll"
  targetId?: string
  previousStatus?: string
  newStatus?: string
  reason?: string
}) {
  await createModerationLog({
    contentType: input.targetType,
    contentId: input.targetId || `${input.matchId}:${input.roomType || "match"}`,
    status: input.newStatus === "hidden" ? "pending_review" : "approved",
    action: input.action,
    provider: "manual",
    reviewedBy: input.admin._id.toString(),
    metadata: {
      actorRole: input.admin.role,
      matchId: input.matchId,
      roomType: input.roomType || "",
      targetType: input.targetType,
      targetId: input.targetId || "",
      previousStatus: input.previousStatus || "",
      newStatus: input.newStatus || "",
      reason: input.reason || "",
    },
  })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  try {
    await connectDatabase()
    await requireAdminRoles(request, ["superadmin", "admincommunity"])
    const { matchId } = await params
    const fixture = await getMatchRoomFixture(matchId)
    if (!fixture || fixture.id !== matchId) return errorResponse("Match not found", 404)

    const searchParams = request.nextUrl.searchParams
    const tab = normalizeAdminMatchRoomContentTab(searchParams.get("tab"))
    const roomType = normalizeMatchRoomType(searchParams.get("roomType") || (["main", "tactics", "preview", "post_match"].includes(tab) ? tab : "main"))
    const { page, limit, skip } = parsePagination(searchParams)
    const overview = await getOverview(matchId)
    const demoOverride = await getMatchDemoOverrideState(matchId, fixture)
    const channels = getMatchRoomChannels(fixture, new Date(), getMatchDemoRoomAvailabilityPhase(demoOverride))

    let items: any[] = []
    let total = 0
    if (tab === "main" || tab === "tactics" || tab === "preview" || tab === "post_match") {
      const filter = buildAdminRoomMessageFilter(matchId, tab)
      if (!filter) return errorResponse("Invalid room type", 422)
      const [rows, count] = await Promise.all([
        CommunityPost.find(filter).populate("author", "name avatar role").sort({ createdAt: -1 }).skip(skip).limit(limit),
        CommunityPost.countDocuments(filter),
      ])
      items = rows.map(mapAdminPost)
      total = count
    } else if (tab === "threads") {
      const filter = buildAdminThreadFilter(matchId)
      const [rows, count] = await Promise.all([
        CommunityPost.find(filter).populate("author", "name avatar role").sort({ isPinned: -1, latestActivityAt: -1, createdAt: -1 }).skip(skip).limit(limit),
        CommunityPost.countDocuments(filter),
      ])
      items = rows.map(mapAdminPost)
      total = count
    } else if (tab === "polls") {
      const filter = buildAdminPollFilter(matchId)
      const [rows, count] = await Promise.all([
        CommunityPost.find(filter).populate("author", "name avatar role").sort({ createdAt: -1 }).skip(skip).limit(limit),
        CommunityPost.countDocuments(filter),
      ])
      items = rows.map(mapAdminPost)
      total = count
    } else if (tab === "reports") {
      const contentIds = await getMatchContentIds(matchId)
      const filter = { $or: [{ targetId: { $in: contentIds } }, { post: { $in: contentIds } }] }
      const [rows, count] = await Promise.all([
        CommunityReport.find(filter).populate("reporter", "name avatar").sort({ createdAt: -1 }).skip(skip).limit(limit),
        CommunityReport.countDocuments(filter),
      ])
      items = rows.map((report: any) => ({
        id: report._id.toString(),
        targetType: report.targetType || "post",
        targetId: report.targetId || report.post?.toString?.() || "",
        reason: report.reason,
        description: report.description || "",
        status: report.status,
        createdAt: report.createdAt,
        timeAgo: getTimeAgoThai(report.createdAt),
        reporter: { name: report.reporter?.name || "ผู้ใช้งาน", avatar: report.reporter?.avatar || "" },
      }))
      total = count
    } else if (tab === "moderation" || tab === "audit") {
      const contentIds = await getMatchContentIds(matchId)
      const filter =
        tab === "audit"
          ? { "metadata.matchId": matchId }
          : { $or: [{ contentId: { $in: contentIds } }, { "metadata.matchId": matchId }] }
      const [rows, count] = await Promise.all([
        ModerationLog.find(filter).populate("reviewedBy", "email role").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        ModerationLog.countDocuments(filter),
      ])
      items = rows.map((log: any) => ({
        id: log._id.toString(),
        action: log.action,
        contentType: log.contentType,
        contentId: log.contentId,
        status: log.status,
        reasons: log.reasons || [],
        metadata: log.metadata || {},
        createdAt: log.createdAt,
      }))
      total = count
    }

    return ok({
      fixture,
      channels,
      demoOverride,
      overview,
      tab,
      roomType,
      items,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load admin match room"
    return errorResponse(message, message === "Admin authentication required" ? 401 : message === "Admin permission denied" ? 403 : 500)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  try {
    await connectDatabase()
    const admin = await requireAdminRoles(request, ["superadmin", "admincommunity"])
    const { matchId } = await params
    const fixture = await getMatchRoomFixture(matchId)
    if (!fixture || fixture.id !== matchId) return errorResponse("Match not found", 404)

    const body = await request.json()
    if (typeof body.requestedPhase === "string") {
      const requestedPhase = normalizeMatchDemoOverridePhase(body.requestedPhase)
      if (!requestedPhase) return errorResponse("Invalid demo phase", 422)
      const reasonCheck = validateDemoOverrideReason(body.reason)
      if (!reasonCheck.ok) return errorResponse(reasonCheck.error, 422)
      const result = await setMatchDemoOverride({
        admin,
        matchId,
        fixture,
        requestedPhase,
        reason: sanitizeReason(reasonCheck.reason),
      })
      return ok({ success: true, demoOverride: result.state, idempotent: result.idempotent })
    }

    const action = normalizeAdminMatchRoomAction(body.action)
    if (!action) return errorResponse("Invalid action", 422)
    const roomType = normalizeMatchRoomType(body.roomType || "")
    const targetId = String(body.targetId || "").trim()
    const reasonCheck = validateAdminActionReason(action, body.reason)
    if (!reasonCheck.ok) return errorResponse(reasonCheck.error, 422)
    const reason = sanitizeReason(reasonCheck.reason)

    if (action === "room_manual_close" || action === "room_manual_archive") {
      if (!isTemporaryMatchRoomType(roomType)) return errorResponse("Temporary room action requires preview or post_match", 422)
      const now = new Date()
      const update =
        action === "room_manual_archive"
          ? { $set: { roomClosedAt: now, archivedAt: now, "moderation.metadata.manualArchiveReason": reason } }
          : { $set: { roomClosedAt: now, "moderation.metadata.manualCloseReason": reason } }
      const result = await CommunityPost.updateMany({ matchId, roomType, isRoomMessage: true, contentType: "room_message" }, update)
      await logAdminAction({
        admin,
        action,
        matchId,
        roomType,
        targetType: "room_message",
        previousStatus: "",
        newStatus: action === "room_manual_archive" ? "archived" : "closed",
        reason,
      })
      return ok({ success: true, modifiedCount: result.modifiedCount || 0, idempotent: true })
    }

    if (!targetId) return errorResponse("Target is required", 422)
    const target = await CommunityPost.findOne({ _id: targetId, matchId })
    if (!target) return errorResponse("Target not found", 404)
    const previousStatus = target.status || "published"
    const targetType = target.contentType === "match_poll" ? "match_poll" : target.isThreadRoot ? "thread_root" : "room_message"

    if (action.startsWith("message_") && !target.isRoomMessage) return errorResponse("Target is not a room message", 422)
    if (action.startsWith("thread_") && !target.isThreadRoot) return errorResponse("Target is not a thread", 422)
    if (action.startsWith("poll_") && target.contentType !== "match_poll") return errorResponse("Target is not a poll", 422)

    if (action.endsWith("_hide") || action === "message_soft_delete") {
      target.status = "hidden"
      target.moderation = {
        ...(target.moderation?.toObject?.() || target.moderation || {}),
        status: "pending_review",
        provider: "manual",
        reviewedAt: new Date(),
        metadata: {
          ...((target.moderation?.metadata?.toObject?.() || target.moderation?.metadata || {}) as Record<string, unknown>),
          adminAction: action,
          adminReason: reason,
        },
      }
    }
    if (action.endsWith("_unhide")) {
      target.status = "published"
      target.moderation = {
        ...(target.moderation?.toObject?.() || target.moderation || {}),
        status: "approved",
        provider: "manual",
        reviewedAt: new Date(),
      }
    }
    if (action === "thread_pin") target.isPinned = true
    if (action === "thread_unpin") target.isPinned = false
    if (action === "thread_official") target.isOfficialThread = true
    if (action === "thread_unofficial") target.isOfficialThread = false

    await target.save()
    await logAdminAction({
      admin,
      action,
      matchId,
      roomType: target.roomType || roomType || "",
      targetType,
      targetId: target._id.toString(),
      previousStatus,
      newStatus: target.status || previousStatus,
      reason,
    })

    return ok({ success: true, item: mapAdminPost(await target.populate("author", "name avatar role")) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update admin match room"
    return errorResponse(message, message === "Admin authentication required" ? 401 : message === "Admin permission denied" ? 403 : 500)
  }
}
