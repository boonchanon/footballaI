import { NextRequest } from "next/server"

import { getAuthUser, requireAuthUser } from "@/lib/server/auth"
import { canViewerSeeModeratedContent, mapCommunityPostWithMedia } from "@/lib/server/community"
import { getLegacyComments, getLegacyLikeState } from "@/lib/server/community-admin"
import {
  assertCommunityPostingAllowed,
  createModerationLog,
  getPublicationStatusForModeration,
  moderateCommunityText,
  notifyContentModerationOutcome,
} from "@/lib/server/content-moderation"
import { validateCommunityPreferences } from "@/lib/server/community-preferences"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, getTimeAgoThai, ok } from "@/lib/server/http"
import { Comment, CommunityMedia, CommunityNotification, CommunityPost, PostLike } from "@/lib/server/models"

type MediaAttachmentValidation = {
  records: any[]
  approvedUrls: string[]
  hasPendingReview: boolean
  hasProcessing: boolean
}

function parseMediaIdList(value: unknown, limit: number) {
  if (typeof value === "undefined") return null
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, limit)
}

function parseTags(value: unknown) {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().replace(/^#/, ""))
        .filter((item) => item.length >= 2 && item.length <= 32)
        .slice(0, 8),
    ),
  )
}

function normalizeExistingMediaIds(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item || "").trim()).filter(Boolean)
}

function parseMetadataIdList(value: unknown, limit: number) {
  if (typeof value === "undefined") return null
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string" || typeof item === "number")
        .map((item) => String(item).trim())
        .filter((item) => /^[A-Za-z0-9_-]{1,80}$/.test(item))
        .slice(0, limit),
    ),
  )
}

function getExistingPostMediaIds(post: any) {
  const attachedMedia = post?.moderation?.metadata?.attachedMedia || {}
  const metadata = post?.moderation?.metadata || {}
  return {
    imageMediaIds: normalizeExistingMediaIds(attachedMedia.imageMediaIds).length
      ? normalizeExistingMediaIds(attachedMedia.imageMediaIds)
      : normalizeExistingMediaIds(metadata.imageMediaIds),
    videoMediaIds: normalizeExistingMediaIds(attachedMedia.videoMediaIds).length
      ? normalizeExistingMediaIds(attachedMedia.videoMediaIds)
      : normalizeExistingMediaIds(metadata.videoMediaIds),
  }
}

async function validateEditMedia(params: {
  mediaIds: string[] | null
  mediaType: "image" | "video"
  ownerId: string
  postId: string
}) {
  const { mediaIds, mediaType, ownerId, postId } = params
  if (mediaIds === null) return null
  if (!mediaIds.length) {
    return {
      records: [],
      approvedUrls: [],
      hasPendingReview: false,
      hasProcessing: false,
    } satisfies MediaAttachmentValidation
  }

  const records = await CommunityMedia.find({ _id: { $in: mediaIds }, mediaType })
  const mediaById = new Map(records.map((record: any) => [record._id.toString(), record]))
  if (records.length !== mediaIds.length) {
    throw new Error(`Some ${mediaType} attachments could not be found`)
  }

  for (const mediaId of mediaIds) {
    const record = mediaById.get(mediaId)
    if (!record) throw new Error(`Some ${mediaType} attachments could not be found`)
    if (record.owner?.toString?.() !== ownerId) {
      throw new Error(`You do not own one of the selected ${mediaType} attachments`)
    }
    const contentType = String(record.contentType || "")
    const linkedPostId = String(record.contentId || "")
    if (contentType !== "upload" && !(contentType === "post" && linkedPostId === postId)) {
      throw new Error(`One of the selected ${mediaType} attachments is already linked elsewhere`)
    }
    if (["rejected", "failed"].includes(String(record.status || ""))) {
      throw new Error(`One of the selected ${mediaType} attachments is not available`)
    }
  }

  return {
    records: mediaIds.map((mediaId) => mediaById.get(mediaId)),
    approvedUrls: mediaIds
      .map((mediaId) => mediaById.get(mediaId))
      .filter((record) => record?.status === "approved" && typeof record.publicUrl === "string" && record.publicUrl.trim())
      .map((record) => record.publicUrl.trim()),
    hasPendingReview: mediaIds.some((mediaId) => mediaById.get(mediaId)?.status === "pending_review"),
    hasProcessing: mediaIds.some((mediaId) => mediaById.get(mediaId)?.status === "processing"),
  } satisfies MediaAttachmentValidation
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    const { id } = await params
    const viewer = await getAuthUser(request)
    const post = await CommunityPost.findById(id).populate("author", "name avatar favoriteTeam role")

    if (!post || !canViewerSeeModeratedContent(post, viewer)) {
      return errorResponse("Post not found", 404)
    }

    const nextViews = Math.max(Number(post.viewsCount || 0), Number(post.views || 0)) + 1
    post.viewsCount = nextViews
    if (typeof post.views === "number") {
      post.views = nextViews
    }
    await post.save()

    const isLiked = viewer ? await PostLike.exists({ post: post._id, user: viewer._id }) : false
    const legacyLiked = viewer ? getLegacyLikeState(post, viewer._id.toString()) : false

    const dbCommentsFilter: Record<string, unknown> = {
      targetType: "post",
      targetId: post._id.toString(),
      $or: [{ isApproved: true, "moderation.status": { $in: [null, "approved"] } }],
    }
    if (viewer) {
      dbCommentsFilter.$or = [{ isApproved: true, "moderation.status": { $in: [null, "approved"] } }, { user: viewer._id, "moderation.status": "pending_review" }]
    }

    const dbComments = await Comment.find(dbCommentsFilter)
      .populate("user", "name avatar favoriteTeam")
      .sort({ createdAt: -1 })

    const comments =
      dbComments.length > 0
        ? dbComments.map((comment: any) => ({
            id: comment._id.toString(),
            content: comment.content,
            moderationStatus: comment.moderation?.status || "approved",
            createdAt: comment.createdAt,
            timeAgo: getTimeAgoThai(comment.createdAt),
            user: {
              id: comment.user?._id?.toString?.() || "",
              name: comment.user?.name || "?????????",
              avatar: comment.user?.avatar || "",
            },
          }))
        : getLegacyComments(post).map((comment: any, index: number) => ({
            id: comment?._id?.toString?.() || `legacy-${post._id.toString()}-${index}`,
            content: comment?.content || comment?.text || "",
            createdAt: comment?.createdAt || post.createdAt,
            timeAgo: getTimeAgoThai(comment?.createdAt || post.createdAt),
            user: {
              id: comment?.user?._id?.toString?.() || comment?.user?.toString?.() || "",
              name: comment?.user?.name || comment?.authorName || "?????????",
              avatar: comment?.user?.avatar || "",
            },
          }))

    return ok({
      item: {
        ...(await mapCommunityPostWithMedia(post, viewer)),
      },
      comments,
    })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Failed to load post", 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    await assertCommunityPostingAllowed(user._id.toString())
    const { id } = await params
    const post = await CommunityPost.findById(id)

    if (!post) return errorResponse("Post not found", 404)
    if (user.role !== "admin" && post.author.toString() !== user._id.toString()) {
      return errorResponse("Not allowed to delete this post", 403)
    }

    const sharedPostId =
      post.sharedItem && typeof post.sharedItem === "object" && post.sharedItem.type === "post" && typeof post.sharedItem.postId === "string"
        ? post.sharedItem.postId
        : ""

    await Promise.all([
      CommunityPost.findByIdAndDelete(post._id),
      sharedPostId ? CommunityPost.findByIdAndUpdate(sharedPostId, { $inc: { repostsCount: -1 } }) : Promise.resolve(null),
      PostLike.deleteMany({ post: post._id }),
      Comment.deleteMany({ targetType: "post", targetId: post._id.toString() }),
      CommunityNotification.deleteMany({ post: post._id }),
    ])

    if (sharedPostId) {
      await CommunityPost.updateOne({ _id: sharedPostId, repostsCount: { $lt: 0 } }, { $set: { repostsCount: 0 } })
    }

    return ok({ message: "Post deleted" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete post"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    await assertCommunityPostingAllowed(user._id.toString())
    const { id } = await params
    const post = await CommunityPost.findById(id)

    if (!post) return errorResponse("Post not found", 404)
    if (user.role !== "admin" && post.author.toString() !== user._id.toString()) {
      return errorResponse("Not allowed to edit this post", 403)
    }

    const body = await request.json()
    if (typeof body.editVersion !== "undefined" && Number(body.editVersion) !== Number(post.editVersion || 1)) {
      return errorResponse("Post was edited elsewhere. Please refresh and try again.", 409)
    }

    const content = typeof body.content === "string" ? body.content.trim() : String(post.content || "").trim()
    const category = typeof body.category === "string" ? body.category.trim() : String(post.category || "general")
    const imageMediaIds = parseMediaIdList(body.imageMediaIds, 4)
    const videoMediaIds = parseMediaIdList(body.videoMediaIds, 1)
    const teamIds = parseMetadataIdList(body.teamIds, 6)
    const playerIds = parseMetadataIdList(body.playerIds, 12)
    const existingMediaIds = getExistingPostMediaIds(post)
    const finalImageMediaIds = imageMediaIds ?? existingMediaIds.imageMediaIds
    const finalVideoMediaIds = videoMediaIds ?? existingMediaIds.videoMediaIds
    const finalTeamIds = teamIds ?? (Array.isArray(post.teamIds) ? post.teamIds : [])
    const finalPlayerIds = playerIds ?? (Array.isArray(post.playerIds) ? post.playerIds : [])
    const tags = typeof body.tags === "undefined" ? (Array.isArray(post.tags) ? post.tags : []) : parseTags(body.tags)

    if (content.length < 8 || content.length > 5000) {
      return errorResponse("Validation failed", 422)
    }

    const allowedCategories = new Set(["match-discussion", "transfer-rumors", "player-discussion", "predictions", "general"])
    if (!allowedCategories.has(category)) {
      return errorResponse("Validation failed", 422)
    }
    if (videoMediaIds && videoMediaIds.length > 1) {
      return errorResponse("You can attach up to 1 video", 422)
    }

    const [imageAttachments, videoAttachments] = await Promise.all([
      validateEditMedia({ mediaIds: imageMediaIds, mediaType: "image", ownerId: user._id.toString(), postId: post._id.toString() }),
      validateEditMedia({ mediaIds: videoMediaIds, mediaType: "video", ownerId: user._id.toString(), postId: post._id.toString() }),
    ])
    if ((teamIds && teamIds.length) || (playerIds && playerIds.length)) {
      await validateCommunityPreferences({
        favoriteTeamIds: finalTeamIds,
        favoritePlayerIds: finalPlayerIds,
        preferredContentTypes: [],
      })
    }

    const nextImages = imageAttachments ? imageAttachments.approvedUrls : Array.isArray(post.images) ? post.images : []
    const nextVideos = videoAttachments ? videoAttachments.approvedUrls : Array.isArray(post.videos) ? post.videos : []
    const linkedMediaRecords = [...(imageAttachments?.records || []), ...(videoAttachments?.records || [])].filter(Boolean)
    const hasPendingMedia = Boolean(
      imageAttachments?.hasPendingReview ||
        imageAttachments?.hasProcessing ||
        videoAttachments?.hasPendingReview ||
        videoAttachments?.hasProcessing,
    )

    const moderation = await moderateCommunityText({
      title: String(post.title || ""),
      content,
      urls: [...nextImages, ...nextVideos],
      imageUrls: nextImages,
    })

    if (moderation.status === "rejected") {
      await createModerationLog({
        userId: user._id.toString(),
        contentType: "post",
        contentId: post._id.toString(),
        status: moderation.status,
        action: "update_rejected",
        reasons: moderation.reasons,
        scores: moderation.scores,
        provider: moderation.provider,
      })
      return errorResponse("Post rejected by moderation", 422, { reasons: moderation.reasons })
    }

    const finalModerationStatus = moderation.status === "approved" && hasPendingMedia ? "pending_review" : moderation.status
    const finalReasons = hasPendingMedia
      ? Array.from(new Set([...(Array.isArray(moderation.reasons) ? moderation.reasons : []), "media:pending-review"]))
      : moderation.reasons
    const wasPublishedVersion =
      String(post.status || "") === "published" &&
      (!post.moderation?.status || post.moderation?.status === "approved")

    if (finalModerationStatus === "pending_review" && wasPublishedVersion) {
      post.pendingRevision = {
        content,
        category,
        tags,
        teamIds: finalTeamIds,
        playerIds: finalPlayerIds,
        images: nextImages,
        videos: nextVideos,
        imageMediaIds: imageMediaIds ?? null,
        videoMediaIds: videoMediaIds ?? null,
        moderation: {
          ...moderation,
          status: finalModerationStatus,
          reasons: finalReasons,
          metadata: {
            ...(moderation.metadata || {}),
            revisionOf: post._id.toString(),
            baseEditVersion: Number(post.editVersion || 1),
            hasPendingMedia,
          },
        },
        submittedAt: new Date(),
        submittedBy: user._id,
        baseEditVersion: Number(post.editVersion || 1),
      }
      post.hasPendingRevision = true

      if (linkedMediaRecords.length) {
        await CommunityMedia.updateMany(
          { _id: { $in: linkedMediaRecords.map((record) => record._id) } },
          { $set: { contentType: "post", contentId: post._id.toString() } },
        )
      }

      await post.save()
      await post.populate("author", "name avatar favoriteTeam role")

      await createModerationLog({
        userId: user._id.toString(),
        contentType: "post",
        contentId: post._id.toString(),
        status: finalModerationStatus,
        action: "revision_submitted",
        reasons: finalReasons,
        scores: moderation.scores,
        provider: moderation.provider,
        metadata: {
          baseEditVersion: Number(post.editVersion || 1),
          imageMediaIds: imageMediaIds ?? null,
          videoMediaIds: videoMediaIds ?? null,
          hasPendingMedia,
        },
      })

      await notifyContentModerationOutcome({
        recipientId: user._id.toString(),
        outcome: "pending_review",
        contentType: "post",
        contentId: post._id.toString(),
      })

      return ok({
        item: await mapCommunityPostWithMedia(post, user),
        moderationStatus: finalModerationStatus,
        revisionStatus: "pending_review",
      })
    }

    post.content = content
    post.category = category
    post.tags = tags
    post.teamIds = finalTeamIds
    post.playerIds = finalPlayerIds
    post.images = nextImages
    post.videos = nextVideos
    post.status = getPublicationStatusForModeration(finalModerationStatus)
    post.moderation = {
      ...(post.moderation?.toObject?.() || post.moderation || {}),
      ...moderation,
      status: finalModerationStatus,
      reasons: finalReasons,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date(),
      metadata: {
        ...(moderation.metadata || {}),
        hasPendingMedia,
        attachedMedia: {
          imageMediaIds: finalImageMediaIds,
          videoMediaIds: finalVideoMediaIds,
          hasPendingMedia,
        },
        personalization: {
          teamIds: finalTeamIds,
          playerIds: finalPlayerIds,
          contentType: category,
        },
      },
    }
    post.pendingRevision = null
    post.hasPendingRevision = false
    post.lastEditedAt = new Date()
    post.editVersion = Number(post.editVersion || 1) + 1

    if (linkedMediaRecords.length) {
      await CommunityMedia.updateMany(
        { _id: { $in: linkedMediaRecords.map((record) => record._id) } },
        { $set: { contentType: "post", contentId: post._id.toString() } },
      )
    }

    await post.save()
    await post.populate("author", "name avatar favoriteTeam role")

    await createModerationLog({
      userId: user._id.toString(),
      contentType: "post",
      contentId: post._id.toString(),
      status: finalModerationStatus,
      action: "updated",
      reasons: finalReasons,
      scores: moderation.scores,
      provider: moderation.provider,
      metadata: {
        editVersion: Number(post.editVersion || 1),
        imageMediaIds: imageMediaIds ?? null,
        videoMediaIds: videoMediaIds ?? null,
        hasPendingMedia,
      },
    })

    return ok({
      item: await mapCommunityPostWithMedia(post, user),
      moderationStatus: finalModerationStatus,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update post"
    return errorResponse(
      message,
      message === "Authentication required"
        ? 401
        : message.includes("attachments") || message.includes("own one of the selected") || message.includes("already linked")
          ? 422
          : 500,
    )
  }
}
