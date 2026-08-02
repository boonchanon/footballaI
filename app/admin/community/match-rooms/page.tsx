"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Archive, Flag, MessageSquare, RefreshCw, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchJson } from "@/lib/api-client"
import { getAuthToken } from "@/lib/auth-client"

type AdminMatchRoomListItem = {
  matchId: string
  fixture: {
    id: string
    homeTeam: string
    awayTeam: string
    status: string
    kickoff: string
    dateThai: string
    isFinished: boolean
  }
  channels: Array<{ roomType: string; state: string; isArchived: boolean }>
  counts: { roomMessages: number; threads: number; polls: number; reports: number; followers: number; archivedMessages: number }
  latestActivityAt?: string | null
  hasReports: boolean
  hasArchivedRoom: boolean
}

type AdminMatchRoomsResponse = {
  items: AdminMatchRoomListItem[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

function getChannelState(item: AdminMatchRoomListItem, roomType: string) {
  return item.channels.find((channel) => channel.roomType === roomType)?.state || "unavailable"
}

function getStateBadge(state: string) {
  const className =
    state === "open" || state === "closing"
      ? "bg-emerald-500/10 text-emerald-400"
      : state === "archived"
        ? "bg-zinc-500/10 text-zinc-300"
        : state === "upcoming"
          ? "bg-blue-500/10 text-blue-400"
          : "bg-muted text-muted-foreground"
  return <Badge className={className}>{state}</Badge>
}

export default function AdminCommunityMatchRoomsPage() {
  const [items, setItems] = useState<AdminMatchRoomListItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filter, setFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function load() {
    const token = getAuthToken()
    if (!token) {
      setError("ไม่พบสิทธิ์แอดมิน กรุณาเข้าสู่ระบบใหม่")
      setLoading(false)
      return
    }

    const params = new URLSearchParams({ page: String(page), limit: "12", filter })
    if (query.trim()) params.set("q", query.trim())

    setLoading(true)
    try {
      const response = await fetchJson<AdminMatchRoomsResponse>(`/admin/community/match-rooms?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setItems(response.items)
      setTotalPages(response.pagination.totalPages)
      setError("")
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูล Match Room ไม่สำเร็จ กรุณาลองใหม่")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [page, filter])

  function submitSearch(event: React.FormEvent) {
    event.preventDefault()
    setPage(1)
    void load()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Community Match Rooms</h1>
          <p className="text-muted-foreground">ดูแล active และ archived rooms โดยไม่แก้ข้อมูลการแข่งขันจริง</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={submitSearch} className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาทีม หรือ Match ID" className="pl-9" />
            </div>
            <Select
              value={filter}
              onValueChange={(value) => {
                setFilter(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="md:w-56">
                <SelectValue placeholder="ตัวกรอง" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="reports">มี Reports</SelectItem>
                <SelectItem value="preview_open">Preview Open</SelectItem>
                <SelectItem value="post_match_open">Post-match Open</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">ค้นหา</Button>
          </form>
        </CardContent>
      </Card>

      {error ? <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-64 rounded-2xl" />)}
        </div>
      ) : items.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Card key={item.matchId} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{item.fixture.homeTeam} vs {item.fixture.awayTeam}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">Match ID: {item.matchId}</p>
                  </div>
                  {item.hasArchivedRoom ? <Badge variant="outline" className="gap-1"><Archive className="h-3 w-3" /> Archived</Badge> : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge>{item.fixture.status || "unknown"}</Badge>
                  <Badge variant="outline">{item.fixture.dateThai || item.fixture.kickoff || "-"}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {["main", "tactics", "preview", "post_match"].map((roomType) => (
                    <div key={roomType} className="rounded-xl border border-border p-2">
                      <p className="font-medium">{roomType}</p>
                      <div className="mt-1">{getStateBadge(getChannelState(item, roomType))}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-xl bg-muted/50 p-2"><MessageSquare className="mx-auto h-4 w-4" />{item.counts.roomMessages}</div>
                  <div className="rounded-xl bg-muted/50 p-2">Threads<br />{item.counts.threads}</div>
                  <div className="rounded-xl bg-muted/50 p-2 text-amber-500"><Flag className="mx-auto h-4 w-4" />{item.counts.reports}</div>
                </div>
                <Button asChild className="w-full">
                  <Link href={`/admin/community/match-rooms/${item.matchId}`}>เปิดดูแล Match Room</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">ยังไม่มี Match Room</CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>ก่อนหน้า</Button>
        <span className="text-sm text-muted-foreground">หน้า {page} / {totalPages}</span>
        <Button variant="outline" disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>ถัดไป</Button>
      </div>
    </div>
  )
}
