export type HeatmapQualitySummary = {
  totalFrames?: number
  validGameplayFrames?: number
  invalidScenes?: number
  freshValidCalibrationFrames?: number
  usableHeatmapRecords?: number
}

export type HeatmapResultView = "ready" | "no-gameplay"

type JobMetadata = Record<string, unknown>

function numberValue(metadata: JobMetadata, ...keys: string[]) {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
  }
  return undefined
}

export function getHeatmapQuality(metadata?: JobMetadata): HeatmapQualitySummary {
  const source = metadata || {}
  return {
    totalFrames: numberValue(source, "total_frames", "totalFrames"),
    validGameplayFrames: numberValue(source, "valid_gameplay_frames", "validGameplayFrames"),
    invalidScenes: numberValue(source, "invalid_scenes", "invalidScenes"),
    freshValidCalibrationFrames: numberValue(source, "fresh_valid_calibration_frames", "freshValidCalibrationFrames"),
    usableHeatmapRecords: numberValue(source, "usable_heatmap_records", "usableHeatmapRecords"),
  }
}

export function getHeatmapResultView(quality: HeatmapQualitySummary): HeatmapResultView {
  return (quality.usableHeatmapRecords ?? 0) > 0 ? "ready" : "no-gameplay"
}

export type AnalysisQuality = "high" | "medium" | "fast"

export type JobProgress = {
  percent: number
  step?: string
  module?: string
  module_index?: number
  module_count?: number
}

const PROGRESS_STEP_LABELS: Record<string, string> = {
  starting: "กำลังเริ่มงาน",
  decode: "อ่านวิดีโอ",
  load_models: "โหลดโมเดล",
  review: "สร้างวิดีโอผลลัพธ์",
  heatmap: "สร้างฮีตแมป",
}

// e.g. "ตรวจจับและติดตามผู้เล่น ขั้น 2/5 (reid)"
export function describeProgress(progress?: JobProgress | null) {
  if (!progress) return ""
  if (progress.step === "inference") {
    const step = progress.module_count ? ` ขั้น ${(progress.module_index ?? 0) + 1}/${progress.module_count}` : ""
    return `ตรวจจับและติดตามผู้เล่น${step}${progress.module ? ` (${progress.module})` : ""}`
  }
  return PROGRESS_STEP_LABELS[progress.step ?? ""] ?? ""
}

// Measured on the analysis workstation (RTX 3050 Laptop), excluding the fixed per-job overhead:
// full resolution ~0.85 s/frame (1000 frames in 18.1 min), 1280 px ~0.77 s/frame. Used only for
// the time estimate shown before starting a job.
export const ANALYSIS_QUALITY_PRESETS: Record<
  AnalysisQuality,
  { label: string; description: string; sampleFps: number; maxWidth: number; secondsPerFrame: number }
> = {
  high: {
    label: "สูงสุด",
    description: "ทุกเฟรม ความละเอียดเต็ม · ID แม่นที่สุด เหมาะกับคลิปสั้น",
    sampleFps: 0,
    maxWidth: 0,
    secondsPerFrame: 0.9,
  },
  medium: {
    label: "ปานกลาง",
    description: "10 เฟรม/วินาที ความละเอียดเต็ม · สมดุลระหว่างคุณภาพกับเวลา",
    sampleFps: 10,
    maxWidth: 0,
    secondsPerFrame: 0.9,
  },
  fast: {
    label: "เร็ว",
    description: "5 เฟรม/วินาที 1280 px · เร็วที่สุด เหมาะกับคลิปยาว แต่ ID หลุดบ่อยกว่า",
    sampleFps: 5,
    maxWidth: 1280,
    secondsPerFrame: 0.8,
  },
}

// Model loading and decoding happen once per job regardless of length.
const JOB_OVERHEAD_SECONDS = 4 * 60

export function estimateAnalysisSeconds(quality: AnalysisQuality, frames: number) {
  return JOB_OVERHEAD_SECONDS + frames * ANALYSIS_QUALITY_PRESETS[quality].secondsPerFrame
}

export function formatDurationThai(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes} นาที`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} ชม. ${rest} นาที` : `${hours} ชม.`
}

export function buildHeatmapJobFormData(
  file: Blob,
  settings: {
    stage: string
    device: string
    maxFrames: number
    startSeconds: number
    sampleFps?: number
    maxWidth?: number
    quality?: AnalysisQuality
  },
) {
  const body = new FormData()
  body.append("video", file)
  body.append("stage", settings.stage)
  body.append("device", settings.device)
  body.append("max_frames", String(settings.maxFrames))
  body.append("start_seconds", String(settings.startSeconds))
  // 0 / omitted = analyse every frame.
  if (settings.sampleFps) body.append("sample_fps", String(settings.sampleFps))
  // 0 = full resolution; omitted = the service default.
  if (settings.maxWidth !== undefined) body.append("max_width", String(settings.maxWidth))
  if (settings.quality) body.append("quality", settings.quality)
  return body
}

// Video time covered by a job: analysed frames / analysed frames per second.
export function coveredVideoSeconds(maxFrames: number, sampleFps: number, videoFps = 25) {
  const rate = sampleFps > 0 ? sampleFps : videoFps
  return maxFrames / rate
}
