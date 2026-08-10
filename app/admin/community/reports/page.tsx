"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle, Clock, Eye, Flag, XCircle } from "lucide-react"

import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatCard,
  AdminStatusBadge,
  getCommunityStatusTone,
} from "@/components/admin/community-admin-ui"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { fetchJson } from "@/lib/api-client"
import { getAuthToken } from "@/lib/auth-client"

type ReportItem = {
  id: string
  reason: string
  reasonLabel: string
  description: string
  status: "pending" | "resolved" | "dismissed"
  resolutionNote: string
  timeAgo: string
  reportedBy: { name: string; avatar?: string }
  author: { name: string; avatar?: string }
  targetType: string
  targetId: string
  targetPreview: string
  post: {
    id: string
    title: string
    status: string
  }
}

type ReportsResponse = {
  items: ReportItem[]
  stats: {
    total: number
    pending: number
    resolved: number
    dismissed: number
  }
}

type ReportAction = {
  status: "resolved" | "dismissed"
  postAction?: string
  userAction?: string
  label: string
  destructive?: boolean
}

const targetFilters = [
  { value: "all", label: "All targets" },
  { value: "post", label: "Post" },
  { value: "comment", label: "Comment" },
] as const

export default function AdminReportsPage() {
  const [items, setItems] = useState<ReportItem[]>([])
  const [stats, setStats] = useState<ReportsResponse["stats"] | null>(null)
  const [statusFilter, setStatusFilter] = useState("pending")
  const [targetFilter, setTargetFilter] = useState("all")
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null)
  const [pendingAction, setPendingAction] = useState<ReportAction | null>(null)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState("")

  const filteredItems = useMemo(() => {
    if (targetFilter === "all") return items
    return items.filter((item) => item.targetType === targetFilter)
  }, [items, targetFilter])

  const loadReports = async () => {
    const token = getAuthToken()
    if (!token) {
      setError("ไม่พบสิทธิ์แอดมิน กรุณาเข้าสู่ระบบใหม่")
      setLoading(false)
      return
    }

    const params = new URLSearchParams()
    if (statusFilter !== "all") params.set("status", statusFilter)

    setLoading(true)
    try {
      const response = await fetchJson<ReportsResponse>(`/admin/community/reports?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setItems(response.items)
      setStats(response.stats)
      setError("")
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "โหลดรายงานไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadReports()
  }, [statusFilter])

  async function submitAction() {
    const token = getAuthToken()
    if (!token || !selectedReport || !pendingAction || reason.trim().length < 6) return
    setActing(true)
    try {
      await fetchJson(`/admin/community/reports/${selectedReport.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status: pendingAction.status,
          resolutionNote: reason.trim(),
          postAction: pendingAction.postAction || "",
          userAction: pendingAction.userAction || "",
        }),
      })
      setPendingAction(null)
      setSelectedReport(null)
      setReason("")
      await loadReports()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "จัดการ report ไม่สำเร็จ")
    } finally {
      setActing(false)
    }
  }

  function startAction(action: ReportAction) {
    setReason("")
    setPendingAction(action)
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Report Center" description="ตรวจ report, target content และ user context ในหน้าจอเดียวก่อนตัดสินใจ" />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total", value: stats?.total ?? 0, icon: Flag, tone: "info" as const },
          { label: "Open", value: stats?.pending ?? 0, icon: Clock, tone: "pending" as const },
          { label: "Resolved", value: stats?.resolved ?? 0, icon: CheckCircle, tone: "active" as const },
          { label: "Dismissed", value: stats?.dismissed ?? 0, icon: XCircle, tone: "muted" as const },
        ].map((item) => (
          <AdminStatCard key={item.label} label={item.label} value={loading ? "..." : item.value} icon={item.icon} tone={item.tone} />
        ))}
      </div>

      <AdminSectionCard title="Filters">
        <div className="grid gap-3 md:grid-cols-[220px_220px_1fr]">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Open</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <Select value={targetFilter} onValueChange={setTargetFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Target" />
            </SelectTrigger>
            <SelectContent>
              {targetFilters.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </AdminSectionCard>

      {error ? <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}

      <AdminSectionCard title="Reports" description={loading ? "กำลังโหลด..." : `${filteredItems.length} reports`}>
        {loading ? <div className="space-y-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-xl" />)}</div> : null}
        {!loading && filteredItems.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reason</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead>Target Author</TableHead>
                <TableHead>Target Type</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="min-w-[260px]">Preview</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((report) => (
                <TableRow key={report.id}>
                  <TableCell><AdminStatusBadge tone="pending">{report.reasonLabel}</AdminStatusBadge></TableCell>
                  <TableCell>{report.reportedBy.name}</TableCell>
                  <TableCell>{report.author.name}</TableCell>
                  <TableCell>{report.targetType}</TableCell>
                  <TableCell className="text-muted-foreground">{report.timeAgo}</TableCell>
                  <TableCell><AdminStatusBadge tone={getCommunityStatusTone(report.status)}>{report.status}</AdminStatusBadge></TableCell>
                  <TableCell className="max-w-[320px] whitespace-normal">
                    <p className="line-clamp-2 text-sm text-muted-foreground">{report.targetPreview}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setSelectedReport(report)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
        {!loading && !filteredItems.length ? <AdminEmptyState title="No open reports" description="ไม่มี report ตามตัวกรองที่เลือก" /> : null}
      </AdminSectionCard>

      <Dialog open={Boolean(selectedReport)} onOpenChange={(open) => {
        if (!open && !acting) {
          setSelectedReport(null)
          setPendingAction(null)
          setReason("")
        }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Review Report</DialogTitle>
            <DialogDescription>ดู report, target content และ user context ก่อนทำ action</DialogDescription>
          </DialogHeader>
          {selectedReport ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
              <div className="space-y-4">
                <div className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminStatusBadge tone="pending">{selectedReport.reasonLabel}</AdminStatusBadge>
                    <AdminStatusBadge tone={getCommunityStatusTone(selectedReport.status)}>{selectedReport.status}</AdminStatusBadge>
                    <AdminStatusBadge tone="info">{selectedReport.targetType}</AdminStatusBadge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">Report detail</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{selectedReport.description || "ไม่มีรายละเอียดเพิ่มเติม"}</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-medium">Target Content</p>
                  <p className="mt-2 font-semibold">{selectedReport.post.title}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{selectedReport.targetPreview}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <AdminStatusBadge tone={getCommunityStatusTone(selectedReport.post.status)}>{selectedReport.post.status}</AdminStatusBadge>
                    <AdminStatusBadge tone="muted">ID {selectedReport.targetId || selectedReport.post.id}</AdminStatusBadge>
                  </div>
                </div>
                {selectedReport.resolutionNote ? (
                  <div className="rounded-xl border border-border p-4 text-sm">
                    <p className="font-medium">Resolution note</p>
                    <p className="mt-1 text-muted-foreground">{selectedReport.resolutionNote}</p>
                  </div>
                ) : null}
              </div>
              <div className="space-y-4">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-medium">Reporter</p>
                  <div className="mt-3 flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={selectedReport.reportedBy.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{selectedReport.reportedBy.name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{selectedReport.reportedBy.name}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-medium">Target Author</p>
                  <div className="mt-3 flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={selectedReport.author.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{selectedReport.author.name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{selectedReport.author.name}</span>
                  </div>
                </div>
                {selectedReport.status === "pending" ? (
                  <div className="space-y-2">
                    <Button className="w-full justify-start" onClick={() => startAction({ status: "resolved", postAction: "hide", label: "Resolve and Hide", destructive: true })}>Resolve and Hide</Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => startAction({ status: "resolved", postAction: "publish", label: "Resolve and Approve" })}>Resolve and Approve</Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => startAction({ status: "dismissed", label: "Dismiss Report" })}>Dismiss Report</Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => startAction({ status: "resolved", userAction: "warn", label: "Resolve and Warn User" })}>Warn User</Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => startAction({ status: "resolved", userAction: "restrict", label: "Resolve and Restrict User" })}>Restrict User</Button>
                    <Button className="w-full justify-start" variant="destructive" onClick={() => startAction({ status: "resolved", userAction: "ban", label: "Resolve and Ban User", destructive: true })}>Ban User</Button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          {pendingAction ? (
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <label className="text-sm font-medium" htmlFor="report-resolution-note">Reason *</label>
              <Textarea id="report-resolution-note" value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-24" />
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" disabled={acting} onClick={() => {
              setSelectedReport(null)
              setPendingAction(null)
              setReason("")
            }}>Close</Button>
            {pendingAction ? (
              <Button variant={pendingAction.destructive ? "destructive" : "default"} disabled={acting || reason.trim().length < 6} onClick={() => void submitAction()}>
                {acting ? "Processing..." : pendingAction.label}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
