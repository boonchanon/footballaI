import { NextResponse } from "next/server"

type TheSportsDbLeague = {
  idLeague?: string
  strLeague?: string
  strLeagueAlternate?: string
  strCurrentSeason?: string
}

type TheSportsDbEvent = {
  idEvent?: string
  strLeague?: string
  strSeason?: string
  strRound?: string
  strHomeTeam?: string
  strAwayTeam?: string
  intHomeScore?: string
  intAwayScore?: string
  dateEvent?: string
  strVenue?: string
  strStatus?: string
}

type TheSportsDbTeam = {
  strTeam?: string
  strBadge?: string
  strTeamBadge?: string
}

type TeamVisual = {
  flag: string
  badge: string
}

type ScoreItem = {
  id: string
  stage: string
  date: string
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  homeFlag: string
  awayFlag: string
  homeBadge: string
  awayBadge: string
  venue: string
  status: "live" | "finished" | "upcoming"
  note: string
}

const API_BASE = "https://www.thesportsdb.com/api/v1/json"
const API_KEY = process.env.THESPORTSDB_API_KEY || "123"
const WORLD_CUP_KEYWORDS = ["fifa world cup", "world cup"]

const teamVisualMap: Record<string, TeamVisual> = {
  Argentina: { flag: "🇦🇷", badge: "" },
  France: { flag: "🇫🇷", badge: "" },
  Morocco: { flag: "🇲🇦", badge: "" },
  "Saudi Arabia": { flag: "🇸🇦", badge: "" },
  "United States": { flag: "🇺🇸", badge: "" },
  USA: { flag: "🇺🇸", badge: "" },
  Mexico: { flag: "🇲🇽", badge: "" },
  Canada: { flag: "🇨🇦", badge: "" },
  Brazil: { flag: "🇧🇷", badge: "" },
  England: { flag: "🏴", badge: "" },
  Spain: { flag: "🇪🇸", badge: "" },
  Germany: { flag: "🇩🇪", badge: "" },
  Portugal: { flag: "🇵🇹", badge: "" },
  Netherlands: { flag: "🇳🇱", badge: "" },
  Belgium: { flag: "🇧🇪", badge: "" },
  Italy: { flag: "🇮🇹", badge: "" },
  Croatia: { flag: "🇭🇷", badge: "" },
  Uruguay: { flag: "🇺🇾", badge: "" },
  Colombia: { flag: "🇨🇴", badge: "" },
  Japan: { flag: "🇯🇵", badge: "" },
  "South Korea": { flag: "🇰🇷", badge: "" },
  Korea: { flag: "🇰🇷", badge: "" },
  Australia: { flag: "🇦🇺", badge: "" },
  Iran: { flag: "🇮🇷", badge: "" },
  Senegal: { flag: "🇸🇳", badge: "" },
  Nigeria: { flag: "🇳🇬", badge: "" },
  Ecuador: { flag: "🇪🇨", badge: "" },
  Paraguay: { flag: "🇵🇾", badge: "" },
  Venezuela: { flag: "🇻🇪", badge: "" },
  "Costa Rica": { flag: "🇨🇷", badge: "" },
  Jamaica: { flag: "🇯🇲", badge: "" },
  Cameroon: { flag: "🇨🇲", badge: "" },
  Ghana: { flag: "🇬🇭", badge: "" },
  Tunisia: { flag: "🇹🇳", badge: "" },
  "Host Nation": { flag: "🏆", badge: "" },
  TBD: { flag: "•", badge: "" },
}

const fallbackRecentResults: ScoreItem[] = [
  {
    id: "wc-2022-final",
    stage: "Final",
    date: "2022-12-18",
    homeTeam: "Argentina",
    awayTeam: "France",
    homeScore: 3,
    awayScore: 3,
    homeFlag: "🇦🇷",
    awayFlag: "🇫🇷",
    homeBadge: "",
    awayBadge: "",
    venue: "Lusail Iconic Stadium",
    status: "finished",
    note: "Argentina won 4-2 on penalties.",
  },
  {
    id: "wc-2022-semi-2",
    stage: "Semi-final",
    date: "2022-12-14",
    homeTeam: "France",
    awayTeam: "Morocco",
    homeScore: 2,
    awayScore: 0,
    homeFlag: "🇫🇷",
    awayFlag: "🇲🇦",
    homeBadge: "",
    awayBadge: "",
    venue: "Al Bayt Stadium",
    status: "finished",
    note: "France advanced to the final.",
  },
  {
    id: "wc-2022-shock",
    stage: "Group Stage",
    date: "2022-11-22",
    homeTeam: "Argentina",
    awayTeam: "Saudi Arabia",
    homeScore: 1,
    awayScore: 2,
    homeFlag: "🇦🇷",
    awayFlag: "🇸🇦",
    homeBadge: "",
    awayBadge: "",
    venue: "Lusail Iconic Stadium",
    status: "finished",
    note: "One of the biggest early upsets of the tournament.",
  },
]

const fallbackUpcomingFixtures: ScoreItem[] = [
  {
    id: "wc-2026-placeholder-1",
    stage: "Opening Match Window",
    date: "2026-06-11",
    homeTeam: "Host Nation",
    awayTeam: "TBD",
    homeScore: null,
    awayScore: null,
    homeFlag: "🏆",
    awayFlag: "•",
    homeBadge: "",
    awayBadge: "",
    venue: "TBD",
    status: "upcoming",
    note: "Waiting for the official draw and fixture release.",
  },
  {
    id: "wc-2026-placeholder-2",
    stage: "Group Stage",
    date: "2026-06-12",
    homeTeam: "TBD",
    awayTeam: "TBD",
    homeScore: null,
    awayScore: null,
    homeFlag: "•",
    awayFlag: "•",
    homeBadge: "",
    awayBadge: "",
    venue: "TBD",
    status: "upcoming",
    note: "Fixtures will be replaced automatically when the free feed has data.",
  },
]

function parseScore(value?: string) {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function mapStatus(status?: string, homeScore?: string, awayScore?: string): "live" | "finished" | "upcoming" {
  const value = (status || "").toLowerCase()

  if (value.includes("live") || value.includes("in play") || value.includes("1h") || value.includes("2h") || value.includes("ht")) {
    return "live"
  }

  if (value.includes("ft") || value.includes("full") || value.includes("aet") || value.includes("pen") || (homeScore && awayScore)) {
    return "finished"
  }

  return "upcoming"
}

async function fetchJson<T>(path: string) {
  const response = await fetch(`${API_BASE}/${API_KEY}/${path}`, {
    next: { revalidate: 900 },
  })

  if (!response.ok) {
    throw new Error(`TheSportsDB request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

function pickWorldCupLeague(leagues: TheSportsDbLeague[]) {
  const candidates = leagues.filter((league) => {
    const haystack = `${league.strLeague || ""} ${league.strLeagueAlternate || ""}`.toLowerCase()
    return WORLD_CUP_KEYWORDS.some((keyword) => haystack.includes(keyword))
  })

  return (
    candidates.find((league) => league.strCurrentSeason?.includes("2026")) ||
    candidates.find((league) => (league.strLeague || "").toLowerCase() === "fifa world cup") ||
    candidates[0] ||
    null
  )
}

async function loadWorldCupLeagueId() {
  const data = await fetchJson<{ countries?: TheSportsDbLeague[] }>("search_all_leagues.php?s=Soccer")
  const leagues = data.countries || []
  const worldCupLeague = pickWorldCupLeague(leagues)

  return worldCupLeague?.idLeague || null
}

function getFallbackVisual(teamName: string): TeamVisual {
  return teamVisualMap[teamName] || { flag: "⚽", badge: "" }
}

async function loadTeamVisuals(teamNames: string[]) {
  const uniqueNames = [...new Set(teamNames.filter(Boolean))]
  const visuals = new Map<string, TeamVisual>()

  await Promise.all(
    uniqueNames.map(async (teamName) => {
      try {
        const data = await fetchJson<{ teams?: TheSportsDbTeam[] }>(`searchteams.php?t=${encodeURIComponent(teamName)}`)
        const team = data.teams?.[0]
        const fallback = getFallbackVisual(teamName)

        visuals.set(teamName, {
          flag: fallback.flag,
          badge: team?.strBadge || team?.strTeamBadge || fallback.badge,
        })
      } catch {
        visuals.set(teamName, getFallbackVisual(teamName))
      }
    }),
  )

  return visuals
}

function normalizeEvent(event: TheSportsDbEvent, visuals: Map<string, TeamVisual>): ScoreItem | null {
  if (!event.idEvent || !event.strHomeTeam || !event.strAwayTeam || !event.dateEvent) {
    return null
  }

  const status = mapStatus(event.strStatus, event.intHomeScore, event.intAwayScore)
  const homeVisual = visuals.get(event.strHomeTeam) || getFallbackVisual(event.strHomeTeam)
  const awayVisual = visuals.get(event.strAwayTeam) || getFallbackVisual(event.strAwayTeam)

  return {
    id: event.idEvent,
    stage: event.strRound || event.strSeason || event.strLeague || "World Cup",
    date: event.dateEvent,
    homeTeam: event.strHomeTeam,
    awayTeam: event.strAwayTeam,
    homeScore: parseScore(event.intHomeScore),
    awayScore: parseScore(event.intAwayScore),
    homeFlag: homeVisual.flag,
    awayFlag: awayVisual.flag,
    homeBadge: homeVisual.badge,
    awayBadge: awayVisual.badge,
    venue: event.strVenue || "TBD",
    status,
    note: event.strStatus || (status === "finished" ? "Full-time result from TheSportsDB." : status === "live" ? "Live score from TheSportsDB." : "Upcoming fixture from TheSportsDB."),
  }
}

export async function GET() {
  try {
    const leagueId = await loadWorldCupLeagueId()

    if (!leagueId) {
      return NextResponse.json({
        recentResults: fallbackRecentResults,
        upcomingFixtures: fallbackUpcomingFixtures,
        source: "fallback",
        note: "World Cup league was not found in TheSportsDB directory.",
      })
    }

    const [recentData, upcomingData] = await Promise.all([
      fetchJson<{ results?: TheSportsDbEvent[] }>(`eventslast.php?id=${leagueId}`),
      fetchJson<{ events?: TheSportsDbEvent[] }>(`eventsnext.php?id=${leagueId}`),
    ])

    const allEvents = [...(recentData.results || []), ...(upcomingData.events || [])]
    const teamVisuals = await loadTeamVisuals(
      allEvents.flatMap((event) => [event.strHomeTeam || "", event.strAwayTeam || ""]),
    )

    const recentResults = (recentData.results || [])
      .map((event) => normalizeEvent(event, teamVisuals))
      .filter((event): event is ScoreItem => Boolean(event))
      .slice(0, 6)

    const upcomingFixtures = (upcomingData.events || [])
      .map((event) => normalizeEvent(event, teamVisuals))
      .filter((event): event is ScoreItem => Boolean(event))
      .slice(0, 4)

    return NextResponse.json({
      recentResults: recentResults.length ? recentResults : fallbackRecentResults,
      upcomingFixtures: upcomingFixtures.length ? upcomingFixtures : fallbackUpcomingFixtures,
      source: "TheSportsDB",
      leagueId,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      recentResults: fallbackRecentResults,
      upcomingFixtures: fallbackUpcomingFixtures,
      source: "fallback",
      error: error instanceof Error ? error.message : "Failed to fetch World Cup scores",
    })
  }
}
