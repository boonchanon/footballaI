import { NextRequest } from "next/server"

import { requireAdminRoles } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, getTimeAgoThai, ok, parsePagination } from "@/lib/server/http"
import { CommunityPost, CommunityStory } from "@/lib/server/models"

const CONTENT_TYPES = new Set(["posts", "threads", "polls", "stories"])

function mapPost(post: any) {
  return {
    id: post._id.toString(),
    title: post.poll?.question || post.title || "",
    content: post.content || "",
    contentType: post.contentType || "community_post",
    status: post.status || "published",
    moderationStatus: post.moderation?.status || "approved",
    isPinned: Boolean(post.isPinned),
    isOfficialThread: Boolean(post.isOfficialThread),
    threadCategory: post.threadCategory || "",
    reportsCount: Number(post.reportsCount || 0),
    matchId: post.matchId || "",
    roomType: post.roomType || "",
    poll: post.poll?.question
      ? {
          question: post.poll.question,
          totalVotes: Number(post.poll.totalVotes || 0),
          options: Array.isArray(post.poll.options) ? post.poll.options.map((option: any) => ({ id: option.id, text: option.text, votes: Number(option.votes || 0) })) : [],
        }
      : null,
    author: {
      id: post.author?._id?.toString?.() || "",
      name: post.author?.name || "ผู้ใช้งาน",
      avatar: post.author?.avatar || "",
    },
    createdAt: post.createdAt,
    timeAgo: getTimeAgoThai(post.createdAt),
  }
}

function mapStory(story: any) {
  return {
    id: story._id.toString(),
    title: story.caption || "Story",
    content: story.caption || "",
    contentType: "story",
    status: story.status || "published",
    moderationStatus: story.moderation?.status || "approved",
    image: story.image || "",
    reportsCount: 0,
    author: {
      id: story.author?._id?.toString?.() || "",
      name: story.author?.name || "ผู้ใช้งาน",
      avatar: story.author?.avatar || "",
    },
    createdAt: story.createdAt,
    expiresAt: story.expiresAt || null,
    timeAgo: getTimeAgoThai(story.createdAt),
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    await requireAdminRoles(request, ["superadmin", "admincommunity"])
    const searchParams = request.nextUrl.searchParams
    const type = String(searchParams.get("type") || "posts").trim()
    const status = String(searchParams.get("status") || "all").trim()
    const q = String(searchParams.get("q") || "").trim()
    const { page, limit, skip } = parsePagination(searchParams)

    if (!CONTENT_TYPES.has(type)) return errorResponse("Invalid content type", 422)

    if (type === "stories") {
      const filter: Record<string, unknown> = {}
      if (status !== "all") filter.status = status
      if (q) filter.caption = { $regex: q, $options: "i" }
      const [items, total] = await Promise.all([
        CommunityStory.find(filter).populate("author", "name avatar").sort({ createdAt: -1 }).skip(skip).limit(limit),
        CommunityStory.countDocuments(filter),
      ])
      return ok({ items: items.map(mapStory), pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } })
    }

    const filter: Record<string, unknown> = {}
    if (type === "posts") {
      filter.contentType = "community_post"
      filter.isThreadRoot = { $ne: true }
      filter.isRoomMessage = { $ne: true }
    }
    if (type === "threads") {
      filter.contentType = "thread_root"
      filter.isThreadRoot = true
    }
    if (type === "polls") {
      filter.contentType = "match_poll"
      filter["poll.question"] = { $ne: "" }
    }
    if (status !== "all") filter.status = status
    if (q) filter.$or = [{ title: { $regex: q, $options: "i" } }, { content: { $regex: q, $options: "i" } }, { "poll.question": { $regex: q, $options: "i" } }]

    const [items, total] = await Promise.all([
      CommunityPost.find(filter).populate("author", "name avatar").sort({ isPinned: -1, latestActivityAt: -1, createdAt: -1 }).skip(skip).limit(limit),
      CommunityPost.countDocuments(filter),
    ])

    return ok({ items: items.map(mapPost), pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load content"
    return errorResponse(message, message === "Admin authentication required" ? 401 : message === "Admin permission denied" ? 403 : 500)
  }
}
