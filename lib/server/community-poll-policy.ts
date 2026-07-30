export type CommunityPollDraft = {
  question: string
  options: Array<{ id: string; text: string }>
}

export function validateCommunityPollDraft(poll: CommunityPollDraft | null | undefined) {
  if (!poll) return { ok: true as const, error: "" }
  const question = String(poll.question || "").trim()
  const options = Array.isArray(poll.options) ? poll.options.map((option) => String(option.text || "").trim()) : []
  const uniqueOptions = new Set(options.map((option) => option.toLowerCase()))

  if (!question && options.length === 0) return { ok: true as const, error: "" }
  if (question.length < 4) return { ok: false as const, error: "Poll needs a question with at least 4 characters" }
  if (question.length > 180) return { ok: false as const, error: "Poll question is too long" }
  if (options.some((option) => !option)) return { ok: false as const, error: "Poll options cannot be empty" }
  if (options.length < 2) return { ok: false as const, error: "Poll needs at least 2 options" }
  if (options.length > 6) return { ok: false as const, error: "Poll supports up to 6 options" }
  if (options.some((option) => option.length > 120)) return { ok: false as const, error: "Poll option is too long" }
  if (uniqueOptions.size !== options.length) return { ok: false as const, error: "Poll options must be unique" }
  return { ok: true as const, error: "" }
}

export function canCreateOfficialPollFromMatchFacts(facts: { isFinished?: boolean; lineupCount?: number; eventCount?: number } | null | undefined) {
  if (!facts?.isFinished) return false
  return Boolean((facts.lineupCount || 0) > 1 || (facts.eventCount || 0) > 0)
}
