import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, getTimeAgoThai, ok } from "@/lib/server/http"
import { Comment, CommunityPost } from "@/lib/server/models"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const { id } = await params
    const body = await request.json()
    const content = String(body.content || "").trim()

    if (!content || content.length > 1000) {
      return errorResponse("Validation failed", 422)
    }

    const post = await CommunityPost.findById(id)
    if (!post) return errorResponse("Post not found", 404)

    const comment = await Comment.create({
      user: user._id,
      targetType: "post",
      targetId: post._id.toString(),
      content,
    })

    post.commentsCount += 1
    await post.save()

    const populated = await comment.populate("user", "name avatar favoriteTeam")
    return ok(
      {
        item: {
          id: populated._id.toString(),
          content: populated.content,
          createdAt: populated.createdAt,
          timeAgo: getTimeAgoThai(populated.createdAt),
          user: {
            id: populated.user?._id?.toString?.() || "",
            name: populated.user?.name || "ผู้ใช้งาน",
            avatar: populated.user?.avatar || "",
          },
        },
        commentsCount: post.commentsCount,
      },
      { status: 201 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to comment"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
