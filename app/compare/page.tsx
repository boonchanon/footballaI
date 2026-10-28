"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { ArrowLeftRight, Loader2, Swords, Trophy } from "lucide-react"

import { Navigation } from "@/components/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Team = { id: string; name: string; nameEn?: string; logo?: string }
type StandingRow = {
  rank: number
  points: number
  team: Team
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } }
  goalsDiff: number
}
type Fixture = {
  id: string
  date: string
  roundNumber?: number
  teams: { home: Team; away: Team }
  goals: { home: number | null; away: number | null }
  status: { isFinished?: boolean; isLive?: boolean }
}

const fetcher = (url: string) => fetch(url).then((response) => response.json())

// Season figures for one team, all computed from the real standings and match results.
function teamProfile(teamId: string, row: StandingRow | undefined, fixtures: Fixture[]) {
  const finished = fixtures
    .filter((match) => match.status?.isFinished && (match.teams.home.id === teamId || match.teams.away.id === teamId))
    .sort((a, b) => a.date.localeCompare(b.date))
  let cleanSheets = 0
  let failedToScore = 0
  const home = { w: 0, d: 0, l: 0 }
  const away = { w: 0, d: 0, l: 0 }
  const form: string[] = []
  for (const match of finished) {
    const atHome = match.teams.home.id === teamId
    const scored = (atHome ? match.goals.home : match.goals.away) ?? 0
    const conceded = (atHome ? match.goals.away : match.goals.home) ?? 0
    const result = scored > conceded ? "w" : scored < conceded ? "l" : "d"
    const record = atHome ? home : away
    record[result] += 1
    if (conceded === 0) cleanSheets += 1
    if (scored === 0) failedToScore += 1
    form.push(result.toUpperCase())
  }
  const played = row?.all.played || finished.length || 0
  return {
    row,
    played,
    cleanSheets,
    failedToScore,
    home,
    away,
    form: form.slice(-5),
    goalsPerGame: played ? (row?.all.goals.for || 0) / played : 0,
    concededPerGame: played ? (row?.all.goals.against || 0) / played : 0,
    pointsPerGame: played ? (row?.points || 0) / played : 0,
  }
}

const FORM_COLOR: Record<string, string> = { W: "bg-green-600", D: "bg-gray-400", L: "bg-red-500" }

function StatRow({ label, left, right, better = "higher", format = (value: number) => String(value) }: { label: string; left: number; right: number; better?: "higher" | "lower" | "none"; format?: (value: number) => string }) {
  const total = Math.abs(left) + Math.abs(right) || 1
  const leftWins = better === "none" ? false : better === "higher" ? left > right : left < right
  const rightWins = better === "none" ? false : better === "higher" ? right > left : right < left
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className={leftWins ? "font-bold text-primary" : "font-medium"}>{format(left)}</span>
        <span className="text-muted-foreground">{label}</span>
        <span className={rightWins ? "font-bold text-primary" : "font-medium"}>{format(right)}</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        <div className={leftWins ? "bg-primary" : "bg-primary/40"} style={{ width: `${(Math.abs(left) / total) * 100}%` }} />
        <div className="flex-1" />
        <div className={rightWins ? "bg-primary" : "bg-primary/40"} style={{ width: `${(Math.abs(right) / total) * 100}%` }} />
      </div>
    </div>
  )
}

function TeamHeader({ team, row }: { team?: Team; row?: StandingRow }) {
  if (!team) return null
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      {team.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logo} alt="" className="h-16 w-16 object-contain" />
      ) : null}
      <p className="text-lg font-bold">{team.name}</p>
      {row ? <Badge variant="outline">อันดับ {row.rank} · {row.points} แต้ม</Badge> : null}
    </div>
  )
}

export default function ComparePage() {
  const standings = useSWR<{ data: StandingRow[]; season?: string }>("/api/football/standings", fetcher, { revalidateOnFocus: false })
  const fixtures = useSWR<{ data: Fixture[] }>("/api/football/fixtures?type=all&limit=380", fetcher, { revalidateOnFocus: false })
  const rows = standings.data?.data || []
  const matches = fixtures.data?.data || []
  const [leftId, setLeftId] = useState("")
  const [rightId, setRightId] = useState("")
  const leftTeamId = leftId || rows[0]?.team.id || ""
  const rightTeamId = rightId || rows[1]?.team.id || ""

  const byId = useMemo(() => new Map(rows.map((row) => [row.team.id, row])), [rows])
  const left = useMemo(() => teamProfile(leftTeamId, byId.get(leftTeamId), matches), [leftTeamId, byId, matches])
  const right = useMemo(() => teamProfile(rightTeamId, byId.get(rightTeamId), matches), [rightTeamId, byId, matches])
  const meetings = matches
    .filter((match) => {
      const ids = [match.teams.home.id, match.teams.away.id]
      return ids.includes(leftTeamId) && ids.includes(rightTeamId)
    })
    .sort((a, b) => a.date.localeCompare(b.date))
  const loading = standings.isLoading || fixtures.isLoading
  const sortedTeams = [...rows].sort((a, b) => a.team.name.localeCompare(b.team.name))

  const swap = () => {
    setLeftId(rightTeamId)
    setRightId(leftTeamId)
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="space-y-2">
            <h1 className="font-display text-5xl">เปรียบเทียบ</h1>
            <p className="text-lg text-muted-foreground">เปรียบเทียบสถิติจริงของ 2 ทีมในพรีเมียร์ลีกฤดูกาล {standings.data?.season || "ปัจจุบัน"}</p>
          </div>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>เลือกทีมเพื่อเปรียบเทียบ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
                {[
                  { label: "ทีม 1", value: leftTeamId, onChange: setLeftId, other: rightTeamId },
                  { label: "ทีม 2", value: rightTeamId, onChange: setRightId, other: leftTeamId },
                ].map((picker, index) => (
                  <div key={picker.label} className={`space-y-2 ${index === 1 ? "md:order-3" : ""}`}>
                    <label className="text-sm font-medium">{picker.label}</label>
                    <Select value={picker.value} onValueChange={picker.onChange} disabled={loading}>
                      <SelectTrigger aria-label={picker.label}>
                        <SelectValue placeholder="เลือกทีม" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedTeams.map((row) => (
                          <SelectItem key={row.team.id} value={row.team.id} disabled={row.team.id === picker.other}>
                            {row.team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                <div className="flex justify-center md:order-2">
                  <Button variant="outline" size="icon" className="rounded-full bg-transparent" onClick={swap} aria-label="สลับทีม" disabled={loading}>
                    <ArrowLeftRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !rows.length ? (
            <p className="py-12 text-center text-muted-foreground">ยังไม่มีข้อมูลตารางคะแนน</p>
          ) : (
            <>
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    สถิติฤดูกาลนี้
                  </CardTitle>
                  <CardDescription>ค่าที่ดีกว่าแสดงเป็นสีเด่น · คำนวณจากตารางคะแนนและผลการแข่งขันที่จบแล้ว</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <TeamHeader team={left.row?.team} row={left.row} />
                    <TeamHeader team={right.row?.team} row={right.row} />
                  </div>
                  <div className="space-y-4">
                    <StatRow label="อันดับ" left={left.row?.rank || 0} right={right.row?.rank || 0} better="lower" />
                    <StatRow label="แต้ม" left={left.row?.points || 0} right={right.row?.points || 0} />
                    <StatRow label="แต้มต่อนัด" left={left.pointsPerGame} right={right.pointsPerGame} format={(v) => v.toFixed(2)} />
                    <StatRow label="ชนะ" left={left.row?.all.win || 0} right={right.row?.all.win || 0} />
                    <StatRow label="เสมอ" left={left.row?.all.draw || 0} right={right.row?.all.draw || 0} better="none" />
                    <StatRow label="แพ้" left={left.row?.all.lose || 0} right={right.row?.all.lose || 0} better="lower" />
                    <StatRow label="ประตูได้" left={left.row?.all.goals.for || 0} right={right.row?.all.goals.for || 0} />
                    <StatRow label="ประตูเสีย" left={left.row?.all.goals.against || 0} right={right.row?.all.goals.against || 0} better="lower" />
                    <StatRow label="ได้ประตูต่อนัด" left={left.goalsPerGame} right={right.goalsPerGame} format={(v) => v.toFixed(2)} />
                    <StatRow label="เสียประตูต่อนัด" left={left.concededPerGame} right={right.concededPerGame} better="lower" format={(v) => v.toFixed(2)} />
                    <StatRow label="ไม่เสียประตู (นัด)" left={left.cleanSheets} right={right.cleanSheets} />
                    <StatRow label="ยิงไม่ได้ (นัด)" left={left.failedToScore} right={right.failedToScore} better="lower" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {[left, right].map((profile, index) => (
                      <div key={index} className={`space-y-2 ${index === 1 ? "text-right" : ""}`}>
                        <p className="text-muted-foreground">ฟอร์ม 5 นัดล่าสุด</p>
                        <div className={`flex gap-1 ${index === 1 ? "justify-end" : ""}`}>
                          {profile.form.length ? (
                            profile.form.map((result, i) => (
                              <span key={i} className={`flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white ${FORM_COLOR[result]}`}>
                                {result}
                              </span>
                            ))
                          ) : (
                            <span>-</span>
                          )}
                        </div>
                        <p>
                          เหย้า {profile.home.w}-{profile.home.d}-{profile.home.l} · เยือน {profile.away.w}-{profile.away.d}-{profile.away.l}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Swords className="h-5 w-5 text-primary" />
                    พบกันในฤดูกาลนี้
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {meetings.length ? (
                    meetings.map((match) => (
                      <div key={match.id} className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3 text-sm">
                        <span className="text-muted-foreground">
                          {new Date(match.date).toLocaleDateString("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" })}
                          {match.roundNumber ? ` · MW ${match.roundNumber}` : ""}
                        </span>
                        <span className="font-medium">
                          {match.teams.home.name}{" "}
                          <span className="mx-2 font-bold">{match.status?.isFinished && match.goals.home != null ? `${match.goals.home} - ${match.goals.away}` : "vs"}</span>{" "}
                          {match.teams.away.name}
                        </span>
                        <Badge variant="outline">{match.status?.isFinished ? "จบแล้ว" : "ยังไม่แข่ง"}</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">ยังไม่มีโปรแกรมที่ 2 ทีมพบกันในฤดูกาลนี้</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
