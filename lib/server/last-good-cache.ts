import { connectDatabase } from "./db"
import { AppSetting } from "./models"

// Keeps the last successful response from an external provider in the appsettings collection
// (key "cache:<name>") so pages can fall back to real, previously fetched data when it fails.
const cacheKey = (name: string) => `cache:${name}`

// The cache is a fallback: if MongoDB is unreachable, give up quickly instead of holding the
// request for the driver's 30 s server-selection timeout.
const CACHE_TIMEOUT_MS = 3000

function withTimeout<T>(work: Promise<T>, label: string) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${CACHE_TIMEOUT_MS} ms`)), CACHE_TIMEOUT_MS)
  })
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer))
}

function describe(error: unknown) {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error)
}

export async function saveLastGood(name: string, value: unknown) {
  try {
    await withTimeout(
      (async () => {
        await connectDatabase()
        await AppSetting.updateOne({ key: cacheKey(name) }, { $set: { value } }, { upsert: true })
      })(),
      `save cache ${name}`,
    )
  } catch (error) {
    console.error(`Failed to save cache ${name}: ${describe(error)}`)
  }
}

export async function readLastGood<T>(name: string): Promise<{ value: T; updatedAt: Date } | null> {
  try {
    const doc = await withTimeout(
      (async () => {
        await connectDatabase()
        return AppSetting.findOne({ key: cacheKey(name) }).lean<{ value?: T; updatedAt?: Date }>()
      })(),
      `read cache ${name}`,
    )
    if (!doc?.value || !doc.updatedAt) return null
    return { value: doc.value, updatedAt: new Date(doc.updatedAt) }
  } catch (error) {
    console.error(`Failed to read cache ${name}: ${describe(error)}`)
    return null
  }
}
