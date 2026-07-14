export type ContentSourceKind = "api" | "ai" | "editorial" | "hybrid"

export type PageSourcePolicy = {
  page: string
  kind: ContentSourceKind
  canonical: string[]
  supporting?: string[]
  notes: string
}

export const PAGE_SOURCE_POLICIES: Record<string, PageSourcePolicy> = {
  home: {
    page: "home",
    kind: "hybrid",
    canonical: [
      "Premier League fixtures/results from /api/football/fixtures",
      "Premier League standings from /api/football/standings",
      "Top scorers from /api/football/topscorers",
      "News from /api/news",
    ],
    supporting: ["AI summary only from /api/football/ai-snapshot"],
    notes: "Homepage competition data must stay API-first. AI is allowed to summarize, not replace standings or fixture cards.",
  },
  standings: {
    page: "standings",
    kind: "api",
    canonical: ["Premier League table from /api/football/standings"],
    notes: "Canonical competition table page.",
  },
  matches: {
    page: "matches",
    kind: "api",
    canonical: ["Premier League fixtures and results from /api/football/fixtures"],
    notes: "Canonical competition schedule/results page.",
  },
  stats: {
    page: "stats",
    kind: "api",
    canonical: [
      "Top scorers from /api/football/topscorers",
      "Top assists from /api/football/topassists",
      "Clean sheets from /api/football/cleansheets",
    ],
    notes: "Stat leaderboards should remain API-backed.",
  },
  players: {
    page: "players",
    kind: "api",
    canonical: [
      "Player category stats from /api/football/player-stats",
      "Clean sheets from /api/football/cleansheets",
    ],
    notes: "Presentation can be editorial, but player/stat data should remain API-backed.",
  },
  clubs: {
    page: "clubs",
    kind: "editorial",
    canonical: ["Editorial season preview dataset in app/clubs/page.tsx"],
    notes: "Clubs page is a curated season-preview surface, not live competition data.",
  },
  teamDetail: {
    page: "team-detail",
    kind: "editorial",
    canonical: ["Editorial team profiles in app/teams/[id]/page.tsx"],
    notes: "Team detail pages are curated profiles and should stay in sync with the clubs editorial season.",
  },
  news: {
    page: "news",
    kind: "hybrid",
    canonical: ["Real or fallback news payload from /api/news"],
    supporting: ["AI rewrite layer inside /api/news when configured"],
    notes: "Original news source is canonical. AI may rewrite or summarize but must not invent facts.",
  },
  aiFootballLive: {
    page: "ai-football-live",
    kind: "ai",
    canonical: ["AI snapshot from /api/football/ai-snapshot"],
    notes: "This page is the dedicated experimental AI surface.",
  },
  worldCup: {
    page: "worldcup-2026",
    kind: "hybrid",
    canonical: [
      "World Cup scores/results from /api/worldcup/scores",
      "World Cup news from /api/news?topic=worldcup",
    ],
    supporting: ["AI recaps/preview/insights from /api/worldcup/ai-hub", "Editorial layout content in app/worldcup-2026/page.tsx"],
    notes: "World Cup scores and news stay grounded in APIs; AI adds recap and insight layers only.",
  },
}

export function getPageSourcePolicy(page: keyof typeof PAGE_SOURCE_POLICIES) {
  return PAGE_SOURCE_POLICIES[page]
}
