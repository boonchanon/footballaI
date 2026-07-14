"use client"

import { useEffect, useState } from "react"
import { CheckCircle, Clock, Flag, MessageSquare, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchJson } from "@/lib/api-client"
import { getAuthToken } from "@/lib/auth-client"

type ReportItem = {
  id: string
  reasonLabel: string
  description: string
  status: "pending" | "resolved" | "dismissed"
  resolutionNote: string
  timeAgo: string
  reportedBy: { name: string }
  author: { name: string }
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

export default function AdminReportsPage() {
  const [items, setItems] = useState<ReportItem[]>([])
  const [stats, setStats] = useState<ReportsResponse["stats"] | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [actionNote, setActionNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

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

  const submitAction = async (id: string, status: "resolved" | "dismissed", postAction = "") => {
    const token = getAuthToken()
    if (!token) return

    await fetchJson(`/admin/community/reports/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        status,
        resolutionNote: actionNote,
        postAction,
      }),
    })
    setActionNote("")
    await loadReports()
  }

  const getStatusBadge = (status: ReportItem["status"]) => {
    if (status === "pending") return <Badge className="bg-amber-500/10 text-amber-400">รอตรวจสอบ</Badge>
    if (status === "resolved") return <Badge className="bg-emerald-500/10 text-emerald-400">ดำเนินการแล้ว</Badge>
    return <Badge className="bg-zinc-500/10 text-zinc-300">ยกเลิก</Badge>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">รายงานจากผู้ใช้</h1>
        <p className="text-muted-foreground">ดึงรายการแจ้งโพสต์จาก MongoDB และจัดการได้จริง</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "ทั้งหมด", value: stats?.total ?? 0, icon: Flag },
          { label: "รอตรวจสอบ", value: stats?.pending ?? 0, icon: Clock },
          { label: "ดำเนินการแล้ว", value: stats?.resolved ?? 0, icon: CheckCircle },
          { label: "ยกเลิก", value: stats?.dismissed ?? 0, icon: XCircle },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-3 p-5">
              <item.icon className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{loading ? "..." : item.value}</p>
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="กรองสถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              <SelectItem value="pending">รอตรวจสอบ</SelectItem>
              <SelectItem value="resolved">ดำเนินการแล้ว</SelectItem>
              <SelectItem value="dismissed">ยกเลิก</SelectItem>
            </SelectContent>
          </Select>
          <Input value={actionNote} onChange={(e) => setActionNote(e.target.value)} placeholder="บันทึกสำหรับการดำเนินการ (ใช้ร่วมกับทุกปุ่มด้านล่าง)" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>รายการรายงาน</CardTitle>
          <CardDescription>ตรวจสอบโพสต์ที่ถูกผู้ใช้แจ้งเข้ามา</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
          {loading
            ? Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-40 w-full" />)
            : items.map((report) => (
                <div key={report.id} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{report.reasonLabel}</Badge>
                        {getStatusBadge(report.status)}
                      </div>
                      <p className="text-lg font-semibold">{report.post.title}</p>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>ผู้รายงาน: {report.reportedBy.name}</p>
                        <p>เจ้าของโพสต์: {report.author.name}</p>
                        <p>เวลา: {report.timeAgo}</p>
                      </div>
                      <div className="rounded-xl bg-muted/50 p-3 text-sm">
                        <span className="font-medium">รายละเอียด: </span>
                        {report.description || "ไม่มีรายละเอียดเพิ่มเติม"}
                      </div>
                      {report.resolutionNote ? (
                        <div className="rounded-xl border border-border p-3 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">บันทึกการจัดการ: </span>
                          {report.resolutionNote}
                        </div>
                      ) : null}
                    </div>

                    {report.status === "pending" ? (
                      <div className="flex w-full flex-col gap-2 lg:w-56">
                        <Button onClick={() => submitAction(report.id, "resolved", "hide")}>ซ่อนโพสต์และปิดรายงาน</Button>
                        <Button variant="outline" onClick={() => submitAction(report.id, "resolved", "publish")}>
                          อนุมัติโพสต์และปิดรายงาน
                        </Button>
                        <Button variant="ghost" onClick={() => submitAction(report.id, "dismissed")}>
                          ยกเลิกรายงาน
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MessageSquare className="h-4 w-4" />
                        จัดการแล้ว
                      </div>
                    )}
                  </div>
                </div>
              ))}
          {!loading && items.length === 0 ? <p className="text-sm text-muted-foreground">ไม่พบรายงานตามสถานะที่เลือก</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}
