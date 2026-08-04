export type MatchTimelinePhase = "pre_match" | "live" | "full_time"
export type MatchTimelineRoomId = "main" | "tactics" | "preview" | "post_match"

export const MATCH_TIMELINE_COPY = {
  preMatch: "Preview lounges are heating up before kickoff.",
  live: "Main Room and Tactical Room are the center of the live discussion.",
  fullTime: "Reaction lounges, poll results and AI Summary move to the front after full time.",
  eventsTitle: "Match Events",
  noEvents: "No verified match events available yet.",
} as const

const LIVE_STATUSES = new Set(["1H", "2H", "HT", "ET", "BT", "P", "SUSP", "INT", "LIVE", "LIVE", "IN PROGRESS"])
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN", "FINISHED", "MATCH FINISHED"])

export function getMatchTimelinePhase(input: { status?: string | null; isFinished?: boolean | null }): MatchTimelinePhase {
  const status = String(input.status || "").trim()
  const upper = status.toUpperCase()
  if (input.isFinished || FINISHED_STATUSES.has(upper)) return "full_time"
  if (LIVE_STATUSES.has(status) || LIVE_STATUSES.has(upper)) return "live"
  return "pre_match"
}

export function getTimelineNavigationPriority(phase: MatchTimelinePhase): MatchTimelineRoomId[] {
  if (phase === "live") return ["main", "tactics", "preview", "post_match"]
  if (phase === "full_time") return ["main", "post_match", "tactics", "preview"]
  return ["main", "preview", "tactics", "post_match"]
}

export function getTimelineRecommendedRoom(phase: MatchTimelinePhase): MatchTimelineRoomId {
  if (phase === "live") return "main"
  if (phase === "full_time") return "post_match"
  return "preview"
}

export function getTimelineHighlightRooms(phase: MatchTimelinePhase): MatchTimelineRoomId[] {
  if (phase === "live") return ["main", "tactics"]
  if (phase === "full_time") return ["post_match"]
  return ["preview"]
}

export function getTimelineActivityLabels(input: {
  phase: MatchTimelinePhase
  previewActive?: boolean | null
  reactionOpen?: boolean | null
  summaryReady?: boolean | null
  hasLiveStatus?: boolean | null
}) {
  const labels: string[] = []
  if (input.phase === "live" && input.hasLiveStatus) labels.push("Live Match")
  if (input.previewActive) labels.push("Preview Active")
  if (input.reactionOpen) labels.push("Reaction Open")
  if (input.summaryReady) labels.push("Summary Ready")
  return labels
}

export type TimelineMatchEvent = {
  id: string
  type: "goal" | "yellow_card" | "red_card" | "substitution"
  minute?: number | string | null
  team?: string | null
  player?: string | null
  assist?: string | null
  detail?: string | null
}

export function normalizeTimelineMatchEvents(events: unknown): TimelineMatchEvent[] {
  if (!Array.isArray(events)) return []
  const normalized: Array<TimelineMatchEvent | null> = events
    .map((event: any) => {
      const rawType = String(event?.type || event?.detail || "").toLowerCase()
      const type =
        rawType.includes("goal") || rawType === "g"
          ? "goal"
          : rawType.includes("yellow")
            ? "yellow_card"
            : rawType.includes("red")
              ? "red_card"
              : rawType.includes("subst") || rawType.includes("substitution")
                ? "substitution"
                : null
      if (!type) return null
      const minute = event?.time?.elapsed ?? event?.minute ?? event?.elapsed ?? null
      const team = event?.team?.name || event?.team || null
      const player = event?.player?.name || event?.player || null
      const assist = event?.assist?.name || event?.assist || null
      const detail = event?.comments || event?.detail || event?.type || null
      const sourceId = event?.id || event?._id || event?.eventId || event?.fixtureEventId || ""
      const id = String(
        sourceId ||
          [
            type,
            minute ?? "",
            team || "",
            player || "",
            assist || "",
            detail || "",
          ].join(":"),
      )
      return {
        id,
        type,
        minute,
        team,
        player,
        assist,
        detail,
      } satisfies TimelineMatchEvent
    })
  const seen = new Set<string>()
  return normalized
    .filter((event): event is TimelineMatchEvent => event !== null)
    .sort((a, b) => Number(a.minute ?? Number.MAX_SAFE_INTEGER) - Number(b.minute ?? Number.MAX_SAFE_INTEGER) || a.type.localeCompare(b.type) || String(a.player || "").localeCompare(String(b.player || "")))
    .filter((event) => {
      if (seen.has(event.id)) return false
      seen.add(event.id)
      return true
    })
}
