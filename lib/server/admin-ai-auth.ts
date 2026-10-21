import { NextRequest, NextResponse } from "next/server"

import { requireAdminRoles } from "./auth"

// The admin AI pages belong to the "ai" admin section (superadmin and admin).
export async function denyUnlessAiAdmin(request: NextRequest) {
  try {
    await requireAdminRoles(request, ["superadmin", "admin"])
    return null
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin authentication required"
    return NextResponse.json({ error: message }, { status: message === "Admin permission denied" ? 403 : 401 })
  }
}
