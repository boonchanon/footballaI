import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { getCommunityNotificationText } from "@/lib/server/community-notifications"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, getTimeAgoThai, ok } from "@/lib/server/http"
import { CommunityNotification, Conversation, DirectMessage, FriendRequest } from "@/lib/server/models"

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)

    const [pendingFriendRequests, conversations, unreadActivityCount, recentActivityDocs] = await Promise.all([
      FriendRequest.countDocuments({ recipient: user._id, status: "pending" }),
      Conversation.find({ members: user._id }).select("_id"),
      CommunityNotification.countDocuments({ recipient: user._id, readAt: null }),
      CommunityNotification.find({ recipient: user._id })
        .populate("actor", "name avatar")
        .populate("post", "title")
        .populate("comment", "content")
        .populate("story", "caption")
        .populate("media", "mediaType originalName status")
        .sort({ createdAt: -1 })
        .limit(8),
    ])

    const unreadMessages =
      conversations.length > 0
        ? await DirectMessage.countDocuments({
            conversation: { $in: conversations.map((item: any) => item._id) },
            sender: { $ne: user._id },
            readBy: { $ne: user._id },
          })
        : 0

    const recentActivity = recentActivityDocs.map((item: any) => ({
      id: item._id.toString(),
      type: item.type,
      isRead: Boolean(item.readAt),
      timeAgo: getTimeAgoThai(item.createdAt),
      createdAt: item.createdAt,
      text: item.message || getCommunityNotificationText(item.type),
      actor: {
        id: item.actor?._id?.toString?.() || "",
        name: item.actor?.name || "ผู้ใช้งาน",
        avatar: item.actor?.avatar || "",
      },
      post: {
        id: item.post?._id?.toString?.() || "",
        title: item.post?.title || "โพสต์ของคุณ",
      },
      commentPreview:
        ["post_comment", "thread_reply"].includes(item.type) && item.comment && typeof item.comment.content === "string"
          ? item.comment.content.slice(0, 80)
          : "",
      story: item.story
        ? {
            id: item.story?._id?.toString?.() || "",
            caption: item.story?.caption || "",
          }
        : null,
      media: item.media
        ? {
            id: item.media?._id?.toString?.() || "",
            mediaType: item.media?.mediaType || "",
            originalName: item.media?.originalName || "",
            status: item.media?.status || "",
          }
        : null,
    }))

    return ok({
      pendingFriendRequests,
      unreadMessages,
      unreadActivity: unreadActivityCount,
      activity: recentActivity,
      total: pendingFriendRequests + unreadMessages + unreadActivityCount,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load notifications"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    await CommunityNotification.updateMany({ recipient: user._id, readAt: null }, { $set: { readAt: new Date() } })
    return ok({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update notifications"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
