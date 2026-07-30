import { CommunityNotification, Friendship, User } from "./models"

const MATCH_NOTIFICATION_TYPES = [
  "match_starting",
  "match_live",
  "match_finished",
  "official_poll_opened",
  "match_summary_ready",
] as const

export type NotificationType =
  | "post_like"
  | "post_comment"
  | "thread_reply"
  | "thread_pinned"
  | "post_repost"
  | "post_poll_vote"
  | "community_friend_posted"
  | "community_match_room_posted"
  | "community_fan_badge_unlocked"
  | "community_content_pending"
  | "community_content_approved"
  | "community_content_rejected"
  | "community_content_hidden"
  | "community_user_warned"
  | "community_user_restricted"
  | "community_user_suspended"
  | "community_user_banned"
  | "community_moderation_strike_alert"
  | (typeof MATCH_NOTIFICATION_TYPES)[number]

type NotificationPayload = {
  recipientId: string
  actorId?: string | null
  type: NotificationType
  postId?: string | null
  commentId?: string | null
  storyId?: string | null
  mediaId?: string | null
  referenceType?: string | null
  message?: string | null
  dedupeKey?: string | null
}

export const DEFAULT_MATCH_NOTIFICATION_PREFERENCES = {
  matchStarting: true,
  matchLive: true,
  matchFinished: true,
  officialPoll: true,
  aiSummary: true,
  threadActivity: true,
} as const

function getPreferenceBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback
}

export function getMatchNotificationPreferences(user: { notificationPreferences?: Record<string, unknown> } | null | undefined) {
  const preferences = user?.notificationPreferences && typeof user.notificationPreferences === "object" ? user.notificationPreferences : {}
  const matchRoom = preferences.matchRoom && typeof preferences.matchRoom === "object" && !Array.isArray(preferences.matchRoom)
    ? (preferences.matchRoom as Record<string, unknown>)
    : preferences

  return {
    matchStarting: getPreferenceBoolean(matchRoom.matchStarting, DEFAULT_MATCH_NOTIFICATION_PREFERENCES.matchStarting),
    matchLive: getPreferenceBoolean(matchRoom.matchLive, DEFAULT_MATCH_NOTIFICATION_PREFERENCES.matchLive),
    matchFinished: getPreferenceBoolean(matchRoom.matchFinished, DEFAULT_MATCH_NOTIFICATION_PREFERENCES.matchFinished),
    officialPoll: getPreferenceBoolean(matchRoom.officialPoll, DEFAULT_MATCH_NOTIFICATION_PREFERENCES.officialPoll),
    aiSummary: getPreferenceBoolean(matchRoom.aiSummary, DEFAULT_MATCH_NOTIFICATION_PREFERENCES.aiSummary),
    threadActivity: getPreferenceBoolean(matchRoom.threadActivity, DEFAULT_MATCH_NOTIFICATION_PREFERENCES.threadActivity),
  }
}

export function canReceiveMatchNotification(user: { notificationPreferences?: Record<string, unknown>; moderationState?: Record<string, unknown> } | null | undefined, type: NotificationType) {
  if (!user) return false
  if (user.moderationState?.bannedAt || user.moderationState?.suspendedAt) return false
  const preferences = getMatchNotificationPreferences(user)
  if (type === "match_starting") return preferences.matchStarting
  if (type === "match_live") return preferences.matchLive
  if (type === "match_finished") return preferences.matchFinished
  if (type === "official_poll_opened") return preferences.officialPoll
  if (type === "match_summary_ready") return preferences.aiSummary
  if (type === "community_match_room_posted" || type === "thread_reply") return preferences.threadActivity
  return true
}

export async function createCommunityNotification(input: NotificationPayload) {
  if (!input.recipientId) return null
  if (input.actorId && input.recipientId === input.actorId) return null

  const dedupeKey = input.dedupeKey?.trim() || buildNotificationDedupeKey(input)
  if (dedupeKey) {
    const existing = await CommunityNotification.findOne({ dedupeKey }).select("_id")
    if (existing) return existing
  }

  try {
    return await CommunityNotification.create({
      recipient: input.recipientId,
      actor: input.actorId || null,
      type: input.type,
      post: input.postId || null,
      comment: input.commentId || null,
      story: input.storyId || null,
      media: input.mediaId || null,
      referenceType: input.referenceType || "",
      message: input.message || "",
      dedupeKey,
    })
  } catch (error: any) {
    if (error?.code === 11000 && dedupeKey) {
      return CommunityNotification.findOne({ dedupeKey }).select("_id")
    }
    throw error
  }
}

function buildNotificationDedupeKey(input: NotificationPayload) {
  if (input.type === "post_like") return `like:${input.postId}:${input.actorId}:${input.recipientId}`
  if (input.type === "post_comment") return `comment:${input.commentId || input.postId}:${input.recipientId}`
  if (input.type === "thread_reply") return `thread-reply:${input.commentId || input.postId}:${input.recipientId}`
  if (input.type === "thread_pinned") return `thread-pinned:${input.postId}:${input.recipientId}`
  if (input.type === "post_repost") return `repost:${input.postId}:${input.actorId}:${input.recipientId}`
  if (input.type === "post_poll_vote") return `poll-vote:${input.postId}:${input.actorId}:${input.recipientId}`
  if (input.type === "community_friend_posted") return `friend-post:${input.postId}:${input.recipientId}`
  if (input.type === "community_match_room_posted") return `match-room-post:${input.postId}:${input.recipientId}`
  if (input.type === "community_fan_badge_unlocked") return `fan-badge:${input.recipientId}:${input.message || "badge"}`
  if (input.type === "community_content_pending") return `content-pending:${input.referenceType}:${input.postId || input.storyId || input.mediaId}:${input.recipientId}`
  if (input.type === "community_content_approved") return `content-approved:${input.referenceType}:${input.postId || input.storyId || input.mediaId}:${input.recipientId}`
  if (input.type === "community_content_rejected") return `content-rejected:${input.referenceType}:${input.postId || input.storyId || input.mediaId}:${input.recipientId}`
  if (input.type === "community_content_hidden") return `content-hidden:${input.referenceType}:${input.postId || input.storyId || input.mediaId}:${input.recipientId}`
  if (input.type === "community_user_warned") return `user-warned:${input.recipientId}:${input.postId || input.commentId || input.storyId || input.mediaId || "account"}`
  if (input.type === "community_user_restricted") return `user-restricted:${input.recipientId}:${input.postId || input.commentId || input.storyId || input.mediaId || "account"}`
  if (input.type === "community_user_suspended") return `user-suspended:${input.recipientId}:${input.postId || input.commentId || input.storyId || input.mediaId || "account"}`
  if (input.type === "community_user_banned") return `user-banned:${input.recipientId}:${input.postId || input.commentId || input.storyId || input.mediaId || "account"}`
  if (input.type === "community_moderation_strike_alert") return `moderation-strike:${input.recipientId}:${input.message || "threshold"}`
  if (input.type === "match_starting") return `match-starting:${input.referenceType}:${input.recipientId}`
  if (input.type === "match_live") return `match-live:${input.referenceType}:${input.recipientId}`
  if (input.type === "match_finished") return `match-finished:${input.referenceType}:${input.recipientId}`
  if (input.type === "official_poll_opened") return `official-poll:${input.postId || input.referenceType}:${input.recipientId}`
  if (input.type === "match_summary_ready") return `match-summary:${input.referenceType}:${input.recipientId}`
  return ""
}

export async function notifyFriendsAboutApprovedPost(input: {
  authorId: string
  postId: string
  actorId?: string | null
  message?: string
}) {
  if (String(process.env.COMMUNITY_NOTIFY_FRIEND_POSTS || "true").trim().toLowerCase() === "false") return 0

  const friendships = await Friendship.find({ users: input.authorId }).select("users")
  const recipientIds: string[] = Array.from(
    new Set(
      friendships
        .flatMap((friendship: any) => (Array.isArray(friendship.users) ? friendship.users : []))
        .map((userId: any) => userId?.toString?.() || String(userId))
        .filter((userId: string) => userId && userId !== input.authorId),
    ),
  )

  await Promise.all(
    recipientIds.map((recipientId) =>
      createCommunityNotification({
        recipientId,
        actorId: input.actorId || input.authorId,
        type: "community_friend_posted",
        postId: input.postId,
        referenceType: "post",
        message: input.message || "",
        dedupeKey: `friend-post:${input.postId}:${recipientId}`,
      }),
    ),
  )

  return recipientIds.length
}

export function getCommunityNotificationText(type: NotificationType) {
  if (type === "post_like") return "liked your post"
  if (type === "post_comment") return "commented on your post"
  if (type === "thread_reply") return "replied in your match-room thread"
  if (type === "thread_pinned") return "your thread was pinned in match room"
  if (type === "post_repost") return "reposted your post"
  if (type === "post_poll_vote") return "voted in your poll"
  if (type === "community_friend_posted") return "posted a new update in community"
  if (type === "community_match_room_posted") return "posted in a match room you follow"
  if (type === "community_fan_badge_unlocked") return "unlocked a new fan badge"
  if (type === "community_content_pending") return "your content is pending review"
  if (type === "community_content_approved") return "your content was approved"
  if (type === "community_content_rejected") return "your content did not pass moderation"
  if (type === "community_content_hidden") return "your content was hidden by admin"
  if (type === "community_user_warned") return "your community account received a warning"
  if (type === "community_user_restricted") return "your community posting access is restricted"
  if (type === "community_user_suspended") return "your community account was suspended"
  if (type === "community_user_banned") return "your community account was banned"
  if (type === "match_starting") return "match you follow is starting soon"
  if (type === "match_live") return "match you follow is live"
  if (type === "match_finished") return "match you follow has finished"
  if (type === "official_poll_opened") return "official poll is open in a match room"
  if (type === "match_summary_ready") return "AI summary is ready for a match room"
  return "your community account reached a moderation strike milestone"
}

export function buildMatchRoomNotificationDedupeKey(input: {
  type: Extract<NotificationType, "match_starting" | "match_live" | "match_finished" | "official_poll_opened" | "match_summary_ready">
  matchId: string
  recipientId: string
  pollId?: string | null
  summaryVersion?: string | number | null
}) {
  const matchId = String(input.matchId || "").trim()
  const recipientId = String(input.recipientId || "").trim()
  if (!matchId || !recipientId) return ""
  if (input.type === "match_starting") return `match-starting:${matchId}:${recipientId}`
  if (input.type === "match_live") return `match-live:${matchId}:${recipientId}`
  if (input.type === "match_finished") return `match-finished:${matchId}:${recipientId}`
  if (input.type === "official_poll_opened") return `official-poll:${matchId}:${String(input.pollId || "official")}:${recipientId}`
  return `match-summary:${matchId}:${String(input.summaryVersion || "0")}:${recipientId}`
}

export async function notifyMatchRoomFollowers(input: {
  matchId: string
  type: Extract<NotificationType, "match_starting" | "match_live" | "match_finished" | "official_poll_opened" | "match_summary_ready" | "community_match_room_posted">
  actorId?: string | null
  postId?: string | null
  pollId?: string | null
  summaryVersion?: string | number | null
  message?: string | null
}) {
  const matchId = String(input.matchId || "").trim()
  if (!matchId) return 0
  const followers = await User.find({
    "followedMatchRooms.matchId": matchId,
    "moderationState.bannedAt": null,
    "moderationState.suspendedAt": null,
  }).select("_id notificationPreferences moderationState")

  let sent = 0
  await Promise.all(
    followers.map(async (recipient: any) => {
      const recipientId = recipient._id.toString()
      if (input.actorId && input.actorId === recipientId) return
      if (!canReceiveMatchNotification(recipient, input.type)) return
      const dedupeKey =
        input.type === "community_match_room_posted"
          ? `match-room-post:${input.postId}:${recipientId}`
          : buildMatchRoomNotificationDedupeKey({
              type: input.type,
              matchId,
              recipientId,
              pollId: input.pollId,
              summaryVersion: input.summaryVersion,
            })
      const created = await createCommunityNotification({
        recipientId,
        actorId: input.actorId || null,
        type: input.type,
        postId: input.postId || null,
        referenceType: matchId,
        message: input.message || "",
        dedupeKey,
      })
      if (created) sent += 1
    }),
  )
  return sent
}
