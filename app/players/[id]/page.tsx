"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Star, MapPin, Trophy, ArrowLeft, Loader2, AlertCircle, Users } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import useSWR from "swr"
import Image from "next/image"
import { PlayerRadarChart } from "@/components/player-radar-chart"
import { PlayerShotMap } from "@/components/player-shot-map"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Mock data for when API is not available
const mockPlayer = {
  id: "1100",
  name: "เออร์ลิง ฮาลันด์",
  firstname: "Erling",
  lastname: "Haaland",
  photo: null,
  nationality: "นอร์เวย์",
  age: 24,
  height: "194 cm",
  weight: "88 kg",
  injured: false,
  birth: {
    date: "2000-07-21",
    place: "Leeds",
    country: "England",
  },
  team: {
    id: "50",
    name: "แมนเชสเตอร์ ซิตี้",
    logo: null,
  },
  position: "กองหน้า",
  statistics: {
    games: {
      appearences: 26,
      lineups: 25,
      minutes: 2340,
      rating: "8.20",
      captain: false,
    },
    goals: {
      total: 28,
      assists: 5,
      conceded: 0,
      saves: 0,
    },
    shots: {
      total: 98,
      on: 62,
    },
    passes: {
      total: 456,
      key: 25,
      accuracy: 78,
    },
    tackles: {
      total: 8,
      blocks: 2,
      interceptions: 5,
    },
    duels: {
      total: 245,
      won: 125,
    },
    dribbles: {
      attempts: 35,
      success: 18,
    },
    fouls: {
      drawn: 32,
      committed: 15,
    },
    cards: {
      yellow: 2,
      yellowred: 0,
      red: 0,
    },
    penalty: {
      won: 3,
      commited: 0,
      scored: 5,
      missed: 1,
      saved: 0,
    },
  },
  allSeasonStats: [
    {
      season: "2024",
      league: "Premier League",
      team: "แมนเชสเตอร์ ซิตี้",
      games: 26,
      goals: 28,
      assists: 5,
      rating: "8.20",
    },
    {
      season: "2023",
      league: "Premier League",
      team: "แมนเชสเตอร์ ซิตี้",
      games: 35,
      goals: 36,
      assists: 8,
      rating: "8.45",
    },
    {
      season: "2022",
      league: "Premier League",
      team: "แมนเชสเตอร์ ซิตี้",
      games: 35,
      goals: 36,
      assists: 8,
      rating: "8.30",
    },
  ],
  transfers: [],
}

const mockShots = [
  {
    id: 1,
    x: 48,
    y: 75,
    result: "goal" as const,
    type: "right_foot" as const,
    situation: "regular_play" as const,
    xG: 0.43,
    xGOT: 0.98,
    homeScore: 2,
    awayScore: 3,
  },
  {
    id: 2,
    x: 52,
    y: 70,
    result: "goal" as const,
    type: "right_foot" as const,
    situation: "regular_play" as const,
    xG: 0.35,
    xGOT: 0.72,
    homeScore: 1,
    awayScore: 2,
  },
  {
    id: 3,
    x: 45,
    y: 80,
    result: "goal" as const,
    type: "header" as const,
    situation: "corner" as const,
    xG: 0.28,
    xGOT: 0.65,
    homeScore: 3,
    awayScore: 1,
  },
  {
    id: 4,
    x: 55,
    y: 65,
    result: "goal" as const,
    type: "left_foot" as const,
    situation: "free_kick" as const,
    xG: 0.15,
    xGOT: 0.45,
    homeScore: 2,
    awayScore: 0,
  },
  {
    id: 5,
    x: 40,
    y: 55,
    result: "saved" as const,
    type: "right_foot" as const,
    situation: "regular_play" as const,
    xG: 0.22,
    xGOT: 0.0,
    homeScore: 1,
    awayScore: 1,
  },
  {
    id: 6,
    x: 60,
    y: 50,
    result: "saved" as const,
    type: "right_foot" as const,
    situation: "regular_play" as const,
    xG: 0.18,
    xGOT: 0.0,
    homeScore: 0,
    awayScore: 2,
  },
  {
    id: 7,
    x: 35,
    y: 45,
    result: "blocked" as const,
    type: "right_foot" as const,
    situation: "regular_play" as const,
    xG: 0.12,
    xGOT: 0.0,
    homeScore: 2,
    awayScore: 2,
  },
  {
    id: 8,
    x: 58,
    y: 60,
    result: "missed" as const,
    type: "header" as const,
    situation: "set_piece" as const,
    xG: 0.25,
    xGOT: 0.0,
    homeScore: 3,
    awayScore: 0,
  },
  {
    id: 9,
    x: 42,
    y: 72,
    result: "saved" as const,
    type: "right_foot" as const,
    situation: "fast_break" as const,
    xG: 0.45,
    xGOT: 0.0,
    homeScore: 1,
    awayScore: 3,
  },
  {
    id: 10,
    x: 50,
    y: 40,
    result: "missed" as const,
    type: "right_foot" as const,
    situation: "regular_play" as const,
    xG: 0.08,
    xGOT: 0.0,
    homeScore: 2,
    awayScore: 1,
  },
]

// Stat progress bar component
function StatBar({
  value,
  max,
  color = "primary",
}: { value: number; max: number; color?: "primary" | "success" | "warning" | "destructive" }) {
  const percentage = Math.min((value / max) * 100, 100)
  const colorClasses = {
    primary: "bg-primary",
    success: "bg-green-500",
    warning: "bg-amber-500",
    destructive: "bg-red-500",
  }

  return (
    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full ${colorClasses[color]} transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

// Get stat color based on percentile/value
function getStatColor(value: number, max: number): "success" | "warning" | "destructive" {
  const percentage = (value / max) * 100
  if (percentage >= 70) return "success"
  if (percentage >= 40) return "warning"
  return "destructive"
}

export default function PlayerDetailPage() {
  const params = useParams()
  const playerId = params.id as string

  const { data, isLoading, error } = useSWR(`/api/football/players/${playerId}`, fetcher)

  const player = data?.data || mockPlayer
  const hasApiData = !!data?.data

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    )
  }

  const stats = player.statistics

  const playerTraits = {
    touches: Math.max(25, Math.min(Math.round(((stats.passes.total * 1.8) / 2500) * 100), 95)),
    chancesCreated: Math.max(20, Math.min(Math.round((stats.passes.key / 50) * 100), 95)),
    shotAttempts: Math.max(20, Math.min(Math.round((stats.shots.total / 100) * 100), 95)),
    goals: Math.max(15, Math.min(Math.round((stats.goals.total / 30) * 100), 95)),
    aerialDuelsWon: stats.duels.total > 0 ? Math.max(20, Math.round((stats.duels.won / stats.duels.total) * 100)) : 40,
    defensiveContributions: Math.max(
      15,
      Math.min(Math.round(((stats.tackles.total + stats.tackles.interceptions + stats.tackles.blocks) / 80) * 100), 90),
    ),
  }

  // Season performance stats for the detailed view
  const shootingStats = [
    { label: "ประตู", value: stats.goals.total, max: 40 },
    { label: "Expected goals (xG)", value: (stats.goals.total * 0.85).toFixed(2), max: 35, isCalculated: true },
    { label: "xG on target (xGOT)", value: (stats.shots.on * 0.15).toFixed(2), max: 15, isCalculated: true },
    {
      label: "Non-penalty xG",
      value: ((stats.goals.total - stats.penalty.scored) * 0.85).toFixed(2),
      max: 30,
      isCalculated: true,
    },
    { label: "การยิงทั้งหมด", value: stats.shots.total, max: 150 },
    { label: "การยิงโดนกรอบ", value: stats.shots.on, max: 80 },
  ]

  const passingStats = [
    { label: "แอสซิสต์", value: stats.goals.assists, max: 20 },
    { label: "Expected assists (xA)", value: (stats.goals.assists * 1.1).toFixed(2), max: 18, isCalculated: true },
    { label: "พาสสำเร็จ", value: stats.passes.total, max: 2000 },
    { label: "ความแม่นยำพาส %", value: stats.passes.accuracy, max: 100, isPercentage: true },
    { label: "Key passes", value: stats.passes.key, max: 80 },
  ]

  const possessionStats = [
    { label: "เลี้ยงบอลสำเร็จ", value: stats.dribbles.success, max: 100 },
    {
      label: "เลี้ยงบอลสำเร็จ %",
      value: stats.dribbles.attempts > 0 ? ((stats.dribbles.success / stats.dribbles.attempts) * 100).toFixed(1) : 0,
      max: 100,
      isPercentage: true,
    },
    { label: "สัมผัสบอล", value: Math.round(stats.passes.total * 1.5), max: 3000 },
    { label: "ถูกแย่งบอล", value: stats.fouls.committed, max: 50 },
    { label: "ได้ฟรีคิก", value: stats.fouls.drawn, max: 60 },
  ]

  const defendingStats = [
    { label: "เข้าสกัด", value: stats.tackles.total, max: 80 },
    { label: "ดวลชนะ", value: stats.duels.won, max: 200 },
    {
      label: "ดวลชนะ %",
      value: stats.duels.total > 0 ? ((stats.duels.won / stats.duels.total) * 100).toFixed(1) : 0,
      max: 100,
      isPercentage: true,
    },
    { label: "สกัดกั้น", value: stats.tackles.interceptions, max: 50 },
    { label: "บล็อก", value: stats.tackles.blocks, max: 30 },
    { label: "กู้บอล", value: Math.round(stats.tackles.total * 2.5), max: 200 },
  ]

  const disciplineStats = [
    { label: "ใบเหลือง", value: stats.cards.yellow, max: 15 },
    { label: "ใบแดง", value: stats.cards.red, max: 3 },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-7xl mx-auto space-y-8">
          <Link
            href="/players"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับไปหน้านักเตะ
          </Link>

          {!hasApiData && (
            <div className="flex items-center gap-2 text-sm text-amber-500 bg-amber-500/10 px-3 py-2 rounded-md w-fit">
              <AlertCircle className="w-4 h-4" />
              <span>กำลังใช้ข้อมูลตัวอย่าง - เพิ่ม APIFOOTBALL_KEY เพื่อดูข้อมูลจริง</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Player Header Card - Takes 8 columns */}
            <Card className="border-border/50 overflow-hidden lg:col-span-8 flex flex-col">
              {/* Red Header with Player Info */}
              <div className="bg-gradient-to-br from-red-600 via-red-600 to-red-700 p-6 md:p-8">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Player Photo */}
                  <div className="relative shrink-0">
                    {player.photo ? (
                      <Image
                        src={player.photo || "/placeholder.svg"}
                        alt={player.name}
                        width={140}
                        height={140}
                        className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-white/10 object-cover border-4 border-white/30 shadow-xl"
                      />
                    ) : (
                      <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-white/10 flex items-center justify-center border-4 border-white/30 shadow-xl">
                        <Users className="w-14 h-14 text-white/60" />
                      </div>
                    )}
                    {player.injured && (
                      <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                        บาดเจ็บ
                      </div>
                    )}
                  </div>

                  {/* Player Name & Team */}
                  <div className="flex-1 text-center sm:text-left">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight">
                      {player.name}
                    </h1>
                    <div className="flex items-center gap-3 justify-center sm:justify-start mt-2">
                      {player.team?.logo && (
                        <Image
                          src={player.team.logo || "/placeholder.svg"}
                          alt={player.team.name}
                          width={24}
                          height={24}
                          className="w-6 h-6"
                        />
                      )}
                      <span className="text-base text-white/90 font-medium">{player.team?.name}</span>
                    </div>
                  </div>

                  {/* Follow Button */}
                  <Button
                    variant="secondary"
                    size="default"
                    className="gap-2 shrink-0 bg-white hover:bg-white/90 text-red-600 font-semibold shadow-lg"
                  >
                    <Star className="w-4 h-4" />
                    ติดตาม
                  </Button>
                </div>
              </div>

              {/* Player Details Grid - flex-1 to fill remaining space */}
              <CardContent className="p-0 flex-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-full divide-x divide-y lg:divide-y-0 divide-border/50">
                  <div className="p-4 md:p-5 flex flex-col items-center justify-center hover:bg-muted/30 transition-colors">
                    <p className="text-xl md:text-2xl font-bold text-foreground">
                      {player.height?.replace(" cm", "") || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">ส่วนสูง (cm)</p>
                  </div>
                  <div className="p-4 md:p-5 flex flex-col items-center justify-center hover:bg-muted/30 transition-colors">
                    <p className="text-xl md:text-2xl font-bold text-foreground">{stats.games.lineups || "-"}</p>
                    <p className="text-xs text-muted-foreground mt-1">เบอร์เสื้อ</p>
                  </div>
                  <div className="p-4 md:p-5 flex flex-col items-center justify-center hover:bg-muted/30 transition-colors">
                    <p className="text-xl md:text-2xl font-bold text-foreground">
                      {player.age} <span className="text-base font-normal">ปี</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{player.birth?.date || "-"}</p>
                  </div>
                  <div className="p-4 md:p-5 flex flex-col items-center justify-center hover:bg-muted/30 transition-colors">
                    <p className="text-lg md:text-xl font-bold text-foreground">{player.position}</p>
                    <p className="text-xs text-muted-foreground mt-1">ตำแหน่ง</p>
                  </div>
                  <div className="p-4 md:p-5 flex flex-col items-center justify-center hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-base md:text-lg font-bold text-foreground">{player.nationality}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">สัญชาติ</p>
                  </div>
                  <div className="p-4 md:p-5 flex flex-col items-center justify-center hover:bg-muted/30 transition-colors">
                    <p className="text-xl md:text-2xl font-bold text-foreground">
                      {player.weight?.replace(" kg", "") || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">น้ำหนัก (kg)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Player Traits Radar Chart - Takes 4 columns with same height */}
            <div className="lg:col-span-4 h-full">
              <PlayerRadarChart position={player.position} stats={playerTraits} />
            </div>
          </div>
          {/* </CHANGE> */}

          {/* Season Stats Summary */}
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                <CardTitle>Premier League 2024/2025</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-3xl font-bold text-primary">{stats.goals.total}</p>
                  <p className="text-sm text-muted-foreground">ประตู</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-3xl font-bold text-primary">{stats.goals.assists}</p>
                  <p className="text-sm text-muted-foreground">แอสซิสต์</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-3xl font-bold text-primary">{stats.games.lineups}</p>
                  <p className="text-sm text-muted-foreground">ลงสนาม</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-3xl font-bold text-primary">{stats.games.appearences}</p>
                  <p className="text-sm text-muted-foreground">แมทช์</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-3xl font-bold text-primary">{stats.games.minutes?.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">นาที</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <Badge className="text-lg px-3 py-1 bg-green-600">{stats.games.rating}</Badge>
                  <p className="text-sm text-muted-foreground mt-1">เรตติ้ง</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-center gap-1">
                    <div className="w-4 h-5 bg-yellow-400 rounded-sm" />
                    <span className="text-xl font-bold">{stats.cards.yellow}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">ใบเหลือง</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-center gap-1">
                    <div className="w-4 h-5 bg-red-500 rounded-sm" />
                    <span className="text-xl font-bold">{stats.cards.red}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">ใบแดง</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <PlayerShotMap
            shots={mockShots}
            totalShots={stats.shots.total}
            totalGoals={stats.goals.total}
            totalXG={stats.goals.total * 0.85}
            onTargetPercentage={stats.shots.total > 0 ? Math.round((stats.shots.on / stats.shots.total) * 100) : 0}
          />

          {/* Detailed Stats Tabs */}
          <Tabs defaultValue="performance" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="performance">สถิติฤดูกาล</TabsTrigger>
              <TabsTrigger value="career">สถิติอาชีพ</TabsTrigger>
              <TabsTrigger value="info">ข้อมูลส่วนตัว</TabsTrigger>
              <TabsTrigger value="transfers">ประวัติย้ายทีม</TabsTrigger>
            </TabsList>

            <TabsContent value="performance" className="space-y-6 mt-6">
              {/* Season Performance - Similar to reference image */}
              <Card className="border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Season performance</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Minutes played: {stats.games.minutes?.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Total
                      </Button>
                      <Button variant="ghost" size="sm">
                        Per 90
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Shooting */}
                  <div>
                    <h4 className="font-semibold mb-4 text-muted-foreground">Shooting</h4>
                    <div className="space-y-3">
                      {shootingStats.map((stat, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <span className="text-sm w-40 text-muted-foreground">{stat.label}</span>
                          <span className="font-bold w-16 text-right">{stat.value}</span>
                          <StatBar
                            value={typeof stat.value === "string" ? Number.parseFloat(stat.value) : stat.value}
                            max={stat.max}
                            color={getStatColor(
                              typeof stat.value === "string" ? Number.parseFloat(stat.value) : stat.value,
                              stat.max,
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Passing */}
                  <div>
                    <h4 className="font-semibold mb-4 text-muted-foreground">Passing</h4>
                    <div className="space-y-3">
                      {passingStats.map((stat, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <span className="text-sm w-40 text-muted-foreground">{stat.label}</span>
                          <span className="font-bold w-16 text-right">
                            {stat.value}
                            {stat.isPercentage ? "%" : ""}
                          </span>
                          <StatBar
                            value={typeof stat.value === "string" ? Number.parseFloat(stat.value) : stat.value}
                            max={stat.max}
                            color={getStatColor(
                              typeof stat.value === "string" ? Number.parseFloat(stat.value) : stat.value,
                              stat.max,
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Possession */}
                  <div>
                    <h4 className="font-semibold mb-4 text-muted-foreground">Possession</h4>
                    <div className="space-y-3">
                      {possessionStats.map((stat, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <span className="text-sm w-40 text-muted-foreground">{stat.label}</span>
                          <span className="font-bold w-16 text-right">
                            {stat.value}
                            {stat.isPercentage ? "%" : ""}
                          </span>
                          <StatBar
                            value={typeof stat.value === "string" ? Number.parseFloat(stat.value) : stat.value}
                            max={stat.max}
                            color={getStatColor(
                              typeof stat.value === "string" ? Number.parseFloat(stat.value) : stat.value,
                              stat.max,
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Defending */}
                  <div>
                    <h4 className="font-semibold mb-4 text-muted-foreground">Defending</h4>
                    <div className="space-y-3">
                      {defendingStats.map((stat, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <span className="text-sm w-40 text-muted-foreground">{stat.label}</span>
                          <span className="font-bold w-16 text-right">
                            {stat.value}
                            {stat.isPercentage ? "%" : ""}
                          </span>
                          <StatBar
                            value={typeof stat.value === "string" ? Number.parseFloat(stat.value) : stat.value}
                            max={stat.max}
                            color={getStatColor(
                              typeof stat.value === "string" ? Number.parseFloat(stat.value) : stat.value,
                              stat.max,
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Discipline */}
                  <div>
                    <h4 className="font-semibold mb-4 text-muted-foreground">Discipline</h4>
                    <div className="space-y-3">
                      {disciplineStats.map((stat, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <span className="text-sm w-40 text-muted-foreground">{stat.label}</span>
                          <span className="font-bold w-16 text-right">{stat.value}</span>
                          <StatBar
                            value={stat.value}
                            max={stat.max}
                            color={
                              stat.value > stat.max * 0.5
                                ? "destructive"
                                : stat.value > stat.max * 0.3
                                  ? "warning"
                                  : "success"
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="career" className="space-y-4 mt-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>สถิติตลอดอาชีพ</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-border/50 bg-muted/30">
                      <tr className="text-sm text-muted-foreground">
                        <th className="text-left py-3 px-4 font-medium">ฤดูกาล</th>
                        <th className="text-left py-3 px-4 font-medium">ลีก</th>
                        <th className="text-left py-3 px-4 font-medium">ทีม</th>
                        <th className="text-center py-3 px-3 font-medium">นัดที่เล่น</th>
                        <th className="text-center py-3 px-3 font-medium">ประตู</th>
                        <th className="text-center py-3 px-3 font-medium">แอสซิสต์</th>
                        <th className="text-center py-3 px-4 font-medium">เรตติ้ง</th>
                      </tr>
                    </thead>
                    <tbody>
                      {player.allSeasonStats?.map((season: any, i: number) => (
                        <tr key={i} className="border-b border-border/30 hover:bg-muted/50 transition-colors">
                          <td className="py-4 px-4 font-semibold">{season.season}</td>
                          <td className="py-4 px-4">{season.league}</td>
                          <td className="py-4 px-4 flex items-center gap-2">
                            {season.teamLogo && (
                              <Image
                                src={season.teamLogo || "/placeholder.svg"}
                                alt={season.team}
                                width={20}
                                height={20}
                              />
                            )}
                            {season.team}
                          </td>
                          <td className="text-center py-4 px-3">{season.games}</td>
                          <td className="text-center py-4 px-3">
                            <span className="font-bold text-primary">{season.goals}</span>
                          </td>
                          <td className="text-center py-4 px-3">{season.assists}</td>
                          <td className="text-center py-4 px-4">
                            <Badge variant={Number.parseFloat(season.rating) >= 7 ? "default" : "secondary"}>
                              {season.rating}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="info" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle>ข้อมูลส่วนตัว</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between py-2 border-b border-border/30">
                      <span className="text-muted-foreground">ชื่อเต็ม</span>
                      <span className="font-semibold">
                        {player.firstname} {player.lastname}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/30">
                      <span className="text-muted-foreground">วันเกิด</span>
                      <span className="font-semibold">{player.birth?.date || "-"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/30">
                      <span className="text-muted-foreground">อายุ</span>
                      <span className="font-semibold">{player.age} ปี</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/30">
                      <span className="text-muted-foreground">สัญชาติ</span>
                      <span className="font-semibold">{player.nationality}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/30">
                      <span className="text-muted-foreground">ส่วนสูง</span>
                      <span className="font-semibold">{player.height || "-"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/30">
                      <span className="text-muted-foreground">น้ำหนัก</span>
                      <span className="font-semibold">{player.weight || "-"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/30">
                      <span className="text-muted-foreground">บาดเจ็บ</span>
                      <span className={`font-semibold ${player.injured ? "text-red-500" : "text-green-500"}`}>
                        {player.injured ? "บาดเจ็บ" : "ปกติ"}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">สถานที่เกิด</span>
                      <span className="font-semibold">
                        {player.birth?.place || "-"}, {player.birth?.country || "-"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle>สถิติสำคัญ</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between py-2 border-b border-border/30">
                      <span className="text-muted-foreground">ตำแหน่ง</span>
                      <span className="font-semibold">{player.position}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/30">
                      <span className="text-muted-foreground">เรตติ้งเฉลี่ย</span>
                      <span className="font-semibold text-primary">{stats.games.rating}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/30">
                      <span className="text-muted-foreground">ประตูต่อนัด</span>
                      <span className="font-semibold text-primary">
                        {stats.games.appearences > 0
                          ? (stats.goals.total / stats.games.appearences).toFixed(2)
                          : "0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/30">
                      <span className="text-muted-foreground">ความแม่นยำพาส</span>
                      <span className="font-semibold">{stats.passes.accuracy}%</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/30">
                      <span className="text-muted-foreground">ดวลชนะ %</span>
                      <span className="font-semibold">
                        {stats.duels.total > 0 ? ((stats.duels.won / stats.duels.total) * 100).toFixed(1) : "0"}%
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">เลี้ยงบอลสำเร็จ %</span>
                      <span className="font-semibold">
                        {stats.dribbles.attempts > 0
                          ? ((stats.dribbles.success / stats.dribbles.attempts) * 100).toFixed(1)
                          : "0"}
                        %
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="transfers" className="space-y-4 mt-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>ประวัติการย้ายทีม</CardTitle>
                </CardHeader>
                <CardContent>
                  {player.transfers && player.transfers.length > 0 ? (
                    <div className="space-y-4">
                      {player.transfers.map((transfer: any, i: number) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-2 flex-1">
                            {transfer.from?.logo && (
                              <Image
                                src={transfer.from.logo || "/placeholder.svg"}
                                alt={transfer.from.name}
                                width={32}
                                height={32}
                              />
                            )}
                            <span className="font-medium">{transfer.from?.name}</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Badge variant="outline">{transfer.type}</Badge>
                            <span className="text-xs text-muted-foreground mt-1">{transfer.date}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <span className="font-medium">{transfer.to?.name}</span>
                            {transfer.to?.logo && (
                              <Image
                                src={transfer.to.logo || "/placeholder.svg"}
                                alt={transfer.to.name}
                                width={32}
                                height={32}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">ไม่มีข้อมูลการย้ายทีม</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
