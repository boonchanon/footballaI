import type { WhoMode } from "../games/who-am-i"
import { allChallenges, type PlayerChallenge } from "./who-am-i-bank"

// Inject shuffling so the mix and uniqueness rules can be tested without database access.
export function buildWhoRound(shuffle: <T>(items: T[]) => T[], previousIds: string[] = []) {
  const modes = shuffle<WhoMode>(["clues", "career", "stats"])
  const order = [...modes, ...modes]
  const recent = new Set(previousIds)
  const pool = shuffle(allChallenges).sort((a, b) => Number(recent.has(a.id)) - Number(recent.has(b.id)))
  const selected: PlayerChallenge[] = []
  const players = new Set<string>()
  function pick(index: number): boolean {
    if (index === order.length) return true
    for (const question of pool) {
      if ((question.mode ?? "clues") !== order[index] || players.has(question.answer)) continue
      selected.push(question)
      players.add(question.answer)
      if (pick(index + 1)) return true
      selected.pop()
      players.delete(question.answer)
    }
    return false
  }
  if (!pick(0)) throw new Error("Who Am I bank cannot provide a balanced round")
  return selected.map(question => ({ ...question, options: shuffle(question.options) }))
}
