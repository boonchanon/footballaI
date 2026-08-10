import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { sortUserIds, toPlainId } from "@/lib/server/community-social"
import { assertCommunityInteractionAllowed } from "@/lib/server/content-moderation"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { Conversation, FriendRequest, Friendship } from "@/lib/server/models"

export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    await assertCommunityInteractionAllowed(user._id.toString(), "friend_action")
    const body = await request.json()
    const action = String(body.action || "request")
    const targetUserId = String(body.targetUserId || "")
    const requestId = String(body.requestId || "")

    if (action === "request") {
      if (!targetUserId || targetUserId === toPlainId(user._id)) {
        return errorResponse("Invalid target user", 422)
      }

      const friendshipKey = sortUserIds([user._id, targetUserId])
      const existingFriendship = await Friendship.findOne({ users: friendshipKey })
      if (existingFriendship) {
        return errorResponse("Already friends", 409)
      }

      const existingRequest = await FriendRequest.findOne({
        $or: [
          { requester: user._id, recipient: targetUserId },
          { requester: targetUserId, recipient: user._id },
        ],
        status: "pending",
      })

      if (existingRequest) {
        return errorResponse("Friend request already exists", 409)
      }

      const created = await FriendRequest.create({
        requester: user._id,
        recipient: targetUserId,
      })

      return ok({ item: { id: toPlainId(created._id), status: created.status } }, { status: 201 })
    }

    if (action === "accept" || action === "decline") {
      if (!requestId) return errorResponse("Request id is required", 422)

      const friendRequest = await FriendRequest.findById(requestId)
      if (!friendRequest) return errorResponse("Friend request not found", 404)
      if (toPlainId(friendRequest.recipient) !== toPlainId(user._id)) return errorResponse("Permission denied", 403)
      if (friendRequest.status !== "pending") return errorResponse("Friend request already handled", 409)

      if (action === "decline") {
        friendRequest.status = "declined"
        await friendRequest.save()
        return ok({ success: true })
      }

      friendRequest.status = "accepted"
      await friendRequest.save()

      const users = sortUserIds([friendRequest.requester, friendRequest.recipient])
      await Friendship.updateOne({ users }, { $setOnInsert: { users } }, { upsert: true })
      await Conversation.updateOne(
        { members: users },
        { $setOnInsert: { members: users, lastMessageText: "", lastMessageAt: new Date() } },
        { upsert: true },
      )

      return ok({ success: true })
    }

    return errorResponse("Unsupported action", 422)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update friendship"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
