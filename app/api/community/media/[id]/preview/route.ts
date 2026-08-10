import { NextRequest } from "next/server"

import { getAuthUser, requireAdminRoles } from "@/lib/server/auth"
import { fileExists, readPendingFile } from "@/lib/server/community-upload"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse } from "@/lib/server/http"
import { CommunityMedia } from "@/lib/server/models"

export const runtime = "nodejs"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    const { id } = await params
    const media = await CommunityMedia.findById(id).select("owner mediaType status pendingKey mimeType")
    if (!media || media.status !== "pending_review" || !media.pendingKey || !["image", "video"].includes(String(media.mediaType || ""))) {
      return errorResponse("Preview not available", 404)
    }

    const viewer = await getAuthUser(request)
    const isOwner = Boolean(viewer?._id && viewer._id.toString() === media.owner?.toString())
    if (!isOwner) {
      await requireAdminRoles(request, ["superadmin", "admincommunity"])
    }

    const pendingExists = await fileExists("pending", media.pendingKey)
    if (!pendingExists) {
      return errorResponse("Preview not available", 404)
    }

    const buffer = await readPendingFile(media.pendingKey)
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": media.mimeType || "image/jpeg",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load preview"
    const status =
      message === "Authentication required" || message === "Admin authentication required"
        ? 401
        : message === "Admin permission denied"
          ? 403
          : message.includes("ENOENT") || message.includes("no such file")
            ? 404
            : 500
    return errorResponse(message === "Admin authentication required" || message === "Admin permission denied" ? message : "Preview not available", status)
  }
}
