"use client"

import Link from "next/link"
import { Database, Loader2, RefreshCw } from "lucide-react"
import useSWR from "swr"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// Shared pieces for the admin football-data pages. The data is synced from the football API into
// MongoDB (Admin > Settings > ซิงก์ข้อมูล) and read here through the same endpoints the public site uses.

export type ApiTeam = { id: string; name: string; nameEn?: string; logo?: string }

export type StandingRow = {
  rank: number
  points: number
  team: ApiTeam
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } }
  goalsDiff: number
  form?: string
}

export type Fixture = {
  id: string | number
  date: string
  roundNumber?: number
  round?: string
  teams: { home: ApiTeam; away: ApiTeam }
  goals: { home: number | null; away: number | null }
  status: { isFinished?: boolean; isLive?: boolean; isUpcoming?: boolean; short?: string; long?: string }
  venue?: { name?: string }
}

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error(`โหลดข้อมูลไม่สำเร็จ (${response.status})`)
  return response.json()
}

export function useFootball<T>(url: string | null) {
  return useSWR<T>(url, fetcher, { revalidateOnFocus: false })
}

export function formatThaiDateTime(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" })
}

export function TeamCell({ team }: { team: ApiTeam }) {
  return (
    <span className="flex items-center gap-2">
      {team.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logo} alt="" className="h-6 w-6 object-contain" />
      ) : null}
      <span className="font-medium">{team.name || team.nameEn}</span>
    </span>
  )
}

export function DataSourceBar({ source, updatedAt, onRefresh, refreshing }: { source?: string; updatedAt?: string | null; onRefresh: () => void; refreshing?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Badge variant="outline" className="gap-1 rounded-full">
        <Database className="h-3 w-3" />
        แหล่งข้อมูล: {source || "-"}
      </Badge>
      {updatedAt ? <span>อัปเดตล่าสุด {formatThaiDateTime(updatedAt)}</span> : null}
      <Button variant="ghost" size="sm" className="h-7 gap-1 px-2" onClick={onRefresh} disabled={refreshing}>
        {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        รีเฟรช
      </Button>
      <Button asChild variant="link" size="sm" className="h-7 px-1">
        <Link href="/admin/settings">ซิงก์ข้อมูลจาก API</Link>
      </Button>
    </div>
  )
}

export function StateBox({ loading, error, empty, emptyText }: { loading: boolean; error?: unknown; empty: boolean; emptyText: string }) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }
  if (error) return <p className="py-8 text-center text-sm text-destructive">{error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ"}</p>
  if (empty) return <p className="py-8 text-center text-sm text-muted-foreground">{emptyText}</p>
  return null
}
