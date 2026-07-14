import { NextRequest } from "next/server"

import { ADMIN_ROLE_LABELS, isAdminRole } from "@/lib/admin-access"
import { requireAdminUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok, parsePagination } from "@/lib/server/http-utils"
import { Admin, User } from "@/lib/server/models"

function getRoleLabel(role: string) {
  if (isAdminRole(role)) return ADMIN_ROLE_LABELS[role]
  if (role === "user") return "ผู้ใช้งาน"
  if (role === "admin") return "แอดมิน"
  return role || "ผู้ใช้งาน"
}

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    await requireAdminUser(request)

    const searchParams = request.nextUrl.searchParams
    const { page, limit } = parsePagination(searchParams)
    const q = String(searchParams.get("q") || "").trim()
    const role = String(searchParams.get("role") || "all").trim()
    const status = String(searchParams.get("status") || "all").trim()

    const userFilter: Record<string, unknown> = {}
    const adminFilter: Record<string, unknown> = {}

    if (q) {
      const regex = { $regex: q, $options: "i" }
      userFilter.$or = [{ name: regex }, { email: regex }]
      adminFilter.$or = [{ email: regex }]
    }

    if (role !== "all") {
      if (role === "user") {
        userFilter.role = "user"
        adminFilter.role = "__none__"
      } else if (role === "admin") {
        userFilter.role = "admin"
        adminFilter.role = "admin"
      } else {
        userFilter.role = "__none__"
        adminFilter.role = role
      }
    }

    if (status === "active") {
      adminFilter.isActive = true
    } else if (status === "inactive") {
      adminFilter.isActive = false
      userFilter._id = "__none__"
    }

    const [userDocs, adminDocs] = await Promise.all([
      User.find(userFilter).sort({ createdAt: -1 }).select("name email role avatar createdAt"),
      Admin.find(adminFilter).sort({ createdAt: -1 }).select("email role isActive createdAt"),
    ])

    const items = [
      ...userDocs.map((user: any) => ({
        id: user._id.toString(),
        type: "user",
        name: user.name || user.email,
        email: user.email,
        avatar: user.avatar || "",
        role: user.role || "user",
        roleLabel: getRoleLabel(user.role || "user"),
        status: "active",
        statusLabel: "ใช้งาน",
        joinDate: user.createdAt,
      })),
      ...adminDocs.map((admin: any) => ({
        id: admin._id.toString(),
        type: "admin",
        name: getRoleLabel(admin.role || "admin"),
        email: admin.email,
        avatar: "",
        role: admin.role || "admin",
        roleLabel: getRoleLabel(admin.role || "admin"),
        status: admin.isActive === false ? "inactive" : "active",
        statusLabel: admin.isActive === false ? "ปิดใช้งาน" : "ใช้งาน",
        joinDate: admin.createdAt,
      })),
    ].sort((a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime())

    const total = items.length
    const skip = (page - 1) * limit
    const pagedItems = items.slice(skip, skip + limit)

    return ok({
      items: pagedItems,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      summary: { users: userDocs.length, admins: adminDocs.length },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load admin users"
    return errorResponse(message, message === "Admin authentication required" ? 401 : 500)
  }
}
