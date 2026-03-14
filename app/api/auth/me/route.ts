import { NextRequest } from "next/server"

import { requireAuthUser, sanitizeUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    return ok({ user: sanitizeUser(user) })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Authentication required", 401)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const body = await request.json()

    if (typeof body.name !== "undefined") user.name = String(body.name || "").trim()
    if (typeof body.avatar !== "undefined") user.avatar = String(body.avatar || "").trim()
    if (typeof body.favoriteTeam !== "undefined") user.favoriteTeam = String(body.favoriteTeam || "").trim()
    if (typeof body.bio !== "undefined") user.bio = String(body.bio || "").trim()

    await user.save?.()
    return ok({ user: sanitizeUser(user) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Profile update failed"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
