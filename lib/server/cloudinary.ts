import { createHash, randomUUID } from "crypto"
import path from "path"

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"])
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".m4v"])

type CloudinaryResourceType = "image" | "video" | "raw"

function requireEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

export function isCloudinaryEnabled() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim(),
  )
}

function getCloudinaryConfig() {
  return {
    cloudName: requireEnv("CLOUDINARY_CLOUD_NAME"),
    apiKey: requireEnv("CLOUDINARY_API_KEY"),
    apiSecret: requireEnv("CLOUDINARY_API_SECRET"),
    folderPrefix: process.env.CLOUDINARY_COMMUNITY_FOLDER?.trim() || "footballai/community",
  }
}

function sanitizeExtension(filename: string, fallback = ".bin") {
  const ext = path.extname(filename || "").toLowerCase()
  if (IMAGE_EXTENSIONS.has(ext) || VIDEO_EXTENSIONS.has(ext)) return ext
  return fallback
}

function toUploadSignature(params: Record<string, string>, apiSecret: string) {
  const base = Object.entries(params)
    .filter(([, value]) => value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&")
  return createHash("sha1").update(`${base}${apiSecret}`).digest("hex")
}

function toDataUri(bytes: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${bytes.toString("base64")}`
}

function getResourceType(mimeType: string) {
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("image/")) return "image"
  return "raw"
}

function toAssetKey(params: { resourceType: CloudinaryResourceType; publicId: string; secureUrl: string }) {
  return `cloudinary:${encodeURIComponent(params.resourceType)}:${encodeURIComponent(params.publicId)}:${encodeURIComponent(params.secureUrl)}`
}

export function parseCloudinaryAssetKey(key: string) {
  if (!key.startsWith("cloudinary:")) return null
  const [, resourceTypePart, publicIdPart, secureUrlPart] = key.split(":")
  if (!resourceTypePart || !publicIdPart || !secureUrlPart) return null
  return {
    resourceType: decodeURIComponent(resourceTypePart) as CloudinaryResourceType,
    publicId: decodeURIComponent(publicIdPart),
    secureUrl: decodeURIComponent(secureUrlPart),
  }
}

export async function uploadCommunityAssetToCloudinary(params: {
  bytes: Buffer
  filename: string
  mimeType: string
  folder: string
}) {
  const { cloudName, apiKey, apiSecret, folderPrefix } = getCloudinaryConfig()
  const resourceType = getResourceType(params.mimeType)
  const ext = sanitizeExtension(params.filename, resourceType === "image" ? ".jpg" : resourceType === "video" ? ".mp4" : ".bin")
  const publicId = `${folderPrefix}/${params.folder}/${randomUUID()}${ext}`
  const timestamp = `${Math.floor(Date.now() / 1000)}`
  const signature = toUploadSignature(
    {
      folder: "",
      public_id: publicId,
      timestamp,
      use_filename: "false",
      unique_filename: "false",
    },
    apiSecret,
  )

  const formData = new FormData()
  formData.set("file", toDataUri(params.bytes, params.mimeType))
  formData.set("api_key", apiKey)
  formData.set("timestamp", timestamp)
  formData.set("public_id", publicId)
  formData.set("use_filename", "false")
  formData.set("unique_filename", "false")
  formData.set("signature", signature)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
    method: "POST",
    body: formData,
  })

  const payload = (await response.json().catch(() => null)) as
    | { secure_url?: string; public_id?: string; resource_type?: string; bytes?: number; format?: string; error?: { message?: string } }
    | null

  if (!response.ok || !payload?.secure_url || !payload?.public_id) {
    throw new Error(payload?.error?.message || "Cloudinary upload failed")
  }

  return {
    storedName: path.basename(payload.public_id),
    relativeKey: toAssetKey({
      resourceType: (payload.resource_type as CloudinaryResourceType) || resourceType,
      publicId: payload.public_id,
      secureUrl: payload.secure_url,
    }),
    publicUrl: payload.secure_url,
    secureUrl: payload.secure_url,
    publicId: payload.public_id,
    resourceType: (payload.resource_type as CloudinaryResourceType) || resourceType,
  }
}

export async function deleteCloudinaryAsset(key: string) {
  const parsed = parseCloudinaryAssetKey(key)
  if (!parsed) return

  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig()
  const timestamp = `${Math.floor(Date.now() / 1000)}`
  const signature = toUploadSignature(
    {
      public_id: parsed.publicId,
      timestamp,
    },
    apiSecret,
  )

  const formData = new FormData()
  formData.set("public_id", parsed.publicId)
  formData.set("api_key", apiKey)
  formData.set("timestamp", timestamp)
  formData.set("signature", signature)

  await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${parsed.resourceType}/destroy`, {
    method: "POST",
    body: formData,
  }).catch(() => undefined)
}

export async function fetchCloudinaryAssetBuffer(key: string) {
  const parsed = parseCloudinaryAssetKey(key)
  if (!parsed) throw new Error("Invalid cloudinary asset key")
  const response = await fetch(parsed.secureUrl, { cache: "no-store" })
  if (!response.ok) throw new Error(`Cloudinary asset unavailable: ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

export async function cloudinaryAssetExists(key: string) {
  const parsed = parseCloudinaryAssetKey(key)
  if (!parsed) return false

  const headResponse = await fetch(parsed.secureUrl, { method: "HEAD", cache: "no-store" }).catch(() => null)
  if (headResponse?.ok) return true
  if (headResponse && headResponse.status !== 405) return false

  const getResponse = await fetch(parsed.secureUrl, { method: "GET", cache: "no-store" }).catch(() => null)
  return Boolean(getResponse?.ok)
}
