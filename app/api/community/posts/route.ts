import { NextRequest } from "next/server"

import { getAuthUser, requireAuthUser } from "@/lib/server/auth"
import { mapCommunityPost } from "@/lib/server/community"
import { getLegacyLikeState } from "@/lib/server/community-admin"
import { createCommunityNotification } from "@/lib/server/community-notifications"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok, parsePagination } from "@/lib/server/http"
import { CommunityPost, PostLike } from "@/lib/server/models"

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    const viewer = await getAuthUser(request)
    const searchParams = request.nextUrl.searchParams
    const { page, limit, skip } = parsePagination(searchParams)
    const filter: Record<string, unknown> = {}

    const category = searchParams.get("category")
    const status = searchParams.get("status")
    const mine = searchParams.get("mine")
    const q = searchParams.get("q")

    if (category && category !== "all") filter.category = category
    if (status && status !== "all") filter.status = status
    if (mine === "true" && viewer) filter.author = viewer._id
    if (!viewer || viewer.role !== "admin") filter.status = "published"
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { content: { $regex: q, $options: "i" } },
      ]
    }

    const [posts, total, stats] = await Promise.all([
      CommunityPost.find(filter).populate("author", "name avatar favoriteTeam role").sort({ isPinned: -1, createdAt: -1 }).skip(skip).limit(limit),
      CommunityPost.countDocuments(filter),
      Promise.all([
        CommunityPost.countDocuments({ status: "published" }),
        CommunityPost.countDocuments({ status: "flagged" }),
        CommunityPost.countDocuments({ status: "hidden" }),
      ]),
    ])

    const likedPostIds =
      viewer && posts.length > 0
        ? new Set(
            (await PostLike.find({ user: viewer._id, post: { $in: posts.map((post: any) => post._id) } }).select("post")).map((item: any) =>
              item.post.toString(),
            ),
          )
        : new Set<string>()

    return ok({
      items: posts.map((post: any) => {
        const legacyLiked = viewer ? getLegacyLikeState(post, viewer._id.toString()) : false
        const likedSet = legacyLiked && !likedPostIds.has(post._id.toString()) ? new Set([...likedPostIds, post._id.toString()]) : likedPostIds
        return mapCommunityPost(post, viewer, likedSet)
      }),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: { total, published: stats[0], flagged: stats[1], hidden: stats[2] },
    })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Failed to load posts", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const body = await request.json()
    const title = String(body.title || "").trim()
    const content = String(body.content || "").trim()
    const category = String(body.category || "general")
    const images = Array.isArray(body.images)
      ? body.images.filter((item: unknown) => typeof item === "string").map((item: string) => item.trim()).filter(Boolean).slice(0, 4)
      : []
    const videos = Array.isArray(body.videos)
      ? body.videos.filter((item: unknown) => typeof item === "string").map((item: string) => item.trim()).filter(Boolean).slice(0, 1)
      : []
    const visibility = body.visibility === "friends" ? "friends" : "public"
    const poll =
      body.poll && typeof body.poll === "object"
        ? {
            question: String(body.poll.question || "").trim(),
            options: Array.isArray(body.poll.options)
              ? body.poll.options
                  .map((item: unknown, index: number) => ({
                    id:
                      item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string"
                        ? String((item as { id: string }).id).trim()
                        : `option-${index + 1}`,
                    text:
                      item && typeof item === "object" && typeof (item as { text?: unknown }).text === "string"
                        ? String((item as { text: string }).text).trim()
                        : "",
                  }))
                  .filter((item: { text: string }) => item.text)
                  .slice(0, 4)
              : [],
          }
        : null
    const sharedItem =
      body.sharedItem && typeof body.sharedItem === "object"
        ? {
            type: String(body.sharedItem.type || "").trim(),
            title: String(body.sharedItem.title || "").trim(),
            url: String(body.sharedItem.url || "").trim(),
            image: String(body.sharedItem.image || "").trim(),
            source: String(body.sharedItem.source || "").trim(),
            postId: String(body.sharedItem.postId || "").trim(),
          }
        : null

    if (title.length < 4 || title.length > 180 || content.length < 8 || content.length > 5000) {
      return errorResponse("Validation failed", 422)
    }
    if (videos.length > 1) {
      return errorResponse("You can attach up to 1 video", 422)
    }

    const normalizedPoll =
      poll?.question && poll.options.length >= 2
        ? {
            question: poll.question,
            options: poll.options.map((option) => ({ ...option, votes: 0 })),
            totalVotes: 0,
          }
        : null

    if (poll && (poll.question || poll.options.length > 0) && !normalizedPoll) {
      return errorResponse("Poll needs a question and at least 2 options", 422)
    }

    const normalizedSharedItem = sharedItem?.type && sharedItem?.title ? sharedItem : null
    if (normalizedSharedItem?.type === "post" && normalizedSharedItem.postId) {
      const existingRepost = await CommunityPost.findOne({
        author: user._id,
        "sharedItem.type": "post",
        "sharedItem.postId": normalizedSharedItem.postId,
        status: { $ne: "hidden" },
      }).select("_id")

      if (existingRepost) {
        return errorResponse("You already reposted this post", 409)
      }
    }

    const post = await CommunityPost.create({
      author: user._id,
      title,
      content,
      category,
      images,
      videos,
      visibility,
      poll: normalizedPoll || undefined,
      sharedItem: normalizedSharedItem || undefined,
    })

    if (normalizedSharedItem?.type === "post" && normalizedSharedItem.postId) {
      await CommunityPost.findByIdAndUpdate(normalizedSharedItem.postId, { $inc: { repostsCount: 1 } })
      const originalPost = await CommunityPost.findById(normalizedSharedItem.postId).select("author")
      if (originalPost?.author) {
        await createCommunityNotification({
          recipientId: originalPost.author.toString(),
          actorId: user._id.toString(),
          postId: normalizedSharedItem.postId,
          type: "post_repost",
        })
      }
    }

    const populated = await CommunityPost.findById(post._id).populate("author", "name avatar favoriteTeam role")
    return ok({ item: mapCommunityPost(populated, user) }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create post"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
