import { NextRequest } from "next/server"

import { getAuthUser, requireAuthUser } from "@/lib/server/auth"
import { canViewerSeeModeratedContent } from "@/lib/server/community"
import {
  assertCommunityPostingAllowed,
  createModerationLog,
  getPublicationStatusForModeration,
  moderateCommunityStory,
  notifyContentModerationOutcome,
  registerModerationStrike,
} from "@/lib/server/content-moderation"
import { mapSocialUser, toPlainId } from "@/lib/server/community-social"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, getTimeAgoThai, ok } from "@/lib/server/http"
import { CommunityMedia, CommunityStory } from "@/lib/server/models"

function getStoryStyle(input: any) {
  const rawTheme = String(input?.theme || "")
  const rawCaptionAlign = String(input?.captionAlign || "")
  const rawCaptionSize = String(input?.captionSize || "")
  const rawSticker = String(input?.sticker || "")

  const theme = ["neon", "midnight", "sunset", "glass"].includes(rawTheme) ? rawTheme : "neon"
  const captionAlign = ["top", "center", "bottom"].includes(rawCaptionAlign) ? rawCaptionAlign : "bottom"
  const captionSize = ["sm", "md", "lg"].includes(rawCaptionSize) ? rawCaptionSize : "md"
  const sticker = ["", "Matchday", "Breaking", "Hot Take", "Fan Cam"].includes(rawSticker) ? rawSticker : ""
  return { theme, captionAlign, captionSize, sticker }
}

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    const viewer = await getAuthUser(request)
    const now = new Date()

    const storyFilter = viewer
      ? {
          $or: [
            { status: "published", expiresAt: { $gt: now }, "moderation.status": { $in: ["approved", null] } },
            { author: viewer._id, status: "hidden", "moderation.status": "pending_review" },
          ],
        }
      : { status: "published", expiresAt: { $gt: now }, "moderation.status": { $in: ["approved", null] } }
    const stories = await CommunityStory.find(storyFilter)
      .populate("author", "name avatar favoriteTeam bio")
      .sort({ createdAt: -1 })
      .limit(40)

    const grouped = new Map<string, any>()

    for (const story of stories) {
      const author = mapSocialUser(story.author)
      const authorId = toPlainId(story.author?._id)
      const viewerId = viewer ? toPlainId(viewer._id) : ""
      const viewedBy = Array.isArray(story.viewedBy) ? story.viewedBy.map((item: any) => toPlainId(item)) : []
      const isViewed = viewerId ? viewedBy.includes(viewerId) : false
      const moderationStatus = story.moderation?.status || "approved"
      const canSee = canViewerSeeModeratedContent(story, viewer)
      if (!canSee) continue
      const ownerPreviewUrl =
        itemIsOwn(story, viewer) && story.mediaId && moderationStatus === "pending_review"
          ? `/api/community/media/${story.mediaId.toString()}/preview`
          : ""
      const item = {
        id: toPlainId(story._id),
        image: story.image || ownerPreviewUrl,
        caption: story.caption || "",
        style: getStoryStyle(story.style),
        moderationStatus,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
        timeAgo: getTimeAgoThai(story.createdAt),
        views: Number(story.viewsCount || 0),
        isViewed,
        isOwn: viewer ? authorId === toPlainId(viewer._id) : false,
        author,
        ownerPreviewUrl: ownerPreviewUrl || undefined,
      }

      if (!grouped.has(authorId)) {
        grouped.set(authorId, {
          id: authorId,
          isOwn: item.isOwn,
          author,
          latestCreatedAt: story.createdAt,
          latestTimeAgo: item.timeAgo,
          latestImage: item.image,
          hasUnviewed: false,
          stories: [],
        })
      }

      grouped.get(authorId).stories.push(item)
    }

    const items = Array.from(grouped.values())
      .map((group) => ({
        ...group,
        stories: group.stories.sort(
          (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
        hasUnviewed: group.stories.some((story: any) => !story.isViewed),
      }))
      .sort((a, b) => {
        if (a.isOwn && !b.isOwn) return -1
        if (!a.isOwn && b.isOwn) return 1
        return new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime()
      })

    return ok({ items })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load stories"
    return errorResponse(message, 500)
  }
}

function itemIsOwn(story: any, viewer: any) {
  return Boolean(viewer?._id && toPlainId(story?.author?._id || story?.author) === viewer._id.toString())
}

export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    await assertCommunityPostingAllowed(user._id.toString())
    const body = await request.json()
    const image = String(body.image || "").trim()
    const imageMediaId = String(body.imageMediaId || "").trim()
    const caption = String(body.caption || "").trim()
    const style = getStoryStyle(body.style)

    let media: any = null
    let storyImage = image
    if (imageMediaId) {
      media = await CommunityMedia.findOne({ _id: imageMediaId, owner: user._id, mediaType: "image", contentType: { $in: ["upload", "story"] } })
      if (!media) return errorResponse("Story media not found", 404)
      if (["rejected", "failed"].includes(String(media.status || ""))) return errorResponse("Story media is not available", 422)
      storyImage = media.status === "approved" ? String(media.publicUrl || "") : ""
    }
    if (!storyImage && !media) return errorResponse("Story image is required", 422)
    if (caption.length > 180) return errorResponse("Story caption is too long", 422)

    const captionModeration = media
      ? await moderateCommunityStory({ caption })
      : await moderateCommunityStory({ caption, imageUrl: image })
    const moderation =
      media?.status === "pending_review" && captionModeration.status !== "rejected"
        ? {
            ...captionModeration,
            status: "pending_review" as const,
            reasons: [...new Set([...captionModeration.reasons, "story:media-pending-review"])],
          }
        : captionModeration
    if (moderation.status === "rejected") {
      await createModerationLog({
        userId: user._id.toString(),
        contentType: "story",
        status: moderation.status,
        action: "create_rejected",
        reasons: moderation.reasons,
        scores: moderation.scores,
        provider: moderation.provider,
        metadata: moderation.metadata || {},
      })
      await registerModerationStrike({
        userId: user._id.toString(),
        contentType: "story",
        contentId: `auto-rejected-story:${Date.now()}`,
        reasons: moderation.reasons,
      })
      return errorResponse("สตอรี่นี้มีเนื้อหาที่ไม่เป็นไปตามกฎชุมชน กรุณาเลือกรูปหรือข้อความอื่น", 422, {
        reasons: moderation.reasons,
      })
    }

    const expiresAt = moderation.status === "approved" ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null
    const story = await CommunityStory.create({
      author: user._id,
      image: storyImage,
      mediaId: media?._id || null,
      caption,
      style,
      status: getPublicationStatusForModeration(moderation.status),
      moderation,
      expiresAt,
    })

    if (media) {
      media.contentType = "story"
      media.contentId = story._id.toString()
      await media.save()
    }

    await createModerationLog({
      userId: user._id.toString(),
      contentType: "story",
      contentId: story._id.toString(),
      status: moderation.status,
      action: "created",
      reasons: moderation.reasons,
      scores: moderation.scores,
      provider: moderation.provider,
      metadata: moderation.metadata || {},
    })

    if (moderation.status === "pending_review") {
      await notifyContentModerationOutcome({
        recipientId: user._id.toString(),
        outcome: "pending_review",
        contentType: "story",
        contentId: story._id.toString(),
      })
    }

    const populated = await CommunityStory.findById(story._id).populate("author", "name avatar favoriteTeam bio")

    return ok(
      {
        item: {
          id: toPlainId(populated?._id),
          image: populated?.image || (media?.status === "pending_review" ? `/api/community/media/${media._id.toString()}/preview` : ""),
          caption: populated?.caption || "",
          style: getStoryStyle(populated?.style),
          moderationStatus: moderation.status,
          createdAt: populated?.createdAt,
          expiresAt: populated?.expiresAt,
          timeAgo: getTimeAgoThai(populated?.createdAt),
          views: Number(populated?.viewsCount || 0),
          isOwn: true,
          author: mapSocialUser(populated?.author),
          ownerPreviewUrl: media?.status === "pending_review" ? `/api/community/media/${media._id.toString()}/preview` : undefined,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create story"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await getAuthUser(request)
    const body = await request.json().catch(() => ({}))
    const storyId = String(body.storyId || "").trim()

    if (!storyId) return errorResponse("Story id is required", 422)

    const story = await CommunityStory.findById(storyId)
    if (!story) return errorResponse("Story not found", 404)

    if (!user?._id) {
      return ok({
        item: {
          id: toPlainId(story._id),
          views: Number(story.viewsCount || 0),
          counted: false,
        },
      })
    }

    const viewerId = toPlainId(user._id)
    const viewedBy = Array.isArray(story.viewedBy) ? story.viewedBy.map((item: any) => toPlainId(item)) : []
    const hasViewed = viewedBy.includes(viewerId)

    if (!hasViewed) {
      story.viewedBy = [...(story.viewedBy || []), user._id]
      story.viewsCount = Number(story.viewsCount || 0) + 1
      await story.save()
    }

    return ok({
      item: {
        id: toPlainId(story._id),
        views: Number(story.viewsCount || 0),
        counted: !hasViewed,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to count story view"
    return errorResponse(message, 500)
  }
}
