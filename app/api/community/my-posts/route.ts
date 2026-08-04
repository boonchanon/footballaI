import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { buildCommunityFeedIsolationFilter, mapCommunityPostWithMedia } from "@/lib/server/community"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, getTimeAgoThai, ok, parsePagination } from "@/lib/server/http"
import { CommunityPost } from "@/lib/server/models"

function getFriendlyReasons(reasons: unknown) {
  if (!Array.isArray(reasons) || !reasons.length) return []
  return reasons.slice(0, 4).map((reason) => {
    const value = String(reason || "")
    if (value.startsWith("media:")) return "ไฟล์แนบกำลังรอการตรวจสอบ"
    if (value.includes("gambling")) return "มีคำหรือข้อมูลที่เกี่ยวข้องกับการพนัน"
    if (value.includes("profanity") || value.includes("harassment")) return "มีถ้อยคำที่ระบบมองว่าอาจไม่เหมาะสม"
    if (value.includes("ai-unavailable") || value.includes("technical")) return "ระบบตรวจสอบอัตโนมัติยังไม่พร้อม จึงรอให้แอดมินตรวจ"
    return "เนื้อหานี้ต้องตรวจสอบเพิ่มเติม"
  })
}

function getOwnerPostState(post: any) {
  if (post.hasPendingRevision) return "revision_pending"
  if (post.moderation?.status === "pending_review") return "pending_review"
  if (post.moderation?.status === "rejected") return "rejected"
  if (post.status === "hidden") return "hidden"
  if (post.status === "published") return "published"
  return "draft"
}

function getStateLabel(state: string) {
  if (state === "published") return "เผยแพร่แล้ว"
  if (state === "pending_review") return "กำลังตรวจสอบ"
  if (state === "revision_pending") return "ฉบับแก้ไขรอตรวจ"
  if (state === "hidden") return "ถูกซ่อน"
  if (state === "rejected") return "ไม่ผ่านการตรวจสอบ"
  return "ฉบับร่าง"
}

async function mapMyPost(post: any, user: any) {
  const state = getOwnerPostState(post)
  const revision = state === "revision_pending" ? post.pendingRevision : null
  const reasons = revision?.moderation?.reasons || post.moderation?.reasons || []
  const mediaPost = await mapCommunityPostWithMedia(post, user)

  return {
    id: post._id.toString(),
    preview: String(revision?.content || post.content || "").slice(0, 180),
    category: post.category || "general",
    tags: Array.isArray(post.tags) ? post.tags : [],
    status: state,
    statusLabel: getStateLabel(state),
    publishStatus: post.status || "published",
    moderationStatus: revision?.moderation?.status || post.moderation?.status || "approved",
    friendlyReasons: getFriendlyReasons(reasons),
    createdAt: post.createdAt,
    createdAgo: getTimeAgoThai(post.createdAt),
    updatedAt: post.updatedAt,
    lastEditedAt: post.lastEditedAt || null,
    editVersion: Number(post.editVersion || 1),
    hasPendingRevision: Boolean(post.hasPendingRevision),
    media: mediaPost.media,
    imageMedia: mediaPost.imageMedia,
    videoMedia: mediaPost.videoMedia,
    images: mediaPost.images,
    videos: mediaPost.videos,
    pendingRevisionPreview: mediaPost.pendingRevisionPreview,
    canEdit: state !== "rejected",
    canDelete: true,
    canResubmit: state === "rejected" || state === "hidden",
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const searchParams = request.nextUrl.searchParams
    const { page, limit, skip } = parsePagination(searchParams)
    const status = String(searchParams.get("status") || "all").trim()

    const allPosts = await CommunityPost.find({ author: user._id, ...buildCommunityFeedIsolationFilter() }).populate("author", "name avatar favoriteTeam role").sort({ updatedAt: -1 }).limit(500)
    const mapped = await Promise.all(allPosts.map((post) => mapMyPost(post, user)))
    const allFilteredItems = status === "all" ? mapped : mapped.filter((item) => item.status === status)
    const items = allFilteredItems.slice(skip, skip + limit)

    const counts = mapped.reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1
        acc.all += 1
        return acc
      },
      { all: 0, published: 0, pending_review: 0, revision_pending: 0, hidden: 0, rejected: 0, draft: 0 },
    )

    return ok({
      items,
      counts,
      pagination: { page, limit, total: allFilteredItems.length, totalPages: Math.ceil(allFilteredItems.length / limit) },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load your posts"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
