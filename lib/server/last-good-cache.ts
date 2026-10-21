import { connectDatabase } from "./db"
import { AppSetting } from "./models"

// Keeps the last successful response from an external provider in the appsettings collection
// (key "cache:<name>") so pages can fall back to real, previously fetched data when it fails.
const cacheKey = (name: string) => `cache:${name}`

export async function saveLastGood(name: string, value: unknown) {
  try {
    await connectDatabase()
    await AppSetting.updateOne({ key: cacheKey(name) }, { $set: { value } }, { upsert: true })
  } catch (error) {
    console.error(`Failed to save cache ${name}`, error)
  }
}

export async function readLastGood<T>(name: string): Promise<{ value: T; updatedAt: Date } | null> {
  try {
    await connectDatabase()
    const doc = await AppSetting.findOne({ key: cacheKey(name) }).lean<{ value?: T; updatedAt?: Date }>()
    if (!doc?.value || !doc.updatedAt) return null
    return { value: doc.value, updatedAt: new Date(doc.updatedAt) }
  } catch (error) {
    console.error(`Failed to read cache ${name}`, error)
    return null
  }
}
