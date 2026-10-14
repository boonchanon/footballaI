import assert from "node:assert/strict"
import test from "node:test"
import { buildHeatmapJobFormData, getHeatmapQuality, getHeatmapResultView } from "../lib/heatmap-analysis"

test("heatmap job request includes start_seconds", () => {
  const body = buildHeatmapJobFormData(new Blob(["video"]), { stage: "mvp", device: "auto", maxFrames: 250, startSeconds: 12.5 })
  assert.equal(body.get("start_seconds"), "12.5")
})

test("empty result does not select the heatmap iframe", () => {
  const quality = getHeatmapQuality({ usable_heatmap_records: 0, valid_gameplay_frames: 0 })
  assert.equal(getHeatmapResultView(quality), "no-gameplay")
})

test("normal result selects the heatmap iframe when usable records exist", () => {
  assert.equal(getHeatmapResultView({ usableHeatmapRecords: 3 }), "ready")
})
