"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ExternalLink, FileVideo, Loader2, RefreshCw, Trash2 } from "lucide-react"

import { getAuthToken } from "@/lib/auth-client"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const API_BASE_URL = "/api/video-analysis"

type VideoJob = {
  id: string
  status: "queued" | "running" | "complete" | "failed"
  phase?: string
  detail?: string
  filename?: string
  size_bytes?: number
  stage?: string
  device?: string
  max_frames?: number
  frames_processed?: number
  start_seconds?: number
  created_at?: number
  started_at?: number
  finished_at?: number
  review?: string
  result?: string
  has_upload?: boolean
}

const STATUS_LABEL: Record<VideoJob["status"], string> = {
  queued: "รอคิว",
  running: "กำลังวิเคราะห์",
  complete: "เสร็จแล้ว",
  failed: "ไม่สำเร็จ",
}

const STATUS_CLASS: Record<VideoJob["status"], string> = {
  queued: "bg-muted text-muted-foreground",
  running: "bg-sky-500/15 text-sky-600",
  complete: "bg-emerald-500/15 text-emerald-600",
  failed: "bg-destructive/15 text-destructive",
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function formatDate(seconds?: number) {
  return seconds ? new Date(seconds * 1000).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "-"
}

function formatDuration(job: VideoJob) {
  if (!job.started_at) return "-"
  const end = job.finished_at ?? (job.status === "running" ? Date.now() / 1000 : undefined)
  if (!end) return "-"
  const minutes = Math.max(0, Math.round((end - job.started_at) / 60))
  return minutes >= 60 ? `${Math.floor(minutes / 60)} ชม. ${minutes % 60} นาที` : `${minutes} นาที`
}

function formatSize(bytes?: number) {
  if (!bytes) return ""
  return bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(2)} GB` : `${(bytes / 1024 ** 2).toFixed(0)} MB`
}

export default function VideoLibraryPage() {
  const [jobs, setJobs] = useState<VideoJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [pendingDelete, setPendingDelete] = useState<VideoJob | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    void loadJobs()
  }, [])

  async function loadJobs() {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs`, { cache: "no-store", headers: authHeaders() })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.error || `โหลดคลังวิดีโอไม่สำเร็จ (${response.status})`)
      setJobs(Array.isArray(body?.items) ? body.items : [])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ไม่สามารถเชื่อมต่อบริการวิเคราะห์วิดีโอได้")
    } finally {
      setLoading(false)
    }
  }

  async function deleteJob(job: VideoJob) {
    setDeleting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs/${encodeURIComponent(job.id)}`, { method: "DELETE", headers: authHeaders() })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.error || `ลบงานไม่สำเร็จ (${response.status})`)
      setJobs((current) => current.filter((item) => item.id !== job.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ลบงานไม่สำเร็จ")
    } finally {
      setDeleting(false)
      setPendingDelete(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <Link href="/admin/heatmap" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Video Analysis
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">คลังวิดีโอวิเคราะห์</h1>
          <p className="mt-1 text-muted-foreground">งานวิเคราะห์ทั้งหมดถูกเก็บไว้ เปิดกลับมาดูผลหรือสร้างฮีตแมปต่อได้โดยไม่ต้องอัปโหลดใหม่</p>
        </div>
        <Button variant="outline" onClick={() => void loadJobs()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          รีเฟรช
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {loading && !jobs.length ? (
        <div className="flex items-center gap-2 p-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />กำลังโหลด...</div>
      ) : !jobs.length && !error ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">ยังไม่มีวิดีโอที่วิเคราะห์ไว้</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileVideo className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate">{job.filename || "ไม่ทราบชื่อไฟล์"}</span>
                    </CardTitle>
                    <CardDescription className="mt-1">งาน {job.id} · {formatDate(job.created_at)}</CardDescription>
                  </div>
                  <Badge className={`shrink-0 hover:bg-transparent ${STATUS_CLASS[job.status] ?? ""}`}>{STATUS_LABEL[job.status] ?? job.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-muted-foreground">ตั้งค่า</dt><dd>{[job.stage, job.device].filter(Boolean).join(" · ") || "-"}</dd></div>
                  <div><dt className="text-muted-foreground">เฟรม</dt><dd>{job.frames_processed ?? job.max_frames ?? "-"}</dd></div>
                  <div><dt className="text-muted-foreground">ใช้เวลา</dt><dd>{formatDuration(job)}</dd></div>
                  <div><dt className="text-muted-foreground">ไฟล์</dt><dd>{formatSize(job.size_bytes) || (job.has_upload ? "เก็บไว้" : "-")}</dd></div>
                </dl>
                {job.status !== "complete" && job.detail ? <p className="text-xs text-muted-foreground">{job.phase ? `${job.phase}: ` : ""}{job.detail}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href={`/admin/heatmap?job=${encodeURIComponent(job.id)}`}>
                      {job.status === "complete" ? "เปิดผล / สร้างฮีตแมป" : "ดูสถานะ"}
                    </Link>
                  </Button>
                  {job.review ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={`${API_BASE_URL}${job.review}`} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />วิดีโอผลลัพธ์</a>
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-destructive hover:text-destructive"
                    disabled={job.status === "running" || job.status === "queued"}
                    onClick={() => setPendingDelete(job)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />ลบ
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบงานวิเคราะห์นี้?</AlertDialogTitle>
            <AlertDialogDescription>
              วิดีโอต้นฉบับ วิดีโอผลลัพธ์ และข้อมูลติดตามผู้เล่นของ {pendingDelete?.filename || pendingDelete?.id} จะถูกลบออกจากเครื่องวิเคราะห์ ฮีตแมปที่เผยแพร่ไปแล้วไม่ได้รับผลกระทบ
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault()
                if (pendingDelete) void deleteJob(pendingDelete)
              }}
            >
              {deleting ? "กำลังลบ..." : "ลบ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
