#!/usr/bin/env node
require("dotenv").config({ path: ".env.local" })

const { compileTypeScriptFiles, loadCompiledModule } = require("./load-compiled-module")

async function main() {
  const limitArg = Number(process.argv[2] || "20")
  const limit = Number.isFinite(limitArg) && limitArg > 0 ? Math.min(limitArg, 100) : 20

  const compilation = compileTypeScriptFiles([
    "lib/server/db.ts",
    "lib/server/models.ts",
  ])

  try {
    const { connectDatabase } = loadCompiledModule(compilation, "lib/server/db.js")
    const { CommunityMedia } = loadCompiledModule(compilation, "lib/server/models.js")

    await connectDatabase()

    const items = await CommunityMedia.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("_id owner status moderation provider publicUrl metadata reasons createdAt")
      .lean()

    const rows = items.map((item) => ({
      id: String(item._id),
      owner: item.owner ? String(item.owner) : "",
      status: item.status || "",
      moderationStatus: item.moderation?.status || "",
      moderationReasons: Array.isArray(item.moderation?.reasons) ? item.moderation.reasons : Array.isArray(item.reasons) ? item.reasons : [],
      provider: item.moderation?.provider || item.provider || "",
      hasPublicUrl: Boolean(item.publicUrl),
      imageSafetyAttempted: item.moderation?.metadata?.imageSafetyAttempted === true,
      imageSafetySucceeded: item.moderation?.metadata?.imageSafetySucceeded === true,
      ocrAttempted: item.moderation?.metadata?.imageTextExtractionAttempted === true,
      ocrSucceeded: item.moderation?.metadata?.imageTextExtractionSucceeded === true,
      extractedTextLength: Number(item.moderation?.metadata?.extractedTextLength || 0),
      detectedDomains: Array.isArray(item.moderation?.metadata?.detectedDomains) ? item.moderation.metadata.detectedDomains : [],
      qrResult: Array.isArray(item.moderation?.metadata?.qrDestinations) ? item.moderation.metadata.qrDestinations : [],
      createdAt: item.createdAt,
    }))

    console.table(rows)
  } finally {
    compilation.cleanup()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
