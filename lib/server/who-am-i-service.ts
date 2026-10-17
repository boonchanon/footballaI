import { WHO_TIMES } from "../games/who-am-i"
import { buildWhoRound } from "./who-am-i-round"
import { createGameSession, findGameSession, shuffleGameItems, updateGameSession } from "./game-session"
import { QuizError } from "./quiz-engine"
import { transitionWho, whoDeadline, whoView, type WhoState } from "./who-am-i-engine"

export async function startWho(user: string, difficulty: unknown, requestId: unknown) {
  if (typeof difficulty !== "string" || !Object.hasOwn(WHO_TIMES, difficulty)) throw new QuizError("Invalid difficulty")
  const previous = await findGameSession<WhoState>(user, "who-am-i")
  const questions = buildWhoRound(shuffleGameItems, previous?.questions.map(question => question.id))
  const doc = await createGameSession<WhoState>(user, requestId, "who-am-i", difficulty, {
    difficulty, questions, totalQuestions: 6, revealedClues: 1, bankVersion: 2,
  })
  return loadWho(user, String(doc._id))
}

export async function loadWho(user: string, id?: string | null) {
  const doc = await findGameSession<WhoState>(user, "who-am-i", id)
  if (!doc) return null
  if (doc.status === "playing" && Date.now() >= whoDeadline(doc)) return updateWho(user, String(doc._id), "expire")
  return whoView(String(doc._id), doc, Date.now())
}

export async function updateWho(user: string, id: unknown, action: string, questionId?: unknown, selected?: unknown, hintNumber?: unknown) {
  return updateGameSession<WhoState, ReturnType<typeof whoView>>(user, id, "who-am-i",
    (state, now) => transitionWho(state, action, questionId, selected, hintNumber, now), whoView)
}
