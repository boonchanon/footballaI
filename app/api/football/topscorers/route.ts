import { NextResponse } from "next/server"
import { getTopScorers, translateTeamName } from "@/lib/sportmonks"

// Position translation
const positionMap: Record<number, string> = {
  24: "กองหน้า",
  25: "กองกลาง",
  26: "กองหลัง",
  27: "ผู้รักษาประตู",
}

export async function GET() {
  try {
    const scorers = await getTopScorers()

    const formattedScorers = scorers.slice(0, 20).map((item: any) => ({
      player: {
        id: item.player_id?.toString() || item.player?.id?.toString() || "",
        name: item.player?.display_name || item.player?.name || "",
        photo: item.player?.image_path || "",
        nationality: item.player?.nationality?.name || "",
        age: item.player?.date_of_birth
          ? Math.floor((Date.now() - new Date(item.player.date_of_birth).getTime()) / 31557600000)
          : null,
      },
      statistics: [
        {
          team: {
            id: item.participant?.id?.toString() || "",
            name: translateTeamName(item.participant?.name || ""),
            logo: item.participant?.image_path || "",
          },
          games: {
            appearences: item.player?.statistics?.[0]?.details?.find((d: any) => d.type_id === 45)?.value || 0,
            position: positionMap[item.player?.position_id] || "",
            rating:
              item.player?.statistics?.[0]?.details?.find((d: any) => d.type_id === 118)?.value?.toFixed(2) || "0",
          },
          goals: {
            total: item.total || 0,
            assists: item.player?.statistics?.[0]?.details?.find((d: any) => d.type_id === 79)?.value || 0,
          },
        },
      ],
    }))

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
      source: "sportmonks",
    })
  } catch (error) {
    console.error("Top Scorers API error:", error)

    const fallback = [
      { id: "1100", name: "Erling Haaland", photo: "https://media.api-sports.io/football/players/1100.png", team: "แมนเชสเตอร์ ซิตี้", teamLogo: "https://media.api-sports.io/football/teams/50.png", goals: 22, assists: 4, apps: 25, pos: "กองหน้า" },
      { id: "306", name: "Mohamed Salah", photo: "https://media.api-sports.io/football/players/306.png", team: "ลิเวอร์พูล", teamLogo: "https://media.api-sports.io/football/teams/40.png", goals: 19, assists: 13, apps: 25, pos: "กองหน้า" },
      { id: "18784", name: "Alexander Isak", photo: "https://media.api-sports.io/football/players/18784.png", team: "นิวคาสเซิล ยูไนเต็ด", teamLogo: "https://media.api-sports.io/football/teams/34.png", goals: 17, assists: 4, apps: 24, pos: "กองหน้า" },
      { id: "20574", name: "Cole Palmer", photo: "https://media.api-sports.io/football/players/20574.png", team: "เชลซี", teamLogo: "https://media.api-sports.io/football/teams/49.png", goals: 14, assists: 6, apps: 25, pos: "กองกลาง" },
      { id: "1467", name: "Bryan Mbeumo", photo: "https://media.api-sports.io/football/players/1467.png", team: "เบรนท์ฟอร์ด", teamLogo: "https://media.api-sports.io/football/teams/55.png", goals: 13, assists: 5, apps: 25, pos: "กองหน้า" },
      { id: "909", name: "Chris Wood", photo: "https://media.api-sports.io/football/players/909.png", team: "น็อตติ้งแฮม ฟอเรสต์", teamLogo: "https://media.api-sports.io/football/teams/65.png", goals: 13, assists: 3, apps: 24, pos: "กองหน้า" },
      { id: "19424", name: "Matheus Cunha", photo: "https://media.api-sports.io/football/players/19424.png", team: "วูล์ฟแฮมป์ตัน", teamLogo: "https://media.api-sports.io/football/teams/39.png", goals: 12, assists: 5, apps: 25, pos: "กองหน้า" },
      { id: "2413", name: "Ollie Watkins", photo: "https://media.api-sports.io/football/players/2413.png", team: "แอสตัน วิลล่า", teamLogo: "https://media.api-sports.io/football/teams/66.png", goals: 11, assists: 7, apps: 24, pos: "กองหน้า" },
      { id: "18", name: "Bukayo Saka", photo: "https://media.api-sports.io/football/players/18.png", team: "อาร์เซนอล", teamLogo: "https://media.api-sports.io/football/teams/42.png", goals: 10, assists: 10, apps: 22, pos: "กองหน้า" },
      { id: "174", name: "Bruno Fernandes", photo: "https://media.api-sports.io/football/players/174.png", team: "แมนเชสเตอร์ ยูไนเต็ด", teamLogo: "https://media.api-sports.io/football/teams/33.png", goals: 9, assists: 7, apps: 25, pos: "กองกลาง" },
    ].map((p) => ({
      player: { id: p.id, name: p.name, photo: p.photo },
      statistics: [{ team: { id: "", name: p.team, logo: p.teamLogo }, games: { appearences: p.apps, position: p.pos, rating: "0" }, goals: { total: p.goals, assists: p.assists } }],
    }))

    return NextResponse.json({
      data: fallback,
      players: fallback.map((item: any) => ({
        id: item.player.id,
        name: item.player.name,
        photo: item.player.photo,
        goals: item.statistics[0]?.goals?.total || 0,
        teamName: item.statistics[0]?.team?.name || "",
        teamNameThai: item.statistics[0]?.team?.name || "",
        teamLogo: item.statistics[0]?.team?.logo || "",
      })),
      source: "fallback",
    })
  }
}
