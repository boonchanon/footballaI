"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, EyeOff, Search, ShieldAlert } from "lucide-react"

import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, getCommunityStatusTone } from "@/components/admin/community-admin-ui"
import { fetchJson } from "@/lib/api-client"
import { getAuthToken } from "@/lib/auth-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

type ModerationItem = {
  id: string
  sourceId: string
  contentType: "post" | "comment" | "story" | "image" | "video" | "room_message" | "thread_root" | "match_poll"
  status: "approved" | "pending_review" | "rejected" | "processing" | "failed"
  publishStatus?: string
  reasons: string[]
  provider: string
  preview: string
  imageUrl?: string
  mediaNotes?: string[]
  ocrTextPreview?: string
  qrPreview?: string[]
  createdAt: string
  timeAgo: string
  author: {
    id: string
    name: string
    avatar: string
  }
  repeatOffenses: number
}

type ModerationActionResponse = {
  message: string
  item?: Pick<ModerationItem, "id" | "sourceId" | "contentType" | "status" | "publishStatus">
}

type UserActionChoice = "" | "warn" | "restrict" | "suspend" | "ban"

const userActionOptions: Array<{ label: string; value: UserActionChoice; moderationAction: "approve" | "reject" | "hide"; destructive?: boolean }> = [
  { label: "Warn user", value: "warn", moderationAction: "approve" },
  { label: "Restrict user", value: "restrict", moderationAction: "reject" },
  { label: "Suspend user", value: "suspend", moderationAction: "reject", destructive: true },
  { label: "Ban user", value: "ban", moderationAction: "reject", destructive: true },
]

export default function AdminCommunityModerationPage() {
  const [items, setItems] = useState<ModerationItem[]>([])
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("pending_review")
  const [actionError, setActionError] = useState("")
  const [actingId, setActingId] = useState<string | null>(null)
  const [selectedUserActionItem, setSelectedUserActionItem] = useState<ModerationItem | null>(null)
  const [selectedUserAction, setSelectedUserAction] = useState<UserActionChoice>("warn")

  async function loadQueue() {
    const token = getAuthToken()
    if (!token) {
      setError("ไม่พบสิทธิ์แอดมิน กรุณาเข้าสู่ระบบใหม่")
      setLoading(false)
      return
    }

    const params = new URLSearchParams()
    if (query.trim()) params.set("q", query.trim())
    if (typeFilter !== "all") params.set("type", typeFilter)
    if (statusFilter !== "all") params.set("status", statusFilter)

    setLoading(true)
    try {
      const response = await fetchJson<{ items: ModerationItem[] }>(`/admin/community/moderation?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      const normalizedItems = response.items.filter((item) => {
        if (typeFilter !== "all" && item.contentType !== typeFilter) return false
        if (statusFilter !== "all" && item.status !== statusFilter) return false
        return true
      })
      setItems(normalizedItems)
      setError("")
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "โหลด moderation queue ไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadQueue()
  }, [query, typeFilter, statusFilter])

  useEffect(() => {
    const token = getAuthToken()
    if (!token || !items.length) return

    const previewItems = items.filter(
      (item) =>
        Boolean(item.imageUrl) &&
        item.imageUrl?.startsWith("/api/admin/community/moderation/media/") &&
        !mediaPreviewUrls[item.id],
    )
    if (!previewItems.length) return

    let cancelled = false

    Promise.all(
      previewItems.map(async (item) => {
        const response = await fetch(item.imageUrl as string, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
        if (!response.ok) return null
        const blob = await response.blob()
        return [item.id, URL.createObjectURL(blob)] as const
      }),
    )
      .then((entries) => {
        if (cancelled) return
        setMediaPreviewUrls((current) => ({
          ...current,
          ...Object.fromEntries(entries.filter(Boolean) as Array<readonly [string, string]>),
        }))
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [items, mediaPreviewUrls])

  async function applyAction(
    id: string,
    action: "approve" | "reject" | "hide",
    userAction?: "" | "warn" | "restrict" | "clear_restriction" | "suspend" | "unsuspend" | "ban" | "unban",
  ) {
    const token = getAuthToken()
    if (!token) return

    try {
      setActionError("")
      setActingId(id)
      const response = await fetchJson<ModerationActionResponse>(`/admin/community/moderation/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, userAction }),
      })
      setItems((current) => {
        if ((response.item?.status || action) === "approved" && (response.item?.publishStatus || "") === "published" && statusFilter === "pending_review") {
          return current.filter((item) => item.id !== id)
        }

        return current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: response.item?.status || item.status,
                publishStatus: response.item?.publishStatus ?? item.publishStatus,
              }
            : item,
        )
      })
      await loadQueue()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "อัปเดต moderation ไม่สำเร็จ")
    } finally {
      setActingId(null)
    }
  }

  function getAvailableActions(item: ModerationItem) {
    const isPublished = item.status === "approved" && item.publishStatus === "published"
    const isPending = item.status === "pending_review"
    const isRejectedOrHidden = item.status === "rejected" || item.publishStatus === "hidden"

    return {
      canApprove: isPending || isRejectedOrHidden,
      canHide: isPending || isPublished,
      canReject: isPending || isPublished,
      isPublished,
    }
  }

  function getRenderableImageUrl(item: ModerationItem) {
    return mediaPreviewUrls[item.id] || item.imageUrl || ""
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Moderation Queue" description="ตรวจคิวเนื้อหาที่ระบบส่งมาให้แอดมินตัดสินใจขั้นสุดท้าย" />

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาโพสต์ คอมเมนต์ หรือสตอรี่..." className="pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-44">
              <SelectValue placeholder="ประเภท" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              <SelectItem value="post">โพสต์</SelectItem>
              <SelectItem value="comment">คอมเมนต์</SelectItem>
              <SelectItem value="story">สตอรี่</SelectItem>
              <SelectItem value="image">รูปภาพ</SelectItem>
              <SelectItem value="video">วิดีโอ</SelectItem>
              <SelectItem value="room_message">Room message</SelectItem>
              <SelectItem value="thread_root">Thread root</SelectItem>
              <SelectItem value="match_poll">Match poll</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-44">
              <SelectValue placeholder="สถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending_review">Pending review</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="all">ทั้งหมด</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Moderation Queue</CardTitle>
          <CardDescription>รายการที่ระบบ local และ AI ส่งมาให้ตรวจ พร้อมเหตุผลและประวัติการทำผิดซ้ำ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
          {actionError ? <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{actionError}</div> : null}
          {loading
            ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-48 w-full" />)
            : items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border p-4">
                  {(() => {
                    const actions = getAvailableActions(item)
                    return (
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <Avatar>
                        <AvatarImage src={item.author.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{item.author.name.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <AdminStatusBadge tone="info">{item.contentType}</AdminStatusBadge>
                          <AdminStatusBadge tone={getCommunityStatusTone(item.status)}>{item.status}</AdminStatusBadge>
                          {item.publishStatus ? <Badge variant="outline">post:{item.publishStatus}</Badge> : null}
                          <Badge variant="outline">{item.provider}</Badge>
                          {item.repeatOffenses > 1 ? (
                            <Badge className="bg-red-500/10 text-red-400">ผิดซ้ำ {item.repeatOffenses} ครั้ง</Badge>
                          ) : null}
                        </div>
                        <p className="font-medium">{item.author.name}</p>
                        <p className="text-sm text-muted-foreground">{item.timeAgo}</p>
                        <p className="whitespace-pre-wrap text-sm">{item.preview}</p>
                        {item.reasons.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {item.reasons.map((reason) => (
                              <Badge key={reason} variant="outline">{reason}</Badge>
                            ))}
                          </div>
                        ) : null}
                        {item.mediaNotes?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {item.mediaNotes.map((note) => (
                              <Badge key={note} className="bg-primary/10 text-primary hover:bg-primary/10">{note}</Badge>
                            ))}
                          </div>
                        ) : null}
                        {item.ocrTextPreview ? (
                          <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
                            <p className="mb-1 font-medium text-foreground">OCR / vision text</p>
                            <p className="line-clamp-3 whitespace-pre-wrap">{item.ocrTextPreview}</p>
                          </div>
                        ) : null}
                        {item.qrPreview?.length ? (
                          <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
                            <p className="mb-1 font-medium text-foreground">QR / detected links</p>
                            <div className="flex flex-wrap gap-2">
                              {item.qrPreview.map((value) => (
                                <Badge key={value} variant="outline">{value}</Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {getRenderableImageUrl(item) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={getRenderableImageUrl(item)} alt="Moderation preview" className="mt-2 h-36 w-28 rounded-xl object-cover" />
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:w-[320px] lg:justify-end">
                      {actions.isPublished ? <Badge className="border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">เผยแพร่แล้ว</Badge> : null}
                      {actions.canApprove ? (
                        <Button size="sm" disabled={actingId === item.id} onClick={() => void applyAction(item.id, "approve")}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {actingId === item.id ? "Processing..." : "Approve"}
                        </Button>
                      ) : null}
                      {actions.canHide ? (
                        <Button size="sm" variant="outline" disabled={actingId === item.id} onClick={() => void applyAction(item.id, "hide")}>
                          <EyeOff className="mr-2 h-4 w-4" />
                          Hide
                        </Button>
                      ) : null}
                      {actions.canReject ? (
                        <Button size="sm" variant="destructive" disabled={actingId === item.id} onClick={() => void applyAction(item.id, "reject")}>
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      ) : null}
                      <Button size="sm" variant="outline" disabled={actingId === item.id} onClick={() => {
                        setSelectedUserAction("warn")
                        setSelectedUserActionItem(item)
                      }}>
                        <ShieldAlert className="mr-2 h-4 w-4" />
                        User action
                      </Button>
                    </div>
                  </div>
                    )
                  })()}
                </div>
              ))}
          {!loading && items.length === 0 ? <AdminEmptyState title="Moderation queue is clear" description="ไม่มีรายการตามตัวกรองที่เลือก" /> : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedUserActionItem)} onOpenChange={(open) => {
        if (!open && !actingId) setSelectedUserActionItem(null)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Actions</DialogTitle>
            <DialogDescription>เลือก action ต่อผู้เขียน content นี้ ระบบจะใช้ moderation route เดิมและบันทึก audit ตามเดิม</DialogDescription>
          </DialogHeader>
          {selectedUserActionItem ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm">
                <p className="font-medium">{selectedUserActionItem.author.name}</p>
                <p className="mt-1 line-clamp-3 text-muted-foreground">{selectedUserActionItem.preview}</p>
              </div>
              <Select value={selectedUserAction} onValueChange={(value) => setSelectedUserAction(value as UserActionChoice)}>
                <SelectTrigger><SelectValue placeholder="User action" /></SelectTrigger>
                <SelectContent>
                  {userActionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" disabled={Boolean(actingId)} onClick={() => setSelectedUserActionItem(null)}>Cancel</Button>
            <Button
              variant={userActionOptions.find((option) => option.value === selectedUserAction)?.destructive ? "destructive" : "default"}
              disabled={!selectedUserActionItem || Boolean(actingId)}
              onClick={() => {
                const option = userActionOptions.find((item) => item.value === selectedUserAction)
                if (!selectedUserActionItem || !option) return
                void applyAction(selectedUserActionItem.id, option.moderationAction, option.value).then(() => setSelectedUserActionItem(null))
              }}
            >
              {actingId ? "Processing..." : "Apply user action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
