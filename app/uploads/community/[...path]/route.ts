import path from "path"

import { NextRequest, NextResponse } from "next/server"

import { readApprovedFile } from "@/lib/server/community-upload"

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".m4v": "video/x-m4v",
}

export async function GET(_request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path: segments } = await context.params
    const relativeKey = Array.isArray(segments) ? segments.join("/") : ""
    if (!relativeKey) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    const buffer = await readApprovedFile(relativeKey)
    const extension = path.extname(relativeKey).toLowerCase()
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPES[extension] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 })
  }
}
