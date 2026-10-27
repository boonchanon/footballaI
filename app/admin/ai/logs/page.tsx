"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Eye, History, RefreshCw, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { fetchAdminAiJobs, type AdminAiJob } from "../admin-ai-client"
import { describeJobStep, formatDuration, formatNumber, formatThaiDateTime, JobStatusBadge, LoadingPanel, StateMessage } from "../admin-ai-sections"

const KIND_OPTIONS = [
  { value: "all", label: "งานทั้งหมด" },
  { value: "weekly_refresh", label: "อัปเดตผลทำนายรายสัปดาห์" },
  { value: "train", label: "ฝึกแบบจำลองใหม่" },
  { value: "upload", label: "อัปโหลดข้อมูลผลแข่ง" },
  { value: "delete_file", label: "ลบไฟล์ข้อมูลผลแข่ง" },
]

type JsonRecord = Record<string, any>

// One-line outcome of a job, read from the result each job kind stores.
function describeResult(job: AdminAiJob) {
  if (job.status === "failed") return job.error || "ไม่สำเร็จ"
  if (job.status !== "done") return describeJobStep(job.message)
  const result = (job.result || {}) as JsonRecord
  if (job.kind === "weekly_refresh") {
    return `ทำนายใหม่ ${formatNumber(result.Refreshed)} นัด · คงผลเดิม ${formatNumber(result.FrozenFromPrevious)} นัด · ผลแข่งถึง ${result.LastKnownResultDate || "-"}`
  }
  if (job.kind === "train") {
    const report = (result.report || {}) as JsonRecord
    const best = Array.isArray(report.models) ? report.models.find((model: JsonRecord) => model.key === report.best_model) : null
    return `ใช้ ${formatNumber(result.total_matches)} นัด · ดีที่สุด ${best ? `${best.label} ${Number(best.accuracy).toFixed(3)}` : "-"}`
  }
  return job.message || "-"
}

export default function AiJobLogsPage() {
  const [state, setState] = useState<{ loading: boolean; error: string; jobs: AdminAiJob[]; activeJob: AdminAiJob | null }>({
    loading: true,
    error: "",
    jobs: [],
    activeJob: null,
  })
  const [kind, setKind] = useState("all")
  const [status, setStatus] = useState("all")
  const [selected, setSelected] = useState<AdminAiJob | null>(null)

  const load = async () => {
    setState((prev) => ({ ...prev, loading: true, error: "" }))
    try {
      const data = await fetchAdminAiJobs()
      setState({ loading: false, error: "", jobs: data.jobs, activeJob: data.activeJob })
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: error instanceof Error ? error.message : "โหลดประวัติการทำงานไม่สำเร็จ" }))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  // Refresh every 5 s while something runs so its row ends in its final state.
  useEffect(() => {
    if (!state.activeJob) return
    const timer = window.setInterval(() => void load(), 5000)
    return () => window.clearInterval(timer)
  }, [state.activeJob?.id])

  const jobs = useMemo(
    () => state.jobs.filter((job) => (kind === "all" || job.kind === kind) && (status === "all" || job.status === status)),
    [state.jobs, kind, status],
  )
  const stats = useMemo(
    () => ({
      total: state.jobs.length,
      done: state.jobs.filter((job) => job.status === "done").length,
      failed: state.jobs.filter((job) => job.status === "failed").length,
      last: state.jobs[0] || null,
    }),
    [state.jobs],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">ประวัติการทำงาน</h1>
          <p className="text-muted-foreground">งานของระบบ AI ที่ผู้ดูแลสั่ง: อัปเดตผลรายสัปดาห์ ฝึกแบบจำลอง และอัปโหลด/ลบไฟล์ข้อมูล พร้อมเวลา ผล และผู้สั่ง</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={state.loading} className="rounded-[14px] bg-transparent">
          <RefreshCw className={`mr-2 h-4 w-4 ${state.loading ? "animate-spin" : ""}`} />
          รีเฟรช
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "งานทั้งหมด", value: formatNumber(stats.total), icon: History },
          { label: "สำเร็จ", value: formatNumber(stats.done), icon: CheckCircle2 },
          { label: "ไม่สำเร็จ", value: formatNumber(stats.failed), icon: XCircle },
          { label: "งานล่าสุด", value: stats.last ? formatThaiDateTime(stats.last.createdAt) : "-", icon: History },
        ].map((item) => (
          <Card key={item.label} className="rounded-[18px] border-border">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-xl font-bold text-foreground">{item.value}</p>
              </div>
              <item.icon className="h-7 w-7 text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-[22px] border-border">
        <CardHeader className="gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle className="text-xl">รายการงาน</CardTitle>
            <CardDescription>เก็บไว้ในไฟล์ ml/logs/jobs.json บนเครื่องที่รันระบบ เรียงล่าสุดก่อน</CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="w-full sm:w-[230px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="done">สำเร็จ</SelectItem>
                <SelectItem value="failed">ไม่สำเร็จ</SelectItem>
                <SelectItem value="running">กำลังทำงาน</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <StateMessage type="error" message={state.error} />
          {state.loading && !state.jobs.length ? (
            <LoadingPanel label="กำลังโหลดประวัติการทำงาน" />
          ) : jobs.length ? (
            <div className="overflow-hidden rounded-[18px] border border-border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="min-w-[150px]">เวลา</TableHead>
                      <TableHead>งาน</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>ผู้สั่ง</TableHead>
                      <TableHead>ใช้เวลา</TableHead>
                      <TableHead className="min-w-[280px]">ผล</TableHead>
                      <TableHead className="text-right">รายละเอียด</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium text-foreground">{formatThaiDateTime(job.createdAt)}</TableCell>
                        <TableCell>{job.label}</TableCell>
                        <TableCell>
                          <JobStatusBadge status={job.status} />
                        </TableCell>
                        <TableCell>{job.requestedBy}</TableCell>
                        <TableCell>{formatDuration(job)}</TableCell>
                        <TableCell className={job.status === "failed" ? "text-destructive" : "text-muted-foreground"}>{describeResult(job)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelected(job)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-border bg-card/70 p-6 text-center text-sm text-muted-foreground">
              ยังไม่มีงานตามเงื่อนไขที่เลือก
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.label}</DialogTitle>
                <DialogDescription>
                  รหัสงาน {selected.id} · สั่งโดย {selected.requestedBy}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted-foreground">เริ่ม</p>
                    <p className="font-medium">{formatThaiDateTime(selected.startedAt || selected.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">เสร็จ</p>
                    <p className="font-medium">{formatThaiDateTime(selected.finishedAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">สถานะ</p>
                    <JobStatusBadge status={selected.status} />
                  </div>
                  <div>
                    <p className="text-muted-foreground">ใช้เวลา</p>
                    <p className="font-medium">{formatDuration(selected)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">ผล</p>
                  <p className="font-medium">{describeResult(selected)}</p>
                </div>
                {selected.logTail.length ? (
                  <div>
                    <p className="text-muted-foreground">ข้อความท้ายสุดจากโปรแกรม</p>
                    <pre className="mt-1 max-h-60 overflow-auto rounded-[12px] bg-muted p-3 text-xs">{selected.logTail.join("\n")}</pre>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
