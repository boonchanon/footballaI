import { NextRequest } from "next/server"

import { signToken, sanitizeUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { User } from "@/lib/server/models"

export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    const body = await request.json()
    const email = String(body.email || "").trim().toLowerCase()
    const password = String(body.password || "")

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
      return errorResponse("Validation failed", 422)
    }

    const user = await User.findOne({ email })
    if (!user || !(await user.comparePassword(password))) {
      return errorResponse("Invalid email or password", 401)
    }

    return ok({
      token: signToken({ sub: user._id.toString(), role: user.role }),
      user: sanitizeUser(user),
    })
  } catch (error) {
    console.error("POST /api/auth/login failed", error)
    return errorResponse(error instanceof Error ? error.message : "Login failed", 500)
  }
}
