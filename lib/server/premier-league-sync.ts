import { footballService } from "@/app/api/football/service"
import { PREMIER_LEAGUE_DATA_SEASON } from "@/lib/season"

import { connectDatabase } from "./db"
import { PremierLeagueFixture, PremierLeagueSnapshot } from "./models"

export const PREMIER_LEAGUE_SNAPSHOT_KEY = "premier-league-latest"

export type StandingRow = {
  position: number
  team: string
  teamEn?: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  points: number
  form: string[]
  note?: string
}

export type FixtureRow = {
  id: string
  round?: string
  homeTeam: string
  awayTeam: string
  dateLabel: string
  kickoff?: string
  venue?: string
  status: "upcoming" | "live" | "finished"
  homeScore?: number | null
  awayScore?: number | null
  note?: string
}

export type SnapshotSource = {
  label: string
  url: string
}

type SnapshotPayload = {
  searchVerified?: boolean
  summary?: string
  season?: string
  standings?: unknown[]
  fixtures?: unknown[]
  topScorers?: unknown[]
  topAssists?: unknown[]
  cleanSheets?: unknown[]
  sources?: unknown[]
}

function normalizeCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "")
  if (trimmed.endsWith("/chat/completions")) return trimmed
  return `${trimmed}/chat/completions`
}

function getMessageContent(messageContent: unknown): string | null {
  if (typeof messageContent === "string") return messageContent

  if (Array.isArray(messageContent)) {
    const text = messageContent
      .map((item) => {
        if (typeof item === "string") return item
        if (item && typeof item === "object" && "text" in item && typeof item.text === "string") {
          return item.text
        }
        return ""
      })
      .join("")
      .trim()

    return text || null
  }

  return null
}

function extractJsonPayload(content: string): SnapshotPayload | null {
  const trimmed = content.trim()

  try {
    return JSON.parse(trimmed) as SnapshotPayload
  } catch {}

  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]) as SnapshotPayload
    } catch {}
  }

  const objectMatch = trimmed.match(/(\{[\s\S]*\})/)
  if (objectMatch?.[1]) {
    try {
      return JSON.parse(objectMatch[1]) as SnapshotPayload
    } catch {}
  }

  return null
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const normalized = value.replace(/[^\d.-]/g, "")
    const parsed = Number.parseFloat(normalized)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function toStatus(value: unknown): FixtureRow["status"] {
  if (typeof value !== "string") return "upcoming"
  const normalized = value.toLowerCase()
  if (normalized.includes("live")) return "live"
  if (normalized.includes("finish") || normalized.includes("result") || normalized.includes("ft")) return "finished"
  return "upcoming"
}

function normalizeStandings(rows: unknown[]): StandingRow[] {
  return rows
    .map((row, index) => {
      if (!row || typeof row !== "object") return null
      const item = row as Record<string, unknown>
      const position = toNumber(item.position ?? item.rank ?? index + 1)
      const team = String(item.team ?? item.club ?? "").trim()
      if (!team) return null

      const formValue = item.form
      const form = Array.isArray(formValue)
        ? formValue.map((entry) => String(entry).trim().toUpperCase()).filter(Boolean).slice(0, 5)
        : typeof formValue === "string"
          ? formValue
              .split(/[\s,-]+/)
              .map((entry) => entry.trim().toUpperCase())
              .filter(Boolean)
              .slice(0, 5)
          : []

      return {
        position,
        team,
        teamEn: typeof item.teamEn === "string" ? item.teamEn.trim() : undefined,
        played: toNumber(item.played),
        won: toNumber(item.won ?? item.win),
        drawn: toNumber(item.drawn ?? item.draw),
        lost: toNumber(item.lost ?? item.lose),
        gf: toNumber(item.gf ?? item.goalsFor),
        ga: toNumber(item.ga ?? item.goalsAgainst),
        gd: toNumber(item.gd ?? item.goalDifference),
        points: toNumber(item.points ?? item.pts),
        form,
        note: typeof item.note === "string" ? item.note.trim() : undefined,
      }
    })
    .filter((row): row is StandingRow => row !== null)
    .sort((a, b) => a.position - b.position)
}

function normalizeFixtures(rows: unknown[]): FixtureRow[] {
  return rows
    .map((row, index) => {
      if (!row || typeof row !== "object") return null
      const item = row as Record<string, unknown>
      const homeTeam = String(item.homeTeam ?? item.home ?? "").trim()
      const awayTeam = String(item.awayTeam ?? item.away ?? "").trim()
      if (!homeTeam || !awayTeam) return null

      return {
        id: String(item.id ?? `${homeTeam}-${awayTeam}-${index}`),
        round: typeof item.round === "string" ? item.round.trim() : undefined,
        homeTeam,
        awayTeam,
        dateLabel: String(item.dateLabel ?? item.date ?? item.day ?? "").trim() || "TBD",
        kickoff: typeof item.kickoff === "string" ? item.kickoff.trim() : undefined,
        venue: typeof item.venue === "string" ? item.venue.trim() : undefined,
        status: toStatus(item.status),
        homeScore:
          item.homeScore === null || item.homeScore === undefined ? null : toNumber(item.homeScore),
        awayScore:
          item.awayScore === null || item.awayScore === undefined ? null : toNumber(item.awayScore),
        note: typeof item.note === "string" ? item.note.trim() : undefined,
      }
    })
    .filter((row): row is FixtureRow => row !== null)
}

function normalizeSources(rows: unknown[]): SnapshotSource[] {
  return rows
    .map((row) => {
      if (!row || typeof row !== "object") return null
      const item = row as Record<string, unknown>
      const label = String(item.label ?? item.title ?? "").trim()
      const url = String(item.url ?? "").trim()
      if (!label || !url) return null
      return { label, url }
    })
    .filter((row): row is SnapshotSource => row !== null)
}

function normalizeLeaderboard(rows: unknown[], valueKeys: string[]): Array<Record<string, unknown>> {
  return rows
    .map((row, index) => {
      if (!row || typeof row !== "object") return null
      const item = row as Record<string, unknown>
      const name = String(item.name ?? item.player ?? "").trim()
      const team = String(item.team ?? item.club ?? "").trim()
      if (!name || !team) return null

      const value =
        valueKeys
          .map((key) => toNumber(item[key]))
          .find((entry) => Number.isFinite(entry) && entry > 0) || 0

      return {
        rank: toNumber(item.rank ?? item.position ?? index + 1),
        name,
        team,
        value,
        statLabel: String(item.statLabel ?? item.metric ?? "").trim(),
      }
    })
    .filter((row): row is Record<string, unknown> => row !== null)
}

export async function generatePremierLeagueAiSnapshot(section: string = "all") {
  const apiKey = process.env.INTELSPHERE_API_KEY
  const baseUrl = process.env.INTELSPHERE_BASE_URL
  const model = process.env.INTELSPHERE_MODEL

  if (!apiKey || !baseUrl || !model) {
    throw new Error("IntelSphere environment variables are incomplete.")
  }

  const endpoint = normalizeCompletionsUrl(baseUrl)
  const today = new Date().toISOString().slice(0, 10)

  const payload = {
    model,
    temperature: 0.2,
    stream: false,
    messages: [
      {
        role: "system",
        content:
          "You are an elite football data editor. Build a compact Premier League snapshot in valid JSON only. If live web search is available in your runtime, use it and set searchVerified to true. If not, still answer with your best knowledge but set searchVerified to false. Never include markdown. Never invent source URLs.",
      },
      {
        role: "user",
        content: JSON.stringify({
          instruction:
            'Return JSON with this exact shape: {"searchVerified":boolean,"summary":"...","season":"...","standings":[{"position":1,"team":"...","teamEn":"...","played":0,"won":0,"drawn":0,"lost":0,"gf":0,"ga":0,"gd":0,"points":0,"form":["W","D","L"],"note":"optional"}],"fixtures":[{"id":"...","round":"...","homeTeam":"...","awayTeam":"...","dateLabel":"...","kickoff":"...","venue":"...","status":"upcoming|live|finished","homeScore":0,"awayScore":0,"note":"optional"}],"topScorers":[{"rank":1,"name":"...","team":"...","goals":0}],"topAssists":[{"rank":1,"name":"...","team":"...","assists":0}],"cleanSheets":[{"rank":1,"name":"...","team":"...","cleanSheets":0}],"sources":[{"label":"...","url":"https://..."}]}. Include a full 20-team standings table when possible. Include 10 fixtures total combining nearest upcoming matches and latest finished results. Include 5 rows each for topScorers, topAssists and cleanSheets. Summary must be in Thai, concise, and factual.',
          league: "English Premier League",
          today,
          section,
        }),
      },
    ],
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    next: { revalidate: 1800 },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`IntelSphere error ${response.status}: ${errorText.slice(0, 500)}`)
  }

  const result = await response.json()
  const content = getMessageContent(result?.choices?.[0]?.message?.content)
  if (!content) {
    throw new Error("IntelSphere returned an empty response.")
  }

  const parsed = extractJsonPayload(content)
  if (!parsed) {
    throw new Error("IntelSphere returned non-JSON content.")
  }

  return {
    model,
    generatedAt: new Date().toISOString(),
    searchVerified: Boolean(parsed.searchVerified),
    season: typeof parsed.season === "string" ? parsed.season : "Premier League",
    summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
    standings: normalizeStandings(Array.isArray(parsed.standings) ? parsed.standings : []),
    fixtures: normalizeFixtures(Array.isArray(parsed.fixtures) ? parsed.fixtures : []),
    topScorers: normalizeLeaderboard(Array.isArray(parsed.topScorers) ? parsed.topScorers : [], ["goals", "value"]),
    topAssists: normalizeLeaderboard(Array.isArray(parsed.topAssists) ? parsed.topAssists : [], ["assists", "value"]),
    cleanSheets: normalizeLeaderboard(Array.isArray(parsed.cleanSheets) ? parsed.cleanSheets : [], [
      "cleanSheets",
      "cleansheets",
      "value",
    ]),
    sources: normalizeSources(Array.isArray(parsed.sources) ? parsed.sources : []),
    warnings: [
      parsed.searchVerified
        ? "Snapshot generated with web-grounded output when available."
        : "Snapshot came from the model without confirmed live web grounding.",
    ],
  }
}

export async function seedPremierLeagueFixtures() {
  await connectDatabase()

  const fixtures = await footballService.getFixtures({ type: "all" })
  const operations = fixtures.map((fixture: any) => ({
    updateOne: {
      filter: { externalId: String(fixture.id) },
      update: {
        $set: {
          season: PREMIER_LEAGUE_DATA_SEASON.labelLong,
          roundNumber: fixture.roundNumber ?? null,
          roundLabel: fixture.league?.round || "",
          kickoffAt: new Date(fixture.date),
          kickoffLabel: fixture.dateThai || fixture.date,
          homeTeam: {
            id: String(fixture.teams?.home?.id || ""),
            name: fixture.teams?.home?.name || "",
            nameEn: fixture.teams?.home?.nameEn || "",
            logo: fixture.teams?.home?.logo || "",
          },
          awayTeam: {
            id: String(fixture.teams?.away?.id || ""),
            name: fixture.teams?.away?.name || "",
            nameEn: fixture.teams?.away?.nameEn || "",
            logo: fixture.teams?.away?.logo || "",
          },
          venue: {
            name: fixture.venue?.name || "",
            city: fixture.venue?.city || "",
          },
          status: {
            short: fixture.status?.short || "",
            long: fixture.status?.long || "",
            isLive: Boolean(fixture.status?.isLive),
            isFinished: Boolean(fixture.status?.isFinished),
            isUpcoming: Boolean(fixture.status?.isUpcoming),
          },
          score: {
            home: fixture.goals?.home ?? null,
            away: fixture.goals?.away ?? null,
          },
          source: process.env.API_FOOTBALL_KEY ? "api-football" : "internal-fallback",
          syncedAt: new Date(),
          metadata: {
            league: fixture.league || {},
          },
        },
      },
      upsert: true,
    },
  }))

  if (operations.length > 0) {
    await PremierLeagueFixture.bulkWrite(operations, { ordered: false })
  }

  return {
    insertedOrUpdated: operations.length,
    source: process.env.API_FOOTBALL_KEY ? "api-football" : "internal-fallback",
  }
}

export async function syncPremierLeagueSnapshot() {
  await connectDatabase()

  const snapshot = await generatePremierLeagueAiSnapshot()
  await PremierLeagueSnapshot.findOneAndUpdate(
    { key: PREMIER_LEAGUE_SNAPSHOT_KEY },
    {
      $set: {
        key: PREMIER_LEAGUE_SNAPSHOT_KEY,
        season: snapshot.season,
        summary: snapshot.summary,
        model: snapshot.model,
        searchVerified: snapshot.searchVerified,
        standings: snapshot.standings,
        fixtures: snapshot.fixtures,
        topScorers: snapshot.topScorers,
        topAssists: snapshot.topAssists,
        cleanSheets: snapshot.cleanSheets,
        sources: snapshot.sources,
        warnings: snapshot.warnings,
        syncedAt: new Date(snapshot.generatedAt),
        status: "ready",
        lastError: "",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )

  return snapshot
}

export async function getPremierLeagueSyncStatus() {
  await connectDatabase()

  const [snapshot, fixtureCount] = await Promise.all([
    PremierLeagueSnapshot.findOne({ key: PREMIER_LEAGUE_SNAPSHOT_KEY }).lean(),
    PremierLeagueFixture.countDocuments({}),
  ])

  return {
    fixtureCount,
    latestSnapshot: snapshot
      ? {
          season: snapshot.season,
          summary: snapshot.summary,
          model: snapshot.model,
          searchVerified: snapshot.searchVerified,
          syncedAt: snapshot.syncedAt,
          status: snapshot.status,
          lastError: snapshot.lastError,
          standingsCount: Array.isArray(snapshot.standings) ? snapshot.standings.length : 0,
          fixturesCount: Array.isArray(snapshot.fixtures) ? snapshot.fixtures.length : 0,
          topScorersCount: Array.isArray(snapshot.topScorers) ? snapshot.topScorers.length : 0,
        }
      : null,
  }
}
