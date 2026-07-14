import { NextRequest } from "next/server"

import { requireAdminRoles } from "@/lib/server/auth"
import { mapAdminCommunityPost } from "@/lib/server/community-admin"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok, parsePagination } from "@/lib/server/http-utils"
import { CommunityPost } from "@/lib/server/models"

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    const admin = await requireAdminRoles(request, ["superadmin", "admincommunity"])
    const searchParams = request.nextUrl.searchParams
    const { page, limit, skip } = parsePagination(searchParams)
    const q = String(searchParams.get("q") || "").trim()
    const status = String(searchParams.get("status") || "all").trim()

    const filter: Record<string, unknown> = {}
    if (status !== "all") filter.status = status
    if (q) {
      filter.$or = [{ title: { $regex: q, $options: "i" } }, { content: { $regex: q, $options: "i" } }]
    }

    const [posts, total, counts] = await Promise.all([
      CommunityPost.find(filter)
        .populate("author", "name avatar favoriteTeam role")
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CommunityPost.countDocuments(filter),
      Promise.all([
        CommunityPost.countDocuments({}),
        CommunityPost.countDocuments({ status: "published" }),
        CommunityPost.countDocuments({ status: "flagged" }),
        CommunityPost.countDocuments({ status: "hidden" }),
      ]),
    ])

    return ok({
      items: posts.map((post: any) => mapAdminCommunityPost(post, { role: admin.role })),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      stats: { total: counts[0], published: counts[1], flagged: counts[2], hidden: counts[3] },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load admin community posts"
    return errorResponse(message, message === "Admin authentication required" ? 401 : message === "Admin permission denied" ? 403 : 500)
  }
}
