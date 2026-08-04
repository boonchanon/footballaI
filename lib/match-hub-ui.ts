export const MATCH_HUB_EMPTY_STATES = {
  room: "Be the first fan to start this discussion.",
  polls: "No community polls yet.",
  summary: "Match summary will be available after the match.",
} as const

export type MatchHubRoomType = "main" | "tactics" | "preview" | "post_match"
export type MatchHubRoomState = "unavailable" | "upcoming" | "open" | "closing" | "closed" | "archived"
export type MatchHubDisplayState = "upcoming" | "live" | "finished" | "postponed" | "cancelled" | "closed"
export type MatchHubConversationRoomId = MatchHubRoomType | "preview_home" | "preview_away" | "post_match_home" | "post_match_away"

const FINISHED_STATUSES = new Set(["FT", "AET", "PEN", "FINISHED", "MATCH FINISHED"])
const LIVE_STATUSES = new Set(["1H", "2H", "HT", "ET", "BT", "P", "SUSP", "INT", "LIVE", "IN PROGRESS"])
const UPCOMING_STATUSES = new Set(["NS", "TBD", "UPCOMING", "NOT STARTED"])
const POSTPONED_STATUSES = new Set(["PST", "POSTPONED"])
const CANCELLED_STATUSES = new Set(["CANC", "CANCELLED"])
const CLOSED_STATUSES = new Set(["ABD", "AWD", "WO"])

function normalizeStatus(value?: string | null) {
  return String(value || "").trim().toUpperCase()
}

export function getMatchHubDisplayState(input: { status?: string | null; isFinished?: boolean | null }): MatchHubDisplayState {
  const status = normalizeStatus(input.status)
  if (POSTPONED_STATUSES.has(status)) return "postponed"
  if (CANCELLED_STATUSES.has(status)) return "cancelled"
  if (CLOSED_STATUSES.has(status)) return "closed"
  if (input.isFinished || FINISHED_STATUSES.has(status)) return "finished"
  if (LIVE_STATUSES.has(status)) return "live"
  return UPCOMING_STATUSES.has(status) || !status ? "upcoming" : "upcoming"
}

export function getMatchHubStatusLabel(input: { status?: string | null; isFinished?: boolean | null }) {
  const state = getMatchHubDisplayState(input)
  if (state === "finished") return "Finished"
  if (state === "live") return "Live"
  if (state === "postponed") return "Postponed"
  if (state === "cancelled") return "Cancelled"
  if (state === "closed") return "Closed"
  return "Upcoming"
}

export function getMatchHubScoreLabel(input: { status?: string | null; isFinished?: boolean | null; homeScore?: number | null; awayScore?: number | null }) {
  const state = getMatchHubDisplayState(input)
  const hasScore = typeof input.homeScore === "number" && Number.isFinite(input.homeScore) && typeof input.awayScore === "number" && Number.isFinite(input.awayScore)
  if (!hasScore) return "VS"
  if (state === "finished" || state === "live") return `${input.homeScore} - ${input.awayScore}`
  return "VS"
}

export function normalizeMatchHubRoomQuery(value: string | null | undefined): {
  roomId: MatchHubConversationRoomId
  legacyRoomType: "preview" | "post_match" | null
  notice: string
} {
  const normalized = String(value || "").trim().toLowerCase()
  if (normalized === "tactics") return { roomId: "tactics", legacyRoomType: null, notice: "" }
  if (normalized === "preview-home") return { roomId: "preview_home", legacyRoomType: null, notice: "" }
  if (normalized === "preview-away") return { roomId: "preview_away", legacyRoomType: null, notice: "" }
  if (normalized === "post-match-home") return { roomId: "post_match_home", legacyRoomType: null, notice: "" }
  if (normalized === "post-match-away") return { roomId: "post_match_away", legacyRoomType: null, notice: "" }
  if (normalized === "preview") {
    return {
      roomId: "main",
      legacyRoomType: "preview",
      notice: "This Preview link is from an older format. Choose Home or Away Preview from the room navigation.",
    }
  }
  if (normalized === "post-match" || normalized === "post_match") {
    return {
      roomId: "main",
      legacyRoomType: "post_match",
      notice: "This Reaction link is from an older format. Choose Home or Away Reactions from the room navigation.",
    }
  }
  return { roomId: "main", legacyRoomType: null, notice: "" }
}

export function getMatchHubRoomBadge(input?: { roomType?: MatchHubRoomType | string; state?: MatchHubRoomState | string; isArchived?: boolean | null } | null) {
  if (!input) return "OPENS SOON"
  if (input.isArchived || input.state === "archived") return "ARCHIVED"
  if (input.state === "open" || input.state === "closing") return input.roomType === "main" || input.roomType === "tactics" ? "OPEN" : "LIVE"
  if (input.state === "upcoming") return "OPENS SOON"
  return "CLOSED"
}

export function getFavoriteTeamRecommendedRoom(input: {
  isFavoriteTeam?: boolean | null
  isFinished?: boolean | null
  previewCanRead?: boolean | null
  previewState?: string | null
  postMatchCanRead?: boolean | null
}): MatchHubRoomType | null {
  if (!input.isFavoriteTeam) return null
  if (input.isFinished && input.postMatchCanRead) return "post_match"
  if (input.previewCanRead || input.previewState === "upcoming") return "preview"
  return "main"
}
