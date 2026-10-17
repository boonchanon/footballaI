export type QuizPeriod = "weekly" | "monthly" | "season"
export type QuizRanking = { rank: number; name: string; avatar: string; points: number; games: number }
export type QuizLeaderboard = { period: QuizPeriod; start: string; end: string; season: string; players: QuizRanking[] }
export type QuizHistory = {
  page: number
  total: number
  pageSize: number
  results: Array<{ id: string; gameType: "football-quiz" | "who-am-i"; category: string; difficulty?: string; score: number; correctCount: number; totalQuestions: number; completedAt: string }>
}

export const quizCategoryLabels: Record<string, string> = {
  mixed: "รวมทุกสนาม",
  "football-rules": "กติกาและสถานการณ์",
  "football-data": "อ่านเกมด้วยสถิติ",
  easy: "ง่าย",
  medium: "ปานกลาง",
  hard: "ยาก",
  "world-cup": "ประวัติศาสตร์ฟุตบอลโลก",
  "legendary-players": "นักเตะในตำนาน",
  "premier-league-stats": "สถิติพรีเมียร์ลีก",
  "clubs-stadiums": "สโมสรและสนาม",
}
