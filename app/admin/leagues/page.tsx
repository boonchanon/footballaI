"use client"

import { useMemo, useState } from "react"
import { Calendar, Search, Trophy, Users } from "lucide-react"

import { DataSourceBar, StateBox, TeamCell, useFootball, type Fixture, type StandingRow } from "@/components/admin/football-data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type StandingsResponse = { data: StandingRow[]; season?: string; source?: string; lastUpdated?: string }
type FixturesResponse = { data: Fixture[]; totalMatches?: number; expectedMatches?: number; rounds?: unknown[] }

export default function LeaguesPage() {
  const standings = useFootball<StandingsResponse>("/api/football/standings")
  const fixtures = useFootball<FixturesResponse>("/api/football/fixtures?type=all&limit=380")
  const [searchQuery, setSearchQuery] = useState("")

  const rows = standings.data?.data || []
  const matches = fixtures.data?.data || []
  const finished = matches.filter((match) => match.status?.isFinished)
  const lastRound = finished.reduce((max, match) => Math.max(max, match.roundNumber || 0), 0)
  const goals = finished.reduce((sum, match) => sum + (match.goals.home || 0) + (match.goals.away || 0), 0)
  const filtered = useMemo(
    () => rows.filter((row) => `${row.team.name} ${row.team.nameEn || ""}`.toLowerCase().includes(searchQuery.trim().toLowerCase())),
    [rows, searchQuery],
  )

  const stats = [
    { label: "ฤดูกาล", value: standings.data?.season || "-", icon: Calendar },
    { label: "ทีม", value: rows.length ? String(rows.length) : "-", icon: Users },
    { label: "แข่งแล้ว", value: matches.length ? `${finished.length} / ${fixtures.data?.expectedMatches || matches.length} นัด` : "-", icon: Trophy },
    { label: "นัดล่าสุดที่แข่งจบ", value: lastRound ? `Matchweek ${lastRound}` : "-", icon: Calendar },
    { label: "ประตูรวม", value: finished.length ? `${goals} (${(goals / finished.length).toFixed(2)}/นัด)` : "-", icon: Trophy },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">จัดการลีก</h1>
          <p className="text-muted-foreground">พรีเมียร์ลีก ข้อมูลจริงที่ซิงก์จากผู้ให้บริการข้อมูลฟุตบอล</p>
        </div>
        <DataSourceBar
          source={standings.data?.source}
          updatedAt={standings.data?.lastUpdated}
          refreshing={standings.isValidating || fixtures.isValidating}
          onRefresh={() => {
            void standings.mutate()
            void fixtures.mutate()
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="font-bold">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>ตารางคะแนนพรีเมียร์ลีก</CardTitle>
            <CardDescription>อันดับ แต้ม และผลงานของทุกทีมในฤดูกาลปัจจุบัน</CardDescription>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="ค้นหาทีม..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          <StateBox loading={standings.isLoading} error={standings.error} empty={!filtered.length} emptyText="ไม่พบทีม" />
          {filtered.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>ทีม</TableHead>
                    <TableHead className="text-right">แข่ง</TableHead>
                    <TableHead className="text-right">ชนะ</TableHead>
                    <TableHead className="text-right">เสมอ</TableHead>
                    <TableHead className="text-right">แพ้</TableHead>
                    <TableHead className="text-right">ได้</TableHead>
                    <TableHead className="text-right">เสีย</TableHead>
                    <TableHead className="text-right">+/-</TableHead>
                    <TableHead className="text-right">แต้ม</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.team.id}>
                      <TableCell className="font-semibold">{row.rank}</TableCell>
                      <TableCell>
                        <TeamCell team={row.team} />
                      </TableCell>
                      <TableCell className="text-right">{row.all.played}</TableCell>
                      <TableCell className="text-right">{row.all.win}</TableCell>
                      <TableCell className="text-right">{row.all.draw}</TableCell>
                      <TableCell className="text-right">{row.all.lose}</TableCell>
                      <TableCell className="text-right">{row.all.goals.for}</TableCell>
                      <TableCell className="text-right">{row.all.goals.against}</TableCell>
                      <TableCell className="text-right">{row.goalsDiff > 0 ? `+${row.goalsDiff}` : row.goalsDiff}</TableCell>
                      <TableCell className="text-right font-bold">{row.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
