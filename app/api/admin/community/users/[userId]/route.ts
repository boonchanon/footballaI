import { NextRequest } from "next/server"

import { requireAdminRoles } from "@/lib/server/auth"
import {
  applyUserModerationAction,
  createModerationLog,
  normalizeRestrictionDuration,
  notifyUserModerationAction,
  type UserModerationAction,
} from "@/lib/server/content-moderation"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, getTimeAgoThai, ok, parsePagination } from "@/lib/server/http"
import { Comment, CommunityPost, CommunityReport, ModerationLog, User } from "@/lib/server/models"

const USER_ACTIONS = new Set<UserModerationAction>(["warn", "restrict", "clear_restriction", "suspend", "unsuspend", "ban", "unban"])

function sanitizeReason(value: unknown) {
  return String(value || "").trim().slice(0, 500)
}

function getCommunityStatus(user: any) {
  const state = user?.moderationState || {}
  if (state.bannedAt) return "banned"
  if (state.suspendedAt) return "suspended"
  if (state.postingRestrictedUntil && new Date(state.postingRestrictedUntil).getTime() > Date.now()) return "restricted"
  return "active"
}

function mapModerationState(user: any) {
  const state = user?.moderationState || {}
  return {
    status: getCommunityStatus(user),
    warningsCount: Number(state.warningsCount || 0),
    postingRestrictedUntil: state.postingRestrictedUntil || null,
    suspendedAt: state.suspendedAt || null,
    bannedAt: state.bannedAt || null,
    lastActionAt: state.lastActionAt || null,
  }
}

function mapPost(post: any) {
  return {
    id: post._id.toString(),
    title: post.title || "",
    contentType: post.contentType || "community_post",
    status: post.status || "published",
    moderationStatus: post.moderation?.status || "approved",
    reportsCount: Number(post.reportsCount || 0),
    matchId: post.matchId || "",
    roomType: post.roomType || "",
    createdAt: post.createdAt,
    timeAgo: getTimeAgoThai(post.createdAt),
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    await connectDatabase()
    await requireAdminRoles(request, ["superadmin", "admincommunity"])
    const { userId } = await params
    const { limit } = parsePagination(request.nextUrl.searchParams)

    const user = await User.findById(userId).select("name email avatar favoriteTeam role bio moderationState communityStats followedMatchRooms createdAt")
    if (!user) return errorResponse("User not found", 404)

    const [posts, commentsCount, reportsAgainst, history] = await Promise.all([
      CommunityPost.find({ author: user._id }).sort({ createdAt: -1 }).limit(Math.min(limit, 20)),
      Comment.countDocuments({ user: user._id }),
      CommunityReport.find({ status: "pending" }).sort({ createdAt: -1 }).limit(80),
      ModerationLog.find({ $or: [{ user: user._id }, { "metadata.targetUserId": user._id.toString() }] })
        .populate("reviewedBy", "email role")
        .sort({ createdAt: -1 })
        .limit(30),
    ])

    const authoredPostIds = new Set(posts.map((post: any) => post._id.toString()))
    const matchingReports = reportsAgainst.filter((report: any) => {
      const targetId = String(report.targetId || report.post?.toString?.() || "")
      return authoredPostIds.has(targetId)
    })

    return ok({
      user: {
        id: user._id.toString(),
        name: user.name || user.email || "ผู้ใช้งาน",
        email: user.email || "",
        avatar: user.avatar || "",
        favoriteTeam: user.favoriteTeam || "",
        role: user.role || "user",
        bio: user.bio || "",
        createdAt: user.createdAt,
        moderationState: mapModerationState(user),
        communityStats: {
          posts: posts.length,
          comments: commentsCount,
          pollVotes: Number(user.communityStats?.pollVotesCount || 0),
          matchRoomPosts: Number(user.communityStats?.matchRoomPostsCount || 0),
          followedMatchRooms: Array.isArray(user.followedMatchRooms) ? user.followedMatchRooms.length : 0,
          reportsAgainst: matchingReports.length,
        },
      },
      posts: posts.map(mapPost),
      reportsAgainst: matchingReports.slice(0, 20).map((report: any) => ({
        id: report._id.toString(),
        reason: report.reason,
        status: report.status,
        targetType: report.targetType || "post",
        targetId: report.targetId || report.post?.toString?.() || "",
        createdAt: report.createdAt,
        timeAgo: getTimeAgoThai(report.createdAt),
      })),
      history: history.map((item: any) => ({
        id: item._id.toString(),
        action: item.action,
        contentType: item.contentType,
        contentId: item.contentId,
        status: item.status,
        reasons: item.reasons || [],
        metadata: item.metadata || {},
        admin: item.reviewedBy ? { email: item.reviewedBy.email || "", role: item.reviewedBy.role || "" } : null,
        createdAt: item.createdAt,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load community user"
    return errorResponse(message, message === "Admin authentication required" ? 401 : message === "Admin permission denied" ? 403 : 500)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    await connectDatabase()
    const admin = await requireAdminRoles(request, ["superadmin", "admincommunity"])
    const { userId } = await params
    const body = await request.json().catch(() => ({}))
    const action = String(body.action || "").trim() as UserModerationAction
    const reason = sanitizeReason(body.reason)
    const duration = normalizeRestrictionDuration(body.duration)

    if (!USER_ACTIONS.has(action)) return errorResponse("Invalid action", 422)
    if (reason.length < 6) return errorResponse("Reason is required", 422)

    const user = await User.findById(userId).select("moderationState name email")
    if (!user) return errorResponse("User not found", 404)

    const before = mapModerationState(user)
    const already =
      (action === "ban" && Boolean(before.bannedAt)) ||
      (action === "unban" && !before.bannedAt) ||
      (action === "suspend" && Boolean(before.suspendedAt)) ||
      (action === "unsuspend" && !before.suspendedAt) ||
      (action === "clear_restriction" && !before.postingRestrictedUntil)

    if (!already) {
      await applyUserModerationAction({ userId, action, duration })
      await notifyUserModerationAction({
        recipientId: userId,
        action,
        referenceType: "account",
        referenceId: action,
      })
    }

    const updatedUser = await User.findById(userId).select("moderationState")
    const after = mapModerationState(updatedUser)

    if (!already) {
      await createModerationLog({
        userId,
        contentType: "post",
        contentId: `user:${userId}`,
        status: "approved",
        action: `user_${action}`,
        provider: "manual",
        reviewedBy: admin._id.toString(),
        metadata: {
          targetUserId: userId,
          actorRole: admin.role,
          reason,
          duration: action === "restrict" ? duration : "",
          before,
          after,
        },
      })
    }

    return ok({
      success: true,
      idempotent: already,
      moderationState: after,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update community user"
    return errorResponse(message, message === "Admin authentication required" ? 401 : message === "Admin permission denied" ? 403 : 500)
  }
}
