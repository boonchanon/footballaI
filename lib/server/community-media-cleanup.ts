import { fileExists } from "@/lib/server/community-upload"
import { CommunityMedia, CommunityStory } from "@/lib/server/models"

function getApprovedKeyFromMedia(media: any) {
  const approvedKey = String(media?.approvedKey || "").trim()
  if (approvedKey) return approvedKey

  const publicUrl = String(media?.publicUrl || "").trim()
  const marker = "/uploads/community/"
  const markerIndex = publicUrl.indexOf(marker)
  if (markerIndex === -1) return ""
  return publicUrl.slice(markerIndex + marker.length).replace(/^\/+/, "")
}

function getApprovedKeyFromStoryAsset(url: string) {
  const value = String(url || "").trim()
  if (!value) return ""
  const marker = "/uploads/community/"
  const markerIndex = value.indexOf(marker)
  if (markerIndex === -1) return ""
  return value.slice(markerIndex + marker.length).replace(/^\/+/, "")
}

async function hasUsableMediaFile(media: any) {
  const status = String(media?.status || "")
  const pendingKey = String(media?.pendingKey || "").trim()

  if (status === "pending_review") {
    return pendingKey ? fileExists("pending", pendingKey) : false
  }

  if (status === "approved") {
    const approvedKey = getApprovedKeyFromMedia(media)
    return approvedKey ? fileExists("approved", approvedKey) : false
  }

  return true
}

export async function cleanupBrokenStandaloneMedia(media: any) {
  if (!media) return false
  if (await hasUsableMediaFile(media)) return false

  media.status = "failed"
  media.pendingKey = ""
  media.approvedKey = ""
  media.publicUrl = ""
  media.moderation = {
    ...(media.moderation?.toObject?.() || media.moderation || {}),
    status: "rejected",
    provider: "local",
    reviewedAt: new Date(),
    reasons: Array.from(new Set([...(Array.isArray(media.moderation?.reasons) ? media.moderation.reasons : []), "media:file-missing-auto-cleanup"])),
  }
  await media.save()
  return true
}

export async function cleanupBrokenStory(story: any) {
  const legacyImageKey = getApprovedKeyFromStoryAsset(String(story?.image || ""))
  const legacyVideoKey = getApprovedKeyFromStoryAsset(String(story?.video || ""))

  if (!story?.mediaId) {
    const hasLegacyImage = legacyImageKey ? await fileExists("approved", legacyImageKey) : true
    const hasLegacyVideo = legacyVideoKey ? await fileExists("approved", legacyVideoKey) : true

    if (hasLegacyImage && hasLegacyVideo) return false

    story.status = "hidden"
    story.image = ""
    story.video = ""
    story.moderation = {
      ...(story.moderation?.toObject?.() || story.moderation || {}),
      status: "rejected",
      provider: "local",
      reviewedAt: new Date(),
      reasons: Array.from(
        new Set([
          ...(Array.isArray(story.moderation?.reasons) ? story.moderation.reasons : []),
          "story:legacy-media-missing-auto-cleanup",
        ]),
      ),
    }
    await story.save()
    return true
  }

  if (!story?.mediaId) return false

  const media = await CommunityMedia.findById(story.mediaId)
  if (!media) {
    story.status = "hidden"
    story.image = ""
    story.video = ""
    story.moderation = {
      ...(story.moderation?.toObject?.() || story.moderation || {}),
      status: "rejected",
      provider: "local",
      reviewedAt: new Date(),
      reasons: Array.from(new Set([...(Array.isArray(story.moderation?.reasons) ? story.moderation.reasons : []), "story:linked-media-record-missing-auto-cleanup"])),
    }
    await story.save()
    return true
  }

  if (await hasUsableMediaFile(media)) return false

  media.status = "failed"
  media.pendingKey = ""
  media.approvedKey = ""
  media.publicUrl = ""
  media.moderation = {
    ...(media.moderation?.toObject?.() || media.moderation || {}),
    status: "rejected",
    provider: "local",
    reviewedAt: new Date(),
    reasons: Array.from(new Set([...(Array.isArray(media.moderation?.reasons) ? media.moderation.reasons : []), "media:file-missing-auto-cleanup"])),
  }
  await media.save()

  story.status = "hidden"
  story.image = ""
  story.video = ""
  story.moderation = {
    ...(story.moderation?.toObject?.() || story.moderation || {}),
    status: "rejected",
    provider: "local",
    reviewedAt: new Date(),
    reasons: Array.from(new Set([...(Array.isArray(story.moderation?.reasons) ? story.moderation.reasons : []), "story:linked-media-missing-auto-cleanup"])),
  }
  await story.save()
  return true
}

export async function cleanupBrokenStories(stories: any[]) {
  const removedIds = new Set<string>()
  for (const story of stories) {
    if (await cleanupBrokenStory(story)) {
      removedIds.add(String(story._id))
    }
  }
  return removedIds
}

export async function cleanupBrokenMediaItems(mediaItems: any[]) {
  const removedIds = new Set<string>()
  for (const media of mediaItems) {
    if (await cleanupBrokenStandaloneMedia(media)) {
      removedIds.add(String(media._id))
    }
  }
  return removedIds
}

export async function cleanupBrokenStoryById(storyId: string) {
  const story = await CommunityStory.findById(storyId)
  if (!story) return false
  return cleanupBrokenStory(story)
}
