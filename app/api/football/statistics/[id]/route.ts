import { NextResponse } from "next/server"

import { footballService } from "../../service"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await footballService.getFixtureStatistics(id)
    return NextResponse.json({ data, source: "internal-football-service", matchId: id })
  } catch (error) {
    return NextResponse.json(
      {
        data: [],
        source: "error",
        matchId: null,
        error: error instanceof Error ? error.message : "Failed to fetch statistics",
      },
      { status: 500 },
    )
  }
}
