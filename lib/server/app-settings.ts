import { AppSetting } from "./models"
import { connectDatabase } from "./db"

export const FOOTBALL_API_SETTING_KEY = "football-api-config"
export const NEWS_API_SETTING_KEY = "news-api-config"
export const FOOTBALL_TEAMS_API_SETTING_KEY = "football-teams-api-config"

export type FootballApiConfig = {
  enabled: boolean
}

export type NewsApiConfig = {
  enabled: boolean
}

export type FootballTeamsApiConfig = {
  enabled: boolean
}

const DEFAULT_FOOTBALL_API_CONFIG: FootballApiConfig = {
  enabled: true,
}

const DEFAULT_NEWS_API_CONFIG: NewsApiConfig = {
  enabled: true,
}

const DEFAULT_FOOTBALL_TEAMS_API_CONFIG: FootballTeamsApiConfig = {
  enabled: true,
}

export async function getFootballApiConfig(): Promise<FootballApiConfig> {
  await connectDatabase()
  const doc = await AppSetting.findOne({ key: FOOTBALL_API_SETTING_KEY }).lean()
  const value = doc?.value && typeof doc.value === "object" ? doc.value : {}

  return {
    enabled: typeof (value as Record<string, unknown>).enabled === "boolean" ? Boolean((value as Record<string, unknown>).enabled) : DEFAULT_FOOTBALL_API_CONFIG.enabled,
  }
}

export async function updateFootballApiConfig(input: Partial<FootballApiConfig>, updatedBy?: string | null) {
  await connectDatabase()
  const nextValue: FootballApiConfig = {
    ...DEFAULT_FOOTBALL_API_CONFIG,
    ...(await getFootballApiConfig()),
    ...input,
  }

  const doc = await AppSetting.findOneAndUpdate(
    { key: FOOTBALL_API_SETTING_KEY },
    {
      $set: {
        key: FOOTBALL_API_SETTING_KEY,
        value: nextValue,
        updatedBy: updatedBy || null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean()

  return {
    enabled: Boolean((doc?.value as Record<string, unknown> | undefined)?.enabled ?? nextValue.enabled),
    updatedAt: doc?.updatedAt || new Date(),
  }
}

export async function getNewsApiConfig(): Promise<NewsApiConfig> {
  await connectDatabase()
  const doc = await AppSetting.findOne({ key: NEWS_API_SETTING_KEY }).lean()
  const value = doc?.value && typeof doc.value === "object" ? doc.value : {}

  return {
    enabled:
      typeof (value as Record<string, unknown>).enabled === "boolean"
        ? Boolean((value as Record<string, unknown>).enabled)
        : DEFAULT_NEWS_API_CONFIG.enabled,
  }
}

export async function updateNewsApiConfig(input: Partial<NewsApiConfig>, updatedBy?: string | null) {
  await connectDatabase()
  const nextValue: NewsApiConfig = {
    ...DEFAULT_NEWS_API_CONFIG,
    ...(await getNewsApiConfig()),
    ...input,
  }

  const doc = await AppSetting.findOneAndUpdate(
    { key: NEWS_API_SETTING_KEY },
    {
      $set: {
        key: NEWS_API_SETTING_KEY,
        value: nextValue,
        updatedBy: updatedBy || null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean()

  return {
    enabled: Boolean((doc?.value as Record<string, unknown> | undefined)?.enabled ?? nextValue.enabled),
    updatedAt: doc?.updatedAt || new Date(),
  }
}

export async function getFootballTeamsApiConfig(): Promise<FootballTeamsApiConfig> {
  await connectDatabase()
  const doc = await AppSetting.findOne({ key: FOOTBALL_TEAMS_API_SETTING_KEY }).lean()
  const value = doc?.value && typeof doc.value === "object" ? doc.value : {}

  return {
    enabled:
      typeof (value as Record<string, unknown>).enabled === "boolean"
        ? Boolean((value as Record<string, unknown>).enabled)
        : DEFAULT_FOOTBALL_TEAMS_API_CONFIG.enabled,
  }
}

export async function updateFootballTeamsApiConfig(input: Partial<FootballTeamsApiConfig>, updatedBy?: string | null) {
  await connectDatabase()
  const nextValue: FootballTeamsApiConfig = {
    ...DEFAULT_FOOTBALL_TEAMS_API_CONFIG,
    ...(await getFootballTeamsApiConfig()),
    ...input,
  }

  const doc = await AppSetting.findOneAndUpdate(
    { key: FOOTBALL_TEAMS_API_SETTING_KEY },
    {
      $set: {
        key: FOOTBALL_TEAMS_API_SETTING_KEY,
        value: nextValue,
        updatedBy: updatedBy || null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean()

  return {
    enabled: Boolean((doc?.value as Record<string, unknown> | undefined)?.enabled ?? nextValue.enabled),
    updatedAt: doc?.updatedAt || new Date(),
  }
}
