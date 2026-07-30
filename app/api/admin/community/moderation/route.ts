import { NextRequest } from "next/server"

import { requireAdminRoles } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, getTimeAgoThai, ok } from "@/lib/server/http-utils"
import { Comment, CommunityMedia, CommunityPost, CommunityStory, ModerationLog } from "@/lib/server/models"

type QueueItem = {
  id: string
  sourceId: string
  contentType: "post" | "comment" | "story" | "image" | "video"
  status: "approved" | "pending_review" | "rejected" | "processing" | "failed"
  publishStatus?: string
  reasons: string[]
  provider: string
  preview: string
  imageUrl?: string
  mediaNotes?: string[]
  ocrTextPreview?: string
  qrPreview?: string[]
  createdAt: Date
  timeAgo: string
  author: {
    id: string
    name: string
    avatar: string
  }
  repeatOffenses: number
}

async function getRepeatOffenses(userId: string) {
  return ModerationLog.countDocuments({
    user: userId,
    status: { $in: ["pending_review", "rejected"] },
  })
}

function buildItem(base: Omit<QueueItem, "repeatOffenses" | "timeAgo">): QueueItem {
  return {
    ...base,
    timeAgo: getTimeAgoThai(base.createdAt),
    repeatOffenses: 0,
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    await requireAdminRoles(request, ["superadmin", "admincommunity"])
    const searchParams = request.nextUrl.searchParams
    const status = String(searchParams.get("status") || "pending_review").trim()
    const contentType = String(searchParams.get("type") || "all").trim()
    const q = String(searchParams.get("q") || "").trim()
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || "20")))

    const moderationFilter: Record<string, unknown> = {}
    if (status === "pending_review") {
      moderationFilter["moderation.status"] = "pending_review"
    } else if (status !== "all") {
      moderationFilter["moderation.status"] = status
    }
    const postModerationFilter =
      status === "pending_review"
        ? { $or: [{ "moderation.status": "pending_review" }, { hasPendingRevision: true }] }
        : moderationFilter

    const searchFilter = q
      ? {
          $or: [
            { title: { $regex: q, $options: "i" } },
            { content: { $regex: q, $options: "i" } },
            { caption: { $regex: q, $options: "i" } },
          ],
        }
      : {}
    const postQuery = q ? { $and: [postModerationFilter, searchFilter] } : postModerationFilter

    const [posts, comments, stories, mediaItems] = await Promise.all([
      contentType === "all" || contentType === "post"
        ? CommunityPost.find(postQuery)
            .populate("author", "name avatar")
            .sort({ createdAt: -1 })
            .limit(limit)
        : Promise.resolve([]),
      contentType === "all" || contentType === "comment"
        ? Comment.find({ ...moderationFilter, targetType: "post", ...(q ? { content: { $regex: q, $options: "i" } } : {}) })
            .populate("user", "name avatar")
            .sort({ createdAt: -1 })
            .limit(limit)
        : Promise.resolve([]),
      contentType === "all" || contentType === "story"
        ? CommunityStory.find({ ...moderationFilter, ...(q ? { caption: { $regex: q, $options: "i" } } : {}) })
            .populate("author", "name avatar")
            .sort({ createdAt: -1 })
            .limit(limit)
        : Promise.resolve([]),
      contentType === "all" || contentType === "image" || contentType === "video"
        ? CommunityMedia.find({
            ...(status === "pending_review"
              ? { status: { $in: ["pending_review", "processing", "failed"] } }
              : status !== "all"
                ? { status }
                : {}),
            ...(contentType === "image" ? { mediaType: "image" } : contentType === "video" ? { mediaType: "video" } : {}),
            ...(q ? { originalName: { $regex: q, $options: "i" } } : {}),
          })
            .populate("owner", "name avatar")
            .sort({ createdAt: -1 })
            .limit(limit)
        : Promise.resolve([]),
    ])

    const items = [
      ...posts.map((post: any) => {
        const revision = post.hasPendingRevision && post.pendingRevision ? post.pendingRevision : null
        const revisionModeration = revision?.moderation || null
        const reasons = revision
          ? Array.isArray(revisionModeration?.reasons)
            ? revisionModeration.reasons
            : []
          : Array.isArray(post.moderation?.reasons)
            ? post.moderation.reasons
            : []

        return buildItem({
          id: `post_${post._id.toString()}`,
          sourceId: post._id.toString(),
          contentType: "post",
          status: revision ? "pending_review" : post.moderation?.status || "approved",
          publishStatus: post.status || "published",
          reasons,
          provider: revision ? revisionModeration?.provider || "local" : post.moderation?.provider || "local",
          preview: [post.title, revision ? revision.content : post.content].filter(Boolean).join(" • ").slice(0, 260),
          imageUrl: revision && Array.isArray(revision.images) ? revision.images[0] || "" : Array.isArray(post.images) ? post.images[0] || "" : "",
          createdAt: revision?.submittedAt ? new Date(revision.submittedAt) : post.createdAt,
          author: {
            id: post.author?._id?.toString?.() || "",
            name: post.author?.name || "ผู้ใช้งาน",
            avatar: post.author?.avatar || "",
          },
        })
      }),
      ...comments.map((comment: any) =>
        buildItem({
          id: `comment_${comment._id.toString()}`,
          sourceId: comment._id.toString(),
          contentType: "comment",
          status: comment.moderation?.status || "approved",
          reasons: Array.isArray(comment.moderation?.reasons) ? comment.moderation.reasons : [],
          provider: comment.moderation?.provider || "local",
          preview: String(comment.content || "").slice(0, 260),
          createdAt: comment.createdAt,
          author: {
            id: comment.user?._id?.toString?.() || "",
            name: comment.user?.name || "ผู้ใช้งาน",
            avatar: comment.user?.avatar || "",
          },
        }),
      ),
      ...stories.map((story: any) =>
        buildItem({
          id: `story_${story._id.toString()}`,
          sourceId: story._id.toString(),
          contentType: "story",
          status: story.moderation?.status || "approved",
          publishStatus: story.status || "published",
          reasons: Array.isArray(story.moderation?.reasons) ? story.moderation.reasons : [],
          provider: story.moderation?.provider || "local",
          preview: String(story.caption || "Story image").slice(0, 260),
          imageUrl: story.image || "",
          mediaNotes: Array.isArray(story.moderation?.reasons) ? story.moderation.reasons.filter((reason: string) => reason.startsWith("image:")) : [],
          ocrTextPreview: String(story.moderation?.metadata?.imageMetadata?.extractedTextPreview || "").trim(),
          qrPreview: Array.isArray(story.moderation?.metadata?.imageMetadata?.qrUrls) ? story.moderation.metadata.imageMetadata.qrUrls.slice(0, 3) : [],
          createdAt: story.createdAt,
          author: {
            id: story.author?._id?.toString?.() || "",
            name: story.author?.name || "ผู้ใช้งาน",
            avatar: story.author?.avatar || "",
          },
        }),
      ),
      ...mediaItems.map((media: any) =>
        buildItem({
          id: `${media.mediaType}_${media._id.toString()}`,
          sourceId: media._id.toString(),
          contentType: media.mediaType,
          status: media.moderation?.status || media.status || "processing",
          publishStatus: media.publicUrl ? "published" : undefined,
          reasons: Array.isArray(media.moderation?.reasons) ? media.moderation.reasons : Array.isArray(media.reasons) ? media.reasons : [],
          provider: media.moderation?.provider || media.provider || "local",
          preview: String(media.originalName || `${media.mediaType} upload`).slice(0, 260),
          imageUrl:
            media.mediaType === "image"
              ? media.publicUrl || (media.pendingKey ? `/api/admin/community/moderation/media/${media._id.toString()}/preview` : "")
              : "",
          mediaNotes: Array.isArray(media.metadata?.contactHints)
            ? media.metadata.contactHints.slice(0, 3).map((hint: string) => `contact:${hint}`)
            : [],
          ocrTextPreview: String(media.metadata?.extractedTextPreview || "").trim(),
          qrPreview: Array.isArray(media.metadata?.qrUrls) ? media.metadata.qrUrls.slice(0, 3) : [],
          createdAt: media.createdAt,
          author: {
            id: media.owner?._id?.toString?.() || "",
            name: media.owner?.name || "ผู้ใช้งาน",
            avatar: media.owner?.avatar || "",
          },
        }),
      ),
    ]
      .filter((item) => {
        if (statusFilterIncludesOnlyDecisionNeeded(status)) {
          return item.status === "pending_review" || item.status === "processing" || item.status === "failed"
        }
        return true
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    const itemsWithCounts = await Promise.all(
      items.map(async (item) => ({
        ...item,
        repeatOffenses: item.author.id ? await getRepeatOffenses(item.author.id) : 0,
      })),
    )

    return ok({ items: itemsWithCounts })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load moderation queue"
    return errorResponse(message, message === "Admin authentication required" ? 401 : message === "Admin permission denied" ? 403 : 500)
  }
}

function statusFilterIncludesOnlyDecisionNeeded(status: string) {
  return !status || status === "pending_review"
}
