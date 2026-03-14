import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { User } from "@/lib/server/models"

export async function PATCH(request: NextRequest) {
  try {
    await connectDatabase()
    const authUser = await requireAuthUser(request)
    const body = await request.json()
    const currentPassword = String(body.currentPassword || "")
    const newPassword = String(body.newPassword || "")

    if (!currentPassword || newPassword.length < 6) {
      return errorResponse("Validation failed", 422)
    }

    const user = await User.findById(authUser._id)
    if (!user || !(await user.comparePassword(currentPassword))) {
      return errorResponse("Current password is incorrect", 401)
    }

    user.password = newPassword
    await user.save()

    return ok({ message: "Password updated successfully" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Password update failed"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
