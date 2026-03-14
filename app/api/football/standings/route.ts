import { NextResponse } from "next/server"

import { footballService } from "../service"

export async function GET() {
  try {
    const data = await footballService.getStandings()
    return NextResponse.json({
      data,
      season: "2024-2025",
      source: "internal-football-service",
    })
  } catch (error) {
    return NextResponse.json(
      {
        data: [],
        season: "2024-2025",
        source: "error",
        error: error instanceof Error ? error.message : "Failed to fetch standings",
      },
      { status: 500 },
    )
  }
}
