"use client"

import useSWR from "swr"
import Link from "next/link"
import {
  Activity,
  ArrowLeft,
  Clock3,
  ExternalLink,
  Loader2,
  Radar,
  RefreshCw,
  Sparkles,
  Table2,
} from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getPageSourcePolicy } from "@/lib/content-sources"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type SnapshotStanding = {
  position: number
  team: string
  teamEn?: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  points: number
  form: string[]
  note?: string
}

type SnapshotFixture = {
  id: string
  round?: string
  homeTeam: string
  awayTeam: string
  dateLabel: string
  kickoff?: string
  venue?: string
  status: "upcoming" | "live" | "finished"
  homeScore?: number | null
  awayScore?: number | null
  note?: string
}

type SnapshotSource = {
  label: string
  url: string
}

type SnapshotResponse = {
  source: string
  model?: string
  generatedAt: string
  searchVerified?: boolean
  season?: string
  summary?: string
  standings: SnapshotStanding[]
  fixtures: SnapshotFixture[]
  sources: SnapshotSource[]
  warnings?: string[]
  error?: string
}

function formatFixtureStatus(status: SnapshotFixture["status"]) {
  if (status === "live") return "LIVE"
  if (status === "finished") return "RESULT"
  return "UPCOMING"
}

export default function AIFootballLivePage() {
  const sourcePolicy = getPageSourcePolicy("aiFootballLive")
  const { data, isLoading, mutate } = useSWR<SnapshotResponse>("/api/football/ai-snapshot", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000,
  })

  const standings = data?.standings || []
  const fixtures = data?.fixtures || []

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="border-b border-border bg-[radial-gradient(circle_at_top_left,rgba(234,179,8,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_28%)]">
        <div className="container mx-auto px-4 py-10 md:py-14">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl space-y-4">
              <Badge variant="outline" className="gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                Experimental Gemini Snapshot
              </Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-display md:text-5xl">Premier League AI Snapshot</h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                  หน้านี้เป็นพื้นที่ทดลองสำหรับให้ Gemini สรุปภาพรวมลีกในรูปแบบ JSON แล้วนำมาแสดงบนหน้าเว็บโดยตรง
                  เหมาะกับการดูบทสรุปเร็ว ๆ ไม่ใช่หน้าข้อมูลทางการของตารางหรือโปรแกรมแข่งขัน
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="rounded-full border border-border px-3 py-1">Model: {data?.model || "IntelSphere"}</span>
                <span className="rounded-full border border-border px-3 py-1">
                  Search: {data?.searchVerified ? "grounded" : "not confirmed"}
                </span>
                <span className="rounded-full border border-border px-3 py-1">
                  Season: {data?.season || "Premier League"}
                </span>
                <span className="rounded-full border border-border px-3 py-1">Policy: {sourcePolicy.kind}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="bg-background/70">
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  กลับหน้าแรก
                </Link>
              </Button>
              <Button onClick={() => mutate()} disabled={isLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                รีเฟรช Snapshot
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto space-y-8 px-4 py-8 md:py-10">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="outline">AI-generated</Badge>
          <span>หน้านี้ใช้สำหรับสรุปและทดลองมุมมองจากโมเดล ไม่ควรใช้แทนหน้า standings หรือ matches หลัก</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Radar className="h-5 w-5 text-primary" />
                <CardTitle>AI Summary</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex items-center py-10 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  กำลังสร้าง snapshot ล่าสุด...
                </div>
              ) : data?.error ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  {data.error}
                </div>
              ) : (
                <>
                  <p className="text-sm leading-7 text-muted-foreground">
                    {data?.summary || "รอบนี้ยังไม่มีคำอธิบายจากโมเดล"}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-3 py-1">
                      <Clock3 className="mr-1 inline h-3 w-3" />
                      {data?.generatedAt ? new Date(data.generatedAt).toLocaleString("th-TH") : "-"}
                    </span>
                    {data?.warnings?.[0] ? <span className="rounded-full bg-muted px-3 py-1">{data.warnings[0]}</span> : null}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-primary" />
                <CardTitle>Sources</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.sources?.length ? (
                data.sources.map((source) => (
                  <a
                    key={`${source.label}-${source.url}`}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-border/60 p-3 text-sm transition-colors hover:border-primary/50 hover:bg-muted/30"
                  >
                    <div className="font-medium">{source.label}</div>
                    <div className="truncate text-xs text-muted-foreground">{source.url}</div>
                  </a>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  รอบนี้ยังไม่มีลิงก์อ้างอิงที่โมเดลส่งกลับมา
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="overflow-hidden border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Table2 className="h-5 w-5 text-primary" />
                <CardTitle>Standings Snapshot</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {standings.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-y border-border/50 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left">#</th>
                        <th className="px-4 py-3 text-left">Team</th>
                        <th className="px-3 py-3 text-center">P</th>
                        <th className="px-3 py-3 text-center">W</th>
                        <th className="px-3 py-3 text-center">D</th>
                        <th className="px-3 py-3 text-center">L</th>
                        <th className="px-3 py-3 text-center">GD</th>
                        <th className="px-4 py-3 text-center">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((team, index) => (
                        <tr
                          key={`${team.position}-${team.team}`}
                          className={`border-b border-border/40 ${index < 4 ? "bg-primary/5" : ""}`}
                        >
                          <td className="px-4 py-3">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-sm font-semibold">
                              {team.position}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="min-w-[180px]">
                              <div className="font-medium">{team.team}</div>
                              {team.teamEn && team.teamEn !== team.team ? (
                                <div className="text-xs text-muted-foreground">{team.teamEn}</div>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center text-sm text-muted-foreground">{team.played}</td>
                          <td className="px-3 py-3 text-center text-sm">{team.won}</td>
                          <td className="px-3 py-3 text-center text-sm">{team.drawn}</td>
                          <td className="px-3 py-3 text-center text-sm">{team.lost}</td>
                          <td className="px-3 py-3 text-center text-sm">{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                          <td className="px-4 py-3 text-center font-semibold text-primary">{team.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-12 text-sm text-muted-foreground">ยังไม่มี standings snapshot ที่ parse ได้</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle>Fixtures Snapshot</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {fixtures.length ? (
                fixtures.map((fixture) => (
                  <div key={fixture.id} className="rounded-2xl border border-border/60 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <Badge variant={fixture.status === "live" ? "destructive" : "outline"}>
                        {formatFixtureStatus(fixture.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{fixture.round || "Premier League"}</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-medium">{fixture.homeTeam}</span>
                        <span className="text-sm text-muted-foreground">vs</span>
                        <span className="text-right font-medium">{fixture.awayTeam}</span>
                      </div>
                      {fixture.status === "upcoming" ? (
                        <div className="rounded-xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                          {fixture.dateLabel}
                          {fixture.kickoff ? ` • ${fixture.kickoff}` : ""}
                        </div>
                      ) : (
                        <div className="rounded-xl bg-muted/40 px-3 py-2 text-center text-lg font-semibold">
                          {fixture.homeScore ?? "-"} : {fixture.awayScore ?? "-"}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">{fixture.venue || fixture.note || fixture.dateLabel}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  ยังไม่มี fixtures snapshot ที่ parse ได้
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
