import { NextResponse } from "next/server"

import { footballService } from "../../service"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await footballService.getTeam(id)
    return NextResponse.json({ data, source: "internal-football-service" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch team"
    const status = message === "Team not found" ? 404 : 500

    return NextResponse.json(
      {
        data: null,
        source: "error",
        error: message,
      },
      { status },
    )
  }
}
