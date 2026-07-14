import { NextRequest } from "next/server"

import { requireAdminRoles } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import {
  getPremierLeagueSyncStatus,
  seedPremierLeagueFixtures,
  syncPremierLeagueSnapshot,
} from "@/lib/server/premier-league-sync"

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    await requireAdminRoles(request, ["superadmin", "admin"])

    const status = await getPremierLeagueSyncStatus()
    return ok(status)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch sync status"
    const status = message === "Admin authentication required" ? 401 : message === "Admin permission denied" ? 403 : 500
    return errorResponse(message, status)
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    await requireAdminRoles(request, ["superadmin", "admin"])

    const body = await request.json().catch(() => ({}))
    const mode = String(body.mode || "all") as "fixtures" | "snapshot" | "all"

    const result: Record<string, unknown> = { mode, startedAt: new Date().toISOString() }

    if (mode === "fixtures" || mode === "all") {
      result.fixtures = await seedPremierLeagueFixtures()
    }

    if (mode === "snapshot" || mode === "all") {
      result.snapshot = await syncPremierLeagueSnapshot()
    }

    result.status = await getPremierLeagueSyncStatus()
    result.finishedAt = new Date().toISOString()

    return ok(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed"
    const status = message === "Admin authentication required" ? 401 : message === "Admin permission denied" ? 403 : 500
    return errorResponse(message, status)
  }
}
