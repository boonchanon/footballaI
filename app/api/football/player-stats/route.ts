import { NextResponse } from "next/server"

import { PREMIER_LEAGUE_DATA_SEASON } from "@/lib/season"

import { footballService } from "../service"

export async function GET() {
  try {
    const data = await footballService.getPlayerStatsSummary()

    return NextResponse.json({
      data,
      source: "internal-football-service",
      usedFallback: false,
      season: PREMIER_LEAGUE_DATA_SEASON.labelLong,
    })
  } catch (error) {
    return NextResponse.json(
      {
        data: null,
        source: "error",
        usedFallback: false,
        error: error instanceof Error ? error.message : "Failed to fetch player stats",
      },
      { status: 502 },
    )
  }
}
