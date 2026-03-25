import { NextRequest } from "next/server"

import { signToken, sanitizeUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { User } from "@/lib/server/models"

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    const body = await request.json()
    const name = String(body.name || "").trim()
    const email = String(body.email || "").trim().toLowerCase()
    const password = String(body.password || "")
    const avatar = typeof body.avatar === "string" ? body.avatar.trim() : ""
    const favoriteTeam = typeof body.favoriteTeam === "string" ? body.favoriteTeam.trim() : ""
    const bio = typeof body.bio === "string" ? body.bio.trim() : ""

    if (name.length < 2 || name.length > 80) {
      return errorResponse("ชื่อต้องมี 2-80 ตัวอักษร", 422, [{ path: "name" }])
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse("กรุณากรอกอีเมลให้ถูกต้อง", 422, [{ path: "email" }])
    }
    if (password.length < 6) {
      return errorResponse("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร", 422, [{ path: "password" }])
    }
    if (bio.length > 280) {
      return errorResponse("แนะนำตัวต้องไม่เกิน 280 ตัวอักษร", 422, [{ path: "bio" }])
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return errorResponse("อีเมลนี้ถูกใช้งานแล้ว", 409, [{ path: "email" }])
    }

    const existingName = await User.findOne({
      name: { $regex: `^${escapeRegExp(name)}$`, $options: "i" },
    })
    if (existingName) {
      return errorResponse("ชื่อนี้ถูกใช้งานแล้ว", 409, [{ path: "name" }])
    }

    const user = await User.create({
      name,
      email,
      password,
      avatar,
      favoriteTeam,
      bio,
    })

    return ok(
      {
        token: signToken({ sub: user._id.toString(), role: user.role }),
        user: sanitizeUser(user),
      },
      { status: 201 },
    )
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Register failed", 500)
  }
}
