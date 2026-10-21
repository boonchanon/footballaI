import { NextRequest } from "next/server"

import { adminFail, mapAdmin } from "@/lib/server/admin-accounts"
import { requireAdminRoles } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { ok } from "@/lib/server/http"
import { Admin } from "@/lib/server/models"

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
