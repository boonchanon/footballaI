import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { PremierLeagueSnapshot } from "@/lib/server/models"
import { PREMIER_LEAGUE_SNAPSHOT_KEY } from "@/lib/server/premier-league-sync"

export async function GET() {
  try {
    await connectDatabase()

    const snapshot = await PremierLeagueSnapshot.findOne({ key: PREMIER_LEAGUE_SNAPSHOT_KEY }).lean()
    if (!snapshot) {
      return ok({
        source: "atlas-snapshot",
        snapshot: null,
      })
    }

    return ok({
      source: "atlas-snapshot",
      snapshot: {
        season: snapshot.season,
        summary: snapshot.summary,
        model: snapshot.model,
        searchVerified: snapshot.searchVerified,
        standings: snapshot.standings || [],
        fixtures: snapshot.fixtures || [],
        topScorers: snapshot.topScorers || [],
        topAssists: snapshot.topAssists || [],
        cleanSheets: snapshot.cleanSheets || [],
        sources: snapshot.sources || [],
        warnings: snapshot.warnings || [],
        syncedAt: snapshot.syncedAt,
      },
    })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Failed to load saved snapshot", 500)
  }
}
