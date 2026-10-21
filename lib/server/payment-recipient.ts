function normalizeDigits(value: string) {
  return value.replace(/\D/g, "")
}

// PromptPay phone IDs appear as 0812345678, 66812345678 or 0066812345678; reduce them to the local form.
function normalizePromptPayDigits(value: string) {
  const digits = normalizeDigits(value)
  if (digits.length === 13 && digits.startsWith("0066")) return `0${digits.slice(4)}`
  if (digits.length === 11 && digits.startsWith("66")) return `0${digits.slice(2)}`
  return digits
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9ก-๙]/g, "")
}

// Banks often mask the receiver account (e.g. "xxx-x-x1234-x"), so a suffix match is only a
// partial match and has to be confirmed by the receiver name.
export function matchRecipientAccount(configured: string, received: string): "exact" | "partial" | "none" {
  const left = normalizePromptPayDigits(configured)
  const right = normalizePromptPayDigits(received)
  if (!left || !right) return "none"
  if (left === right) return "exact"
  if (right.length >= 4 && (left.endsWith(right) || left.slice(-4) === right.slice(-4))) return "partial"
  return "none"
}

// Slips may show a shortened name ("MR. JOHN S"), so allow containment, but not for fragments
// so short that almost any name would match.
export function isSameRecipientName(configured: string, received: string) {
  const left = normalizeName(configured)
  const right = normalizeName(received)
  if (!left || !right) return false
  if (left === right) return true
  return Math.min(left.length, right.length) >= 4 && (left.includes(right) || right.includes(left))
}

export function isRecipientVerified(input: {
  configuredAccount: string
  configuredName: string
  receivedAccount?: string | null
  receivedName?: string | null
}) {
  const accountMatch = matchRecipientAccount(input.configuredAccount, input.receivedAccount || "")
  const nameMatches = isSameRecipientName(input.configuredName, input.receivedName || "")
  if (accountMatch === "exact") return true
  if (accountMatch === "partial") return nameMatches
  // No usable account on the slip: only the receiver name can prove where the money went.
  return !normalizeDigits(input.receivedAccount || "") && nameMatches
}
