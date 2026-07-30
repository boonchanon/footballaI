import { NextRequest } from "next/server"

import { canManageCommunityAdmin } from "@/lib/admin-access"
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
  getMatchRoomFixtures,
  selectMatchRoomFixture,
} from "@/lib/server/community-match-room"
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

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    const viewer = await getAuthUser(request)
    const searchParams = request.nextUrl.searchParams
    const matchId = String(searchParams.get("matchId") || "").trim()
    const fixtures = await getMatchRoomFixtures()
    const fixture = selectMatchRoomFixture(fixtures, matchId)
    const selectedMatchId = fixture?.id || matchId
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
    const followerCounts = Object.fromEntries(followerEntries.map((item: any) => [item._id, item.followers || 0]))
    const summaryState = Object.fromEntries(summaryEntries.map((item: any) => [item.matchId, item]))
    const roomStats: Record<
      string,
      {
        discussions: number
        polls: number
        followers: number
        latestActivityAt: Date | string | null
        latestPollAt: Date | string | null
        summaryStatus: string
        summaryVersion: string
        isFollowing: boolean
        isRecent: boolean
        isFavoriteTeam: boolean
        lastVisitedAt: Date | string | null
        activity?: {
          hasNewActivity: boolean
          hasNewPoll: boolean
          hasSummaryReady: boolean
          statusChanged: boolean
        }
      }
    > = Object.fromEntries(
      roomStatsEntries.map((item: any) => [
        item._id,
        (() => {
          const statsFixture = fixtures.find((fixtureItem) => fixtureItem.id === item._id)
          return {
            discussions: item.discussions || 0,
            polls: item.polls || 0,
            followers: followerCounts[item._id] || 0,
            latestActivityAt: item.latestActivityAt || item.latestPostAt || null,
            latestPollAt: item.latestPollAt || null,
            summaryStatus: summaryState[item._id]?.status || "not_generated",
            summaryVersion: summaryState[item._id]?.summaryVersion ? String(summaryState[item._id].summaryVersion) : "0",
            isFollowing: followedMatchIds.includes(item._id),
            isRecent: recentMatchIds.includes(item._id),
            isFavoriteTeam: statsFixture ? isFavoriteTeamFixture(statsFixture, viewer) : false,
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
        summaryStatus: summaryState[fixtureItem.id]?.status || "not_generated",
        summaryVersion: summaryState[fixtureItem.id]?.summaryVersion ? String(summaryState[fixtureItem.id].summaryVersion) : "0",
        isFollowing: followedMatchIds.includes(fixtureItem.id),
        isRecent: recentMatchIds.includes(fixtureItem.id),
        isFavoriteTeam: isFavoriteTeamFixture(fixtureItem, viewer),
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
    }
    const discussionFilter: Record<string, unknown> = {
      matchId: selectedMatchId,
      isThreadRoot: { $ne: true },
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
    return errorResponse(error instanceof Error ? error.message : "Failed to load match room", 500)
  }
}
