import { NextRequest } from "next/server"

import { requireAdminRoles } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import {
  getPremierLeagueSyncStatus,
  seedPremierLeagueFixtures,
  syncPremierLeagueSnapshot,
} from "@/lib/server/premier-league-sync"
import {
  getFootballApiConfig,
  getFootballTeamsApiConfig,
  getNewsApiConfig,
  updateFootballApiConfig,
  updateFootballTeamsApiConfig,
  updateNewsApiConfig,
} from "@/lib/server/app-settings"

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    await requireAdminRoles(request, ["superadmin", "admin"])

    const [status, footballApi, footballTeamsApi, newsApi] = await Promise.all([
      getPremierLeagueSyncStatus(),
      getFootballApiConfig(),
      getFootballTeamsApiConfig(),
      getNewsApiConfig(),
    ])
    return ok({ ...status, footballApi, footballTeamsApi, newsApi })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch sync status"
    const status = message === "Admin authentication required" ? 401 : message === "Admin permission denied" ? 403 : 500
    return errorResponse(message, status)
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    const admin = await requireAdminRoles(request, ["superadmin", "admin"])

    const body = await request.json().catch(() => ({}))

    if (
      typeof body?.footballApi?.enabled === "boolean" ||
      typeof body?.footballTeamsApi?.enabled === "boolean" ||
      typeof body?.newsApi?.enabled === "boolean"
    ) {
      const [footballApi, footballTeamsApi, newsApi, status] = await Promise.all([
        typeof body?.footballApi?.enabled === "boolean"
          ? updateFootballApiConfig({ enabled: body.footballApi.enabled }, String((admin as any)?._id || ""))
          : getFootballApiConfig(),
        typeof body?.footballTeamsApi?.enabled === "boolean"
          ? updateFootballTeamsApiConfig({ enabled: body.footballTeamsApi.enabled }, String((admin as any)?._id || ""))
          : getFootballTeamsApiConfig(),
        typeof body?.newsApi?.enabled === "boolean"
          ? updateNewsApiConfig({ enabled: body.newsApi.enabled }, String((admin as any)?._id || ""))
          : getNewsApiConfig(),
        getPremierLeagueSyncStatus(),
      ])

      
      return ok({ mode: "settings", footballApi, footballTeamsApi, newsApi, status, finishedAt: new Date().toISOString() })
    }

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
