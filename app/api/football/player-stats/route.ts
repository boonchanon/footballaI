import { NextResponse } from "next/server"

import { footballService } from "../service"

export async function GET() {
  try {
    const data = await footballService.getPlayerStatsSummary()
    return NextResponse.json({ data, source: "internal-football-service" })
  } catch (error) {
    return NextResponse.json(
      {
        data: null,
        source: "error",
        error: error instanceof Error ? error.message : "Failed to fetch player stats",
      },
      { status: 500 },
    )
  }
}
