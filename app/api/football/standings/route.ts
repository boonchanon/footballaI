import { NextResponse } from "next/server"

import { readLastGood, saveLastGood } from "@/lib/server/last-good-cache"
import { PREMIER_LEAGUE_DATA_SEASON } from "@/lib/season"

import { footballService } from "../service"

const CACHE_NAME = "football:standings"

export async function GET() {
  try {
    const data = await footballService.getStandings()
    const lastUpdated = new Date().toISOString()
    if (data.length) await saveLastGood(CACHE_NAME, data)

    return NextResponse.json({
      data,
      season: PREMIER_LEAGUE_DATA_SEASON.labelLong,
      source: "internal-football-service",
      usedFallback: false,
      lastUpdated,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch standings"
    // Provider is down: serve the last standings that were fetched successfully, with their timestamp.
    const cached = await readLastGood<unknown[]>(CACHE_NAME)
    if (cached?.value.length) {
      return NextResponse.json({
        data: cached.value,
        season: PREMIER_LEAGUE_DATA_SEASON.labelLong,
        source: "cache",
        usedFallback: true,
        lastUpdated: cached.updatedAt.toISOString(),
        notice: "ไม่สามารถดึงข้อมูลล่าสุดได้ กำลังแสดงตารางคะแนนที่บันทึกไว้ล่าสุด",
        error: message,
      })
    }

    return NextResponse.json(
      {
        data: [],
        season: PREMIER_LEAGUE_DATA_SEASON.labelLong,
        source: "error",
        usedFallback: false,
        error: message,
      },
      { status: 502 },
    )
  }
}
