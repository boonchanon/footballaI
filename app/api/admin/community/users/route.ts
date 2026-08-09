import { NextRequest } from "next/server"

import { requireAdminRoles } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok, parsePagination } from "@/lib/server/http"
import { Comment, CommunityPost, CommunityReport, User } from "@/lib/server/models"

function getCommunityStatus(user: any) {
  const state = user?.moderationState || {}
  if (state.bannedAt) return "banned"
  if (state.suspendedAt) return "suspended"
  if (state.postingRestrictedUntil && new Date(state.postingRestrictedUntil).getTime() > Date.now()) return "restricted"
  return "active"
}

function mapUser(user: any, stats: Record<string, any> = {}) {
  const id = user._id.toString()
  const moderationState = user.moderationState || {}
  return {
    id,
    name: user.name || user.email || "ผู้ใช้งาน",
    email: user.email || "",
    avatar: user.avatar || "",
    favoriteTeam: user.favoriteTeam || "",
    role: user.role || "user",
    status: getCommunityStatus(user),
    warningsCount: Number(moderationState.warningsCount || 0),
    postingRestrictedUntil: moderationState.postingRestrictedUntil || null,
    suspendedAt: moderationState.suspendedAt || null,
    bannedAt: moderationState.bannedAt || null,
    lastActionAt: moderationState.lastActionAt || null,
    communityStats: {
      posts: Number(stats.posts || 0),
      threads: Number(stats.threads || 0),
      polls: Number(stats.polls || 0),
      roomMessages: Number(stats.roomMessages || 0),
      comments: Number(stats.comments || 0),
      reportsAgainst: Number(stats.reportsAgainst || 0),
      pollVotes: Number(user.communityStats?.pollVotesCount || 0),
      matchRoomPosts: Number(user.communityStats?.matchRoomPostsCount || 0),
    },
    createdAt: user.createdAt,
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    await requireAdminRoles(request, ["superadmin", "admincommunity"])

    const searchParams = request.nextUrl.searchParams
    const { page, limit, skip } = parsePagination(searchParams)
    const q = String(searchParams.get("q") || "").trim()
    const status = String(searchParams.get("status") || "all").trim()

    const filter: Record<string, unknown> = {}
    if (q) {
      const regex = { $regex: q, $options: "i" }
      filter.$or = [{ name: regex }, { email: regex }]
    }
    if (status === "banned") filter["moderationState.bannedAt"] = { $ne: null }
    if (status === "suspended") filter["moderationState.suspendedAt"] = { $ne: null }
    if (status === "restricted") filter["moderationState.postingRestrictedUntil"] = { $gt: new Date() }
    if (status === "active") {
      filter.$and = [
        { $or: [{ "moderationState.bannedAt": null }, { "moderationState.bannedAt": { $exists: false } }] },
        { $or: [{ "moderationState.suspendedAt": null }, { "moderationState.suspendedAt": { $exists: false } }] },
        {
          $or: [
            { "moderationState.postingRestrictedUntil": null },
            { "moderationState.postingRestrictedUntil": { $exists: false } },
            { "moderationState.postingRestrictedUntil": { $lte: new Date() } },
          ],
        },
      ]
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ "moderationState.lastActionAt": -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("name email avatar favoriteTeam role moderationState communityStats createdAt"),
      User.countDocuments(filter),
    ])

    const userIds = users.map((user: any) => user._id)
    const [postStats, commentStats, reportStats] = userIds.length
      ? await Promise.all([
          CommunityPost.aggregate([
            { $match: { author: { $in: userIds } } },
            {
              $group: {
                _id: "$author",
                posts: { $sum: { $cond: [{ $eq: ["$contentType", "community_post"] }, 1, 0] } },
                threads: { $sum: { $cond: [{ $eq: ["$contentType", "thread_root"] }, 1, 0] } },
                polls: { $sum: { $cond: [{ $eq: ["$contentType", "match_poll"] }, 1, 0] } },
                roomMessages: { $sum: { $cond: [{ $eq: ["$contentType", "room_message"] }, 1, 0] } },
              },
            },
          ]),
          Comment.aggregate([{ $match: { user: { $in: userIds } } }, { $group: { _id: "$user", comments: { $sum: 1 } } }]),
          CommunityReport.aggregate([
            { $match: { status: "pending" } },
            { $group: { _id: "$targetId", reports: { $sum: 1 } } },
          ]),
        ])
      : [[], [], []]

    const statsByUser = new Map<string, Record<string, number>>()
    for (const item of postStats as any[]) statsByUser.set(item._id.toString(), { ...(statsByUser.get(item._id.toString()) || {}), ...item })
    for (const item of commentStats as any[]) statsByUser.set(item._id.toString(), { ...(statsByUser.get(item._id.toString()) || {}), comments: item.comments })

    const authorIdsWithReports = new Map<string, number>()
    if ((reportStats as any[]).length) {
      const targetIds = (reportStats as any[]).map((item) => item._id).filter(Boolean)
      const targets = await CommunityPost.find({ _id: { $in: targetIds } }).select("author")
      for (const target of targets as any[]) {
        authorIdsWithReports.set(target.author.toString(), (authorIdsWithReports.get(target.author.toString()) || 0) + 1)
      }
    }

    return ok({
      items: users.map((user: any) => {
        const id = user._id.toString()
        return mapUser(user, { ...(statsByUser.get(id) || {}), reportsAgainst: authorIdsWithReports.get(id) || 0 })
      }),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load community users"
    return errorResponse(message, message === "Admin authentication required" ? 401 : message === "Admin permission denied" ? 403 : 500)
  }
}
