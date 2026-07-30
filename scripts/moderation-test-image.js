#!/usr/bin/env node
require("dotenv").config({ path: ".env.local" })

const fs = require("fs/promises")
const path = require("path")
const { compileTypeScriptFiles, loadCompiledModule } = require("./load-compiled-module")

async function main() {
  const imagePath = process.argv[2]
  if (!imagePath) {
    console.error('Usage: npm run moderation:test-image -- "/path/to/image.jpg"')
    process.exit(1)
  }

  const absolutePath = path.resolve(imagePath)
  const ext = path.extname(absolutePath).toLowerCase()
  const mimeType =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ""

  if (!mimeType) {
    console.error("Unsupported image extension. Use .jpg, .jpeg, .png, or .webp")
    process.exit(1)
  }

  const bytes = await fs.readFile(absolutePath)
  const dataUrl = `data:${mimeType};base64,${bytes.toString("base64")}`
  const compilation = compileTypeScriptFiles([
    "lib/server/ai-moderation.ts",
    "lib/server/models.ts",
    "lib/server/community-notifications.ts",
    "lib/server/content-moderation.ts",
  ])

  try {
    const { moderateCommunityImage } = loadCompiledModule(compilation, "lib/server/content-moderation.js")
    const result = await moderateCommunityImage({ dataUrl })
    const metadata = result.metadata || {}

    console.log(JSON.stringify({
      file: path.basename(absolutePath),
      mimeType,
      size: bytes.length,
      imageSafetyAttempted: metadata.imageSafetyAttempted === true,
      imageSafetySucceeded: metadata.imageSafetySucceeded === true,
      imageSafetyErrorCode: metadata.imageSafetyErrorCode || "",
      imageSafetyCategories: Array.isArray(metadata.imageSafetyCategories) ? metadata.imageSafetyCategories : [],
      ocrAttempted: metadata.imageTextExtractionAttempted === true,
      ocrSucceeded: metadata.imageTextExtractionSucceeded === true,
      ocrErrorCode: metadata.imageTextExtractionErrorCode || "",
      extractedText: String(metadata.extractedTextPreview || ""),
      extractedTextLength: Number(metadata.extractedTextLength || 0),
      detectedGamblingTerms: Array.isArray(metadata.detectedGamblingTerms) ? metadata.detectedGamblingTerms : [],
      detectedPromotionTerms: Array.isArray(metadata.detectedPromotionTerms) ? metadata.detectedPromotionTerms : [],
      detectedContactTerms: Array.isArray(metadata.detectedContactTerms) ? metadata.detectedContactTerms : [],
      detectedUrls: Array.isArray(metadata.detectedUrls) ? metadata.detectedUrls : [],
      detectedDomains: Array.isArray(metadata.detectedDomains) ? metadata.detectedDomains : [],
      qrAttempted: metadata.qrAttempted === true,
      qrSucceeded: metadata.qrSucceeded === true,
      qrDestinations: Array.isArray(metadata.qrDestinations) ? metadata.qrDestinations : [],
      textModerationStatus: metadata.imageTextModerationStatus || "",
      finalStatus: result.status,
      finalReasons: result.reasons,
    }, null, 2))
  } finally {
    compilation.cleanup()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
