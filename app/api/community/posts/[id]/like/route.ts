import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
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
    let liked = false

    if (existingLike) {
      await existingLike.deleteOne()
      post.likesCount = Math.max(0, post.likesCount - 1)
    } else {
      await PostLike.create({ post: post._id, user: user._id })
      post.likesCount += 1
      liked = true
    }

    await post.save()
    return ok({ liked, likes: post.likesCount })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to like post"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
