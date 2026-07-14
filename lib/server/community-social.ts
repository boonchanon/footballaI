import { getTimeAgoThai } from "./http-utils"

export function toPlainId(value: unknown) {
  if (!value) return ""
  if (typeof value === "string") return value
  if (typeof value === "object" && value !== null && "toString" in value) {
    return value.toString()
  }
  return String(value)
}

export function sortUserIds(ids: unknown[]) {
  return ids.map((item) => toPlainId(item)).filter(Boolean).sort()
}

export function mapSocialUser(user: any) {
  return {
    id: toPlainId(user?._id),
    name: user?.name || "ผู้ใช้งาน",
    avatar: user?.avatar || "",
    favoriteTeam: user?.favoriteTeam || "",
    bio: user?.bio || "",
  }
}

export function mapFriendRequest(request: any, currentUserId: string) {
  const isIncoming = toPlainId(request?.recipient?._id || request?.recipient) === currentUserId
  const counterpart = isIncoming ? request?.requester : request?.recipient

  return {
    id: toPlainId(request?._id),
    status: request?.status || "pending",
    direction: isIncoming ? "incoming" : "outgoing",
    user: mapSocialUser(counterpart),
    createdAt: request?.createdAt,
    timeAgo: getTimeAgoThai(request?.createdAt),
  }
}

export function mapConversation(conversation: any, currentUserId: string) {
  const members = Array.isArray(conversation?.members) ? conversation.members : []
  const counterpart = members.find((member: any) => toPlainId(member?._id || member) !== currentUserId) || members[0]
  const unreadCount = Number(conversation?.unreadCount || 0)

  return {
    id: toPlainId(conversation?._id),
    user: mapSocialUser(counterpart),
    lastMessageText: conversation?.lastMessageText || "เริ่มบทสนทนาใหม่",
    lastMessageAt: conversation?.lastMessageAt || conversation?.updatedAt || conversation?.createdAt,
    timeAgo: getTimeAgoThai(conversation?.lastMessageAt || conversation?.updatedAt || conversation?.createdAt),
    unreadCount,
    hasUnread: unreadCount > 0,
  }
}

export function mapMessage(message: any) {
  return {
    id: toPlainId(message?._id),
    content: message?.content || "",
    images: Array.isArray(message?.images) ? message.images.filter(Boolean) : [],
    sharedItem:
      message?.sharedItem && typeof message.sharedItem === "object"
        ? {
            type: typeof message.sharedItem.type === "string" ? message.sharedItem.type : "",
            title: typeof message.sharedItem.title === "string" ? message.sharedItem.title : "",
            description: typeof message.sharedItem.description === "string" ? message.sharedItem.description : "",
            url: typeof message.sharedItem.url === "string" ? message.sharedItem.url : "",
            image: typeof message.sharedItem.image === "string" ? message.sharedItem.image : "",
            source: typeof message.sharedItem.source === "string" ? message.sharedItem.source : "",
            postId: typeof message.sharedItem.postId === "string" ? message.sharedItem.postId : "",
          }
        : null,
    createdAt: message?.createdAt,
    timeAgo: getTimeAgoThai(message?.createdAt),
    sender: mapSocialUser(message?.sender),
  }
}
