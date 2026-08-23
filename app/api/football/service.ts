import { connectDatabase } from "@/lib/server/db"
import { PremierLeagueFixture, PremierLeagueTeam } from "@/lib/server/models"
import {
  getPremierLeagueSeasonByLabel,
  PREMIER_LEAGUE_DATA_SEASON,
  PREMIER_LEAGUE_SEASON_CATALOG,
  type PremierLeagueSeasonCatalogEntry,
} from "@/lib/season"
import { getFootballApiConfig, getFootballTeamsApiConfig } from "@/lib/server/app-settings"

const API_BASE_URL = (process.env.API_BASE_URL || process.env.ALLSPORTS_API_BASE_URL || "https://apiv2.allsportsapi.com/football/").replace(/\/+$/, "")
const API_KEY = process.env.API_KEY || process.env.ALLSPORTS_API_KEY || ""
const DEFAULT_LEAGUE_ID = process.env.PREMIER_LEAGUE_ID || "152"
const CURRENT_SEASON_START = PREMIER_LEAGUE_DATA_SEASON.startDate
const CURRENT_SEASON_END = PREMIER_LEAGUE_DATA_SEASON.endDate
const FIXTURE_CACHE_MAX_AGE_MS = 1000 * 60 * 30
const TEAM_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 12
const PREMIER_LEAGUE_SOURCE_TIME_ZONE = "Europe/London"

function getRoundNumber(value?: string | null) {
  if (!value) return null
  const match = value.match(/(\d+)/)
  return match ? Number(match[1]) : null
}

function normalizeStatusValue(status?: string | null) {
  return String(status || "").trim().toLowerCase()
}

function isFinishedStatus(status?: string | null) {
  const normalized = normalizeStatusValue(status)
  return ["finished", "ft", "full time", "after extra time", "penalties", "aet"].includes(normalized)
}

function isLiveStatus(status?: string | null) {
  const normalized = normalizeStatusValue(status)
  if (!normalized || normalized === "0" || normalized === "ns" || normalized === "not started") return false

  if (
    normalized.includes("live") ||
    normalized.includes("1h") ||
    normalized.includes("2h") ||
    normalized.includes("half") ||
    normalized === "ht"
  ) {
    return true
  }

  if (/^\d+$/.test(normalized)) {
    const numericStatus = Number(normalized)
    return Number.isFinite(numericStatus) && numericStatus > 0 && numericStatus <= 120
  }

  return false
}

function isProviderLiveFlag(value: unknown) {
  return String(value ?? "").trim() === "1"
}

async function fetchAllSportsApi(params: Record<string, string>) {
  if (!API_KEY) {
    throw new Error("API_KEY or ALLSPORTS_API_KEY is not configured")
  }

  const normalizedParams =
    params.met === "Fixtures" && !params.timezone
      ? {
          ...params,
          timezone: PREMIER_LEAGUE_SOURCE_TIME_ZONE,
        }
      : params

  const search = new URLSearchParams({
    ...normalizedParams,
    APIkey: API_KEY,
  })

  const response = await fetch(`${API_BASE_URL}/?${search.toString()}`, {
    method: "GET",
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`AllSportsAPI request failed: ${response.status}`)
  }

  const payload = await response.json()
  if (Array.isArray(payload?.result)) {
    return payload.result
  }
  if (Array.isArray(payload?.result?.total)) {
    return payload.result.total
  }
  if (Array.isArray(payload?.result?.home)) {
    return payload.result.home
  }
  if (payload?.success === 1) {
    return []
  }
  throw new Error(payload?.error || "AllSportsAPI returned an invalid response")
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date)

  const year = Number(parts.find((part) => part.type === "year")?.value || "1970")
  const month = Number(parts.find((part) => part.type === "month")?.value || "01")
  const day = Number(parts.find((part) => part.type === "day")?.value || "01")
  const hour = Number(parts.find((part) => part.type === "hour")?.value || "00")
  const minute = Number(parts.find((part) => part.type === "minute")?.value || "00")
  const second = Number(parts.find((part) => part.type === "second")?.value || "00")

  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second)
  return asUtc - date.getTime()
}

function toUtcIsoFromTimeZone(dateValue?: string, timeValue?: string, timeZone: string = PREMIER_LEAGUE_SOURCE_TIME_ZONE) {
  if (!dateValue) {
    return "1970-01-01T00:00:00.000Z"
  }

  const [year, month, day] = dateValue.split("-").map(Number)
  const [hour = 0, minute = 0, second = 0] = String(timeValue || "00:00:00")
    .split(":")
    .map((value) => Number(value) || 0)

  let utcGuess = Date.UTC(year || 1970, (month || 1) - 1, day || 1, hour, minute, second)

  // Resolve DST-aware offset for the source timezone.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const offset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone)
    utcGuess = Date.UTC(year || 1970, (month || 1) - 1, day || 1, hour, minute, second) - offset
  }

  return new Date(utcGuess).toISOString()
}

function toScoreNumber(value: unknown) {
  if (value === "" || value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseScorePair(value: unknown) {
  const normalized = String(value ?? "").trim()
  const match = normalized.match(/(\d+)\s*-\s*(\d+)/)
  if (!match) return { home: null, away: null }

  return {
    home: Number(match[1]),
    away: Number(match[2]),
  }
}

function countGoalsFromScorers(goalscorer: unknown) {
  let home = 0
  let away = 0

  for (const goal of Array.isArray(goalscorer) ? goalscorer : []) {
    const homeScorer = String(goal?.home_scorer || "").trim()
    const awayScorer = String(goal?.away_scorer || "").trim()

    if (homeScorer && homeScorer !== "-") home += 1
    if (awayScorer && awayScorer !== "-") away += 1
  }

  return {
    home: home > 0 ? home : null,
    away: away > 0 ? away : null,
  }
}

function mapFixture(item: any) {
  const matchId = item.match_id || item.event_key || item.fixture_id || ""
  const matchDate = item.match_date || item.event_date || item.fixture_date || ""
  const matchTime = item.match_time || item.event_time || item.fixture_time || ""
  const statusValue = item.match_status || item.event_status || item.event_status_info || item.status || "NS"
  const roundValue = item.match_round || item.league_round || item.round || null
  const homeTeamId = item.match_hometeam_id || item.home_team_key || item.team_home_key || item.home_id || ""
  const awayTeamId = item.match_awayteam_id || item.away_team_key || item.team_away_key || item.away_id || ""
  const homeTeamName = item.match_hometeam_name || item.event_home_team || item.home_team_name || item.home_name || ""
  const awayTeamName = item.match_awayteam_name || item.event_away_team || item.away_team_name || item.away_name || ""
  const homeLogo = item.team_home_badge || item.match_hometeam_logo || item.event_home_team_logo || item.home_team_logo || ""
  const awayLogo = item.team_away_badge || item.match_awayteam_logo || item.event_away_team_logo || item.away_team_logo || ""
  const venueName = item.match_stadium || item.stadium || item.event_stadium || item.venue_name || "สนามแข่งขัน"
  const directHomeScore =
    toScoreNumber(item.match_hometeam_score) ??
    toScoreNumber(item.event_home_final_result) ??
    toScoreNumber(item.home_score)
  const directAwayScore =
    toScoreNumber(item.match_awayteam_score) ??
    toScoreNumber(item.event_away_final_result) ??
    toScoreNumber(item.away_score)
  const parsedFinalScore = parseScorePair(item.event_final_result ?? item.event_ft_result ?? item.match_result)
  const countedGoals = countGoalsFromScorers(item.goalscorer)
  const providerLiveFlag = item.event_live ?? item.match_live ?? item.live ?? null

  const isoDate = toUtcIsoFromTimeZone(matchDate, matchTime)
  const finished = isFinishedStatus(statusValue)
  const live = !finished && (isProviderLiveFlag(providerLiveFlag) || isLiveStatus(statusValue))
  const homeScoreValue = directHomeScore ?? parsedFinalScore.home ?? countedGoals.home
  const awayScoreValue = directAwayScore ?? parsedFinalScore.away ?? countedGoals.away

  return {
    id: String(matchId),
    roundNumber: getRoundNumber(roundValue),
    date: isoDate,
    dateThai: matchDate,
    venue: {
      name: venueName,
    },
    teams: {
      home: {
        id: String(homeTeamId),
        name: homeTeamName,
        nameEn: homeTeamName,
        logo: homeLogo,
      },
      away: {
        id: String(awayTeamId),
        name: awayTeamName,
        nameEn: awayTeamName,
        logo: awayLogo,
      },
    },
    goals: {
      home: homeScoreValue,
      away: awayScoreValue,
    },
    status: {
      short: statusValue,
      long: statusValue,
      isLive: live,
      isFinished: finished,
      isUpcoming: !live && !finished,
    },
  }
}

function isValidFixture(fixture: any) {
  return Boolean(
    fixture &&
      String(fixture.id || "").trim() &&
      String(fixture.date || "").trim() &&
      !String(fixture.date || "").startsWith("1970-01-01") &&
      String(fixture.teams?.home?.name || "").trim() &&
      String(fixture.teams?.away?.name || "").trim(),
  )
}

function mapStanding(item: any) {
  const played =
    Number(
      item.overall_league_payed ??
        item.overall_gp ??
        item.matches_played ??
        item.played ??
        item.standing_P ??
        0,
    ) || 0
  const won = Number(item.overall_league_W ?? item.overall_w ?? item.won ?? item.standing_W ?? 0) || 0
  const drawn = Number(item.overall_league_D ?? item.overall_d ?? item.draw ?? item.standing_D ?? 0) || 0
  const lost = Number(item.overall_league_L ?? item.overall_l ?? item.lost ?? item.standing_L ?? 0) || 0
  const gf = Number(item.overall_league_GF ?? item.overall_gs ?? item.goals_for ?? item.standing_F ?? 0) || 0
  const ga = Number(item.overall_league_GA ?? item.overall_ga ?? item.goals_against ?? item.standing_A ?? 0) || 0
  const gd =
    Number(item.overall_league_GD ?? item.overall_gd ?? item.goal_difference ?? item.standing_GD ?? gf - ga) || 0
  const formValue = item.form || item.overall_league_form || ""

  return {
    rank: Number(item.overall_league_position || item.rank || item.position || item.standing_place || 0),
    points: Number(item.overall_league_PTS || item.points || item.total_points || item.standing_PTS || 0),
    team: {
      id: String(item.team_id || item.team_key || item.teamId || ""),
      name: item.team_name || item.name || item.standing_team || "",
      nameEn: item.team_name || item.name || item.standing_team || "",
      logo: item.team_badge || item.team_logo || item.logo || "",
    },
    all: {
      played,
      win: won,
      draw: drawn,
      lose: lost,
      goals: {
        for: gf,
        against: ga,
      },
    },
    goalsDiff: gd,
    form: String(formValue),
  }
}

function mapTeam(item: any) {
  const teamId = item.team_key || item.team_id || item.id || ""
  const teamName = item.team_name || item.name || ""
  const teamLogo = item.team_badge || item.team_logo || item.logo || ""
  const venueName = item.venue_name || item.stadium_name || item.team_stadium || ""
  const venueCity = item.venue_city || item.team_city || ""
  const venueCapacity = Number(item.venue_capacity || item.team_stadium_capacity || 0) || 0
  const venueImage = item.venue_image || item.stadium_image || ""
  const rawPlayers = Array.isArray(item.players) ? item.players : []
  const rawCoaches = Array.isArray(item.coaches) ? item.coaches : Array.isArray(item.coach) ? item.coach : []

  return {
    id: String(teamId),
    name: String(teamName),
    nameEn: String(teamName),
    logo: String(teamLogo),
    country: String(item.country_name || item.team_country || ""),
    league: String(item.league_name || item.league || ""),
    founded: Number(item.founded || item.team_founded || 0) || null,
    website: String(item.team_website || item.website || item.team_url || ""),
    venue: {
      name: String(venueName),
      city: String(venueCity),
      capacity: venueCapacity,
      image: String(venueImage),
    },
    manager: String(rawCoaches[0]?.coach_name || rawCoaches[0]?.name || item.coach_name || item.manager_name || ""),
    players: rawPlayers.map((player: any) => ({
      id: String(player.player_key || player.id || ""),
      name: String(player.player_name || player.name || ""),
      position: String(player.player_type || player.position || ""),
      number: Number(player.player_number || player.number || 0) || null,
      age: Number(player.player_age || player.age || 0) || null,
      nationality: String(player.player_country || player.nationality || ""),
      photo: String(player.player_image || player.photo || ""),
    })),
  }
}

function mapTeamPlayer(item: any) {
  return {
    id: String(item.player_key || item.id || ""),
    name: String(item.player_name || item.name || ""),
    position: String(item.player_type || item.position || ""),
    number: Number(item.player_number || item.number || 0) || null,
    age: Number(item.player_age || item.age || 0) || null,
    nationality: String(item.player_country || item.nationality || ""),
    photo: String(item.player_image || item.photo || ""),
  }
}

function toNumber(value: unknown) {
  if (value === "" || value == null) return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toNullableNumber(value: unknown) {
  if (value === "" || value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toNullableString(value: unknown) {
  const normalized = String(value ?? "").trim()
  return normalized ? normalized : null
}

function getSeasonOptions() {
  return PREMIER_LEAGUE_SEASON_CATALOG.filter((season) => season.apiYear <= 2025).map((season) => ({
    value: season.labelLong,
    label: season.labelShort,
    startDate: season.startDate,
    endDate: season.endDate,
  }))
}

function normalizeSeasonLabel(season?: string | null) {
  return getPremierLeagueSeasonByLabel(season).labelLong
}

function isSeasonStarted(season: PremierLeagueSeasonCatalogEntry) {
  return Date.now() >= new Date(`${season.startDate}T00:00:00Z`).getTime()
}

function mapPlayerDetails(item: any) {
  const totalPasses = toNumber(item.player_passes)
  const successfulPasses = toNumber(item.player_passes_accuracy)
  const passAccuracyPercent = totalPasses > 0 ? Math.round((successfulPasses / totalPasses) * 1000) / 10 : null
  const totalDuels = toNumber(item.player_duels_total)
  const duelsWon = toNumber(item.player_duels_won)
  const duelWinPercent = totalDuels > 0 ? Math.round((duelsWon / totalDuels) * 1000) / 10 : null
  const dribbleAttempts = toNumber(item.player_dribble_attempts)
  const successfulDribbles = toNumber(item.player_dribble_succ)
  const dribbleSuccessPercent =
    dribbleAttempts > 0 ? Math.round((successfulDribbles / dribbleAttempts) * 1000) / 10 : null
  const captainCount = toNumber(item.player_is_captain)

  return {
    id: String(item.player_key || item.id || ""),
    name: String(item.player_name || item.name || ""),
    firstname: String(item.player_firstname || "").trim(),
    lastname: String(item.player_lastname || "").trim(),
    number: toNullableNumber(item.player_number),
    photo: String(item.player_image || item.photo || ""),
    nationality: String(item.player_country || item.nationality || ""),
    age: toNullableNumber(item.player_age || item.age),
    height: null,
    weight: null,
    injured: String(item.player_injured || "").toLowerCase() === "yes",
    birth: {
      date: null,
      place: null,
      country: null,
    },
    team: {
      id: String(item.team_key || item.team_id || ""),
      name: String(item.team_name || ""),
      logo: "",
    },
    position: String(item.player_type || item.position || ""),
    captainCount,
    statistics: {
      games: {
        appearences: toNumber(item.player_match_played),
        lineups: null,
        minutes: toNumber(item.player_minutes),
        rating: toNullableString(item.player_rating),
        captain: captainCount > 0,
      },
      goals: {
        total: toNumber(item.player_goals),
        assists: toNumber(item.player_assists),
        conceded: toNumber(item.player_goals_conceded),
        saves: toNumber(item.player_saves),
      },
      shots: {
        total: toNumber(item.player_shots_total),
        on: null,
      },
      passes: {
        total: totalPasses,
        key: toNumber(item.player_key_passes),
        accuracy: successfulPasses,
        accuracyPercent: passAccuracyPercent,
        crosses: toNumber(item.player_crosses_total),
      },
      tackles: {
        total: toNumber(item.player_tackles),
        blocks: toNumber(item.player_blocks),
        interceptions: toNumber(item.player_interceptions),
        clearances: toNumber(item.player_clearances),
      },
      duels: {
        total: totalDuels,
        won: duelsWon,
        winPercent: duelWinPercent,
      },
      dribbles: {
        attempts: dribbleAttempts,
        success: successfulDribbles,
        successPercent: dribbleSuccessPercent,
      },
      fouls: {
        drawn: 0,
        committed: toNumber(item.player_fouls_commited),
      },
      cards: {
        yellow: toNumber(item.player_yellow_cards),
        yellowred: 0,
        red: toNumber(item.player_red_cards),
      },
      penalty: {
        won: toNumber(item.player_pen_won),
        commited: toNumber(item.player_pen_comm),
        scored: toNumber(item.player_pen_scored),
        missed: toNumber(item.player_pen_missed),
        saved: 0,
      },
      goalkeeper: {
        saves: toNumber(item.player_saves),
        insideBoxSaves: toNumber(item.player_inside_box_saves),
        goalsConceded: toNumber(item.player_goals_conceded),
      },
      possession: {
        dispossessed: toNumber(item.player_dispossesed),
      },
      meta: {
        substituteOut: toNumber(item.player_substitute_out),
        substitutesOnBench: toNumber(item.player_substitutes_on_bench),
        woodwork: toNumber(item.player_woordworks),
      },
    },
    allSeasonStats: [],
    transfers: [],
  }
}

type AggregatedPlayerSeason = {
  teamId: string
  teamName: string
  appearances: number
  lineups: number
  bench: number
  goals: number
  assists: number
  yellow: number
  red: number
  minutes: number | null
  number: number | null
  position: string
}

function normalizeFixturePlayerEntries(fixture: any) {
  const metadata = fixture?.metadata || {}
  return Array.isArray(metadata.playerStats) ? metadata.playerStats : []
}

function findLineupPlayerEntry(players: any[], needleName: string) {
  const normalizedNeedle = needleName.trim().toLowerCase()
  if (!normalizedNeedle) return null

  return (
    players.find((player) => String(player?.name || "").trim().toLowerCase() === normalizedNeedle) ||
    players.find((player) => String(player?.name || "").trim().toLowerCase().includes(normalizedNeedle)) ||
    null
  )
}

function extractPlayerName(raw: any, keys: string[]) {
  for (const key of keys) {
    const value = String(raw?.[key] || "").trim()
    if (value) return value
  }
  return ""
}

function normalizeFixturePlayerStats(detail: any) {
  const homeTeamId = String(detail?.match_hometeam_id || detail?.home_team_key || "")
  const awayTeamId = String(detail?.match_awayteam_id || detail?.away_team_key || "")
  const homeTeamName = String(detail?.match_hometeam_name || detail?.event_home_team || "")
  const awayTeamName = String(detail?.match_awayteam_name || detail?.event_away_team || "")

  const createBasePlayer = (raw: any, teamId: string, teamName: string, starter: boolean, bench: boolean) => ({
    playerId: String(raw?.player_key || raw?.lineup_player_id || raw?.player_id || ""),
    name: String(raw?.lineup_player || raw?.player_name || raw?.name || "").trim(),
    teamId,
    teamName,
    number: toNullableNumber(raw?.lineup_number || raw?.player_number),
    position: String(raw?.lineup_position || raw?.player_type || raw?.position || "").trim(),
    started: starter,
    bench,
    played: starter,
    subIn: false,
    subOut: false,
    goals: 0,
    assists: 0,
    yellow: 0,
    red: 0,
    minutes: null as number | null,
  })

  const homeStarters = Array.isArray(detail?.lineup?.home?.starting_lineups) ? detail.lineup.home.starting_lineups : []
  const awayStarters = Array.isArray(detail?.lineup?.away?.starting_lineups) ? detail.lineup.away.starting_lineups : []
  const homeSubs = Array.isArray(detail?.lineup?.home?.substitutes) ? detail.lineup.home.substitutes : []
  const awaySubs = Array.isArray(detail?.lineup?.away?.substitutes) ? detail.lineup.away.substitutes : []

  const players = [
    ...homeStarters.map((player: any) => createBasePlayer(player, homeTeamId, homeTeamName, true, false)),
    ...awayStarters.map((player: any) => createBasePlayer(player, awayTeamId, awayTeamName, true, false)),
    ...homeSubs.map((player: any) => createBasePlayer(player, homeTeamId, homeTeamName, false, true)),
    ...awaySubs.map((player: any) => createBasePlayer(player, awayTeamId, awayTeamName, false, true)),
  ].filter((player) => player.name || player.playerId)

  const substitutions = Array.isArray(detail?.substitutions) ? detail.substitutions : []
  for (const sub of substitutions) {
    const homeOut = extractPlayerName(sub, ["home_player", "player"])
    const awayOut = extractPlayerName(sub, ["away_player", "player"])
    const inName = extractPlayerName(sub, ["substitution", "substitution_player", "player_in"])

    const outTarget = homeOut ? findLineupPlayerEntry(players, homeOut) : awayOut ? findLineupPlayerEntry(players, awayOut) : null
    if (outTarget) {
      outTarget.subOut = true
    }

    const inTarget = inName ? findLineupPlayerEntry(players, inName) : null
    if (inTarget) {
      inTarget.subIn = true
      inTarget.played = true
    }
  }

  const goalscorers = Array.isArray(detail?.goalscorer) ? detail.goalscorer : []
  for (const goal of goalscorers) {
    const scorerName = extractPlayerName(goal, ["home_scorer", "away_scorer", "scorer", "player"])
    const assistName = extractPlayerName(goal, ["home_assist", "away_assist", "assist"])

    const scorer = scorerName ? findLineupPlayerEntry(players, scorerName) : null
    if (scorer) {
      scorer.goals += 1
      scorer.played = true
    }

    const assister = assistName ? findLineupPlayerEntry(players, assistName) : null
    if (assister) {
      assister.assists += 1
      assister.played = true
    }
  }

  const cards = Array.isArray(detail?.cards) ? detail.cards : []
  for (const card of cards) {
    const playerName = extractPlayerName(card, ["home_fault", "away_fault", "player", "card_player"])
    const player = playerName ? findLineupPlayerEntry(players, playerName) : null
    if (!player) continue

    const cardType = String(card?.card || card?.card_type || "").toLowerCase()
    if (cardType.includes("yellow")) {
      player.yellow += 1
    } else if (cardType.includes("red")) {
      player.red += 1
    }
  }

  return players
}

function buildSeasonStatusFromAggregation(
  season: PremierLeagueSeasonCatalogEntry,
  fixtures: any[],
  playerSeason: AggregatedPlayerSeason | null,
) {
  const seasonLabel = season.labelShort
  const playedFixtures = fixtures.filter((fixture) => Boolean(fixture?.status?.isFinished || fixture?.status?.isLive))

  if (!isSeasonStarted(season) || playedFixtures.length === 0) {
    return {
      season: seasonLabel,
      seasonStatus: "NOT_STARTED" as const,
      seasonStats: null,
    }
  }

  if (!playerSeason || playerSeason.appearances === 0) {
    return {
      season: seasonLabel,
      seasonStatus: "NO_APPEARANCE" as const,
      seasonStats: {
        appearances: 0,
        lineups: 0,
        goals: 0,
        assists: 0,
        yellow: 0,
        red: 0,
      },
    }
  }

  return {
    season: seasonLabel,
    seasonStatus: "HAS_STATS" as const,
    seasonStats: {
      appearances: playerSeason.appearances,
      lineups: playerSeason.lineups,
      minutes: playerSeason.minutes,
      goals: playerSeason.goals,
      assists: playerSeason.assists,
      yellow: playerSeason.yellow,
      red: playerSeason.red,
      rating: null,
    },
  }
}

function buildSeasonStatusFromPlayerApiFallback(season: PremierLeagueSeasonCatalogEntry, player: any) {
  const appearances = toNumber(player?.player_match_played)

  if (!isSeasonStarted(season)) {
    return {
      season: season.labelShort,
      seasonStatus: "NOT_STARTED" as const,
      seasonStats: null,
    }
  }

  if (appearances === 0) {
    return {
      season: season.labelShort,
      seasonStatus: "NO_APPEARANCE" as const,
      seasonStats: {
        appearances: 0,
        lineups: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
        yellow: 0,
        red: 0,
        rating: toNullableString(player?.player_rating),
      },
    }
  }

  return {
    season: season.labelShort,
    seasonStatus: "HAS_STATS" as const,
    seasonStats: {
      appearances,
      lineups: null,
      minutes: toNumber(player?.player_minutes),
      goals: toNumber(player?.player_goals),
      assists: toNumber(player?.player_assists),
      yellow: toNumber(player?.player_yellow_cards),
      red: toNumber(player?.player_red_cards),
      rating: toNullableString(player?.player_rating),
    },
  }
}

function aggregatePlayerSeasonFromFixtures(playerId: string, fixtures: any[]) {
  const emptySeason: AggregatedPlayerSeason = {
    teamId: "",
    teamName: "",
    appearances: 0,
    lineups: 0,
    bench: 0,
    goals: 0,
    assists: 0,
    yellow: 0,
    red: 0,
    minutes: null,
    number: null,
    position: "",
  }

  const aggregate = fixtures.reduce((accumulator, fixture) => {
    const entries = normalizeFixturePlayerEntries(fixture)
    const player = entries.find((entry: any) => String(entry?.playerId || "") === String(playerId))
    if (!player || !player.played) return accumulator

    accumulator.appearances += 1
    accumulator.lineups += player.started ? 1 : 0
    accumulator.bench += player.bench ? 1 : 0
    accumulator.goals += toNumber(player.goals)
    accumulator.assists += toNumber(player.assists)
    accumulator.yellow += toNumber(player.yellow)
    accumulator.red += toNumber(player.red)

    if (!accumulator.teamId && player.teamId) accumulator.teamId = String(player.teamId)
    if (!accumulator.teamName && player.teamName) accumulator.teamName = String(player.teamName)
    if (accumulator.number == null && player.number != null) accumulator.number = toNullableNumber(player.number)
    if (!accumulator.position && player.position) accumulator.position = String(player.position)

    return accumulator
  }, emptySeason)

  return aggregate.appearances > 0 ? aggregate : null
}

function formatFixtureScore(fixture: any) {
  const home = fixture?.goals?.home
  const away = fixture?.goals?.away
  if (typeof home === "number" && typeof away === "number") {
    return `${home}-${away}`
  }
  return String(fixture?.status?.short || "VS")
}

function getTeamFormationFromLineup(match: any, teamId: string) {
  const normalizedTeamId = String(teamId)
  const homeId = String(match?.match_hometeam_id || match?.home_team_key || "")
  const awayId = String(match?.match_awayteam_id || match?.away_team_key || "")

  if (normalizedTeamId && normalizedTeamId === homeId) {
    return String(match?.lineup?.home?.formation || "")
  }

  if (normalizedTeamId && normalizedTeamId === awayId) {
    return String(match?.lineup?.away?.formation || "")
  }

  return String(match?.lineup?.home?.formation || match?.lineup?.away?.formation || "")
}

function mapCachedFixture(doc: any) {
  return {
    id: String(doc.externalId || ""),
    roundNumber: typeof doc.roundNumber === "number" ? doc.roundNumber : null,
    date: doc.kickoffAt instanceof Date ? doc.kickoffAt.toISOString() : new Date(doc.kickoffAt || Date.now()).toISOString(),
    dateThai: String(doc.kickoffLabel || ""),
    venue: {
      name: String(doc.venue?.name || ""),
      city: String(doc.venue?.city || ""),
    },
    teams: {
      home: {
        id: String(doc.homeTeam?.id || ""),
        name: String(doc.homeTeam?.name || ""),
        nameEn: String(doc.homeTeam?.nameEn || doc.homeTeam?.name || ""),
        logo: String(doc.homeTeam?.logo || ""),
      },
      away: {
        id: String(doc.awayTeam?.id || ""),
        name: String(doc.awayTeam?.name || ""),
        nameEn: String(doc.awayTeam?.nameEn || doc.awayTeam?.name || ""),
        logo: String(doc.awayTeam?.logo || ""),
      },
    },
    goals: {
      home: typeof doc.score?.home === "number" ? doc.score.home : null,
      away: typeof doc.score?.away === "number" ? doc.score.away : null,
    },
    status: {
      short: String(doc.status?.short || ""),
      long: String(doc.status?.long || ""),
      isLive: Boolean(doc.status?.isLive),
      isFinished: Boolean(doc.status?.isFinished),
      isUpcoming: Boolean(doc.status?.isUpcoming),
    },
  }
}

function mapCachedTeam(doc: any) {
  return {
    id: String(doc.externalId || ""),
    name: String(doc.name || ""),
    nameEn: String(doc.nameEn || doc.name || ""),
    logo: String(doc.logo || ""),
    country: String(doc.country || ""),
    league: String(doc.league || ""),
    founded: typeof doc.founded === "number" ? doc.founded : null,
    website: String(doc.website || ""),
    venue: {
      name: String(doc.venue?.name || ""),
      city: String(doc.venue?.city || ""),
      capacity: Number(doc.venue?.capacity || 0) || 0,
      image: String(doc.venue?.image || ""),
    },
    manager: String(doc.manager || ""),
    players: [],
  }
}

function mapFixtureEventItem(item: any) {
  const homeTeamId = String(item.match_hometeam_id || item.home_team_key || "")
  const awayTeamId = String(item.match_awayteam_id || item.away_team_key || "")
  const homeTeamName = String(item.match_hometeam_name || item.event_home_team || "")
  const awayTeamName = String(item.match_awayteam_name || item.event_away_team || "")

  const events: Array<{
    time: { elapsed: number | null }
    team: { id: string; name: string }
    player: { name: string }
    assist: { name: string | null }
    type: string
    detail: string
  }> = []

  for (const goal of Array.isArray(item.goalscorer) ? item.goalscorer : []) {
    const isHome = Boolean(goal.home_scorer)
    events.push({
      time: { elapsed: goal.time ? Number.parseInt(String(goal.time), 10) || null : null },
      team: {
        id: isHome ? homeTeamId : awayTeamId,
        name: isHome ? homeTeamName : awayTeamName,
      },
      player: { name: String(goal.home_scorer || goal.away_scorer || "") },
      assist: { name: String(goal.home_assist || goal.away_assist || "") || null },
      type: "Goal",
      detail: String(goal.score_info || goal.info || ""),
    })
  }

  for (const card of Array.isArray(item.cards) ? item.cards : []) {
    const isHome = Boolean(card.home_fault) || String(card.card || "").toLowerCase().includes("home")
    events.push({
      time: { elapsed: card.time ? Number.parseInt(String(card.time), 10) || null : null },
      team: {
        id: isHome ? homeTeamId : awayTeamId,
        name: isHome ? homeTeamName : awayTeamName,
      },
      player: { name: String(card.home_fault || card.away_fault || "") },
      assist: { name: null },
      type: "Card",
      detail: String(card.card || "Yellow Card"),
    })
  }

  for (const sub of Array.isArray(item.substitutions) ? item.substitutions : []) {
    const isHome = Boolean(sub.home_team)
    events.push({
      time: { elapsed: sub.time ? Number.parseInt(String(sub.time), 10) || null : null },
      team: {
        id: isHome ? homeTeamId : awayTeamId,
        name: isHome ? homeTeamName : awayTeamName,
      },
      player: { name: String(sub.home_player || sub.away_player || "") },
      assist: { name: String(sub.substitution || "") || null },
      type: "subst",
      detail: String(sub.substitution || ""),
    })
  }

  return events.sort((left, right) => (left.time.elapsed || 0) - (right.time.elapsed || 0))
}

function mapFixtureLineupSide(side: any) {
  const normalizeLineupPosition = (value: any, fallback: string) => {
    const raw = String(value || "").trim().toUpperCase()
    const mappedNumeric: Record<string, string> = {
      "1": "GK",
      "2": "RB",
      "3": "RCB",
      "4": "LCB",
      "5": "LB",
      "6": "RCM",
      "7": "CM",
      "8": "LCM",
      "9": "RW",
      "10": "ST",
      "11": "LW",
      "0": fallback,
    }

    if (!raw) return fallback
    return mappedNumeric[raw] || raw || fallback
  }

  const coachSource = Array.isArray(side?.coach)
    ? side.coach[0]
    : Array.isArray(side?.coaches)
      ? side.coaches[0]
      : side?.coach || side?.coaches || null

  return {
    formation: String(side?.formation || "4-3-3"),
    coach: {
      name: String(
        coachSource?.lineup_player ||
          coachSource?.coache ||
          coachSource?.name ||
          "",
      ),
    },
    startXI: (Array.isArray(side?.starting_lineups) ? side.starting_lineups : []).map((player: any) => ({
      player: {
        id: Number(player.player_key || player.lineup_player_id || player.player_id || 0),
        name: String(player.lineup_player || player.player || player.player_name || ""),
        number: Number(player.lineup_number || player.player_number || 0),
        pos: normalizeLineupPosition(player.lineup_position || player.player_position || player.position, "CM"),
        rating: Number(player.lineup_rating || player.player_rating || 7),
        grid: normalizeLineupPosition(player.lineup_position || player.player_position || player.position, "CM"),
      },
    })),
    substitutes: (Array.isArray(side?.substitutes) ? side.substitutes : []).map((player: any) => ({
      player: {
        id: Number(player.player_key || player.lineup_player_id || player.player_id || 0),
        name: String(player.lineup_player || player.player || player.player_name || ""),
        number: Number(player.lineup_number || player.player_number || 0),
        pos: normalizeLineupPosition(player.lineup_position || player.player_position || player.position, "SUB"),
      },
    })),
  }
}

async function fetchFixtureDetailsById(matchId: string) {
  const rows = await fetchAllSportsApi({
    met: "Fixtures",
    matchId: String(matchId),
  })

  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

async function fetchLiveFixtureDetailsById(matchId: string) {
  const rows = await fetchAllSportsApi({
    met: "Livescore",
    matchId: String(matchId),
    withPlayerStats: "1",
  })

  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

async function fetchRemoteLiveFixtures() {
  const rows = await fetchAllSportsApi({
    met: "Livescore",
    leagueId: DEFAULT_LEAGUE_ID,
    withPlayerStats: "1",
  })

  return (Array.isArray(rows) ? rows : [])
    .map(mapFixture)
    .filter(isValidFixture)
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
}

function mergeFixtureDetail(base: any, live: any) {
  if (!base) return live
  if (!live) return base

  return {
    ...base,
    ...live,
    goalscorer: Array.isArray(live?.goalscorer) && live.goalscorer.length > 0 ? live.goalscorer : base?.goalscorer,
    cards: Array.isArray(live?.cards) && live.cards.length > 0 ? live.cards : base?.cards,
    substitutions: Array.isArray(live?.substitutions) && live.substitutions.length > 0 ? live.substitutions : base?.substitutions,
    statistics: Array.isArray(live?.statistics) && live.statistics.length > 0 ? live.statistics : base?.statistics,
    lineup: live?.lineup || live?.lineups || base?.lineup || base?.lineups,
    lineups: live?.lineups || live?.lineup || base?.lineups || base?.lineup,
  }
}

async function fetchFixtureDetailsWithLiveFallback(matchId: string) {
  const fixture = await fetchFixtureDetailsById(matchId).catch(() => null)
  const likelyLive =
    isProviderLiveFlag(fixture?.event_live ?? fixture?.match_live ?? fixture?.live ?? null) || isLiveStatus(fixture?.event_status || fixture?.match_status || fixture?.status)

  if (!likelyLive) return fixture

  const liveFixture = await fetchLiveFixtureDetailsById(matchId).catch(() => null)
  return mergeFixtureDetail(fixture, liveFixture)
}

type FixtureQueryParams = {
  round?: string
  limit?: string
  type?: string
  season?: string
  from?: string
  to?: string
}

export async function fetchRemoteFixtures(
  season: PremierLeagueSeasonCatalogEntry = PREMIER_LEAGUE_DATA_SEASON,
  params?: Pick<FixtureQueryParams, "from" | "to">,
) {
  const rawFixtures = await fetchAllSportsApi({
    met: "Fixtures",
    leagueId: DEFAULT_LEAGUE_ID,
    from: params?.from || season.startDate,
    to: params?.to || season.endDate,
  })

  return rawFixtures
    .map(mapFixture)
    .filter(isValidFixture)
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
}

async function buildFixtureDetailsMap(fixtures: any[]) {
  const details = new Map<string, any>()

  for (const fixture of fixtures) {
    const fixtureId = String(fixture?.id || "")
    if (!fixtureId) continue

    try {
      const detail = await fetchFixtureDetailsById(fixtureId)
      if (detail) {
        details.set(fixtureId, {
          playerStats: normalizeFixturePlayerStats(detail),
          lineup: detail.lineup || null,
          goalscorer: Array.isArray(detail.goalscorer) ? detail.goalscorer : [],
          cards: Array.isArray(detail.cards) ? detail.cards : [],
          substitutions: Array.isArray(detail.substitutions) ? detail.substitutions : [],
        })
      }
    } catch {
      // Keep basic fixture row even when detail fetch fails.
    }
  }

  return details
}

async function syncFixturesToDatabase(fixtures: any[], season: PremierLeagueSeasonCatalogEntry, includeDetails: boolean = true) {
  await connectDatabase()
  const detailMap = includeDetails ? await buildFixtureDetailsMap(fixtures) : new Map<string, any>()

  const operations = fixtures
    .filter((fixture) => fixture?.id)
    .map((fixture) => {
      const detail = detailMap.get(String(fixture.id))

      return {
        updateOne: {
          filter: { externalId: String(fixture.id) },
          update: {
            $set: {
              externalId: String(fixture.id),
              season: season.labelLong,
              roundNumber: fixture.roundNumber ?? null,
              roundLabel: fixture.roundNumber ? `Week ${fixture.roundNumber}` : "",
              kickoffAt: new Date(fixture.date),
              kickoffLabel: fixture.dateThai || fixture.date,
              homeTeam: {
                id: String(fixture.teams?.home?.id || ""),
                name: String(fixture.teams?.home?.name || ""),
                nameEn: String(fixture.teams?.home?.nameEn || fixture.teams?.home?.name || ""),
                logo: String(fixture.teams?.home?.logo || ""),
              },
              awayTeam: {
                id: String(fixture.teams?.away?.id || ""),
                name: String(fixture.teams?.away?.name || ""),
                nameEn: String(fixture.teams?.away?.nameEn || fixture.teams?.away?.name || ""),
                logo: String(fixture.teams?.away?.logo || ""),
              },
              venue: {
                name: String(fixture.venue?.name || ""),
                city: String(fixture.venue?.city || ""),
              },
              status: {
                short: String(fixture.status?.short || ""),
                long: String(fixture.status?.long || ""),
                isLive: Boolean(fixture.status?.isLive),
                isFinished: Boolean(fixture.status?.isFinished),
                isUpcoming: Boolean(fixture.status?.isUpcoming),
              },
              score: {
                home: fixture.goals?.home ?? null,
                away: fixture.goals?.away ?? null,
              },
              source: "allsportsapi",
              syncedAt: new Date(),
              metadata: {
                leagueId: DEFAULT_LEAGUE_ID,
                seasonStart: season.startDate,
                seasonEnd: season.endDate,
                seasonLabelShort: season.labelShort,
                sourceTimeZone: PREMIER_LEAGUE_SOURCE_TIME_ZONE,
                playerStats: detail?.playerStats || [],
                lineup: detail?.lineup || null,
                goalscorer: detail?.goalscorer || [],
                cards: detail?.cards || [],
                substitutions: detail?.substitutions || [],
              },
            },
          },
          upsert: true,
        },
      }
    })

  if (operations.length > 0) {
    await PremierLeagueFixture.bulkWrite(operations, { ordered: false })
  }

  return { insertedOrUpdated: operations.length, season: season.labelLong, source: "allsportsapi" }
}

async function refreshFixturesCache(season: PremierLeagueSeasonCatalogEntry = PREMIER_LEAGUE_DATA_SEASON, includeDetails: boolean = true) {
  const fixtures = await fetchRemoteFixtures(season)
  await syncFixturesToDatabase(fixtures, season, includeDetails)
  return fixtures
}

async function syncTeamsToDatabase(teams: any[]) {
  await connectDatabase()

  const operations = teams
    .filter((team) => team?.id && team?.name)
    .map((team) => ({
      updateOne: {
        filter: { externalId: String(team.id) },
        update: {
          $set: {
            externalId: String(team.id),
            season: PREMIER_LEAGUE_DATA_SEASON.labelLong,
            name: String(team.name || ""),
            nameEn: String(team.nameEn || team.name || ""),
            logo: String(team.logo || ""),
            country: String(team.country || ""),
            league: String(team.league || "Premier League"),
            founded: typeof team.founded === "number" ? team.founded : null,
            website: String(team.website || ""),
            venue: {
              name: String(team.venue?.name || ""),
              city: String(team.venue?.city || ""),
              capacity: Number(team.venue?.capacity || 0) || 0,
              image: String(team.venue?.image || ""),
            },
            manager: String(team.manager || ""),
            source: "allsportsapi",
            syncedAt: new Date(),
            metadata: {
              leagueId: DEFAULT_LEAGUE_ID,
            },
          },
        },
        upsert: true,
      },
    }))

  if (operations.length > 0) {
    await PremierLeagueTeam.bulkWrite(operations, { ordered: false })
  }

  return { insertedOrUpdated: operations.length, season: PREMIER_LEAGUE_DATA_SEASON.labelLong, source: "allsportsapi" }
}

async function getCachedTeams() {
  await connectDatabase()
  const rows = await PremierLeagueTeam.find({ season: PREMIER_LEAGUE_DATA_SEASON.labelLong }).sort({ nameEn: 1, name: 1 }).lean()
  return rows.map(mapCachedTeam)
}

async function shouldRefreshTeamCache() {
  const config = await getFootballTeamsApiConfig()
  if (!config.enabled) return false

  await connectDatabase()
  const latestTeam = await PremierLeagueTeam.findOne({ season: PREMIER_LEAGUE_DATA_SEASON.labelLong }).sort({ syncedAt: -1 }).select({ syncedAt: 1 }).lean()
  if (!latestTeam?.syncedAt) return true
  return Date.now() - new Date(latestTeam.syncedAt).getTime() > TEAM_CACHE_MAX_AGE_MS
}

async function refreshTeamsCache() {
  const rawTeams = await fetchAllSportsApi({
    met: "Teams",
    leagueId: DEFAULT_LEAGUE_ID,
  })

  const teams = rawTeams
    .map(mapTeam)
    .filter((team: any) => team.id && team.name)
    .sort((left: any, right: any) => left.name.localeCompare(right.name, "en"))

  await syncTeamsToDatabase(teams)
  return teams
}

function buildFixtureCacheQuery(params?: FixtureQueryParams) {
  const season = getPremierLeagueSeasonByLabel(params?.season)
  const query: Record<string, any> = { season: season.labelLong }

  if (params?.round) {
    query.roundNumber = Number(params.round)
  }

  if (params?.type === "live") {
    query["status.isLive"] = true
  } else if (params?.type === "upcoming") {
    query["status.isUpcoming"] = true
  } else if (params?.type === "finished") {
    query["status.isFinished"] = true
  }

  if (params?.from || params?.to) {
    query.kickoffAt = {}

    if (params.from) {
      query.kickoffAt.$gte = new Date(`${params.from}T00:00:00.000Z`)
    }

    if (params.to) {
      query.kickoffAt.$lt = new Date(`${params.to}T23:59:59.999Z`)
    }
  }

  return query
}

async function getCachedFixtures(params?: FixtureQueryParams) {
  await connectDatabase()

  const query = buildFixtureCacheQuery(params)
  let cursor = PremierLeagueFixture.find(query).sort({ kickoffAt: 1, externalId: 1 }).lean()

  if (params?.limit) {
    const parsedLimit = Number(params.limit)
    if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
      cursor = cursor.limit(parsedLimit)
    }
  }

  const rows = await cursor
  return rows.map(mapCachedFixture).filter(isValidFixture)
}

async function syncHistoricalFixturesCache() {
  const results = []

  for (const season of PREMIER_LEAGUE_SEASON_CATALOG) {
    const fixtures = await refreshFixturesCache(season, true)
    results.push({
      season: season.labelLong,
      fixtures: fixtures.length,
    })
  }

  return {
    seasons: results,
    seasonCount: results.length,
    source: "allsportsapi",
  }
}

async function shouldRefreshFixtureCache(seasonValue?: string) {
  const config = await getFootballApiConfig()
  if (!config.enabled) return false

  const season = getPremierLeagueSeasonByLabel(seasonValue)

  await connectDatabase()
  const latestFixture = await PremierLeagueFixture.findOne({ season: season.labelLong })
    .sort({ syncedAt: -1 })
    .select({ syncedAt: 1, metadata: 1 })
    .lean()

  if (!latestFixture?.syncedAt) return true
  if (latestFixture?.metadata?.sourceTimeZone !== PREMIER_LEAGUE_SOURCE_TIME_ZONE) return true
  if (season.labelLong !== PREMIER_LEAGUE_DATA_SEASON.labelLong) return false
  return Date.now() - new Date(latestFixture.syncedAt).getTime() > FIXTURE_CACHE_MAX_AGE_MS
}

export const footballService = {
  async getFixtures(params?: FixtureQueryParams) {
    const season = getPremierLeagueSeasonByLabel(params?.season)
    const includeDetails = false

    if (params?.type === "live") {
      try {
        const liveFixtures = await fetchRemoteLiveFixtures()
        if (liveFixtures.length > 0) {
          return liveFixtures
        }
      } catch {
        // Fall back to cache/fixtures flow when live endpoint is unavailable.
      }
    }

    try {
      const needsRefresh = await shouldRefreshFixtureCache(season.labelLong)
      if (needsRefresh) {
        try {
          await refreshFixturesCache(season, includeDetails)
        } catch {
          // Keep serving cached fixtures if refresh fails.
        }
      }

      const cachedFixtures = await getCachedFixtures({ ...params, season: season.labelLong })
      if (cachedFixtures.length > 0) {
        return cachedFixtures
      }

      const config = await getFootballApiConfig()
      if (!config.enabled) {
        return []
      }

      const refreshedFixtures = await refreshFixturesCache(season, includeDetails)
      let fixtures = refreshedFixtures

      if (params?.round) {
        fixtures = fixtures.filter((fixture) => String(fixture.roundNumber || "") === String(params.round))
      }

      if (params?.type === "live") {
        fixtures = fixtures.filter((fixture) => fixture.status.isLive)
      } else if (params?.type === "upcoming") {
        fixtures = fixtures.filter((fixture) => fixture.status.isUpcoming)
      } else if (params?.type === "finished") {
        fixtures = fixtures.filter((fixture) => fixture.status.isFinished)
      }

      if (params?.from) {
        fixtures = fixtures.filter((fixture) => String(fixture.date || "") >= `${params.from}T00:00:00`)
      }

      if (params?.to) {
        fixtures = fixtures.filter((fixture) => String(fixture.date || "") <= `${params.to}T23:59:59`)
      }

      if (params?.limit) {
        const parsedLimit = Number(params.limit)
        if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
          fixtures = fixtures.slice(0, parsedLimit)
        }
      }

      return fixtures
    } catch {
      const config = await getFootballApiConfig().catch(() => ({ enabled: true }))
      if (!config.enabled) {
        return getCachedFixtures({ ...params, season: season.labelLong }).catch(() => [])
      }

      const remoteFixtures = await fetchRemoteFixtures(season, params)
      let fixtures = remoteFixtures

      if (params?.round) {
        fixtures = fixtures.filter((fixture) => String(fixture.roundNumber || "") === String(params.round))
      }

      if (params?.type === "live") {
        fixtures = fixtures.filter((fixture) => fixture.status.isLive)
      } else if (params?.type === "upcoming") {
        fixtures = fixtures.filter((fixture) => fixture.status.isUpcoming)
      } else if (params?.type === "finished") {
        fixtures = fixtures.filter((fixture) => fixture.status.isFinished)
      }

      if (params?.from) {
        fixtures = fixtures.filter((fixture) => String(fixture.date || "") >= `${params.from}T00:00:00`)
      }

      if (params?.to) {
        fixtures = fixtures.filter((fixture) => String(fixture.date || "") <= `${params.to}T23:59:59`)
      }

      if (params?.limit) {
        const parsedLimit = Number(params.limit)
        if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
          fixtures = fixtures.slice(0, parsedLimit)
        }
      }

      return fixtures
    }
  },
  async getStandings() {
    const rawStandings = await fetchAllSportsApi({
      met: "Standings",
      leagueId: DEFAULT_LEAGUE_ID,
    })

    return rawStandings.map(mapStanding).sort((left: any, right: any) => left.rank - right.rank)
  },
  async getTeams() {
    try {
      const needsRefresh = await shouldRefreshTeamCache()
      if (needsRefresh) {
        try {
          await refreshTeamsCache()
        } catch {
          // Keep serving cached teams if refresh fails.
        }
      }

      const cachedTeams = await getCachedTeams()
      if (cachedTeams.length > 0) {
        return cachedTeams
      }

      const config = await getFootballTeamsApiConfig()
      if (!config.enabled) {
        return []
      }

      const refreshedTeams = await refreshTeamsCache()
      if (refreshedTeams.length > 0) {
        return refreshedTeams
      }
    } catch {}

    try {
      const config = await getFootballTeamsApiConfig().catch(() => ({ enabled: true }))
      if (!config.enabled) {
        return getCachedTeams().catch(() => [])
      }

      const refreshedTeams = await refreshTeamsCache()
      if (refreshedTeams.length > 0) {
        return refreshedTeams
      }
    } catch {
      const cachedTeams = await getCachedTeams().catch(() => [])
      if (cachedTeams.length > 0) {
        return cachedTeams
      }
    }

    const standings = await this.getStandings()
    return standings
      .map((item: any) => ({
        id: String(item.team?.id || ""),
        name: String(item.team?.name || item.team?.nameEn || ""),
        nameEn: String(item.team?.nameEn || item.team?.name || ""),
        logo: String(item.team?.logo || ""),
        country: "",
        league: "Premier League",
        founded: null,
        website: "",
        venue: {
          name: "",
          city: "",
          capacity: 0,
          image: "",
        },
        manager: "",
        players: [],
      }))
      .filter((team: any) => team.id && team.name)
  },
  async getTeam(id: string) {
    const rawTeams = await fetchAllSportsApi({
      met: "Teams",
      teamId: String(id),
    })

    const teamRow = Array.isArray(rawTeams) ? rawTeams[0] : null
    if (!teamRow) {
      throw new Error("Team not found")
    }

    const team = mapTeam(teamRow)
    let players = Array.isArray(team.players) ? team.players.filter((player: any) => player.id || player.name) : []

    if (players.length === 0) {
      try {
        const rawPlayers = await fetchAllSportsApi({
          met: "Players",
          teamId: String(id),
        })
        players = (Array.isArray(rawPlayers) ? rawPlayers : []).map(mapTeamPlayer).filter((player: any) => player.id || player.name)
      } catch {
        players = []
      }
    }

    const allFixtures = await this.getFixtures({ type: "all", limit: "380" }).catch(() => [])
    const teamFixtures = (Array.isArray(allFixtures) ? allFixtures : [])
      .filter((fixture: any) => String(fixture?.teams?.home?.id || "") === String(id) || String(fixture?.teams?.away?.id || "") === String(id))
      .sort((left: any, right: any) => new Date(right.date).getTime() - new Date(left.date).getTime())

    const latestFixtures = teamFixtures.slice(0, 5).map((fixture: any) => ({
      id: String(fixture.id),
      date: String(fixture.dateThai || fixture.date || ""),
      league: team.league || "Premier League",
      homeTeam: fixture.teams.home,
      awayTeam: fixture.teams.away,
      result: formatFixtureScore(fixture),
      status: fixture.status,
    }))

    let latestFormation = ""
    for (const fixture of teamFixtures.slice(0, 5)) {
      try {
        const detail = await fetchFixtureDetailsById(String(fixture.id))
        const formation = getTeamFormationFromLineup(detail, String(id))
        if (formation) {
          latestFormation = formation
          break
        }
      } catch {
        // Keep searching other fixtures.
      }
    }

    const standings = await this.getStandings().catch(() => [])
    const standing = (Array.isArray(standings) ? standings : []).find((item: any) => String(item?.team?.id || "") === String(id))

    return {
      id: team.id,
      name: team.name,
      nameEn: team.nameEn,
      logo: team.logo,
      country: team.country,
      league: team.league || "Premier League",
      stadium: team.venue?.name || "",
      city: team.venue?.city || "",
      founded: team.founded,
      website: team.website,
      coach: team.manager,
      venue: team.venue,
      latestFormation,
      players,
      fixtures: latestFixtures,
      statistics: standing
        ? {
            matchesPlayed: Number(standing.all?.played || 0),
            wins: Number(standing.all?.win || 0),
            draws: Number(standing.all?.draw || 0),
            losses: Number(standing.all?.lose || 0),
            goals: Number(standing.all?.goals?.for || 0),
            goalsAgainst: Number(standing.all?.goals?.against || 0),
            points: Number(standing.points || 0),
            rank: Number(standing.rank || 0),
            form: String(standing.form || ""),
          }
        : null,
    }
  },
  async getTopScorers() {
    return []
  },
  async getTopAssists() {
    return []
  },
  async getCleanSheets() {
    return []
  },
  async getPlayerStatsSummary() {
    return {
      goals: [],
      assists: [],
      shots: [],
      yellowCards: [],
      penalties: [],
      appearances: [],
    }
  },
  async getPlayerDetails(id: string, options?: { season?: string }) {
    const season = getPremierLeagueSeasonByLabel(options?.season)
    const result = await fetchAllSportsApi({
      met: "Players",
      playerId: id,
    })

    const player = Array.isArray(result) ? result[0] : null
    if (!player) {
      return { data: null, source: "allsportsapi" }
    }

    const mappedPlayer = mapPlayerDetails(player)
    const seasonMeta = buildSeasonStatusFromPlayerApiFallback(season, player)

    return {
      data: {
        ...mappedPlayer,
        statistics: mappedPlayer.statistics,
        season: seasonMeta.season,
        seasonStatus: seasonMeta.seasonStatus,
        seasonStats: seasonMeta.seasonStats,
        availableSeasons: getSeasonOptions(),
      },
      source: "allsportsapi",
    }
  },
  async getFixturePrediction(_id: string) {
    return null
  },
  async getFixtureLineups(id: string) {
    const fixture = await fetchFixtureDetailsWithLiveFallback(id)
    const lineupSource = fixture?.lineup || fixture?.lineups
    if (!lineupSource) return []

    const home = mapFixtureLineupSide(lineupSource.home || lineupSource.home_team || {})
    const away = mapFixtureLineupSide(lineupSource.away || lineupSource.away_team || {})

    const hasHomePlayers = home.startXI.length > 0 || home.substitutes.length > 0
    const hasAwayPlayers = away.startXI.length > 0 || away.substitutes.length > 0

    if (!hasHomePlayers && !hasAwayPlayers) return []
    return [home, away]
  },
  async getFixtureEvents(id: string) {
    const fixture = await fetchFixtureDetailsWithLiveFallback(id)
    if (!fixture) return []
    return mapFixtureEventItem(fixture)
  },
  async getFixtureStatistics(id: string) {
    const fixture = await fetchFixtureDetailsWithLiveFallback(id)
    const rawStats = Array.isArray(fixture?.statistics) ? fixture.statistics : []

    return rawStats
      .map((row: any) => ({
        type: String(row?.type || row?.name || "").trim(),
        home: row?.home == null ? null : String(row.home).trim(),
        away: row?.away == null ? null : String(row.away).trim(),
      }))
      .filter((row: any) => row.type && (row.home != null || row.away != null))
  },
  async refreshFixturesCache() {
    return refreshFixturesCache()
  },
}

export { syncHistoricalFixturesCache }
