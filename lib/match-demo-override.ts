import { type MatchTimelinePhase } from "./match-timeline-ui"

export const MATCH_DEMO_OVERRIDE_PHASES = ["auto", "pre_match", "live", "full_time"] as const

export type MatchDemoOverridePhase = (typeof MATCH_DEMO_OVERRIDE_PHASES)[number]

export type MatchDemoOverrideState = {
  providerPhase: MatchTimelinePhase
  effectivePhase: MatchTimelinePhase
  overridePhase: MatchDemoOverridePhase
  enabled: boolean
  reason?: string
  updatedBy?: string
  updatedAt?: string | Date | null
  expiresAt?: string | Date | null
}

export function normalizeMatchDemoOverridePhase(value: unknown): MatchDemoOverridePhase | null {
  const normalized = String(value || "").trim().toLowerCase()
  return MATCH_DEMO_OVERRIDE_PHASES.includes(normalized as MatchDemoOverridePhase) ? (normalized as MatchDemoOverridePhase) : null
}

export function isMatchDemoOverrideEnabled(phase: unknown): phase is Exclude<MatchDemoOverridePhase, "auto"> {
  return phase === "pre_match" || phase === "live" || phase === "full_time"
}

export function getEffectiveMatchTimelinePhase(providerPhase: MatchTimelinePhase, overridePhase: MatchDemoOverridePhase = "auto"): MatchTimelinePhase {
  return isMatchDemoOverrideEnabled(overridePhase) ? overridePhase : providerPhase
}

export function getMatchDemoRoomAvailabilityPhase(input: { enabled?: boolean | null; effectivePhase?: MatchTimelinePhase | null }): MatchDemoOverridePhase {
  return input.enabled && input.effectivePhase ? input.effectivePhase : "auto"
}

export function getMatchDemoOverrideNotice(phase: MatchDemoOverridePhase) {
  if (phase === "pre_match") return "กำลังจำลองประสบการณ์ก่อนแข่ง"
  if (phase === "live") return "กำลังจำลองประสบการณ์ระหว่างแข่ง"
  if (phase === "full_time") return "กำลังจำลองประสบการณ์หลังจบเกม"
  return ""
}
