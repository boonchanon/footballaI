"use client"

import { useEffect, useState } from "react"
import { EyeOff, Pin, RefreshCw, Search, ShieldCheck, Trash2 } from "lucide-react"

import {
  AdminActionDialog,
  AdminEmptyState,
  AdminPageHeader,
  AdminPagination,
  AdminSectionCard,
  AdminStatusBadge,
  getCommunityStatusTone,
} from "@/components/admin/community-admin-ui"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fetchJson } from "@/lib/api-client"

type ContentKind = "posts" | "threads" | "polls" | "stories"

type ContentItem = {
  id: string
  title: string
  content: string
  contentType: string
  status: string
  moderationStatus: string
  isPinned?: boolean
  isOfficialThread?: boolean
  reportsCount?: number
  matchId?: string
  roomType?: string
  image?: string
  poll?: { totalVotes: number; options: Array<{ id: string; text: string; votes: number }> } | null
  author?: { name?: string; avatar?: string }
  timeAgo?: string
}

type ContentResponse = {
  items: ContentItem[]
  pagination: { page: number; totalPages: number; total: number }
}

type PendingAction = {
  item: ContentItem
  action: string
  label: string
  destructive?: boolean
} | null

const titles: Record<ContentKind, { title: string; description: string }> = {
  posts: { title: "Posts Admin", description: "จัดการ Community posts จากข้อมูลจริง" },
  threads: { title: "Thread Admin", description: "จัดการ Match/Community threads โดย reuse thread root เดิม" },
  polls: { title: "Poll Admin", description: "จัดการ polls ที่อยู่บน CommunityPost.poll" },
  stories: { title: "Story Admin", description: "จัดการ Community stories จาก CommunityStory เดิม" },
}

export function CommunityContentAdmin({ type }: { type: ContentKind }) {
  const [items, setItems] = useState<ContentItem[]>([])
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [reason, setReason] = useState("")
  const [acting, setActing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type, page: String(page), limit: "20" })
      if (query.trim()) params.set("q", query.trim())
      if (status !== "all") params.set("status", status)
      const response = await fetchJson<ContentResponse>(`/admin/community/content?${params.toString()}`)
      setItems(response.items)
      setTotalPages(response.pagination.totalPages)
      setError("")
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูลไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [type, status, page])

  async function runAction() {
    if (!pendingAction || reason.trim().length < 6) return
    setActing(true)
    try {
      await fetchJson(`/admin/community/content/${pendingAction.item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: pendingAction.action,
          type: pendingAction.item.contentType === "story" ? "story" : "post",
          reason: reason.trim(),
        }),
      })
      setPendingAction(null)
      setReason("")
      await load()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "ดำเนินการไม่สำเร็จ")
    } finally {
      setActing(false)
    }
  }

  function openAction(item: ContentItem, action: string, label: string, destructive = false) {
    setReason("")
    setPendingAction({ item, action, label, destructive })
  }

  const copy = titles[type]
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={copy.title}
        description={copy.description}
        action={<Button variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>}
      />

      <Card className="border-border/70 bg-card/80">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => {
              if (event.key === "Enter") {
                setPage(1)
                void load()
              }
            }} placeholder="Search..." className="pl-9" />
          </div>
          <Select value={status} onValueChange={(value) => {
            setStatus(value)
            setPage(1)
          }}>
            <SelectTrigger className="md:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="hidden">Hidden</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => {
            setPage(1)
            void load()
          }}>ค้นหา</Button>
        </CardContent>
      </Card>

      {error ? <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}

      <AdminSectionCard title="Content" description={loading ? "กำลังโหลด..." : `${items.length} items`}>
        {loading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-xl" />)}</div> : null}
        {!loading && items.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[320px]">Content</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Moderation</TableHead>
                <TableHead>Reports</TableHead>
                <TableHead>Context</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-normal">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{item.title || "Untitled"}</p>
                        {item.isPinned ? <Badge variant="outline"><Pin className="mr-1 h-3 w-3" />Pinned</Badge> : null}
                        {item.isOfficialThread ? <Badge variant="outline"><ShieldCheck className="mr-1 h-3 w-3" />Official</Badge> : null}
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{item.content || item.poll?.options?.map((option) => `${option.text}: ${option.votes}`).join(" / ") || "No preview"}</p>
                      <p className="text-xs text-muted-foreground">{item.author?.name || "ผู้ใช้งาน"} • {item.timeAgo || "-"}</p>
                    </div>
                  </TableCell>
                  <TableCell><AdminStatusBadge tone={getCommunityStatusTone(item.status)}>{item.status}</AdminStatusBadge></TableCell>
                  <TableCell><AdminStatusBadge tone={getCommunityStatusTone(item.moderationStatus)}>{item.moderationStatus}</AdminStatusBadge></TableCell>
                  <TableCell>{item.reportsCount || 0}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.matchId ? <p>Match {item.matchId}</p> : null}
                    {item.roomType ? <p>{item.roomType}</p> : null}
                    {item.poll ? <p>{item.poll.totalVotes} votes</p> : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openAction(item, item.status === "hidden" ? "unhide" : "hide", item.status === "hidden" ? "Unhide" : "Hide", item.status !== "hidden")}>
                        <EyeOff className="mr-2 h-4 w-4" />
                        {item.status === "hidden" ? "Unhide" : "Hide"}
                      </Button>
                      {type === "posts" || type === "threads" ? (
                        <Button size="sm" variant="outline" onClick={() => openAction(item, item.isPinned ? "unpin" : "pin", item.isPinned ? "Unpin" : "Pin")}>
                          <Pin className="mr-2 h-4 w-4" />
                          {item.isPinned ? "Unpin" : "Pin"}
                        </Button>
                      ) : null}
                      {type === "threads" ? (
                        <Button size="sm" variant="outline" onClick={() => openAction(item, item.isOfficialThread ? "unofficial" : "official", item.isOfficialThread ? "Remove official" : "Official")}>
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          {item.isOfficialThread ? "Official off" : "Official"}
                        </Button>
                      ) : null}
                      {(type === "posts" || type === "stories") ? (
                        <Button size="sm" variant="destructive" onClick={() => openAction(item, "delete", "Delete", true)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
        {!loading && !items.length ? <AdminEmptyState title="No content found" description="ไม่พบข้อมูลตามเงื่อนไข" /> : null}
      </AdminSectionCard>

      <AdminPagination page={page} totalPages={totalPages} loading={loading} onPageChange={setPage} />

      <AdminActionDialog
        open={Boolean(pendingAction)}
        title={`${pendingAction?.label || "Update"} Content`}
        description="Action นี้จะบันทึก reason ลง audit log ผ่าน route เดิม"
        reason={reason}
        destructive={pendingAction?.destructive}
        busy={acting}
        confirmLabel={pendingAction?.label || "Confirm"}
        impact={pendingAction?.item ? `${pendingAction.item.title || "Untitled"} (${pendingAction.item.contentType})` : undefined}
        onReasonChange={setReason}
        onCancel={() => {
          if (acting) return
          setPendingAction(null)
          setReason("")
        }}
        onConfirm={() => void runAction()}
      />
    </div>
  )
}
