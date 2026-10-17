import { QUIZ_ROUND_SIZE } from "../games/quiz"
import { quizBank } from "./quiz-bank"

type Question = (typeof quizBank)[string][number]

export function buildQuizRound(category: string, shuffle: <T>(items: T[]) => T[], recentRounds: string[][] = []) {
  const bank = category === "mixed" ? Object.values(quizBank).flat() : quizBank[category]
  if (!bank) throw new Error("Invalid category")
  const recency = new Map<string, number>()
  recentRounds.forEach((ids, index) => ids.forEach(id => { if (!recency.has(id)) recency.set(id, index) }))
  // Shuffle ties, then prefer unseen questions and the least recently used rounds.
  const rank = (question: Question) => recency.get(question.id) ?? Number.MAX_SAFE_INTEGER
  return shuffle(bank).sort((a, b) => rank(b) - rank(a)).slice(0, QUIZ_ROUND_SIZE).map(question => {
    const order = shuffle(question.options.map((_, index) => index))
    return { ...question, options: order.map(index => question.options[index]), answer: order.indexOf(question.answer) }
  })
}
