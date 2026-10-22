"use client"

import { ChangeEvent, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AlertCircle, Check, Cpu, ExternalLink, FileText, FileVideo, Loader2, RotateCcw, Sparkles, Upload, Video } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ANALYSIS_QUALITY_PRESETS,
  type AnalysisQuality,
  buildHeatmapJobFormData,
  coveredVideoSeconds,
  describeProgress,
  estimateAnalysisSeconds,
  type JobProgress,
  formatDurationThai,
  getHeatmapQuality,
  getHeatmapResultView,
} from "@/lib/heatmap-analysis"
import { HeatmapPublishingWorkspace } from "@/components/admin/heatmap-publishing-workspace"

type JobStatus = "queued" | "running" | "complete" | "failed"
type Job = { id: string; status: JobStatus; progress?: JobProgress; phase?: string; detail?: string; error_detail?: string; result?: string; review?: string; log?: string; metadata?: Record<string, unknown>; quality_summary?: Record<string, unknown>; total_frames?: number; valid_gameplay_frames?: number; invalid_scenes?: number; fresh_valid_calibration_frames?: number; usable_heatmap_records?: number }
type UiState = "idle" | "uploading" | "processing" | "complete" | "error"

// Keep browser requests same-origin. The route proxy uses VIDEO_ANALYSIS_API_BASE_URL
// server-side, so an admin browser never needs a service running on 127.0.0.1:8001.
const API_BASE_URL = "/api/video-analysis"
const MAX_ANALYSIS_FRAMES = 15000
const LAST_JOB_KEY = "videoAnalysis:lastJobId"

// The current job lives in the URL (?job=) and localStorage so a refresh can reopen it.
function rememberJob(jobId: string) {
  try { window.localStorage.setItem(LAST_JOB_KEY, jobId) } catch {}
  window.history.replaceState(null, "", `${window.location.pathname}?job=${encodeURIComponent(jobId)}`)
}

function forgetJob() {
  try { window.localStorage.removeItem(LAST_JOB_KEY) } catch {}
  window.history.replaceState(null, "", window.location.pathname)
}

function assetUrl(path?: string) {
  if (!path) return undefined
  return /^https?:\/\//i.test(path) ? path : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
}

async function readJsonBody(response: Response) {
  const text = await response.text()
  if (!text.trim()) return null
  try { return JSON.parse(text) as { id?: string; detail?: string; error_detail?: string } }
  catch { return null }
}

export default function AdminHeatmapPage() {
  const [file, setFile] = useState<File | null>(null)
  const [stage, setStage] = useState("mvp")
  const [device, setDevice] = useState("auto")
  const [frames, setFrames] = useState("250")
  const [analysisQuality, setAnalysisQuality] = useState<AnalysisQuality>("high")
  const preset = ANALYSIS_QUALITY_PRESETS[analysisQuality]
  const frameCount = Number(frames)
  // Every-frame coverage depends on the clip's frame rate, so show the common 25 and 50 fps cases.
  const coverage = !(frameCount > 0)
    ? ""
    : preset.sampleFps > 0
      ? `ครอบคลุมคลิปประมาณ ${formatDurationThai(coveredVideoSeconds(frameCount, preset.sampleFps))}`
      : `ครอบคลุมคลิปประมาณ ${formatDurationThai(coveredVideoSeconds(frameCount, 0, 25))} (25 fps) หรือ ${formatDurationThai(coveredVideoSeconds(frameCount, 0, 50))} (50 fps)`
  const [startSeconds, setStartSeconds] = useState("0")
  const [job, setJob] = useState<Job | null>(null)
  const [state, setState] = useState<UiState>("idle")
  const [error, setError] = useState("")
  const pollFailures = useRef(0)

  useEffect(() => {
    void fetch(`${API_BASE_URL}/healthz`).catch(() => undefined)
  }, [])

  useEffect(() => {
    let savedJobId = ""
    try { savedJobId = window.localStorage.getItem(LAST_JOB_KEY) || "" } catch {}
    const jobId = new URLSearchParams(window.location.search).get("job") || savedJobId
    if (!jobId) return

    let cancelled = false
    void (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" })
        if (response.status === 404) { forgetJob(); return }
        const restored = (await response.json()) as Job
        if (!response.ok || cancelled) return
        rememberJob(jobId)
        setJob(restored)
        if (restored.status === "complete") setState("complete")
        else if (restored.status === "failed") {
          setError(restored.error_detail || restored.detail || "Video analysis failed")
          setState("error")
        } else setState("processing")
      } catch {
        // Analysis service offline: keep the page usable for a new upload.
      }
    })()
    return () => { cancelled = true }
  }, [])

  const isBusy = state === "uploading" || state === "processing"
  const quality = getHeatmapQuality(
  job?.quality_summary ??
  job?.metadata ??
  (job
    ? {
        total_frames: job.total_frames,
        valid_gameplay_frames: job.valid_gameplay_frames,
        invalid_scenes: job.invalid_scenes,
        fresh_valid_calibration_frames: job.fresh_valid_calibration_frames,
        usable_heatmap_records: job.usable_heatmap_records,
      }
    : undefined)
)
  const resultView = getHeatmapResultView(quality)

  useEffect(() => {
    if (!job?.id || state !== "processing") return

    let cancelled = false
    const poll = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/jobs/${job.id}`, { cache: "no-store" })
        const next = (await response.json()) as Job
        if (!response.ok) throw new Error(next.error_detail || `Heatmap API returned ${response.status}`)
        if (cancelled) return
        pollFailures.current = 0
        setJob(next)
        if (next.status === "complete") setState("complete")
        if (next.status === "failed") {
          setError(next.error_detail || "Video analysis failed")
          setState("error")
        }
      } catch (cause) {
        pollFailures.current += 1
        if (pollFailures.current >= 5 && !cancelled) {
          setError(cause instanceof Error ? cause.message : "Could not reach the Heatmap API")
          setState("error")
        }
      }
    }

    void poll()
    const timer = window.setInterval(() => void poll(), 1500)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [job?.id, state])

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0]
    if (!next) return
    if (!/\.(mp4|mov|avi|mkv)$/i.test(next.name)) {
      setError("Only MP4, MOV, AVI, and MKV files are supported")
      setState("error")
      return
    }
    setFile(next)
    forgetJob()
    setJob(null)
    setError("")
    setState("idle")
  }

  async function startJob() {
    if (!file || isBusy) return
    const maxFrames = Number(frames)
    const selectedStartSeconds = Number(startSeconds)
    if (!Number.isInteger(maxFrames) || maxFrames < 1 || maxFrames > MAX_ANALYSIS_FRAMES) {
      setError(`Max frames must be an integer between 1 and ${MAX_ANALYSIS_FRAMES}`)
      setState("error")
      return
    }

    if (!Number.isFinite(selectedStartSeconds) || selectedStartSeconds < 0) {
      setError("ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â£ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â´ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â´ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â£ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â°ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â«ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¦Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂºÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¹Ã¢â‚¬Â  0 ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â´ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬ÂÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚ÂµÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¶ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚Âº")
      setState("error")
      return
    }

    setState("uploading")
    setError("")
    setJob(null)
    const body = buildHeatmapJobFormData(file, {
      stage,
      device,
      maxFrames,
      startSeconds: selectedStartSeconds,
      sampleFps: preset.sampleFps,
      maxWidth: preset.maxWidth,
      quality: analysisQuality,
    })

    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs`, { method: "POST", body })
      const created = await readJsonBody(response)
      if (response.status === 413) throw new Error("ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€¦Ã‚Â¸ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¦Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â´ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚ÂµÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â«ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â´ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬ÂÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚ÂµÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â£ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â°ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â£ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â£ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â±ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€¦Ã‚Â¡")
      if (!response.ok) throw new Error(created?.error_detail || created?.detail || "ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â£ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â·ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â£ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â´ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â£ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â´ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â£ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â°ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â«ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¦Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â´ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚ÂµÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°")
      if (!created?.id) throw new Error("ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â£ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â·ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â£ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â´ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â£ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â´ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â£ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â°ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â«ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¦Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â´ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚ÂµÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°")
      rememberJob(created.id)
      setJob({ id: created.id, status: "queued", phase: "Queued", detail: "Job was submitted to the Heatmap API" })
      setState("processing")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Video upload failed")
      setState("error")
    }
  }

  function retry() { forgetJob(); setJob(null); setError(""); setState("idle") }
  const phase = state === "uploading" ? "Uploading video" : job?.phase || "Starting analysis"
  const hasHeatmap = resultView === "ready" && Boolean(job?.result)

  return <div className="mx-auto max-w-7xl space-y-6 pb-10">
    <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 flex items-center gap-2 text-sm text-primary"><Sparkles className="h-4 w-4" />AI MATCH INTELLIGENCE</div><h1 className="text-3xl font-bold tracking-tight">Video Analysis</h1><p className="mt-1 text-muted-foreground">Upload a match video to generate player tracking and a heatmap automatically.</p><Link href="/admin/heatmap/videos" className="mt-2 inline-block text-sm text-primary hover:underline">ดูคลังวิดีโอที่วิเคราะห์ไว้</Link></div>{state === "complete" && <Badge className="w-fit bg-emerald-500/15 px-3 py-1.5 text-emerald-600 hover:bg-emerald-500/15"><Check className="mr-1.5 h-4 w-4" />Analysis complete</Badge>}</div>

    <Card className="overflow-hidden border-primary/20"><CardHeader className="border-b bg-muted/20"><CardTitle className="flex items-center gap-2"><Video className="h-5 w-5 text-primary" />Analysis settings</CardTitle><CardDescription>Send a video directly to the configured Heatmap API.</CardDescription></CardHeader><CardContent className="grid gap-6 p-6 lg:grid-cols-[1.25fr_.75fr]">
      <label className={`flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${file ? "border-primary bg-primary/5" : "border-border hover:border-primary/60"}`}><input type="file" accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,.mkv" onChange={chooseFile} className="sr-only" disabled={isBusy} />{file ? <><FileVideo className="mb-3 h-7 w-7 text-primary" /><p className="max-w-full truncate font-semibold">{file.name}</p><p className="mt-1 text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p></> : <><Upload className="mb-3 h-7 w-7 text-muted-foreground" /><p className="font-semibold">Choose a video file</p><p className="mt-1 text-sm text-muted-foreground">MP4, MOV, AVI, MKV</p></>}</label>
      <div className="grid content-center gap-4 sm:grid-cols-2 lg:grid-cols-1"><div className="space-y-2"><Label>Stage</Label><Select value={stage} onValueChange={setStage} disabled={isBusy}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mvp">MVP</SelectItem><SelectItem value="calibrate">Calibrate</SelectItem><SelectItem value="full">Full</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Device</Label><Select value={device} onValueChange={setDevice} disabled={isBusy}><SelectTrigger><Cpu className="mr-2 h-4 w-4 text-muted-foreground" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto">Auto</SelectItem><SelectItem value="cpu">CPU</SelectItem><SelectItem value="cuda">CUDA</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="start-seconds">Start analysis time (seconds)</Label><Input id="start-seconds" type="number" min="0" step="0.1" value={startSeconds} onChange={(event) => setStartSeconds(event.target.value)} disabled={isBusy} /><p className="text-xs text-muted-foreground">Skip ads, intro, replay, or close-up footage.</p></div><div className="space-y-2"><Label htmlFor="max-frames">Frames to analyze</Label><Input id="max-frames" type="number" min="1" max={MAX_ANALYSIS_FRAMES} value={frames} onChange={(event) => setFrames(event.target.value)} disabled={isBusy} /><p className="text-xs text-muted-foreground">สูงสุด {MAX_ANALYSIS_FRAMES.toLocaleString()} เฟรม{coverage ? ` · ${coverage}` : ""}</p></div><div className="space-y-2 sm:col-span-2 lg:col-span-1"><Label>คุณภาพการวิเคราะห์</Label><Select value={analysisQuality} onValueChange={(value) => setAnalysisQuality(value as AnalysisQuality)} disabled={isBusy}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(ANALYSIS_QUALITY_PRESETS) as AnalysisQuality[]).map((key) => <SelectItem key={key} value={key}>{ANALYSIS_QUALITY_PRESETS[key].label}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">{preset.description}</p>{frameCount > 0 && <p className="text-xs font-medium text-foreground">ใช้เวลาประมาณ {formatDurationThai(estimateAnalysisSeconds(analysisQuality, frameCount))}</p>}</div></div>
      <div className="flex items-center gap-3 lg:col-span-2"><Button size="lg" onClick={startJob} disabled={!file || isBusy} className="min-w-52">{isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Upload and start</Button></div>
    </CardContent></Card>

    {isBusy && <Card className="border-primary/30"><CardContent className="p-6"><div className="flex gap-3"><Loader2 className="mt-0.5 h-5 w-5 animate-spin text-primary" /><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><p className="font-semibold">{phase}</p><Badge variant="secondary">{job?.status || "uploading"}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{describeProgress(job?.progress) || job?.detail || "Sending video to the analysis service"}</p><div className="mt-4 flex items-center gap-3"><Progress value={state === "uploading" ? 2 : job?.progress?.percent ?? 0} className="h-2 flex-1" /><span className="w-14 text-right font-semibold tabular-nums text-primary">{state === "uploading" ? "อัปโหลด" : `${Math.floor(job?.progress?.percent ?? 0)}%`}</span></div><p className="mt-3 text-xs text-muted-foreground">อัปเดตทุก 1.5 วินาที · ปิดหน้านี้ได้ งานจะทำต่อและกลับมาดูได้ที่คลังวิดีโอ</p></div></div></CardContent></Card>}

    {state === "error" && <Card className="border-destructive/40 bg-destructive/[.03]"><CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><AlertCircle className="mt-0.5 h-5 w-5 text-destructive" /><div><p className="font-semibold">Video analysis could not be completed</p><p className="text-sm text-muted-foreground">{error}</p>{job?.log && <a className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline" href={assetUrl(job.log)} target="_blank" rel="noreferrer"><FileText className="h-4 w-4" />Open log</a>}</div></div><Button variant="outline" onClick={retry}><RotateCcw className="mr-2 h-4 w-4" />Try again</Button></CardContent></Card>}

    {false && state === "complete" && job && <section className="space-y-6"><div className="grid gap-6 2xl:grid-cols-[1fr_.72fr]"><Card className="overflow-hidden"><CardHeader className="flex-row items-center justify-between space-y-0 border-b"><div><CardTitle>Tracking review</CardTitle><CardDescription>{job.detail || "Review video generated by the analysis service"}</CardDescription></div><Badge variant="secondary">complete</Badge></CardHeader><CardContent className="p-0"><div className="aspect-video bg-slate-950">{job.review ? <video src={assetUrl(job.review)} controls className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-sm text-slate-300">No review video was returned.</div>}</div>{job.review && <div className="flex justify-end p-4"><Button variant="outline" size="sm" asChild><a href={assetUrl(job.review)} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open review video</a></Button></div>}</CardContent></Card><Card className="border-primary/20 bg-gradient-to-br from-primary/[.06] via-background to-background"><CardHeader><CardTitle>Analysis summary</CardTitle><CardDescription>Job {job.id}</CardDescription></CardHeader><CardContent className="space-y-3 text-sm"><div className="rounded-lg border bg-background/70 p-3"><p className="text-muted-foreground">Stage</p><p className="mt-1 font-medium capitalize">{stage}</p></div><div className="rounded-lg border bg-background/70 p-3"><p className="text-muted-foreground">Processing device</p><p className="mt-1 font-medium uppercase">{device}</p></div><div className="rounded-lg border bg-background/70 p-3"><p className="text-muted-foreground">Max frames</p><p className="mt-1 font-medium">{frames}</p></div><div className="rounded-lg border bg-background/70 p-3"><p className="text-muted-foreground">Total / valid gameplay / invalid scenes</p><p className="mt-1 font-medium">{quality.totalFrames ?? "ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â"} / {quality.validGameplayFrames ?? "ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â"} / {quality.invalidScenes ?? "ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â"}</p></div><div className="rounded-lg border bg-background/70 p-3"><p className="text-muted-foreground">Fresh calibration / usable records</p><p className="mt-1 font-medium">{quality.freshValidCalibrationFrames ?? "ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â"} / {quality.usableHeatmapRecords ?? "ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â"}</p></div></CardContent></Card></div><Card className="overflow-hidden border-primary/25 shadow-sm"><CardHeader className="border-b bg-muted/30"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Heatmap</CardTitle><CardDescription>Interactive movement map for job {job.id}</CardDescription></div>{hasHeatmap && <Button variant="outline" size="sm" asChild><a href={assetUrl(job.result)} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open full screen</a></Button>}</div></CardHeader><CardContent className="bg-muted/10 p-2 sm:p-4">{hasHeatmap ? <div className="overflow-hidden rounded-xl border bg-background shadow-inner"><iframe title="Heatmap result" src={assetUrl(job.result)} className="h-[680px] w-full bg-background sm:h-[760px]" /></div> : <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center"><AlertCircle className="mb-3 h-6 w-6 text-amber-500" /><p className="font-medium">ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚ÂªÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬ÂÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚ÂµÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¹Ã¢â‚¬Â  calibrate ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€¦Ã‚Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬ÂÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚ÂµÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â·ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â</p><p className="mt-1 text-sm text-muted-foreground">ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â´ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â£ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â´ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â´ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â£ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â°ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â«ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¦Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â·ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â©ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â²/intro ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â«ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â£ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â·ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â´ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â£ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â°ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â°ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â§ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â´ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â£ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â²ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â°ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â«ÃƒÆ’Ã‚Â Ãƒâ€šÃ‚Â¹Ãƒâ€¦Ã¢â‚¬â„¢</p></div>}</CardContent></Card></section>}
    {job?.status === "complete" && <HeatmapPublishingWorkspace jobId={job.id} review={assetUrl(job.review)} result={hasHeatmap ? assetUrl(job.result) : undefined} jobStatus={job.status} />}
  </div>
}
