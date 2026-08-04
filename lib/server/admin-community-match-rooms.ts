import { type AdminRole } from "@/lib/admin-access"

import { MATCH_ROOM_TYPES, normalizeMatchRoomType, type MatchRoomType } from "./community-room-conversation"

export const COMMUNITY_MATCH_ROOM_ADMIN_ROLES: AdminRole[] = ["superadmin", "admincommunity"]

export const ADMIN_MATCH_ROOM_LIST_FILTERS = ["all", "active", "archived", "reports", "preview_open", "post_match_open"] as const
export const ADMIN_MATCH_ROOM_CONTENT_TABS = ["overview", "main", "tactics", "preview", "post_match", "threads", "polls", "reports", "moderation", "audit"] as const
export const ADMIN_MATCH_ROOM_ACTIONS = [
  "message_hide",
  "message_unhide",
  "message_soft_delete",
  "thread_pin",
  "thread_unpin",
  "thread_official",
  "thread_unofficial",
  "thread_hide",
  "thread_unhide",
  "poll_hide",
  "poll_unhide",
  "room_manual_close",
  "room_manual_archive",
] as const

export type AdminMatchRoomListFilter = (typeof ADMIN_MATCH_ROOM_LIST_FILTERS)[number]
export type AdminMatchRoomContentTab = (typeof ADMIN_MATCH_ROOM_CONTENT_TABS)[number]
export type AdminMatchRoomAction = (typeof ADMIN_MATCH_ROOM_ACTIONS)[number]

export function canAccessCommunityMatchRoomAdmin(role?: string | null) {
  return role === "superadmin" || role === "admincommunity"
}

export function normalizeAdminMatchRoomListFilter(value: unknown): AdminMatchRoomListFilter {
  const normalized = String(value || "all").trim().toLowerCase()
  return ADMIN_MATCH_ROOM_LIST_FILTERS.includes(normalized as AdminMatchRoomListFilter) ? (normalized as AdminMatchRoomListFilter) : "all"
}

export function normalizeAdminMatchRoomContentTab(value: unknown): AdminMatchRoomContentTab {
  const normalized = String(value || "overview").trim().toLowerCase()
  return ADMIN_MATCH_ROOM_CONTENT_TABS.includes(normalized as AdminMatchRoomContentTab) ? (normalized as AdminMatchRoomContentTab) : "overview"
}

export function normalizeAdminMatchRoomAction(value: unknown): AdminMatchRoomAction | null {
  const normalized = String(value || "").trim().toLowerCase()
  return ADMIN_MATCH_ROOM_ACTIONS.includes(normalized as AdminMatchRoomAction) ? (normalized as AdminMatchRoomAction) : null
}

export function requiresAdminActionReason(action: AdminMatchRoomAction) {
  return action === "room_manual_close" || action === "room_manual_archive"
}

export function validateAdminActionReason(action: AdminMatchRoomAction, value: unknown) {
  const reason = String(value || "").trim().slice(0, 500)
  if (requiresAdminActionReason(action) && reason.length < 6) {
    return { ok: false as const, reason, error: "Reason is required" }
  }
  return { ok: true as const, reason }
}

export function isTemporaryMatchRoomType(roomType: unknown): roomType is Extract<MatchRoomType, "preview" | "post_match"> {
  return roomType === "preview" || roomType === "post_match"
}

export function buildAdminRoomMessageFilter(matchId: string, roomType: unknown) {
  const normalizedRoomType = normalizeMatchRoomType(roomType)
  if (!normalizedRoomType) return null
  return {
    matchId,
    roomType: normalizedRoomType,
    isRoomMessage: true,
    contentType: "room_message",
  }
}

export function buildAdminThreadFilter(matchId: string) {
  return {
    matchId,
    isThreadRoot: true,
    contentType: "thread_root",
  }
}

export function buildAdminPollFilter(matchId: string) {
  return {
    matchId,
    contentType: "match_poll",
    "poll.question": { $ne: "" },
  }
}

export function isValidAdminRoomType(value: unknown) {
  const roomType = normalizeMatchRoomType(value)
  return Boolean(roomType && MATCH_ROOM_TYPES.includes(roomType))
}
