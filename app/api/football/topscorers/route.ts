import { NextResponse } from "next/server"

import { footballService } from "../service"

const playerPhotoOverrides: Record<string, string> = {
  "1100": "/players/haaland.webp",
  "306": "/mohamed-salah-action.png",
  "2864": "/players/isak.jpg",
  "152982": "/players/palmer.webp",
}

function resolvePlayerPhoto(playerId?: string, fallbackPhoto?: string) {
  if (playerId && playerPhotoOverrides[playerId]) {
    return playerPhotoOverrides[playerId]
  }

  return fallbackPhoto || ""
}

export async function GET() {
  try {
    const scorers = await footballService.getTopScorers()

    const formattedScorers = scorers.slice(0, 20).map((item: any) => {
      const id = String(item.id || "")

      return {
        player: {
          id,
          name: item.name || "",
          photo: resolvePlayerPhoto(id, item.photo || ""),
          nationality: item.nationality || "",
          age: null,
        },
        statistics: [
          {
            team: {
              id: "",
              name: item.teamNameThai || item.teamName || "",
              logo: item.teamLogo || "",
            },
            games: {
              appearences: 0,
              position: "",
              rating: "0",
            },
            goals: {
              total: item.goals || 0,
              assists: 0,
            },
          },
        ],
      }
    })

    return NextResponse.json({
      data: formattedScorers,
      players: formattedScorers.map((item: any) => ({
        id: item.player.id,
        name: item.player.name,
        photo: item.player.photo,
        goals: item.statistics[0]?.goals?.total || 0,
        teamName: item.statistics[0]?.team?.name || "",
        teamNameThai: item.statistics[0]?.team?.name || "",
        teamLogo: item.statistics[0]?.team?.logo || "",
      })),
      source: "internal-football-service",
    })
  } catch (error) {
    return NextResponse.json(
      {
        data: [],
        players: [],
        source: "error",
        error: error instanceof Error ? error.message : "Failed to fetch top scorers",
      },
      { status: 500 },
    )
  }
}
