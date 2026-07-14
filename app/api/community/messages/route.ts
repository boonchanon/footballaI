import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { mapConversation, mapMessage, sortUserIds, toPlainId } from "@/lib/server/community-social"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, getTimeAgoThai, ok } from "@/lib/server/http"
import { Conversation, DirectMessage, Friendship } from "@/lib/server/models"

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const userId = toPlainId(user._id)
    const searchParams = request.nextUrl.searchParams
    const conversationId = searchParams.get("conversationId")

    if (conversationId) {
      const conversation = await Conversation.findById(conversationId).populate("members", "name avatar favoriteTeam bio")
      if (!conversation || !Array.isArray(conversation.members) || !conversation.members.some((member: any) => toPlainId(member._id || member) === userId)) {
        return errorResponse("Conversation not found", 404)
      }

      await DirectMessage.updateMany(
        {
          conversation: conversation._id,
          sender: { $ne: user._id },
          readBy: { $ne: user._id },
        },
        {
          $addToSet: { readBy: user._id },
        },
      )

      const messages = await DirectMessage.find({ conversation: conversation._id })
        .populate("sender", "name avatar favoriteTeam bio")
        .sort({ createdAt: 1 })
        .limit(100)
      const memberIds = (Array.isArray(conversation.members) ? conversation.members : []).map((member: any) =>
        toPlainId(member?._id || member),
      )

      const unreadCount = await DirectMessage.countDocuments({
        conversation: conversation._id,
        sender: { $ne: user._id },
        readBy: { $ne: user._id },
      })

      return ok({
        conversation: {
          ...mapConversation(conversation, userId),
          unreadCount,
          hasUnread: unreadCount > 0,
        },
        messages: messages.map((item: any) => {
          const mapped = mapMessage(item)
          const readByIds = Array.isArray(item?.readBy) ? item.readBy.map((entry: any) => toPlainId(entry)) : []
          const counterpartHasRead =
            toPlainId(item?.sender?._id || item?.sender) === userId
              ? memberIds.some((memberId) => memberId !== userId && readByIds.includes(memberId))
              : false
          const seenAt =
            counterpartHasRead && item?.updatedAt && item?.createdAt && new Date(item.updatedAt).getTime() > new Date(item.createdAt).getTime()
              ? item.updatedAt
              : null

          return {
            ...mapped,
            readByCount: readByIds.length,
            seenByRecipient: counterpartHasRead,
            seenAt,
            seenTimeAgo: seenAt ? getTimeAgoThai(seenAt) : "",
          }
        }),
      })
    }

    const conversations = await Conversation.find({ members: user._id })
      .populate("members", "name avatar favoriteTeam bio")
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .limit(20)

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
      items: conversations.map((item: any) => {
        const unreadCount = unreadMap.get(toPlainId(item._id)) || 0
        return {
          ...mapConversation(item, userId),
          unreadCount,
          hasUnread: unreadCount > 0,
        }
      }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load messages"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const body = await request.json()
    const targetUserId = String(body.targetUserId || "")
    const content = String(body.content || "").trim()
    const images = Array.isArray(body.images) ? body.images.filter((item: unknown) => typeof item === "string" && item.trim()).slice(0, 4) : []
    const rawSharedItem = body.sharedItem && typeof body.sharedItem === "object" ? body.sharedItem : null
    const sharedItem =
      rawSharedItem &&
      (rawSharedItem.type === "article" || rawSharedItem.type === "post") &&
      typeof rawSharedItem.title === "string" &&
      typeof rawSharedItem.url === "string"
        ? {
            type: rawSharedItem.type,
            title: rawSharedItem.title.trim(),
            description: typeof rawSharedItem.description === "string" ? rawSharedItem.description.trim() : "",
            url: rawSharedItem.url.trim(),
            image: typeof rawSharedItem.image === "string" ? rawSharedItem.image.trim() : "",
            source: typeof rawSharedItem.source === "string" ? rawSharedItem.source.trim() : "",
            postId: typeof rawSharedItem.postId === "string" ? rawSharedItem.postId.trim() : "",
          }
        : null

    if (!targetUserId) return errorResponse("Target user is required", 422)
    if (!content && images.length === 0 && !sharedItem) {
      return errorResponse("Message content, image, or shared item is required", 422)
    }
    if (targetUserId === toPlainId(user._id)) return errorResponse("Invalid target user", 422)

    const members = sortUserIds([user._id, targetUserId])
    const friendship = await Friendship.findOne({ users: members })
    if (!friendship) return errorResponse("You can only message friends", 403)

    const conversation =
      (await Conversation.findOne({ members })) ||
      (await Conversation.create({
        members,
        lastMessageText: "",
        lastMessageAt: new Date(),
      }))

    const message = await DirectMessage.create({
      conversation: conversation._id,
      sender: user._id,
      content: content || (sharedItem ? sharedItem.title : ""),
      images,
      sharedItem,
      readBy: [user._id],
    })

    conversation.lastMessageText = content || (sharedItem ? `${sharedItem.type === "article" ? "แชร์ข่าว" : "แชร์โพสต์"}: ${sharedItem.title}` : images.length > 0 ? "ส่งรูปภาพ" : "")
    conversation.lastMessageAt = message.createdAt
    await conversation.save()

    const populated = await DirectMessage.findById(message._id).populate("sender", "name avatar favoriteTeam bio")
    return ok({ conversationId: toPlainId(conversation._id), item: mapMessage(populated) }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send message"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
