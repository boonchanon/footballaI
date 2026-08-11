export const COMMUNITY_FEED_UI_TEXT = {
  searchPlaceholder: "ค้นหาผู้ใช้, โพสต์, แฮชแท็ก...",
  createPostPlaceholder: "คุณกำลังคิดอะไรเกี่ยวกับฟุตบอล?",
  contextEyebrow: "SOCIAL COMMUNITY",
  contextTitle: "พื้นที่ของแฟนฟุตบอล",
  contextDescription: "ติดตามคนฟุตบอล แชร์มุมมอง และค้นพบประเด็นที่ชุมชนกำลังคุยกัน",
  feedErrorTitle: "โหลด Feed ไม่สำเร็จ",
  feedErrorDescription: "ส่วนอื่นของ Community ยังแสดงจากข้อมูลล่าสุดได้",
} as const

export const COMMUNITY_FEED_UI_TOKENS = {
  page: "bg-background text-foreground",
  shell: "bg-card text-card-foreground",
  surface: "bg-surface text-foreground",
  surfaceSoft: "bg-muted/55",
  border: "border-border",
  radius: "rounded-[12px]",
  radiusSm: "rounded-[10px]",
  gap: "gap-4",
  focus: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
} as const

export const COMMUNITY_FEED_REFERENCE_ORDER = [
  "stories-rail",
  "composer",
  "feed-tabs",
  "feed-posts",
  "activity",
  "suggested-users",
  "trending-tags",
  "community-stats",
] as const

export function assertCommunityFeedReferenceOrder(order: readonly string[]) {
  return COMMUNITY_FEED_REFERENCE_ORDER.every((section, index) => order[index] === section)
}

export type CommunityFeedFixture = {
  id: string
  homeTeam: string
  awayTeam: string
  homeLogo: string
  awayLogo: string
  homeScore: number | null
  awayScore: number | null
  status: string
  kickoff: string
  dateThai?: string
  venue?: string
  isFinished: boolean
}

export type CommunityFeedPostSummary = {
  tags?: string[]
  categoryLabel?: string
  likes?: number
  comments?: number
  reposts?: number
  views?: number
}

const liveStatuses = new Set(["1H", "2H", "HT", "ET", "BT", "P", "SUSP", "INT", "LIVE"])
const upcomingStatuses = new Set(["NS", "TBD"])
const closedStatuses = new Set(["FT", "AET", "PEN"])

export function getCommunityFixturePhase(fixture: Pick<CommunityFeedFixture, "status" | "isFinished"> | null | undefined) {
  if (!fixture) return "empty"
  const status = String(fixture.status || "").toUpperCase()
  if (fixture.isFinished || closedStatuses.has(status)) return "finished"
  if (liveStatuses.has(status)) return "live"
  if (upcomingStatuses.has(status)) return "upcoming"
  return "upcoming"
}

export function getCommunityFixtureStatusLabel(fixture: Pick<CommunityFeedFixture, "status" | "isFinished"> | null | undefined) {
  const phase = getCommunityFixturePhase(fixture)
  if (phase === "live") return "กำลังแข่งขัน"
  if (phase === "finished") return "Full Time"
  if (phase === "upcoming") return "กำลังจะมาถึง"
  return "ไม่มีข้อมูล"
}

export function shouldShowCommunityFixtureScore(fixture: CommunityFeedFixture | null | undefined) {
  if (!fixture) return false
  const phase = getCommunityFixturePhase(fixture)
  return phase !== "upcoming" && fixture.homeScore !== null && fixture.awayScore !== null
}

export function getCommunityFixtureScoreLabel(fixture: CommunityFeedFixture | null | undefined) {
  if (!shouldShowCommunityFixtureScore(fixture)) return "VS"
  return `${fixture?.homeScore ?? "-"} - ${fixture?.awayScore ?? "-"}`
}

export function selectCommunityHeroFixture(fixtures: CommunityFeedFixture[], selectedFixture?: CommunityFeedFixture | null) {
  if (selectedFixture) return selectedFixture
  return (
    fixtures.find((fixture) => getCommunityFixturePhase(fixture) === "live") ||
    fixtures.find((fixture) => getCommunityFixturePhase(fixture) === "upcoming") ||
    fixtures.find((fixture) => getCommunityFixturePhase(fixture) === "finished") ||
    null
  )
}

export function buildCommunityHeroMetrics(input: {
  roomStats?: Record<string, { discussions?: number; polls?: number }>
  posts?: unknown[]
}) {
  const statValues = Object.values(input.roomStats || {})
  const discussions = statValues.reduce((total, item) => total + Number(item.discussions || 0), 0)
  const polls = statValues.reduce((total, item) => total + Number(item.polls || 0), 0)
  return {
    discussions,
    polls,
    activity: Math.max(discussions + polls, Array.isArray(input.posts) ? input.posts.length : 0),
  }
}

export function deriveCommunityTrendingTopics(posts: CommunityFeedPostSummary[], limit = 5) {
  const topics = new Map<string, { label: string; count: number; engagement: number }>()
  posts.forEach((post) => {
    const engagement = Number(post.likes || 0) + Number(post.comments || 0) * 2 + Number(post.reposts || 0) * 2 + Math.floor(Number(post.views || 0) / 10)
    const labels = [
      ...(Array.isArray(post.tags) ? post.tags : []),
      post.categoryLabel || "",
    ]
      .map((item) => String(item || "").trim().replace(/^#/, ""))
      .filter(Boolean)

    labels.forEach((label) => {
      const normalized = label.toLowerCase()
      const current = topics.get(normalized) || { label, count: 0, engagement: 0 }
      current.count += 1
      current.engagement += engagement
      topics.set(normalized, current)
    })
  })

  return Array.from(topics.values())
    .sort((a, b) => b.engagement - a.engagement || b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit)
}
