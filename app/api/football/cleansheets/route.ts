import { NextResponse } from "next/server"

import { PREMIER_LEAGUE_DATA_SEASON } from "@/lib/season"

import { footballService } from "../service"

export async function GET() {
  try {
    const cleanSheets = await footballService.getCleanSheets()

    const formattedData = cleanSheets.slice(0, 10).map((team: any, index: number) => ({
      rank: index + 1,
      teamId: team.teamId,
      teamName: team.teamName,
      teamNameThai: team.teamName,
      teamLogo: team.teamLogo,
      cleanSheets: team.cleanSheets,
    }))

    return NextResponse.json({
      teams: formattedData,
      season: PREMIER_LEAGUE_DATA_SEASON.labelLong,
      lastUpdated: new Date().toISOString(),
      source: "internal-football-service",
    })
  } catch (error) {
    return NextResponse.json(
      {
        teams: [],
        season: PREMIER_LEAGUE_DATA_SEASON.labelLong,
        lastUpdated: new Date().toISOString(),
        source: "error",
        error: error instanceof Error ? error.message : "Failed to fetch clean sheets",
      },
      { status: 500 },
    )
  }
}
