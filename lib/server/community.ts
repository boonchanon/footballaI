import { isApprovedModeration } from "./content-moderation"
import { mapAdminCommunityPost as mapCommunityPost, mapCommunityPostWithMedia } from "./community-admin"

export { mapCommunityPost, mapCommunityPostWithMedia }

function toPlainId(value: unknown) {
  if (!value) return ""
  if (typeof value === "string") return value
  return (value as { toString?: () => string }).toString?.() || ""
}

export function isModeratedContentPublished(item: {
  status?: string | null
  moderation?: { status?: string | null } | null
}) {
  return item?.status === "published" && isApprovedModeration(item?.moderation?.status)
}

export function isModeratedContentPending(item: {
  moderation?: { status?: string | null } | null
}) {
  return item?.moderation?.status === "pending_review"
}

export function canViewerSeeModeratedContent(
  item: {
    status?: string | null
    author?: { _id?: unknown } | unknown
    moderation?: { status?: string | null } | null
  } | null | undefined,
  viewer?: { _id?: unknown; role?: string } | null,
) {
  if (!item) return false
  if (viewer?.role === "admin") return true
  if (isModeratedContentPublished(item)) return true

  const authorId = toPlainId((item.author as { _id?: unknown } | undefined)?._id || item.author)
  const viewerId = toPlainId(viewer?._id)
  return Boolean(viewerId && authorId === viewerId && isModeratedContentPending(item))
}

export function buildPublicModeratedContentFilter() {
  return {
    status: "published",
    $or: [{ "moderation.status": { $exists: false } }, { "moderation.status": null }, { "moderation.status": "approved" }],
  }
}

export function buildViewerVisibleModeratedContentFilter(viewerId?: string | null) {
  const publicFilter = buildPublicModeratedContentFilter()
  if (!viewerId) return publicFilter

  return {
    $or: [publicFilter, { author: viewerId, "moderation.status": "pending_review" }],
  }
}

export function buildCommunityFeedIsolationFilter() {
  return {
    isThreadRoot: { $ne: true },
    isRoomMessage: { $ne: true },
    contentType: { $nin: ["room_message", "thread_root", "match_poll"] },
  }
}

export function isApprovedCommentVisible(comment: {
  isApproved?: boolean | null
  isDeleted?: boolean | null
  isHidden?: boolean | null
  moderation?: { status?: string | null } | null
}) {
  return Boolean(comment?.isApproved) && !comment?.isDeleted && !comment?.isHidden && isApprovedModeration(comment?.moderation?.status)
}
