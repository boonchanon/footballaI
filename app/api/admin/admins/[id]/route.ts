import { NextRequest } from "next/server"
import mongoose from "mongoose"

import { ADMIN_SECTIONS, isAdminRole, isAdminSection } from "@/lib/admin-access"
import { adminFail, mapAdmin } from "@/lib/server/admin-accounts"
import { requireAdminRoles } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { Admin } from "@/lib/server/models"

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    const actor = await requireAdminRoles(request, ["superadmin"])
    const { id } = await context.params
    if (!mongoose.isValidObjectId(id)) return errorResponse("Invalid admin id", 422)

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") return errorResponse("Invalid request body", 422)

    const update: { role?: string; permissions?: string[] } = {}
    if ("role" in body) {
      if (!isAdminRole(body.role)) return errorResponse("role must be one of superadmin, admin, admincommunity", 422)
      update.role = body.role
    }
    if ("permissions" in body) {
      if (!Array.isArray(body.permissions) || !body.permissions.every(isAdminSection)) {
        return errorResponse(`permissions must be a subset of: ${ADMIN_SECTIONS.join(", ")}`, 422)
      }
      update.permissions = ADMIN_SECTIONS.filter((section) => body.permissions.includes(section))
    }
    if (!Object.keys(update).length) return errorResponse("role or permissions is required", 422)

    // Prevent a superadmin from locking themselves out of role management.
    if (actor._id.toString() === id && update.role && update.role !== "superadmin") {
      return errorResponse("Cannot change your own superadmin role", 422)
    }

    const item = await Admin.findByIdAndUpdate(id, update, { new: true, runValidators: true })
    return item ? ok({ item: mapAdmin(item) }) : errorResponse("Admin not found", 404)
  } catch (e) {
    return adminFail(e)
  }
}
