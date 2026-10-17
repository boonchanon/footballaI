import mongoose from "mongoose"
import type { QuizHistory, QuizLeaderboard, QuizPeriod, QuizRanking } from "../games/quiz-results"
import { PREMIER_LEAGUE_DATA_SEASON } from "../season"
import { QuizSession } from "./quiz-model"
import { User } from "./models"
import { quizPeriodRange } from "./quiz-period"

export async function quizHistory(user: string, page: number): Promise<QuizHistory> {
  const pageSize = 10
  const filter = { user: new mongoose.Types.ObjectId(user), gameType: { $in: ["football-quiz", "who-am-i"] }, status: "completed", completedAt: { $type: "date" } }
  const results = await QuizSession.aggregate([
    { $match: filter },
    { $sort: { completedAt: -1, _id: -1 } },
    { $skip: (page - 1) * pageSize },
    { $limit: pageSize },
    { $project: { _id: 0, id: { $toString: "$_id" }, gameType: 1, category: 1, difficulty: 1, score: 1, correctCount: 1, totalQuestions: 1, completedAt: 1 } },
  ])
  const total = await QuizSession.countDocuments(filter)
  return { page, total, pageSize, results: results.map(result => ({ ...result, completedAt: result.completedAt.toISOString() })) }
}

export async function quizLeaderboard(period: QuizPeriod, now = new Date()): Promise<QuizLeaderboard> {
  const { start, end } = quizPeriodRange(period, now)
  const rows = await QuizSession.aggregate<Omit<QuizRanking, "rank">>([
    { $match: { gameType: { $in: ["football-quiz", "who-am-i"] }, status: "completed", completedAt: { $gte: start, $lt: end, $lte: now }, score: { $gte: 0 } } },
    { $group: { _id: "$user", points: { $sum: "$score" }, games: { $sum: 1 }, lastCompletedAt: { $max: "$completedAt" } } },
    // Equal totals: the player who reached that total earlier comes first; ID is a final stable tie-breaker only.
    { $sort: { points: -1, lastCompletedAt: 1, _id: 1 } },
    { $lookup: { from: User.collection.name, localField: "_id", foreignField: "_id", pipeline: [{ $project: { _id: 0, name: 1, avatar: 1 } }], as: "player" } },
    { $unwind: "$player" },
    { $limit: 50 },
    { $project: { _id: 0, name: "$player.name", avatar: { $ifNull: ["$player.avatar", ""] }, points: 1, games: 1 } },
  ])
  return { period, start: start.toISOString(), end: end.toISOString(), season: PREMIER_LEAGUE_DATA_SEASON.labelShort, players: rows.map((row, index) => ({ ...row, rank: index + 1 })) }
}
