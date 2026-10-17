"use client"

import useSWR from "swr"
import { useWeeklyPredictions } from "./use-weekly-predictions"
import { getScorerPlayers, type SquadPlayer } from "@/lib/games/first-scorer"

type Squad = { players: SquadPlayer[]; failed: boolean }

async function fetchSquads([, ids]: [string, string[]]): Promise<Record<string, Squad>> {
  const rows: (readonly [string, Squad])[] = []
  // A full week can involve twenty teams; bound concurrent provider requests.
  for (let index = 0; index < ids.length; index += 4) {
    rows.push(...await Promise.all(ids.slice(index, index + 4).map(async (id): Promise<readonly [string, Squad]> => {
      try {
        const response = await fetch(`/api/football/team/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(30000) })
        const body = await response.json()
        if (!response.ok || body.error || String(body.data?.id) !== id || !Array.isArray(body.data?.players)) throw new Error("Invalid squad")
        return [id, { players: body.data.players, failed: false }]
      } catch {
        return [id, { players: [], failed: true }]
      }
    })))
  }
  return Object.fromEntries(rows)
}

export function useFirstScorer() {
  const fixtures = useWeeklyPredictions()
  const ids = [...new Set(fixtures.matches.filter(match => match.openForPrediction).flatMap(match => [match.homeTeamId, match.awayTeamId]).filter(Boolean))].sort()
  const { data, isLoading, mutate } = useSWR(ids.length && !fixtures.error ? ["first-scorer-squads", ids] : null, fetchSquads, {
    refreshInterval: 300000,
    revalidateOnFocus: true,
  })
  const matches = fixtures.matches.map(match => {
    const home = data?.[match.homeTeamId]
    const away = data?.[match.awayTeamId]
    const homePlayers = getScorerPlayers(home?.players || [], match.homeTeamId, match.home)
    const awayPlayers = getScorerPlayers(away?.players || [], match.awayTeamId, match.away)
    const players = [...homePlayers, ...awayPlayers]
    const playersError = !match.homeTeamId || !match.awayTeamId || home?.failed || away?.failed
    const playersReady = match.openForPrediction && !fixtures.error && !playersError && homePlayers.length > 0 && awayPlayers.length > 0
    return { ...match, players, playersError, playersReady, playersLoading: isLoading }
  })
  return { ...fixtures, matches, retryPlayers: () => { void mutate() } }
}
