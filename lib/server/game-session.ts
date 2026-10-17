import { randomInt } from "node:crypto"
import { isValidObjectId } from "mongoose"
import { QuizSession } from "./quiz-model"
import { QuizError } from "./quiz-engine"

export type GameType = "football-quiz" | "who-am-i"
export type GameDocument<T> = T & { _id: { toString(): string }; __v: number; gameType: GameType; category: string }

export function shuffleGameItems<T>(items: T[]) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export async function createGameSession<T>(user: string, requestId: unknown, gameType: GameType, category: string, fields: Record<string, unknown>) {
  if (typeof requestId !== "string" || !/^[a-zA-Z0-9-]{16,64}$/.test(requestId)) throw new QuizError("Invalid request ID")
  await QuizSession.init()
  let doc
  try {
    doc = await QuizSession.findOneAndUpdate({ user, requestId }, {
      $setOnInsert: { ...fields, user, requestId, gameType, category, questionStartedAt: Date.now() },
    }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean<GameDocument<T>>()
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error
    doc = await QuizSession.findOne({ user, requestId }).lean<GameDocument<T>>()
  }
  if (!doc || doc.gameType !== gameType || doc.category !== category) throw new QuizError("Request ID already used", 409)
  return doc
}

export async function findGameSession<T>(user: string, gameType: GameType, id?: string | null) {
  if (id && !isValidObjectId(id)) throw new QuizError("Game not found", 404)
  const doc = await QuizSession.findOne({ user, gameType, ...(id ? { _id: id } : {}) }).sort({ createdAt: -1, _id: -1 }).lean<GameDocument<T>>()
  if (!doc && id) throw new QuizError("Game not found", 404)
  return doc
}

export async function updateGameSession<T extends object, V>(user: string, id: unknown, gameType: GameType,
  transition: (state: T, now: number) => T, view: (id: string, state: T, now: number) => V) {
  if (typeof id !== "string" || !isValidObjectId(id)) throw new QuizError("Game not found", 404)
  for (let attempt = 0; attempt < 5; attempt++) {
    const doc = await findGameSession<T>(user, gameType, id)
    if (!doc) throw new QuizError("Game not found", 404)
    const next = transition(doc, Date.now())
    if (next === doc) return view(id, doc, Date.now())
    // Both games use one version-checked write for answers, hint usage, score and completion.
    const changes: Record<string, unknown> = {}
    for (const field of ["currentIndex", "questionStartedAt", "answers", "score", "correctCount", "streak", "bestStreak", "status", "completedAt", "revealedClues"]) {
      if (field in next) changes[field] = (next as Record<string, unknown>)[field]
    }
    const updated = await QuizSession.findOneAndUpdate({ _id: id, user, gameType, __v: doc.__v }, {
      $set: changes, $inc: { __v: 1 },
    }, { new: true }).lean<GameDocument<T>>()
    if (updated) return view(id, updated, Date.now())
  }
  throw new QuizError("Game was updated in another tab. Please retry.", 409)
}
