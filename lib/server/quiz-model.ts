import mongoose from "mongoose"

const { Schema, models, model } = mongoose
const quizSessionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  gameType: { type: String, enum: ["football-quiz", "who-am-i"], default: "football-quiz" },
  requestId: { type: String, required: true },
  category: { type: String, required: true },
  bankVersion: { type: Number, default: 1 },
  status: { type: String, enum: ["playing", "completed"], default: "playing" },
  // Snapshot each round so future question-bank edits cannot change an existing result.
  questions: { type: [Schema.Types.Mixed], required: true },
  totalQuestions: { type: Number, required: true },
  currentIndex: { type: Number, default: 0 },
  questionStartedAt: { type: Number, required: true },
  difficulty: { type: String, enum: ["easy", "medium", "hard"] },
  revealedClues: { type: Number, default: 1 },
  answers: { type: [Schema.Types.Mixed], default: [] },
  score: { type: Number, default: 0 },
  correctCount: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  bestStreak: { type: Number, default: 0 },
  completedAt: { type: Date, default: null },
}, { timestamps: true })

quizSessionSchema.index({ user: 1, requestId: 1 }, { unique: true })
quizSessionSchema.index({ user: 1, createdAt: -1 })
quizSessionSchema.index({ user: 1, gameType: 1, status: 1, completedAt: -1, _id: -1 })
quizSessionSchema.index({ gameType: 1, status: 1, completedAt: -1, score: -1 })

// Extend the cached model during development hot reload without replacing existing Quiz data.
const cachedSchema = models.QuizSession?.schema
if (cachedSchema && !cachedSchema.path("difficulty")) {
  cachedSchema.add({ difficulty: quizSessionSchema.obj.difficulty, revealedClues: quizSessionSchema.obj.revealedClues })
  ;(cachedSchema.path("gameType") as mongoose.Schema.Types.String).enum("who-am-i")
}

export const QuizSession = models.QuizSession || model("QuizSession", quizSessionSchema)
