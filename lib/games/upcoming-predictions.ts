export type GamesFixture = {
  id: string | number
  homeTeamId?: string | number
  awayTeamId?: string | number
  homeTeam: string
  awayTeam: string
  homeTeamThai?: string
  awayTeamThai?: string
  homeLogo?: string
  awayLogo?: string
  date: string
  status: { short?: string; long?: string; isUpcoming?: boolean; isLive?: boolean; isFinished?: boolean }
}

export function getUpcomingPredictions(fixtures: GamesFixture[], now: number, limit = 3) {
  const seen = new Set<string>()
  return fixtures.filter(fixture => {
    const status = fixture.status
    const excluded = /postpon|cancel|abandon|suspend|to be (defined|announced)|^(PST|CANC|ABD|SUSP|TBD|AWD|WO)$/i
    const id = String(fixture.id ?? "")
    if (!id || seen.has(id) || !fixture.homeTeam || !fixture.awayTeam || !status?.isUpcoming || status.isLive || status.isFinished
      || excluded.test(status.short || "") || excluded.test(status.long || "") || !(Date.parse(fixture.date) > now)) return false
    seen.add(id)
    return true
  }).sort((a, b) => Date.parse(a.date) - Date.parse(b.date) || String(a.id).localeCompare(String(b.id))).slice(0, limit).map(mapPredictionFixture)
}

function mapPredictionFixture(fixture: GamesFixture) {
  return {
    id: String(fixture.id), kickoffAt: Date.parse(fixture.date),
    homeTeamId: fixture.homeTeamId == null ? "" : String(fixture.homeTeamId),
    awayTeamId: fixture.awayTeamId == null ? "" : String(fixture.awayTeamId),
    home: fixture.homeTeamThai || fixture.homeTeam, away: fixture.awayTeamThai || fixture.awayTeam,
    homeLogo: fixture.homeLogo, awayLogo: fixture.awayLogo,
    league: "Premier League",
    date: new Date(fixture.date).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", weekday: "long", day: "numeric", month: "short", year: "numeric" }),
    time: new Date(fixture.date).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false }),
  }
}

const DAY_MS = 86400000
const BANGKOK_OFFSET_MS = 7 * 3600000

export function getBangkokWeek(now: number, offset = 0) {
  const local = new Date(now + BANGKOK_OFFSET_MS)
  const daysSinceMonday = (local.getUTCDay() + 6) % 7
  const start = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - daysSinceMonday + offset * 7) - BANGKOK_OFFSET_MS
  const end = start + 7 * DAY_MS
  const format = (value: number) => new Date(value).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" })
  return {
    start, end,
    // The API filters UTC days; include boundary days and trim precisely below.
    from: new Date(start).toISOString().slice(0, 10),
    to: new Date(end - 1).toISOString().slice(0, 10),
    label: `${format(start)} - ${format(end - 1)}`,
  }
}

export function getWeeklyPredictions(fixtures: GamesFixture[], now: number, week: { start: number; end: number }) {
  const seen = new Set<string>()
  const inWeek = fixtures.filter(fixture => {
    const kickoff = Date.parse(fixture.date)
    const id = String(fixture.id ?? "")
    if (!id || seen.has(id) || !fixture.homeTeam || !fixture.awayTeam || !(kickoff >= week.start && kickoff < week.end)) return false
    seen.add(id)
    return true
  }).sort((a, b) => Date.parse(a.date) - Date.parse(b.date) || String(a.id).localeCompare(String(b.id)))
  const openIds = new Set(getUpcomingPredictions(inWeek, now, Infinity).map(match => match.id))
  return inWeek.map(fixture => ({
    ...mapPredictionFixture(fixture),
    openForPrediction: openIds.has(String(fixture.id)),
    statusLabel: fixture.status?.isFinished ? "จบการแข่งขัน" : fixture.status?.isLive ? "กำลังแข่งขัน" : "ปิดรับคำทาย",
  }))
}
