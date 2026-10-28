"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"

import { DataSourceBar, StateBox, useFootball, type ApiTeam } from "@/components/admin/football-data"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type TeamsResponse = { data: Array<{ team: ApiTeam }>; source?: string }
type Player = { id: string; name: string; position?: string; number?: number | null; age?: number | null; nationality?: string; photo?: string }
type TeamDetailResponse = { data: ApiTeam & { players?: Player[]; coach?: { name?: string } | string | null; stadium?: string }; source?: string }

const POSITION_TH: Record<string, string> = { Goalkeepers: "ผู้รักษาประตู", Defenders: "กองหลัง", Midfielders: "กองกลาง", Forwards: "กองหน้า" }

export default function PlayersPage() {
  const teams = useFootball<TeamsResponse>("/api/football/teams")
  const teamList = useMemo(() => [...(teams.data?.data || [])].sort((a, b) => a.team.name.localeCompare(b.team.name)), [teams.data])
  const [teamId, setTeamId] = useState("")
  const selectedId = teamId || teamList[0]?.team.id || ""
  const detail = useFootball<TeamDetailResponse>(selectedId ? `/api/football/team/${selectedId}` : null)
  const [searchQuery, setSearchQuery] = useState("")
  const [position, setPosition] = useState("all")

  const squad = detail.data?.data?.players || []
  const positions = [...new Set(squad.map((player) => player.position).filter(Boolean))] as string[]
  const filtered = squad.filter((player) => {
    if (position !== "all" && player.position !== position) return false
    return player.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">จัดการนักเตะ</h1>
          <p className="text-muted-foreground">รายชื่อนักเตะในทีมพรีเมียร์ลีก เลือกทีมเพื่อดูขุมกำลัง</p>
        </div>
        <DataSourceBar source={detail.data?.source || teams.data?.source} refreshing={detail.isValidating} onRefresh={() => void detail.mutate()} />
      </div>

      <Card>
        <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>{detail.data?.data?.name || "รายชื่อนักเตะ"}</CardTitle>
            <CardDescription>
              {squad.length ? `${squad.length} คน` : ""}
              {positions.length ? ` · ${positions.map((p) => `${POSITION_TH[p] || p} ${squad.filter((x) => x.position === p).length}`).join(" · ")}` : ""}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={selectedId} onValueChange={setTeamId}>
              <SelectTrigger className="sm:w-56" aria-label="เลือกทีม">
                <SelectValue placeholder="เลือกทีม" />
              </SelectTrigger>
              <SelectContent>
                {teamList.map(({ team }) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={position} onValueChange={setPosition}>
              <SelectTrigger className="sm:w-40" aria-label="ตำแหน่ง">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกตำแหน่ง</SelectItem>
                {positions.map((value) => (
                  <SelectItem key={value} value={value}>
                    {POSITION_TH[value] || value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="ค้นหานักเตะ..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9 sm:w-48" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <StateBox loading={teams.isLoading || detail.isLoading} error={teams.error || detail.error} empty={!filtered.length} emptyText="ไม่พบนักเตะ" />
          {filtered.length && !detail.isLoading ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">เบอร์</TableHead>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead>ตำแหน่ง</TableHead>
                    <TableHead className="text-right">อายุ</TableHead>
                    <TableHead>สัญชาติ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell className="font-semibold">{player.number ?? "-"}</TableCell>
                      <TableCell className="font-medium">{player.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{POSITION_TH[player.position || ""] || player.position || "-"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{player.age ?? "-"}</TableCell>
                      <TableCell>{player.nationality || "-"}</TableCell>
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
