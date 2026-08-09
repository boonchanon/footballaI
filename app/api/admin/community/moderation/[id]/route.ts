import { NextRequest } from "next/server"

import { requireAdminRoles } from "@/lib/server/auth"
import { awardCommunityFanBadges } from "@/lib/server/community-fan-profile"
import { createCommunityNotification, notifyFriendsAboutApprovedPost } from "@/lib/server/community-notifications"
import { deletePendingFile, deleteProcessingFile, fileExists, movePendingFileToApproved } from "@/lib/server/community-upload"
import {
  applyUserModerationAction,
  createModerationLog,
  getPublicationStatusForModeration,
  notifyContentModerationOutcome,
  notifyUserModerationAction,
  registerModerationStrike,
  type ModerationStatus,
} from "@/lib/server/content-moderation"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http-utils"
import { Comment, CommunityMedia, CommunityPost, CommunityStory, User } from "@/lib/server/models"

function resolveTarget(compositeId: string) {
  const [contentType, ...rest] = compositeId.split("_")
  return { contentType, sourceId: rest.join("_") }
}

function getModel(contentType: string) {
  if (contentType === "post") return CommunityPost
  if (contentType === "comment") return Comment
  if (contentType === "story") return CommunityStory
  if (contentType === "image" || contentType === "video") return CommunityMedia
  return null
}

function getTargetAuthorId(target: any, contentType: string) {
  if (contentType === "post" || contentType === "story") return target.author?.toString?.() || ""
  if (contentType === "comment") return target.user?.toString?.() || ""
  if (contentType === "image" || contentType === "video") return target.owner?.toString?.() || ""
  return ""
}

function normalizeMediaIdList(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item || "").trim()).filter(Boolean)
}

function getPostAttachedMediaIds(post: any) {
  const attachedMedia = post?.moderation?.metadata?.attachedMedia || {}
  const metadata = post?.moderation?.metadata || {}
  return {
    imageMediaIds: normalizeMediaIdList(attachedMedia.imageMediaIds).length
      ? normalizeMediaIdList(attachedMedia.imageMediaIds)
      : normalizeMediaIdList(metadata.imageMediaIds),
    videoMediaIds: normalizeMediaIdList(attachedMedia.videoMediaIds).length
      ? normalizeMediaIdList(attachedMedia.videoMediaIds)
      : normalizeMediaIdList(metadata.videoMediaIds),
  }
}

function orderMediaByIds(records: any[], ids: string[]) {
  if (!ids.length) return records
  const byId = new Map(records.map((record) => [record._id.toString(), record]))
  return ids.map((id) => byId.get(id)).filter(Boolean)
}

async function syncApprovedCommentState(target: any, action: string) {
  if (target.targetType !== "post" || !target.targetId) return

  const isApproving = action === "approve"
  const wasApproved = Boolean(target.isApproved)
  if (isApproving === wasApproved) return

  const delta = isApproving ? 1 : -1
  await CommunityPost.findByIdAndUpdate(target.targetId, {
    $inc: { commentsCount: delta },
  })
}

async function syncLinkedPostMedia(media: any, action: "approve" | "reject" | "hide") {
  if (media.contentType !== "post" || !media.contentId) {
    return { publishedPostId: "", publishedAuthorId: "", rejectedPostId: "" }
  }

  const post = await CommunityPost.findById(media.contentId)
  if (!post) {
    return { publishedPostId: "", publishedAuthorId: "", rejectedPostId: "" }
  }
  if (post.hasPendingRevision) {
    return { publishedPostId: "", publishedAuthorId: "", rejectedPostId: "" }
  }

  const linkedMedia = await CommunityMedia.find({
    contentType: "post",
    contentId: post._id.toString(),
  }).sort({ createdAt: 1 })

  const attachedMediaIds = getPostAttachedMediaIds(post)
  const imageSource = orderMediaByIds(
    linkedMedia.filter((item: any) => item.mediaType === "image"),
    attachedMediaIds.imageMediaIds,
  )
  const videoSource = orderMediaByIds(
    linkedMedia.filter((item: any) => item.mediaType === "video"),
    attachedMediaIds.videoMediaIds,
  )

  const approvedImages = imageSource
    .filter((item: any) => item.mediaType === "image" && item.status === "approved" && item.publicUrl)
    .map((item: any) => String(item.publicUrl).trim())
    .filter(Boolean)
    .slice(0, 4)

  const approvedVideos = videoSource
    .filter((item: any) => item.mediaType === "video" && item.status === "approved" && item.publicUrl)
    .map((item: any) => String(item.publicUrl).trim())
    .filter(Boolean)
    .slice(0, 1)

  const hasPendingMedia = [...imageSource, ...videoSource].some((item: any) => ["pending_review", "processing"].includes(String(item.status || "")))
  const pendingReviewSource = String(post.moderation?.metadata?.attachedMedia?.pendingReviewSource || "")
  const shouldPublish =
    !hasPendingMedia &&
    post.moderation?.status === "pending_review" &&
    Boolean(post.moderation?.metadata?.attachedMedia?.hasPendingMedia) &&
    pendingReviewSource === "media"
  const shouldRejectPost =
    (action === "reject" || action === "hide") &&
    post.moderation?.status === "pending_review" &&
    pendingReviewSource === "media"

  post.images = approvedImages
  post.videos = approvedVideos

  if (shouldPublish) {
    post.moderation = {
      ...(post.moderation?.toObject?.() || post.moderation || {}),
      status: "approved",
      provider: "manual",
      reviewedAt: new Date(),
    }
    post.status = getPublicationStatusForModeration("approved")
  }

  if (shouldRejectPost) {
    post.moderation = {
      ...(post.moderation?.toObject?.() || post.moderation || {}),
      status: "rejected",
      provider: "manual",
      reviewedAt: new Date(),
      reasons: Array.from(new Set([...(Array.isArray(post.moderation?.reasons) ? post.moderation.reasons : []), "media:rejected-by-admin"])),
    }
    post.status = "hidden"
  }

  await post.save()

  return {
    publishedPostId: shouldPublish ? post._id.toString() : "",
    publishedAuthorId: shouldPublish ? post.author?.toString?.() || "" : "",
    rejectedPostId: shouldRejectPost ? post._id.toString() : "",
  }
}

async function syncLinkedMediaEntity(media: any, action: "approve" | "reject" | "hide") {
  const contentType = String(media.contentType || "")
  if (contentType === "profile" || contentType === "cover") {
    const user = await User.findById(media.owner)
    if (!user) return
    const field = contentType === "profile" ? "avatar" : "coverImage"
    const pendingField = contentType === "profile" ? "pendingAvatarMediaId" : "pendingCoverMediaId"
    if (action === "approve" && media.publicUrl) user[field] = media.publicUrl
    if (String(user[pendingField] || "") === media._id.toString()) user[pendingField] = null
    await user.save()
    return
  }

  if (contentType === "story") {
    const story = await CommunityStory.findOne({ mediaId: media._id })
    if (!story) return
    if (action === "approve" && media.publicUrl) {
      if (media.mediaType === "video") {
        story.mediaType = "video"
        story.video = media.publicUrl
        story.image = ""
      } else {
        story.mediaType = "image"
        story.image = media.publicUrl
        story.video = ""
      }
      story.status = "published"
      story.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      story.moderation = {
        ...(story.moderation?.toObject?.() || story.moderation || {}),
        status: "approved",
        provider: "manual",
        reviewedAt: new Date(),
      }
    } else if (action === "reject" || action === "hide") {
      story.status = "hidden"
      story.moderation = {
        ...(story.moderation?.toObject?.() || story.moderation || {}),
        status: "rejected",
        provider: "manual",
        reviewedAt: new Date(),
      }
    }
    await story.save()
  }
}

async function markMissingStoryMedia(params: { story: any; media: any; adminId: any; reviewedAt: Date }) {
  const { story, media, adminId, reviewedAt } = params

  media.status = "failed"
  media.pendingKey = ""
  media.moderation = {
    ...(media.moderation?.toObject?.() || media.moderation || {}),
    status: "rejected",
    provider: "manual",
    reviewedBy: adminId,
    reviewedAt,
    reasons: Array.from(new Set([...(Array.isArray(media.moderation?.reasons) ? media.moderation.reasons : []), "media:pending-file-missing"])),
  }
  await media.save()

  story.status = "hidden"
  story.image = ""
  story.video = ""
  story.moderation = {
    ...(story.moderation?.toObject?.() || story.moderation || {}),
    status: "rejected",
    provider: "manual",
    reviewedBy: adminId,
    reviewedAt,
    reasons: Array.from(new Set([...(Array.isArray(story.moderation?.reasons) ? story.moderation.reasons : []), "story:linked-media-missing"])),
  }
  await story.save()
}

async function markMissingStandaloneMedia(params: { media: any; adminId: any; reviewedAt: Date }) {
  const { media, adminId, reviewedAt } = params
  media.status = "failed"
  media.pendingKey = ""
  media.moderation = {
    ...(media.moderation?.toObject?.() || media.moderation || {}),
    status: "rejected",
    provider: "manual",
    reviewedBy: adminId,
    reviewedAt,
    reasons: Array.from(new Set([...(Array.isArray(media.moderation?.reasons) ? media.moderation.reasons : []), "media:pending-file-missing"])),
  }
  await media.save()
}

async function resolveRevisionMediaUrls(revision: any, mediaType: "image" | "video") {
  const field = mediaType === "image" ? "imageMediaIds" : "videoMediaIds"
  const fallback = mediaType === "image" ? "images" : "videos"
  if (!Array.isArray(revision?.[field])) {
    return {
      ready: true,
      urls: Array.isArray(revision?.[fallback]) ? revision[fallback].filter((item: unknown) => typeof item === "string" && item.trim()) : [],
    }
  }

  const ids = revision[field].filter((item: unknown) => typeof item === "string" && item.trim())
  if (!ids.length) return { ready: true, urls: [] }

  const records = await CommunityMedia.find({ _id: { $in: ids }, mediaType })
  const byId = new Map(records.map((record: any) => [record._id.toString(), record]))
  const orderedRecords = ids.map((mediaId: string) => byId.get(mediaId))
  const ready = orderedRecords.every((record: any) => record?.status === "approved" && record.publicUrl)

  return {
    ready,
    urls: orderedRecords
      .filter((record: any) => record?.status === "approved" && typeof record.publicUrl === "string" && record.publicUrl.trim())
      .map((record: any) => record.publicUrl.trim()),
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    const admin = await requireAdminRoles(request, ["superadmin", "admincommunity"])
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const action = String(body.action || "").trim()
    const userAction = String(body.userAction || "").trim() as "" | "warn" | "restrict" | "suspend" | "ban"
    const { contentType, sourceId } = resolveTarget(id)
    const Model = getModel(contentType)

    if (!Model || !sourceId) return errorResponse("Moderation target not found", 404)

    const target = await Model.findById(sourceId)
    if (!target) return errorResponse("Moderation target not found", 404)

    if (contentType === "image") {
      if (action === "approve" && target.status === "approved" && !target.pendingKey) {
        return errorResponse("Image is already approved", 409)
      }
      if ((action === "reject" || action === "hide") && target.status === "rejected" && !target.pendingKey) {
        return errorResponse("Image was already reviewed", 409)
      }
    }

    const reviewedAt = new Date()
    let moderationStatus: ModerationStatus = "pending_review"
    let publishedLinkedPostId = ""
    let publishedLinkedPostAuthorId = ""
    let handledPendingRevision = false
    let shouldNotifyFriendsForApprovedPost = false
    let shouldRegisterStrikeForTarget = true

    if (action === "approve") moderationStatus = "approved"
    if (action === "reject") moderationStatus = "rejected"
    if (action === "hide") moderationStatus = "approved"
    if (!["approve", "reject", "hide"].includes(action)) return errorResponse("Validation failed", 422)

    if (contentType === "post" && target.hasPendingRevision && target.pendingRevision && (action === "approve" || action === "reject")) {
      const revision = target.pendingRevision
      const revisionModeration = revision.moderation || {}
      const currentAttachedMediaIds = getPostAttachedMediaIds(target)
      const approvedRevisionImageIds = Array.isArray(revision.imageMediaIds)
        ? revision.imageMediaIds.map((item: unknown) => String(item))
        : currentAttachedMediaIds.imageMediaIds
      const approvedRevisionVideoIds = Array.isArray(revision.videoMediaIds)
        ? revision.videoMediaIds.map((item: unknown) => String(item))
        : currentAttachedMediaIds.videoMediaIds

      if (action === "approve") {
        const [revisionImages, revisionVideos] = await Promise.all([
          resolveRevisionMediaUrls(revision, "image"),
          resolveRevisionMediaUrls(revision, "video"),
        ])

        if (!revisionImages.ready || !revisionVideos.ready) {
          return errorResponse("Revision media is still pending review", 409)
        }

        target.content = String(revision.content || target.content || "")
        target.category = String(revision.category || target.category || "general")
        target.tags = Array.isArray(revision.tags) ? revision.tags : []
        target.teamIds = Array.isArray(revision.teamIds) ? revision.teamIds.map((item: unknown) => String(item)) : Array.isArray(target.teamIds) ? target.teamIds : []
        target.playerIds = Array.isArray(revision.playerIds) ? revision.playerIds.map((item: unknown) => String(item)) : Array.isArray(target.playerIds) ? target.playerIds : []
        target.images = revisionImages.urls.slice(0, 4)
        target.videos = revisionVideos.urls.slice(0, 1)
        target.status = getPublicationStatusForModeration("approved")
        target.moderation = {
          ...(target.moderation?.toObject?.() || target.moderation || {}),
          ...revisionModeration,
          status: "approved",
          provider: "manual",
          reviewedBy: admin._id,
          reviewedAt,
          reasons: Array.isArray(revisionModeration.reasons) ? revisionModeration.reasons : [],
          metadata: {
            ...(revisionModeration.metadata || {}),
            approvedRevision: true,
            baseEditVersion: revision.baseEditVersion || null,
            attachedMedia: {
              imageMediaIds: approvedRevisionImageIds,
              videoMediaIds: approvedRevisionVideoIds,
              hasPendingMedia: false,
              pendingReviewSource: "",
            },
            personalization: {
              teamIds: target.teamIds,
              playerIds: target.playerIds,
              contentType: target.category,
            },
          },
        }
        target.lastEditedAt = reviewedAt
        target.editVersion = Number(target.editVersion || 1) + 1
      } else {
        target.pendingRevision = null
        target.hasPendingRevision = false
        handledPendingRevision = true
        shouldRegisterStrikeForTarget = false
      }

      if (action === "approve") {
        target.pendingRevision = null
        target.hasPendingRevision = false
        handledPendingRevision = true
      }
    }

    if (!handledPendingRevision && (contentType === "image" || contentType === "video")) {
      target.status = action === "hide" ? "rejected" : action === "approve" ? "approved" : "rejected"
      target.provider = "manual"
      target.reviewedBy = admin._id
      target.reviewedAt = reviewedAt
      target.moderation = {
        ...(target.moderation?.toObject?.() || target.moderation || {}),
        status: action === "approve" ? "approved" : "rejected",
        provider: "manual",
        reviewedBy: admin._id,
        reviewedAt,
        reasons:
          Array.isArray(target.reasons) && target.reasons.length
            ? target.reasons
            : Array.isArray(target.moderation?.reasons)
              ? target.moderation.reasons
              : [],
        scores: target.scores || target.moderation?.scores || {},
      }
    } else if (!handledPendingRevision) {
      target.moderation = {
        ...(target.moderation?.toObject?.() || target.moderation || {}),
        status: moderationStatus,
        provider: "manual",
        reviewedBy: admin._id,
        reviewedAt,
      }
    }

    if (contentType === "post" && !handledPendingRevision) {
      target.status = action === "hide" ? "hidden" : getPublicationStatusForModeration(moderationStatus)
      shouldNotifyFriendsForApprovedPost = action === "approve"
    }
    if (contentType === "comment") {
      await syncApprovedCommentState(target, action)
      target.isApproved = action === "approve"
    }
    if (contentType === "story") {
      target.status = action === "hide" ? "hidden" : getPublicationStatusForModeration(moderationStatus)
      if (action === "approve") {
        target.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
        if (target.mediaId) {
          const linkedMedia = await CommunityMedia.findById(target.mediaId)
          if (linkedMedia) {
            if (linkedMedia.mediaType === "image" && linkedMedia.pendingKey) {
              const pendingExists = await fileExists("pending", linkedMedia.pendingKey)
              if (!pendingExists) {
                await markMissingStoryMedia({ story: target, media: linkedMedia, adminId: admin._id, reviewedAt })
                return errorResponse("Linked story media file is missing. Re-upload is required.", 409)
              }
              const approved = await movePendingFileToApproved({
                pendingKey: linkedMedia.pendingKey,
                storedName: linkedMedia.storedName,
                approvedDirectory: "images",
              })
              linkedMedia.publicUrl = approved.publicUrl
              linkedMedia.approvedKey = approved.relativeKey
              linkedMedia.pendingKey = ""
            }

            if (linkedMedia.mediaType === "video" && linkedMedia.pendingKey) {
              const pendingExists = await fileExists("pending", linkedMedia.pendingKey)
              if (!pendingExists) {
                await markMissingStoryMedia({ story: target, media: linkedMedia, adminId: admin._id, reviewedAt })
                return errorResponse("Linked story media file is missing. Re-upload is required.", 409)
              }
              const approved = await movePendingFileToApproved({
                pendingKey: linkedMedia.pendingKey,
                storedName: linkedMedia.storedName,
                approvedDirectory: "videos",
              })
              linkedMedia.publicUrl = approved.publicUrl
              linkedMedia.approvedKey = approved.relativeKey
              linkedMedia.pendingKey = ""
            }

            linkedMedia.status = "approved"
            linkedMedia.moderation = {
              ...(linkedMedia.moderation?.toObject?.() || linkedMedia.moderation || {}),
              status: "approved",
              provider: "manual",
              reviewedBy: admin._id,
              reviewedAt,
            }
            await linkedMedia.save()
            await syncLinkedMediaEntity(linkedMedia, "approve")
          }
        }
      }
    }
    if (contentType === "image") {
      if (action === "approve" && target.pendingKey) {
        const pendingExists = await fileExists("pending", target.pendingKey)
        if (!pendingExists) {
          await markMissingStandaloneMedia({ media: target, adminId: admin._id, reviewedAt })
          return errorResponse("Pending media file is missing. Re-upload is required.", 409)
        }
        const approved = await movePendingFileToApproved({
          pendingKey: target.pendingKey,
          storedName: target.storedName,
          approvedDirectory: "images",
        })
        target.publicUrl = approved.publicUrl
        target.approvedKey = approved.relativeKey
        target.pendingKey = ""
      }
      if ((action === "reject" || action === "hide") && target.pendingKey) {
        await deletePendingFile(target.pendingKey)
        target.pendingKey = ""
      }
    }
    if (contentType === "video") {
      if (action === "approve" && target.pendingKey) {
        const pendingExists = await fileExists("pending", target.pendingKey)
        if (!pendingExists) {
          await markMissingStandaloneMedia({ media: target, adminId: admin._id, reviewedAt })
          return errorResponse("Pending media file is missing. Re-upload is required.", 409)
        }
        const approved = await movePendingFileToApproved({
          pendingKey: target.pendingKey,
          storedName: target.storedName,
          approvedDirectory: "videos",
        })
        target.publicUrl = approved.publicUrl
        target.approvedKey = approved.relativeKey
        target.pendingKey = ""
      }
      if ((action === "reject" || action === "hide") && target.pendingKey) {
        await deletePendingFile(target.pendingKey)
        target.pendingKey = ""
      }
      if ((action === "reject" || action === "hide") && target.processingKey) {
        await deleteProcessingFile(target.processingKey)
        target.processingKey = ""
      }
    }

    await target.save()

    if ((contentType === "image" || contentType === "video") && ["approve", "reject", "hide"].includes(action)) {
      const linkedPostResult = await syncLinkedPostMedia(target, action as "approve" | "reject" | "hide")
      await syncLinkedMediaEntity(target, action as "approve" | "reject" | "hide")
      publishedLinkedPostId = linkedPostResult.publishedPostId
      publishedLinkedPostAuthorId = linkedPostResult.publishedAuthorId
    }

    const targetAuthorId = getTargetAuthorId(target, contentType)
    if (userAction && targetAuthorId) {
      await applyUserModerationAction({ userId: targetAuthorId, action: userAction })
      await notifyUserModerationAction({
        recipientId: targetAuthorId,
        action: userAction,
        referenceType: contentType,
        referenceId: sourceId,
      })
    }

    await createModerationLog({
      userId: targetAuthorId,
      contentType: contentType as "post" | "comment" | "story" | "image" | "video",
      contentId: sourceId,
      status: moderationStatus,
      action: userAction ? `${action}_${userAction}` : action,
      reasons: Array.isArray(target.moderation?.reasons) ? target.moderation.reasons : Array.isArray(target.reasons) ? target.reasons : [],
      scores: target.moderation?.scores || target.scores || {},
      provider: "manual",
      reviewedBy: admin._id.toString(),
    })

    if (targetAuthorId) {
      if (action === "approve") {
        await notifyContentModerationOutcome({
          recipientId: targetAuthorId,
          outcome: "approved",
          contentType: contentType === "comment" ? "post" : (contentType as "post" | "story" | "image" | "video"),
          contentId: sourceId,
        })
      }
      if (action === "reject") {
        await notifyContentModerationOutcome({
          recipientId: targetAuthorId,
          outcome: "rejected",
          contentType: contentType === "comment" ? "post" : (contentType as "post" | "story" | "image" | "video"),
          contentId: sourceId,
        })
        if (shouldRegisterStrikeForTarget) {
          await registerModerationStrike({
            userId: targetAuthorId,
            contentType: contentType as "post" | "comment" | "story" | "image" | "video",
            contentId: sourceId,
            reasons: Array.isArray(target.moderation?.reasons) ? target.moderation.reasons : Array.isArray(target.reasons) ? target.reasons : [],
            reviewedBy: admin._id.toString(),
          })
        }
      }
      if (action === "hide") {
        await notifyContentModerationOutcome({
          recipientId: targetAuthorId,
          outcome: "hidden",
          contentType: contentType === "comment" ? "post" : (contentType as "post" | "story" | "image" | "video"),
          contentId: sourceId,
        })
        if (shouldRegisterStrikeForTarget) {
          await registerModerationStrike({
            userId: targetAuthorId,
            contentType: contentType as "post" | "comment" | "story" | "image" | "video",
            contentId: sourceId,
            reasons: Array.isArray(target.moderation?.reasons) ? target.moderation.reasons : Array.isArray(target.reasons) ? target.reasons : [],
            reviewedBy: admin._id.toString(),
          })
        }
      }
    }

    if (handledPendingRevision && targetAuthorId) {
      await createCommunityNotification({
        recipientId: targetAuthorId,
        type: action === "approve" ? "community_content_approved" : "community_content_rejected",
        postId: sourceId,
        referenceType: "post_revision",
        message: action === "approve" ? "การแก้ไขโพสต์ของคุณผ่านการตรวจแล้ว" : "การแก้ไขโพสต์ของคุณไม่ผ่านการตรวจ โพสต์เดิมยังคงอยู่",
        dedupeKey: `post-revision-${action}:${sourceId}:${target.editVersion || "same"}:${targetAuthorId}`,
      })
    }

    if (contentType === "post" && action === "approve" && targetAuthorId && shouldNotifyFriendsForApprovedPost) {
      await awardCommunityFanBadges({
        userId: targetAuthorId,
        action: target.matchId ? "match_room_post_created" : "post_created",
        eventKey: `post:${sourceId}:published`,
        postId: sourceId,
        matchId: target.matchId || "",
      })
      await notifyFriendsAboutApprovedPost({
        authorId: targetAuthorId,
        actorId: targetAuthorId,
        postId: sourceId,
      })
    }

    if ((contentType === "image" || contentType === "video") && publishedLinkedPostId && publishedLinkedPostAuthorId) {
      await notifyFriendsAboutApprovedPost({
        authorId: publishedLinkedPostAuthorId,
        actorId: publishedLinkedPostAuthorId,
        postId: publishedLinkedPostId,
      })
    }

    return ok({
      message: "Moderation updated",
      item: {
        id,
        sourceId,
        contentType,
        status: moderationStatus,
        publishStatus: contentType === "comment" ? undefined : target.status || getPublicationStatusForModeration(moderationStatus),
        reviewedAt,
        linkedPostId: publishedLinkedPostId || undefined,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update moderation"
    return errorResponse(message, message === "Admin authentication required" ? 401 : message === "Admin permission denied" ? 403 : 500)
  }
}
