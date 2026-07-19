import { canManageCommunityAdmin } from "@/lib/admin-access"

import { getTimeAgoThai } from "./http-utils"

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
    excerpt: post.content.length > 220 ? `${post.content.slice(0, 220)}...` : post.content,
    content: post.content,
    category: post.category,
    categoryLabel: categoryLabels[post.category] || "ทั่วไป",
    status: post.status,
    isPinned: post.isPinned,
    isHot: likes >= 20 || comments >= 10,
    likes,
    reposts,
    comments,
    views,
    reports,
    images: Array.isArray(post.images) ? post.images.filter((item: unknown) => typeof item === "string" && item.trim()) : [],
    videos: Array.isArray(post.videos) ? post.videos.filter((item: unknown) => typeof item === "string" && item.trim()) : [],
    visibility: typeof post.visibility === "string" ? post.visibility : "public",
    visibilityLabel: visibilityLabels[post.visibility] || "Public",
    poll:
      post.poll && typeof post.poll === "object"
        ? {
            question: typeof post.poll.question === "string" ? post.poll.question : "",
            totalVotes: typeof post.poll.totalVotes === "number" ? post.poll.totalVotes : 0,
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
    author: {
      id: post.author?._id?.toString?.() || "",
      name: post.author?.name || "ผู้ใช้งาน",
      avatar: post.author?.avatar || "",
      favoriteTeam: post.author?.favoriteTeam || "",
      role: post.author?.role || "user",
    },
    canModerate: canManageCommunityAdmin(viewer?.role),
  }
}

export function getLegacyLikeState(post: any, userId?: string | null) {
  const likedBy = Array.isArray(post?.likedBy) ? post.likedBy.map((item: any) => item?.toString?.() || String(item)) : []
  return userId ? likedBy.includes(userId) : false
}

export function getLegacyComments(post: any) {
  return Array.isArray(post?.comments) ? post.comments : []
}
