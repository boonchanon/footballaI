import { NextRequest } from "next/server"

import { requireAdminRoles } from "@/lib/server/auth"
import { getMatchRoomFixtures } from "@/lib/server/community-match-room"
import { getMatchRoomChannels } from "@/lib/server/community-room-conversation"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, getTimeAgoThai, ok } from "@/lib/server/http"
import { Comment, CommunityPost, CommunityReport, CommunityStory, ModerationLog, User } from "@/lib/server/models"

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    await requireAdminRoles(request, ["superadmin", "admincommunity"])
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const fixtures = await getMatchRoomFixtures().catch(() => [])
    const activeMatchRooms = fixtures.filter((fixture) => getMatchRoomChannels(fixture).some((channel) => channel.state === "open" || channel.state === "closing")).length

    const [
      totalUsers,
      activeCommunityUsers,
      totalPosts,
      postsToday,
      pendingModeration,
      openReports,
      bannedUsers,
      restrictedUsers,
      suspendedUsers,
      threads,
      polls,
      stories,
      recentLogs,
      recentReports,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({
        $or: [
          { "communityStats.postsCount": { $gt: 0 } },
          { "communityStats.matchRoomPostsCount": { $gt: 0 } },
          { "communityStats.pollVotesCount": { $gt: 0 } },
          { followedMatchRooms: { $exists: true, $ne: [] } },
        ],
      }),
      CommunityPost.countDocuments({ contentType: "community_post", isRoomMessage: { $ne: true }, isThreadRoot: { $ne: true } }),
      CommunityPost.countDocuments({ contentType: "community_post", createdAt: { $gte: today } }),
      Promise.all([
        CommunityPost.countDocuments({ "moderation.status": "pending_review" }),
        Comment.countDocuments({ "moderation.status": "pending_review" }),
        CommunityStory.countDocuments({ "moderation.status": "pending_review" }),
      ]).then((counts) => counts.reduce((sum, count) => sum + count, 0)),
      CommunityReport.countDocuments({ status: "pending" }),
      User.countDocuments({ "moderationState.bannedAt": { $ne: null } }),
      User.countDocuments({ "moderationState.postingRestrictedUntil": { $gt: new Date() } }),
      User.countDocuments({ "moderationState.suspendedAt": { $ne: null } }),
      CommunityPost.countDocuments({ contentType: "thread_root", isThreadRoot: true }),
      CommunityPost.countDocuments({ contentType: "match_poll", "poll.question": { $ne: "" } }),
      CommunityStory.countDocuments({}),
      ModerationLog.find({}).populate("reviewedBy", "email role").sort({ createdAt: -1 }).limit(8).lean(),
      CommunityReport.find({ status: "pending" }).populate("reporter", "name").sort({ createdAt: -1 }).limit(8).lean(),
    ])

    return ok({
      metrics: {
        totalUsers,
        activeCommunityUsers,
        totalPosts,
        postsToday,
        pendingModeration,
        openReports,
        bannedUsers,
        restrictedUsers,
        suspendedUsers,
        activeMatchRooms,
        threads,
        polls,
        stories,
      },
      recentOperations: recentLogs.map((log: any) => ({
        id: log._id.toString(),
        action: log.action,
        contentType: log.contentType,
        status: log.status,
        admin: log.reviewedBy ? `${log.reviewedBy.email || "admin"} (${log.reviewedBy.role || "-"})` : "system",
        reason: log.metadata?.reason || "",
        createdAt: log.createdAt,
        timeAgo: getTimeAgoThai(log.createdAt),
      })),
      recentReports: recentReports.map((report: any) => ({
        id: report._id.toString(),
        reason: report.reason,
        targetType: report.targetType || "post",
        reporter: report.reporter?.name || "ผู้ใช้งาน",
        createdAt: report.createdAt,
        timeAgo: getTimeAgoThai(report.createdAt),
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load community overview"
    return errorResponse(message, message === "Admin authentication required" ? 401 : message === "Admin permission denied" ? 403 : 500)
  }
}
