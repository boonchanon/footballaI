import { NextRequest } from "next/server"

import { canManageCommunityAdmin } from "@/lib/admin-access"
import { getMatchDemoRoomAvailabilityPhase } from "@/lib/match-demo-override"
import { getAuthUser } from "@/lib/server/auth"
import { buildViewerVisibleModeratedContentFilter, mapCommunityPostWithMedia } from "@/lib/server/community"
import {
  buildMatchRoomActivityIndicators,
  getMatchRoomLastVisited,
  markMatchRoomVisited,
  normalizeFollowedMatchRooms,
  normalizeRecentMatchRooms,
} from "@/lib/server/community-match-follow"
import { buildThreadDbSort, isAiSafeCommunityCommentSource, isAiSafeThreadSource } from "@/lib/server/community-threads"
import {
  buildFanReactionAggregate,
  buildPostMatchPollTemplate,
  buildSmartComposerPrompts,
  getCachedMatchRoomSummary,
  getMatchRoomFixture,
  getMatchRoomFixtures,
  normalizeMatchRoomId,
  selectMatchRoomFixture,
} from "@/lib/server/community-match-room"
import { getMatchDemoOverrideState } from "@/lib/server/community-match-demo-override"
import { buildApprovedRoomActivityFilter, getRoomState, getTemporaryRoomActivityState, getVisibleMatchRoomChannels } from "@/lib/server/community-room-conversation"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { Comment, CommunityMatchSummary, CommunityPost, User } from "@/lib/server/models"

function normalizeTeamName(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s._-]+/g, " ")
}

function isFavoriteTeamFixture(fixture: { homeTeam: string; awayTeam: string }, viewer: any) {
  const favoriteTeam = normalizeTeamName(viewer?.favoriteTeam)
  if (!favoriteTeam) return false
  const homeTeam = normalizeTeamName(fixture.homeTeam)
  const awayTeam = normalizeTeamName(fixture.awayTeam)
  return homeTeam === favoriteTeam || awayTeam === favoriteTeam || homeTeam.includes(favoriteTeam) || awayTeam.includes(favoriteTeam)
}

function getFavoriteTeamSide(fixture: { homeTeam: string; awayTeam: string }, viewer: any): "home" | "away" | null {
  const favoriteTeam = normalizeTeamName(viewer?.favoriteTeam)
  if (!favoriteTeam) return null
  const homeTeam = normalizeTeamName(fixture.homeTeam)
  const awayTeam = normalizeTeamName(fixture.awayTeam)
  if (homeTeam === favoriteTeam || homeTeam.includes(favoriteTeam) || favoriteTeam.includes(homeTeam)) return "home"
  if (awayTeam === favoriteTeam || awayTeam.includes(favoriteTeam) || favoriteTeam.includes(awayTeam)) return "away"
  return null
}

function getMatchRoomTransientErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "")
  const lower = message.toLowerCase()
  if (lower.includes("timeout") || lower.includes("timed out")) return "TIMEOUT"
  if (lower.includes("network") || lower.includes("fetch failed") || lower.includes("econn") || lower.includes("enotfound")) return "NETWORK_ERROR"
  return "PROVIDER_ERROR"
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    await connectDatabase()
    const viewer = await getAuthUser(request)
    const searchParams = request.nextUrl.searchParams
    const matchId = normalizeMatchRoomId(searchParams.get("matchId"))
    const directoryFixtures = await getMatchRoomFixtures({ favoriteTeamName: String(viewer?.favoriteTeam || "") })
    const fixture = matchId ? await getMatchRoomFixture(matchId) : selectMatchRoomFixture(directoryFixtures, matchId)
    if (matchId && !fixture) return errorResponse("Match not found", 404, { code: "MATCH_NOT_FOUND", requestId })
    const fixtures = fixture && !directoryFixtures.some((item) => item.id === fixture.id) ? [fixture, ...directoryFixtures] : directoryFixtures
    const selectedMatchId = fixture?.id || matchId
    const selectedDemoOverride = fixture?.id ? await getMatchDemoOverrideState(fixture.id, fixture) : null
    const selectedRoomAvailabilityPhase =
      selectedDemoOverride?.providerPhase === "full_time"
        ? "auto"
        : selectedDemoOverride
          ? getMatchDemoRoomAvailabilityPhase(selectedDemoOverride)
          : "auto"
    const fixtureIds = fixtures.map((item) => item.id).filter(Boolean)
    const roomStatsEntries = fixtureIds.length
      ? await CommunityPost.aggregate([
          {
            $match: {
              matchId: { $in: fixtureIds },
              ...buildViewerVisibleModeratedContentFilter(null),
            },
          },
          {
            $group: {
              _id: "$matchId",
              discussions: { $sum: 1 },
              polls: {
                $sum: {
                  $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$poll.question", ""] } }, 0] }, 1, 0],
                },
              },
              latestActivityAt: { $max: "$latestActivityAt" },
              latestPostAt: { $max: "$createdAt" },
              latestPollAt: {
                $max: {
                  $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$poll.question", ""] } }, 0] }, "$createdAt", null],
                },
              },
            },
          },
        ])
      : []
    const followedRooms = normalizeFollowedMatchRooms((viewer as any)?.followedMatchRooms)
    const recentRooms = normalizeRecentMatchRooms((viewer as any)?.recentMatchRooms)
    const followedMatchIds = followedRooms.map((item) => item.matchId)
    const recentMatchIds = recentRooms.map((item) => item.matchId)
    const [followerEntries, summaryEntries] = fixtureIds.length
      ? await Promise.all([
          User.aggregate([
            { $match: { "followedMatchRooms.matchId": { $in: fixtureIds }, "moderationState.bannedAt": null } },
            { $unwind: "$followedMatchRooms" },
            { $match: { "followedMatchRooms.matchId": { $in: fixtureIds } } },
            { $group: { _id: "$followedMatchRooms.matchId", followers: { $sum: 1 } } },
          ]),
          CommunityMatchSummary.find({ matchId: { $in: fixtureIds } }).select("matchId status summaryVersion generatedAt").lean(),
        ])
      : [[], []]
    const roomActivityEntries = fixtureIds.length
      ? await CommunityPost.aggregate([
          {
            $match: {
              matchId: { $in: fixtureIds },
              ...buildApprovedRoomActivityFilter(),
            },
          },
          {
            $group: {
              _id: "$matchId",
              newRoomMessageCount: { $sum: 1 },
              latestRoomActivityAt: { $max: "$latestActivityAt" },
              latestRoomType: { $last: "$roomType" },
            },
          },
        ])
      : []
    const previewLoungeActivityEntries = fixtureIds.length
      ? await CommunityPost.aggregate([
          {
            $match: {
              matchId: { $in: fixtureIds },
              tags: { $in: ["match-preview:home", "match-preview:away"] },
              ...buildApprovedRoomActivityFilter(),
            },
          },
          { $unwind: "$tags" },
          { $match: { tags: { $in: ["match-preview:home", "match-preview:away"] } } },
          {
            $group: {
              _id: { matchId: "$matchId", tag: "$tags" },
              messages: { $sum: 1 },
              latestActivityAt: { $max: "$latestActivityAt" },
            },
          },
        ])
      : []
    const postMatchLoungeActivityEntries = fixtureIds.length
      ? await CommunityPost.aggregate([
          {
            $match: {
              matchId: { $in: fixtureIds },
              tags: { $in: ["match-post-match:home", "match-post-match:away"] },
              ...buildApprovedRoomActivityFilter(),
            },
          },
          { $unwind: "$tags" },
          { $match: { tags: { $in: ["match-post-match:home", "match-post-match:away"] } } },
          {
            $group: {
              _id: { matchId: "$matchId", tag: "$tags" },
              messages: { $sum: 1 },
              latestActivityAt: { $max: "$latestActivityAt" },
            },
          },
        ])
      : []
    const followerCounts = Object.fromEntries(followerEntries.map((item: any) => [item._id, item.followers || 0]))
    const summaryState = Object.fromEntries(summaryEntries.map((item: any) => [item.matchId, item]))
    const roomActivityState = Object.fromEntries(roomActivityEntries.map((item: any) => [item._id, item]))
    const defaultPreviewLounges = () => ({
      home: { messages: 0, latestActivityAt: null as Date | string | null },
      away: { messages: 0, latestActivityAt: null as Date | string | null },
    })
    const defaultPostMatchLounges = () => ({
      home: { messages: 0, messageCount: 0, latestActivityAt: null as Date | string | null, status: "unavailable", recommended: false, archived: false },
      away: { messages: 0, messageCount: 0, latestActivityAt: null as Date | string | null, status: "unavailable", recommended: false, archived: false },
    })
    const previewLoungeState = previewLoungeActivityEntries.reduce<Record<string, ReturnType<typeof defaultPreviewLounges>>>((acc, item: any) => {
      const matchId = String(item?._id?.matchId || "")
      const side = String(item?._id?.tag || "").replace("match-preview:", "")
      if (!matchId || (side !== "home" && side !== "away")) return acc
      acc[matchId] ||= defaultPreviewLounges()
      acc[matchId][side] = { messages: item.messages || 0, latestActivityAt: item.latestActivityAt || null }
      return acc
    }, {})
    const postMatchLoungeState = postMatchLoungeActivityEntries.reduce<Record<string, ReturnType<typeof defaultPostMatchLounges>>>((acc, item: any) => {
      const matchId = String(item?._id?.matchId || "")
      const side = String(item?._id?.tag || "").replace("match-post-match:", "")
      if (!matchId || (side !== "home" && side !== "away")) return acc
      acc[matchId] ||= defaultPostMatchLounges()
      acc[matchId][side] = { ...acc[matchId][side], messages: item.messages || 0, messageCount: item.messages || 0, latestActivityAt: item.latestActivityAt || null }
      return acc
    }, {})
    const roomStats: Record<
      string,
      {
        discussions: number
        polls: number
        followers: number
        latestActivityAt: Date | string | null
        latestPollAt: Date | string | null
        newRoomMessageCount: number
        latestRoomActivityAt: Date | string | null
        latestRoomType: string
        summaryStatus: string
        summaryVersion: string
        isFollowing: boolean
        isRecent: boolean
        isFavoriteTeam: boolean
        favoriteTeamName: string
        previewLounges: ReturnType<typeof defaultPreviewLounges>
        postMatchLounges: ReturnType<typeof defaultPostMatchLounges>
        lastVisitedAt: Date | string | null
        activity?: {
          hasNewActivity: boolean
          hasNewPoll: boolean
          hasSummaryReady: boolean
          statusChanged: boolean
          temporaryRoom: string
        }
      }
    > = Object.fromEntries(
      roomStatsEntries.map((item: any) => [
        item._id,
        (() => {
          const statsFixture = fixtures.find((fixtureItem) => fixtureItem.id === item._id)
          const postMatchLounges = postMatchLoungeState[item._id] || defaultPostMatchLounges()
          return {
            discussions: item.discussions || 0,
            polls: item.polls || 0,
            followers: followerCounts[item._id] || 0,
            latestActivityAt: item.latestActivityAt || item.latestPostAt || null,
            latestPollAt: item.latestPollAt || null,
            newRoomMessageCount: roomActivityState[item._id]?.newRoomMessageCount || 0,
            latestRoomActivityAt: roomActivityState[item._id]?.latestRoomActivityAt || null,
            latestRoomType: roomActivityState[item._id]?.latestRoomType || "",
            summaryStatus: summaryState[item._id]?.status || "not_generated",
            summaryVersion: summaryState[item._id]?.summaryVersion ? String(summaryState[item._id].summaryVersion) : "0",
            isFollowing: followedMatchIds.includes(item._id),
            isRecent: recentMatchIds.includes(item._id),
            isFavoriteTeam: statsFixture ? isFavoriteTeamFixture(statsFixture, viewer) : false,
            favoriteTeamName: String(viewer?.favoriteTeam || ""),
            previewLounges: previewLoungeState[item._id] || defaultPreviewLounges(),
            postMatchLounges,
            lastVisitedAt: getMatchRoomLastVisited([...(viewer as any)?.followedMatchRooms || [], ...(viewer as any)?.recentMatchRooms || []], item._id),
          }
        })(),
      ]),
    )
    for (const fixtureItem of fixtures) {
      roomStats[fixtureItem.id] ||= {
        discussions: 0,
        polls: 0,
        followers: followerCounts[fixtureItem.id] || 0,
        latestActivityAt: null,
        latestPollAt: null,
        newRoomMessageCount: roomActivityState[fixtureItem.id]?.newRoomMessageCount || 0,
        latestRoomActivityAt: roomActivityState[fixtureItem.id]?.latestRoomActivityAt || null,
        latestRoomType: roomActivityState[fixtureItem.id]?.latestRoomType || "",
        summaryStatus: summaryState[fixtureItem.id]?.status || "not_generated",
        summaryVersion: summaryState[fixtureItem.id]?.summaryVersion ? String(summaryState[fixtureItem.id].summaryVersion) : "0",
        isFollowing: followedMatchIds.includes(fixtureItem.id),
        isRecent: recentMatchIds.includes(fixtureItem.id),
        isFavoriteTeam: isFavoriteTeamFixture(fixtureItem, viewer),
        favoriteTeamName: String(viewer?.favoriteTeam || ""),
        previewLounges: previewLoungeState[fixtureItem.id] || defaultPreviewLounges(),
        postMatchLounges: postMatchLoungeState[fixtureItem.id] || defaultPostMatchLounges(),
        lastVisitedAt: getMatchRoomLastVisited([...(viewer as any)?.followedMatchRooms || [], ...(viewer as any)?.recentMatchRooms || []], fixtureItem.id),
      }
      roomStats[fixtureItem.id].activity = buildMatchRoomActivityIndicators({
        latestActivityAt: roomStats[fixtureItem.id].latestActivityAt,
        latestPollAt: roomStats[fixtureItem.id].latestPollAt,
        lastVisitedAt: roomStats[fixtureItem.id].lastVisitedAt,
        summaryStatus: roomStats[fixtureItem.id].summaryStatus,
        isLive: ["1H", "2H", "HT", "ET", "BT", "P", "SUSP", "INT", "live", "Live", "In Progress"].includes(fixtureItem.status),
        isFinished: fixtureItem.isFinished,
      })
      roomStats[fixtureItem.id].activity.temporaryRoom =
        getTemporaryRoomActivityState(fixtureItem, "preview", new Date(), fixtureItem.id === fixture?.id ? selectedRoomAvailabilityPhase : "auto") !== "none"
          ? getTemporaryRoomActivityState(fixtureItem, "preview", new Date(), fixtureItem.id === fixture?.id ? selectedRoomAvailabilityPhase : "auto")
          : getTemporaryRoomActivityState(fixtureItem, "post_match", new Date(), fixtureItem.id === fixture?.id ? selectedRoomAvailabilityPhase : "auto")
      const postMatchRoom = getRoomState(fixtureItem, "post_match", new Date(), fixtureItem.id === fixture?.id ? selectedRoomAvailabilityPhase : "auto")
      const favoriteSide = getFavoriteTeamSide(fixtureItem, viewer)
      for (const side of ["home", "away"] as const) {
        roomStats[fixtureItem.id].postMatchLounges[side] = {
          ...roomStats[fixtureItem.id].postMatchLounges[side],
          status: postMatchRoom.state,
          recommended: favoriteSide === side,
          archived: postMatchRoom.isArchived,
        }
      }
    }
    const discussionFilter: Record<string, unknown> = {
      matchId: selectedMatchId,
      isThreadRoot: { $ne: true },
      isRoomMessage: { $ne: true },
      contentType: { $nin: ["room_message", "thread_root"] },
      ...buildViewerVisibleModeratedContentFilter(null),
    }

    const posts = selectedMatchId
      ? await CommunityPost.find(discussionFilter).populate("author", "name avatar favoriteTeam role fanBadges communityStats").sort({ createdAt: -1 }).limit(8)
      : []

    const threads = selectedMatchId
      ? await CommunityPost.find({
          matchId: selectedMatchId,
          isThreadRoot: true,
          ...buildViewerVisibleModeratedContentFilter(viewer?._id?.toString?.() || null),
        })
          .populate("author", "name avatar favoriteTeam role fanBadges communityStats")
          .sort(buildThreadDbSort("latest"))
          .limit(8)
      : []

    const approvedCommunitySources = [...posts, ...threads].filter((post: any) =>
      isAiSafeThreadSource({
        status: post.status,
        moderation: post.moderation,
        isDeleted: post.isDeleted,
        isHidden: post.isHidden,
      }),
    )
    const sourcePostIds = approvedCommunitySources.map((post: any) => post._id.toString())
    const commentDocs = sourcePostIds.length
      ? await Comment.find({
          targetType: "post",
          targetId: { $in: sourcePostIds },
        })
          .sort({ createdAt: -1 })
          .limit(40)
      : []
    const safeCommentTexts = commentDocs
      .filter((comment: any) =>
        isAiSafeCommunityCommentSource({
          isApproved: comment.isApproved,
          moderation: comment.moderation,
          isDeleted: comment.isDeleted,
          isHidden: comment.isHidden,
        }),
      )
      .map((comment: any) => String(comment.content || ""))

    const fanReaction = buildFanReactionAggregate({
      polls: approvedCommunitySources
        .filter((post: any) => post.poll?.question)
        .map((post: any) => ({ title: post.title, poll: post.poll })),
      texts: [
        ...approvedCommunitySources.flatMap((post: any) => [post.title, post.content]).map((item) => String(item || "")),
        ...safeCommentTexts,
      ],
      minApprovedContent: 3,
    })
    if (viewer?._id && fixture?.id && matchId) {
      await markMatchRoomVisited({
        userId: viewer._id.toString(),
        matchId: fixture.id,
        latestActivityAt: roomStats[fixture.id]?.latestActivityAt,
      })
    }

    return ok({
      fixtures,
      fixture,
      channels: getVisibleMatchRoomChannels(fixture, new Date(), viewer?.role, selectedRoomAvailabilityPhase),
      demoOverride: selectedDemoOverride,
      roomStats,
      summary: await getCachedMatchRoomSummary(fixture, fanReaction),
      fanReaction,
      summaryPermissions: {
        canRegenerate: canManageCommunityAdmin(viewer?.role),
      },
      matchRoomState: {
        isFollowing: Boolean(fixture?.id && followedMatchIds.includes(fixture.id)),
        followedMatchIds,
        recentMatchIds,
      },
      pollTemplate: buildPostMatchPollTemplate(fixture),
      prompts: buildSmartComposerPrompts(fixture),
      posts: await Promise.all(posts.map((post: any) => mapCommunityPostWithMedia(post, viewer))),
      threads: await Promise.all(threads.map((post: any) => mapCommunityPostWithMedia(post, viewer))),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load match room"
    const code = getMatchRoomTransientErrorCode(error)
    console.error("[match-room] load failed", {
      requestId,
      code,
      message,
    })
    return errorResponse("โหลดข้อมูล Match Room ไม่สำเร็จ", 503, { code, requestId })
  }
}
