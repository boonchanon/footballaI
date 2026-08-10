#!/usr/bin/env node
require("dotenv").config({ path: ".env.local" })

const { compileTypeScriptFiles, loadCompiledModule } = require("./load-compiled-module")

function getApprovedKeyFromAssetUrl(url) {
  const value = String(url || "").trim()
  if (!value) return ""
  const marker = "/uploads/community/"
  const markerIndex = value.indexOf(marker)
  if (markerIndex === -1) return ""
  return value.slice(markerIndex + marker.length).replace(/^\/+/, "")
}

async function main() {
  const shouldApply = process.argv.includes("--apply")
  const compilation = compileTypeScriptFiles([
    "lib/server/db.ts",
    "lib/server/models.ts",
    "lib/server/community-upload.ts",
  ])

  try {
    const { connectDatabase } = loadCompiledModule(compilation, "lib/server/db.js")
    const { CommunityStory, CommunityMedia } = loadCompiledModule(compilation, "lib/server/models.js")
    const { fileExists } = loadCompiledModule(compilation, "lib/server/community-upload.js")

    await connectDatabase()

    const [stories, mediaItems] = await Promise.all([
      CommunityStory.find({
        mediaId: null,
        $or: [{ image: { $regex: "^/uploads/community/" } }, { video: { $regex: "^/uploads/community/" } }],
      })
        .select("_id image video status moderation")
        .lean(),
      CommunityMedia.find({
        publicUrl: { $regex: "^/uploads/community/" },
      })
        .select("_id mediaType status publicUrl approvedKey moderation")
        .lean(),
    ])

    const storyUpdates = []
    for (const story of stories) {
      const imageKey = getApprovedKeyFromAssetUrl(story.image)
      const videoKey = getApprovedKeyFromAssetUrl(story.video)
      const hasImage = imageKey ? await fileExists("approved", imageKey) : true
      const hasVideo = videoKey ? await fileExists("approved", videoKey) : true

      if (hasImage && hasVideo) continue

      storyUpdates.push({
        id: String(story._id),
        reason: "story:legacy-media-missing-auto-cleanup",
        hasImage,
        hasVideo,
      })
    }

    const mediaUpdates = []
    for (const media of mediaItems) {
      const approvedKey = String(media.approvedKey || "").trim() || getApprovedKeyFromAssetUrl(media.publicUrl)
      const hasAsset = approvedKey ? await fileExists("approved", approvedKey) : false

      if (hasAsset) continue

      mediaUpdates.push({
        id: String(media._id),
        reason: "media:legacy-public-url-missing-auto-cleanup",
        mediaType: String(media.mediaType || ""),
        status: String(media.status || ""),
      })
    }

    console.log(
      JSON.stringify(
        {
          mode: shouldApply ? "apply" : "dry-run",
          storiesScanned: stories.length,
          storiesToCleanup: storyUpdates.length,
          mediaScanned: mediaItems.length,
          mediaToCleanup: mediaUpdates.length,
          sampleStoryIds: storyUpdates.slice(0, 10).map((item) => item.id),
          sampleMediaIds: mediaUpdates.slice(0, 10).map((item) => item.id),
        },
        null,
        2,
      ),
    )

    if (!shouldApply) return

    for (const item of storyUpdates) {
      await CommunityStory.updateOne(
        { _id: item.id },
        {
          $set: {
            status: "hidden",
            image: "",
            video: "",
            "moderation.status": "rejected",
            "moderation.provider": "local",
            "moderation.reviewedAt": new Date(),
          },
          $addToSet: {
            "moderation.reasons": item.reason,
          },
        },
      )
    }

    for (const item of mediaUpdates) {
      await CommunityMedia.updateOne(
        { _id: item.id },
        {
          $set: {
            status: "failed",
            publicUrl: "",
            approvedKey: "",
            pendingKey: "",
            "moderation.status": "rejected",
            "moderation.provider": "local",
            "moderation.reviewedAt": new Date(),
          },
          $addToSet: {
            "moderation.reasons": item.reason,
          },
        },
      )
    }

    console.log(
      JSON.stringify(
        {
          applied: true,
          storiesCleaned: storyUpdates.length,
          mediaCleaned: mediaUpdates.length,
        },
        null,
        2,
      ),
    )
  } finally {
    compilation.cleanup()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
