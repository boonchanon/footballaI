import { NextResponse } from "next/server"
import { translateTeamName } from "@/lib/sportmonks"

const API_BASE = "https://v3.football.api-sports.io"
const PREMIER_LEAGUE_ID = 39
const CURRENT_SEASON = 2024

async function fetchFromAPI(endpoint: string) {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) throw new Error("API_FOOTBALL_KEY not configured")

  const url = `${API_BASE}${endpoint}`
  const res = await fetch(url, {
    headers: { "x-apisports-key": apiKey },
    next: { revalidate: 3600 },
  })

  if (!res.ok) throw new Error(`API request failed: ${res.status}`)
  const data = await res.json()
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API-Football error: ${JSON.stringify(data.errors)}`)
  }
  return data
}

interface PlayerStat {
  id: string
  name: string
  photo: string
  team: string
  teamLogo: string
  value: number
}

function extractPlayers(items: any[], valueExtractor: (stat: any) => number): PlayerStat[] {
  return items
    .map((item: any) => {
      const stat = item.statistics?.[0]
      if (!stat) return null
      const val = valueExtractor(stat)
      if (val === null || val === undefined || val <= 0) return null
      return {
        id: item.player?.id?.toString() || "",
        name: item.player?.name || "Unknown",
        photo: item.player?.photo || "",
        team: translateTeamName(stat.team?.name || "Unknown"),
        teamLogo: stat.team?.logo || "",
        value: val,
      }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.value - a.value) as PlayerStat[]
}

export async function GET() {
  try {
    const [scorersRes, assistsRes] = await Promise.all([
      fetchFromAPI(`/players/topscorers?league=${PREMIER_LEAGUE_ID}&season=${CURRENT_SEASON}`),
      fetchFromAPI(`/players/topassists?league=${PREMIER_LEAGUE_ID}&season=${CURRENT_SEASON}`),
    ])

    const scorersRaw = scorersRes.response || []
    const assistsRaw = assistsRes.response || []

    // Merge all players for extra stats
    const allPlayersMap = new Map<string, any>()
    ;[...scorersRaw, ...assistsRaw].forEach((item: any) => {
      const id = item.player?.id?.toString()
      if (id && !allPlayersMap.has(id)) allPlayersMap.set(id, item)
    })
    const allPlayers = Array.from(allPlayersMap.values())

    const categories = {
      goals: extractPlayers(scorersRaw, (s) => s.goals?.total || 0).slice(0, 10),
      assists: extractPlayers(assistsRaw, (s) => s.goals?.assists || 0).slice(0, 10),
      shots: extractPlayers(allPlayers, (s) => s.shots?.total || 0).slice(0, 10),
      yellowCards: extractPlayers(allPlayers, (s) => s.cards?.yellow || 0).slice(0, 10),
      penalties: extractPlayers(allPlayers, (s) => s.penalty?.scored || 0).slice(0, 10),
      appearances: extractPlayers(allPlayers, (s) => s.games?.appearences || 0).slice(0, 10),
    }

    return NextResponse.json({ data: categories, source: "api" })
  } catch (error) {
    console.error("Player Stats API error:", error)

    // Fallback data for Premier League 2024/25
    const fallback = {
      goals: [
        { id: "1100", name: "Erling Haaland", photo: "https://media.api-sports.io/football/players/1100.png", team: "แมนเชสเตอร์ ซิตี้", teamLogo: "https://media.api-sports.io/football/teams/50.png", value: 22 },
        { id: "306", name: "Mohamed Salah", photo: "https://media.api-sports.io/football/players/306.png", team: "ลิเวอร์พูล", teamLogo: "https://media.api-sports.io/football/teams/40.png", value: 19 },
        { id: "18784", name: "Alexander Isak", photo: "https://media.api-sports.io/football/players/18784.png", team: "นิวคาสเซิล ยูไนเต็ด", teamLogo: "https://media.api-sports.io/football/teams/34.png", value: 17 },
        { id: "20574", name: "Cole Palmer", photo: "https://media.api-sports.io/football/players/20574.png", team: "เชลซี", teamLogo: "https://media.api-sports.io/football/teams/49.png", value: 14 },
        { id: "1467", name: "Bryan Mbeumo", photo: "https://media.api-sports.io/football/players/1467.png", team: "เบรนท์ฟอร์ด", teamLogo: "https://media.api-sports.io/football/teams/55.png", value: 13 },
        { id: "909", name: "Chris Wood", photo: "https://media.api-sports.io/football/players/909.png", team: "น็อตติงแฮม ฟอเรสต์", teamLogo: "https://media.api-sports.io/football/teams/65.png", value: 13 },
        { id: "19424", name: "Matheus Cunha", photo: "https://media.api-sports.io/football/players/19424.png", team: "วูล์ฟแฮมป์ตัน", teamLogo: "https://media.api-sports.io/football/teams/39.png", value: 12 },
        { id: "2413", name: "Ollie Watkins", photo: "https://media.api-sports.io/football/players/2413.png", team: "แอสตัน วิลล่า", teamLogo: "https://media.api-sports.io/football/teams/66.png", value: 11 },
        { id: "18", name: "Bukayo Saka", photo: "https://media.api-sports.io/football/players/18.png", team: "อาร์เซนอล", teamLogo: "https://media.api-sports.io/football/teams/42.png", value: 10 },
        { id: "174", name: "Bruno Fernandes", photo: "https://media.api-sports.io/football/players/174.png", team: "แมนเชสเตอร์ ยูไนเต็ด", teamLogo: "https://media.api-sports.io/football/teams/33.png", value: 9 },
      ],
      assists: [
        { id: "306", name: "Mohamed Salah", photo: "https://media.api-sports.io/football/players/306.png", team: "ลิเวอร์พูล", teamLogo: "https://media.api-sports.io/football/teams/40.png", value: 13 },
        { id: "18", name: "Bukayo Saka", photo: "https://media.api-sports.io/football/players/18.png", team: "อาร์เซนอล", teamLogo: "https://media.api-sports.io/football/teams/42.png", value: 10 },
        { id: "874", name: "Kevin De Bruyne", photo: "https://media.api-sports.io/football/players/874.png", team: "แมนเชสเตอร์ ซิตี้", teamLogo: "https://media.api-sports.io/football/teams/50.png", value: 9 },
        { id: "2413", name: "Ollie Watkins", photo: "https://media.api-sports.io/football/players/2413.png", team: "แอสตัน วิลล่า", teamLogo: "https://media.api-sports.io/football/teams/66.png", value: 7 },
        { id: "174", name: "Bruno Fernandes", photo: "https://media.api-sports.io/football/players/174.png", team: "แมนเชสเตอร์ ยูไนเต็ด", teamLogo: "https://media.api-sports.io/football/teams/33.png", value: 7 },
        { id: "20574", name: "Cole Palmer", photo: "https://media.api-sports.io/football/players/20574.png", team: "เชลซี", teamLogo: "https://media.api-sports.io/football/teams/49.png", value: 6 },
        { id: "1467", name: "Bryan Mbeumo", photo: "https://media.api-sports.io/football/players/1467.png", team: "เบรนท์ฟอร์ด", teamLogo: "https://media.api-sports.io/football/teams/55.png", value: 5 },
        { id: "19424", name: "Matheus Cunha", photo: "https://media.api-sports.io/football/players/19424.png", team: "วูล์ฟแฮมป์ตัน", teamLogo: "https://media.api-sports.io/football/teams/39.png", value: 5 },
        { id: "1100", name: "Erling Haaland", photo: "https://media.api-sports.io/football/players/1100.png", team: "แมนเชสเตอร์ ซิตี้", teamLogo: "https://media.api-sports.io/football/teams/50.png", value: 4 },
        { id: "18784", name: "Alexander Isak", photo: "https://media.api-sports.io/football/players/18784.png", team: "นิวคาสเซิล ยูไนเต็ด", teamLogo: "https://media.api-sports.io/football/teams/34.png", value: 4 },
      ],
      shots: [
        { id: "1100", name: "Erling Haaland", photo: "https://media.api-sports.io/football/players/1100.png", team: "แมนเชสเตอร์ ซิตี้", teamLogo: "https://media.api-sports.io/football/teams/50.png", value: 89 },
        { id: "306", name: "Mohamed Salah", photo: "https://media.api-sports.io/football/players/306.png", team: "ลิเวอร์พูล", teamLogo: "https://media.api-sports.io/football/teams/40.png", value: 76 },
        { id: "20574", name: "Cole Palmer", photo: "https://media.api-sports.io/football/players/20574.png", team: "เชลซี", teamLogo: "https://media.api-sports.io/football/teams/49.png", value: 71 },
        { id: "18784", name: "Alexander Isak", photo: "https://media.api-sports.io/football/players/18784.png", team: "นิวคาสเซิล ยูไนเต็ด", teamLogo: "https://media.api-sports.io/football/teams/34.png", value: 68 },
        { id: "18", name: "Bukayo Saka", photo: "https://media.api-sports.io/football/players/18.png", team: "อาร์เซนอล", teamLogo: "https://media.api-sports.io/football/teams/42.png", value: 62 },
        { id: "19424", name: "Matheus Cunha", photo: "https://media.api-sports.io/football/players/19424.png", team: "วูล์ฟแฮมป์ตัน", teamLogo: "https://media.api-sports.io/football/teams/39.png", value: 58 },
        { id: "174", name: "Bruno Fernandes", photo: "https://media.api-sports.io/football/players/174.png", team: "แมนเชสเตอร์ ยูไนเต็ด", teamLogo: "https://media.api-sports.io/football/teams/33.png", value: 55 },
        { id: "909", name: "Chris Wood", photo: "https://media.api-sports.io/football/players/909.png", team: "น็อตติงแฮม ฟอเรสต์", teamLogo: "https://media.api-sports.io/football/teams/65.png", value: 51 },
        { id: "1467", name: "Bryan Mbeumo", photo: "https://media.api-sports.io/football/players/1467.png", team: "เบรนท์ฟอร์ด", teamLogo: "https://media.api-sports.io/football/teams/55.png", value: 49 },
        { id: "2413", name: "Ollie Watkins", photo: "https://media.api-sports.io/football/players/2413.png", team: "แอสตัน วิลล่า", teamLogo: "https://media.api-sports.io/football/teams/66.png", value: 47 },
      ],
      yellowCards: [
        { id: "2295", name: "Joao Palhinha", photo: "https://media.api-sports.io/football/players/2295.png", team: "ฟูแล่ม", teamLogo: "https://media.api-sports.io/football/teams/36.png", value: 9 },
        { id: "2932", name: "Rodrigo Bentancur", photo: "https://media.api-sports.io/football/players/2932.png", team: "ท็อตแนม ฮอทสเปอร์", teamLogo: "https://media.api-sports.io/football/teams/47.png", value: 8 },
        { id: "152820", name: "Moises Caicedo", photo: "https://media.api-sports.io/football/players/152820.png", team: "เชลซี", teamLogo: "https://media.api-sports.io/football/teams/49.png", value: 8 },
        { id: "174", name: "Bruno Fernandes", photo: "https://media.api-sports.io/football/players/174.png", team: "แมนเชสเตอร์ ยูไนเต็ด", teamLogo: "https://media.api-sports.io/football/teams/33.png", value: 7 },
        { id: "1584", name: "Lewis Dunk", photo: "https://media.api-sports.io/football/players/1584.png", team: "ไบรท์ตัน", teamLogo: "https://media.api-sports.io/football/teams/51.png", value: 7 },
        { id: "2728", name: "Yves Bissouma", photo: "https://media.api-sports.io/football/players/2728.png", team: "ท็อตแนม ฮอทสเปอร์", teamLogo: "https://media.api-sports.io/football/teams/47.png", value: 7 },
        { id: "19424", name: "Matheus Cunha", photo: "https://media.api-sports.io/football/players/19424.png", team: "วูล์ฟแฮมป์ตัน", teamLogo: "https://media.api-sports.io/football/teams/39.png", value: 6 },
        { id: "909", name: "Chris Wood", photo: "https://media.api-sports.io/football/players/909.png", team: "น็อตติงแฮม ฟอเรสต์", teamLogo: "https://media.api-sports.io/football/teams/65.png", value: 6 },
        { id: "1245", name: "James Ward-Prowse", photo: "https://media.api-sports.io/football/players/1245.png", team: "เวสต์แฮม ยูไนเต็ด", teamLogo: "https://media.api-sports.io/football/teams/48.png", value: 6 },
        { id: "2467", name: "Marc Cucurella", photo: "https://media.api-sports.io/football/players/2467.png", team: "เชลซี", teamLogo: "https://media.api-sports.io/football/teams/49.png", value: 6 },
      ],
      penalties: [
        { id: "1100", name: "Erling Haaland", photo: "https://media.api-sports.io/football/players/1100.png", team: "แมนเชสเตอร์ ซิตี้", teamLogo: "https://media.api-sports.io/football/teams/50.png", value: 5 },
        { id: "306", name: "Mohamed Salah", photo: "https://media.api-sports.io/football/players/306.png", team: "ลิเวอร์พูล", teamLogo: "https://media.api-sports.io/football/teams/40.png", value: 5 },
        { id: "20574", name: "Cole Palmer", photo: "https://media.api-sports.io/football/players/20574.png", team: "เชลซี", teamLogo: "https://media.api-sports.io/football/teams/49.png", value: 4 },
        { id: "174", name: "Bruno Fernandes", photo: "https://media.api-sports.io/football/players/174.png", team: "แมนเชสเตอร์ ยูไนเต็ด", teamLogo: "https://media.api-sports.io/football/teams/33.png", value: 3 },
        { id: "18784", name: "Alexander Isak", photo: "https://media.api-sports.io/football/players/18784.png", team: "นิวคาสเซิล ยูไนเต็ด", teamLogo: "https://media.api-sports.io/football/teams/34.png", value: 2 },
        { id: "1467", name: "Bryan Mbeumo", photo: "https://media.api-sports.io/football/players/1467.png", team: "เบรนท์ฟอร์ด", teamLogo: "https://media.api-sports.io/football/teams/55.png", value: 2 },
        { id: "19424", name: "Matheus Cunha", photo: "https://media.api-sports.io/football/players/19424.png", team: "วูล์ฟแฮมป์ตัน", teamLogo: "https://media.api-sports.io/football/teams/39.png", value: 2 },
      ],
      appearances: [
        { id: "174", name: "Bruno Fernandes", photo: "https://media.api-sports.io/football/players/174.png", team: "แมนเชสเตอร์ ยูไนเต็ด", teamLogo: "https://media.api-sports.io/football/teams/33.png", value: 25 },
        { id: "306", name: "Mohamed Salah", photo: "https://media.api-sports.io/football/players/306.png", team: "ลิเวอร์พูล", teamLogo: "https://media.api-sports.io/football/teams/40.png", value: 25 },
        { id: "1100", name: "Erling Haaland", photo: "https://media.api-sports.io/football/players/1100.png", team: "แมนเชสเตอร์ ซิตี้", teamLogo: "https://media.api-sports.io/football/teams/50.png", value: 25 },
        { id: "20574", name: "Cole Palmer", photo: "https://media.api-sports.io/football/players/20574.png", team: "เชลซี", teamLogo: "https://media.api-sports.io/football/teams/49.png", value: 25 },
        { id: "1467", name: "Bryan Mbeumo", photo: "https://media.api-sports.io/football/players/1467.png", team: "เบรนท์ฟอร์ด", teamLogo: "https://media.api-sports.io/football/teams/55.png", value: 25 },
        { id: "19424", name: "Matheus Cunha", photo: "https://media.api-sports.io/football/players/19424.png", team: "วูล์ฟแฮมป์ตัน", teamLogo: "https://media.api-sports.io/football/teams/39.png", value: 25 },
        { id: "909", name: "Chris Wood", photo: "https://media.api-sports.io/football/players/909.png", team: "น็อตติงแฮม ฟอเรสต์", teamLogo: "https://media.api-sports.io/football/teams/65.png", value: 24 },
        { id: "2413", name: "Ollie Watkins", photo: "https://media.api-sports.io/football/players/2413.png", team: "แอสตัน วิลล่า", teamLogo: "https://media.api-sports.io/football/teams/66.png", value: 24 },
        { id: "18784", name: "Alexander Isak", photo: "https://media.api-sports.io/football/players/18784.png", team: "นิวคาสเซิล ยูไนเต็ด", teamLogo: "https://media.api-sports.io/football/teams/34.png", value: 24 },
        { id: "18", name: "Bukayo Saka", photo: "https://media.api-sports.io/football/players/18.png", team: "อาร์เซนอล", teamLogo: "https://media.api-sports.io/football/teams/42.png", value: 22 },
      ],
    }

    return NextResponse.json({ data: fallback, source: "fallback" })
  }
}
