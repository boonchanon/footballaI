export type TeamPreviewLoungeSide = "home" | "away"
export type TeamReactionLoungeSide = TeamPreviewLoungeSide

export type TeamPreviewLounge = {
  id: "preview_home" | "preview_away"
  side: TeamPreviewLoungeSide
  query: "preview-home" | "preview-away"
  teamName: string
  label: string
  description: string
  tag: string
}

export type TeamReactionLounge = {
  id: "post_match_home" | "post_match_away"
  side: TeamReactionLoungeSide
  query: "post-match-home" | "post-match-away"
  teamName: string
  label: string
  description: string
  tag: string
}

export function normalizeTeamPreviewSide(value: unknown): TeamPreviewLoungeSide | null {
  const normalized = String(value || "").trim().toLowerCase().replace(/_/g, "-")
  if (normalized === "home" || normalized === "preview-home" || normalized === "home-preview") return "home"
  if (normalized === "away" || normalized === "preview-away" || normalized === "away-preview") return "away"
  return null
}

export function buildTeamPreviewLoungeTag(side: TeamPreviewLoungeSide) {
  return `match-preview:${side}`
}

export function normalizeTeamReactionSide(value: unknown): TeamReactionLoungeSide | null {
  const normalized = String(value || "").trim().toLowerCase().replace(/_/g, "-")
  if (normalized === "home" || normalized === "post-match-home" || normalized === "home-reaction" || normalized === "home-reactions") return "home"
  if (normalized === "away" || normalized === "post-match-away" || normalized === "away-reaction" || normalized === "away-reactions") return "away"
  return null
}

export function buildTeamReactionLoungeTag(side: TeamReactionLoungeSide) {
  return `match-post-match:${side}`
}

export function getTeamPreviewLounges(input: { homeTeam?: string | null; awayTeam?: string | null }): TeamPreviewLounge[] {
  const homeTeam = String(input.homeTeam || "Home Team").trim()
  const awayTeam = String(input.awayTeam || "Away Team").trim()
  return [
    {
      id: "preview_home",
      side: "home",
      query: "preview-home",
      teamName: homeTeam,
      label: `${homeTeam} Fans`,
      description: `Pre-match lounge for ${homeTeam} supporters`,
      tag: buildTeamPreviewLoungeTag("home"),
    },
    {
      id: "preview_away",
      side: "away",
      query: "preview-away",
      teamName: awayTeam,
      label: `${awayTeam} Fans`,
      description: `Pre-match lounge for ${awayTeam} supporters`,
      tag: buildTeamPreviewLoungeTag("away"),
    },
  ]
}

export function getTeamReactionLounges(input: { homeTeam?: string | null; awayTeam?: string | null }): TeamReactionLounge[] {
  const homeTeam = String(input.homeTeam || "Home Team").trim()
  const awayTeam = String(input.awayTeam || "Away Team").trim()
  return [
    {
      id: "post_match_home",
      side: "home",
      query: "post-match-home",
      teamName: homeTeam,
      label: `${homeTeam} Reactions`,
      description: `Post-match reactions with ${homeTeam} supporters`,
      tag: buildTeamReactionLoungeTag("home"),
    },
    {
      id: "post_match_away",
      side: "away",
      query: "post-match-away",
      teamName: awayTeam,
      label: `${awayTeam} Reactions`,
      description: `Post-match reactions with ${awayTeam} supporters`,
      tag: buildTeamReactionLoungeTag("away"),
    },
  ]
}

function normalizeTeamName(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/[\s._-]+/g, " ")
}

export function getFavoriteTeamPreviewLounge(input: {
  favoriteTeamName?: string | null
  isFavoriteTeam?: boolean | null
  homeTeam?: string | null
  awayTeam?: string | null
}): TeamPreviewLounge | null {
  if (!input.isFavoriteTeam) return null
  const favoriteTeam = normalizeTeamName(input.favoriteTeamName)
  const lounges = getTeamPreviewLounges({ homeTeam: input.homeTeam, awayTeam: input.awayTeam })
  if (!favoriteTeam) return lounges[0] || null
  return lounges.find((lounge) => {
    const teamName = normalizeTeamName(lounge.teamName)
    return teamName === favoriteTeam || teamName.includes(favoriteTeam) || favoriteTeam.includes(teamName)
  }) || lounges[0] || null
}

export function getFavoriteTeamReactionLounge(input: {
  favoriteTeamName?: string | null
  isFavoriteTeam?: boolean | null
  homeTeam?: string | null
  awayTeam?: string | null
}): TeamReactionLounge | null {
  if (!input.isFavoriteTeam) return null
  const favoriteTeam = normalizeTeamName(input.favoriteTeamName)
  const lounges = getTeamReactionLounges({ homeTeam: input.homeTeam, awayTeam: input.awayTeam })
  if (!favoriteTeam) return lounges[0] || null
  return lounges.find((lounge) => {
    const teamName = normalizeTeamName(lounge.teamName)
    return teamName === favoriteTeam || teamName.includes(favoriteTeam) || favoriteTeam.includes(teamName)
  }) || lounges[0] || null
}
