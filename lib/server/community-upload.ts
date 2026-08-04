import { randomUUID } from "crypto"
import { copyFile, mkdir, readFile, rename, rm, writeFile } from "fs/promises"
import { existsSync } from "fs"
import os from "os"
import path from "path"

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"])
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".m4v"])

type PendingDirectoryType = "images" | "videos" | "stories"
type ProcessingDirectoryType = "videos" | "frames" | "audio"
type ApprovedDirectoryType = "images" | "videos"

function sanitizeExtension(filename: string, fallback = ".bin") {
  const ext = path.extname(filename || "").toLowerCase()
  if (IMAGE_EXTENSIONS.has(ext) || VIDEO_EXTENSIONS.has(ext)) return ext
  return fallback
}

function sanitizeStoredName(filename: string) {
  return `${randomUUID()}${sanitizeExtension(filename, ".bin")}`
}

async function getPendingStorageRoot() {
  if (process.env.COMMUNITY_PENDING_STORAGE_DIR?.trim()) {
    return process.env.COMMUNITY_PENDING_STORAGE_DIR.trim()
  }
  const defaultPath = path.join(process.cwd(), "storage", "community-moderation", "pending")
  return existsSync(defaultPath) ? defaultPath : path.join(os.tmpdir(), "community-moderation", "pending")
}

function getProcessingStorageRoot() {
  if (process.env.COMMUNITY_PROCESSING_STORAGE_DIR?.trim()) {
    return process.env.COMMUNITY_PROCESSING_STORAGE_DIR.trim()
  }
  const defaultPath = path.join(process.cwd(), "storage", "community-moderation", "processing")
  return existsSync(defaultPath) ? defaultPath : path.join(os.tmpdir(), "community-moderation", "processing")
}

function getApprovedStorageRoot() {
  if (process.env.COMMUNITY_APPROVED_STORAGE_DIR?.trim()) {
    return process.env.COMMUNITY_APPROVED_STORAGE_DIR.trim()
  }
  const defaultPath = path.join(process.cwd(), "public", "uploads", "community")
  return existsSync(defaultPath) ? defaultPath : path.join(os.tmpdir(), "community-moderation", "approved")
}

function resolveSafePath(baseDir: string, relativeKey: string) {
  const normalizedKey = relativeKey.replace(/^[/\\]+/, "")
  const resolved = path.resolve(baseDir, normalizedKey)
  const resolvedBase = path.resolve(baseDir)
  if (!resolved.startsWith(`${resolvedBase}${path.sep}`) && resolved !== resolvedBase) {
    throw new Error("Invalid storage path")
  }
  return resolved
}

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true })
}

export async function readCommunityUploadBuffer(file: File) {
  return Buffer.from(await file.arrayBuffer())
}

export async function saveApprovedFileFromBuffer(params: {
  file: File
  bytes: Buffer
  directory: ApprovedDirectoryType
}) {
  const storedName = sanitizeStoredName(params.file.name)
  const relativeKey = path.posix.join(params.directory, storedName)
  const absoluteDir = path.join(getApprovedStorageRoot(), params.directory)
  await ensureDir(absoluteDir)
  await writeFile(path.join(absoluteDir, storedName), params.bytes)

  return {
    storedName,
    relativeKey,
    publicUrl: `/uploads/community/${relativeKey}`,
  }
}

export async function savePendingFileFromBuffer(params: {
  file: File
  bytes: Buffer
  directory: PendingDirectoryType
}) {
  const storedName = sanitizeStoredName(params.file.name)
  const relativeKey = path.posix.join(params.directory, storedName)
  const absoluteDir = path.join(getPendingStorageRoot(), params.directory)
  await ensureDir(absoluteDir)
  await writeFile(path.join(absoluteDir, storedName), params.bytes)

  return {
    storedName,
    relativeKey,
  }
}

export async function saveProcessingFileFromBuffer(params: {
  file: File
  bytes: Buffer
  directory: ProcessingDirectoryType
}) {
  const storedName = sanitizeStoredName(params.file.name)
  const relativeKey = path.posix.join(params.directory, storedName)
  const absoluteDir = path.join(getProcessingStorageRoot(), params.directory)
  await ensureDir(absoluteDir)
  await writeFile(path.join(absoluteDir, storedName), params.bytes)

  return {
    storedName,
    relativeKey,
  }
}

export async function movePendingFileToApproved(params: {
  pendingKey: string
  storedName?: string
  approvedDirectory: ApprovedDirectoryType
}) {
  const source = resolveSafePath(getPendingStorageRoot(), params.pendingKey)
  const storedName = params.storedName || path.basename(params.pendingKey)
  const destinationDir = path.join(getApprovedStorageRoot(), params.approvedDirectory)
  const destination = path.join(destinationDir, storedName)

  await ensureDir(destinationDir)
  try {
    await rename(source, destination)
  } catch {
    await copyFile(source, destination)
    await rm(source, { force: true })
  }

  return {
    relativeKey: path.posix.join(params.approvedDirectory, storedName),
    publicUrl: `/uploads/community/${path.posix.join(params.approvedDirectory, storedName)}`,
  }
}

export async function deletePendingFile(relativeKey: string) {
  const absolutePath = resolveSafePath(getPendingStorageRoot(), relativeKey)
  await rm(absolutePath, { force: true })
}

export async function deleteProcessingFile(relativeKey: string) {
  const absolutePath = resolveSafePath(getProcessingStorageRoot(), relativeKey)
  await rm(absolutePath, { force: true })
}

export async function readPendingFile(relativeKey: string) {
  const absolutePath = resolveSafePath(getPendingStorageRoot(), relativeKey)
  return readFile(absolutePath)
}

export async function fileExists(baseDir: "pending" | "processing" | "approved", relativeKey: string) {
  const root =
    baseDir === "pending" ? getPendingStorageRoot() : baseDir === "processing" ? getProcessingStorageRoot() : getApprovedStorageRoot()
  try {
    await access(resolveSafePath(root, relativeKey))
    return true
  } catch {
    return false
  }
}

export async function cleanupExpiredPendingFiles(expiredKeys: string[]) {
  for (const key of expiredKeys) {
    await deletePendingFile(key)
  }
}

export async function saveCommunityUploadFromBuffer(file: File, bytes: Buffer) {
  const directory: ApprovedDirectoryType = file.type.startsWith("video/") ? "videos" : "images"
  const saved = await saveApprovedFileFromBuffer({ file, bytes, directory })
  return saved.publicUrl
}

export async function saveCommunityUpload(file: File) {
  const bytes = await readCommunityUploadBuffer(file)
  return saveCommunityUploadFromBuffer(file, bytes)
}
