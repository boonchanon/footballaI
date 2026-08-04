import { NextRequest } from "next/server"
import path from "path"
import { randomUUID } from "crypto"

import { requireAuthUser } from "@/lib/server/auth"
import {
  readCommunityUploadBuffer,
  saveApprovedFileFromBuffer,
  savePendingFileFromBuffer,
  saveProcessingFileFromBuffer,
} from "@/lib/server/community-upload"
import {
  assertCommunityPostingAllowed,
  createModerationLog,
  moderateCommunityImage,
  notifyContentModerationOutcome,
} from "@/lib/server/content-moderation"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { CommunityMedia } from "@/lib/server/models"

export const runtime = "nodejs"

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"])
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"])
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".m4v"])

function getFileExtension(filename: string) {
  return path.extname(filename || "").toLowerCase()
}

function getRejectedImageMessage(moderationReasons: string[]) {
  if (moderationReasons.some((reason) => reason.includes("gambling") || reason.includes("blocked-domain") || reason.includes("qr-"))) {
    return "รูปภาพนี้มีเนื้อหาชักชวนเล่นพนันหรือช่องทางที่ไม่เป็นไปตามกฎชุมชน กรุณาเลือกรูปอื่น"
  }
  if (moderationReasons.some((reason) => reason.includes("sexual") || reason.includes("violence") || reason.includes("unsafe"))) {
    return "รูปภาพนี้มีเนื้อหาที่ไม่เป็นไปตามกฎชุมชน กรุณาเลือกรูปอื่น"
  }
  return "รูปภาพนี้มีเนื้อหาที่ไม่เป็นไปตามกฎชุมชน กรุณาเลือกรูปอื่น"
}

function logUploadDebug(step: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[community-upload] ${step}`, payload)
  }
}

function truncatePreview(value: string, maxLength = 300) {
  const normalized = String(value || "").trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1)}…`
}

export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    await assertCommunityPostingAllowed(user._id.toString())
    const uploadRequestId = randomUUID()
    const formData = await request.formData()
    const uploadPurpose = String(formData.get("purpose") || "upload").trim()
    const profileTarget = uploadPurpose === "profile" || uploadPurpose === "cover" ? uploadPurpose : ""
    const files = formData.getAll("files").filter((item): item is File => {
      return Boolean(
        item &&
          typeof item === "object" &&
          "arrayBuffer" in item &&
          "name" in item &&
          "type" in item &&
          "size" in item,
      )
    })

    if (files.length === 0) return errorResponse("ยังไม่ได้เลือกไฟล์", 422)
    if (files.length > 4) return errorResponse("อัปโหลดได้สูงสุด 4 ไฟล์ต่อครั้ง", 422)



    logUploadDebug("request", {
      requestId: uploadRequestId,
      userId: user._id.toString(),
      imageModerationEnabled: process.env.IMAGE_MODERATION_ENABLED !== "false",
      imageTextExtractionEnabled: process.env.IMAGE_TEXT_EXTRACTION_ENABLED !== "false",
      imageQrDetectionEnabled: process.env.IMAGE_QR_DETECTION_ENABLED !== "false",
      files: files.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
      })),
    })

    const maxImageSizeMb = Math.max(1, Number(process.env.MAX_COMMUNITY_IMAGE_SIZE_MB || "5"))
    const maxVideoSizeMb = Math.max(5, Number(process.env.COMMUNITY_VIDEO_MAX_SIZE_MB || "30"))
    const allowedTypes = new Set([...IMAGE_TYPES, ...VIDEO_TYPES])
    for (const file of files) {
      if (!allowedTypes.has(file.type)) return errorResponse("Unsupported file type", 422)
      const ext = getFileExtension(file.name)
      if (file.type.startsWith("image/") && !IMAGE_EXTENSIONS.has(ext)) return errorResponse("Unsupported image extension", 422)
      if (file.type.startsWith("video/") && !VIDEO_EXTENSIONS.has(ext)) return errorResponse("Unsupported video extension", 422)
      const maxFileSize = file.type.startsWith("video/") ? maxVideoSizeMb * 1024 * 1024 : maxImageSizeMb * 1024 * 1024
      if (file.size > maxFileSize) {
        return errorResponse(file.type.startsWith("video/") ? `Each video must be ${maxVideoSizeMb}MB or smaller` : `Each file must be ${maxImageSizeMb}MB or smaller`, 422)
      }
    }

    const urls: string[] = []
    const items: Array<Record<string, unknown>> = []
    const pendingItems: Array<Record<string, unknown>> = []
    for (const file of files) {
      if (file.type.startsWith("video/")) {
        const bytes = await readCommunityUploadBuffer(file)
        const processingFile = await saveProcessingFileFromBuffer({ file, bytes, directory: "videos" })
        const media = await CommunityMedia.create({
          owner: user._id,
          contentType: "upload",
          mediaType: "video",
          originalName: file.name,
          storedName: processingFile.storedName,
          mimeType: file.type,
          size: file.size,
          status: "processing",
          processingKey: processingFile.relativeKey,
          reasons: ["video:pipeline-processing"],
          moderation: {
            status: "pending_review",
            reasons: ["video:pipeline-processing"],
            provider: "local",
            metadata: {
              technicalStatus: "queued_for_processing",
            },
          },
          technicalStatus: "queued_for_processing",
          metadata: {
            extension: getFileExtension(file.name),
            moderationStage: "foundation",
            userMessage: "วิดีโอกำลังอยู่ระหว่างการตรวจสอบก่อนเผยแพร่",
          },
        })
        items.push({
          id: media._id.toString(),
          mediaType: "video",
          status: "processing",
          url: null,
          userMessage: "วิดีโอกำลังอยู่ระหว่างการตรวจสอบก่อนเผยแพร่",
        })
        continue
      }

      const bytes = await readCommunityUploadBuffer(file)
      const dataUrl = `data:${file.type};base64,${bytes.toString("base64")}`
      let moderation = await moderateCommunityImage({ dataUrl })
      const moderationMetadata = moderation.metadata || {}

      if (process.env.IMAGE_MODERATION_ENABLED !== "false" && moderationMetadata.imageSafetyAttempted !== true && moderation.status === "approved") {
        moderation = {
          ...moderation,
          status: "pending_review",
          reasons: Array.from(new Set([...(moderation.reasons || []), "image:image-safety-not-attempted"])),
          metadata: {
            ...moderationMetadata,
            failClosedToReview: true,
          },
        }
      }

      logUploadDebug("image-moderation", {
        requestId: uploadRequestId,
        userId: user._id.toString(),
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        imageModerationEnabled: process.env.IMAGE_MODERATION_ENABLED !== "false",
        imageTextExtractionEnabled: process.env.IMAGE_TEXT_EXTRACTION_ENABLED !== "false",
        imageQrDetectionEnabled: process.env.IMAGE_QR_DETECTION_ENABLED !== "false",
        imageSafetyAttempted: moderation.metadata?.imageSafetyAttempted === true,
        imageSafetySucceeded: moderation.metadata?.imageSafetySucceeded === true,
        imageSafetyCategories: Array.isArray(moderation.metadata?.imageSafetyCategories) ? moderation.metadata?.imageSafetyCategories : [],
        ocrAttempted: moderation.metadata?.imageTextExtractionAttempted === true,
        ocrSucceeded: moderation.metadata?.imageTextExtractionSucceeded === true,
        ocrErrorCode: moderation.metadata?.imageTextExtractionErrorCode || "",
        extractedTextPreview: truncatePreview(String(moderation.metadata?.extractedTextPreview || "")),
        extractedTextLength: Number(moderation.metadata?.extractedTextLength || 0),
        detectedGamblingTerms: Array.isArray(moderation.metadata?.detectedGamblingTerms) ? moderation.metadata?.detectedGamblingTerms : [],
        detectedPromotionTerms: Array.isArray(moderation.metadata?.detectedPromotionTerms) ? moderation.metadata?.detectedPromotionTerms : [],
        detectedContactTerms: Array.isArray(moderation.metadata?.detectedContactTerms) ? moderation.metadata?.detectedContactTerms : [],
        detectedUrls: Array.isArray(moderation.metadata?.detectedUrls) ? moderation.metadata?.detectedUrls : [],
        detectedDomains: Array.isArray(moderation.metadata?.detectedDomains) ? moderation.metadata?.detectedDomains : [],
        qrAttempted: moderation.metadata?.qrAttempted === true,
        qrSucceeded: moderation.metadata?.qrSucceeded === true,
        qrDestinations: Array.isArray(moderation.metadata?.qrDestinations) ? moderation.metadata?.qrDestinations : [],
        textModerationStatus: moderation.metadata?.imageTextModerationStatus || "",
        finalMediaStatus: moderation.status,
        finalReasons: moderation.reasons,
        publicUrlCreated: moderation.status === "approved",
      })

      if (moderation.status === "pending_review") {
        const pendingFile = await savePendingFileFromBuffer({ file, bytes, directory: "images" })
        const ttlHours = Math.max(1, Number(process.env.COMMUNITY_PENDING_IMAGE_TTL_HOURS || "24"))
        const media = await CommunityMedia.create({
          owner: user._id,
          contentType: profileTarget || "upload",
          mediaType: "image",
          originalName: file.name,
          storedName: pendingFile.storedName,
          mimeType: file.type,
          size: file.size,
          status: moderation.status,
          pendingKey: pendingFile.relativeKey,
          reasons: moderation.reasons,
          scores: moderation.scores,
          provider: moderation.provider,
          moderation: {
            status: moderation.status,
            reasons: moderation.reasons,
            scores: moderation.scores,
            provider: moderation.provider,
            metadata: moderation.metadata || {},
          },
          expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
          metadata: {
            extension: getFileExtension(file.name),
            ...(moderation.metadata || {}),
            ...(profileTarget ? { profileTarget } : {}),
            userMessage: "รูปภาพนี้กำลังรอการตรวจสอบจากผู้ดูแลระบบ",
          },
        })
        await createModerationLog({
          userId: user._id.toString(),
          contentType: "image",
          contentId: media._id.toString(),
          status: moderation.status,
          action: "upload_pending_review",
          reasons: moderation.reasons,
          scores: moderation.scores,
          provider: moderation.provider,
          metadata: {
            mimeType: file.type,
            size: file.size,
            ...(moderation.metadata || {}),
          },
        })
        await notifyContentModerationOutcome({
          recipientId: user._id.toString(),
          outcome: "pending_review",
          contentType: "image",
          contentId: media._id.toString(),
        })
        pendingItems.push({
          id: media._id.toString(),
          mediaType: "image",
          status: moderation.status,
          url: null,
          reasons: moderation.reasons,
          userMessage: "รูปภาพนี้กำลังรอการตรวจสอบจากผู้ดูแลระบบ",
          ownerPreviewUrl: `/api/community/media/${media._id.toString()}/preview`,
        })
        continue
      }

      if (moderation.status === "rejected") {
        await createModerationLog({
          userId: user._id.toString(),
          contentType: "image",
          contentId: randomUUID(),
          status: moderation.status,
          action: "upload_blocked",
          reasons: moderation.reasons,
          scores: moderation.scores,
          provider: moderation.provider,
          metadata: {
            mimeType: file.type,
            size: file.size,
            ...(moderation.metadata || {}),
          },
        })
        await notifyContentModerationOutcome({
          recipientId: user._id.toString(),
          outcome: "rejected",
          contentType: "image",
          contentId: `rejected-${Date.now()}`,
        })
        return errorResponse(getRejectedImageMessage(moderation.reasons), 422, {
          moderationStatus: moderation.status,
          reasons: moderation.reasons,
        })
      }

      const approved = await saveApprovedFileFromBuffer({ file, bytes, directory: "images" })
      const media = await CommunityMedia.create({
        owner: user._id,
        contentType: profileTarget || "upload",
        mediaType: "image",
        originalName: file.name,
        storedName: approved.storedName,
        mimeType: file.type,
        size: file.size,
        status: "approved",
        publicUrl: approved.publicUrl,
        approvedKey: approved.relativeKey,
        provider: moderation.provider,
        reasons: moderation.reasons,
        scores: moderation.scores,
        moderation: {
          status: "approved",
          reasons: moderation.reasons,
          scores: moderation.scores,
          provider: moderation.provider,
          reviewedAt: new Date(),
          metadata: moderation.metadata || {},
        },
        reviewedAt: new Date(),
          metadata: {
            extension: getFileExtension(file.name),
            ...(moderation.metadata || {}),
            ...(profileTarget ? { profileTarget } : {}),
          },
      })
      urls.push(approved.publicUrl)
      items.push({
        id: media._id.toString(),
        mediaType: "image",
        status: "approved",
        url: approved.publicUrl,
        publicUrl: approved.publicUrl,
        userMessage: "รูปภาพผ่านการตรวจสอบและพร้อมแนบในโพสต์",
      })
    }

    const responseStatus = pendingItems.length > 0 && urls.length === 0 ? 202 : 201
    const normalizedItems = [...items, ...pendingItems]
    logUploadDebug("response", {
      requestId: uploadRequestId,
      userId: user._id.toString(),
      responseStatus,
      urls,
      items: normalizedItems,
    })
    return ok(
      {
        success: true,
        message:
          pendingItems.length > 0 && items.length === 0
            ? "ไฟล์ถูกอัปโหลดแล้วและกำลังรอการตรวจสอบ"
            : "ไฟล์ถูกอัปโหลดเรียบร้อยแล้ว",
        media: normalizedItems.length === 1 ? normalizedItems[0] : null,
        urls,
        items,
        pendingItems,
      },
      { status: responseStatus },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "อัปโหลดไฟล์ไม่สำเร็จ"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
