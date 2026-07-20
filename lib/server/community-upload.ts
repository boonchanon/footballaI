import { connectDatabase } from "@/lib/server/db"
import { CommunityUploadAsset } from "@/lib/server/models"

function sanitizeFilename(filename: string) {
  const ext = (filename.match(/\.[a-zA-Z0-9]+$/)?.[0] || "").toLowerCase()
  const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov", ".webm", ".m4v"].includes(ext) ? ext : ".jpg"
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`
}

function getAssetKind(type: string) {
  return type.startsWith("video/") ? "video" : "image"
}

export async function saveCommunityUpload(file: File, ownerId?: string) {
  await connectDatabase()

  const bytes = Buffer.from(await file.arrayBuffer())
  const mimeType = String(file.type || "application/octet-stream").trim()
  const filename = sanitizeFilename(file.name)

  const asset = await CommunityUploadAsset.create({
    owner: ownerId || null,
    filename,
    mimeType,
    size: bytes.length,
    kind: getAssetKind(mimeType),
    data: bytes,
  })

  return `/api/community/upload?id=${asset._id.toString()}`
}
