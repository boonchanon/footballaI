export type HeatmapPublishInput = {
  sourceJobId: string
  sourceSceneId: string
  sourceTrackIds: string[]
  playerName: string
  shirtNumber?: string
  playerTeam: string
  homeTeam?: string
  awayTeam?: string
  competition?: string
  season?: string
  matchDate?: string
  heatmapImageUrl?: string
  heatmapImageData?: string
  status: "draft" | "published"
}

// Video Analysis can call this after it has a selected scene/track set and PNG.
export async function savePublishedHeatmap(input: HeatmapPublishInput) {
  const response = await fetch("/api/admin/heatmaps", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error || "Could not save heatmap")
  return body.item
}
