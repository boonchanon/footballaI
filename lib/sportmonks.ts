import { PREMIER_LEAGUE_DATA_SEASON } from "@/lib/season"

// API-Football Integration
// Documentation: https://www.api-football.com/documentation-v3
// Premier League ID = 39 (English Premier League in API-Football)

const API_BASE = "https://v3.football.api-sports.io"
const PREMIER_LEAGUE_ID = 39
const CURRENT_SEASON = PREMIER_LEAGUE_DATA_SEASON.apiYear

// For backwards compatibility
const CURRENT_SEASON_ID = CURRENT_SEASON

// Team name translations
const teamNamesThai: Record<string, string> = {
  "Manchester City": "แมนเชสเตอร์ ซิตี้",
  Arsenal: "อาร์เซนอล",
  Liverpool: "ลิเวอร์พูล",
  "Aston Villa": "แอสตัน วิลล่า",
  "Tottenham Hotspur": "ท็อตแนม ฮอทสเปอร์",
  Tottenham: "ท็อตแนม ฮอทสเปอร์",
  Chelsea: "เชลซี",
  "Newcastle United": "นิวคาสเซิล ยูไนเต็ด",
  Newcastle: "นิวคาสเซิล ยูไนเต็ด",
  "Manchester United": "แมนเชสเตอร์ ยูไนเต็ด",
  "West Ham United": "เวสต์แฮม ยูไนเต็ด",
  "West Ham": "เวสต์แฮม ยูไนเต็ด",
  "Crystal Palace": "คริสตัล พาเลซ",
  "Brighton & Hove Albion": "ไบรท์ตัน",
  Brighton: "ไบรท์ตัน",
  "AFC Bournemouth": "บอร์นมัธ",
  Bournemouth: "บอร์นมัธ",
  Fulham: "ฟูแล่ม",
  "Wolverhampton Wanderers": "วูล์ฟแฮมป์ตัน",
  Wolves: "วูล์ฟแฮมป์ตัน",
  Everton: "เอฟเวอร์ตัน",
  "Brentford FC": "เบรนท์ฟอร์ด",
  Brentford: "เบรนท์ฟอร์ด",
  "Nottingham Forest": "น็อตติงแฮม ฟอเรสต์",
  "Leicester City": "เลสเตอร์ ซิตี้",
  Leicester: "เลสเตอร์ ซิตี้",
  "Ipswich Town": "อิปสวิช ทาวน์",
  Ipswich: "อิปสวิช ทาวน์",
  Southampton: "เซาแธมป์ตัน",
}

export function translateTeamName(name: string): string {
  if (!name) return name
  if (teamNamesThai[name]) return teamNamesThai[name]

  for (const [key, value] of Object.entries(teamNamesThai)) {
    if (name.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }
  return name
}

async function fetchFromAPI(endpoint: string) {
  const apiKey = process.env.API_FOOTBALL_KEY

  if (!apiKey) {
    throw new Error(
      "API_FOOTBALL_KEY is not configured. Please add your API-Football key to environment variables. Get your key from https://www.api-football.com/"
    )
  }

  const url = `${API_BASE}${endpoint}`

  const response = await fetch(url, {
    headers: {
      "x-apisports-key": apiKey,
    },
    next: { revalidate: 300 }, // Cache for 5 minutes
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("API-Football Error:", errorText)
    throw new Error(`API-Football error: ${response.status}`)
  }

  const data = await response.json()

  // Check for API errors in response
  if (data.errors && Object.keys(data.errors).length > 0) {
    console.error("API-Football Error:", data.errors)
    throw new Error(`API-Football error: ${JSON.stringify(data.errors)}`)
  }

  return data
}

// Get Premier League standings
export async function getStandings(season: number = CURRENT_SEASON) {
  const data = await fetchFromAPI(`/standings?league=${PREMIER_LEAGUE_ID}&season=${season}`)

  if (!data.response || data.response.length === 0) {
    return []
  }

  // Transform to match expected format
  const standings = data.response[0]?.league?.standings?.[0] || []

  return standings.map((team: any) => ({
    position: team.rank,
    participant_id: team.team.id,
    participant: {
      id: team.team.id,
      name: team.team.name,
      image_path: team.team.logo,
    },
    points: team.points,
    games_played: team.all.played,
    won: team.all.win,
    draw: team.all.draw,
    lost: team.all.lose,
    goals_for: team.all.goals.for,
    goals_against: team.all.goals.against,
    goal_difference: team.goalsDiff,
    form: team.form,
    description: team.description,
  }))
}

// Get fixtures (matches)
export async function getFixtures(
  params: {
    seasonId?: number
    round?: string
    from?: string
    to?: string
  } = {}
) {
  const season = params.seasonId || CURRENT_SEASON
  let endpoint = `/fixtures?league=${PREMIER_LEAGUE_ID}&season=${season}`

  if (params.round) {
    endpoint += `&round=Regular Season - ${params.round}`
  }
  if (params.from) {
    endpoint += `&from=${params.from}`
  }
  if (params.to) {
    endpoint += `&to=${params.to}`
  }

  const data = await fetchFromAPI(endpoint)

  // Transform to match expected format
  return (data.response || []).map((fixture: any) => ({
    id: fixture.fixture.id,
    starting_at: fixture.fixture.date,
    state: {
      id: mapStatusToStateId(fixture.fixture.status.short),
      name: fixture.fixture.status.long,
      short_name: fixture.fixture.status.short,
    },
    round: {
      id: fixture.league.round,
      name: fixture.league.round,
    },
    venue: fixture.fixture.venue
      ? {
          id: fixture.fixture.venue.id,
          name: fixture.fixture.venue.name,
          city: fixture.fixture.venue.city,
        }
      : null,
    participants: [
      {
        id: fixture.teams.home.id,
        name: fixture.teams.home.name,
        image_path: fixture.teams.home.logo,
        meta: { location: "home" },
      },
      {
        id: fixture.teams.away.id,
        name: fixture.teams.away.name,
        image_path: fixture.teams.away.logo,
        meta: { location: "away" },
      },
    ],
    scores: [
      {
        participant_id: fixture.teams.home.id,
        score: { goals: fixture.goals.home },
      },
      {
        participant_id: fixture.teams.away.id,
        score: { goals: fixture.goals.away },
      },
    ],
  }))
}

// Map API-Football status to state ID
function mapStatusToStateId(status: string): number {
  const statusMap: Record<string, number> = {
    TBD: 21,
    NS: 1,
    "1H": 13,
    HT: 14,
    "2H": 15,
    ET: 16,
    BT: 17,
    P: 18,
    SUSP: 11,
    INT: 12,
    FT: 3,
    AET: 4,
    PEN: 5,
    PST: 6,
    CANC: 7,
    ABD: 8,
    AWD: 9,
    WO: 10,
    LIVE: 2,
  }
  return statusMap[status] || 1
}

// Get all teams in Premier League
export async function getTeams(season: number = CURRENT_SEASON) {
  const data = await fetchFromAPI(`/teams?league=${PREMIER_LEAGUE_ID}&season=${season}`)

  return (data.response || []).map((item: any) => ({
    id: item.team.id,
    name: item.team.name,
    image_path: item.team.logo,
    venue: item.venue
      ? {
          id: item.venue.id,
          name: item.venue.name,
          city: item.venue.city,
          capacity: item.venue.capacity,
          image_path: item.venue.image,
        }
      : null,
  }))
}

// Get top scorers
export async function getTopScorers(season: number = CURRENT_SEASON) {
  const data = await fetchFromAPI(`/players/topscorers?league=${PREMIER_LEAGUE_ID}&season=${season}`)

  return (data.response || []).map((item: any, index: number) => ({
    position: index + 1,
    player: {
      id: item.player.id,
      name: item.player.name,
      image_path: item.player.photo,
      nationality: item.player.nationality,
    },
    participant: {
      id: item.statistics[0]?.team?.id,
      name: item.statistics[0]?.team?.name,
      image_path: item.statistics[0]?.team?.logo,
    },
    total: item.statistics[0]?.goals?.total || 0,
    type_id: 208,
  }))
}

// Get top assists
export async function getTopAssists(season: number = CURRENT_SEASON) {
  const data = await fetchFromAPI(`/players/topassists?league=${PREMIER_LEAGUE_ID}&season=${season}`)

  return (data.response || []).map((item: any, index: number) => ({
    position: index + 1,
    player: {
      id: item.player.id,
      name: item.player.name,
      image_path: item.player.photo,
      nationality: item.player.nationality,
    },
    participant: {
      id: item.statistics[0]?.team?.id,
      name: item.statistics[0]?.team?.name,
      image_path: item.statistics[0]?.team?.logo,
    },
    total: item.statistics[0]?.goals?.assists || 0,
    type_id: 84,
  }))
}

// Get team statistics for clean sheets
export async function getTopCleanSheets(season: number = CURRENT_SEASON) {
  // Get standings which include team statistics
  const standingsData = await getStandings(season)

  // For clean sheets, we need to get team statistics
  const teamsWithCleanSheets = await Promise.all(
    standingsData.slice(0, 10).map(async (team: any) => {
      try {
        const stats = await fetchFromAPI(
          `/teams/statistics?league=${PREMIER_LEAGUE_ID}&season=${season}&team=${team.participant_id}`
        )
        return {
          teamId: team.participant_id,
          teamName: team.participant?.name || "",
          teamLogo: team.participant?.image_path || "",
          cleanSheets: stats.response?.clean_sheet?.total || 0,
        }
      } catch {
        return {
          teamId: team.participant_id,
          teamName: team.participant?.name || "",
          teamLogo: team.participant?.image_path || "",
          cleanSheets: 0,
        }
      }
    })
  )

  return teamsWithCleanSheets.sort((a, b) => b.cleanSheets - a.cleanSheets)
}

// Get fixture predictions
export async function getPredictions(fixtureId: string) {
  const data = await fetchFromAPI(`/predictions?fixture=${fixtureId}`)

  if (!data.response || data.response.length === 0) {
    return null
  }

  const prediction = data.response[0]
  return {
    predictions: prediction.predictions,
    teams: prediction.teams,
    comparison: prediction.comparison,
    h2h: prediction.h2h,
  }
}

// Get head to head
export async function getHeadToHead(team1: string, team2: string) {
  const data = await fetchFromAPI(`/fixtures/headtohead?h2h=${team1}-${team2}&last=10`)

  return (data.response || []).map((fixture: any) => ({
    id: fixture.fixture.id,
    starting_at: fixture.fixture.date,
    participants: [
      {
        id: fixture.teams.home.id,
        name: fixture.teams.home.name,
        image_path: fixture.teams.home.logo,
        meta: { location: "home" },
      },
      {
        id: fixture.teams.away.id,
        name: fixture.teams.away.name,
        image_path: fixture.teams.away.logo,
        meta: { location: "away" },
      },
    ],
    scores: [
      {
        participant_id: fixture.teams.home.id,
        score: { goals: fixture.goals.home },
      },
      {
        participant_id: fixture.teams.away.id,
        score: { goals: fixture.goals.away },
      },
    ],
  }))
}

// Get team statistics
export async function getTeamStats(teamId: string, season: number = CURRENT_SEASON) {
  const data = await fetchFromAPI(`/teams/statistics?league=${PREMIER_LEAGUE_ID}&season=${season}&team=${teamId}`)
  return data.response || null
}

// Get rounds
export async function getRounds(season: number = CURRENT_SEASON) {
  const data = await fetchFromAPI(`/fixtures/rounds?league=${PREMIER_LEAGUE_ID}&season=${season}`)

  return (data.response || []).map((round: string, index: number) => ({
    id: index + 1,
    name: round,
  }))
}

// Helper to format date in Thai
export function formatDateThai(dateString: string): string {
  const date = new Date(dateString)
  const thaiMonths = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ]
  const day = date.getDate()
  const month = thaiMonths[date.getMonth()]
  const year = date.getFullYear() + 543
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")

  return `${day} ${month} ${year} ${hours}:${minutes} น.`
}

// Helper to get time ago in Thai
export function getTimeAgoThai(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`
  if (diffHours < 24) return `${diffHours} ชม. ที่แล้ว`
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`
  return formatDateThai(dateString)
}

// Status translation
export function translateStatus(
  stateId: number,
  stateName?: string
): { short: string; long: string } {
  const statusMap: Record<number, { short: string; long: string }> = {
    1: { short: "NS", long: "ยังไม่เริ่ม" },
    2: { short: "LIVE", long: "กำลังแข่ง" },
    3: { short: "FT", long: "จบเกม" },
    4: { short: "AET", long: "จบหลังต่อเวลา" },
    5: { short: "PEN", long: "จบหลังดวลโทษ" },
    6: { short: "PST", long: "เลื่อนแข่ง" },
    7: { short: "CANC", long: "ยกเลิก" },
    8: { short: "ABD", long: "ยกเลิกกลางคัน" },
    9: { short: "AWD", long: "ตัดสินให้ชนะ" },
    10: { short: "WO", long: "ชนะโดยวอล์กโอเวอร์" },
    11: { short: "SUSP", long: "ถูกระงับ" },
    12: { short: "INT", long: "หยุดชั่วคราว" },
    13: { short: "1H", long: "ครึ่งแรก" },
    14: { short: "HT", long: "พักครึ่ง" },
    15: { short: "2H", long: "ครึ่งหลัง" },
    16: { short: "ET", long: "ต่อเวลา" },
    17: { short: "BT", long: "พัก" },
    18: { short: "P", long: "ดวลจุดโทษ" },
    21: { short: "TBD", long: "รอกำหนด" },
  }
  return statusMap[stateId] || { short: stateName || "UNK", long: stateName || "ไม่ทราบ" }
}

// Get player details and statistics
export async function getPlayerStats(playerId: string, season: number = CURRENT_SEASON) {
  const data = await fetchFromAPI(`/players?id=${playerId}&season=${season}`)

  if (!data.response || data.response.length === 0) {
    return null
  }

  const player = data.response[0]
  return {
    id: player.player.id,
    name: player.player.name,
    firstname: player.player.firstname,
    lastname: player.player.lastname,
    image_path: player.player.photo,
    nationality: player.player.nationality,
    height: player.player.height,
    weight: player.player.weight,
    age: player.player.age,
    birth: player.player.birth,
    position: player.statistics[0]?.games?.position,
    teams: player.statistics.map((stat: any) => ({
      id: stat.team.id,
      name: stat.team.name,
      logo: stat.team.logo,
    })),
    statistics: player.statistics[0] || {},
  }
}

// Get player's transfers
export async function getPlayerTransfers(playerId: string) {
  const data = await fetchFromAPI(`/transfers?player=${playerId}`)

  return (data.response || []).map((transfer: any) => ({
    date: transfer.date,
    type: transfer.type,
    fromteam: {
      id: transfer.teams.out.id,
      name: transfer.teams.out.name,
      logo: transfer.teams.out.logo,
    },
    toteam: {
      id: transfer.teams.in.id,
      name: transfer.teams.in.name,
      logo: transfer.teams.in.logo,
    },
  }))
}

// Search players by name
export async function searchPlayers(name: string, season: number = CURRENT_SEASON) {
  const data = await fetchFromAPI(
    `/players?league=${PREMIER_LEAGUE_ID}&season=${season}&search=${encodeURIComponent(name)}`
  )

  return (data.response || []).map((item: any) => ({
    id: item.player.id,
    name: item.player.name,
    image_path: item.player.photo,
    nationality: item.player.nationality,
    position: item.statistics[0]?.games?.position,
    teams: item.statistics.map((stat: any) => ({
      id: stat.team.id,
      name: stat.team.name,
      logo: stat.team.logo,
    })),
  }))
}

export { PREMIER_LEAGUE_ID, CURRENT_SEASON_ID }
