#!/usr/bin/env node

require("dotenv").config()

const mongoose = require("mongoose")

const APPLY = process.argv.includes("--apply")
const now = new Date()
const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI")
  process.exit(1)
}

async function main() {
  await mongoose.connect(MONGODB_URI)
  const posts = mongoose.connection.collection("communityposts")
  const reports = mongoose.connection.collection("communityreports")

  const closedTemporaryFilter = {
    isRoomMessage: true,
    contentType: "room_message",
    roomType: { $in: ["preview", "post_match"] },
    roomClosedAt: { $lte: now },
    archivedAt: null,
  }
  const expiredTemporaryFilter = {
    isRoomMessage: true,
    contentType: "room_message",
    roomType: { $in: ["preview", "post_match"] },
    roomExpiresAt: { $lte: now },
  }

  const [closedCount, expiredMessages] = await Promise.all([
    posts.countDocuments(closedTemporaryFilter),
    posts.find(expiredTemporaryFilter, { projection: { _id: 1 } }).toArray(),
  ])
  const expiredIds = expiredMessages.map((item) => item._id.toString())
  const activeReportCount = expiredIds.length
    ? await reports.countDocuments({
        targetType: "room_message",
        targetId: { $in: expiredIds },
        status: { $ne: "resolved" },
      })
    : 0

  console.log(JSON.stringify({
    mode: APPLY ? "apply" : "dry-run",
    now: now.toISOString(),
    closedTemporaryMessagesToArchive: closedCount,
    expiredTemporaryMessages: expiredMessages.length,
    activeReportsOnExpiredMessages: activeReportCount,
    hardDelete: false,
    mediaDelete: false,
  }, null, 2))

  if (APPLY && closedCount > 0) {
    const result = await posts.updateMany(closedTemporaryFilter, {
      $set: {
        archivedAt: now,
        "moderation.metadata.temporaryRoomArchivedAt": now.toISOString(),
      },
    })
    console.log(`Archived metadata updated: ${result.modifiedCount || 0}`)
  }

  await mongoose.disconnect()
}

main().catch(async (error) => {
  console.error(error)
  await mongoose.disconnect().catch(() => undefined)
  process.exit(1)
})
