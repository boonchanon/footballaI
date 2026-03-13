import { NextResponse } from "next/server"
import { getStandings, translateTeamName } from "@/lib/sportmonks"

export async function GET() {
  try {
    const standings = await getStandings()

    const formattedStandings = standings.map((item: any) => {
      const details = item.details || []

      // Extract stats from details array
      const getDetailValue = (typeId: number) => {
        const detail = details.find((d: any) => d.type_id === typeId)
        return detail?.value || 0
      }

      // SportMonks detail type IDs:
      // 129 = Matches Played, 130 = Won, 131 = Draw, 132 = Lost
      // 133 = Goals For, 134 = Goals Against, 187 = Goal Difference, 179 = Points

      return {
        rank: item.position,
        team: {
          id: item.participant_id?.toString() || "",
          name: translateTeamName(item.participant?.name || ""),
          nameEn: item.participant?.name || "",
          logo: item.participant?.image_path || "",
        },
        points: getDetailValue(179),
        goalsDiff: getDetailValue(187),
        form: item.form || "",
        all: {
          played: getDetailValue(129),
          win: getDetailValue(130),
          draw: getDetailValue(131),
          lose: getDetailValue(132),
          goals: {
            for: getDetailValue(133),
            against: getDetailValue(134),
          },
        },
      }
    })

    // Sort by position
    formattedStandings.sort((a: any, b: any) => a.rank - b.rank)

    return NextResponse.json({
      data: formattedStandings,
      season: "2024-2025",
      source: "sportmonks",
    })
  } catch (error) {
    console.error("Standings API error:", error)

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
