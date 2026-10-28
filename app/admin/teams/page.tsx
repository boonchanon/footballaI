"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ExternalLink, Search } from "lucide-react"

import { DataSourceBar, StateBox, TeamCell, useFootball, type ApiTeam, type Fixture, type StandingRow } from "@/components/admin/football-data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type TeamsResponse = { data: Array<{ team: ApiTeam; venue?: { name?: string; city?: string } }>; source?: string }
type StandingsResponse = { data: StandingRow[]; lastUpdated?: string }
type FixturesResponse = { data: Fixture[] }

// Last five finished results of a team, newest last: W / D / L.
function recentForm(teamId: string, fixtures: Fixture[]) {
  return fixtures
    .filter((match) => match.status?.isFinished && (match.teams.home.id === teamId || match.teams.away.id === teamId))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-5)
    .map((match) => {
      const home = match.teams.home.id === teamId
      const scored = (home ? match.goals.home : match.goals.away) ?? 0
      const conceded = (home ? match.goals.away : match.goals.home) ?? 0
      return scored > conceded ? "W" : scored < conceded ? "L" : "D"
    })
}

const FORM_COLOR: Record<string, string> = { W: "bg-green-600", D: "bg-gray-400", L: "bg-red-500" }

export default function TeamsPage() {
  const teams = useFootball<TeamsResponse>("/api/football/teams")
  const standings = useFootball<StandingsResponse>("/api/football/standings")
  const fixtures = useFootball<FixturesResponse>("/api/football/fixtures?type=all&limit=380")
  const [searchQuery, setSearchQuery] = useState("")

  const standingByTeam = useMemo(() => new Map((standings.data?.data || []).map((row) => [row.team.id, row])), [standings.data])
  const rows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return (teams.data?.data || [])
      .map((item) => ({ ...item, standing: standingByTeam.get(item.team.id) }))
      .filter((item) => `${item.team.name} ${item.team.nameEn || ""}`.toLowerCase().includes(q))
      .sort((a, b) => (a.standing?.rank || 99) - (b.standing?.rank || 99))
  }, [teams.data, standingByTeam, searchQuery])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">จัดการทีม</h1>
          <p className="text-muted-foreground">ทีมในพรีเมียร์ลีกฤดูกาลปัจจุบัน {rows.length ? `${teams.data?.data.length} ทีม` : ""}</p>
        </div>
        <DataSourceBar
          source={teams.data?.source}
          updatedAt={standings.data?.lastUpdated}
          refreshing={teams.isValidating}
          onRefresh={() => {
            void teams.mutate()
            void standings.mutate()
            void fixtures.mutate()
          }}
        />
      </div>

      <Card>
        <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>รายชื่อทีม</CardTitle>
            <CardDescription>อันดับ แต้ม ผลงาน 5 นัดล่าสุด และลิงก์ไปหน้าทีม (รายชื่อนักเตะดูได้ที่หน้าจัดการนักเตะ)</CardDescription>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="ค้นหาทีม..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          <StateBox loading={teams.isLoading} error={teams.error} empty={!rows.length} emptyText="ไม่พบทีม" />
          {rows.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ทีม</TableHead>
                    <TableHead className="text-right">อันดับ</TableHead>
                    <TableHead className="text-right">แข่ง</TableHead>
                    <TableHead className="text-right">ชนะ-เสมอ-แพ้</TableHead>
                    <TableHead className="text-right">ได้-เสีย</TableHead>
                    <TableHead className="text-right">แต้ม</TableHead>
                    <TableHead>5 นัดล่าสุด</TableHead>
                    <TableHead className="text-right">ดู</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ team, standing }) => (
                    <TableRow key={team.id}>
                      <TableCell>
                        <TeamCell team={team} />
                      </TableCell>
                      <TableCell className="text-right font-semibold">{standing?.rank ?? "-"}</TableCell>
                      <TableCell className="text-right">{standing?.all.played ?? "-"}</TableCell>
                      <TableCell className="text-right">{standing ? `${standing.all.win}-${standing.all.draw}-${standing.all.lose}` : "-"}</TableCell>
                      <TableCell className="text-right">{standing ? `${standing.all.goals.for}-${standing.all.goals.against}` : "-"}</TableCell>
                      <TableCell className="text-right font-bold">{standing?.points ?? "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {recentForm(team.id, fixtures.data?.data || []).map((result, index) => (
                            <span key={index} className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white ${FORM_COLOR[result]}`}>
                              {result}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/teams/${team.id}`} target="_blank" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                          หน้าทีม <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </TableCell>
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
