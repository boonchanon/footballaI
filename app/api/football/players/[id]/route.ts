import { NextResponse } from "next/server"
import { getPlayerStats, getPlayerTransfers, translateTeamName } from "@/lib/sportmonks"

// Position translation
const positionMap: Record<number, string> = {
  24: "กองหน้า",
  25: "กองกลาง",
  26: "กองหลัง",
  27: "ผู้รักษาประตู",
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const [playerData, transfers] = await Promise.all([getPlayerStats(id), getPlayerTransfers(id)])

    if (!playerData) {
      return NextResponse.json({ error: "Player not found", source: "sportmonks" }, { status: 404 })
    }

    const stats = playerData.statistics?.[0]
    const details = stats?.details || []

    const getDetailValue = (typeId: number) => {
      const detail = details.find((d: any) => d.type_id === typeId)
      return detail?.value || 0
    }

    const formattedPlayer = {
      id: playerData.id?.toString() || "",
      name: playerData.display_name || playerData.name || "",
      firstname: playerData.firstname || "",
      lastname: playerData.lastname || "",
      photo: playerData.image_path || "",
      nationality: playerData.nationality?.name || "",
      age: playerData.date_of_birth
        ? Math.floor((Date.now() - new Date(playerData.date_of_birth).getTime()) / 31557600000)
        : null,
      height: playerData.height ? `${playerData.height} cm` : null,
      weight: playerData.weight ? `${playerData.weight} kg` : null,
      injured: false,
      birth: {
        date: playerData.date_of_birth,
        place: playerData.city_of_birth,
        country: playerData.country?.name || "",
      },
      team: playerData.teams?.[0]
        ? {
            id: playerData.teams[0].id?.toString() || "",
            name: translateTeamName(playerData.teams[0].name || ""),
            logo: playerData.teams[0].image_path || "",
          }
        : null,
      position: positionMap[playerData.position_id] || playerData.position?.name || "",
      statistics: {
        games: {
          appearences: getDetailValue(45), // Appearances
          lineups: getDetailValue(46), // Lineups
          minutes: getDetailValue(47), // Minutes played
          rating: getDetailValue(118)?.toFixed(2) || "0.00",
          captain: false,
        },
        goals: {
          total: getDetailValue(52), // Goals
          assists: getDetailValue(79), // Assists
          conceded: getDetailValue(88), // Goals conceded (for GK)
          saves: getDetailValue(57), // Saves
        },
        shots: {
          total: getDetailValue(86), // Total shots
          on: getDetailValue(87), // Shots on target
        },
        passes: {
          total: getDetailValue(80), // Total passes
          key: getDetailValue(84), // Key passes
          accuracy: getDetailValue(81), // Pass accuracy
        },
        tackles: {
          total: getDetailValue(78), // Tackles
          blocks: getDetailValue(94), // Blocks
          interceptions: getDetailValue(100), // Interceptions
        },
        duels: {
          total: getDetailValue(105), // Duels total
          won: getDetailValue(106), // Duels won
        },
        dribbles: {
          attempts: getDetailValue(108), // Dribble attempts
          success: getDetailValue(109), // Successful dribbles
        },
        fouls: {
          drawn: getDetailValue(98), // Fouls drawn
          committed: getDetailValue(99), // Fouls committed
        },
        cards: {
          yellow: getDetailValue(84), // Yellow cards
          yellowred: 0,
          red: getDetailValue(85), // Red cards
        },
        penalty: {
          won: getDetailValue(116), // Penalties won
          commited: getDetailValue(117), // Penalties committed
          scored: getDetailValue(114), // Penalties scored
          missed: getDetailValue(115), // Penalties missed
          saved: getDetailValue(57), // Penalties saved
        },
      },
      allSeasonStats: [],
      transfers:
        transfers.slice(0, 10).map((t: any) => ({
          date: t.date,
          from: {
            name: translateTeamName(t.fromteam?.name || ""),
            logo: t.fromteam?.image_path || "",
          },
          to: {
            name: translateTeamName(t.toteam?.name || ""),
            logo: t.toteam?.image_path || "",
          },
          type: t.type || "",
        })) || [],
    }

    return NextResponse.json({
      data: formattedPlayer,
      source: "sportmonks",
    })
  } catch (error) {
    console.error("Player API error:", error)

    return NextResponse.json(
      {
        data: null,
        source: "error",
        error: error instanceof Error ? error.message : "Failed to fetch player",
      },
      { status: 500 },
    )
  }
}
