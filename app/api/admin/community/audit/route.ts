import { NextRequest } from "next/server"

import { requireAdminRoles } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok, parsePagination } from "@/lib/server/http"
import { ModerationLog } from "@/lib/server/models"

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    await requireAdminRoles(request, ["superadmin", "admincommunity"])
    const searchParams = request.nextUrl.searchParams
    const { page, limit, skip } = parsePagination(searchParams)
    const action = String(searchParams.get("action") || "").trim()
    const contentType = String(searchParams.get("contentType") || "").trim()
    const targetUser = String(searchParams.get("targetUser") || "").trim()
    const matchId = String(searchParams.get("matchId") || "").trim()
    const actor = String(searchParams.get("actor") || "").trim()
    const date = String(searchParams.get("date") || "").trim()

    const filter: Record<string, unknown> = {}
    if (action) filter.action = { $regex: action, $options: "i" }
    if (contentType) filter.contentType = contentType
    if (targetUser) filter.$or = [{ user: targetUser }, { "metadata.targetUserId": targetUser }]
    if (matchId) filter["metadata.matchId"] = matchId
    if (date) {
      const start = new Date(date)
      if (!Number.isNaN(start.getTime())) {
        const end = new Date(start)
        end.setDate(end.getDate() + 1)
        filter.createdAt = { $gte: start, $lt: end }
      }
    }

    const query = ModerationLog.find(filter).populate("reviewedBy", "email role").populate("user", "name email").sort({ createdAt: -1 }).skip(skip).limit(limit)
    if (actor) {
      query.populate({ path: "reviewedBy", match: { email: { $regex: actor, $options: "i" } }, select: "email role" })
    }

    const [rows, total] = await Promise.all([query.lean(), ModerationLog.countDocuments(filter)])
    const items = rows
      .filter((row: any) => !actor || row.reviewedBy)
      .map((row: any) => ({
        id: row._id.toString(),
        action: row.action,
        contentType: row.contentType,
        contentId: row.contentId,
        status: row.status,
        reasons: row.reasons || [],
        metadata: row.metadata || {},
        admin: row.reviewedBy ? { email: row.reviewedBy.email || "", role: row.reviewedBy.role || "" } : null,
        targetUser: row.user ? { name: row.user.name || row.user.email || "ผู้ใช้งาน", email: row.user.email || "" } : null,
        createdAt: row.createdAt,
      }))

    return ok({ items, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load audit log"
    return errorResponse(message, message === "Admin authentication required" ? 401 : message === "Admin permission denied" ? 403 : 500)
  }
}
