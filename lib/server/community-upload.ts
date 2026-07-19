import { mkdir, writeFile } from "fs/promises"
import path from "path"

function sanitizeFilename(filename: string) {
  const ext = path.extname(filename || "").toLowerCase()
  const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov", ".webm", ".m4v"].includes(ext) ? ext : ".jpg"
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`
}

export async function saveCommunityUpload(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer())
  const filename = sanitizeFilename(file.name)
  const uploadDir = path.join(process.cwd(), "public", "uploads", "community")

  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, filename), bytes)

  return `/uploads/community/${filename}`
}
