import { NextRequest } from "next/server"

import { requireAdminRoles } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, getTimeAgoThai, ok, parsePagination } from "@/lib/server/http-utils"
import { CommunityReport } from "@/lib/server/models"

const reasonLabels: Record<string, string> = {
  spam: "สแปม",
  abuse: "คุกคาม",
  hate: "เกลียดชัง",
  "off-topic": "ไม่เกี่ยวกับหัวข้อ",
  other: "อื่น ๆ",
}

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    await requireAdminRoles(request, ["superadmin", "admincommunity"])
    const searchParams = request.nextUrl.searchParams
    const { page, limit, skip } = parsePagination(searchParams)
    const status = String(searchParams.get("status") || "all").trim()

    const filter: Record<string, unknown> = {}
    if (status !== "all") filter.status = status

    const [reports, total, counts] = await Promise.all([
      CommunityReport.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("reporter", "name avatar")
        .populate({
          path: "post",
          select: "title author status",
          populate: { path: "author", select: "name avatar" },
        }),
      CommunityReport.countDocuments(filter),
      Promise.all([
        CommunityReport.countDocuments({}),
        CommunityReport.countDocuments({ status: "pending" }),
        CommunityReport.countDocuments({ status: "resolved" }),
        CommunityReport.countDocuments({ status: "dismissed" }),
      ]),
    ])

    return ok({
      items: reports.map((report: any) => ({
        id: report._id.toString(),
        reason: report.reason,
        reasonLabel: reasonLabels[report.reason] || report.reason,
        description: report.description || "",
        status: report.status,
        resolutionNote: report.resolutionNote || "",
        createdAt: report.createdAt,
        timeAgo: getTimeAgoThai(report.createdAt),
        reportedBy: {
          name: report.reporter?.name || "ผู้ใช้งาน",
          avatar: report.reporter?.avatar || "",
        },
        author: {
          name: report.post?.author?.name || "ผู้ใช้งาน",
          avatar: report.post?.author?.avatar || "",
        },
        post: {
          id: report.post?._id?.toString?.() || "",
          title: report.post?.title || "โพสต์ถูกลบแล้ว",
          status: report.post?.status || "hidden",
        },
      })),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      stats: { total: counts[0], pending: counts[1], resolved: counts[2], dismissed: counts[3] },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load reports"
    return errorResponse(message, message === "Admin authentication required" ? 401 : message === "Admin permission denied" ? 403 : 500)
  }
}
