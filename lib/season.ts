export type PremierLeagueSeasonCatalogEntry = {
  apiYear: number
  labelShort: string
  labelLong: string
  marketingLabel: string
  startDate: string
  endDate: string
}

function createSeason(startYear: number): PremierLeagueSeasonCatalogEntry {
  const endYear = startYear + 1

  return {
    apiYear: startYear,
    labelShort: `${startYear}/${String(endYear).slice(-2)}`,
    labelLong: `${startYear}-${endYear}`,
    marketingLabel: `Premier League ${startYear}/${String(endYear).slice(-2)}`,
    startDate: `${startYear}-08-01`,
    endDate: `${endYear}-06-01`,
  }
}

export const PREMIER_LEAGUE_SEASON_CATALOG = [2026, 2025, 2024, 2023, 2022].map(createSeason)

export const PREMIER_LEAGUE_DATA_SEASON = PREMIER_LEAGUE_SEASON_CATALOG[0]

export const PREMIER_LEAGUE_EDITORIAL_SEASON = {
  labelShort: PREMIER_LEAGUE_DATA_SEASON.labelShort,
  labelLong: PREMIER_LEAGUE_DATA_SEASON.labelLong,
  marketingLabel: PREMIER_LEAGUE_DATA_SEASON.marketingLabel,
} as const

export function getPremierLeagueSeasonByLabel(season?: string | null) {
  const normalized = String(season || "").trim()
  if (!normalized) return PREMIER_LEAGUE_DATA_SEASON

  return (
    PREMIER_LEAGUE_SEASON_CATALOG.find(
      (entry) => entry.labelLong === normalized || entry.labelShort === normalized || entry.marketingLabel === normalized,
    ) || PREMIER_LEAGUE_DATA_SEASON
  )
}
