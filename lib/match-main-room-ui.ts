export const MAIN_ROOM_COPY = {
  title: "Main Room",
  eyebrow: "Match Hub Center",
  intro: "Everyone joins here.",
  description: "General discussion about this match.",
  placeholder: "Share your match take with everyone...",
  emptyTitle: "Be the first fan to start the Main Room discussion.",
  emptyDescription: "Kick off the central conversation for this match community.",
  deletedParent: "Original message is no longer available.",
  newMessages: "New messages",
  enterHint: "Enter to send · Shift+Enter for a new line",
} as const

function normalizeDate(value: unknown) {
  const date = value ? new Date(value as any) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function getMainRoomDateDividerLabel(value?: string | Date | null, nowInput: Date = new Date()) {
  const date = normalizeDate(value)
  if (!date) return ""
  const now = normalizeDate(nowInput) || new Date()
  const dayDelta = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)
  if (dayDelta === 0) return "Today"
  if (dayDelta === 1) return "Yesterday"
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(date)
}

export function shouldShowMainRoomDateDivider(current?: { createdAt?: string | Date | null } | null, previous?: { createdAt?: string | Date | null } | null) {
  const currentDate = normalizeDate(current?.createdAt)
  if (!currentDate) return false
  const previousDate = normalizeDate(previous?.createdAt)
  if (!previousDate) return true
  return startOfDay(currentDate) !== startOfDay(previousDate)
}

export function shouldGroupMainRoomMessage(
  current?: { author?: { id?: string }; createdAt?: string | Date | null } | null,
  previous?: { author?: { id?: string }; createdAt?: string | Date | null } | null,
) {
  if (!current?.author?.id || !previous?.author?.id || current.author.id !== previous.author.id) return false
  const currentDate = normalizeDate(current.createdAt)
  const previousDate = normalizeDate(previous.createdAt)
  if (!currentDate || !previousDate) return false
  return startOfDay(currentDate) === startOfDay(previousDate)
}

export function mergeMainRoomMessages<T extends { id: string; createdAt?: string | Date | null }>(base: T[], incoming: T[]) {
  const merged = new Map<string, T>()
  for (const item of [...base, ...incoming]) merged.set(item.id, item)
  return Array.from(merged.values()).sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
}

export function getRoomMessageBubbleLayout(input: { isOwner?: boolean | null; grouped?: boolean | null; hasReply?: boolean | null }) {
  const isOwner = Boolean(input.isOwner)
  return {
    side: isOwner ? "right" : "left",
    showAvatar: !isOwner && !input.grouped,
    showDisplayName: !isOwner && !input.grouped,
    rowClass: isOwner ? "justify-end" : "justify-start",
    contentClass: isOwner ? "items-end" : "items-start",
    bubbleClass: isOwner
      ? "border-primary/25 bg-primary text-primary-foreground"
      : "border-white/10 bg-background/55 text-foreground",
    replyClass: isOwner
      ? "border-primary-foreground/45 bg-black/10 text-primary-foreground/80"
      : "border-primary/60 bg-background/55 text-muted-foreground",
    metaClass: isOwner ? "justify-end text-right" : "justify-start text-left",
    replySide: isOwner ? "right" : "left",
  } as const
}

export function getSystemMessageLayout(kind: "date_divider" | "match_event" | "notice") {
  return {
    kind,
    alignment: "center",
    className: kind === "date_divider" ? "justify-center text-center" : "mx-auto text-center",
  } as const
}
