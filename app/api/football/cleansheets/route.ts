import { NextResponse } from "next/server"
import { getTopCleanSheets, translateTeamName } from "@/lib/sportmonks"

export async function GET() {
  try {
    const cleanSheets = await getTopCleanSheets()

    const formattedData = cleanSheets.slice(0, 10).map((team: any, index: number) => ({
      rank: index + 1,
      teamId: team.teamId,
      teamName: team.teamName,
      teamNameThai: translateTeamName(team.teamName),
      teamLogo: team.teamLogo,
      cleanSheets: team.cleanSheets,
    }))

    return NextResponse.json({
      teams: formattedData,
      season: "2024-2025",
      lastUpdated: new Date().toISOString(),
      source: "sportmonks",
    })
  } catch (error) {
    console.error("Error fetching clean sheets:", error)

    // Return mock data if API fails
    const mockData = [
      {
        rank: 1,
        teamId: 8,
        teamName: "Liverpool",
        teamNameThai: "ลิเวอร์พูล",
        teamLogo: "https://cdn.sportmonks.com/images/soccer/teams/8/8.png",
        cleanSheets: 12,
      },
      {
        rank: 2,
        teamId: 9,
        teamName: "Manchester City",
        teamNameThai: "แมนเชสเตอร์ ซิตี้",
        teamLogo: "https://cdn.sportmonks.com/images/soccer/teams/9/9.png",
        cleanSheets: 11,
      },
      {
        rank: 3,
        teamId: 19,
        teamName: "Arsenal",
        teamNameThai: "อาร์เซนอล",
        teamLogo: "https://cdn.sportmonks.com/images/soccer/teams/19/19.png",
        cleanSheets: 10,
      },
      {
        rank: 4,
        teamId: 18,
        teamName: "Chelsea",
        teamNameThai: "เชลซี",
        teamLogo: "https://cdn.sportmonks.com/images/soccer/teams/18/18.png",
        cleanSheets: 8,
      },
      {
        rank: 5,
        teamId: 6,
        teamName: "Tottenham Hotspur",
        teamNameThai: "ท็อตแนม ฮอทสเปอร์",
        teamLogo: "https://cdn.sportmonks.com/images/soccer/teams/6/6.png",
        cleanSheets: 7,
      },
    ]

    return NextResponse.json({
      teams: mockData,
      season: "2024-2025",
      lastUpdated: new Date().toISOString(),
      source: "mock",
    })
  }
}
