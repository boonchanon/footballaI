import { NextResponse } from "next/server"

import { footballService } from "../service"

export async function GET() {
  try {
    const teams = await footballService.getTeams()
    const data = teams.map((item: any) => ({
      team: {
        id: item.id,
        name: item.name,
        nameEn: item.nameEn,
        logo: item.logo,
      },
      venue: {
        name: item.venue?.name || "",
        city: item.venue?.city || "",
        capacity: item.venue?.capacity || 0,
        image: item.venue?.image || "",
      },
    }))

    return NextResponse.json({ data, source: "internal-football-service" })
  } catch (error) {
    return NextResponse.json(
      {
        data: [],
        source: "error",
        error: error instanceof Error ? error.message : "Failed to fetch teams",
      },
      { status: 500 },
    )
  }
}
