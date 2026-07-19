import { CommunityNotification } from "@/lib/server/models"

type NotificationType = "post_like" | "post_comment" | "post_repost"

export async function createCommunityNotification({
  recipientId,
  actorId,
  postId,
  type,
  commentId,
}: {
  recipientId: string
  actorId: string
  postId: string
  type: NotificationType
  commentId?: string | null
}) {
  if (!recipientId || !actorId || recipientId === actorId) return null

  if (type === "post_like") {
    await CommunityNotification.deleteMany({ recipient: recipientId, actor: actorId, post: postId, type })
  }

  return CommunityNotification.create({
    recipient: recipientId,
    actor: actorId,
    post: postId,
    type,
    comment: commentId || null,
  })
}

export function getCommunityNotificationText(type: NotificationType) {
  if (type === "post_like") return "liked your post"
  if (type === "post_comment") return "commented on your post"
  return "reposted your post"
}
