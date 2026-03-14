import { getTimeAgoThai } from "./http"

const categoryLabels: Record<string, string> = {
  "match-discussion": "วิเคราะห์แมตช์",
  "transfer-rumors": "ข่าวย้ายทีม",
  "player-discussion": "พูดคุยนักเตะ",
  predictions: "ทายผล",
  general: "ทั่วไป",
}

export function mapCommunityPost(post: any, viewer?: any, likedPostIds = new Set<string>()) {
  const id = post._id.toString()

  return {
    id,
    title: post.title,
    excerpt: post.content.length > 220 ? `${post.content.slice(0, 220)}...` : post.content,
    content: post.content,
    category: post.category,
    categoryLabel: categoryLabels[post.category] || "ทั่วไป",
    status: post.status,
    isPinned: post.isPinned,
    isHot: post.likesCount >= 20 || post.commentsCount >= 10,
    likes: post.likesCount,
    comments: post.commentsCount,
    views: post.viewsCount,
    reports: post.reportsCount,
    timeAgo: getTimeAgoThai(post.createdAt),
    createdAt: post.createdAt,
    author: {
      id: post.author?._id?.toString?.() || "",
      name: post.author?.name || "ผู้ใช้งาน",
      avatar: post.author?.avatar || "",
      favoriteTeam: post.author?.favoriteTeam || "",
      role: post.author?.role || "user",
    },
    isLiked: viewer ? likedPostIds.has(id) : false,
    canModerate: viewer?.role === "admin",
  }
}
