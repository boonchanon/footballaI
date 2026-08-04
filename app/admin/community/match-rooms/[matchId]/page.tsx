"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Archive, CheckCircle, EyeOff, Flag, Pin, RefreshCw, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchJson } from "@/lib/api-client"
import { getAuthToken } from "@/lib/auth-client"

type AdminMatchRoomItem = {
  id: string
  roomType: string
  contentType: string
  title: string
  content: string
  status: string
  moderationStatus: string
  isPinned?: boolean
  isOfficialThread?: boolean
  reportsCount?: number
  archivedAt?: string | null
  createdAt?: string
  timeAgo?: string
  author?: { name?: string; avatar?: string; role?: string }
  poll?: { question: string; totalVotes: number; options: Array<{ id: string; text: string; votes: number }> } | null
  action?: string
  targetType?: string
  reason?: string
  description?: string
  metadata?: Record<string, unknown>
}

type AdminMatchRoomDetailResponse = {
  fixture: { id: string; homeTeam: string; awayTeam: string; status: string; kickoff: string; dateThai: string; venue: string }
  channels: Array<{ roomType: string; state: string; opensAt?: string | null; closesAt?: string | null; archiveAt?: string | null; isArchived: boolean }>
  overview: { roomMessages: number; threads: number; polls: number; reports: number; hidden: number; archivedMessages: number; latestActivityAt?: string | null }
  tab: string
  items: AdminMatchRoomItem[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

const tabs = [
  { id: "overview", label: "ภาพรวม" },
  { id: "main", label: "ห้องหลัก" },
  { id: "tactics", label: "แท็กติก" },
  { id: "preview", label: "พรีวิว" },
  { id: "post_match", label: "หลังเกม" },
  { id: "threads", label: "Threads" },
  { id: "polls", label: "Polls" },
  { id: "reports", label: "Reports" },
  { id: "moderation", label: "Moderation" },
  { id: "audit", label: "Audit Log" },
]

function statusBadge(status?: string) {
  if (status === "published" || status === "approved" || status === "open") return <Badge className="bg-emerald-500/10 text-emerald-400">{status}</Badge>
  if (status === "hidden" || status === "pending_review" || status === "archived") return <Badge className="bg-amber-500/10 text-amber-400">{status}</Badge>
  return <Badge variant="outline">{status || "-"}</Badge>
}

export default function AdminMatchRoomDetailPage({ params }: { params: Promise<{ matchId: string }> }) {
  const [matchId, setMatchId] = useState("")
  const [data, setData] = useState<AdminMatchRoomDetailResponse | null>(null)
  const [tab, setTab] = useState("overview")
  const [page, setPage] = useState(1)
  const [reason, setReason] = useState("")
  const [manualArchiveRoomType, setManualArchiveRoomType] = useState("")
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    void params.then((value) => setMatchId(value.matchId))
  }, [params])

  async function load() {
    if (!matchId) return
    const token = getAuthToken()
    if (!token) {
      setError("ไม่พบสิทธิ์แอดมิน กรุณาเข้าสู่ระบบใหม่")
      setLoading(false)
      return
    }
    const query = new URLSearchParams({ tab, page: String(page), limit: "20" })
    setLoading(true)
    try {
      const response = await fetchJson<AdminMatchRoomDetailResponse>(`/admin/community/match-rooms/${matchId}?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setData(response)
      setError("")
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูล Match Room ไม่สำเร็จ กรุณาลองใหม่")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [matchId, tab, page])

  async function submitAction(action: string, item?: AdminMatchRoomItem, roomType?: string) {
    if (!matchId) return
    if ((action === "room_manual_close" || action === "room_manual_archive") && reason.trim().length < 6) {
      setError("Manual close/archive ต้องกรอก reason อย่างน้อย 6 ตัวอักษร")
      return
    }
    if (!window.confirm("ยืนยัน action นี้ใช่ไหม?")) return
    const token = getAuthToken()
    if (!token) return
    setActingId(item?.id || action)
    try {
      await fetchJson(`/admin/community/match-rooms/${matchId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, targetId: item?.id || "", roomType: roomType || item?.roomType || tab, reason }),
      })
      setReason("")
      setManualArchiveRoomType("")
      await load()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "ดำเนินการไม่สำเร็จ")
    } finally {
      setActingId("")
    }
  }

  const fixture = data?.fixture

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Button asChild variant="ghost" className="mb-2 px-0">
            <Link href="/admin/community/match-rooms">← กลับ Match Rooms</Link>
          </Button>
          <h1 className="text-2xl font-bold md:text-3xl">{fixture ? `${fixture.homeTeam} vs ${fixture.awayTeam}` : "Match Room"}</h1>
          <p className="text-muted-foreground">Match facts read-only: score/status/kickoff/team/venue แก้จากหน้านี้ไม่ได้</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>

      {error ? <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}

      {fixture ? (
        <Card>
          <CardContent className="grid gap-3 p-5 text-sm md:grid-cols-4">
            <div><p className="text-muted-foreground">Match ID</p><p className="font-semibold">{fixture.id}</p></div>
            <div><p className="text-muted-foreground">Status</p><p className="font-semibold">{fixture.status}</p></div>
            <div><p className="text-muted-foreground">Kickoff</p><p className="font-semibold">{fixture.dateThai || fixture.kickoff}</p></div>
            <div><p className="text-muted-foreground">Venue</p><p className="font-semibold">{fixture.venue || "-"}</p></div>
          </CardContent>
        </Card>
      ) : null}

      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value)
          setPage(1)
        }}
      >
        <TabsList className="flex h-auto flex-wrap justify-start">
          {tabs.map((item) => <TabsTrigger key={item.id} value={item.id}>{item.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {loading ? <Skeleton className="h-80 rounded-2xl" /> : null}

      {!loading && data && tab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardHeader><CardTitle>Room states</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {data.channels.map((channel) => (
                <div key={channel.roomType} className="rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{channel.roomType}</p>
                    {statusBadge(channel.state)}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">opensAt: {channel.opensAt || "-"}</p>
                  <p className="text-xs text-muted-foreground">closesAt: {channel.closesAt || "-"}</p>
                  {channel.isArchived ? <Badge variant="outline" className="mt-2 gap-1"><Archive className="h-3 w-3" /> Archived</Badge> : null}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Activity summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Messages: {data.overview.roomMessages}</p>
              <p>Threads: {data.overview.threads}</p>
              <p>Polls: {data.overview.polls}</p>
              <p>Reports: {data.overview.reports}</p>
              <p>Hidden: {data.overview.hidden}</p>
              <p>Archived messages: {data.overview.archivedMessages}</p>
              <div className="pt-3">
                {manualArchiveRoomType ? (
                  <div className="mb-3 rounded-2xl border border-border p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Reason สำหรับ Archive {manualArchiveRoomType}</p>
                    <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" className="mt-2" />
                    <div className="mt-2 flex gap-2">
                      <Button variant="outline" disabled={Boolean(actingId)} onClick={() => void submitAction("room_manual_archive", undefined, manualArchiveRoomType)}>
                        Confirm archive
                      </Button>
                      <Button variant="ghost" disabled={Boolean(actingId)} onClick={() => {
                        setManualArchiveRoomType("")
                        setReason("")
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  {["preview", "post_match"].map((roomType) => (
                    <Button key={roomType} variant="outline" disabled={Boolean(actingId)} onClick={() => setManualArchiveRoomType(roomType)}>
                      Archive {roomType}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!loading && data && tab !== "overview" ? (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle>{tabs.find((item) => item.id === tab)?.label}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.items.length ? data.items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {statusBadge(item.status || item.moderationStatus)}
                      {item.archivedAt ? <Badge variant="outline">Archived</Badge> : null}
                      {item.isPinned ? <Badge variant="outline"><Pin className="mr-1 h-3 w-3" />Pinned</Badge> : null}
                      {item.isOfficialThread ? <Badge variant="outline"><ShieldCheck className="mr-1 h-3 w-3" />Official</Badge> : null}
                      {item.reportsCount ? <Badge className="bg-amber-500/10 text-amber-400"><Flag className="mr-1 h-3 w-3" />{item.reportsCount}</Badge> : null}
                    </div>
                    <p className="font-semibold">{item.poll?.question || item.title || item.action || item.reason || "Untitled"}</p>
                    <p className="line-clamp-3 text-sm text-muted-foreground">{item.content || item.description || JSON.stringify(item.metadata || {})}</p>
                    <p className="text-xs text-muted-foreground">{item.author?.name || item.targetType || item.contentType} • {item.timeAgo || item.createdAt || ""}</p>
                    {item.poll ? <p className="text-xs text-muted-foreground">Total votes: {item.poll.totalVotes}</p> : null}
                  </div>
                  {["main", "tactics", "preview", "post_match", "threads", "polls"].includes(tab) ? (
                    <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-72">
                      {item.status === "hidden" ? (
                        <Button variant="outline" disabled={Boolean(actingId)} onClick={() => void submitAction(tab === "polls" ? "poll_unhide" : tab === "threads" ? "thread_unhide" : "message_unhide", item)}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Unhide
                        </Button>
                      ) : (
                        <Button variant="outline" disabled={Boolean(actingId)} onClick={() => void submitAction(tab === "polls" ? "poll_hide" : tab === "threads" ? "thread_hide" : "message_hide", item)}>
                          <EyeOff className="mr-2 h-4 w-4" />
                          Hide
                        </Button>
                      )}
                      {tab === "threads" ? (
                        <>
                          <Button variant="outline" onClick={() => void submitAction(item.isPinned ? "thread_unpin" : "thread_pin", item)}>{item.isPinned ? "Unpin" : "Pin"}</Button>
                          <Button variant="outline" onClick={() => void submitAction(item.isOfficialThread ? "thread_unofficial" : "thread_official", item)}>{item.isOfficialThread ? "Unofficial" : "Official"}</Button>
                        </>
                      ) : null}
                      <Button asChild variant="ghost">
                        <Link href={`/admin/community/moderation?q=${encodeURIComponent(item.id)}`}>Open Moderation</Link>
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            )) : <p className="py-10 text-center text-sm text-muted-foreground">{tab === "reports" ? "ไม่มีรายงานสำหรับ Match Room นี้" : "ยังไม่มีข้อความในห้องนี้"}</p>}
          </CardContent>
        </Card>
      ) : null}

      {data && tab !== "overview" ? (
        <div className="flex items-center justify-between">
          <Button variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>ก่อนหน้า</Button>
          <span className="text-sm text-muted-foreground">หน้า {page} / {data.pagination.totalPages}</span>
          <Button variant="outline" disabled={page >= data.pagination.totalPages || loading} onClick={() => setPage((value) => value + 1)}>ถัดไป</Button>
        </div>
      ) : null}
    </div>
  )
}
