import assert from "node:assert/strict"
import test from "node:test"
import { buildHeatmapJobFormData, coveredVideoSeconds, getHeatmapQuality, getHeatmapResultView } from "../lib/heatmap-analysis"

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
