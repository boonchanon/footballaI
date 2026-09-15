export const MATCH_HUB_EMPTY_STATES = {
  room: "Be the first fan to start this discussion.",
  polls: "No community polls yet.",
  summary: "Match summary will be available after the match.",
} as const

export type MatchHubRoomType = "main" | "tactics" | "preview" | "post_match"
export type MatchHubRoomState = "unavailable" | "upcoming" | "open" | "closing" | "closed" | "archived"
export type MatchHubDisplayState = "upcoming" | "live" | "finished" | "postponed" | "cancelled" | "closed"
export type MatchHubConversationRoomId = MatchHubRoomType | "preview_home" | "preview_away" | "post_match_home" | "post_match_away"
export type MatchHubErrorView = "loading" | "ready" | "not_found" | "transient_error"
export type MatchHubCommunityPulse = {
  messages: number
  threads: number
  polls: number
  fans: number
  highlights: number
  hasSummary: boolean
}

const FINISHED_STATUSES = new Set(["FT", "AET", "PEN", "FINISHED", "MATCH FINISHED"])
const LIVE_STATUSES = new Set(["1H", "2H", "HT", "HALF TIME", "ET", "BT", "P", "SUSP", "INT", "LIVE", "IN PROGRESS"])
const UPCOMING_STATUSES = new Set(["NS", "TBD", "UPCOMING", "NOT STARTED"])
const POSTPONED_STATUSES = new Set(["PST", "POSTPONED"])
const CANCELLED_STATUSES = new Set(["CANC", "CANCELLED"])
const CLOSED_STATUSES = new Set(["ABD", "AWD", "WO"])

function normalizeStatus(value?: string | null) {
  return String(value || "").trim().toUpperCase()
}

function isMinuteLiveStatus(value?: string | null) {
  return /^\d{1,3}(?:\+\d{1,2})?$/.test(String(value || "").trim())
}

export function getMatchHubDisplayState(input: { status?: string | null; isFinished?: boolean | null }): MatchHubDisplayState {
  const status = normalizeStatus(input.status)
  if (POSTPONED_STATUSES.has(status)) return "postponed"
  if (CANCELLED_STATUSES.has(status)) return "cancelled"
  if (CLOSED_STATUSES.has(status)) return "closed"
  if (input.isFinished || FINISHED_STATUSES.has(status)) return "finished"
  if (LIVE_STATUSES.has(status) || isMinuteLiveStatus(status)) return "live"
  return UPCOMING_STATUSES.has(status) || !status ? "upcoming" : "upcoming"
}

export function getMatchHubStatusLabel(input: { status?: string | null; isFinished?: boolean | null }) {
  const status = normalizeStatus(input.status)
  const state = getMatchHubDisplayState(input)
  if (state === "finished") return "จบ"
  if (state === "live") {
    if (status === "1H" || status === "1") return "ครึ่งแรก"
    if (status === "HT" || status === "HALF TIME") return "พักครึ่ง"
    if (status === "2H" || status === "2") return "ครึ่งหลัง"
    if (status === "ET") return "ต่อเวลา"
    if (status === "PEN" || status === "P") return "ดวลจุดโทษ"
    if (isMinuteLiveStatus(status)) return `${status}'`
    return "สด"
  }
  if (state === "postponed") return "เลื่อน"
  if (state === "cancelled") return "ยกเลิก"
  if (state === "closed") return "ปิด"
  return "ยังไม่แข่ง"
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

export function getMatchHubErrorView(input: { isLoading?: boolean | null; hasFixture?: boolean | null; errorCode?: string | null; hasError?: boolean | null }): MatchHubErrorView {
  if (input.hasFixture) return input.hasError ? "transient_error" : "ready"
  if (input.hasError && input.errorCode === "MATCH_NOT_FOUND") return "not_found"
  if (input.hasError) return "transient_error"
  return input.isLoading ? "loading" : "not_found"
}

function positiveNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0
}

export function buildMatchHubCommunityPulse(input: {
  messages?: unknown
  threads?: unknown
  polls?: unknown
  fans?: unknown
  highlights?: unknown
  summaryStatus?: string | null
}): MatchHubCommunityPulse {
  const summaryStatus = String(input.summaryStatus || "").trim()
  return {
    messages: positiveNumber(input.messages),
    threads: positiveNumber(input.threads),
    polls: positiveNumber(input.polls),
    fans: positiveNumber(input.fans),
    highlights: positiveNumber(input.highlights),
    hasSummary: summaryStatus === "generated" || summaryStatus === "template",
  }
}

export function getMatchHubFanMomentumLabel(pulse: MatchHubCommunityPulse) {
  const score = pulse.messages + pulse.threads * 2 + pulse.polls * 2 + pulse.fans + pulse.highlights
  if (score >= 50) return "High community momentum"
  if (score >= 12) return "Community is warming up"
  if (score > 0) return "Early fan voices"
  return "Waiting for the first fan"
}

export function getMatchHubMilestones(pulse: MatchHubCommunityPulse) {
  const milestones: string[] = []
  if (pulse.messages > 0) milestones.push(`${pulse.messages} ${pulse.messages === 1 ? "message" : "messages"}`)
  if (pulse.threads > 0) milestones.push(`${pulse.threads} ${pulse.threads === 1 ? "thread" : "threads"}`)
  if (pulse.polls > 0) milestones.push(`${pulse.polls} ${pulse.polls === 1 ? "poll" : "polls"}`)
  if (pulse.highlights > 0) milestones.push(`${pulse.highlights} match ${pulse.highlights === 1 ? "highlight" : "highlights"}`)
  if (pulse.hasSummary) milestones.push("AI summary ready")
  return milestones
}
