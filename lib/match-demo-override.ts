import { type MatchTimelinePhase } from "./match-timeline-ui"

export const MATCH_DEMO_OVERRIDE_PHASES = ["auto", "pre_match", "live", "full_time"] as const
export const MATCH_DEMO_OVERRIDE_DURATION_PRESETS = [5, 10, 30] as const
export const MATCH_DEMO_OVERRIDE_DEFAULT_DURATION_MINUTES = 5
export const MATCH_DEMO_OVERRIDE_MAX_DURATION_MINUTES = 120

export type MatchDemoOverridePhase = (typeof MATCH_DEMO_OVERRIDE_PHASES)[number]

export type MatchDemoOverrideState = {
  providerPhase: MatchTimelinePhase
  effectivePhase: MatchTimelinePhase
  overridePhase: MatchDemoOverridePhase
  enabled: boolean
  isExpired?: boolean
  remainingSeconds?: number | null
  reason?: string
  updatedBy?: string
  updatedAt?: string | Date | null
  expiresAt?: string | Date | null
  durationMinutes?: number | null
}

export function normalizeMatchDemoOverridePhase(value: unknown): MatchDemoOverridePhase | null {
  const normalized = String(value || "").trim().toLowerCase()
  return MATCH_DEMO_OVERRIDE_PHASES.includes(normalized as MatchDemoOverridePhase) ? (normalized as MatchDemoOverridePhase) : null
}

export function isMatchDemoOverrideEnabled(phase: unknown): phase is Exclude<MatchDemoOverridePhase, "auto"> {
  return phase === "pre_match" || phase === "live" || phase === "full_time"
}

export function normalizeMatchDemoOverrideDurationMinutes(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  const minutes = Math.floor(numeric)
  if (minutes < 1 || minutes > MATCH_DEMO_OVERRIDE_MAX_DURATION_MINUTES) return null
  return minutes
}

export function getEffectiveMatchTimelinePhase(providerPhase: MatchTimelinePhase, overridePhase: MatchDemoOverridePhase = "auto"): MatchTimelinePhase {
  return isMatchDemoOverrideEnabled(overridePhase) ? overridePhase : providerPhase
}

export function getActiveMatchDemoOverridePhase(
  overridePhase: MatchDemoOverridePhase = "auto",
  expiresAt?: Date | string | null,
  nowInput: Date = new Date(),
): MatchDemoOverridePhase {
  if (!isMatchDemoOverrideEnabled(overridePhase)) return "auto"
  if (!expiresAt) return overridePhase
  const expiresTime = new Date(expiresAt).getTime()
  if (!Number.isFinite(expiresTime)) return "auto"
  return expiresTime > nowInput.getTime() ? overridePhase : "auto"
}

export function getTimedEffectiveMatchTimelinePhase(
  providerPhase: MatchTimelinePhase,
  overridePhase: MatchDemoOverridePhase = "auto",
  expiresAt?: Date | string | null,
  nowInput: Date = new Date(),
): MatchTimelinePhase {
  return getEffectiveMatchTimelinePhase(providerPhase, getActiveMatchDemoOverridePhase(overridePhase, expiresAt, nowInput))
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
