import { NextRequest, NextResponse } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { saveCommunityUpload } from "@/lib/server/community-upload"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { CommunityUploadAsset } from "@/lib/server/models"

export const runtime = "nodejs"

function normalizeBinary(data: unknown) {
  if (!data) return null
  if (Buffer.isBuffer(data)) return data
  if (data instanceof Uint8Array) return Buffer.from(data)

  if (typeof data === "object" && data !== null) {
    const candidate = data as {
      type?: string
      data?: number[]
      buffer?: ArrayBufferLike
    }

    if (candidate.type === "Buffer" && Array.isArray(candidate.data)) {
      return Buffer.from(candidate.data)
    }

    if (candidate.buffer instanceof ArrayBuffer) {
      return Buffer.from(candidate.buffer)
    }
  }

  return null
}

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    const id = String(request.nextUrl.searchParams.get("id") || "").trim()

    if (!id) {
      return errorResponse("กรุณาระบุไฟล์ที่ต้องการ", 422)
    }

    const asset = await CommunityUploadAsset.findById(id).select("filename mimeType size data")
    const bytes = normalizeBinary(asset?.data)

    if (!asset || !bytes) {
      return errorResponse("ไม่พบไฟล์ที่ต้องการ", 404)
    }

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": asset.mimeType || "application/octet-stream",
        "Content-Length": String(asset.size || bytes.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": `inline; filename="${asset.filename || "community-upload"}"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "เปิดไฟล์ไม่สำเร็จ"
    return errorResponse(message, 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthUser(request)
    const formData = await request.formData()
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

    const allowedTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-m4v",
    ])

    for (const file of files) {
      if (!allowedTypes.has(file.type)) {
        return errorResponse("รองรับเฉพาะไฟล์รูป JPG, PNG, WEBP และวิดีโอ MP4, WEBM, MOV", 422)
      }

      const maxFileSize = file.type.startsWith("video/") ? 30 * 1024 * 1024 : 5 * 1024 * 1024
      if (file.size > maxFileSize) {
        return errorResponse(file.type.startsWith("video/") ? "วิดีโอแต่ละไฟล์ต้องไม่เกิน 30MB" : "รูปภาพแต่ละไฟล์ต้องไม่เกิน 5MB", 422)
      }
    }

    const urls = await Promise.all(files.map((file) => saveCommunityUpload(file, String(user._id))))
    return ok({ urls }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "อัปโหลดไฟล์ไม่สำเร็จ"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
