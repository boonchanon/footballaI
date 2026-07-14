import { NextResponse } from "next/server"

import { PREMIER_LEAGUE_DATA_SEASON } from "@/lib/season"

const API_BASE = "https://v3.football.api-sports.io"
const PREMIER_LEAGUE_ID = 39

async function fetchStandings() {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) {
    throw new Error("API_FOOTBALL_KEY is not configured")
  }

  const response = await fetch(
    `${API_BASE}/standings?league=${PREMIER_LEAGUE_ID}&season=${PREMIER_LEAGUE_DATA_SEASON.apiYear}`,
    {
      headers: {
        "x-apisports-key": apiKey,
      },
      cache: "no-store",
    },
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`API-Football request failed: ${response.status} ${text}`)
  }

  const data = await response.json()
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API-Football error: ${JSON.stringify(data.errors)}`)
  }

  return data.response?.[0]?.league?.standings?.[0] || []
}

export async function GET() {
  try {
    const standings = await fetchStandings()

    const data = standings.map((team: any) => ({
      rank: team.rank,
      team: {
        id: String(team.team.id),
        name: team.team.name,
        nameEn: team.team.name,
        logo: team.team.logo,
      },
      points: team.points,
      goalsDiff: team.goalsDiff,
      form: team.form,
      all: {
        played: team.all.played,
        win: team.all.win,
        draw: team.all.draw,
        lose: team.all.lose,
        goals: {
          for: team.all.goals.for,
          against: team.all.goals.against,
        },
      },
    }))

    return NextResponse.json({
      data,
      season: PREMIER_LEAGUE_DATA_SEASON.labelLong,
      source: "api-football-direct",
      usedFallback: false,
    })
  } catch (error) {
    return NextResponse.json(
      {
        data: [],
        season: PREMIER_LEAGUE_DATA_SEASON.labelLong,
        source: "error",
        usedFallback: false,
        error: error instanceof Error ? error.message : "Failed to fetch standings",
      },
      { status: 502 },
    )
  }
}
