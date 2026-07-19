import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { createCommunityNotification } from "@/lib/server/community-notifications"
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

    const nextComments = Math.max(Number(post.commentsCount || 0), Array.isArray(post.comments) ? post.comments.length : 0) + 1
    post.commentsCount = nextComments
    if (Array.isArray(post.comments)) {
      post.comments = [
        ...post.comments,
        {
          user: user._id,
          content,
          createdAt: comment.createdAt,
        },
      ]
    }
    await post.save()
    await createCommunityNotification({
      recipientId: post.author.toString(),
      actorId: user._id.toString(),
      postId: post._id.toString(),
      type: "post_comment",
      commentId: comment._id.toString(),
    })

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
            name: populated.user?.name || "?????????",
            avatar: populated.user?.avatar || "",
          },
        },
        commentsCount: nextComments,
      },
      { status: 201 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to comment"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
