import { normalizeTimelineMatchEvents } from "./match-timeline-ui"

export const TACTICAL_ROOM_COPY = {
  title: "ห้องแท็กติก",
  intro: "พื้นที่สำหรับการวิเคราะห์แท็กติก",
  description: "แผนการเล่น การเปลี่ยนตัว และการตัดสินใจของผู้จัดการทีม",
  placeholder: "พิมพ์ข้อความใน #ห้องแท็กติก...",
  emptyTitle: "ยังไม่มีการวิเคราะห์แท็กติก",
  emptyDescription: "เริ่มแบ่งปันมุมมองของคุณได้เลย",
  missingProviderData: "ยังไม่มีข้อมูลแผนการเล่นจากผู้ให้บริการ",
} as const

export const TACTICAL_QUICK_TOPICS = [
  { id: "formation", label: "แผนการเล่น" },
  { id: "pressing", label: "เพรสซิ่ง" },
  { id: "build_up", label: "ขึ้นเกม" },
  { id: "counter_attack", label: "สวนกลับ" },
  { id: "substitution", label: "เปลี่ยนตัว" },
  { id: "manager", label: "โค้ช" },
  { id: "player", label: "นักเตะ" },
  { id: "defence", label: "เกมรับ" },
  { id: "attack", label: "เกมรุก" },
] as const

export type TacticalQuickTopic = (typeof TACTICAL_QUICK_TOPICS)[number]["id"]

type TacticalLineupPlayer = {
  number: string
  name: string
  position: string
  grid: string
}

type TacticalTeamLineup = {
  teamName: string
  formation: string
  manager: string
  startXI: TacticalLineupPlayer[]
  substitutes: TacticalLineupPlayer[]
}

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeLineupPlayer(value: unknown) {
  const item = value && typeof value === "object" ? (value as Record<string, any>) : {}
  const player = item.player && typeof item.player === "object" ? item.player : item
  return {
    number: safeString(player.number),
    name: safeString(player.name || player.player_name),
    position: safeString(player.pos || player.position),
    grid: safeString(player.grid),
  } satisfies TacticalLineupPlayer
}

function normalizeLineupPlayers(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map(normalizeLineupPlayer).filter((player) => player.name)
}

function normalizeTeamLineup(value: unknown) {
  const item = value && typeof value === "object" ? (value as Record<string, any>) : {}
  const team = item.team && typeof item.team === "object" ? item.team : {}
  const coach = item.coach && typeof item.coach === "object" ? item.coach : {}
  return {
    teamName: safeString(team.name || item.teamName || item.name),
    formation: safeString(item.formation),
    manager: safeString(coach.name || item.manager || item.coach),
    startXI: normalizeLineupPlayers(item.startXI || item.startingXI || item.lineup || item.first11),
    substitutes: normalizeLineupPlayers(item.substitutes || item.subs || item.bench),
  } satisfies TacticalTeamLineup
}

export function normalizeTacticalQuickTopic(value: unknown): TacticalQuickTopic | null {
  const normalized = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_")
  return TACTICAL_QUICK_TOPICS.some((topic) => topic.id === normalized) ? (normalized as TacticalQuickTopic) : null
}

export function getTacticalQuickTopicLabel(value: unknown) {
  const topic = normalizeTacticalQuickTopic(value)
  return TACTICAL_QUICK_TOPICS.find((item) => item.id === topic)?.label || ""
}

export function buildTacticalTopicTag(value: unknown) {
  const topic = normalizeTacticalQuickTopic(value)
  return topic ? `match-tactical:${topic}` : ""
}

export function extractTacticalTopicFromTags(tags: unknown) {
  if (!Array.isArray(tags)) return null
  const raw = tags.find((tag) => String(tag || "").startsWith("match-tactical:"))
  return normalizeTacticalQuickTopic(String(raw || "").replace("match-tactical:", ""))
}

export function getTacticalFixtureContext(fixture: {
  homeTeam?: string | null
  awayTeam?: string | null
  lineups?: unknown
  events?: unknown
}) {
  const lineups = Array.isArray(fixture.lineups)
    ? fixture.lineups.map(normalizeTeamLineup).filter((item) => item.teamName || item.formation || item.manager || item.startXI.length || item.substitutes.length)
    : []
  const events = normalizeTimelineMatchEvents(fixture.events)
  const rawEvents = Array.isArray(fixture.events) ? fixture.events : []
  const substitutions = events.filter((event) => event.type === "substitution")
  const cards = events.filter((event) => event.type === "yellow_card" || event.type === "red_card")
  const formationChanges = rawEvents
    .map((event: any) => {
      const detail = safeString(event?.detail || event?.comments || event?.type)
      if (!/formation/i.test(detail)) return null
      const minute = event?.time?.elapsed ?? event?.minute ?? event?.elapsed ?? null
      return {
        id: String(event?.id || event?._id || `formation:${minute || ""}:${detail}`),
        minute,
        detail,
      }
    })
    .filter((event): event is { id: string; minute: unknown; detail: string } => Boolean(event))

  return {
    hasProviderData: Boolean(lineups.length || substitutions.length || cards.length || formationChanges.length),
    lineups,
    substitutions,
    cards,
    formationChanges,
  }
}

export function getTacticalPhaseFocus(phase: "pre_match" | "live" | "full_time") {
  if (phase === "live") return ["เปลี่ยนตัว", "แท็กติกสด"]
  if (phase === "full_time") return ["วิเคราะห์หลังเกม", "สรุปภาพรวม AI"]
  return ["แผนการเล่น", "รายชื่อ 11 ตัวจริง"]
}
