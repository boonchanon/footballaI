import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok, parsePagination } from "@/lib/server/http"
import { Favorite } from "@/lib/server/models"

const allowedTypes = new Set(["team", "player", "match", "article", "post"])

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const { page, limit, skip } = parsePagination(request.nextUrl.searchParams)

    const [items, total] = await Promise.all([
      Favorite.find({ user: user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Favorite.countDocuments({ user: user._id }),
    ])

    return ok({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load favorites"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const body = await request.json()

    const itemType = String(body.itemType || "")
    const itemId = String(body.itemId || "").trim()
    const title = String(body.title || "").trim()

    if (!allowedTypes.has(itemType) || !itemId || !title) {
      return errorResponse("Validation failed", 422)
    }

    const existing = await Favorite.findOne({ user: user._id, itemType, itemId })
    if (existing) {
      return errorResponse("Favorite already exists", 409)
    }

    const item = await Favorite.create({
      user: user._id,
      itemType,
      itemId,
      title,
      subtitle: typeof body.subtitle === "string" ? body.subtitle : "",
      image: typeof body.image === "string" ? body.image : "",
      meta: body.meta || {},
    })

    return ok({ item }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save favorite"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
