import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { CommunityPost, CommunityReport } from "@/lib/server/models"

const REPORT_REASONS = new Set(["harassment", "inappropriate", "misinformation", "gambling", "spam", "other"])

export async function POST(request: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const { messageId } = await params
    const body = await request.json().catch(() => ({}))
    const matchId = String(body.matchId || request.nextUrl.searchParams.get("matchId") || "").trim()
    const reason = REPORT_REASONS.has(String(body.reason || "")) ? String(body.reason) : "other"
    const note = String(body.note || "").trim().slice(0, 500)

    const message = await CommunityPost.findOne({
      _id: messageId,
      ...(matchId ? { matchId } : {}),
      isRoomMessage: true,
      contentType: "room_message",
      status: { $ne: "hidden" },
    }).select("_id author")
    if (!message) return errorResponse("Message not found", 404)
    if (message.author?.toString?.() === user._id.toString()) return errorResponse("You cannot report your own message", 422)

    const existing = await CommunityReport.findOne({
      targetType: "room_message",
      targetId: message._id.toString(),
      reporter: user._id,
    }).select("_id")
    if (existing) return ok({ success: true, idempotent: true })

    await CommunityReport.create({
      post: message._id,
      targetType: "room_message",
      targetId: message._id.toString(),
      reporter: user._id,
      reason,
      description: note,
    })
    await CommunityPost.findByIdAndUpdate(message._id, { $inc: { reportsCount: 1 } })

    return ok({ success: true }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to report room message"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
