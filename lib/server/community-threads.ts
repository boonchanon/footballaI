import type { SortOrder } from "mongoose"

export const COMMUNITY_THREAD_CATEGORIES = ["tactics", "player", "referee", "post_match", "general"] as const
export const COMMUNITY_THREAD_SORTS = ["latest", "popular", "official", "active"] as const

export type CommunityThreadCategory = (typeof COMMUNITY_THREAD_CATEGORIES)[number]
export type CommunityThreadSort = (typeof COMMUNITY_THREAD_SORTS)[number]

export const COMMUNITY_THREAD_CATEGORY_LABELS: Record<CommunityThreadCategory, string> = {
  tactics: "แท็กติก",
  player: "นักเตะ",
  referee: "ผู้ตัดสิน",
  post_match: "หลังเกม",
  general: "ทั่วไป",
}

export function isCommunityThreadCategory(value: string): value is CommunityThreadCategory {
  return COMMUNITY_THREAD_CATEGORIES.includes(value as CommunityThreadCategory)
}

export function normalizeCommunityThreadCategory(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase()
  return isCommunityThreadCategory(normalized) ? normalized : null
}

export function normalizeCommunityThreadSort(value: unknown): CommunityThreadSort {
  const normalized = String(value || "").trim().toLowerCase()
  return COMMUNITY_THREAD_SORTS.includes(normalized as CommunityThreadSort) ? (normalized as CommunityThreadSort) : "latest"
}

export function getCommunityThreadCategoryLabel(category: string) {
  return COMMUNITY_THREAD_CATEGORY_LABELS[category as CommunityThreadCategory] || "ทั่วไป"
}

export function buildThreadExcerpt(content: string, limit = 200) {
  const normalized = String(content || "").trim()
  if (normalized.length <= limit) return normalized
  return `${normalized.slice(0, Math.max(0, limit - 1))}…`
}

export function buildThreadDbSort(sort: CommunityThreadSort): Record<string, SortOrder> {
  if (sort === "official") {
    return { isPinned: -1, isOfficialThread: -1, latestActivityAt: -1, createdAt: -1 }
  }
  if (sort === "active") {
    return { latestActivityAt: -1, createdAt: -1 }
  }
  if (sort === "popular") {
    return { likesCount: -1, commentsCount: -1, latestActivityAt: -1, createdAt: -1 }
  }
  return { isPinned: -1, latestActivityAt: -1, createdAt: -1 }
}

export function computeThreadPopularityScore(item: {
  likes?: number
  comments?: number
  createdAt?: string | Date | null
  latestActivityAt?: string | Date | null
}) {
  const likes = Number(item.likes || 0)
  const comments = Number(item.comments || 0)
  const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : 0
  const latestActivityAt = item.latestActivityAt ? new Date(item.latestActivityAt).getTime() : createdAt
  const freshness = latestActivityAt > 0 ? Math.max(0, Date.now() - latestActivityAt) : Number.MAX_SAFE_INTEGER
  const recencyBonus = freshness < 1000 * 60 * 60 * 6 ? 12 : freshness < 1000 * 60 * 60 * 24 ? 6 : freshness < 1000 * 60 * 60 * 72 ? 3 : 0
  return likes * 2 + comments * 3 + recencyBonus + (createdAt === latestActivityAt ? 1 : 0)
}

export function buildThreadDuplicateKey(input: {
  matchId: string
  title: string
  content: string
  category: string
}) {
  return [input.matchId, input.category, input.title.trim().toLowerCase(), input.content.trim().toLowerCase()].join("::")
}

export function buildThreadActionPermissions(input: {
  viewerId?: string | null
  authorId?: string | null
  canModerate?: boolean
  isDeleted?: boolean
}) {
  const viewerId = String(input.viewerId || "")
  const authorId = String(input.authorId || "")
  const isOwner = Boolean(viewerId && authorId && viewerId === authorId)
  const canModerate = Boolean(input.canModerate)
  const isDeleted = Boolean(input.isDeleted)

  return {
    isOwner,
    canEdit: !isDeleted && (isOwner || canModerate),
    canDelete: !isDeleted && (isOwner || canModerate),
    canReport: !isDeleted && Boolean(viewerId) && !isOwner,
    canPin: !isDeleted && canModerate,
    canToggleOfficial: !isDeleted && canModerate,
    canHide: !isDeleted && canModerate,
    canCopyLink: !isDeleted,
  }
}

export function isAiSafeThreadSource(item: {
  status?: string | null
  moderation?: { status?: string | null } | null
  isDeleted?: boolean | null
  isHidden?: boolean | null
}) {
  const moderationStatus = item?.moderation?.status || "approved"
  return item?.status === "published" && moderationStatus === "approved" && !item?.isDeleted && !item?.isHidden
}

export function isAiSafeCommunityCommentSource(item: {
  isApproved?: boolean | null
  moderation?: { status?: string | null } | null
  isDeleted?: boolean | null
  isHidden?: boolean | null
}) {
  const moderationStatus = item?.moderation?.status || "approved"
  return Boolean(item?.isApproved) && moderationStatus === "approved" && !item?.isDeleted && !item?.isHidden
}

export function mapAiSafeThreadSource(item: {
  id?: string
  title?: string
  content?: string
  threadCategory?: string
  commentsCount?: number
  likesCount?: number
  latestActivityAt?: string | Date | null
}) {
  return {
    id: String(item.id || ""),
    title: String(item.title || "").slice(0, 180),
    content: String(item.content || "").slice(0, 1200),
    threadCategory: String(item.threadCategory || "general"),
    commentsCount: Number(item.commentsCount || 0),
    likesCount: Number(item.likesCount || 0),
    latestActivityAt: item.latestActivityAt || null,
  }
}
