// Crests for the 2026/27 Premier League clubs, keyed by football provider team id.
// Served from /public so pages still show logos when the provider omits them or its quota runs out.
const LOCAL_TEAM_LOGOS: Record<string, string> = {
  "80": "/team-logos/manchester-city.png",
  "84": "/team-logos/liverpool.png",
  "88": "/team-logos/chelsea.png",
  "102": "/team-logos/manchester-united.png",
  "141": "/team-logos/arsenal.png",
  "164": "/team-logos/tottenham-hotspur.png",
  "3071": "/team-logos/afc-bournemouth.png",
  "3073": "/team-logos/everton.png",
  "3079": "/team-logos/brighton--hove-albion.png",
  "3085": "/team-logos/fulham.png",
  "3086": "/team-logos/brentford.png",
  "3088": "/team-logos/aston-villa.png",
  "3089": "/team-logos/nottingham-forest.png",
  "3094": "/team-logos/coventry-city.png",
  "3100": "/team-logos/newcastle-united.png",
  "3103": "/team-logos/leeds-united.png",
  "3111": "/team-logos/sunderland.png",
  "3119": "/team-logos/hull-city.png",
  "3121": "/team-logos/ipswich-town.png",
  "3429": "/team-logos/crystal-palace.png",
}

export function resolveTeamLogo(teamId: unknown, providerLogo: unknown) {
  return LOCAL_TEAM_LOGOS[String(teamId ?? "").trim()] || String(providerLogo || "")
}
