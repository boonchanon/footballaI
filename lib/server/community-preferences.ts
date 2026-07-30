import { footballService } from "@/app/api/football/service"

export const COMMUNITY_CONTENT_TYPES = [
  { id: "match-discussion", label: "วิเคราะห์แมตช์" },
  { id: "transfer-rumors", label: "ข่าวย้ายทีม" },
  { id: "player-discussion", label: "พูดคุยนักเตะ" },
  { id: "predictions", label: "ทายผล" },
  { id: "general", label: "ทั่วไป" },
] as const

export const MAX_FAVORITE_TEAMS = 5
export const MAX_FAVORITE_PLAYERS = 20

export type CommunityTeamPreference = {
  id: string
  name: string
  nameEn: string
  logo: string
}

export type CommunityPlayerPreference = {
  id: string
  name: string
  photo: string
  team: string
  teamLogo: string
}

export function normalizePreferenceIds(value: unknown, limit: number) {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string" || typeof item === "number")
        .map((item) => String(item).trim())
        .filter((item) => /^[A-Za-z0-9_-]{1,80}$/.test(item))
        .slice(0, limit),
    ),
  )
}

export function normalizeContentTypes(value: unknown) {
  const allowed = new Set(COMMUNITY_CONTENT_TYPES.map((item) => item.id))
  return normalizePreferenceIds(value, COMMUNITY_CONTENT_TYPES.length).filter((item) => allowed.has(item as (typeof COMMUNITY_CONTENT_TYPES)[number]["id"]))
}

export async function getCommunityPreferenceOptions() {
  const [rawTeams, playerSummary] = await Promise.all([
    footballService.getTeams(),
    footballService.getPlayerStatsSummary().catch(() => null),
  ])

  const teams: CommunityTeamPreference[] = (Array.isArray(rawTeams) ? rawTeams : []).map((team: any) => ({
    id: String(team.id || ""),
    name: String(team.name || team.nameEn || ""),
    nameEn: String(team.nameEn || team.name || ""),
    logo: String(team.logo || ""),
  })).filter((team) => team.id && team.name)

  const playerGroups = playerSummary && typeof playerSummary === "object" ? Object.values(playerSummary as Record<string, unknown>) : []
  const playerMap = new Map<string, CommunityPlayerPreference>()
  playerGroups.forEach((group) => {
    if (!Array.isArray(group)) return
    group.forEach((player: any) => {
      const id = String(player.id || "")
      if (!id || playerMap.has(id)) return
      playerMap.set(id, {
        id,
        name: String(player.name || ""),
        photo: String(player.photo || ""),
        team: String(player.team || player.teamNameThai || player.teamName || ""),
        teamLogo: String(player.teamLogo || ""),
      })
    })
  })

  return {
    teams,
    players: Array.from(playerMap.values()).filter((player) => player.id && player.name),
    contentTypes: COMMUNITY_CONTENT_TYPES,
  }
}

export async function validateCommunityPreferences(input: {
  favoriteTeamIds?: unknown
  favoritePlayerIds?: unknown
  preferredContentTypes?: unknown
}) {
  const options = await getCommunityPreferenceOptions()
  const teamIds = normalizePreferenceIds(input.favoriteTeamIds, MAX_FAVORITE_TEAMS)
  const playerIds = normalizePreferenceIds(input.favoritePlayerIds, MAX_FAVORITE_PLAYERS)
  const preferredContentTypes = normalizeContentTypes(input.preferredContentTypes)
  const validTeamIds = new Set(options.teams.map((team) => team.id))
  const validPlayerIds = new Set(options.players.map((player) => player.id))

  const invalidTeamId = teamIds.find((id) => !validTeamIds.has(id))
  if (invalidTeamId) throw new Error("Invalid favorite team")

  const invalidPlayerId = playerIds.find((id) => !validPlayerIds.has(id))
  if (invalidPlayerId) throw new Error("Invalid favorite player")

  return {
    favoriteTeamIds: teamIds,
    favoritePlayerIds: playerIds,
    preferredContentTypes,
    options,
  }
}

export function getSelectedPreferenceDetails(ids: string[], items: Array<{ id: string }>) {
  const byId = new Map(items.map((item) => [item.id, item]))
  return ids.map((id) => byId.get(id)).filter(Boolean)
}
