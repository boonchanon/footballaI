"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { getUpcomingPredictions, type GamesFixture } from "@/lib/games/upcoming-predictions"

async function fetchFixtures(url: string): Promise<GamesFixture[]> {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok || data.error || !Array.isArray(data.fixtures)) throw new Error("โหลดโปรแกรมแข่งขันไม่สำเร็จ")
  return data.fixtures
}

export function useUpcomingPredictions() {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const from = now === null ? null : new Date(now).toISOString().slice(0, 10)
  const { data, error, isLoading, mutate } = useSWR(from ? `/api/football/fixtures?type=upcoming&from=${from}&limit=20` : null, fetchFixtures, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  })
  return { matches: now === null ? [] : getUpcomingPredictions(data || [], now), error, isLoading: now === null || isLoading, retry: () => { void mutate() } }
}
