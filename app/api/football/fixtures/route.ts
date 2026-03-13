import { NextResponse } from "next/server"
import { getFixtures, translateTeamName, translateStatus, formatDateThai } from "@/lib/sportmonks"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") || "all"
  const round = searchParams.get("round")

  try {
    const fixtures = await getFixtures({ round: round || undefined })

    const formattedFixtures = fixtures.map((item: any) => {
      const stateId = item.state?.id || item.state_id || 1
      const statusInfo = translateStatus(stateId, item.state?.name)

      const isFinished = [3, 4, 5, 9, 10].includes(stateId)
      const isLive = [2, 13, 14, 15, 16, 17, 18].includes(stateId)
      const isUpcoming = [1, 6, 21].includes(stateId)

      // Get participants (teams)
      const participants = item.participants || []
      const homeTeam = participants.find((p: any) => p.meta?.location === "home")
      const awayTeam = participants.find((p: any) => p.meta?.location === "away")

      // Get scores
      const scores = item.scores || []
      const getScore = (participantId: number, description: string) => {
        const score = scores.find((s: any) => s.participant_id === participantId && s.description === description)
        return score?.score?.goals ?? null
      }

      const homeGoals = getScore(homeTeam?.id, "CURRENT") ?? getScore(homeTeam?.id, "2ND_HALF")
      const awayGoals = getScore(awayTeam?.id, "CURRENT") ?? getScore(awayTeam?.id, "2ND_HALF")

      // Extract round number
      const roundNumber = item.round?.name ? Number.parseInt(item.round.name) : null

      return {
        id: item.id?.toString() || "",
        date: item.starting_at || "",
        dateThai: formatDateThai(item.starting_at || ""),
        roundNumber,
        status: {
          short: statusInfo.short,
          long: statusInfo.long,
          elapsed: item.minute || null,
          isLive,
          isFinished,
          isUpcoming,
        },
        teams: {
          home: {
            id: homeTeam?.id?.toString() || "",
            name: translateTeamName(homeTeam?.name || ""),
            nameEn: homeTeam?.name || "",
            logo: homeTeam?.image_path || "",
            winner: isFinished && homeGoals !== null && awayGoals !== null ? homeGoals > awayGoals : null,
          },
          away: {
            id: awayTeam?.id?.toString() || "",
            name: translateTeamName(awayTeam?.name || ""),
            nameEn: awayTeam?.name || "",
            logo: awayTeam?.image_path || "",
            winner: isFinished && homeGoals !== null && awayGoals !== null ? awayGoals > homeGoals : null,
          },
        },
        goals: {
          home: homeGoals,
          away: awayGoals,
        },
        league: {
          id: item.league_id?.toString() || "",
          name: "พรีเมียร์ลีก",
          round: roundNumber ? `นัดที่ ${roundNumber}` : item.round?.name || "",
        },
        venue: {
          name: item.venue?.name || "",
          city: item.venue?.city_name || "",
        },
      }
    })

    // Filter by type
    let filteredFixtures = formattedFixtures
    if (type === "upcoming") {
      filteredFixtures = formattedFixtures.filter((f: any) => f.status.isUpcoming || f.status.isLive)
    } else if (type === "live") {
      filteredFixtures = formattedFixtures.filter((f: any) => f.status.isLive)
    } else if (type === "finished") {
      filteredFixtures = formattedFixtures.filter((f: any) => f.status.isFinished)
    }

    // Sort by date
    filteredFixtures.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Get available rounds
    const availableRounds = [...new Set(formattedFixtures.map((f: any) => f.roundNumber).filter(Boolean))].sort(
      (a, b) => (a as number) - (b as number),
    )

    return NextResponse.json({
      data: filteredFixtures,
      fixtures: filteredFixtures.map((fixture: any) => ({
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
      source: "sportmonks",
      rounds: {
        available: availableRounds,
        total: 38,
        current: round ? Number.parseInt(round) : null,
      },
      totalMatches: formattedFixtures.length,
    })
  } catch (error) {
    console.error("Fixtures API error:", error)

    return NextResponse.json(
      {
        data: [],
        type,
        source: "error",
        error: error instanceof Error ? error.message : "Failed to fetch fixtures",
        rounds: { available: [], total: 38, current: null },
        totalMatches: 0,
      },
      { status: 500 },
    )
  }
}
