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

export function buildHeatmapJobFormData(file: Blob, settings: { stage: string; device: string; maxFrames: number; startSeconds: number }) {
  const body = new FormData()
  body.append("video", file)
  body.append("stage", settings.stage)
  body.append("device", settings.device)
  body.append("max_frames", String(settings.maxFrames))
  body.append("start_seconds", String(settings.startSeconds))
  return body
}
