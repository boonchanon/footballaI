export const QUIZ_SECONDS = 15
export const QUIZ_ROUND_SIZE = 6
export const QUIZ_DIFFICULTIES = {
  easy: { label: "ง่าย", seconds: 30 },
  medium: { label: "ปานกลาง", seconds: 20 },
  hard: { label: "ยาก", seconds: 15 },
} as const
export type QuizDifficulty = keyof typeof QUIZ_DIFFICULTIES
export const QUIZ_CATEGORIES = [
  { key: "mixed", title: "รวมทุกสนาม" },
  { key: "world-cup", title: "ประวัติศาสตร์ฟุตบอลโลก" },
  { key: "legendary-players", title: "นักเตะในตำนาน" },
  { key: "premier-league-stats", title: "สถิติพรีเมียร์ลีก" },
  { key: "clubs-stadiums", title: "สโมสรและสนาม" },
  { key: "football-rules", title: "กติกาและสถานการณ์" },
  { key: "football-data", title: "อ่านเกมด้วยสถิติ" },
] as const

export type QuizQuestion = { id: string; question: string; options: string[] }
export type QuizAnswer = {
  questionId: string
  question: string
  selected: number | null
  correct: boolean
  points: number
  elapsedMs: number
  answeredAt: number
}
export type QuizSessionView = {
  id: string
  category: string
  difficulty?: QuizDifficulty
  secondsPerQuestion?: number
  status: "playing" | "completed"
  totalQuestions: number
  currentIndex: number
  currentQuestion: QuizQuestion & { answer?: number }
  answered: boolean
  deadline: number
  serverNow: number
  score: number
  correctCount: number
  streak: number
  bestStreak: number
  answers: QuizAnswer[]
  completedAt: string | null
}
