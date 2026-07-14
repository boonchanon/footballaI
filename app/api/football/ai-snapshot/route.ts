import { NextResponse } from "next/server"

import { generatePremierLeagueAiSnapshot } from "@/lib/server/premier-league-sync"

export const revalidate = 1800

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const section = searchParams.get("section") || "all"

  try {
    const snapshot = await generatePremierLeagueAiSnapshot(section)

    return NextResponse.json({
      source: "intelsphere-ai-snapshot",
      section,
      ...snapshot,
    })
  } catch (error) {
    return NextResponse.json(
      {
        source: "intelsphere-ai-snapshot",
        section,
        error: error instanceof Error ? error.message : "Failed to build AI snapshot.",
        generatedAt: new Date().toISOString(),
        standings: [],
        fixtures: [],
        topScorers: [],
        topAssists: [],
        cleanSheets: [],
        sources: [],
      },
      { status: 500 },
    )
  }
}
