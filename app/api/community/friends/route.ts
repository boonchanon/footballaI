import { isValidObjectId } from "mongoose"
import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { sortUserIds, toPlainId } from "@/lib/server/community-social"
import { assertCommunityInteractionAllowed } from "@/lib/server/content-moderation"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { Conversation, FriendRequest, Friendship, User } from "@/lib/server/models"

// Mutual followers are stored as a Friendship and get a conversation, so they can chat.
async function makeMutual(users: string[]) {
  await Friendship.updateOne({ users }, { $setOnInsert: { users } }, { upsert: true })
  const conversation = await Conversation.findOneAndUpdate(
    { members: users },
    { $setOnInsert: { members: users, lastMessageText: "", lastMessageAt: new Date() } },
    { upsert: true, new: true },
  )
  return toPlainId(conversation?._id)
}

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

      if (!isValidObjectId(targetUserId) || !(await User.exists({ _id: targetUserId }))) {
        return errorResponse("User not found", 404)
      }

      // A pending request is a one-way follow. Following someone who already follows you makes
      // the follow mutual: you become friends and can chat.
      const theyFollowMe = await FriendRequest.findOne({ requester: targetUserId, recipient: user._id, status: "pending" })
      if (theyFollowMe) {
        theyFollowMe.status = "accepted"
        await theyFollowMe.save()
        const conversationId = await makeMutual(friendshipKey)
        return ok({ item: { id: toPlainId(theyFollowMe._id), status: "mutual" }, mutual: true, conversationId }, { status: 201 })
      }

      const myFollow = await FriendRequest.findOne({ requester: user._id, recipient: targetUserId })
      if (myFollow?.status === "pending") return errorResponse("Already following", 409)
      // An old declined/accepted record would block a new follow on the unique index; reuse it.
      const follow = myFollow
        ? await FriendRequest.findByIdAndUpdate(myFollow._id, { $set: { status: "pending" } }, { new: true })
        : await FriendRequest.create({ requester: user._id, recipient: targetUserId })

      return ok({ item: { id: toPlainId(follow!._id), status: "pending" }, mutual: false }, { status: 201 })
    }

    if (action === "unfollow") {
      if (!targetUserId || !isValidObjectId(targetUserId)) return errorResponse("Invalid target user", 422)
      const users = sortUserIds([user._id, targetUserId])
      const friendship = await Friendship.findOne({ users })
      await FriendRequest.deleteOne({ requester: user._id, recipient: targetUserId })
      if (friendship) {
        // They still follow me: keep that as a one-way follow. The conversation history stays,
        // but new messages need the follow to be mutual again.
        await Friendship.deleteOne({ _id: friendship._id })
        await FriendRequest.updateOne(
          { requester: targetUserId, recipient: user._id },
          { $set: { status: "pending" } },
          { upsert: true },
        )
        return ok({ success: true, wasMutual: true })
      }
      return ok({ success: true, wasMutual: false })
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

      // Accepting = following back.
      friendRequest.status = "accepted"
      await friendRequest.save()

      const conversationId = await makeMutual(sortUserIds([friendRequest.requester, friendRequest.recipient]))
      return ok({ success: true, mutual: true, conversationId })
    }

    return errorResponse("Unsupported action", 422)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update friendship"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
