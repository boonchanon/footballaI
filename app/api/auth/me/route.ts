import { NextRequest } from "next/server"

import { requireAuthUser, sanitizeUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { deleteUserAccount } from "@/lib/server/user-account"

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

    if (typeof body.name !== "undefined") {
      const name = String(body.name || "").trim()
      if (name.length < 2 || name.length > 80) {
        return errorResponse("Validation failed", 422)
      }
      user.name = name
    }
    if (typeof body.avatar !== "undefined") user.avatar = String(body.avatar || "").trim()
    if (typeof body.coverImage !== "undefined") user.coverImage = String(body.coverImage || "").trim()
    if (typeof body.coverPositionX !== "undefined") {
      const value = Number(body.coverPositionX)
      user.coverPositionX = Number.isFinite(value) ? Math.max(-40, Math.min(40, value)) : 0
    }
    if (typeof body.coverPositionY !== "undefined") {
      const value = Number(body.coverPositionY)
      user.coverPositionY = Number.isFinite(value) ? Math.max(-40, Math.min(40, value)) : 0
    }
    if (typeof body.coverScale !== "undefined") {
      const value = Number(body.coverScale)
      user.coverScale = Number.isFinite(value) ? Math.max(1, Math.min(1.8, value)) : 1
    }
    if (typeof body.favoriteTeam !== "undefined") user.favoriteTeam = String(body.favoriteTeam || "").trim()
    if (typeof body.bio !== "undefined") {
      const bio = String(body.bio || "").trim()
      if (bio.length > 280) {
        return errorResponse("Validation failed", 422)
      }
      user.bio = bio
    }

    await user.save?.()
    return ok({ user: sanitizeUser(user) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Profile update failed"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const body = await request.json().catch(() => ({}))
    const currentPassword = String(body.currentPassword || "")
    const hasSocialLogin = Boolean((user as any).googleId || (user as any).facebookId)

    if (!hasSocialLogin) {
      if (!currentPassword) {
        return errorResponse("Current password is required", 422)
      }

      const isValid = await user.comparePassword?.(currentPassword)
      if (!isValid) {
        return errorResponse("Current password is incorrect", 401)
      }
    }

    await deleteUserAccount(user._id.toString())
    return ok({ message: "Account deleted successfully" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Account deletion failed"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
