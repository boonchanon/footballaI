"use client"

import { useGameSession } from "./use-game-session"
import type { WhoDifficulty, WhoSessionView } from "@/lib/games/who-am-i"

export function useWhoAmI() {
  const game = useGameSession<WhoSessionView>("/games/who-am-i", true)
  const { session, send } = game
  return {
    ...game,
    startGame: (difficulty: WhoDifficulty) => send({ action: "start", difficulty, requestId: crypto.randomUUID() }),
    handleAnswer: (selected: string) => session && !session.answered && send({ action: "answer", sessionId: session.id, questionId: session.currentQuestion.id, selected }),
    handleRevealClue: () => session && send({ action: "hint", sessionId: session.id, questionId: session.currentQuestion.id, hintNumber: session.revealedClues + 1 }),
    handleNext: () => session && send(session.status === "completed" ? { action: "complete", sessionId: session.id } : { action: "next", sessionId: session.id, questionId: session.currentQuestion.id }),
  }
}
