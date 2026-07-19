import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { saveCommunityUpload } from "@/lib/server/community-upload"
import { errorResponse, ok } from "@/lib/server/http"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    await requireAuthUser(request)
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

    const urls = await Promise.all(files.map((file) => saveCommunityUpload(file)))
    return ok({ urls }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload image"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
