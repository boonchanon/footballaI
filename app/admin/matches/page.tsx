"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ExternalLink, Search } from "lucide-react"

import { DataSourceBar, StateBox, TeamCell, formatThaiDateTime, useFootball, type Fixture } from "@/components/admin/football-data"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type FixturesResponse = { data: Fixture[]; source?: string; season?: string; totalMatches?: number; expectedMatches?: number }
type StatusFilter = "all" | "finished" | "upcoming" | "live"

function statusOf(match: Fixture): Exclude<StatusFilter, "all"> {
  if (match.status?.isLive) return "live"
  if (match.status?.isFinished) return "finished"
  return "upcoming"
}

const STATUS_BADGE: Record<Exclude<StatusFilter, "all">, { label: string; className: string }> = {
  finished: { label: "จบแล้ว", className: "bg-muted text-foreground" },
  upcoming: { label: "ยังไม่แข่ง", className: "bg-primary/10 text-primary" },
  live: { label: "กำลังแข่ง", className: "bg-red-500/15 text-red-600" },
}

export default function MatchesPage() {
  const fixtures = useFootball<FixturesResponse>("/api/football/fixtures?type=all&limit=380")
  const [searchQuery, setSearchQuery] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [round, setRound] = useState("all")

  const matches = fixtures.data?.data || []
  const rounds = useMemo(() => [...new Set(matches.map((match) => match.roundNumber).filter(Boolean))].sort((a, b) => Number(a) - Number(b)), [matches])
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return matches.filter((match) => {
      if (status !== "all" && statusOf(match) !== status) return false
      if (round !== "all" && String(match.roundNumber) !== round) return false
      if (!q) return true
      return `${match.teams.home.name} ${match.teams.home.nameEn || ""} ${match.teams.away.name} ${match.teams.away.nameEn || ""}`.toLowerCase().includes(q)
    })
  }, [matches, searchQuery, status, round])
  const counts = {
    total: matches.length,
    finished: matches.filter((match) => statusOf(match) === "finished").length,
    upcoming: matches.filter((match) => statusOf(match) === "upcoming").length,
    live: matches.filter((match) => statusOf(match) === "live").length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">จัดการแมตช์</h1>
          <p className="text-muted-foreground">
            โปรแกรมและผลการแข่งขันพรีเมียร์ลีก {fixtures.data?.season || ""} ทั้งหมด {counts.total}
            {fixtures.data?.expectedMatches ? ` จาก ${fixtures.data.expectedMatches}` : ""} นัด
          </p>
        </div>
        <DataSourceBar source={fixtures.data?.source} refreshing={fixtures.isValidating} onRefresh={() => void fixtures.mutate()} />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "ทั้งหมด", value: counts.total },
          { label: "จบแล้ว", value: counts.finished },
          { label: "ยังไม่แข่ง", value: counts.upcoming },
          { label: "กำลังแข่ง", value: counts.live },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-bold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>รายการแมตช์</CardTitle>
            <CardDescription>แสดง {filtered.length} นัด</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="ค้นหาทีม..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9 sm:w-52" />
            </div>
            <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
              <SelectTrigger className="sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="finished">จบแล้ว</SelectItem>
                <SelectItem value="upcoming">ยังไม่แข่ง</SelectItem>
                <SelectItem value="live">กำลังแข่ง</SelectItem>
              </SelectContent>
            </Select>
            <Select value={round} onValueChange={setRound}>
              <SelectTrigger className="sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุก Matchweek</SelectItem>
                {rounds.map((value) => (
                  <SelectItem key={String(value)} value={String(value)}>
                    Matchweek {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <StateBox loading={fixtures.isLoading} error={fixtures.error} empty={!filtered.length} emptyText="ไม่พบแมตช์ตามเงื่อนไข" />
          {filtered.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันเวลา</TableHead>
                    <TableHead>MW</TableHead>
                    <TableHead>เจ้าบ้าน</TableHead>
                    <TableHead className="text-center">ผล</TableHead>
                    <TableHead>ทีมเยือน</TableHead>
                    <TableHead>สนาม</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-right">ดู</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((match) => {
                    const state = statusOf(match)
                    return (
                      <TableRow key={String(match.id)}>
                        <TableCell className="whitespace-nowrap">{formatThaiDateTime(match.date)}</TableCell>
                        <TableCell>{match.roundNumber || "-"}</TableCell>
                        <TableCell>
                          <TeamCell team={match.teams.home} />
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {state === "upcoming" || match.goals.home == null ? "vs" : `${match.goals.home} - ${match.goals.away}`}
                        </TableCell>
                        <TableCell>
                          <TeamCell team={match.teams.away} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{match.venue?.name || "-"}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_BADGE[state].className}>{STATUS_BADGE[state].label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/matches/${match.id}`} target="_blank" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                            รายละเอียด <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
