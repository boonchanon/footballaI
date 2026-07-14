import { NextResponse } from "next/server"

import { footballService } from "../service"
import { PREMIER_LEAGUE_DATA_SEASON } from "@/lib/season"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") || "all"
  const round = searchParams.get("round")
  const limit = searchParams.get("limit")

  try {
    const data = await footballService.getFixtures({
      type,
      round: round || undefined,
      limit: limit || undefined,
    })

    const availableRounds = [...new Set(data.map((item: any) => item.roundNumber).filter(Boolean))].sort((a: any, b: any) => a - b)

    return NextResponse.json({
      data,
      fixtures: data.map((fixture: any) => ({
        id: fixture.id,
        homeTeam: fixture.teams.home.nameEn,
        awayTeam: fixture.teams.away.nameEn,
        homeTeamThai: fixture.teams.home.name,
        awayTeamThai: fixture.teams.away.name,
        homeLogo: fixture.teams.home.logo,
        awayLogo: fixture.teams.away.logo,
        homeScore: fixture.goals.home,
        awayScore: fixture.goals.away,
        date: fixture.date,
        dateThai: fixture.dateThai,
        venue: fixture.venue.name,
        status: fixture.status,
      })),
      type,
      source: "internal-football-service",
      season: PREMIER_LEAGUE_DATA_SEASON.labelLong,
      rounds: {
        available: availableRounds,
        total: 38,
        current: round ? Number.parseInt(round) : null,
      },
      totalMatches: data.length,
      expectedMatches: 380,
      isCompleteSeason: data.length >= 380,
    })
  } catch (error) {
    return NextResponse.json(
      {
        data: [],
        type,
        source: "error",
        season: PREMIER_LEAGUE_DATA_SEASON.labelLong,
        error: error instanceof Error ? error.message : "Failed to fetch fixtures",
        rounds: { available: [], total: 38, current: null },
        totalMatches: 0,
        expectedMatches: 380,
        isCompleteSeason: false,
      },
      { status: 500 },
    )
  }
}
