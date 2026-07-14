import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { mapConversation, mapFriendRequest, mapSocialUser, toPlainId } from "@/lib/server/community-social"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { Conversation, DirectMessage, FriendRequest, Friendship, User } from "@/lib/server/models"

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const userId = toPlainId(user._id)

    const [incomingRequests, outgoingRequests, friendships, conversations, suggestions] = await Promise.all([
      FriendRequest.find({ recipient: user._id, status: "pending" }).populate("requester", "name avatar favoriteTeam bio").sort({ createdAt: -1 }).limit(8),
      FriendRequest.find({ requester: user._id, status: "pending" }).populate("recipient", "name avatar favoriteTeam bio").sort({ createdAt: -1 }).limit(8),
      Friendship.find({ users: user._id }).populate("users", "name avatar favoriteTeam bio").sort({ updatedAt: -1 }).limit(12),
      Conversation.find({ members: user._id }).populate("members", "name avatar favoriteTeam bio").sort({ lastMessageAt: -1, updatedAt: -1 }).limit(12),
      User.find({ _id: { $ne: user._id } }).select("name avatar favoriteTeam bio").sort({ createdAt: -1 }).limit(16),
    ])

    const pendingUserIds = new Set<string>()
    for (const item of [...incomingRequests, ...outgoingRequests]) {
      pendingUserIds.add(toPlainId(item.requester?._id || item.requester))
      pendingUserIds.add(toPlainId(item.recipient?._id || item.recipient))
    }

    const friendUserIds = new Set<string>()
    const friendItems = friendships
      .map((item: any) => {
        const counterpart = Array.isArray(item.users) ? item.users.find((member: any) => toPlainId(member?._id || member) !== userId) : null
        if (!counterpart) return null
        friendUserIds.add(toPlainId(counterpart._id))
        return { id: toPlainId(item._id), user: mapSocialUser(counterpart) }
      })
      .filter(Boolean)

    const latestMessages =
      conversations.length > 0
        ? await DirectMessage.find({ conversation: { $in: conversations.map((item: any) => item._id) } })
            .populate("sender", "name avatar favoriteTeam bio")
            .sort({ createdAt: -1 })
            .limit(80)
        : []

    const latestMessageMap = new Map<string, any>()
    for (const message of latestMessages) {
      const key = toPlainId(message.conversation)
      if (!latestMessageMap.has(key)) latestMessageMap.set(key, message)
    }

    const unreadCounts =
      conversations.length > 0
        ? await DirectMessage.aggregate([
            {
              $match: {
                conversation: { $in: conversations.map((item: any) => item._id) },
                sender: { $ne: user._id },
                readBy: { $ne: user._id },
              },
            },
            {
              $group: {
                _id: "$conversation",
                count: { $sum: 1 },
              },
            },
          ])
        : []

    const unreadMap = new Map<string, number>(
      unreadCounts.map((item: any) => [toPlainId(item._id), Number(item.count || 0)]),
    )

    return ok({
      friends: friendItems,
      requests: {
        incoming: incomingRequests.map((item: any) => mapFriendRequest(item, userId)),
        outgoing: outgoingRequests.map((item: any) => mapFriendRequest(item, userId)),
      },
      suggestions: suggestions
        .filter((candidate: any) => {
          const candidateId = toPlainId(candidate._id)
          return candidateId !== userId && !friendUserIds.has(candidateId) && !pendingUserIds.has(candidateId)
        })
        .slice(0, 6)
        .map((candidate: any) => mapSocialUser(candidate)),
      conversations: conversations.map((item: any) => {
        const key = toPlainId(item._id)
        const latestMessage = latestMessageMap.get(key)
        const unreadCount = unreadMap.get(key) || 0
        return {
          ...mapConversation(item, userId),
          unreadCount,
          hasUnread: unreadCount > 0,
          preview: latestMessage
            ? {
                id: toPlainId(latestMessage._id),
                content: latestMessage.content,
                sender: mapSocialUser(latestMessage.sender),
              }
            : null,
        }
      }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load social overview"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
