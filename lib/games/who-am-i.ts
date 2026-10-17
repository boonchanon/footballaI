export const WHO_TIMES = { easy: 420, medium: 300, hard: 180 } as const
export type WhoDifficulty = keyof typeof WHO_TIMES
export type WhoMode = "clues" | "career" | "stats"
export const WHO_MODE_LABELS: Record<WhoMode, string> = { clues: "คำใบ้ปริศนา", career: "เส้นทางค้าแข้ง", stats: "เจ้าของสถิติ" }
export type WhoAnswer = {
  questionId: string
  answer: string
  selected: string
  correct: boolean
  points: number
  hints: number
  elapsedMs: number
  answeredAt: number
}
export type WhoSessionView = {
  id: string
  difficulty: WhoDifficulty
  status: "playing" | "completed"
  currentIndex: number
  totalQuestions: number
  currentQuestion: { id: string; mode: WhoMode; clues: Array<string | null>; clueLabels: Array<string | null>; options: string[]; answer?: string }
  revealedClues: number
  availablePoints: number
  answered: boolean
  deadline: number
  serverNow: number
  score: number
  correctCount: number
  answers: WhoAnswer[]
  completedAt: string | null
  timedOut: boolean
}
