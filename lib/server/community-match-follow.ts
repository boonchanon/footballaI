import { COMMUNITY_FAN_BADGES } from "./community-fan-profile"
import { User } from "./models"

export const MAX_FOLLOWED_MATCH_ROOMS = 50
export const MAX_RECENT_MATCH_ROOMS = 12

export type MatchRoomFollowEntry = {
  matchId: string
  followedAt?: Date | string | null
  lastVisitedAt?: Date | string | null
  lastSeenActivityAt?: Date | string | null
}

export type MatchRoomRecentEntry = {
  matchId: string
  lastVisitedAt?: Date | string | null
}

export function normalizeMatchId(value: unknown) {
  const matchId = String(value || "").trim()
  return /^[A-Za-z0-9:_-]{1,100}$/.test(matchId) ? matchId : ""
}

function normalizeDate(value: unknown) {
  const date = value ? new Date(value as any) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}

export function normalizeFollowedMatchRooms(value: unknown, limit = MAX_FOLLOWED_MATCH_ROOMS): MatchRoomFollowEntry[] {
  if (!Array.isArray(value)) return []
  const byMatch = new Map<string, MatchRoomFollowEntry>()
  for (const item of value) {
    const matchId = normalizeMatchId((item as any)?.matchId || item)
    if (!matchId || byMatch.has(matchId)) continue
    byMatch.set(matchId, {
      matchId,
      followedAt: normalizeDate((item as any)?.followedAt) || new Date(0),
      lastVisitedAt: normalizeDate((item as any)?.lastVisitedAt),
      lastSeenActivityAt: normalizeDate((item as any)?.lastSeenActivityAt),
    })
  }
  return Array.from(byMatch.values())
    .sort((a, b) => Number(normalizeDate(b.followedAt) || 0) - Number(normalizeDate(a.followedAt) || 0))
    .slice(0, limit)
}

export function normalizeRecentMatchRooms(value: unknown, limit = MAX_RECENT_MATCH_ROOMS): MatchRoomRecentEntry[] {
  if (!Array.isArray(value)) return []
  const byMatch = new Map<string, MatchRoomRecentEntry>()
  for (const item of value) {
    const matchId = normalizeMatchId((item as any)?.matchId || item)
    if (!matchId) continue
    byMatch.set(matchId, {
      matchId,
      lastVisitedAt: normalizeDate((item as any)?.lastVisitedAt) || new Date(0),
    })
  }
  return Array.from(byMatch.values())
    .sort((a, b) => Number(normalizeDate(b.lastVisitedAt) || 0) - Number(normalizeDate(a.lastVisitedAt) || 0))
    .slice(0, limit)
}

export function isMatchRoomFollowed(value: unknown, matchId: string) {
  const safeMatchId = normalizeMatchId(matchId)
  if (!safeMatchId) return false
  return normalizeFollowedMatchRooms(value).some((item) => item.matchId === safeMatchId)
}

export function getMatchRoomLastVisited(value: unknown, matchId: string) {
  const safeMatchId = normalizeMatchId(matchId)
  if (!safeMatchId) return null
  const followed = normalizeFollowedMatchRooms(value).find((item) => item.matchId === safeMatchId)
  const recent = normalizeRecentMatchRooms(value).find((item) => item.matchId === safeMatchId)
  return normalizeDate(followed?.lastVisitedAt) || normalizeDate(recent?.lastVisitedAt)
}

export function hasNewMatchRoomActivity(input: { latestActivityAt?: Date | string | null; lastVisitedAt?: Date | string | null }) {
  const latestActivityAt = normalizeDate(input.latestActivityAt)
  const lastVisitedAt = normalizeDate(input.lastVisitedAt)
  if (!latestActivityAt) return false
  if (!lastVisitedAt) return true
  return latestActivityAt.getTime() > lastVisitedAt.getTime()
}

export function buildMatchRoomActivityIndicators(input: {
  latestActivityAt?: Date | string | null
  latestPollAt?: Date | string | null
  lastVisitedAt?: Date | string | null
  summaryStatus?: string | null
  isLive?: boolean
  isFinished?: boolean
}) {
  const lastVisitedAt = normalizeDate(input.lastVisitedAt)
  const latestPollAt = normalizeDate(input.latestPollAt)
  return {
    hasNewActivity: hasNewMatchRoomActivity({ latestActivityAt: input.latestActivityAt, lastVisitedAt }),
    hasNewPoll: Boolean(latestPollAt && (!lastVisitedAt || latestPollAt.getTime() > lastVisitedAt.getTime())),
    hasSummaryReady: input.summaryStatus === "generated" || input.summaryStatus === "template",
    statusChanged: Boolean(input.isLive || input.isFinished),
  }
}

export async function setMatchRoomFollow(input: { userId: string; matchId: string; follow: boolean }) {
  const matchId = normalizeMatchId(input.matchId)
  if (!input.userId || !matchId) throw new Error("Invalid match")
  const user = await User.findById(input.userId).select("followedMatchRooms recentMatchRooms communityStats fanBadges")
  if (!user) throw new Error("Authentication required")

  const now = new Date()
  const followed = normalizeFollowedMatchRooms((user as any).followedMatchRooms)
  const exists = followed.some((item) => item.matchId === matchId)
  ;(user as any).followedMatchRooms = input.follow
    ? normalizeFollowedMatchRooms([{ matchId, followedAt: now, lastVisitedAt: now, lastSeenActivityAt: now }, ...followed])
    : followed.filter((item) => item.matchId !== matchId)
  if (input.follow) {
    const badges = new Set(Array.isArray((user as any).fanBadges) ? (user as any).fanBadges.map(String) : [])
    badges.add(COMMUNITY_FAN_BADGES.matchRoomFollower.id)
    ;(user as any).fanBadges = Array.from(badges)
  }
  await user.save()
  return {
    isFollowing: input.follow,
    changed: input.follow ? !exists : exists,
    followedMatchIds: normalizeFollowedMatchRooms((user as any).followedMatchRooms).map((item) => item.matchId),
  }
}

export async function markMatchRoomVisited(input: { userId: string; matchId: string; latestActivityAt?: Date | string | null }) {
  const matchId = normalizeMatchId(input.matchId)
  if (!input.userId || !matchId) return null
  const user = await User.findById(input.userId).select("followedMatchRooms recentMatchRooms communityStats")
  if (!user) return null
  const now = new Date()
  const latestActivityAt = normalizeDate(input.latestActivityAt) || now
  const followed = normalizeFollowedMatchRooms((user as any).followedMatchRooms).map((item) =>
    item.matchId === matchId ? { ...item, lastVisitedAt: now, lastSeenActivityAt: latestActivityAt } : item,
  )
  ;(user as any).followedMatchRooms = followed
  ;(user as any).recentMatchRooms = normalizeRecentMatchRooms([{ matchId, lastVisitedAt: now }, ...normalizeRecentMatchRooms((user as any).recentMatchRooms)])
  ;(user as any).communityStats = { ...((user as any).communityStats || {}), lastMatchRoomAt: now }
  await user.save()
  return user
}
