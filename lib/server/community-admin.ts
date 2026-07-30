import { canManageCommunityAdmin } from "@/lib/admin-access"

import { buildThreadExcerpt, getCommunityThreadCategoryLabel } from "./community-threads"
import { mapFanProfile } from "./community-fan-profile"
import { getTimeAgoThai } from "./http-utils"
import { CommunityMedia } from "./models"

const categoryLabels: Record<string, string> = {
  "match-discussion": "วิเคราะห์แมตช์",
  "transfer-rumors": "ข่าวย้ายทีม",
  "player-discussion": "พูดคุยนักเตะ",
  predictions: "ทายผล",
  general: "ทั่วไป",
}

const visibilityLabels: Record<string, string> = {
  public: "Public",
  friends: "Friends",
}

function getCountValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (Array.isArray(value)) return value.length
  return 0
}

function getLikes(post: any) {
  return Math.max(getCountValue(post.likesCount), getCountValue(post.likes), getCountValue(post.likedBy))
}

function getComments(post: any) {
  return Math.max(getCountValue(post.commentsCount), getCountValue(post.comments))
}

function getReposts(post: any) {
  return getCountValue(post.repostsCount)
}

function getViews(post: any) {
  return Math.max(getCountValue(post.viewsCount), getCountValue(post.views))
}

function getReports(post: any) {
  return Math.max(getCountValue(post.reportsCount), getCountValue(post.reports))
}

export function mapAdminCommunityPost(post: any, viewer?: any) {
  const id = post._id.toString()
  const likes = getLikes(post)
  const comments = getComments(post)
  const reposts = getReposts(post)
  const views = getViews(post)
  const reports = getReports(post)

  return {
    id,
    title: post.title,
    excerpt: buildThreadExcerpt(post.content, 220),
    content: post.content,
    category: post.category,
    categoryLabel: categoryLabels[post.category] || "ทั่วไป",
    status: post.status,
    moderationStatus: post.moderation?.status || "approved",
    isPinned: post.isPinned,
    isThreadRoot: Boolean(post.isThreadRoot),
    threadCategory: typeof post.threadCategory === "string" ? post.threadCategory : "",
    threadCategoryLabel: getCommunityThreadCategoryLabel(typeof post.threadCategory === "string" ? post.threadCategory : ""),
    isOfficialThread: Boolean(post.isOfficialThread),
    latestActivityAt: post.latestActivityAt || post.updatedAt || post.createdAt,
    latestActivityTimeAgo: getTimeAgoThai(post.latestActivityAt || post.updatedAt || post.createdAt),
    isHot: likes >= 20 || comments >= 10,
    likes,
    reposts,
    comments,
    views,
    reports,
    tags: Array.isArray(post.tags) ? post.tags.filter((item: unknown) => typeof item === "string" && item.trim()) : [],
    teamIds: Array.isArray(post.teamIds) ? post.teamIds.filter((item: unknown) => typeof item === "string" && item.trim()) : [],
    playerIds: Array.isArray(post.playerIds) ? post.playerIds.filter((item: unknown) => typeof item === "string" && item.trim()) : [],
    matchId: typeof post.matchId === "string" ? post.matchId : "",
    matchContext:
      post.matchContext && typeof post.matchContext === "object"
        ? {
            homeTeam: typeof post.matchContext.homeTeam === "string" ? post.matchContext.homeTeam : "",
            awayTeam: typeof post.matchContext.awayTeam === "string" ? post.matchContext.awayTeam : "",
            homeLogo: typeof post.matchContext.homeLogo === "string" ? post.matchContext.homeLogo : "",
            awayLogo: typeof post.matchContext.awayLogo === "string" ? post.matchContext.awayLogo : "",
            homeScore: typeof post.matchContext.homeScore === "number" ? post.matchContext.homeScore : null,
            awayScore: typeof post.matchContext.awayScore === "number" ? post.matchContext.awayScore : null,
            status: typeof post.matchContext.status === "string" ? post.matchContext.status : "",
            kickoff: typeof post.matchContext.kickoff === "string" ? post.matchContext.kickoff : "",
          }
        : null,
    images: Array.isArray(post.images) ? post.images.filter((item: unknown) => typeof item === "string" && item.trim()) : [],
    videos: Array.isArray(post.videos) ? post.videos.filter((item: unknown) => typeof item === "string" && item.trim()) : [],
    visibility: typeof post.visibility === "string" ? post.visibility : "public",
    visibilityLabel: visibilityLabels[post.visibility] || "Public",
    poll:
      post.poll && typeof post.poll === "object"
        ? {
            question: typeof post.poll.question === "string" ? post.poll.question : "",
            totalVotes: typeof post.poll.totalVotes === "number" ? post.poll.totalVotes : 0,
            viewerVote:
              viewer && Array.isArray(post.pollVotes)
                ? post.pollVotes.find((vote: any) => vote?.user?.toString?.() === viewer._id?.toString?.() || vote?.user?.toString?.() === viewer.id)?.optionId || ""
                : "",
            options: Array.isArray(post.poll.options)
              ? post.poll.options
                  .filter((item: unknown) => item && typeof item === "object")
                  .map((item: any) => ({
                    id: typeof item.id === "string" ? item.id : "",
                    text: typeof item.text === "string" ? item.text : "",
                    votes: typeof item.votes === "number" ? item.votes : 0,
                  }))
                  .filter((item: { id: string; text: string }) => item.id && item.text)
              : [],
          }
        : null,
    sharedItem:
      post.sharedItem && typeof post.sharedItem === "object"
        ? {
            type: typeof post.sharedItem.type === "string" ? post.sharedItem.type : "",
            title: typeof post.sharedItem.title === "string" ? post.sharedItem.title : "",
            url: typeof post.sharedItem.url === "string" ? post.sharedItem.url : "",
            image: typeof post.sharedItem.image === "string" ? post.sharedItem.image : "",
            source: typeof post.sharedItem.source === "string" ? post.sharedItem.source : "",
            postId: typeof post.sharedItem.postId === "string" ? post.sharedItem.postId : "",
          }
        : null,
    timeAgo: getTimeAgoThai(post.createdAt),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    lastEditedAt: post.lastEditedAt || null,
    editVersion: Number(post.editVersion || 1),
    hasPendingRevision: Boolean(post.hasPendingRevision),
    isEdited: Boolean(post.lastEditedAt),
    author: {
      id: post.author?._id?.toString?.() || "",
      name: post.author?.name || "ผู้ใช้งาน",
      avatar: post.author?.avatar || "",
      favoriteTeam: post.author?.favoriteTeam || "",
      role: post.author?.role || "user",
      fanProfile: mapFanProfile(post.author),
    },
    canModerate: canManageCommunityAdmin(viewer?.role),
    isOwner: Boolean(getViewerId(viewer) && getViewerId(viewer) === getPostAuthorId(post)),
  }
}

function getViewerId(viewer?: any) {
  return viewer?._id?.toString?.() || viewer?.id?.toString?.() || ""
}

function getPostAuthorId(post: any) {
  return post?.author?._id?.toString?.() || post?.author?.toString?.() || ""
}

function mapPostMediaRecord(media: any, options: { isOwner: boolean; order: number }) {
  const id = media._id.toString()
  const status = String(media.status || "")
  const mediaType = media.mediaType === "video" ? "video" : "image"
  const publicUrl = status === "approved" && typeof media.publicUrl === "string" && media.publicUrl.trim() ? media.publicUrl.trim() : null
  const ownerPreviewUrl =
    options.isOwner && status === "pending_review" && mediaType === "image" && typeof media.pendingKey === "string" && media.pendingKey.trim()
      ? `/api/community/media/${id}/preview`
      : null

  return {
    id,
    mediaId: id,
    type: mediaType,
    mediaType,
    status,
    url: publicUrl,
    publicUrl,
    ownerPreviewUrl,
    mimeType: typeof media.mimeType === "string" ? media.mimeType : "",
    width: Number(media.metadata?.width || 0) || null,
    height: Number(media.metadata?.height || 0) || null,
    order: options.order,
    createdAt: media.createdAt || null,
  }
}

function buildLegacyMedia(urls: string[], mediaType: "image" | "video") {
  return urls.map((url, index) => ({
    id: `legacy-${mediaType}-${index}`,
    mediaId: "",
    type: mediaType,
    mediaType,
    status: "approved",
    url,
    publicUrl: url,
    ownerPreviewUrl: null,
    mimeType: "",
    width: null,
    height: null,
    order: index,
    isLegacy: true,
    createdAt: null,
  }))
}

function normalizeMediaIds(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item || "").trim()).filter(Boolean)
}

function getSelectedPostMediaIds(post: any) {
  const attachedMedia = post?.moderation?.metadata?.attachedMedia || {}
  const metadata = post?.moderation?.metadata || {}
  return {
    imageMediaIds: normalizeMediaIds(attachedMedia.imageMediaIds).length
      ? normalizeMediaIds(attachedMedia.imageMediaIds)
      : normalizeMediaIds(metadata.imageMediaIds),
    videoMediaIds: normalizeMediaIds(attachedMedia.videoMediaIds).length
      ? normalizeMediaIds(attachedMedia.videoMediaIds)
      : normalizeMediaIds(metadata.videoMediaIds),
  }
}

function orderSelectedMedia(media: any[], selectedIds: string[]) {
  if (!selectedIds.length) return media
  const byId = new Map(media.map((item) => [item._id.toString(), item]))
  return selectedIds.map((id) => byId.get(id)).filter(Boolean)
}

export async function mapCommunityPostWithMedia(post: any, viewer?: any) {
  const mapped = mapAdminCommunityPost(post, viewer)
  const viewerId = getViewerId(viewer)
  const isOwner = Boolean(viewerId && viewerId === getPostAuthorId(post))

  const mediaRecords = await CommunityMedia.find({
    contentType: "post",
    contentId: mapped.id,
    status: { $nin: ["rejected", "failed", "hidden"] },
  }).sort({ createdAt: 1 })

  const selectedIds = getSelectedPostMediaIds(post)
  const orderedRecords = [
    ...orderSelectedMedia(
      mediaRecords.filter((media: any) => media.mediaType === "image"),
      selectedIds.imageMediaIds,
    ),
    ...orderSelectedMedia(
      mediaRecords.filter((media: any) => media.mediaType === "video"),
      selectedIds.videoMediaIds,
    ),
  ]
  const sourceRecords = selectedIds.imageMediaIds.length || selectedIds.videoMediaIds.length ? orderedRecords : mediaRecords
  const visibleMedia = sourceRecords
    .filter((media: any) => {
      const status = String(media.status || "")
      if (status === "approved") return Boolean(media.publicUrl)
      return isOwner
    })
    .map((media: any, order: number) => mapPostMediaRecord(media, { isOwner, order }))

  const imageMedia = visibleMedia.filter((media) => media.mediaType === "image")
  const videoMedia = visibleMedia.filter((media) => media.mediaType === "video")
  const approvedImages = imageMedia.map((media) => media.publicUrl).filter((url): url is string => Boolean(url))
  const approvedVideos = videoMedia.map((media) => media.publicUrl).filter((url): url is string => Boolean(url))
  const fallbackImageMedia = imageMedia.length ? imageMedia : buildLegacyMedia(mapped.images, "image")
  const fallbackVideoMedia = videoMedia.length ? videoMedia : buildLegacyMedia(mapped.videos, "video")

  return {
    ...mapped,
    media: [...fallbackImageMedia, ...fallbackVideoMedia],
    imageMedia: fallbackImageMedia,
    videoMedia: fallbackVideoMedia,
    images: approvedImages.length ? approvedImages : mapped.images,
    videos: approvedVideos.length ? approvedVideos : mapped.videos,
    pendingRevisionPreview:
      isOwner && post.pendingRevision
        ? {
            content: typeof post.pendingRevision.content === "string" ? post.pendingRevision.content : "",
            category: typeof post.pendingRevision.category === "string" ? post.pendingRevision.category : "",
            tags: Array.isArray(post.pendingRevision.tags) ? post.pendingRevision.tags.filter((item: unknown) => typeof item === "string") : [],
            imageMediaIds: Array.isArray(post.pendingRevision.imageMediaIds) ? post.pendingRevision.imageMediaIds.map((item: unknown) => String(item)) : null,
            videoMediaIds: Array.isArray(post.pendingRevision.videoMediaIds) ? post.pendingRevision.videoMediaIds.map((item: unknown) => String(item)) : null,
            status: post.pendingRevision.moderation?.status || "pending_review",
            submittedAt: post.pendingRevision.submittedAt || null,
            baseEditVersion: Number(post.pendingRevision.baseEditVersion || 1),
          }
        : null,
  }
}

export function getLegacyLikeState(post: any, userId?: string | null) {
  const likedBy = Array.isArray(post?.likedBy) ? post.likedBy.map((item: any) => item?.toString?.() || String(item)) : []
  return userId ? likedBy.includes(userId) : false
}

export function getLegacyComments(post: any) {
  return Array.isArray(post?.comments) ? post.comments : []
}
