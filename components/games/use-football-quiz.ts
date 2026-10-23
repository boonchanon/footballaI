"use client"

import { useGameSession } from "./use-game-session"
import type { QuizDifficulty, QuizSessionView } from "@/lib/games/quiz"
import { randomId } from "@/lib/browser"

export function useFootballQuiz() {
  const game = useGameSession<QuizSessionView>("/games/quiz")
  const { session, send } = game
  return {
    ...game,
    startGame: (category: string, difficulty: QuizDifficulty = "medium") => send({ action: "start", category, difficulty, requestId: randomId() }),
    handleAnswer: (selected: number) => session && !session.answered && send({
      action: "answer", sessionId: session.id, questionId: session.currentQuestion.id, selected,
    }),
    nextQuestion: () => session && send({
      action: session.status === "completed" ? "complete" : "next",
      sessionId: session.id, questionId: session.currentQuestion.id,
    }),
    goBackToCategories: game.reset,
  }
}
