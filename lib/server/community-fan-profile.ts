import { CommunityFanEvent, User } from "./models"

export const COMMUNITY_FAN_BADGES = {
  firstPost: {
    id: "first-post",
    label: "เปิดสนาม",
    description: "สร้างโพสต์แรกในคอมมูนิตี้แล้ว",
  },
  matchRoomStarter: {
    id: "match-room-starter",
    label: "Match Room Voice",
    description: "ร่วมพูดคุยในห้องแมตช์",
  },
  pollVoter: {
    id: "poll-voter",
    label: "Poll Tactician",
    description: "ร่วมโหวตโพลในคอมมูนิตี้",
  },
  matchRoomFollower: {
    id: "match-room-follower",
    label: "Room Scout",
    description: "ติดตาม Match Room เพื่อไม่พลาดความเคลื่อนไหว",
  },
} as const

type BadgeId = (typeof COMMUNITY_FAN_BADGES)[keyof typeof COMMUNITY_FAN_BADGES]["id"]

function toBadgeDetails(ids: unknown[]) {
  const badges = Object.values(COMMUNITY_FAN_BADGES)
  const badgeIds = new Set<BadgeId>(badges.map((badge) => badge.id))
  const allowed = new Map(badges.map((badge) => [badge.id, badge]))
  return Array.from(new Set(ids.map((id) => String(id)).filter((id): id is BadgeId => badgeIds.has(id as BadgeId)))).map((id) => allowed.get(id))
}

export function mapFanProfile(user: any) {
  const stats = user?.communityStats && typeof user.communityStats === "object" ? user.communityStats : {}
  return {
    stats: {
      postsCount: Number(stats.postsCount || 0),
      matchRoomPostsCount: Number(stats.matchRoomPostsCount || 0),
      pollVotesCount: Number(stats.pollVotesCount || 0),
      lastMatchRoomAt: stats.lastMatchRoomAt || null,
      followedMatchRoomsCount: Array.isArray(user?.followedMatchRooms) ? user.followedMatchRooms.length : 0,
      recentMatchRoomsCount: Array.isArray(user?.recentMatchRooms) ? user.recentMatchRooms.length : 0,
    },
    badges: toBadgeDetails(Array.isArray(user?.fanBadges) ? user.fanBadges : []),
  }
}

export async function awardCommunityFanBadges(input: {
  userId: string
  action: "post_created" | "match_room_post_created" | "poll_voted" | "thread_comment_created" | "thread_reply_created"
  eventKey: string
  postId?: string | null
  matchId?: string | null
}) {
  const eventKey = input.eventKey.trim()
  if (!eventKey) return null

  try {
    await CommunityFanEvent.create({
      user: input.userId,
      eventKey,
      eventType: input.action,
      post: input.postId || null,
      matchId: input.matchId || "",
    })
  } catch (error: any) {
    if (error?.code === 11000) return null
    throw error
  }

  const inc: Record<string, number> = {}
  const badges = new Set<string>()
  const set: Record<string, Date> = {}

  if (input.action === "post_created") {
    inc["communityStats.postsCount"] = 1
    badges.add(COMMUNITY_FAN_BADGES.firstPost.id)
  }

  if (input.action === "match_room_post_created") {
    inc["communityStats.postsCount"] = 1
    inc["communityStats.matchRoomPostsCount"] = 1
    set["communityStats.lastMatchRoomAt"] = new Date()
    badges.add(COMMUNITY_FAN_BADGES.firstPost.id)
    badges.add(COMMUNITY_FAN_BADGES.matchRoomStarter.id)
  }

  if (input.action === "poll_voted") {
    inc["communityStats.pollVotesCount"] = 1
    badges.add(COMMUNITY_FAN_BADGES.pollVoter.id)
  }

  if (input.action === "thread_comment_created" || input.action === "thread_reply_created") {
    inc["communityStats.matchRoomPostsCount"] = 1
    set["communityStats.lastMatchRoomAt"] = new Date()
    badges.add(COMMUNITY_FAN_BADGES.matchRoomStarter.id)
  }

  const update: Record<string, unknown> = {}
  if (Object.keys(inc).length) update.$inc = inc
  if (Object.keys(set).length) update.$set = set
  if (badges.size) update.$addToSet = { fanBadges: { $each: Array.from(badges) } }
  if (!Object.keys(update).length) return null

  return User.findByIdAndUpdate(input.userId, update, { new: true })
}
