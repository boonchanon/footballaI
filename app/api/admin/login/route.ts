import { NextRequest } from "next/server"

import { ADMIN_ROLE_LABELS, isAdminRole } from "@/lib/admin-access"
import { signToken } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { Admin } from "@/lib/server/models"

function sanitizeAdmin(admin: any) {
  const resolvedRole = isAdminRole(admin.role) ? admin.role : "admin"

  return {
    id: admin._id.toString(),
    name: ADMIN_ROLE_LABELS[resolvedRole],
    email: admin.email,
    avatar: "",
    favoriteTeam: "",
    bio: "",
    role: resolvedRole,
    createdAt: admin.createdAt,
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    const body = await request.json()
    const email = String(body.email || "").trim().toLowerCase()
    const password = String(body.password || "")

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse("กรุณากรอกอีเมลให้ถูกต้อง", 422)
    }

    if (!password) {
      return errorResponse("กรุณากรอกรหัสผ่าน", 422)
    }

    const admin = await Admin.findOne({ email })
    if (!admin || admin.isActive === false || !(await admin.comparePassword(password))) {
      return errorResponse("อีเมลหรือรหัสผ่านแอดมินไม่ถูกต้อง", 401)
    }

    return ok({
      token: signToken({
        sub: admin._id.toString(),
        role: admin.role,
        type: "admin",
      }),
      user: sanitizeAdmin(admin),
    })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Admin login failed", 500)
  }
}
