import { PREMIER_LEAGUE_DATA_SEASON } from "../season"
import type { QuizPeriod } from "../games/quiz-results"

const THAI_OFFSET = 7 * 60 * 60 * 1000

export function quizPeriodRange(period: QuizPeriod, now = new Date()) {
  const local = new Date(now.getTime() + THAI_OFFSET)
  const year = local.getUTCFullYear()
  const month = local.getUTCMonth()
  let start: Date
  let end: Date
  if (period === "season") {
    start = new Date(`${PREMIER_LEAGUE_DATA_SEASON.startDate}T00:00:00+07:00`)
    end = new Date(`${PREMIER_LEAGUE_DATA_SEASON.endDate}T00:00:00+07:00`)
  } else if (period === "monthly") {
    start = new Date(Date.UTC(year, month, 1) - THAI_OFFSET)
    end = new Date(Date.UTC(year, month + 1, 1) - THAI_OFFSET)
  } else {
    const monday = local.getUTCDate() - (local.getUTCDay() + 6) % 7
    start = new Date(Date.UTC(year, month, monday) - THAI_OFFSET)
    end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
  }
  return { start, end }
}
