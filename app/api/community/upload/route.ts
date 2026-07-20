import { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { saveCommunityUpload } from "@/lib/server/community-upload"
import { errorResponse, ok } from "@/lib/server/http"
import { CommunityUploadAsset } from "@/lib/server/models"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    const id = String(request.nextUrl.searchParams.get("id") || "").trim()
    if (!id) return errorResponse("กรุณาระบุไฟล์ที่ต้องการ", 422)

    const asset = await CommunityUploadAsset.findById(id).lean()
    if (!asset?.data) return errorResponse("ไม่พบไฟล์ที่ต้องการ", 404)

    return new NextResponse(asset.data, {
      status: 200,
      headers: {
        "Content-Type": asset.mimeType || "application/octet-stream",
        "Content-Length": String(asset.size || 0),
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

    if (files.length === 0) return errorResponse("No files uploaded", 422)
    if (files.length > 4) return errorResponse("You can upload up to 4 files", 422)

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "video/quicktime", "video/x-m4v"])
    for (const file of files) {
      if (!allowedTypes.has(file.type)) return errorResponse("Unsupported file type", 422)
      const maxFileSize = file.type.startsWith("video/") ? 30 * 1024 * 1024 : 5 * 1024 * 1024
      if (file.size > maxFileSize) {
        return errorResponse(file.type.startsWith("video/") ? "Each video must be 30MB or smaller" : "Each file must be 5MB or smaller", 422)
      }
    }

    const urls = await Promise.all(files.map((file) => saveCommunityUpload(file, String(user._id))))
    return ok({ urls }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "อัปโหลดไฟล์ไม่สำเร็จ"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
