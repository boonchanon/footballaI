"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, ArrowLeft, CalendarDays, ChevronRight, Crosshair, Search, Users } from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type Heatmap = {
  id: string
  playerName: string
  shirtNumber?: string
  playerTeam?: string
  homeTeam?: string
  awayTeam?: string
  competition?: string
  season?: string
  matchDate?: string
  heatmapImageUrl?: string
  heatmapImageData?: string
  publishedAt?: string
}

type HeatmapMatch = {
  id: string
  homeTeam: string
  awayTeam: string
  matchDate?: string
  heatmaps: Heatmap[]
}

const COPY = {
  title: "\u0e2e\u0e35\u0e15\u0e41\u0e21\u0e1e\u0e19\u0e31\u0e01\u0e40\u0e15\u0e30",
  subtitle: "\u0e14\u0e39\u0e1e\u0e37\u0e49\u0e19\u0e17\u0e35\u0e48\u0e01\u0e32\u0e23\u0e40\u0e25\u0e48\u0e19\u0e08\u0e32\u0e01\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e17\u0e35\u0e48\u0e40\u0e1c\u0e22\u0e41\u0e1e\u0e23\u0e48\u0e41\u0e25\u0e49\u0e27",
  search: "\u0e04\u0e49\u0e19\u0e2b\u0e32\u0e0a\u0e37\u0e48\u0e2d\u0e19\u0e31\u0e01\u0e40\u0e15\u0e30 \u0e2b\u0e23\u0e37\u0e2d\u0e0a\u0e37\u0e48\u0e2d\u0e17\u0e35\u0e21",
  loading: "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e42\u0e2b\u0e25\u0e14\u0e2e\u0e35\u0e15\u0e41\u0e21\u0e1e...",
  empty: "\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e2e\u0e35\u0e15\u0e41\u0e21\u0e1e\u0e17\u0e35\u0e48\u0e40\u0e1c\u0e22\u0e41\u0e1e\u0e23\u0e48",
  noResults: "\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e17\u0e35\u0e48\u0e15\u0e23\u0e07\u0e01\u0e31\u0e1a\u0e01\u0e32\u0e23\u0e04\u0e49\u0e19\u0e2b\u0e32",
  error: "\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e42\u0e2b\u0e25\u0e14\u0e2e\u0e35\u0e15\u0e41\u0e21\u0e1e\u0e44\u0e14\u0e49 \u0e42\u0e1b\u0e23\u0e14\u0e25\u0e2d\u0e07\u0e43\u0e2b\u0e21\u0e48\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07",
  team: "\u0e17\u0e35\u0e21",
  match: "\u0e41\u0e21\u0e15\u0e0a\u0e4c",
  date: "\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48",
} as const

export default function HeatmapPage() {
  const [items, setItems] = useState<Heatmap[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState<Heatmap | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<HeatmapMatch | null>(null)

  useEffect(() => {
    void loadHeatmaps()
  }, [])

  async function loadHeatmaps() {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/heatmaps")
      if (!response.ok) throw new Error("Failed to load heatmaps")
      const data = await response.json() as { items?: Heatmap[] }
      setItems(data.items ?? [])
    } catch {
      setError(COPY.error)
    } finally {
      setLoading(false)
    }
  }

  const matches = useMemo<HeatmapMatch[]>(() => {
    const grouped = new Map<string, HeatmapMatch>()
    for (const item of items) {
      const date = item.matchDate ? new Date(item.matchDate).toISOString().slice(0, 10) : ""
      const id = `${item.homeTeam ?? ""}|${item.awayTeam ?? ""}|${date}`
      const current = grouped.get(id) ?? { id, homeTeam: item.homeTeam ?? "-", awayTeam: item.awayTeam ?? "-", matchDate: item.matchDate, heatmaps: [] }
      current.heatmaps.push(item)
      grouped.set(id, current)
    }
    return [...grouped.values()]
  }, [items])

  const visibleMatches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    if (!needle) return matches
    return matches.filter((match) => [match.homeTeam, match.awayTeam, ...match.heatmaps.map((item) => item.playerName)].some((value) => value.toLocaleLowerCase().includes(needle)))
  }, [matches, query])

  const homeHeatmaps = selectedMatch?.heatmaps.filter((item) => item.playerTeam === selectedMatch.homeTeam) ?? []
  const awayHeatmaps = selectedMatch?.heatmaps.filter((item) => item.playerTeam === selectedMatch.awayTeam) ?? []

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="relative mb-8 overflow-hidden rounded-3xl border bg-card px-6 py-8 shadow-sm sm:px-9 sm:py-10">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-28 right-1/3 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><Crosshair className="h-4 w-4" /> ติดตามนักเตะ</div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{COPY.title}</h1>
              <p className="mt-3 max-w-xl text-muted-foreground">{COPY.subtitle}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-sm">
              <div className="rounded-xl border bg-background/70 px-4 py-3 backdrop-blur"><strong className="block text-xl text-primary">{matches.length}</strong><span className="text-xs text-muted-foreground">แมตช์</span></div>
              <div className="rounded-xl border bg-background/70 px-4 py-3 backdrop-blur"><strong className="block text-xl text-primary">{items.length}</strong><span className="text-xs text-muted-foreground">ฮีตแมพ</span></div>
            </div>
          </div>
        </div>

        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Activity className="h-4 w-4 text-primary" /> คลังฮีตแมพที่เผยแพร่</div>
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={COPY.search} className="pl-9" />
          </div>
        </div>

        {loading && <StateCard>{COPY.loading}</StateCard>}
        {error && <StateCard>{error}</StateCard>}
        {!loading && !error && visibleMatches.length === 0 && <StateCard>{items.length ? COPY.noResults : COPY.empty}</StateCard>}

        {!loading && !error && !selectedMatch && visibleMatches.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleMatches.map((match) => {
              return (
                <button key={match.id} type="button" onClick={() => setSelectedMatch(match)} className="group relative overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-xl">
                  <div className="h-1.5 bg-gradient-to-r from-primary via-lime-300 to-emerald-400" />
                  <div className="p-5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{match.matchDate ? new Date(match.matchDate).toLocaleDateString("th-TH") : "-"}</span><ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:text-primary" /></div>
                    <div className="my-6 flex items-center justify-between gap-3">
                      <TeamMark name={match.homeTeam} />
                      <span className="text-xs font-bold text-primary">VS</span>
                      <TeamMark name={match.awayTeam} />
                    </div>
                    <div className="flex items-center justify-between border-t pt-4 text-sm"><span className="inline-flex items-center gap-2 text-muted-foreground"><Users className="h-4 w-4" />{match.heatmaps.length} นักเตะ</span><span className="font-medium text-primary">ดู</span></div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {!loading && !error && selectedMatch && (
          <div className="space-y-5">
            <button type="button" onClick={() => setSelectedMatch(null)} className="inline-flex items-center gap-2 text-sm font-medium text-primary transition hover:gap-3"><ArrowLeft className="h-4 w-4" />กลับไปเลือกแมตช์</button>
            <div className="rounded-2xl border bg-card p-5 shadow-sm sm:flex sm:items-center sm:justify-between">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">ฮีตแมพในแมตช์นี้</p><h2 className="mt-1 text-2xl font-bold capitalize">{selectedMatch.homeTeam} <span className="text-muted-foreground">vs</span> {selectedMatch.awayTeam}</h2><p className="mt-2 text-sm text-muted-foreground">ดับเบิลคลิกที่นักเตะเพื่อดูฮีตแมพ</p></div>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground sm:mt-0"><Users className="h-4 w-4 text-primary" />{selectedMatch.heatmaps.length} นักเตะที่เผยแพร่</div>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <TeamHeatmapList team={selectedMatch.homeTeam} side="Home" items={homeHeatmaps} onSelect={setSelected} />
              <TeamHeatmapList team={selectedMatch.awayTeam} side="Away" items={awayHeatmaps} onSelect={setSelected} />
            </div>
          </div>
        )}
      </section>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>{selected?.playerName}</DialogTitle></DialogHeader>
          {selected && <HeatmapDetail item={selected} />}
        </DialogContent>
      </Dialog>
      <Footer />
    </main>
  )
}

function HeatmapDetail({ item }: { item: Heatmap }) {
  const image = item.heatmapImageUrl || item.heatmapImageData
  const [failedImage, setFailedImage] = useState("")
  const imageFailed = Boolean(image) && failedImage === image
  return (
    <div className="space-y-4">
      {image && !imageFailed ? (
        <img src={image} alt={`Heatmap ${item.playerName}`} className="max-h-[65vh] w-full rounded-xl border bg-white object-contain" onError={() => setFailedImage(image)} />
      ) : (
        <div className="flex h-72 flex-col items-center justify-center gap-1 rounded-xl border bg-muted text-center text-muted-foreground">
          <p>{imageFailed ? "ไม่สามารถโหลดภาพฮีตแมพได้" : "ไม่มีภาพฮีตแมพ"}</p>
          {imageFailed ? <p className="text-xs">ไฟล์ภาพอาจถูกลบหรือย้ายไปแล้ว</p> : null}
        </div>
      )}
      <dl className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/30 p-4 text-sm sm:grid-cols-3">
        <Info label="นักเตะ" value={item.playerName} />
        <Info label="หมายเลข" value={item.shirtNumber ? `#${item.shirtNumber}` : "-"} />
        <Info label={COPY.team} value={item.playerTeam || "-"} />
        <Info label={COPY.match} value={`${item.homeTeam || "-"} vs ${item.awayTeam || "-"}`} />
        <Info label={COPY.date} value={item.matchDate ? new Date(item.matchDate).toLocaleDateString("th-TH") : "-"} />
        <Info label="รายการ" value={item.competition || "-"} />
      </dl>
    </div>
  )
}

function TeamMark({ name }: { name: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "FC"
  return <div className="min-w-0 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border bg-background font-bold text-primary shadow-sm">{initials}</div><p className="mt-2 max-w-28 truncate text-sm font-semibold capitalize">{name}</p></div>
}

function TeamHeatmapList({ team, side, items, onSelect }: { team: string; side: "Home" | "Away"; items: Heatmap[]; onSelect: (item: Heatmap) => void }) {
  const accent = side === "Home" ? "border-primary/40 bg-primary/10 text-primary" : "border-sky-400/40 bg-sky-400/10 text-sky-500"
  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <header className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border font-bold ${accent}`}>{side === "Home" ? "H" : "A"}</div>
          <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{side === "Home" ? "ทีมเหย้า" : "ทีมเยือน"}</p><h3 className="truncate font-semibold capitalize">{team}</h3></div>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{items.length}</span>
      </header>
      {items.length === 0 ? (
        <p className="p-7 text-center text-sm text-muted-foreground">ทีมนี้ยังไม่มีฮีตแมพที่เผยแพร่</p>
      ) : (
        <div>
          {items.map((item) => (
            <button key={item.id} type="button" onDoubleClick={() => onSelect(item)} className="group flex w-full items-center justify-between border-b px-5 py-4 text-left transition hover:bg-primary/5 last:border-b-0">
              <div className="flex items-center gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${accent}`}>{item.shirtNumber || "#"}</div><div><p className="font-semibold">{item.playerName}</p><p className="mt-0.5 text-xs text-muted-foreground">ดับเบิลคลิกเพื่อดูฮีตแมพ</p></div></div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>
}

function StateCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">{children}</div>
}
