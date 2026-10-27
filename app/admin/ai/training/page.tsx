"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Brain, Loader2, Play, RefreshCw } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import {
  fetchAdminAiJob,
  fetchAdminAiJobs,
  fetchAdminAiSummary,
  startModelTraining,
  type AdminAiJob,
  type AdminAiStatusSummary,
} from "../admin-ai-client"
import {
  describeEvaluation,
  describeJobStep,
  formatDuration,
  formatNumber,
  formatThaiDateTime,
  JobStatusBadge,
  LoadingPanel,
  ModelReportTable,
  StateMessage,
} from "../admin-ai-sections"

function isActive(job: AdminAiJob | null) {
  return job != null && (job.status === "queued" || job.status === "running")
}

type TrainResult = {
  total_matches?: number
  latest_season?: string
  report?: { best_model?: string; models?: Array<{ key: string; label: string; accuracy: number }> }
}

function bestOf(job: AdminAiJob) {
  const result = (job.result || {}) as TrainResult
  const best = result.report?.models?.find((model) => model.key === result.report?.best_model)
  return best ? `${best.label} ${best.accuracy.toFixed(3)}` : "-"
}

export default function AITrainingPage() {
  const [summary, setSummary] = useState<{ loading: boolean; error: string; data: AdminAiStatusSummary | null }>({ loading: true, error: "", data: null })
  const [jobs, setJobs] = useState<AdminAiJob[]>([])
  const [activeJob, setActiveJob] = useState<AdminAiJob | null>(null)
  const [jobsError, setJobsError] = useState("")
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [lastFinished, setLastFinished] = useState<AdminAiJob | null>(null)

  const loadSummary = async () => {
    setSummary((prev) => ({ ...prev, loading: true, error: "" }))
    try {
      setSummary({ loading: false, error: "", data: await fetchAdminAiSummary() })
    } catch (error) {
      setSummary({ loading: false, error: error instanceof Error ? error.message : "โหลดผลประเมินไม่สำเร็จ", data: null })
    }
  }

  const loadJobs = async () => {
    try {
      const data = await fetchAdminAiJobs("train")
      setJobs(data.jobs)
      setActiveJob(data.activeJob)
      setJobsError("")
    } catch (error) {
      setJobsError(error instanceof Error ? error.message : "โหลดประวัติการฝึกไม่สำเร็จ")
    }
  }

  useEffect(() => {
    void loadSummary()
    void loadJobs()
  }, [])

  // While a job runs (training or another job that blocks training), poll it until it ends.
  const activeId = isActive(activeJob) ? activeJob?.id : null
  useEffect(() => {
    if (!activeId) return
    const timer = window.setInterval(async () => {
      try {
        const next = await fetchAdminAiJob(activeId)
        setActiveJob(next)
        if (!isActive(next)) {
          if (next.kind === "train") setLastFinished(next)
          void loadJobs()
          void loadSummary()
        }
      } catch {
        // Keep polling through a transient network error.
      }
    }, 3000)
    return () => window.clearInterval(timer)
  }, [activeId])

  const handleStart = async () => {
    setConfirmOpen(false)
    setStarting(true)
    setStartError("")
    setLastFinished(null)
    try {
      setActiveJob(await startModelTraining())
    } catch (error) {
      setStartError(error instanceof Error ? error.message : "เริ่มฝึกแบบจำลองไม่สำเร็จ")
      void loadJobs()
    } finally {
      setStarting(false)
    }
  }

  const running = isActive(activeJob)
  const blockedByOther = running && activeJob?.kind !== "train"

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">ฝึกแบบจำลอง</h1>
          <p className="text-muted-foreground">ฝึก CatBoost, XGBoost, Poisson และ Ensemble ใหม่จากไฟล์ผลการแข่งขันทั้งหมดในคลัง แล้วประเมินผลทุกแบบจำลอง</p>
        </div>
        <Button variant="outline" onClick={() => { void loadSummary(); void loadJobs() }} className="rounded-[14px] bg-transparent">
          <RefreshCw className="mr-2 h-4 w-4" />
          รีเฟรช
        </Button>
      </div>

      <Card className="rounded-[22px] border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Brain className="h-5 w-5 text-primary" />
            ฝึกแบบจำลองใหม่
          </CardTitle>
          <CardDescription>
            ขั้นตอน: ทำความสะอาดไฟล์ดิบทุกฤดูกาล → สร้างฟีเจอร์ → ฝึก CatBoost, XGBoost, Poisson และ Ensemble → ประเมินทุกแบบจำลองรวม Baseline และ Dixon-Coles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 rounded-[14px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              บน VM ของคณะ (ประมวลผลด้วย CPU ไม่มี GPU) การฝึกใช้เวลาหลายนาที ระหว่างนั้นเว็บและผลทำนายเดิมยังใช้งานได้ตามปกติ
              ไฟล์แบบจำลองเดิมจะถูกแทนที่เมื่อฝึกเสร็จ และสั่งงานซ้อนกันไม่ได้
            </span>
          </div>

          <Button onClick={() => setConfirmOpen(true)} disabled={starting || running} className="rounded-[14px]">
            {starting || running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            ฝึกแบบจำลองใหม่
          </Button>

          <StateMessage type="error" message={startError || jobsError} />
          {running && activeJob ? (
            <div className="space-y-2 rounded-[16px] border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-semibold text-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  {blockedByOther ? `มีงาน "${activeJob.label}" กำลังทำงาน ต้องรอให้เสร็จก่อน` : activeJob.status === "queued" ? "รอเริ่มงาน" : describeJobStep(activeJob.message)}
                </span>
                <span className="font-bold text-primary">{activeJob.progress}%</span>
              </div>
              <Progress value={activeJob.progress} />
              <p className="text-xs text-muted-foreground">
                สั่งโดย {activeJob.requestedBy} เมื่อ {formatThaiDateTime(activeJob.createdAt)} · ปิดหน้านี้ได้ งานจะทำต่อจนเสร็จ
              </p>
            </div>
          ) : null}
          {lastFinished?.status === "done" ? (
            <StateMessage type="success" message={`ฝึกและประเมินเสร็จใน ${formatDuration(lastFinished)} · แบบจำลองที่ดีที่สุด ${bestOf(lastFinished)}`} />
          ) : null}
          {lastFinished?.status === "failed" ? <StateMessage type="error" message={`ฝึกไม่สำเร็จ: ${lastFinished.error || "ไม่ทราบสาเหตุ"}`} /> : null}
        </CardContent>
      </Card>

      <Card className="rounded-[22px] border-border">
        <CardHeader>
          <CardTitle className="text-xl">ผลประเมินแบบจำลองปัจจุบัน</CardTitle>
          <CardDescription>{describeEvaluation(summary.data?.evaluationInfo)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {summary.loading && !summary.data ? (
            <LoadingPanel label="กำลังโหลดผลประเมิน" />
          ) : summary.data?.models.length ? (
            <ModelReportTable models={summary.data.models} />
          ) : (
            <StateMessage type="info" message="ยังไม่มีผลประเมิน กดฝึกแบบจำลองใหม่เพื่อสร้าง" />
          )}
          <StateMessage type="error" message={summary.error} />
          {summary.data ? (
            <p className="text-xs text-muted-foreground">
              ข้อมูลที่ใช้ฝึก: {formatNumber(summary.data.totalMatches)} นัด · {formatNumber(summary.data.seasonCount)} ฤดูกาล (ล่าสุด {summary.data.latestSeason}) ·
              ไฟล์ดิบ {formatNumber(summary.data.rawFileCount)} ไฟล์
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-[22px] border-border">
        <CardHeader>
          <CardTitle className="text-xl">ประวัติการฝึก</CardTitle>
          <CardDescription>ทุกครั้งที่สั่งฝึกแบบจำลองจากหน้านี้ เรียงล่าสุดก่อน</CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length ? (
            <div className="overflow-hidden rounded-[18px] border border-border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>เริ่มเมื่อ</TableHead>
                      <TableHead>ใช้เวลา</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>ผู้สั่ง</TableHead>
                      <TableHead className="text-right">แมตช์ที่ใช้ฝึก</TableHead>
                      <TableHead>แบบจำลองที่ดีที่สุด (Accuracy)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium text-foreground">{formatThaiDateTime(job.createdAt)}</TableCell>
                        <TableCell>{formatDuration(job)}</TableCell>
                        <TableCell>
                          <JobStatusBadge status={job.status} />
                          {job.error ? <p className="mt-1 max-w-[280px] text-xs text-destructive">{job.error}</p> : null}
                        </TableCell>
                        <TableCell>{job.requestedBy}</TableCell>
                        <TableCell className="text-right">{formatNumber(((job.result || {}) as TrainResult).total_matches)}</TableCell>
                        <TableCell>{job.status === "done" ? bestOf(job) : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-border bg-card/70 p-6 text-center text-sm text-muted-foreground">
              ยังไม่เคยสั่งฝึกแบบจำลองจากหน้านี้
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ฝึกแบบจำลองใหม่?</AlertDialogTitle>
            <AlertDialogDescription>
              ระบบจะฝึกจากไฟล์ผลการแข่งขันทั้งหมดในคลังและแทนที่ไฟล์แบบจำลองเดิม บน VM (CPU) ใช้เวลาหลายนาที
              ระหว่างนั้นสั่งอัปเดตผลรายสัปดาห์ไม่ได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleStart()}>เริ่มฝึก</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
