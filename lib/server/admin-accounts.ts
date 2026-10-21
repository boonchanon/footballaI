import { errorResponse } from "./http"

export function mapAdmin(x: any) {
  return {
    id: x._id.toString(),
    email: x.email,
    role: x.role,
    permissions: Array.isArray(x.permissions) ? x.permissions : [],
    isActive: x.isActive !== false,
    createdAt: x.createdAt,
    updatedAt: x.updatedAt,
  }
}

export function adminFail(e: unknown) {
  const m = e instanceof Error ? e.message : "Admin request failed"
  return errorResponse(m, m === "Admin authentication required" ? 401 : m === "Admin permission denied" ? 403 : 500)
}
