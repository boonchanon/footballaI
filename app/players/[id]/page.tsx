"use client"

import { Navigation } from "@/components/navigation"
import { PlayerRadarChart } from "@/components/player-radar-chart"
import { PlayerShotMap } from "@/components/player-shot-map"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, ArrowLeft, CalendarDays, Loader2, MapPin, ShieldAlert, Star, Trophy, Users } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import useSWR from "swr"

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const payload = await response.json()
  if (!response.ok) throw new Error(payload?.error || "ไม่สามารถโหลดข้อมูลนักเตะได้")
  return payload
}

type SeasonStatus = "NOT_STARTED" | "NO_APPEARANCE" | "HAS_STATS"

type PlayerResponse = {
  id: string
  name: string
  firstname?: string
  lastname?: string
  number?: number | null
  photo?: string
  nationality?: string
  age?: number | null
  injured?: boolean
  team?: { id?: string; name?: string }
  position?: string
  captainCount?: number
  season?: string
  seasonStatus?: SeasonStatus
  seasonStats?: {
    appearances?: number
    minutes?: number
    goals?: number
    assists?: number
    rating?: string | null
  } | null
  availableSeasons?: Array<{
    value: string
    label: string
    startDate: string
    endDate: string
  }>
  statistics?: {
    games?: { appearences?: number; minutes?: number; rating?: string | null; captain?: boolean }
    goals?: { total?: number; assists?: number }
    shots?: { total?: number }
    passes?: { total?: number; key?: number; accuracy?: number; accuracyPercent?: number | null; crosses?: number }
    tackles?: { total?: number; blocks?: number; interceptions?: number; clearances?: number }
    duels?: { total?: number; won?: number; winPercent?: number | null }
    dribbles?: { attempts?: number; success?: number; successPercent?: number | null }
    fouls?: { committed?: number }
    cards?: { yellow?: number; red?: number }
    penalty?: { won?: number; scored?: number; missed?: number }
    goalkeeper?: { saves?: number; insideBoxSaves?: number; goalsConceded?: number }
    possession?: { dispossessed?: number }
    meta?: { woodwork?: number }
  }
}

const toDisplayNumber = (value?: number | null) => (typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "-")
const toDisplayText = (value?: string | number | null) => (value === "" || value == null ? "-" : String(value))
const formatPercent = (value?: number | null) => (typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)}%` : "-")

function buildSeasonOptions() {
  return Array.from({ length: 2 }, (_, index) => {
    const startYear = 2025 - index
    const endYear = startYear + 1
    return {
      value: `${startYear}-${endYear}`,
      label: `${startYear}/${String(endYear).slice(-2)}`,
    }
  })
}

function getPositionLabel(position?: string) {
  const normalized = String(position || "").toLowerCase()
  if (normalized.includes("goal")) return "ผู้รักษาประตู"
  if (normalized.includes("def")) return "กองหลัง"
  if (normalized.includes("mid")) return "กองกลาง"
  if (normalized.includes("for") || normalized.includes("striker") || normalized.includes("attack")) return "กองหน้า"
  return position || "-"
}

function buildStatRows(player: PlayerResponse) {
  const stats = player.statistics || {}
  const games = stats.games || {}
  const goals = stats.goals || {}
  const shots = stats.shots || {}
  const passes = stats.passes || {}
  const tackles = stats.tackles || {}
  const duels = stats.duels || {}
  const dribbles = stats.dribbles || {}
  const fouls = stats.fouls || {}
  const cards = stats.cards || {}
  const penalty = stats.penalty || {}
  const goalkeeper = stats.goalkeeper || {}
  const possession = stats.possession || {}
  const meta = stats.meta || {}

  return {
    summary: [
      { label: "ลงเล่น", value: toDisplayNumber(games.appearences) },
      { label: "นาที", value: toDisplayNumber(games.minutes) },
      { label: "ประตู", value: toDisplayNumber(goals.total) },
      { label: "แอสซิสต์", value: toDisplayNumber(goals.assists) },
      { label: "ใบเหลือง", value: toDisplayNumber(cards.yellow) },
      { label: "ใบแดง", value: toDisplayNumber(cards.red) },
      { label: "เรตติ้ง", value: toDisplayText(games.rating) },
    ],
    attacking: [
      { label: "ประตู", value: toDisplayNumber(goals.total) },
      { label: "แอสซิสต์", value: toDisplayNumber(goals.assists) },
      { label: "ยิงทั้งหมด", value: toDisplayNumber(shots.total) },
      { label: "เลี้ยงบอล", value: toDisplayNumber(dribbles.attempts) },
      { label: "เลี้ยงผ่าน", value: toDisplayNumber(dribbles.success) },
      { label: "ชนะจุดโทษ", value: toDisplayNumber(penalty.won) },
      { label: "ยิงจุดโทษเข้า", value: toDisplayNumber(penalty.scored) },
      { label: "ยิงจุดโทษพลาด", value: toDisplayNumber(penalty.missed) },
      { label: "เสียบอล", value: toDisplayNumber(possession.dispossessed) },
      { label: "ชนเสา/คาน", value: toDisplayNumber(meta.woodwork) },
    ],
    passing: [
      { label: "จ่ายบอล", value: toDisplayNumber(passes.total) },
      { label: "จ่ายสำเร็จ", value: toDisplayNumber(passes.accuracy) },
      { label: "ความแม่นยำ", value: formatPercent(passes.accuracyPercent) },
      { label: "คีย์พาส", value: toDisplayNumber(passes.key) },
      { label: "ครอส", value: toDisplayNumber(passes.crosses) },
    ],
    defensive: [
      { label: "แท็กเกิล", value: toDisplayNumber(tackles.total) },
      { label: "ตัดบอล", value: toDisplayNumber(tackles.interceptions) },
      { label: "เคลียร์บอล", value: toDisplayNumber(tackles.clearances) },
      { label: "บล็อก", value: toDisplayNumber(tackles.blocks) },
      { label: "ฟาวล์", value: toDisplayNumber(fouls.committed) },
      { label: "ดวลทั้งหมด", value: toDisplayNumber(duels.total) },
      { label: "ดวลชนะ", value: toDisplayNumber(duels.won) },
      { label: "ดวลชนะ %", value: formatPercent(duels.winPercent) },
    ],
    goalkeeper: [
      { label: "เซฟ", value: toDisplayNumber(goalkeeper.saves) },
      { label: "เซฟในกรอบ", value: toDisplayNumber(goalkeeper.insideBoxSaves) },
      { label: "เสียประตู", value: toDisplayNumber(goalkeeper.goalsConceded) },
    ],
  }
}

function StatGrid({ items }: { items: Array<{ label: string; value: string | number }> }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border/50 bg-muted/30 p-4 text-center">
          <p className="text-2xl font-bold text-primary">{item.value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
  )
}

function InfoRow({ label, value, accent = "default" }: { label: string; value: string | number; accent?: "default" | "success" | "primary" }) {
  const accentClass = accent === "success" ? "text-emerald-400" : accent === "primary" ? "text-primary" : "text-foreground"
  return (
    <div className="group flex items-center justify-between gap-4 border-b border-border/40 py-4 last:border-b-0">
      <span className="text-sm text-muted-foreground transition-colors group-hover:text-foreground/80">{label}</span>
      <span className={`text-right text-xl font-semibold tracking-tight ${accentClass}`}>{value}</span>
    </div>
  )
}

function SeasonStatusCard({ season, seasonStatus }: { season?: string; seasonStatus?: SeasonStatus }) {
  if (seasonStatus === "HAS_STATS") return null

  const title = seasonStatus === "NOT_STARTED" ? "ยังไม่มีสถิติในฤดูกาลนี้" : "ยังไม่ได้ลงสนามในฤดูกาลนี้"
  const description =
    seasonStatus === "NOT_STARTED"
      ? "พรีเมียร์ลีกฤดูกาลนี้ยังไม่มีการแข่งขัน"
      : "ทีมมีการแข่งขันแล้ว แต่ผู้เล่นยังไม่มีส่วนร่วม"

  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="flex items-start gap-4 p-6">
        <div className="rounded-full bg-primary/10 p-3">
          <CalendarDays className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">ฤดูกาล {season || "-"}</p>
          <h3 className="text-xl font-bold">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function PlayerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const playerId = params.id as string
  const selectedSeason = searchParams.get("season") || "2025-2026"
  const { data, isLoading, error } = useSWR<{ data: PlayerResponse | null }>(
    `/api/football/players/${playerId}?season=${encodeURIComponent(selectedSeason)}`,
    fetcher,
  )
  const player = data?.data ?? null
  const seasonOptions = player?.availableSeasons || buildSeasonOptions()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="h-72 animate-pulse rounded-2xl bg-muted lg:col-span-8" />
              <div className="h-72 animate-pulse rounded-2xl bg-muted lg:col-span-4" />
            </div>
            <div className="h-48 animate-pulse rounded-2xl bg-muted" />
          </div>
        </main>
      </div>
    )
  }

  if (error || !player) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-16">
          <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center rounded-2xl border border-border/50 bg-card px-6 text-center">
            <ShieldAlert className="mb-4 h-10 w-10 text-muted-foreground" />
            <h1 className="text-2xl font-bold">ไม่พบข้อมูลนักเตะ</h1>
            <p className="mt-2 text-muted-foreground">ตรวจสอบ `playerId` หรือกลับไปเลือกจากหน้าทีมอีกครั้ง</p>
            <div className="mt-6 flex gap-3">
              <Button asChild variant="outline"><Link href="/teams">กลับหน้าทีม</Link></Button>
              <Button asChild><Link href="/players">หน้ารวมนักเตะ</Link></Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const stats = player.statistics || {}
  const games = stats.games || {}
  const passes = stats.passes || {}
  const duels = stats.duels || {}
  const dribbles = stats.dribbles || {}
  const summary = buildStatRows(player)
  const isGoalkeeper = String(player.position || "").toLowerCase().includes("goal")
  const seasonStatus = player.seasonStatus || "HAS_STATS"
  const hasStats = seasonStatus === "HAS_STATS"

  const radarMetrics = [
    { label: "จ่ายสำเร็จ", value: hasStats ? passes.accuracy ?? null : null, displayValue: hasStats ? toDisplayText(passes.accuracy) : "-", max: Math.max(passes.accuracy || 0, 1) },
    { label: "แม่นยำจ่าย", value: hasStats ? passes.accuracyPercent ?? null : null, displayValue: hasStats ? formatPercent(passes.accuracyPercent) : "-", max: 100 },
    { label: "ดวลชนะ", value: hasStats ? duels.won ?? null : null, displayValue: hasStats ? toDisplayText(duels.won) : "-", max: Math.max(duels.won || 0, 1) },
    { label: "ดวลชนะ %", value: hasStats ? duels.winPercent ?? null : null, displayValue: hasStats ? formatPercent(duels.winPercent) : "-", max: 100 },
    { label: "เลี้ยงสำเร็จ", value: hasStats ? dribbles.success ?? null : null, displayValue: hasStats ? toDisplayText(dribbles.success) : "-", max: Math.max(dribbles.success || 0, 1) },
    { label: "เลี้ยงสำเร็จ %", value: hasStats ? dribbles.successPercent ?? null : null, displayValue: hasStats ? formatPercent(dribbles.successPercent) : "-", max: 100 },
  ]

  const handleSeasonChange = (season: string) => {
    const next = new URLSearchParams(searchParams.toString())
    next.set("season", season)
    router.replace(`/players/${playerId}?${next.toString()}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-7xl space-y-8">
          <Link href={player.team?.id ? `/teams/${player.team.id}` : "/teams"} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />กลับหน้าทีม</Link>

          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
            <Card className="overflow-hidden border-border/50 lg:col-span-8">
              <div className="bg-gradient-to-br from-red-600 via-red-600 to-red-700 p-6 md:p-8">
                <div className="flex flex-col items-center gap-6 sm:flex-row">
                  <div className="relative shrink-0">
                    {player.photo ? <Image src={player.photo} alt={player.name} width={140} height={140} className="h-28 w-28 rounded-full border-4 border-border/70 bg-card/80 object-cover shadow-xl md:h-32 md:w-32 dark:border-white/30 dark:bg-white/10" /> : <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-border/70 bg-card/80 shadow-xl md:h-32 md:w-32 dark:border-white/30 dark:bg-white/10"><Users className="h-14 w-14 text-foreground/45 dark:text-white/60" /></div>}
                    {player.injured && <div className="absolute -bottom-1 -right-1 rounded-full bg-red-500 px-2 py-1 text-xs font-medium text-white">บาดเจ็บ</div>}
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl lg:text-4xl dark:text-white">{player.name}</h1>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                      {player.team?.id ? <Link href={`/teams/${player.team.id}`} className="text-base font-medium text-foreground/85 hover:underline dark:text-white/90">{player.team?.name || "-"}</Link> : <span className="text-base font-medium text-foreground/85 dark:text-white/90">{player.team?.name || "-"}</span>}
                      {games.captain && <Badge variant="secondary">กัปตันทีม</Badge>}
                      {games.rating && hasStats && <Badge className="bg-card text-primary dark:bg-white dark:text-red-600">เรตติ้ง {games.rating}</Badge>}
                    </div>
                    <div className="mt-4 flex justify-center sm:justify-start">
                      <Select value={selectedSeason} onValueChange={handleSeasonChange}>
                        <SelectTrigger className="w-36 border-white/25 bg-white/10 text-white hover:bg-white/15">
                          <SelectValue placeholder="เลือกฤดูกาล" />
                        </SelectTrigger>
                        <SelectContent>
                          {seasonOptions.map((season) => (
                            <SelectItem key={season.value} value={season.value}>
                              {season.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button variant="secondary" size="default" className="shrink-0 gap-2 bg-card text-primary shadow-lg hover:bg-card/90 dark:bg-white dark:text-red-600 dark:hover:bg-white/90"><Star className="h-4 w-4" />ติดตาม</Button>
                </div>
              </div>
              <CardContent className="p-0">
                <div className="grid grid-cols-2 divide-x divide-y divide-border/50 sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
                  <div className="flex flex-col items-center justify-center p-4 md:p-5"><p className="text-lg font-bold text-foreground md:text-xl">{toDisplayText(player.position ? getPositionLabel(player.position) : null)}</p><p className="mt-1 text-xs text-muted-foreground">ตำแหน่ง</p></div>
                  <div className="flex flex-col items-center justify-center p-4 md:p-5"><p className="text-xl font-bold text-foreground md:text-2xl">{toDisplayText(player.age)}</p><p className="mt-1 text-xs text-muted-foreground">อายุ</p></div>
                  <div className="flex flex-col items-center justify-center p-4 md:p-5"><div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /><p className="text-base font-bold text-foreground md:text-lg">{toDisplayText(player.nationality)}</p></div><p className="mt-1 text-xs text-muted-foreground">สัญชาติ</p></div>
                  <div className="flex flex-col items-center justify-center p-4 md:p-5"><p className="text-xl font-bold text-foreground md:text-2xl">{toDisplayText(player.number)}</p><p className="mt-1 text-xs text-muted-foreground">หมายเลขเสื้อ</p></div>
                  <div className="flex flex-col items-center justify-center p-4 md:p-5"><p className="text-xl font-bold text-foreground md:text-2xl">{toDisplayText(player.season)}</p><p className="mt-1 text-xs text-muted-foreground">ฤดูกาล</p></div>
                  <div className="flex flex-col items-center justify-center p-4 md:p-5"><p className="text-lg font-bold text-foreground md:text-xl">{player.injured ? "บาดเจ็บ" : "พร้อมลงสนาม"}</p><p className="mt-1 text-xs text-muted-foreground">สถานะ</p></div>
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-4">
              <PlayerRadarChart metrics={radarMetrics} />
            </div>
          </div>

          <SeasonStatusCard season={player.season} seasonStatus={seasonStatus} />

          {hasStats && (
            <>
              <Card className="border-border/50 bg-card">
                <CardHeader className="pb-4"><div className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /><CardTitle>สถิติฤดูกาล</CardTitle></div></CardHeader>
                <CardContent><StatGrid items={summary.summary} /></CardContent>
              </Card>
              {Number(stats.shots?.total || 0) > 0 && <PlayerShotMap shots={[]} totalShots={stats.shots?.total || 0} totalGoals={stats.goals?.total || 0} totalXG={0} onTargetPercentage={0} />}
            </>
          )}

          <Tabs defaultValue="performance" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="performance" disabled={!hasStats}>ผลงานฤดูกาล</TabsTrigger>
              <TabsTrigger value="attacking" disabled={!hasStats}>เกมรุก</TabsTrigger>
              <TabsTrigger value="defending" disabled={!hasStats}>เกมรับ</TabsTrigger>
              <TabsTrigger value="info">ข้อมูลทั่วไป</TabsTrigger>
            </TabsList>

            <TabsContent value="performance" className="mt-6">{hasStats && <Card className="border-border/50"><CardHeader><CardTitle>การจ่ายบอล</CardTitle></CardHeader><CardContent><StatGrid items={summary.passing} /></CardContent></Card>}</TabsContent>
            <TabsContent value="attacking" className="mt-6">{hasStats && <Card className="border-border/50"><CardHeader><CardTitle>สถิติเกมรุก</CardTitle></CardHeader><CardContent><StatGrid items={summary.attacking} /></CardContent></Card>}</TabsContent>
            <TabsContent value="defending" className="mt-6 space-y-6">{hasStats && <><Card className="border-border/50"><CardHeader><CardTitle>สถิติเกมรับ</CardTitle></CardHeader><CardContent><StatGrid items={summary.defensive} /></CardContent></Card>{isGoalkeeper && <Card className="border-border/50"><CardHeader><CardTitle>สถิติผู้รักษาประตู</CardTitle></CardHeader><CardContent><StatGrid items={summary.goalkeeper} /></CardContent></Card>}</>}</TabsContent>
            <TabsContent value="info" className="mt-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card className="overflow-hidden border-border/50 bg-card/95">
                  <CardHeader className="border-b border-border/40 bg-gradient-to-r from-muted/35 to-transparent pb-5"><div className="flex items-center justify-between"><CardTitle>ข้อมูลนักเตะ</CardTitle><Badge variant="outline" className="border-border/60 bg-background/40">{getPositionLabel(player.position)}</Badge></div></CardHeader>
                  <CardContent className="p-6">
                    <div className="mb-6 rounded-2xl border border-border/40 bg-muted/20 p-4"><p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Player Snapshot</p><div className="mt-3 flex items-end justify-between gap-4"><div><p className="text-2xl font-bold">{player.name}</p><p className="mt-1 text-sm text-muted-foreground">{toDisplayText(player.team?.name)}</p></div><div className="rounded-2xl bg-primary/12 px-4 py-3 text-center"><p className="text-xs uppercase tracking-[0.2em] text-primary/80">No.</p><p className="text-2xl font-black text-primary">{toDisplayText(player.number)}</p></div></div></div>
                    <InfoRow label="ชื่อเต็ม" value={toDisplayText(`${player.firstname || ""} ${player.lastname || ""}`.trim() || player.name)} />
                    <InfoRow label="ทีม" value={toDisplayText(player.team?.name)} />
                    <InfoRow label="หมายเลขเสื้อ" value={toDisplayText(player.number)} />
                    <InfoRow label="อายุ" value={toDisplayText(player.age)} />
                    <InfoRow label="สัญชาติ" value={toDisplayText(player.nationality)} />
                    <InfoRow label="อาการบาดเจ็บ" value={player.injured ? "บาดเจ็บ" : "ปกติ"} accent={player.injured ? "default" : "success"} />
                  </CardContent>
                </Card>
                <Card className="overflow-hidden border-border/50 bg-card/95">
                  <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/10 via-transparent to-transparent pb-5"><div className="flex items-center justify-between"><CardTitle>ข้อมูลฤดูกาล</CardTitle><Badge className="bg-primary/15 text-primary hover:bg-primary/15">{player.season || "-"}</Badge></div></CardHeader>
                  <CardContent className="p-6">
                    <InfoRow label="สถานะฤดูกาล" value={seasonStatus} accent="primary" />
                    <InfoRow label="ลงเล่น" value={hasStats ? toDisplayText(player.seasonStats?.appearances) : "-"} />
                    <InfoRow label="นาที" value={hasStats ? toDisplayText(player.seasonStats?.minutes) : "-"} />
                    <InfoRow label="ประตู" value={hasStats ? toDisplayText(player.seasonStats?.goals) : "-"} />
                    <InfoRow label="แอสซิสต์" value={hasStats ? toDisplayText(player.seasonStats?.assists) : "-"} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {!data?.data && <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-500"><AlertCircle className="h-4 w-4" /><span>ไม่พบข้อมูลจาก API สำหรับนักเตะคนนี้</span></div>}
        </div>
      </main>
    </div>
  )
}
