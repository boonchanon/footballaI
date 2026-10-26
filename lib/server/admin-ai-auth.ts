import { NextRequest, NextResponse } from "next/server"

import { requireAdminRoles } from "./auth"

type AiAdmin = Awaited<ReturnType<typeof requireAdminRoles>>

// The admin AI pages belong to the "ai" admin section (superadmin and admin).
// Not signed in -> 401, signed in without the role -> 403.
export async function authorizeAiAdmin(request: NextRequest): Promise<{ admin: AiAdmin; denied: null } | { admin: null; denied: NextResponse }> {
  try {
    return { admin: await requireAdminRoles(request, ["superadmin", "admin"]), denied: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin authentication required"
    return { admin: null, denied: NextResponse.json({ error: message }, { status: message === "Admin permission denied" ? 403 : 401 }) }
  }
}

export async function denyUnlessAiAdmin(request: NextRequest) {
  return (await authorizeAiAdmin(request)).denied
}
