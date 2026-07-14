import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { Conversation, DirectMessage, FriendRequest } from "@/lib/server/models"

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)

    const [pendingFriendRequests, conversations] = await Promise.all([
      FriendRequest.countDocuments({ recipient: user._id, status: "pending" }),
      Conversation.find({ members: user._id }).select("_id"),
    ])

    const unreadMessages =
      conversations.length > 0
        ? await DirectMessage.countDocuments({
            conversation: { $in: conversations.map((item: any) => item._id) },
            sender: { $ne: user._id },
            readBy: { $ne: user._id },
          })
        : 0

    return ok({
      pendingFriendRequests,
      unreadMessages,
      total: pendingFriendRequests + unreadMessages,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load notifications"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
