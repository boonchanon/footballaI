"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import useSWR from "swr"
import { ArrowLeft, Clock, Shield, TrendingUp } from "lucide-react"

import { Navigation } from "@/components/navigation"
import { MatchEventsTimeline, type MatchEvent } from "@/components/match-events-timeline"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type StartingPlayer = {
  id: number
  name: string
  number: number
  position: string
  rating: number
  goals?: number
}

type SubstitutePlayer = {
  id: number
  name: string
  number: number
  position: string
  subbedIn?: number
}

type TeamSide = "home" | "away"

type PositionBucket =
  | "GK"
  | "LB"
  | "LCB"
  | "CB"
  | "RCB"
  | "RB"
  | "LWB"
  | "RWB"
  | "LDM"
  | "CDM"
  | "RDM"
  | "LM"
  | "LCM"
  | "CM"
  | "RCM"
  | "RM"
  | "LAM"
  | "CAM"
  | "RAM"
  | "LW"
  | "LF"
  | "CF"
  | "RF"
  | "RW"
  | "ST"

type PositionedPlayer = StartingPlayer & {
  bucket: PositionBucket
  x: number
  y: number
}

const BASE_COORDS: Record<PositionBucket, { x: number; y: number }> = {
  GK: { x: 8, y: 50 },
  LB: { x: 18, y: 18 },
  LCB: { x: 23, y: 36 },
  CB: { x: 24, y: 50 },
  RCB: { x: 23, y: 64 },
  RB: { x: 18, y: 82 },
  LWB: { x: 22, y: 16 },
  RWB: { x: 22, y: 84 },
  LDM: { x: 31, y: 38 },
  CDM: { x: 33, y: 50 },
  RDM: { x: 31, y: 62 },
  LM: { x: 34, y: 18 },
  LCM: { x: 36, y: 34 },
  CM: { x: 37, y: 50 },
  RCM: { x: 36, y: 66 },
  RM: { x: 34, y: 82 },
  LAM: { x: 41, y: 34 },
  CAM: { x: 43, y: 50 },
  RAM: { x: 41, y: 66 },
  LW: { x: 46, y: 20 },
  LF: { x: 47, y: 36 },
  CF: { x: 48, y: 50 },
  RF: { x: 47, y: 64 },
  RW: { x: 46, y: 80 },
  ST: { x: 48, y: 50 },
}

function mirrorX(x: number) {
  return 100 - x
}

function normalizePosition(position: string) {
  return position.trim().toUpperCase()
}

function mapPositionToBucket(position: string): PositionBucket {
  const code = normalizePosition(position)

  const direct: Partial<Record<string, PositionBucket>> = {
    GK: "GK",
    LB: "LB",
    LWB: "LWB",
    CB: "CB",
    RCB: "RCB",
    LCB: "LCB",
    RB: "RB",
    RWB: "RWB",
    CDM: "CDM",
    DM: "CDM",
    LDM: "LDM",
    RDM: "RDM",
    CM: "CM",
    LCM: "LCM",
    RCM: "RCM",
    LM: "LM",
    RM: "RM",
    CAM: "CAM",
    AM: "CAM",
    LAM: "LAM",
    RAM: "RAM",
    LW: "LW",
    RW: "RW",
    LF: "LF",
    RF: "RF",
    CF: "CF",
    ST: "ST",
    SS: "CF",
    FWD: "ST",
    FW: "ST",
  }

  if (direct[code]) return direct[code] as PositionBucket

  if (code.includes("KEEP")) return "GK"
  if (code.includes("LEFT") && code.includes("BACK")) return "LB"
  if (code.includes("RIGHT") && code.includes("BACK")) return "RB"
  if (code.includes("BACK")) return "CB"
  if (code.includes("WING") && code.includes("LEFT")) return "LW"
  if (code.includes("WING") && code.includes("RIGHT")) return "RW"
  if (code.includes("ATT") && code.includes("MID")) return "CAM"
  if (code.includes("DEF") && code.includes("MID")) return "CDM"
  if (code.includes("MID")) return "CM"
  if (code.includes("STRIK")) return "ST"
  return "CM"
}

function formationSlots(formation: string): PositionBucket[] {
  switch (formation) {
    case "4-2-3-1":
      return ["GK", "LB", "LCB", "RCB", "RB", "LDM", "RDM", "LW", "CAM", "RW", "ST"]
    case "4-4-2":
      return ["GK", "LB", "LCB", "RCB", "RB", "LM", "LCM", "RCM", "RM", "LF", "RF"]
    case "4-3-3":
    default:
      return ["GK", "LB", "LCB", "RCB", "RB", "LCM", "CDM", "RCM", "LW", "ST", "RW"]
  }
}

function bucketPriority(bucket: PositionBucket, formation: string) {
  const slots = formationSlots(formation)
  const index = slots.indexOf(bucket)
  return index === -1 ? 999 : index
}

function assignPlayersToFormation(players: StartingPlayer[], formation: string, side: TeamSide): PositionedPlayer[] {
  const slots = formationSlots(formation)
  const remaining = [...players]
  const assigned: PositionedPlayer[] = []

  for (const slot of slots) {
    const exactIndex = remaining.findIndex((player) => mapPositionToBucket(player.position) === slot)
    const compatibleIndex =
      exactIndex !== -1
        ? exactIndex
        : remaining.findIndex((player) => {
            const bucket = mapPositionToBucket(player.position)
            if (slot === "LCB" || slot === "RCB") return bucket === "CB" || bucket === slot
            if (slot === "LCM" || slot === "RCM") return bucket === "CM" || bucket === slot
            if (slot === "LF" || slot === "RF") return bucket === "ST" || bucket === "CF" || bucket === slot
            if (slot === "LDM" || slot === "RDM") return bucket === "CDM" || bucket === "CM" || bucket === slot
            return bucketPriority(bucket, formation) <= bucketPriority(slot, formation)
          })

    if (compatibleIndex === -1) continue

    const player = remaining.splice(compatibleIndex, 1)[0]
    const coord = BASE_COORDS[slot]
    assigned.push({
      ...player,
      bucket: slot,
      x: side === "home" ? coord.x : mirrorX(coord.x),
      y: coord.y,
    })
  }

  for (const player of remaining) {
    const bucket = mapPositionToBucket(player.position)
    const coord = BASE_COORDS[bucket] || BASE_COORDS.CM
    assigned.push({
      ...player,
      bucket,
      x: side === "home" ? coord.x : mirrorX(coord.x),
      y: coord.y,
    })
  }

  return assigned
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())
const THAI_TIME_ZONE = "Asia/Bangkok"

const matchDateFormatter = new Intl.DateTimeFormat("th-TH", {
  timeZone: THAI_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
})

const matchTimeFormatter = new Intl.DateTimeFormat("th-TH", {
  timeZone: THAI_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
})

function translateApiPosition(position?: string) {
  const code = normalizePosition(position || "")
  if (!code) return "CM"
  return code
}

function mapApiLineup(lineup: any) {
  if (!lineup) return null

  const starting: StartingPlayer[] = (lineup.startXI || []).map((item: any) => ({
    id: Number(item.player?.id || 0),
    name: item.player?.name || "-",
    number: Number(item.player?.number || 0),
    position: translateApiPosition(item.player?.pos || item.player?.grid?.split(":")?.[0] || "CM"),
    rating: Number(item.player?.rating || 7),
  }))

  const substitutes: SubstitutePlayer[] = (lineup.substitutes || []).map((item: any) => ({
    id: Number(item.player?.id || 0),
    name: item.player?.name || "-",
    number: Number(item.player?.number || 0),
    position: translateApiPosition(item.player?.pos || "SUB"),
  }))

  return {
    formation: lineup.formation || "4-3-3",
    manager: {
      name: lineup.coach?.name || "-",
      nationality: lineup.coach?.photo ? "API" : "-",
    },
    starting,
    substitutes,
  }
}

function mapApiEvents(events: any[], homeTeamId?: string): MatchEvent[] {
  let runningHome = 0
  let runningAway = 0

  return (events || [])
    .map((event: any, index: number) => {
      const team = String(event.team?.id || "") === String(homeTeamId || "") ? "home" : "away"
      const type = String(event.type || "").toLowerCase()
      const detail = String(event.detail || "").toLowerCase()

      if (type === "goal") {
        if (team === "home") runningHome += 1
        else runningAway += 1
        return {
          id: String(event.time?.elapsed || index),
          type: "goal" as const,
          minute: Number(event.time?.elapsed || 0),
          team,
          player: event.player?.name || "-",
          assist: event.assist?.name || undefined,
          score: { home: runningHome, away: runningAway },
          isPenalty: detail.includes("penalty"),
          isOwnGoal: detail.includes("own"),
        }
      }

      if (type === "card") {
        return {
          id: String(event.time?.elapsed || index),
          type: detail.includes("red") ? ("red_card" as const) : ("yellow_card" as const),
          minute: Number(event.time?.elapsed || 0),
          team,
          player: event.player?.name || "-",
        }
      }

      if (type === "subst") {
        return {
          id: String(event.time?.elapsed || index),
          type: "substitution" as const,
          minute: Number(event.time?.elapsed || 0),
          team,
          playerOut: event.player?.name || "-",
          playerIn: event.assist?.name || "-",
        }
      }

      return null
    })
    .filter(Boolean) as MatchEvent[]
}

export default function MatchDetailPage() {
  const params = useParams()
  const matchId = params.id as string
  const { data: fixturesData } = useSWR("/api/football/fixtures?type=all", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })
  const { data: eventsData } = useSWR(matchId ? `/api/football/events/${matchId}` : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })
  const { data: lineupsData } = useSWR(matchId ? `/api/football/lineups/${matchId}` : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  const mockMatch = {
    id: matchId,
    round: 28,
    homeTeam: "แมนเชสเตอร์ ซิตี้",
    awayTeam: "ลิเวอร์พูล",
    homeScore: 2,
    awayScore: 1,
    date: "8 มี.ค. 2025",
    time: "22:30",
    stadium: "เอติฮัด สเตเดี้ยม",
    attendance: "53,400",
    referee: "ไมเคิล โอลิเวอร์",
  }

  const mockMatchEvents: MatchEvent[] = [
    { id: "1", type: "yellow_card", minute: 29, team: "away", player: "Lewis Dunk" },
    { id: "2", type: "yellow_card", minute: 41, team: "away", player: "Pascal Gross" },
    { id: "3", type: "yellow_card", minute: 41, team: "home", player: "Pep Guardiola", role: "Coach" },
    { id: "4", type: "goal", minute: 41, team: "home", player: "Erling Haaland", score: { home: 1, away: 0 }, isPenalty: true },
    { id: "5", type: "yellow_card", minute: 53, team: "away", player: "Jan Paul van Hecke" },
    { id: "6", type: "goal", minute: 60, team: "away", player: "Kaoru Mitoma", assist: "Yasin Ayari", score: { home: 1, away: 1 } },
    { id: "7", type: "yellow_card", minute: 60, team: "away", player: "Maxim De Cuyper" },
    { id: "8", type: "yellow_card", minute: 60, team: "home", player: "Gianluigi Donnarumma" },
    { id: "9", type: "substitution", minute: 64, team: "home", playerOut: "Rodri", playerIn: "Nico Gonzalez" },
  ]

  const mockHomeLineup = {
    formation: "4-3-3",
    manager: { name: "เป๊ป กวาร์ดิโอล่า", nationality: "สเปน" },
    starting: [
      { id: 1100, name: "เอแดร์ซอน", number: 31, position: "GK", rating: 7.5 },
      { id: 1101, name: "วอล์คเกอร์", number: 2, position: "RB", rating: 7.8 },
      { id: 1102, name: "ดิอาส", number: 3, position: "CB", rating: 8.2 },
      { id: 1103, name: "อาคานจี", number: 25, position: "CB", rating: 7.9 },
      { id: 1104, name: "อาเก้", number: 21, position: "LB", rating: 7.6 },
      { id: 1105, name: "โรดรี้", number: 16, position: "CDM", rating: 8.5 },
      { id: 1106, name: "เดอ บรอยน์", number: 17, position: "RCM", rating: 8.8 },
      { id: 1107, name: "กุนโดกัน", number: 19, position: "LCM", rating: 7.7 },
      { id: 1108, name: "โฟเด้น", number: 47, position: "RW", rating: 7.9 },
      { id: 1109, name: "ฮาแลนด์", number: 9, position: "ST", rating: 9.2, goals: 2 },
      { id: 1110, name: "กรีลิช", number: 10, position: "LW", rating: 7.4 },
    ] satisfies StartingPlayer[],
    substitutes: [
      { id: 1111, name: "ออร์เตก้า", number: 18, position: "GK" },
      { id: 1112, name: "สโตนส์", number: 5, position: "DEF" },
      { id: 1113, name: "คัลวิน ฟิลลิปส์", number: 6, position: "MID" },
      { id: 1114, name: "แบร์นาโด้ ซิลวา", number: 20, position: "MID", subbedIn: 75 },
      { id: 1115, name: "อัลวาเรซ", number: 19, position: "FWD" },
    ] satisfies SubstitutePlayer[],
  }

  const mockAwayLineup = {
    formation: "4-3-3",
    manager: { name: "เจอร์เกน คล็อปป์", nationality: "เยอรมัน" },
    starting: [
      { id: 1200, name: "อลิสซง", number: 1, position: "GK", rating: 7.2 },
      { id: 1201, name: "อเล็กซานเดอร์-อาร์โนลด์", number: 66, position: "RB", rating: 7.5 },
      { id: 1202, name: "โคนาเต้", number: 5, position: "RCB", rating: 6.8 },
      { id: 1203, name: "ฟาน ไดค์", number: 4, position: "LCB", rating: 7.3 },
      { id: 1204, name: "โรเบิร์ตสัน", number: 26, position: "LB", rating: 7.0 },
      { id: 1205, name: "แม็ค อัลลิสเตอร์", number: 10, position: "CDM", rating: 7.4 },
      { id: 1206, name: "โซบอสไล", number: 8, position: "RCM", rating: 7.1 },
      { id: 1207, name: "โจนส์", number: 17, position: "LCM", rating: 6.9 },
      { id: 1208, name: "ซาลาห์", number: 11, position: "RW", rating: 8.1, goals: 1 },
      { id: 1209, name: "นูนเญซ", number: 9, position: "ST", rating: 6.7 },
      { id: 1210, name: "ดิอาซ", number: 7, position: "LW", rating: 7.2 },
    ] satisfies StartingPlayer[],
    substitutes: [
      { id: 1211, name: "เคลเลเฮอร์", number: 62, position: "GK" },
      { id: 1212, name: "ซิมิคาส", number: 21, position: "DEF" },
      { id: 1213, name: "กราเฟนแบร์ก", number: 38, position: "MID", subbedIn: 68 },
      { id: 1214, name: "เอลเลียตต์", number: 19, position: "MID" },
      { id: 1215, name: "กัคโป", number: 18, position: "FWD", subbedIn: 82 },
    ] satisfies SubstitutePlayer[],
  }

  const liveFixture = (fixturesData?.data || []).find((fixture: any) => String(fixture.id) === String(matchId))
  const liveHomeLineup = mapApiLineup((lineupsData?.data || [])[0])
  const liveAwayLineup = mapApiLineup((lineupsData?.data || [])[1])

  const match = liveFixture
    ? {
        id: String(liveFixture.id),
        round: liveFixture.roundNumber || 0,
        homeTeam: liveFixture.teams?.home?.name || "-",
        awayTeam: liveFixture.teams?.away?.name || "-",
        homeScore: liveFixture.goals?.home ?? 0,
        awayScore: liveFixture.goals?.away ?? 0,
        date: matchDateFormatter.format(new Date(liveFixture.date)),
        time: matchTimeFormatter.format(new Date(liveFixture.date)),
        stadium: liveFixture.venue?.name || "สนามแข่งขัน",
        attendance: "-",
        referee: "-",
      }
    : mockMatch

  const matchEvents: MatchEvent[] =
    eventsData?.data?.length ? mapApiEvents(eventsData.data, liveFixture?.teams?.home?.id) : mockMatchEvents

  const homeLineup = liveHomeLineup || mockHomeLineup
  const awayLineup = liveAwayLineup || mockAwayLineup

  const homePlayers = assignPlayersToFormation(homeLineup.starting, homeLineup.formation, "home")
  const awayPlayers = assignPlayersToFormation(awayLineup.starting, awayLineup.formation, "away")

  const PlayerCard = ({ player, team }: { player: PositionedPlayer; team: TeamSide }) => {
    const accent = team === "home" ? "text-primary" : "text-destructive"

    return (
      <Link
        href={`/players/${player.id}`}
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${player.x}%`, top: `${player.y}%` }}
      >
        <div className="group flex flex-col items-center gap-1.5">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-background/95 text-xs font-bold text-foreground shadow-lg transition-transform group-hover:scale-110">
              {player.number}
            </div>
            {player.goals ? (
              <div className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
                {player.goals}
              </div>
            ) : null}
          </div>
          <div className="rounded-lg border border-white/15 bg-background/92 px-2.5 py-1.5 text-center shadow-md backdrop-blur-sm">
            <div className="max-w-[92px] truncate text-[11px] font-medium leading-tight text-foreground">{player.name}</div>
            <div className={`mt-1 flex items-center justify-center gap-1 text-[10px] font-semibold ${accent}`}>
              <TrendingUp className="h-3 w-3" />
              <span>{player.rating}</span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  const SubstituteCard = ({ sub, teamColor }: { sub: SubstitutePlayer; teamColor: "primary" | "destructive" }) => (
    <Link
      href={`/players/${sub.id}`}
      className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-3.5 transition-colors hover:bg-muted"
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
          teamColor === "primary" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
        }`}
      >
        {sub.number}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{sub.name}</div>
        <div className="text-xs text-muted-foreground">{sub.position}</div>
      </div>
      {sub.subbedIn ? (
        <Badge variant="secondary" className="text-xs">
          ↑ {sub.subbedIn}'
        </Badge>
      ) : null}
    </Link>
  )

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-10 lg:py-12">
        <div className="mx-auto max-w-6xl space-y-6">
          <Link href="/matches" className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            กลับไปหน้าแมตช์
          </Link>

          <Card className="border-border/50 shadow-lg">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-sm">
                  FT
                </Badge>
                <Badge variant="outline" className="text-sm">
                  นัดที่ {match.round}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-8">
                <div className="flex flex-1 items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-display lg:text-2xl">{match.homeTeam}</h2>
                </div>
                <div className="flex items-center gap-5">
                  <span className="text-4xl font-bold text-primary lg:text-5xl">{match.homeScore}</span>
                  <span className="text-2xl font-bold text-muted-foreground lg:text-3xl">-</span>
                  <span className="text-4xl font-bold text-destructive lg:text-5xl">{match.awayScore}</span>
                </div>
                <div className="flex flex-1 items-center justify-end gap-4">
                  <h2 className="text-right text-xl font-display lg:text-2xl">{match.awayTeam}</h2>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-destructive/20 to-destructive/10">
                    <Shield className="h-8 w-8 text-destructive" />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 border-t pt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    {match.date} • {match.time}
                  </span>
                </div>
                <span>{match.stadium}</span>
                <span>ผู้ชม: {match.attendance}</span>
              </div>
            </CardHeader>
          </Card>

          <Tabs defaultValue="lineup" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="facts">ข้อมูล</TabsTrigger>
              <TabsTrigger value="events">เหตุการณ์</TabsTrigger>
              <TabsTrigger value="lineup">ไลน์อัป</TabsTrigger>
              <TabsTrigger value="table">ตาราง</TabsTrigger>
              <TabsTrigger value="stats">สถิติ</TabsTrigger>
              <TabsTrigger value="h2h">ดวลกัน</TabsTrigger>
            </TabsList>

            <TabsContent value="facts" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="text-xl font-display">ข้อมูลการแข่งขัน</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">สนามแข่งขัน</span>
                    <span className="font-medium">{match.stadium}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">ผู้เข้าชม</span>
                    <span className="font-medium">{match.attendance}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">ผู้ตัดสิน</span>
                    <span className="font-medium">{match.referee}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="events" className="mt-6 space-y-6">
              <Card className="border-border/50">
                <CardContent className="p-0">
                  <MatchEventsTimeline
                    events={matchEvents}
                    homeTeam={match.homeTeam}
                    awayTeam={match.awayTeam}
                    halfTimeScore={{ home: 1, away: 0 }}
                    fullTimeScore={{ home: 1, away: 1 }}
                    firstHalfAddedTime={4}
                    secondHalfAddedTime={5}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lineup" className="mt-6">
              <Card className="overflow-hidden border-border/50 shadow-md">
                <CardHeader className="border-b border-border/50 bg-muted/30 px-5 py-5 md:px-6 md:py-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="h-7 w-7 text-primary" />
                      <div>
                        <h3 className="text-lg font-display lg:text-xl">{match.homeTeam}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">แผน {homeLineup.formation}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="self-start lg:self-auto">
                      มุมมองไลน์อัป
                    </Badge>
                    <div className="flex items-center gap-3 lg:flex-row-reverse">
                      <Shield className="h-7 w-7 text-destructive" />
                      <div className="lg:text-right">
                        <h3 className="text-lg font-display lg:text-xl">{match.awayTeam}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">แผน {awayLineup.formation}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="bg-card/30 p-3 md:p-4">
                    <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-gradient-to-b from-emerald-700 to-emerald-600 shadow-inner">
                      <div className="absolute inset-0">
                      <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white/20" />
                      <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20" />
                      <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/25" />
                      <div className="absolute left-0 top-1/2 h-40 w-24 -translate-y-1/2 rounded-r-3xl border-2 border-l-0 border-white/20" />
                      <div className="absolute right-0 top-1/2 h-40 w-24 -translate-y-1/2 rounded-l-3xl border-2 border-r-0 border-white/20" />
                      <div className="absolute left-0 top-1/2 h-20 w-10 -translate-y-1/2 rounded-r-xl border-2 border-l-0 border-white/20" />
                      <div className="absolute right-0 top-1/2 h-20 w-10 -translate-y-1/2 rounded-l-xl border-2 border-r-0 border-white/20" />
                      </div>

                      {homePlayers.map((player) => (
                        <PlayerCard key={player.id} player={player} team="home" />
                      ))}
                      {awayPlayers.map((player) => (
                        <PlayerCard key={player.id} player={player} team="away" />
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-0 border-t border-border/50 bg-card lg:grid-cols-3">
                    <div className="border-b border-border/50 p-5 md:p-6 lg:border-b-0 lg:border-r">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15">
                          <span className="text-base">👔</span>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Head Coach</p>
                          <p className="font-semibold">{homeLineup.manager.name}</p>
                          <p className="text-xs text-muted-foreground">{homeLineup.manager.nationality}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-b border-border/50 p-5 text-center md:p-6 lg:border-b-0 lg:border-r">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Coach Zone</p>
                      <p className="mt-2 font-semibold text-muted-foreground">โค้ช</p>
                    </div>

                    <div className="p-5 md:p-6 lg:text-right">
                      <div className="flex items-center gap-3 lg:flex-row-reverse">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/15">
                          <span className="text-base">👔</span>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Head Coach</p>
                          <p className="font-semibold">{awayLineup.manager.name}</p>
                          <p className="text-xs text-muted-foreground">{awayLineup.manager.nationality}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-0 border-t border-border/50 lg:grid-cols-2">
                    <div className="border-b border-border/50 p-5 md:p-6 lg:border-b-0 lg:border-r">
                      <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                        <div className="h-4 w-1 rounded bg-primary" />
                        ตัวสำรอง {match.homeTeam}
                      </h4>
                      <div className="grid gap-2.5">
                        {homeLineup.substitutes.map((sub) => (
                          <SubstituteCard key={sub.id} sub={sub} teamColor="primary" />
                        ))}
                      </div>
                    </div>

                    <div className="p-5 md:p-6">
                      <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                        <div className="h-4 w-1 rounded bg-destructive" />
                        ตัวสำรอง {match.awayTeam}
                      </h4>
                      <div className="grid gap-2.5">
                        {awayLineup.substitutes.map((sub) => (
                          <SubstituteCard key={sub.id} sub={sub} teamColor="destructive" />
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="table" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="text-xl font-display">ตารางคะแนน</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">ตารางคะแนนจะแสดงที่นี่</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="text-xl font-display">สถิติการแข่งขัน</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">สถิติการแข่งขันจะแสดงที่นี่</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="h2h" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="text-xl font-display">ประวัติการพบกัน</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">ประวัติการพบกันจะแสดงที่นี่</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
