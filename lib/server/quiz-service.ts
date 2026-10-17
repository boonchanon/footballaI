import { quizBank } from "./quiz-bank"
import { answerQuiz, nextQuizQuestion, QuizError, quizView, type QuizState } from "./quiz-engine"
import { createGameSession, findGameSession, shuffleGameItems, updateGameSession } from "./game-session"
import { QUIZ_DIFFICULTIES, type QuizDifficulty } from "../games/quiz"
import { QuizSession } from "./quiz-model"
import { buildQuizRound } from "./quiz-round"

export async function startQuiz(user: string, category: unknown, requestId: unknown, difficulty: unknown = "medium") {
  if (typeof category !== "string" || (category !== "mixed" && !Object.hasOwn(quizBank, category))) throw new QuizError("Invalid category")
  if (typeof difficulty !== "string" || !Object.hasOwn(QUIZ_DIFFICULTIES, difficulty)) throw new QuizError("Invalid difficulty")
  const recent = await QuizSession.find({ user, gameType: "football-quiz" }).sort({ createdAt: -1, _id: -1 }).limit(50).select({ "questions.id": 1 }).lean<Array<{ questions: Array<{ id: string }> }>>()
  const questions = buildQuizRound(category, shuffleGameItems, recent.map(round => round.questions.map(question => question.id)))
  const doc = await createGameSession<QuizState>(user, requestId, "football-quiz", category, {
    questions, totalQuestions: questions.length, difficulty: difficulty as QuizDifficulty, bankVersion: 2,
  })
  if (doc.difficulty && doc.difficulty !== difficulty) throw new QuizError("Request ID already used", 409)
  return quizView(String(doc._id), doc, Date.now())
}

export async function loadQuiz(user: string, id?: string | null) {
  const doc = await findGameSession<QuizState>(user, "football-quiz", id)
  return doc ? quizView(String(doc._id), doc, Date.now()) : null
}

export async function updateQuiz(user: string, id: unknown, action: string, questionId: unknown, selected: unknown) {
  return updateGameSession<QuizState, ReturnType<typeof quizView>>(user, id, "football-quiz", (state, now) => {
    if (action === "complete") {
      if (state.status !== "completed") throw new QuizError("Quiz is not complete", 409)
      return state
    }
    return action === "answer" ? answerQuiz(state, questionId, selected, now) : nextQuizQuestion(state, questionId, now)
  }, quizView)
}
