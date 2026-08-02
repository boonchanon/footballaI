import { NextRequest } from "next/server"

import { requireAdminRoles } from "@/lib/server/auth"
import { normalizeAdminMatchRoomListFilter } from "@/lib/server/admin-community-match-rooms"
import { getMatchRoomFixtures } from "@/lib/server/community-match-room"
import { getMatchRoomChannels } from "@/lib/server/community-room-conversation"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok, parsePagination } from "@/lib/server/http"
import { CommunityPost, User } from "@/lib/server/models"

function normalizeSearch(value: unknown) {
  return String(value || "").trim().toLowerCase()
}

function matchSearch(fixture: any, query: string) {
  if (!query) return true
  return [fixture.id, fixture.homeTeam, fixture.awayTeam, fixture.status].some((value) => String(value || "").toLowerCase().includes(query))
}

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    await requireAdminRoles(request, ["superadmin", "admincommunity"])

    const searchParams = request.nextUrl.searchParams
    const { page, limit } = parsePagination(searchParams)
    const filterMode = normalizeAdminMatchRoomListFilter(searchParams.get("filter"))
    const q = normalizeSearch(searchParams.get("q"))
    const status = normalizeSearch(searchParams.get("status"))
    const roomType = normalizeSearch(searchParams.get("roomType"))
    const date = normalizeSearch(searchParams.get("date"))

    const fixtures = (await getMatchRoomFixtures()).filter((fixture) => {
      if (!matchSearch(fixture, q)) return false
      if (status && status !== "all" && normalizeSearch(fixture.status) !== status) return false
      if (date && !String(fixture.kickoff || "").startsWith(date)) return false
      return true
    })
    const fixtureIds = fixtures.map((fixture) => fixture.id)

    const [postStats, followerStats] = fixtureIds.length
      ? await Promise.all([
          CommunityPost.aggregate([
            { $match: { matchId: { $in: fixtureIds } } },
            {
              $group: {
                _id: "$matchId",
                roomMessages: { $sum: { $cond: [{ $eq: ["$contentType", "room_message"] }, 1, 0] } },
                threads: { $sum: { $cond: [{ $eq: ["$contentType", "thread_root"] }, 1, 0] } },
                polls: { $sum: { $cond: [{ $eq: ["$contentType", "match_poll"] }, 1, 0] } },
                reports: { $sum: "$reportsCount" },
                latestActivityAt: { $max: "$latestActivityAt" },
                latestCreatedAt: { $max: "$createdAt" },
                archivedMessages: { $sum: { $cond: [{ $ne: ["$archivedAt", null] }, 1, 0] } },
              },
            },
          ]),
          User.aggregate([
            { $match: { "followedMatchRooms.matchId": { $in: fixtureIds }, "moderationState.bannedAt": null } },
            { $unwind: "$followedMatchRooms" },
            { $match: { "followedMatchRooms.matchId": { $in: fixtureIds } } },
            { $group: { _id: "$followedMatchRooms.matchId", followers: { $sum: 1 } } },
          ]),
        ])
      : [[], []]

    const statsByMatch = Object.fromEntries(postStats.map((item: any) => [item._id, item]))
    const followersByMatch = Object.fromEntries(followerStats.map((item: any) => [item._id, item.followers || 0]))

    const allItems = fixtures
      .map((fixture) => {
        const channels = getMatchRoomChannels(fixture)
        const stats = statsByMatch[fixture.id] || {}
        return {
          matchId: fixture.id,
          fixture,
          channels,
          counts: {
            roomMessages: stats.roomMessages || 0,
            threads: stats.threads || 0,
            polls: stats.polls || 0,
            reports: stats.reports || 0,
            followers: followersByMatch[fixture.id] || 0,
            archivedMessages: stats.archivedMessages || 0,
          },
          latestActivityAt: stats.latestActivityAt || stats.latestCreatedAt || null,
          hasReports: Number(stats.reports || 0) > 0,
          hasArchivedRoom: channels.some((channel) => channel.isArchived) || Number(stats.archivedMessages || 0) > 0,
        }
      })
      .filter((item) => {
        if (roomType && roomType !== "all" && !item.channels.some((channel: any) => channel.roomType === roomType)) return false
        if (filterMode === "archived") return item.hasArchivedRoom
        if (filterMode === "reports") return item.hasReports
        if (filterMode === "preview_open") return item.channels.some((channel: any) => channel.roomType === "preview" && (channel.state === "open" || channel.state === "closing"))
        if (filterMode === "post_match_open") return item.channels.some((channel: any) => channel.roomType === "post_match" && (channel.state === "open" || channel.state === "closing"))
        if (filterMode === "active") return item.channels.some((channel: any) => channel.state === "open" || channel.state === "closing")
        return true
      })

    const total = allItems.length
    const items = allItems.slice((page - 1) * limit, page * limit)

    return ok({
      items,
      filters: { filter: filterMode, q, status, roomType, date },
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load admin match rooms"
    return errorResponse(message, message === "Admin authentication required" ? 401 : message === "Admin permission denied" ? 403 : 500)
  }
}
