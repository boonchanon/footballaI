/**
 * Backfill publishedheatmaps.match -> heatmapmatches._id
 *
 * For every published heatmap without `match`, find a heatmapmatches document with the
 * same homeTeam + awayTeam and a matchDate on the same (UTC) day. If none exists, create
 * one from the heatmap's own homeTeam / awayTeam / matchDate / competition / season.
 *
 * Usage:
 *   npm run heatmaps:backfill-match            # apply changes
 *   npm run heatmaps:backfill-match -- --dry-run
 */
import path from "node:path"
import dotenv from "dotenv"
import mongoose from "mongoose"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

const { Schema } = mongoose

// Minimal schemas bound to the existing collections; keep in sync with lib/server/models.ts.
const PublishedHeatmap =
  mongoose.models.PublishedHeatmap ||
  mongoose.model(
    "PublishedHeatmap",
    new Schema({ match: { type: Schema.Types.ObjectId, ref: "HeatmapMatch" } }, { strict: false, timestamps: true }),
  )
const HeatmapMatch =
  mongoose.models.HeatmapMatch ||
  mongoose.model(
    "HeatmapMatch",
    new Schema(
      {
        homeTeam: { type: String, required: true, trim: true },
        awayTeam: { type: String, required: true, trim: true },
        matchDate: { type: Date, required: true },
        competition: { type: String, default: "" },
        season: { type: String, default: "" },
      },
      { timestamps: true },
    ),
  )

export function utcDayRange(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) throw new Error("MONGODB_URI is not configured")
  await mongoose.connect(mongoUri)

  const heatmaps = await PublishedHeatmap.find({ $or: [{ match: { $exists: false } }, { match: null }] }).lean<any[]>()
  // Matches created in dry-run are only simulated, so cache them by key to avoid double counting.
  const createdKeys = new Map<string, mongoose.Types.ObjectId | null>()
  let linked = 0
  let created = 0
  const skipped: string[] = []

  for (const heatmap of heatmaps) {
    const homeTeam = String(heatmap.homeTeam || "").trim()
    const awayTeam = String(heatmap.awayTeam || "").trim()
    const matchDate = heatmap.matchDate ? new Date(heatmap.matchDate) : null
    if (!homeTeam || !awayTeam || !matchDate || Number.isNaN(matchDate.getTime())) {
      skipped.push(`${heatmap._id} (missing homeTeam/awayTeam/matchDate)`)
      continue
    }

    const { start, end } = utcDayRange(matchDate)
    const key = `${homeTeam}|${awayTeam}|${start.toISOString()}`
    let matchId: mongoose.Types.ObjectId | null = null

    const existing = await HeatmapMatch.findOne({ homeTeam, awayTeam, matchDate: { $gte: start, $lt: end } }).select("_id").lean<any>()
    if (existing) {
      matchId = existing._id
      linked += 1
    } else if (createdKeys.has(key)) {
      matchId = createdKeys.get(key) ?? null
      linked += 1
    } else {
      if (!dryRun) {
        const match = await HeatmapMatch.create({
          homeTeam,
          awayTeam,
          matchDate,
          competition: heatmap.competition || "",
          season: heatmap.season || "",
        })
        matchId = match._id
      }
      createdKeys.set(key, matchId)
      created += 1
    }

    console.log(`${dryRun ? "[dry-run] " : ""}${heatmap._id} ${homeTeam} vs ${awayTeam} ${start.toISOString().slice(0, 10)} -> ${matchId ?? "(new match)"}`)
    if (!dryRun && matchId) await PublishedHeatmap.updateOne({ _id: heatmap._id }, { $set: { match: matchId } })
  }

  console.log("")
  console.log(`${dryRun ? "[dry-run] " : ""}Heatmaps without match: ${heatmaps.length}`)
  console.log(`  linked to existing match: ${linked}`)
  console.log(`  new heatmapmatches created: ${created}`)
  console.log(`  heatmaps updated: ${dryRun ? 0 : linked + created}${dryRun ? ` (would update ${linked + created})` : ""}`)
  console.log(`  skipped: ${skipped.length}`)
  for (const line of skipped) console.log(`    - ${line}`)
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
    .finally(() => mongoose.disconnect())
}
