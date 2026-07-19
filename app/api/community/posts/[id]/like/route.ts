import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { createCommunityNotification } from "@/lib/server/community-notifications"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { CommunityPost, PostLike } from "@/lib/server/models"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const { id } = await params
    const post = await CommunityPost.findById(id)
    if (!post) return errorResponse("Post not found", 404)

    const existingLike = await PostLike.findOne({ post: post._id, user: user._id })
    const userId = user._id.toString()
    const likedBy = Array.isArray(post.likedBy) ? post.likedBy.map((item: any) => item?.toString?.() || String(item)) : []
    let liked = false

    if (existingLike) {
      await existingLike.deleteOne()
      post.likesCount = Math.max(0, Number(post.likesCount || 0) - 1)
      if (typeof post.likes === "number") {
        post.likes = Math.max(0, Number(post.likes || 0) - 1)
      }
      if (Array.isArray(post.likedBy)) {
        post.likedBy = likedBy.filter((item: string) => item !== userId)
      }
    } else {
      await PostLike.create({ post: post._id, user: user._id })
      post.likesCount = Math.max(Number(post.likesCount || 0), Number(post.likes || 0), likedBy.length) + 1
      if (typeof post.likes === "number") {
        post.likes = Math.max(Number(post.likes || 0), likedBy.length) + 1
      }
      if (Array.isArray(post.likedBy) && !likedBy.includes(userId)) {
        post.likedBy = [...likedBy, userId]
      }
      await createCommunityNotification({
        recipientId: post.author.toString(),
        actorId: user._id.toString(),
        postId: post._id.toString(),
        type: "post_like",
      })
      liked = true
    }

    await post.save()

    return ok({
      liked,
      likes: Math.max(Number(post.likesCount || 0), Number(post.likes || 0), Array.isArray(post.likedBy) ? post.likedBy.length : 0),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to like post"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
