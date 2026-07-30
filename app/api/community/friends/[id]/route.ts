import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { buildPublicModeratedContentFilter } from "@/lib/server/community"
import { mapAdminCommunityPost } from "@/lib/server/community-admin"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { CommunityPost, FriendRequest, Friendship, User } from "@/lib/server/models"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    const viewer = await requireAuthUser(request)
    const { id } = await context.params

    const [targetUser, friendship, pendingRequest, posts] = await Promise.all([
      User.findById(id).select("name avatar favoriteTeam bio createdAt"),
      Friendship.findOne({ users: { $all: [viewer._id, id] } }),
      FriendRequest.findOne({
        $or: [
          { requester: viewer._id, recipient: id, status: "pending" },
          { requester: id, recipient: viewer._id, status: "pending" },
        ],
      }),
      CommunityPost.find({ author: id, ...buildPublicModeratedContentFilter() })
        .populate("author", "name avatar favoriteTeam role")
        .sort({ createdAt: -1 })
        .limit(8),
    ])

    if (!targetUser) return errorResponse("User not found", 404)

    return ok({
      profile: {
        id: targetUser._id.toString(),
        name: targetUser.name || "ผู้ใช้งาน",
        avatar: targetUser.avatar || "",
        favoriteTeam: targetUser.favoriteTeam || "",
        bio: targetUser.bio || "",
        joinedAt: targetUser.createdAt,
      },
      relationship: {
        isSelf: viewer._id.toString() === id,
        isFriend: Boolean(friendship),
        hasPendingRequest: Boolean(pendingRequest),
        requestDirection: pendingRequest
          ? pendingRequest.requester.toString() === viewer._id.toString()
            ? "outgoing"
            : "incoming"
          : null,
        requestId: pendingRequest?._id?.toString?.() || null,
      },
      posts: posts.map((post: any) => mapAdminCommunityPost(post, viewer)),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load friend profile"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
