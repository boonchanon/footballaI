import { WHO_TIMES, type WhoDifficulty, type WhoAnswer, type WhoSessionView } from "../games/who-am-i"
import type { PlayerChallenge } from "./who-am-i-bank"
import { QuizError } from "./quiz-engine"

export type WhoState = {
  difficulty: WhoDifficulty
  status: "playing" | "completed"
  questions: PlayerChallenge[]
  currentIndex: number
  questionStartedAt: number
  revealedClues: number
  answers: WhoAnswer[]
  score: number
  correctCount: number
  completedAt: Date | null
}

export function whoDeadline(state: WhoState) {
  // Unlike Quiz, this timestamp is the start of the entire six-question round and never resets.
  return state.questionStartedAt + WHO_TIMES[state.difficulty] * 1000
}

export function transitionWho(state: WhoState, action: string, questionId: unknown, selected: unknown, hintNumber: unknown, now: number): WhoState {
  if (!["answer", "hint", "next", "complete", "expire"].includes(action)) throw new QuizError("Invalid action")
  if (action === "answer" && (typeof selected !== "string" || selected.length > 200)) throw new QuizError("Invalid answer")
  if (action === "hint" && (!Number.isInteger(hintNumber) || Number(hintNumber) < 2 || Number(hintNumber) > 6)) throw new QuizError("Invalid hint")
  if (["answer", "hint", "next"].includes(action) && typeof questionId !== "string") throw new QuizError("Invalid question")
  if (state.status === "completed") return state
  if (now >= whoDeadline(state)) return { ...state, status: "completed", completedAt: new Date(whoDeadline(state)) }
  if (action === "complete" || action === "expire") throw new QuizError("Game is not complete", 409)
  const index = state.questions.findIndex(question => question.id === questionId)
  if (index < 0 || index > state.currentIndex) throw new QuizError("Question is not active", 409)
  const question = state.questions[index]
  const answered = state.answers.some(answer => answer.questionId === questionId)
  if (action === "answer") {
    if (!question.options.includes(selected as string)) throw new QuizError("Invalid answer")
    if (answered) return state
    const correct = selected === question.answer
    const points = correct ? 10 + Math.max(0, 7 - state.revealedClues) * 5 : 0
    const completed = index === state.questions.length - 1
    return {
      ...state, score: state.score + points, correctCount: state.correctCount + Number(correct),
      answers: [...state.answers, { questionId: question.id, answer: question.answer, selected: selected as string, correct, points,
        hints: state.revealedClues, elapsedMs: now - state.questionStartedAt, answeredAt: now }],
      status: completed ? "completed" : "playing", completedAt: completed ? new Date(now) : null,
    }
  }
  if (index < state.currentIndex) return state
  if (action === "hint") {
    if (answered || Number(hintNumber) <= state.revealedClues) return state
    if (hintNumber !== state.revealedClues + 1) throw new QuizError("Reveal the next hint first", 409)
    return { ...state, revealedClues: Number(hintNumber) }
  }
  if (!answered) throw new QuizError("Answer the current question first", 409)
  return { ...state, currentIndex: state.currentIndex + 1, revealedClues: 1 }
}

export function whoView(id: string, state: WhoState, now: number): WhoSessionView {
  const question = state.questions[state.currentIndex]
  const answered = state.answers.some(answer => answer.questionId === question.id)
  const completedAt = state.completedAt ? new Date(state.completedAt) : null
  return {
    id, difficulty: state.difficulty, status: state.status, currentIndex: state.currentIndex, totalQuestions: state.questions.length,
    currentQuestion: { id: question.id, mode: question.mode ?? "clues", options: question.options,
      clues: question.clues.map((clue, i) => i < state.revealedClues ? clue : null),
      clueLabels: question.clues.map((_, i) => i < state.revealedClues ? question.clueLabels?.[i] ?? `คำใบ้ที่ ${i + 1}` : null),
      ...(answered ? { answer: question.answer } : {}) },
    revealedClues: state.revealedClues, availablePoints: 10 + Math.max(0, 7 - state.revealedClues) * 5,
    answered, deadline: whoDeadline(state), serverNow: completedAt?.getTime() ?? now,
    score: state.score, correctCount: state.correctCount, answers: state.answers,
    completedAt: completedAt?.toISOString() ?? null, timedOut: !!completedAt && completedAt.getTime() >= whoDeadline(state),
  }
}
