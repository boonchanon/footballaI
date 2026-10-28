import bcrypt from "bcryptjs"
import { NextRequest } from "next/server"

import { ADMIN_SECTIONS, isAdminRole, isAdminSection } from "@/lib/admin-access"
import { adminFail, mapAdmin } from "@/lib/server/admin-accounts"
import { requireAdminRoles } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { Admin } from "@/lib/server/models"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    await requireAdminRoles(request, ["superadmin"])
    const items = await Admin.find().select("email role permissions isActive createdAt updatedAt").sort({ createdAt: 1 })
    return ok({ items: items.map(mapAdmin) })
  } catch (e) {
    return adminFail(e)
  }
}

// Superadmin creates another admin account (email + password + role + optional permissions).
export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    await requireAdminRoles(request, ["superadmin"])
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") return errorResponse("Invalid request body", 422)

    const email = String(body.email || "").trim().toLowerCase()
    const password = String(body.password || "")
    const role = body.role
    if (!EMAIL_PATTERN.test(email)) return errorResponse("อีเมลไม่ถูกต้อง", 422)
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return errorResponse("รหัสผ่านต้องยาวอย่างน้อย 8 ตัว และมีทั้งตัวอักษรและตัวเลข", 422)
    }
    if (!isAdminRole(role)) return errorResponse("role must be one of superadmin, admin, admincommunity", 422)
    const permissions = Array.isArray(body.permissions) ? body.permissions : []
    if (!permissions.every(isAdminSection)) return errorResponse(`permissions must be a subset of: ${ADMIN_SECTIONS.join(", ")}`, 422)
    if (await Admin.exists({ email })) return errorResponse("มีบัญชีผู้ดูแลที่ใช้อีเมลนี้แล้ว", 409)

    const item = await Admin.create({
      email,
      password: await bcrypt.hash(password, 10),
      role,
      permissions: ADMIN_SECTIONS.filter((section) => permissions.includes(section)),
      isActive: true,
    })
    return ok({ item: mapAdmin(item) }, { status: 201 })
  } catch (e) {
    return adminFail(e)
  }
}
