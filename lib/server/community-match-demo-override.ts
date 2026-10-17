import { canManageCommunityAdmin } from "@/lib/admin-access"
import {
  getActiveMatchDemoOverridePhase,
  getEffectiveMatchTimelinePhase,
  isMatchDemoOverrideEnabled,
  MATCH_DEMO_OVERRIDE_DEFAULT_DURATION_MINUTES,
  MATCH_DEMO_OVERRIDE_DURATION_PRESETS,
  MATCH_DEMO_OVERRIDE_MAX_DURATION_MINUTES,
  normalizeMatchDemoOverrideDurationMinutes,
  normalizeMatchDemoOverridePhase,
  type MatchDemoOverridePhase,
  type MatchDemoOverrideState,
} from "@/lib/match-demo-override"
import { getMatchTimelinePhase, type MatchTimelinePhase } from "@/lib/match-timeline-ui"

import { createModerationLog } from "./content-moderation"
import { ModerationLog } from "./models"

export const MATCH_DEMO_OVERRIDE_ACTION_SET = "demo_override_set"
export const MATCH_DEMO_OVERRIDE_ACTION_RESET = "demo_override_reset"
export const MATCH_DEMO_OVERRIDE_ACTIONS = [MATCH_DEMO_OVERRIDE_ACTION_SET, MATCH_DEMO_OVERRIDE_ACTION_RESET] as const
export { MATCH_DEMO_OVERRIDE_DEFAULT_DURATION_MINUTES, MATCH_DEMO_OVERRIDE_DURATION_PRESETS, MATCH_DEMO_OVERRIDE_MAX_DURATION_MINUTES, normalizeMatchDemoOverrideDurationMinutes, normalizeMatchDemoOverridePhase }

export function sanitizeDemoOverrideReason(value: unknown) {
  return String(value || "").trim().slice(0, 500)
}

export function validateDemoOverrideReason(value: unknown) {
  const reason = sanitizeDemoOverrideReason(value)
  if (!reason) return { ok: false as const, reason, error: "Reason is required" }
  return { ok: true as const, reason }
}

export function canManageMatchDemoOverride(role?: string | null) {
  return canManageCommunityAdmin(role)
}

function getRemainingSeconds(expiresAt: Date | string | null | undefined, now: Date) {
  if (!expiresAt) return null
  const expiresTime = new Date(expiresAt).getTime()
  if (!Number.isFinite(expiresTime)) return null
  return Math.max(0, Math.ceil((expiresTime - now.getTime()) / 1000))
}

export function buildDemoOverrideState(input: {
  providerPhase: MatchTimelinePhase
  overridePhase?: MatchDemoOverridePhase | null
  reason?: string
  updatedBy?: string
  updatedAt?: Date | string | null
  expiresAt?: Date | string | null
  durationMinutes?: number | null
  now?: Date
}): MatchDemoOverrideState {
  const now = input.now || new Date()
  const overridePhase = input.overridePhase || "auto"
  const activeOverridePhase = getActiveMatchDemoOverridePhase(overridePhase, input.expiresAt, now)
  const enabled = isMatchDemoOverrideEnabled(activeOverridePhase)
  const hadOverride = isMatchDemoOverrideEnabled(overridePhase)
  const remainingSeconds = getRemainingSeconds(input.expiresAt, now)
  return {
    providerPhase: input.providerPhase,
    overridePhase,
    effectivePhase: getEffectiveMatchTimelinePhase(input.providerPhase, activeOverridePhase),
    enabled,
    isExpired: hadOverride && Boolean(input.expiresAt) && !enabled,
    remainingSeconds,
    reason: input.reason || "",
    updatedBy: input.updatedBy || "",
    updatedAt: input.updatedAt || null,
    expiresAt: input.expiresAt || null,
    durationMinutes: input.durationMinutes ?? null,
  }
}

export function buildDemoOverrideAuditMetadata(input: {
  actorId: string
  actorRole: string
  matchId: string
  previousPhase: MatchDemoOverridePhase
  newPhase: MatchDemoOverridePhase
  reason: string
  updatedAt?: Date
  expiresAt?: Date | null
  durationMinutes?: number | null
}) {
  return {
    actorId: input.actorId,
    actorRole: input.actorRole,
    matchId: input.matchId,
    previousPhase: input.previousPhase,
    newPhase: input.newPhase,
    reason: input.reason,
    updatedAt: input.updatedAt || new Date(),
    expiresAt: input.expiresAt || null,
    durationMinutes: input.durationMinutes ?? null,
  }
}

function mapDemoOverrideLog(log: any, providerPhase: MatchTimelinePhase, now: Date = new Date()): MatchDemoOverrideState {
  if (!log || log.action === MATCH_DEMO_OVERRIDE_ACTION_RESET) {
    return buildDemoOverrideState({ providerPhase, overridePhase: "auto", now })
  }
  const phase = normalizeMatchDemoOverridePhase(log.metadata?.newPhase)
  return buildDemoOverrideState({
    providerPhase,
    overridePhase: phase && phase !== "auto" ? phase : "auto",
    reason: log.metadata?.reason || "",
    updatedBy: log.metadata?.actorId || log.reviewedBy?.toString?.() || "",
    updatedAt: log.metadata?.updatedAt || log.createdAt || null,
    expiresAt: log.metadata?.expiresAt || null,
    durationMinutes: normalizeMatchDemoOverrideDurationMinutes(log.metadata?.durationMinutes),
    now,
  })
}

export async function getMatchDemoOverrideState(matchId: string, fixture: { status?: string | null; isFinished?: boolean | null }, now: Date = new Date()) {
  const providerPhase = getMatchTimelinePhase(fixture)
  if (!matchId) return buildDemoOverrideState({ providerPhase, overridePhase: "auto", now })
  const log = await ModerationLog.findOne({
    action: { $in: MATCH_DEMO_OVERRIDE_ACTIONS },
    "metadata.matchId": matchId,
  })
    .sort({ createdAt: -1 })
    .lean()
  return mapDemoOverrideLog(log, providerPhase, now)
}

export async function setMatchDemoOverride(input: {
  admin: any
  matchId: string
  fixture: { status?: string | null; isFinished?: boolean | null }
  requestedPhase: MatchDemoOverridePhase
  reason: string
  durationMinutes?: number | null
}) {
  const previous = await getMatchDemoOverrideState(input.matchId, input.fixture)
  if (input.requestedPhase === "auto") {
    return resetMatchDemoOverride({ admin: input.admin, matchId: input.matchId, fixture: input.fixture, reason: input.reason })
  }
  if (!isMatchDemoOverrideEnabled(input.requestedPhase)) throw new Error("Invalid demo phase")
  const durationMinutes = normalizeMatchDemoOverrideDurationMinutes(input.durationMinutes ?? MATCH_DEMO_OVERRIDE_DEFAULT_DURATION_MINUTES)
  if (!durationMinutes) throw new Error("Invalid demo duration")

  const now = new Date()
  const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000)
  await createModerationLog({
    contentType: "room_message",
    contentId: `${input.matchId}:demo-override`,
    status: "approved",
    action: MATCH_DEMO_OVERRIDE_ACTION_SET,
    provider: "manual",
    reviewedBy: input.admin._id.toString(),
    metadata: buildDemoOverrideAuditMetadata({
      actorId: input.admin._id.toString(),
      actorRole: input.admin.role || "",
      matchId: input.matchId,
      previousPhase: previous.overridePhase,
      newPhase: input.requestedPhase,
      reason: input.reason,
      updatedAt: now,
      expiresAt,
      durationMinutes,
    }),
  })
  return {
    state: buildDemoOverrideState({
      providerPhase: previous.providerPhase,
      overridePhase: input.requestedPhase,
      reason: input.reason,
      updatedBy: input.admin._id.toString(),
      updatedAt: now,
      expiresAt,
      durationMinutes,
      now,
    }),
    idempotent: false,
  }
}

export async function resetMatchDemoOverride(input: {
  admin: any
  matchId: string
  fixture: { status?: string | null; isFinished?: boolean | null }
  reason: string
}) {
  const previous = await getMatchDemoOverrideState(input.matchId, input.fixture)
  if (!previous.enabled) return { state: previous, idempotent: true }

  const now = new Date()
  await createModerationLog({
    contentType: "room_message",
    contentId: `${input.matchId}:demo-override`,
    status: "approved",
    action: MATCH_DEMO_OVERRIDE_ACTION_RESET,
    provider: "manual",
    reviewedBy: input.admin._id.toString(),
    metadata: buildDemoOverrideAuditMetadata({
      actorId: input.admin._id.toString(),
      actorRole: input.admin.role || "",
      matchId: input.matchId,
      previousPhase: previous.overridePhase,
      newPhase: "auto",
      reason: input.reason,
      updatedAt: now,
      expiresAt: null,
      durationMinutes: null,
    }),
  })
  return {
    state: buildDemoOverrideState({
      providerPhase: previous.providerPhase,
      overridePhase: "auto",
      reason: input.reason,
      updatedBy: input.admin._id.toString(),
      updatedAt: now,
    }),
    idempotent: false,
  }
}
