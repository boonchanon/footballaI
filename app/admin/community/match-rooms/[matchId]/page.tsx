"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Archive, CheckCircle, Clock, EyeOff, Flag, Pin, RefreshCw, ShieldCheck, SlidersHorizontal } from "lucide-react"

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
  demoOverride?: {
    providerPhase: "pre_match" | "live" | "full_time"
    effectivePhase: "pre_match" | "live" | "full_time"
    overridePhase: "auto" | "pre_match" | "live" | "full_time"
    enabled: boolean
    isExpired?: boolean
    remainingSeconds?: number | null
    reason?: string
    updatedBy?: string
    updatedAt?: string | null
    expiresAt?: string | null
    durationMinutes?: number | null
  }
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

const durationPresets = [
  { value: "5", label: "5 นาที" },
  { value: "10", label: "10 นาที" },
  { value: "30", label: "30 นาที" },
  { value: "custom", label: "กำหนดเอง" },
] as const

function formatCountdown(seconds?: number | null) {
  const safeSeconds = Math.max(0, Number(seconds || 0))
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
}

function formatDateTime(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })
}

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
  const [demoPhase, setDemoPhase] = useState<"auto" | "pre_match" | "live" | "full_time">("auto")
  const [durationPreset, setDurationPreset] = useState<"5" | "10" | "30" | "custom">("5")
  const [customDuration, setCustomDuration] = useState("5")
  const [demoReason, setDemoReason] = useState("")
  const [demoFeedback, setDemoFeedback] = useState("")
  const [clockNow, setClockNow] = useState(Date.now())
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
      setDemoPhase(response.demoOverride?.overridePhase || "auto")
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

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!data?.demoOverride?.enabled || !data.demoOverride.expiresAt) return
    const remaining = Math.ceil((new Date(data.demoOverride.expiresAt).getTime() - clockNow) / 1000)
    if (remaining <= 0) void load()
  }, [clockNow, data?.demoOverride?.enabled, data?.demoOverride?.expiresAt])

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

  async function submitDemoOverride(nextPhase: "auto" | "pre_match" | "live" | "full_time") {
    if (!matchId) return
    const trimmedReason = demoReason.trim()
    if (!trimmedReason) {
      setError("Demo override ต้องกรอก reason")
      return
    }
    const durationCandidate = Number(durationPreset === "custom" ? customDuration : durationPreset)
    const durationMinutes = nextPhase === "auto" ? null : durationCandidate
    if (nextPhase !== "auto" && (!Number.isFinite(durationCandidate) || durationCandidate < 1 || durationCandidate > 120)) {
      setError("Duration ต้องอยู่ระหว่าง 1–120 นาที")
      return
    }
    const label = nextPhase === "auto" ? "Reset to Provider" : `Apply ${nextPhase}`
    if (!window.confirm(`ยืนยัน ${label}?`)) return
    const token = getAuthToken()
    if (!token) return
    setActingId(`demo:${nextPhase}`)
    try {
      const response = await fetchJson<Pick<AdminMatchRoomDetailResponse, "demoOverride"> & { idempotent?: boolean }>(`/admin/community/match-rooms/${matchId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestedPhase: nextPhase, reason: trimmedReason, durationMinutes }),
      })
      setDemoFeedback(response.idempotent ? "Demo override already matched this phase." : "Demo override updated.")
      setDemoReason("")
      await load()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "อัปเดต Demo override ไม่สำเร็จ")
    } finally {
      setActingId("")
    }
  }

  const fixture = data?.fixture
  const demoExpiresAt = data?.demoOverride?.expiresAt || null
  const demoRemainingSeconds = demoExpiresAt ? Math.max(0, Math.ceil((new Date(demoExpiresAt).getTime() - clockNow) / 1000)) : data?.demoOverride?.remainingSeconds ?? null

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
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-primary" />
                Demo Controls
                {data.demoOverride?.enabled ? <Badge className="bg-primary text-primary-foreground">DEMO OVERRIDE</Badge> : null}
                {data.demoOverride?.isExpired ? <Badge variant="outline" className="border-amber-500/40 text-amber-400">EXPIRED</Badge> : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm lg:grid-cols-[1fr_320px]">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-border p-3">
                  <p className="text-muted-foreground">Provider phase</p>
                  <p className="font-semibold">{data.demoOverride?.providerPhase || "-"}</p>
                </div>
                <div className="rounded-2xl border border-border p-3">
                  <p className="text-muted-foreground">Effective phase</p>
                  <p className="font-semibold">{data.demoOverride?.effectivePhase || "-"}</p>
                </div>
                <div className="rounded-2xl border border-border p-3">
                  <p className="text-muted-foreground">Demo override</p>
                  <p className="font-semibold">{data.demoOverride?.overridePhase || "auto"}</p>
                </div>
                <div className="rounded-2xl border border-border p-3">
                  <p className="text-muted-foreground">Remaining</p>
                  <p className="flex items-center gap-2 font-semibold">
                    <Clock className="h-4 w-4 text-primary" />
                    {data.demoOverride?.enabled ? formatCountdown(demoRemainingSeconds) : data.demoOverride?.isExpired ? "หมดเวลาแล้ว" : "-"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border p-3 md:col-span-2">
                  <p className="text-muted-foreground">Expires</p>
                  <p className="font-semibold">{formatDateTime(data.demoOverride?.expiresAt)}</p>
                </div>
              </div>
              <div className="space-y-3">
                <Select value={demoPhase} onValueChange={(value) => setDemoPhase(value as typeof demoPhase)}>
                  <SelectTrigger aria-label="เลือก Demo override phase">
                    <SelectValue placeholder="Demo phase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="pre_match">Pre Match</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="full_time">Full Time</SelectItem>
                  </SelectContent>
                </Select>
                <div className="space-y-2 rounded-2xl border border-border p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Override duration</p>
                  <div className="grid grid-cols-2 gap-2">
                    {durationPresets.map((preset) => (
                      <Button
                        key={preset.value}
                        type="button"
                        variant={durationPreset === preset.value ? "default" : "outline"}
                        className="justify-center"
                        onClick={() => setDurationPreset(preset.value)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                  {durationPreset === "custom" ? (
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      value={customDuration}
                      onChange={(event) => setCustomDuration(event.target.value)}
                      placeholder="1-120 นาที"
                      aria-label="Custom demo override duration"
                    />
                  ) : null}
                </div>
                <Input value={demoReason} onChange={(event) => setDemoReason(event.target.value)} placeholder="Reason required" aria-label="Demo override reason" />
                {demoFeedback ? <p className="text-xs text-emerald-400">{demoFeedback}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Button disabled={Boolean(actingId)} onClick={() => void submitDemoOverride(demoPhase)}>
                    Apply Demo Override
                  </Button>
                  <Button variant="outline" disabled={Boolean(actingId)} onClick={() => void submitDemoOverride("auto")}>
                    Reset to Provider
                  </Button>
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
