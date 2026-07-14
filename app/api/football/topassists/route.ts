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
    const assists = await footballService.getTopAssists()

    const formattedAssists = assists.slice(0, 20).map((item: any) => {
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
              total: 0,
              assists: item.assists || 0,
            },
          },
        ],
      }
    })

    return NextResponse.json({
      data: formattedAssists,
      source: "internal-football-service",
    })
  } catch (error) {
    return NextResponse.json(
      {
        data: [],
        source: "error",
        error: error instanceof Error ? error.message : "Failed to fetch top assists",
      },
      { status: 500 },
    )
  }
}
