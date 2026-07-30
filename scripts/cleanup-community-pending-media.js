#!/usr/bin/env node

require("dotenv").config()

const mongoose = require("mongoose")

async function main() {
  const { MONGODB_URI } = process.env
  if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI")
  }

  await mongoose.connect(MONGODB_URI)
  const { CommunityMedia } = require("../lib/server/models")
  const { cleanupExpiredPendingFiles } = require("../lib/server/community-upload")

  const expired = await CommunityMedia.find({
    status: "pending_review",
    mediaType: "image",
    pendingKey: { $ne: "" },
    expiresAt: { $lte: new Date() },
  }).select("_id pendingKey")

  const keys = expired.map((item) => item.pendingKey).filter(Boolean)
  if (keys.length > 0) {
    await cleanupExpiredPendingFiles(keys)
    await CommunityMedia.updateMany(
      { _id: { $in: expired.map((item) => item._id) } },
      { $set: { status: "failed", technicalStatus: "expired_cleanup", pendingKey: "" } },
    )
  }

  console.log(JSON.stringify({ cleaned: keys.length }, null, 2))
  await mongoose.disconnect()
}

main().catch(async (error) => {
  console.error(error)
  try {
    await mongoose.disconnect()
  } catch {}
  process.exit(1)
})
