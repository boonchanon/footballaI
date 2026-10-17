"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { getBangkokWeek, getUpcomingPredictions, getWeeklyPredictions, type GamesFixture } from "@/lib/games/upcoming-predictions"

async function fetchFixtures(url: string): Promise<GamesFixture[]> {
  const response = await fetch(url)
  const body = await response.json()
  if (!response.ok || body.error || !Array.isArray(body.fixtures)) throw new Error("โหลดโปรแกรมแข่งขันไม่สำเร็จ")
  return body.fixtures
}

export function useWeeklyPredictions() {
  const [now, setNow] = useState<number | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  useEffect(() => {
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const week = now === null ? null : getBangkokWeek(now, weekOffset)
  // Reuse the season cache even when the selected week has no fixtures.
  const { data, error, isLoading, mutate } = useSWR(week ? "/api/football/fixtures?type=all" : null, fetchFixtures, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  })
  const nextMatch = week && now !== null ? getUpcomingPredictions(data || [], now, Infinity).find(match => match.kickoffAt >= week.end) : undefined
  const nextWeekOffset = nextMatch && now !== null
    ? Math.round((getBangkokWeek(nextMatch.kickoffAt).start - getBangkokWeek(now).start) / (7 * 86400000))
    : null
  return {
    matches: week && now !== null ? getWeeklyPredictions(data || [], now, week) : [],
    week, weekOffset, setWeekOffset, nextWeekOffset, error, isLoading: now === null || isLoading,
    retry: () => { void mutate() },
  }
}
