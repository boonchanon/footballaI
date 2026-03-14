import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { CommunityPost, CommunityReport } from "@/lib/server/models"

const reasons = new Set(["spam", "abuse", "hate", "off-topic", "other"])

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const { id } = await params
    const body = await request.json()
    const reason = String(body.reason || "")
    const description = typeof body.description === "string" ? body.description : ""

    if (!reasons.has(reason) || description.length > 1000) {
      return errorResponse("Validation failed", 422)
    }

    const post = await CommunityPost.findById(id)
    if (!post) return errorResponse("Post not found", 404)
    if (post.author.toString() === user._id.toString()) {
      return errorResponse("You cannot report your own post", 400)
    }

    const item = await CommunityReport.create({
      post: post._id,
      reporter: user._id,
      reason,
      description,
    })

    post.reportsCount += 1
    if (post.reportsCount > 0 && post.status === "published") {
      post.status = "flagged"
    }
    await post.save()

    return ok({ item }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to report post"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
