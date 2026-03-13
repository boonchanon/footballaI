import { NextResponse } from "next/server"
import { getTeams, translateTeamName } from "@/lib/sportmonks"

export async function GET() {
  try {
    const teams = await getTeams()

    const formattedTeams = teams.map((item: any) => ({
      team: {
        id: item.id?.toString() || "",
        name: translateTeamName(item.name || ""),
        nameEn: item.name || "",
        logo: item.image_path || "",
        founded: item.founded,
        code: item.short_code || "",
      },
      venue: {
        name: item.venue?.name || "",
        city: item.venue?.city_name || "",
        capacity: item.venue?.capacity || 0,
        image: item.venue?.image_path || "",
      },
    }))

    return NextResponse.json({
      data: formattedTeams,
      source: "sportmonks",
    })
  } catch (error) {
    console.error("Teams API error:", error)

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
