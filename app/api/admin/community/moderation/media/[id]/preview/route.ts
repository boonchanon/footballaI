import { NextRequest } from "next/server"

import { requireAdminRoles } from "@/lib/server/auth"
import { readPendingFile } from "@/lib/server/community-upload"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse } from "@/lib/server/http-utils"
import { CommunityMedia } from "@/lib/server/models"

export const runtime = "nodejs"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    await requireAdminRoles(request, ["superadmin", "admincommunity"])
    const { id } = await params
    const media = await CommunityMedia.findById(id).select("mediaType status pendingKey mimeType")
    if (!media || media.mediaType !== "image" || !media.pendingKey) {
      return errorResponse("Preview not available", 404)
    }

    const buffer = await readPendingFile(media.pendingKey)
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": media.mimeType || "image/jpeg",
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load preview"
    return errorResponse(message, message === "Admin authentication required" ? 401 : message === "Admin permission denied" ? 403 : 500)
  }
}
