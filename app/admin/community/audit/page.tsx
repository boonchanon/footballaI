"use client"

import { Fragment, useEffect, useState } from "react"
import { ChevronDown, RefreshCw, Search } from "lucide-react"

import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPagination,
  AdminSectionCard,
  AdminStatusBadge,
  getCommunityStatusTone,
} from "@/components/admin/community-admin-ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fetchJson } from "@/lib/api-client"
import { cn } from "@/lib/utils"

type AuditItem = {
  id: string
  action: string
  contentType: string
  contentId: string
  status: string
  reasons: string[]
  metadata: Record<string, unknown>
  admin: { email: string; role: string } | null
  targetUser: { name: string; email: string } | null
  createdAt: string
}

type AuditResponse = {
  items: AuditItem[]
  pagination: { page: number; totalPages: number; total: number }
}

function formatAction(action: string) {
  return action.replace(/^user_/, "").replace(/^content_/, "").replace(/^story_/, "").toUpperCase()
}

function summarizeMetadata(metadata: Record<string, unknown>) {
  const keys = ["reason", "duration", "matchId", "roomType", "actorRole"]
  return keys
    .map((key) => [key, metadata[key]])
    .filter(([, value]) => value !== undefined && value !== null && String(value) !== "")
}

export default function AdminCommunityAuditPage() {
  const [items, setItems] = useState<AuditItem[]>([])
  const [action, setAction] = useState("")
  const [actor, setActor] = useState("")
  const [targetUser, setTargetUser] = useState("")
  const [contentType, setContentType] = useState("")
  const [date, setDate] = useState("")
  const [expandedId, setExpandedId] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" })
      if (action.trim()) params.set("action", action.trim())
      if (actor.trim()) params.set("actor", actor.trim())
      if (targetUser.trim()) params.set("targetUser", targetUser.trim())
      if (contentType) params.set("contentType", contentType)
      if (date) params.set("date", date)
      const response = await fetchJson<AuditResponse>(`/admin/community/audit?${params.toString()}`)
      setItems(response.items)
      setTotalPages(response.pagination.totalPages)
      setError("")
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลด audit log ไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [page, contentType])

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Community Audit Log"
        description="อ่านย้อนหลังว่าใครทำ action อะไรกับ user/content พร้อมเหตุผลและผลลัพธ์"
        action={<Button variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>}
      />

      <AdminSectionCard title="Filters">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_180px_180px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={action} onChange={(event) => setAction(event.target.value)} placeholder="Action" className="pl-9" />
          </div>
          <Input value={actor} onChange={(event) => setActor(event.target.value)} placeholder="Admin email" />
          <Input value={targetUser} onChange={(event) => setTargetUser(event.target.value)} placeholder="Target user id" />
          <Select value={contentType || "all"} onValueChange={(value) => {
            setContentType(value === "all" ? "" : value)
            setPage(1)
          }}>
            <SelectTrigger><SelectValue placeholder="Target type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="post">Post</SelectItem>
              <SelectItem value="comment">Comment</SelectItem>
              <SelectItem value="story">Story</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="room_message">Room message</SelectItem>
              <SelectItem value="thread_root">Thread</SelectItem>
              <SelectItem value="match_poll">Poll</SelectItem>
            </SelectContent>
          </Select>
          <Input value={date} type="date" onChange={(event) => setDate(event.target.value)} />
          <Button onClick={() => {
            setPage(1)
            void load()
          }}>Search</Button>
        </div>
      </AdminSectionCard>

      {error ? <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}

      <AdminSectionCard title="Logs" description={loading ? "กำลังโหลด..." : `${items.length} audit events`}>
        {loading ? <div className="space-y-3">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-xl" />)}</div> : null}
        {!loading && items.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="text-right">Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const metadataSummary = summarizeMetadata(item.metadata || {})
                const expanded = expandedId === item.id
                return (
                  <Fragment key={item.id}>
                    <TableRow key={item.id} className="cursor-pointer" onClick={() => setExpandedId(expanded ? "" : item.id)}>
                      <TableCell className="text-muted-foreground">{new Date(item.createdAt).toLocaleString("th-TH")}</TableCell>
                      <TableCell>{item.admin?.email || "system"}{item.admin?.role ? <span className="ml-1 text-xs text-muted-foreground">({item.admin.role})</span> : null}</TableCell>
                      <TableCell><AdminStatusBadge tone={getCommunityStatusTone(item.action)}>{formatAction(item.action)}</AdminStatusBadge></TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{item.targetUser?.name || item.contentType}</p>
                          <p className="text-xs text-muted-foreground">{item.contentId}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[260px] whitespace-normal">
                        <p className="line-clamp-2 text-sm text-muted-foreground">{String(item.metadata?.reason || item.reasons.join(", ") || "-")}</p>
                      </TableCell>
                      <TableCell><AdminStatusBadge tone={getCommunityStatusTone(item.status)}>{item.status}</AdminStatusBadge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" aria-label="Toggle metadata" className="gap-2">
                          Details
                          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expanded ? (
                      <TableRow key={`${item.id}-metadata`}>
                        <TableCell colSpan={7} className="whitespace-normal bg-muted/20">
                          <div className="grid gap-3 md:grid-cols-2">
                            {metadataSummary.length ? metadataSummary.map(([key, value]) => (
                              <div key={String(key)} className="rounded-lg border border-border bg-background/50 p-3 text-sm">
                                <p className="font-medium">{String(key)}</p>
                                <p className="mt-1 break-words text-muted-foreground">{String(value)}</p>
                              </div>
                            )) : <p className="text-sm text-muted-foreground">No metadata summary</p>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        ) : null}
        {!loading && !items.length ? <AdminEmptyState title="No audit events" description="ไม่พบ audit log ตามตัวกรอง" /> : null}
      </AdminSectionCard>

      <AdminPagination page={page} totalPages={totalPages} loading={loading} onPageChange={setPage} />
    </div>
  )
}
