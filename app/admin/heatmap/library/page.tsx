"use client"

import { FormEvent, useEffect, useState } from "react"
import { ArrowLeft, ImagePlus, Plus } from "lucide-react"

import { fetchJson } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type HeatmapMatch = {
  _id: string
  homeTeam: string
  awayTeam: string
  matchDate: string
}

type PublishedHeatmap = {
  _id?: string
  id?: string
  match?: string | null
  homeTeam: string
  awayTeam: string
  playerName: string
  shirtNumber?: string
  playerTeam?: string
  heatmapImageUrl?: string
  heatmapImageData?: string
  status: "draft" | "published"
}

function heatmapId(heatmap: PublishedHeatmap) {
  return heatmap.id ?? heatmap._id ?? ""
}

function withId(heatmap: PublishedHeatmap) {
  return { ...heatmap, id: heatmapId(heatmap) }
}

const COPY = {
  library: "\u0e04\u0e25\u0e31\u0e07\u0e2e\u0e35\u0e15\u0e41\u0e21\u0e1e",
  chooseMatch: "\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e41\u0e21\u0e15\u0e0a\u0e4c \u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e2e\u0e35\u0e15\u0e41\u0e21\u0e1e\u0e02\u0e2d\u0e07\u0e19\u0e31\u0e01\u0e40\u0e15\u0e30",
  addMatch: "\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e41\u0e21\u0e15\u0e0a\u0e4c",
  back: "\u0e01\u0e25\u0e31\u0e1a\u0e44\u0e1b\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e41\u0e21\u0e15\u0e0a\u0e4c",
  addHeatmap: "\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e2e\u0e35\u0e15\u0e41\u0e21\u0e1e",
  playerName: "\u0e0a\u0e37\u0e48\u0e2d\u0e19\u0e31\u0e01\u0e40\u0e15\u0e30",
  shirtNumber: "\u0e2b\u0e21\u0e32\u0e22\u0e40\u0e25\u0e02\u0e40\u0e2a\u0e37\u0e49\u0e2d",
  match: "\u0e41\u0e21\u0e15\u0e0a\u0e4c",
  team: "\u0e17\u0e35\u0e21\u0e02\u0e2d\u0e07\u0e19\u0e31\u0e01\u0e40\u0e15\u0e30",
  imageUrl: "\u0e25\u0e34\u0e07\u0e01\u0e4c\u0e20\u0e32\u0e1e\u0e2e\u0e35\u0e15\u0e41\u0e21\u0e1e PNG",
  uploadImage: "\u0e2d\u0e31\u0e1b\u0e42\u0e2b\u0e25\u0e14\u0e23\u0e39\u0e1b\u0e20\u0e32\u0e1e",
  save: "\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e2e\u0e35\u0e15\u0e41\u0e21\u0e1e",
  edit: "\u0e41\u0e01\u0e49\u0e44\u0e02",
  delete: "\u0e25\u0e1a",
  publish: "\u0e40\u0e1c\u0e22\u0e41\u0e1e\u0e23\u0e48",
  noHeatmaps: "\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e2e\u0e35\u0e15\u0e41\u0e21\u0e1e\u0e43\u0e19\u0e41\u0e21\u0e15\u0e0a\u0e4c\u0e19\u0e35\u0e49",
  noMatches: "\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e41\u0e21\u0e15\u0e0a\u0e4c",
  draft: "\u0e23\u0e48\u0e32\u0e07",
  published: "\u0e40\u0e1c\u0e22\u0e41\u0e1e\u0e23\u0e48\u0e41\u0e25\u0e49\u0e27",
} as const

export default function HeatmapLibraryPage() {
  const [matches, setMatches] = useState<HeatmapMatch[]>([])
  const [selectedMatch, setSelectedMatch] = useState<HeatmapMatch | null>(null)
  const [heatmaps, setHeatmaps] = useState<PublishedHeatmap[]>([])
  const [selectedHeatmap, setSelectedHeatmap] = useState<PublishedHeatmap | null>(null)
  const [editingHeatmap, setEditingHeatmap] = useState<PublishedHeatmap | null>(null)
  const [matchDialogOpen, setMatchDialogOpen] = useState(false)
  const [editingMatch, setEditingMatch] = useState<HeatmapMatch | null>(null)
  const [heatmapDialogOpen, setHeatmapDialogOpen] = useState(false)
  const [matchForm, setMatchForm] = useState({ homeTeam: "", awayTeam: "", matchDate: "" })
  const [heatmapForm, setHeatmapForm] = useState({
    match: "",
    playerName: "",
    shirtNumber: "",
    playerTeam: "home",
    heatmapImageUrl: "",
    heatmapImageData: "",
  })
  const formMatch = matches.find((item) => item._id === heatmapForm.match) ?? selectedMatch

  useEffect(() => {
    void loadMatches()
  }, [])

  async function loadMatches() {
    try {
      const response = await fetchJson<{ items: HeatmapMatch[] }>("/admin/heatmap-matches")
      setMatches(response.items ?? [])
    } catch {
      setMatches([])
    }
  }

  async function selectMatch(match: HeatmapMatch) {
    setSelectedMatch(match)
    try {
      const response = await fetchJson<{ items: PublishedHeatmap[] }>(
        `/admin/heatmaps?match=${encodeURIComponent(match._id)}`,
      )
      setHeatmaps(response.items ?? [])
    } catch {
      setHeatmaps([])
    }
  }

  async function createMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (editingMatch) {
      const response = await fetchJson<{ item: HeatmapMatch }>(`/admin/heatmap-matches?id=${editingMatch._id}`, {
        method: "PATCH",
        body: JSON.stringify(matchForm),
      })
      setMatches((current) => current.map((item) => item._id === editingMatch._id ? response.item : item))
      if (selectedMatch?._id === editingMatch._id) setSelectedMatch(response.item)
      setEditingMatch(null)
      setMatchDialogOpen(false)
      return
    }
    const response = await fetchJson<{ item: HeatmapMatch }>("/admin/heatmap-matches", {
      method: "POST",
      body: JSON.stringify(matchForm),
    })
    setMatches((current) => [response.item, ...current])
    setMatchForm({ homeTeam: "", awayTeam: "", matchDate: "" })
    setMatchDialogOpen(false)
  }

  function openEditMatch(match: HeatmapMatch) {
    setEditingMatch(match)
    setMatchForm({ homeTeam: match.homeTeam, awayTeam: match.awayTeam, matchDate: match.matchDate.slice(0, 10) })
    setMatchDialogOpen(true)
  }

  function openCreateMatch() {
    setEditingMatch(null)
    setMatchForm({ homeTeam: "", awayTeam: "", matchDate: "" })
    setMatchDialogOpen(true)
  }

  async function deleteMatch(match: HeatmapMatch) {
    if (!window.confirm("Delete this match and its library entry?")) return
    await fetchJson(`/admin/heatmap-matches?id=${match._id}`, { method: "DELETE" })
    setMatches((current) => current.filter((item) => item._id !== match._id))
    if (selectedMatch?._id === match._id) setSelectedMatch(null)
  }

  function chooseImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith("image/")) return

    const reader = new FileReader()
    reader.onload = () => {
      setHeatmapForm((current) => ({
        ...current,
        heatmapImageData: String(reader.result ?? ""),
        heatmapImageUrl: "",
      }))
    }
    reader.readAsDataURL(file)
  }

  async function createHeatmap(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedMatch || !formMatch) return

    const playerTeam = heatmapForm.playerTeam === "away" ? formMatch.awayTeam : formMatch.homeTeam
    const keepInList = (item: PublishedHeatmap) => item.match === selectedMatch._id
    if (editingHeatmap) {
      const id = heatmapId(editingHeatmap)
      if (!id) return
      const response = await fetchJson<{ item: PublishedHeatmap }>(`/admin/heatmaps/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...heatmapForm, match: formMatch._id, playerTeam }),
      })
      const updated = withId(response.item)
      setHeatmaps((current) => current.map((item) => heatmapId(item) === id ? updated : item).filter(keepInList))
      setSelectedHeatmap(keepInList(updated) ? updated : null)
      setEditingHeatmap(null)
      setHeatmapDialogOpen(false)
      return
    }
    const response = await fetchJson<{ item: PublishedHeatmap }>("/admin/heatmaps", {
      method: "POST",
      body: JSON.stringify({
        ...heatmapForm,
        match: formMatch._id,
        playerTeam,
        sourceJobId: `manual-${formMatch._id}`,
        sourceTrackIds: [],
        status: "draft",
      }),
    })
    if (keepInList(response.item)) setHeatmaps((current) => [response.item, ...current])
    setHeatmapForm({ match: "", playerName: "", shirtNumber: "", playerTeam: "home", heatmapImageUrl: "", heatmapImageData: "" })
    setHeatmapDialogOpen(false)
  }

  function openCreateHeatmap() {
    setEditingHeatmap(null)
    setHeatmapForm({ match: selectedMatch?._id ?? "", playerName: "", shirtNumber: "", playerTeam: "home", heatmapImageUrl: "", heatmapImageData: "" })
    setHeatmapDialogOpen(true)
  }

  function openEditHeatmap(heatmap: PublishedHeatmap) {
    setEditingHeatmap(heatmap)
    setHeatmapForm({
      match: heatmap.match ?? selectedMatch?._id ?? "",
      playerName: heatmap.playerName,
      shirtNumber: heatmap.shirtNumber ?? "",
      playerTeam: heatmap.playerTeam === selectedMatch?.awayTeam ? "away" : "home",
      heatmapImageUrl: heatmap.heatmapImageUrl ?? "",
      heatmapImageData: heatmap.heatmapImageData ?? "",
    })
    setHeatmapDialogOpen(true)
  }

  async function deleteHeatmap(heatmap: PublishedHeatmap) {
    const id = heatmapId(heatmap)
    if (!id || !window.confirm("Delete this heatmap?")) return
    await fetchJson(`/admin/heatmaps/${id}`, { method: "DELETE" })
    setHeatmaps((current) => current.filter((item) => heatmapId(item) !== id))
    setSelectedHeatmap(null)
  }

  async function publishHeatmap(heatmap: PublishedHeatmap) {
    const id = heatmapId(heatmap)
    if (!id) return
    const response = await fetchJson<{ item: PublishedHeatmap }>(`/admin/heatmaps/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "published" }),
    })
    const updated = withId(response.item)
    setHeatmaps((current) => current.map((item) => heatmapId(item) === id ? updated : item))
    setSelectedHeatmap(updated)
  }

  if (selectedMatch) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-10">
        <Button variant="ghost" onClick={() => setSelectedMatch(null)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {COPY.back}
        </Button>

        <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-background">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <h1 className="text-3xl font-bold">{selectedMatch.homeTeam} vs {selectedMatch.awayTeam}</h1>
              <p className="mt-1 text-muted-foreground">
                {new Date(selectedMatch.matchDate).toLocaleDateString("th-TH")}
              </p>
            </div>
            <Button onClick={openCreateHeatmap}>
              <Plus className="mr-2 h-4 w-4" />
              {COPY.addHeatmap}
            </Button>
          </CardContent>
        </Card>

        {heatmaps.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">{COPY.noHeatmaps}</CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            {heatmaps.map((heatmap) => {
              return (
                <button key={heatmap._id ?? heatmap.id} type="button" className="flex w-full items-center justify-between border-b p-4 text-left last:border-b-0 hover:bg-muted/50" onDoubleClick={() => setSelectedHeatmap(heatmap)}>
                  <div>
                    <p className="font-semibold">{heatmap.playerName} {heatmap.shirtNumber && <span className="text-muted-foreground">#{heatmap.shirtNumber}</span>}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{heatmap.playerTeam || "-"} · {heatmap.status === "published" ? COPY.published : COPY.draft}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">Double-click to view</span>
                </button>
              )
            })}
          </div>
        )}

        <Dialog open={heatmapDialogOpen} onOpenChange={setHeatmapDialogOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader><DialogTitle>{editingHeatmap ? COPY.edit : COPY.addHeatmap}</DialogTitle></DialogHeader>
            <form onSubmit={createHeatmap} className="space-y-4">
              <Field label={COPY.match}>
                <Select value={heatmapForm.match} onValueChange={(match) => setHeatmapForm({ ...heatmapForm, match })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {matches.map((match) => (
                      <SelectItem key={match._id} value={match._id}>
                        {match.homeTeam} vs {match.awayTeam} ({new Date(match.matchDate).toLocaleDateString("th-TH")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={COPY.playerName}>
                <Input required value={heatmapForm.playerName} onChange={(event) => setHeatmapForm({ ...heatmapForm, playerName: event.target.value })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={COPY.shirtNumber}>
                  <Input inputMode="numeric" value={heatmapForm.shirtNumber} onChange={(event) => setHeatmapForm({ ...heatmapForm, shirtNumber: event.target.value })} />
                </Field>
                <Field label={COPY.team}>
                  <Select value={heatmapForm.playerTeam} onValueChange={(playerTeam) => setHeatmapForm({ ...heatmapForm, playerTeam })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">{formMatch?.homeTeam ?? selectedMatch.homeTeam}</SelectItem>
                      <SelectItem value="away">{formMatch?.awayTeam ?? selectedMatch.awayTeam}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label={COPY.imageUrl}>
                <Input type="url" placeholder="https://example.com/heatmap.png" value={heatmapForm.heatmapImageUrl} onChange={(event) => setHeatmapForm({ ...heatmapForm, heatmapImageUrl: event.target.value, heatmapImageData: "" })} />
              </Field>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-sm font-medium transition-colors hover:bg-muted">
                <ImagePlus className="h-4 w-4" />
                {COPY.uploadImage}
                <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage} />
              </label>
              {(heatmapForm.heatmapImageUrl || heatmapForm.heatmapImageData) && (
                <img src={heatmapForm.heatmapImageUrl || heatmapForm.heatmapImageData} alt="Heatmap preview" className="h-48 w-full rounded-xl border object-cover" />
              )}
              <DialogFooter><Button type="submit">{COPY.save}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(selectedHeatmap)} onOpenChange={(open) => !open && setSelectedHeatmap(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader><DialogTitle>{selectedHeatmap?.playerName}</DialogTitle></DialogHeader>
            {selectedHeatmap && (
              <div className="space-y-4">
                {(selectedHeatmap.heatmapImageUrl || selectedHeatmap.heatmapImageData) ? (
                  <img
                    src={selectedHeatmap.heatmapImageUrl || selectedHeatmap.heatmapImageData}
                    alt={`Heatmap ${selectedHeatmap.playerName}`}
                    className="max-h-[60vh] w-full rounded-xl border bg-white object-contain"
                  />
                ) : (
                  <div className="flex h-64 items-center justify-center rounded-xl border bg-muted text-muted-foreground">No heatmap image</div>
                )}
                <dl className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/30 p-4 text-sm">
                  <div><dt className="text-muted-foreground">{COPY.playerName}</dt><dd className="font-medium">{selectedHeatmap.playerName}</dd></div>
                  <div><dt className="text-muted-foreground">{COPY.shirtNumber}</dt><dd className="font-medium">{selectedHeatmap.shirtNumber ? `#${selectedHeatmap.shirtNumber}` : "-"}</dd></div>
                  <div><dt className="text-muted-foreground">{COPY.team}</dt><dd className="font-medium">{selectedHeatmap.playerTeam || "-"}</dd></div>
                  <div><dt className="text-muted-foreground">Status</dt><dd className="font-medium">{selectedHeatmap.status === "published" ? COPY.published : COPY.draft}</dd></div>
                </dl>
                <DialogFooter className="gap-2 sm:justify-between">
                  <Button variant="destructive" type="button" onClick={() => void deleteHeatmap(selectedHeatmap)}>{COPY.delete}</Button>
                  <div className="flex gap-2">
                    {selectedHeatmap.status !== "published" && <Button variant="secondary" type="button" onClick={() => void publishHeatmap(selectedHeatmap)}>{COPY.publish}</Button>}
                    <Button type="button" onClick={() => openEditHeatmap(selectedHeatmap)}>{COPY.edit}</Button>
                  </div>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{COPY.library}</h1>
          <p className="text-muted-foreground">{COPY.chooseMatch}</p>
        </div>
        <Button onClick={openCreateMatch}><Plus className="mr-2 h-4 w-4" />{COPY.addMatch}</Button>
      </div>
      {matches.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-8 text-center text-muted-foreground">{COPY.noMatches}</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {matches.map((match) => (
            <Card key={match._id} className="transition-colors hover:border-primary">
              <button type="button" className="w-full text-left" onClick={() => void selectMatch(match)}>
                <CardHeader><CardTitle>{match.homeTeam} vs {match.awayTeam}</CardTitle></CardHeader>
                <CardContent className="text-muted-foreground">{new Date(match.matchDate).toLocaleDateString("th-TH")}</CardContent>
              </button>
              <div className="flex justify-end gap-2 px-6 pb-4">
                <Button type="button" size="sm" variant="ghost" onClick={() => openEditMatch(match)}>{COPY.edit}</Button>
                <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => void deleteMatch(match)}>{COPY.delete}</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingMatch ? COPY.edit : COPY.addMatch}</DialogTitle></DialogHeader>
          <form onSubmit={createMatch} className="space-y-3">
            <Input required placeholder="Home team" value={matchForm.homeTeam} onChange={(event) => setMatchForm({ ...matchForm, homeTeam: event.target.value })} />
            <Input required placeholder="Away team" value={matchForm.awayTeam} onChange={(event) => setMatchForm({ ...matchForm, awayTeam: event.target.value })} />
            <Input required type="date" value={matchForm.matchDate} onChange={(event) => setMatchForm({ ...matchForm, matchDate: event.target.value })} />
            <DialogFooter><Button type="submit">{editingMatch ? COPY.save : COPY.addMatch}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><Label>{label}</Label>{children}</label>
}
