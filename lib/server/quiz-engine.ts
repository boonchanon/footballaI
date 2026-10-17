import { QUIZ_SECONDS, QUIZ_DIFFICULTIES, type QuizDifficulty, type QuizAnswer, type QuizQuestion, type QuizSessionView } from "../games/quiz"

export type QuizState = {
  category: string
  difficulty?: QuizDifficulty
  status: "playing" | "completed"
  questions: Array<QuizQuestion & { answer: number }>
  currentIndex: number
  questionStartedAt: number
  answers: QuizAnswer[]
  score: number
  correctCount: number
  streak: number
  bestStreak: number
  completedAt: Date | null
}

export class QuizError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

export function quizSeconds(state: QuizState) {
  return state.difficulty ? QUIZ_DIFFICULTIES[state.difficulty].seconds : QUIZ_SECONDS
}

export function answerQuiz(state: QuizState, questionId: unknown, selected: unknown, now: number): QuizState {
  if (typeof questionId !== "string") throw new QuizError("Invalid question")
  if (selected !== null && (!Number.isInteger(selected) || Number(selected) < 0 || Number(selected) > 3)) {
    throw new QuizError("Invalid answer")
  }
  // A retried answer never changes the first committed response or awards points again.
  if (state.answers.some(answer => answer.questionId === questionId)) return state
  const question = state.questions[state.currentIndex]
  if (state.status !== "playing" || question.id !== questionId) throw new QuizError("Question is not active", 409)
  const elapsedMs = Math.max(0, now - state.questionStartedAt)
  const remaining = Math.max(0, quizSeconds(state) - Math.floor(elapsedMs / 1000))
  const timedOut = elapsedMs >= quizSeconds(state) * 1000
  if (selected === null && !timedOut) throw new QuizError("Question has not expired", 409)
  const correct = !timedOut && selected === question.answer
  const points = correct ? 10 + (remaining >= 10 ? 5 : remaining >= 5 ? 3 : 1) : 0
  const streak = correct ? state.streak + 1 : 0
  const completed = state.currentIndex === state.questions.length - 1
  return {
    ...state,
    answers: [...state.answers, {
      questionId, question: question.question, selected: timedOut ? null : Number(selected),
      correct, points, elapsedMs, answeredAt: now,
    }],
    score: state.score + points,
    correctCount: state.correctCount + (correct ? 1 : 0),
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    status: completed ? "completed" : "playing",
    completedAt: completed ? new Date(now) : null,
  }
}

export function nextQuizQuestion(state: QuizState, questionId: unknown, now: number): QuizState {
  if (typeof questionId !== "string") throw new QuizError("Invalid question")
  const index = state.questions.findIndex(question => question.id === questionId)
  if (index < 0 || index > state.currentIndex) throw new QuizError("Question is not active", 409)
  if (index < state.currentIndex || state.status === "completed") return state
  if (!state.answers.some(answer => answer.questionId === questionId)) throw new QuizError("Answer the current question first", 409)
  return { ...state, currentIndex: state.currentIndex + 1, questionStartedAt: now }
}

export function quizView(id: string, state: QuizState, now: number): QuizSessionView {
  const question = state.questions[state.currentIndex]
  const answered = state.answers.some(answer => answer.questionId === question.id)
  return {
    id, category: state.category, status: state.status,
    difficulty: state.difficulty, secondsPerQuestion: quizSeconds(state),
    totalQuestions: state.questions.length, currentIndex: state.currentIndex,
    currentQuestion: {
      id: question.id, question: question.question, options: question.options,
      ...(answered ? { answer: question.answer } : {}),
    },
    answered, deadline: state.questionStartedAt + quizSeconds(state) * 1000, serverNow: now,
    score: state.score, correctCount: state.correctCount, streak: state.streak,
    bestStreak: state.bestStreak, answers: state.answers,
    completedAt: state.completedAt ? new Date(state.completedAt).toISOString() : null,
  }
}
