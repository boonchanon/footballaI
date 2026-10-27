import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { mapSocialUser, toPlainId } from "@/lib/server/community-social"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { Conversation, FriendRequest, Friendship, User } from "@/lib/server/models"

const PAGE_SIZE = 20

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// Everyone in the community (newest first), or those whose name matches ?q, with how the viewer
// is connected to each: mutual follow (can chat), following, follower, or none.
export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    const viewer = await requireAuthUser(request)
    const viewerId = toPlainId(viewer._id)
    const params = request.nextUrl.searchParams
    const q = String(params.get("q") || "").trim().slice(0, 60)
    const skip = Math.max(0, Number(params.get("skip") || 0) || 0)

    const filter: Record<string, unknown> = { _id: { $ne: viewer._id } }
    if (q) {
      const pattern = new RegExp(escapeRegExp(q), "i")
      // Older accounts keep their display name in `username`.
      filter.$or = [{ name: pattern }, { username: pattern }]
    }

    const found = await User.find(filter)
      // `username` is not in the current schema; the app-wide strictQuery would drop it from the filter.
      .setOptions({ strictQuery: false })
      .select("name username avatar favoriteTeam bio createdAt")
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(PAGE_SIZE + 1)
      .lean<Array<Record<string, any>>>()
    const page = found.slice(0, PAGE_SIZE)
    const ids = page.map((user) => user._id)

    const [friendships, outgoing, incoming, conversations] = await Promise.all([
      Friendship.find({ users: viewerId }).select("users").lean<Array<{ users: unknown[] }>>(),
      FriendRequest.find({ requester: viewer._id, recipient: { $in: ids }, status: "pending" }).select("recipient").lean<Array<{ recipient: unknown }>>(),
      FriendRequest.find({ requester: { $in: ids }, recipient: viewer._id, status: "pending" }).select("requester").lean<Array<{ _id: unknown; requester: unknown }>>(),
      Conversation.find({ members: viewer._id }).select("members").lean<Array<{ _id: unknown; members: unknown[] }>>(),
    ])
    const mutualIds = new Set(friendships.flatMap((item) => item.users.map((id) => toPlainId(id))).filter((id) => id !== viewerId))
    const followingIds = new Set(outgoing.map((item) => toPlainId(item.recipient)))
    const followerRequest = new Map(incoming.map((item) => [toPlainId(item.requester), toPlainId(item._id)]))
    const conversationWith = new Map<string, string>()
    for (const conversation of conversations) {
      for (const member of conversation.members) {
        const memberId = toPlainId(member)
        if (memberId !== viewerId) conversationWith.set(memberId, toPlainId(conversation._id))
      }
    }

    return ok({
      items: page.map((user) => {
        const id = toPlainId(user._id)
        const status = mutualIds.has(id) ? "mutual" : followingIds.has(id) ? "following" : followerRequest.has(id) ? "follower" : "none"
        return {
          ...mapSocialUser(user),
          status,
          requestId: followerRequest.get(id) || null,
          conversationId: status === "mutual" ? conversationWith.get(id) || null : null,
        }
      }),
      hasMore: found.length > PAGE_SIZE,
      nextSkip: skip + page.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load people"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
