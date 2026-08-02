import { canManageCommunityAdmin } from "../admin-access"
import { isClosedMatchStatus, isFinishedMatchStatus, isLiveMatchStatus, type MatchRoomFixture } from "./community-match-room"

export const MATCH_ROOM_TYPES = ["main", "tactics", "preview", "post_match"] as const
export const MATCH_ROOM_CONTENT_TYPES = [
  "community_post",
  "room_message",
  "thread_root",
  "match_poll",
  "official_match_update",
  "match_summary_preview",
] as const

export type MatchRoomType = (typeof MATCH_ROOM_TYPES)[number]
export type MatchRoomContentType = (typeof MATCH_ROOM_CONTENT_TYPES)[number]
export type MatchRoomStateName = "unavailable" | "upcoming" | "open" | "closing" | "closed" | "archived"
export type TemporaryRoomActivityState = "none" | "preview_open" | "preview_closing" | "post_match_open" | "post_match_closing"

export const DEFAULT_PREVIEW_ROOM_MINUTES = 60
export const DEFAULT_POST_ROOM_MINUTES = 60
export const DEFAULT_TEMP_ROOM_RETENTION_DAYS = 14

export function normalizeMatchRoomType(value: unknown): MatchRoomType | null {
  const normalized = String(value || "").trim().toLowerCase()
  return MATCH_ROOM_TYPES.includes(normalized as MatchRoomType) ? (normalized as MatchRoomType) : null
}

export function normalizeMatchRoomContentType(value: unknown): MatchRoomContentType {
  const normalized = String(value || "").trim().toLowerCase()
  return MATCH_ROOM_CONTENT_TYPES.includes(normalized as MatchRoomContentType) ? (normalized as MatchRoomContentType) : "community_post"
}

export function getMatchRoomTimingConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    previewRoomMinutes: parsePositiveInteger(env.MATCH_PREVIEW_ROOM_MINUTES, DEFAULT_PREVIEW_ROOM_MINUTES),
    postRoomMinutes: parsePositiveInteger(env.MATCH_POST_ROOM_MINUTES, DEFAULT_POST_ROOM_MINUTES),
    retentionDays: parsePositiveInteger(env.MATCH_TEMP_ROOM_RETENTION_DAYS, DEFAULT_TEMP_ROOM_RETENTION_DAYS),
  }
}

function parsePositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

function normalizeDate(value: unknown) {
  const date = value ? new Date(value as any) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}

function addMinutes(date: Date | null, minutes: number) {
  return date ? new Date(date.getTime() + minutes * 60 * 1000) : null
}

function subtractMinutes(date: Date | null, minutes: number) {
  return date ? new Date(date.getTime() - minutes * 60 * 1000) : null
}

function addDays(date: Date | null, days: number) {
  return date ? new Date(date.getTime() + days * 24 * 60 * 60 * 1000) : null
}

function secondsUntil(target: Date | null, now: Date) {
  if (!target) return null
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 1000))
}

function getClosingState(closesAt: Date | null, now: Date): MatchRoomStateName {
  if (!closesAt) return "closed"
  const remainingMs = closesAt.getTime() - now.getTime()
  if (remainingMs <= 0) return "closed"
  return remainingMs <= 10 * 60 * 1000 ? "closing" : "open"
}

function resolveFinishedAt(match: MatchRoomFixture | null, now: Date) {
  const explicitFinishedAt = normalizeDate((match as any)?.finishedAt || (match as any)?.endedAt || (match as any)?.fullTimeAt)
  if (explicitFinishedAt) return explicitFinishedAt

  const kickoff = normalizeDate(match?.kickoff)
  if (!kickoff) return null

  // The current football fixture contract does not expose a trusted finishedAt.
  // Use provider kickoff plus regulation time as the server-side fallback, never client input.
  const fallbackFinishedAt = addMinutes(kickoff, 105)
  return fallbackFinishedAt && fallbackFinishedAt <= now ? fallbackFinishedAt : null
}

export function getRoomState(match: MatchRoomFixture | null, roomTypeInput: unknown, nowInput: Date = new Date()) {
  const roomType = normalizeMatchRoomType(roomTypeInput)
  const now = normalizeDate(nowInput) || new Date()
  const config = getMatchRoomTimingConfig()
  const kickoff = normalizeDate(match?.kickoff)
  const isCancelledOrPostponed = Boolean(match?.status && isClosedMatchStatus(match.status))
  const isLive = Boolean(match?.status && isLiveMatchStatus(match.status))
  const isFinished = Boolean(match?.isFinished || (match?.status && isFinishedMatchStatus(match.status)))
  const isTemporary = roomType === "preview" || roomType === "post_match"

  if (!match || !roomType) {
    return buildState(roomType || "main", "unavailable", now, null, null, isTemporary)
  }

  if (roomType === "main" || roomType === "tactics") {
    return buildState(roomType, isCancelledOrPostponed ? "closed" : "open", now, null, null, false)
  }

  if (isCancelledOrPostponed) {
    return buildState(roomType, "closed", now, null, null, true)
  }

  if (roomType === "preview") {
    const opensAt = subtractMinutes(kickoff, config.previewRoomMinutes)
    const closesAt = kickoff
    const archiveAt = closesAt
    const expiresAt = addDays(closesAt, config.retentionDays)
    if (!opensAt || !closesAt) return buildState(roomType, "unavailable", now, opensAt, closesAt, true, archiveAt, expiresAt)
    if (now >= archiveAt || isLive || isFinished) return buildState(roomType, "archived", now, opensAt, closesAt, true, archiveAt, expiresAt)
    if (now < opensAt) return buildState(roomType, "upcoming", now, opensAt, closesAt, true, archiveAt)
    return buildState(roomType, getClosingState(closesAt, now), now, opensAt, closesAt, true, archiveAt, expiresAt)
  }

  const finishedAt = isFinished ? resolveFinishedAt(match, now) : null
  const closesAt = addMinutes(finishedAt, config.postRoomMinutes)
  const archiveAt = closesAt
  const expiresAt = addDays(closesAt, config.retentionDays)
  if (!isFinished || !finishedAt || !closesAt) return buildState(roomType, "unavailable", now, finishedAt, closesAt, true, archiveAt, expiresAt)
  if (now < finishedAt) return buildState(roomType, "unavailable", now, finishedAt, closesAt, true, archiveAt, expiresAt)
  if (now >= archiveAt) return buildState(roomType, "archived", now, finishedAt, closesAt, true, archiveAt, expiresAt)
  return buildState(roomType, getClosingState(closesAt, now), now, finishedAt, closesAt, true, archiveAt, expiresAt)
}

function buildState(
  roomType: MatchRoomType,
  state: MatchRoomStateName,
  now: Date,
  opensAt: Date | null,
  closesAt: Date | null,
  isTemporary: boolean,
  archiveAt: Date | null = null,
  expiresAt: Date | null = null,
) {
  const canRead = state === "open" || state === "closing" || state === "closed"
  const canPost = state === "open" || state === "closing"
  return {
    roomType,
    state,
    opensAt,
    closesAt,
    archiveAt,
    expiresAt,
    remainingSeconds: secondsUntil(state === "upcoming" ? opensAt : closesAt, now),
    canRead,
    canPost,
    isTemporary,
    isArchived: state === "archived",
  }
}

export function getMatchRoomChannels(match: MatchRoomFixture | null, now: Date = new Date()) {
  return MATCH_ROOM_TYPES.map((roomType) => getRoomState(match, roomType, now))
}

export function getVisibleMatchRoomChannels(match: MatchRoomFixture | null, now: Date = new Date(), viewerRole?: string | null) {
  const canViewArchive = canManageCommunityAdmin(viewerRole)
  return getMatchRoomChannels(match, now).filter((channel) => canViewArchive || !channel.isArchived)
}

export function canReadRoom(match: MatchRoomFixture | null, roomType: unknown, now: Date = new Date(), viewerRole?: string | null) {
  const state = getRoomState(match, roomType, now)
  return state.canRead || canManageCommunityAdmin(viewerRole)
}

export function canPostToRoom(match: MatchRoomFixture | null, roomType: unknown, now: Date = new Date()) {
  return getRoomState(match, roomType, now).canPost
}

export function shouldArchiveRoom(match: MatchRoomFixture | null, roomType: unknown, now: Date = new Date()) {
  return getRoomState(match, roomType, now).isArchived
}

export function getTemporaryRoomActivityState(match: MatchRoomFixture | null, roomTypeInput: unknown, now: Date = new Date()): TemporaryRoomActivityState {
  const room = getRoomState(match, roomTypeInput, now)
  if (!room.isTemporary || (room.state !== "open" && room.state !== "closing")) return "none"
  if (room.roomType === "preview") return room.state === "closing" ? "preview_closing" : "preview_open"
  if (room.roomType === "post_match") return room.state === "closing" ? "post_match_closing" : "post_match_open"
  return "none"
}

export function buildRoomMessageMetadata(input: {
  matchId: string
  roomType: MatchRoomType
  replyToId?: string | null
  archivedAt?: Date | null
  roomClosedAt?: Date | null
  roomExpiresAt?: Date | null
}) {
  return {
    matchId: input.matchId,
    roomType: input.roomType,
    contentType: "room_message" as const,
    isRoomMessage: true,
    replyToId: input.replyToId || "",
    archivedAt: input.archivedAt || null,
    roomClosedAt: input.roomClosedAt || null,
    roomExpiresAt: input.roomExpiresAt || null,
    latestActivityAt: new Date(),
  }
}

export function buildCommunityFeedIsolationFilter() {
  return {
    isThreadRoot: { $ne: true },
    isRoomMessage: { $ne: true },
    contentType: { $nin: ["room_message", "thread_root", "match_poll"] },
  }
}

function buildPublicRoomMessageFilter() {
  return {
    status: "published",
    $or: [{ "moderation.status": { $exists: false } }, { "moderation.status": null }, { "moderation.status": "approved" }],
  }
}

function buildViewerVisibleRoomMessageFilter(viewerId?: string | null) {
  const publicFilter = buildPublicRoomMessageFilter()
  if (!viewerId) return publicFilter

  return {
    $or: [publicFilter, { author: viewerId, "moderation.status": "pending_review" }],
  }
}

export function buildRoomMessageVisibilityFilter(viewerId?: string | null, canModerate = false) {
  if (canModerate) {
    return {
      status: { $ne: "hidden" },
    }
  }
  return {
    ...buildViewerVisibleRoomMessageFilter(viewerId),
    archivedAt: null,
  }
}

export function buildApprovedRoomActivityFilter() {
  return {
    isRoomMessage: true,
    contentType: "room_message",
    archivedAt: null,
    ...buildPublicRoomMessageFilter(),
  }
}
