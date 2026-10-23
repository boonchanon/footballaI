import assert from "node:assert/strict"
import test from "node:test"
import {
  ANALYSIS_QUALITY_PRESETS,
  buildHeatmapJobFormData,
  coveredVideoSeconds,
  describeProgress,
  estimateAnalysisSeconds,
  formatDurationThai,
  getHeatmapQuality,
  getHeatmapResultView,
} from "../lib/heatmap-analysis"

test("heatmap job request includes start_seconds", () => {
  const body = buildHeatmapJobFormData(new Blob(["video"]), { stage: "mvp", device: "auto", maxFrames: 250, startSeconds: 12.5 })
  assert.equal(body.get("start_seconds"), "12.5")
  assert.equal(body.get("sample_fps"), null)
})

test("heatmap job request includes sample_fps when sampling", () => {
  const body = buildHeatmapJobFormData(new Blob(["video"]), { stage: "mvp", device: "auto", maxFrames: 13500, startSeconds: 0, sampleFps: 5 })
  assert.equal(body.get("sample_fps"), "5")
  assert.equal(body.get("max_frames"), "13500")
})

test("quality preset sends its sampling, resolution and label", () => {
  const preset = ANALYSIS_QUALITY_PRESETS.high
  const body = buildHeatmapJobFormData(new Blob(["video"]), {
    stage: "mvp", device: "cuda", maxFrames: 1000, startSeconds: 0,
    sampleFps: preset.sampleFps, maxWidth: preset.maxWidth, quality: "high",
  })
  assert.equal(body.get("sample_fps"), null) // every frame
  assert.equal(body.get("max_width"), "0") // full resolution
  assert.equal(body.get("quality"), "high")
})

test("time estimate grows with frames and is formatted in Thai", () => {
  assert.ok(estimateAnalysisSeconds("high", 9000) > estimateAnalysisSeconds("fast", 9000))
  assert.equal(formatDurationThai(90 * 60), "1 ชม. 30 นาที")
  assert.equal(formatDurationThai(20), "1 นาที")
})

test("progress is described in Thai", () => {
  assert.equal(describeProgress({ percent: 30, step: "inference", module: "reid", module_index: 1, module_count: 5 }), "ตรวจจับและติดตามผู้เล่น ขั้น 2/5 (reid)")
  assert.equal(describeProgress({ percent: 90, step: "review" }), "สร้างวิดีโอผลลัพธ์")
  assert.equal(describeProgress(null), "")
})

test("covered video time follows the sampling rate", () => {
  assert.equal(coveredVideoSeconds(13500, 5), 2700)
  assert.equal(coveredVideoSeconds(250, 0, 25), 10)
})

test("empty result does not select the heatmap iframe", () => {
  const quality = getHeatmapQuality({ usable_heatmap_records: 0, valid_gameplay_frames: 0 })
  assert.equal(getHeatmapResultView(quality), "no-gameplay")
})

test("normal result selects the heatmap iframe when usable records exist", () => {
  assert.equal(getHeatmapResultView({ usableHeatmapRecords: 3 }), "ready")
})
