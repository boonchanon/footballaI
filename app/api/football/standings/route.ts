import { NextResponse } from "next/server"

import { PREMIER_LEAGUE_DATA_SEASON } from "@/lib/season"

import { footballService } from "../service"

export async function GET() {
  try {
    const data = await footballService.getStandings()

    return NextResponse.json({
      data,
      season: PREMIER_LEAGUE_DATA_SEASON.labelLong,
      source: "internal-football-service",
      usedFallback: false,
    })
  } catch (error) {
    return NextResponse.json(
      {
        data: [],
        season: PREMIER_LEAGUE_DATA_SEASON.labelLong,
        source: "error",
        usedFallback: false,
        error: error instanceof Error ? error.message : "Failed to fetch standings",
      },
      { status: 502 },
    )
  }
}
