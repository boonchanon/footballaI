export type SquadPlayer = { id: string | number; name: string; position?: string; photo?: string }
export type ScorerPlayer = { id: string; name: string; team: string; position: string; img: string }

export function getScorerPlayers(players: SquadPlayer[], teamId: string, team: string): ScorerPlayer[] {
  const seen = new Set<string>()
  return players.flatMap(player => {
    const playerId = String(player?.id ?? "").trim()
    const name = player?.name?.trim()
    if (!teamId || !playerId || playerId === "0" || !name || seen.has(playerId)) return []
    seen.add(playerId)
    return [{ id: `${teamId}:${playerId}`, name, team, position: player.position || "", img: player.photo || "" }]
  })
}

export function canSelectScorer(match: { kickoffAt: number; players: ScorerPlayer[]; playersReady: boolean }, playerId: string, now: number) {
  return match.playersReady && match.kickoffAt > now && match.players.some(player => player.id === playerId)
}
