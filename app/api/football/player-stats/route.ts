import { NextResponse } from "next/server"

import { PREMIER_LEAGUE_DATA_SEASON } from "@/lib/season"

const API_BASE = "https://v3.football.api-sports.io"
const PREMIER_LEAGUE_ID = 39

const playerPhotoOverrides: Record<string, string> = {
  "1100": "/players/haaland.webp",
  "306": "/mohamed-salah-action.png",
  "2864": "/players/isak.jpg",
  "152982": "/players/palmer.webp",
}

const playerNameOverrides: Record<string, string> = {
  "186": "Son Heung-min",
  "792": "Justin Kluivert",
  "1100": "Erling Haaland",
  "1460": "Bukayo Saka",
  "1485": "Bruno Fernandes",
  "15908": "Mikkel Damsgaard",
  "161948": "Liam Delap",
  "18746": "Morgan Gibbs-White",
  "19163": "Jacob Murphy",
  "19170": "Morgan Rogers",
  "19281": "Antoine Semenyo",
  "19366": "Ollie Watkins",
  "19549": "Antonee Robinson",
  "2032": "Jorgen Strand Larsen",
  "20589": "Bryan Mbeumo",
  "20649": "Yoane Wissa",
  "129711": "Brennan Johnson",
  "153430": "Anthony Elanga",
  "178077": "Kevin Schade",
  "2864": "Alexander Isak",
  "2887": "Raul Jimenez",
  "152982": "Cole Palmer",
  "25927": "Jean-Philippe Mateta",
}

type ApiPlayerItem = {
  player?: { id?: number; name?: string; photo?: string }
  statistics?: Array<{
    team?: { name?: string; logo?: string }
    goals?: { total?: number; assists?: number }
    shots?: { total?: number }
    cards?: { yellow?: number }
    penalty?: { scored?: number }
    games?: { appearences?: number }
  }>
}

async function fetchFromApi(endpoint: string) {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) {
    throw new Error("API_FOOTBALL_KEY is not configured")
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "x-apisports-key": apiKey,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`API-Football request failed: ${response.status} ${text}`)
  }

  const data = await response.json()
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API-Football error: ${JSON.stringify(data.errors)}`)
  }

  return data
}

function normalizePlayer(entry: { id: string; name: string; photo: string; team: string; teamLogo: string; value: number }) {
  const id = String(entry.id || "")

  return {
    ...entry,
    id,
    name: playerNameOverrides[id] || entry.name || "",
    photo: playerPhotoOverrides[id] || entry.photo || "/placeholder.svg",
  }
}

function extractPlayers(items: ApiPlayerItem[], extractor: (stat: NonNullable<ApiPlayerItem["statistics"]>[number]) => number) {
  return items
    .map((item) => {
      const stat = item.statistics?.[0]
      if (!item.player?.id || !stat) return null

      const value = extractor(stat)
      if (!value || value <= 0) return null

      return normalizePlayer({
        id: String(item.player.id),
        name: item.player.name || "",
        photo: item.player.photo || "",
        team: stat.team?.name || "",
        teamLogo: stat.team?.logo || "",
        value,
      })
    })
    .filter(Boolean)
    .sort((a, b) => (b?.value || 0) - (a?.value || 0))
    .slice(0, 10)
}

export async function GET() {
  try {
    const [scorersData, assistsData] = await Promise.all([
      fetchFromApi(`/players/topscorers?league=${PREMIER_LEAGUE_ID}&season=${PREMIER_LEAGUE_DATA_SEASON.apiYear}`),
      fetchFromApi(`/players/topassists?league=${PREMIER_LEAGUE_ID}&season=${PREMIER_LEAGUE_DATA_SEASON.apiYear}`),
    ])

    const scorers = (scorersData.response || []) as ApiPlayerItem[]
    const assists = (assistsData.response || []) as ApiPlayerItem[]

    const merged = new Map<string, ApiPlayerItem>()
    ;[...scorers, ...assists].forEach((item) => {
      const id = String(item.player?.id || "")
      if (id && !merged.has(id)) merged.set(id, item)
    })

    const list = Array.from(merged.values())

    const data = {
      goals: extractPlayers(scorers, (stat) => stat.goals?.total || 0),
      assists: extractPlayers(assists, (stat) => stat.goals?.assists || 0),
      shots: extractPlayers(list, (stat) => stat.shots?.total || 0),
      yellowCards: extractPlayers(list, (stat) => stat.cards?.yellow || 0),
      penalties: extractPlayers(list, (stat) => stat.penalty?.scored || 0),
      appearances: extractPlayers(list, (stat) => stat.games?.appearences || 0),
    }

    return NextResponse.json({
      data,
      source: "api-football-direct",
      usedFallback: false,
      season: PREMIER_LEAGUE_DATA_SEASON.labelLong,
    })
  } catch (error) {
    return NextResponse.json(
      {
        data: null,
        source: "error",
        usedFallback: false,
        error: error instanceof Error ? error.message : "Failed to fetch player stats",
      },
      { status: 502 },
    )
  }
}
