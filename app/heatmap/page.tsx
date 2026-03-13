"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Activity, Zap, Route, Target, Timer, Footprints, ChevronRight } from "lucide-react"
import { useState, useEffect, useRef } from "react"

function FootballPitch({ heatmapData }: { heatmapData: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw pitch gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, "#1a472a")
    gradient.addColorStop(0.5, "#2d5a3d")
    gradient.addColorStop(1, "#1a472a")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Draw pitch lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"
    ctx.lineWidth = 2

    // Outer boundary
    ctx.strokeRect(20, 20, width - 40, height - 40)

    // Center line
    ctx.beginPath()
    ctx.moveTo(width / 2, 20)
    ctx.lineTo(width / 2, height - 20)
    ctx.stroke()

    // Center circle
    ctx.beginPath()
    ctx.arc(width / 2, height / 2, 50, 0, Math.PI * 2)
    ctx.stroke()

    // Center dot
    ctx.beginPath()
    ctx.arc(width / 2, height / 2, 4, 0, Math.PI * 2)
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
    ctx.fill()

    // Left penalty area
    ctx.strokeRect(20, height / 2 - 80, 80, 160)
    ctx.strokeRect(20, height / 2 - 40, 30, 80)

    // Right penalty area
    ctx.strokeRect(width - 100, height / 2 - 80, 80, 160)
    ctx.strokeRect(width - 50, height / 2 - 40, 30, 80)

    // Draw heatmap if data exists
    if (heatmapData) {
      // Generate random heatmap points based on player position
      const points: { x: number; y: number; intensity: number }[] = []
      const isAttacker = heatmapData.player.position === "กองหน้า"
      const isMidfielder = heatmapData.player.position === "กองกลาง"

      // Generate heat points based on position
      for (let i = 0; i < 100; i++) {
        let x, y
        if (isAttacker) {
          x = width * 0.5 + Math.random() * width * 0.4
          y = height * 0.2 + Math.random() * height * 0.6
        } else if (isMidfielder) {
          x = width * 0.25 + Math.random() * width * 0.5
          y = height * 0.15 + Math.random() * height * 0.7
        } else {
          x = width * 0.1 + Math.random() * width * 0.4
          y = height * 0.15 + Math.random() * height * 0.7
        }
        points.push({ x, y, intensity: Math.random() })
      }

      // Draw heatmap
      points.forEach((point) => {
        const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 30 + point.intensity * 20)
        gradient.addColorStop(0, `rgba(212, 165, 116, ${0.4 * point.intensity})`)
        gradient.addColorStop(0.5, `rgba(239, 68, 68, ${0.2 * point.intensity})`)
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)")
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(point.x, point.y, 30 + point.intensity * 20, 0, Math.PI * 2)
        ctx.fill()
      })
    }
  }, [heatmapData])

  return <canvas ref={canvasRef} width={600} height={400} className="w-full h-auto rounded-xl shadow-2xl" />
}

function StatCard({
  icon: Icon,
  value,
  label,
  highlight = false,
}: {
  icon: any
  value: string
  label: string
  highlight?: boolean
}) {
  return (
    <div
      className={`
      relative overflow-hidden rounded-xl p-4
      ${highlight ? "bg-primary/20 border border-primary/30" : "bg-card/50 border border-border/50"}
      transition-all duration-300 hover:scale-105 hover:border-primary/50
    `}
    >
      <Icon className={`w-5 h-5 mb-2 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
      <div className={`text-2xl font-bold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  )
}

function MatchItem({ match, onSelect }: { match: any; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="group w-full text-left p-4 rounded-xl bg-card/30 border border-border/30 
                 hover:border-primary/50 hover:bg-card/60 transition-all duration-300"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-xs text-muted-foreground mb-2">{match.date}</div>
          <div className="flex items-center gap-3">
            <span className="font-medium text-sm">{match.home}</span>
            <span className="text-lg font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">{match.score}</span>
            <span className="font-medium text-sm">{match.away}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-2">{match.stadium}</div>
        </div>
        <ChevronRight
          className="w-5 h-5 text-muted-foreground group-hover:text-primary 
                                 group-hover:translate-x-1 transition-all"
        />
      </div>
    </button>
  )
}

export default function HeatmapPage() {
  const [selectedTeam, setSelectedTeam] = useState("")
  const [selectedPlayer, setSelectedPlayer] = useState("")
  const [heatmapData, setHeatmapData] = useState<any>(null)
  const [selectedMatch, setSelectedMatch] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const recentMatches = [
    {
      id: "1",
      home: "แมนเชสเตอร์ ซิตี้",
      away: "ลิเวอร์พูล",
      score: "2-1",
      date: "15 ม.ค. 2026",
      time: "22:00",
      stadium: "เอติฮัด สเตเดียม",
    },
    {
      id: "2",
      home: "อาร์เซนอล",
      away: "เชลซี",
      score: "3-2",
      date: "12 ม.ค. 2026",
      time: "19:30",
      stadium: "เอมิเรตส์ สเตเดียม",
    },
    {
      id: "3",
      home: "แมนเชสเตอร์ ยูไนเต็ด",
      away: "ท็อตแน่ม",
      score: "1-1",
      date: "10 ม.ค. 2026",
      time: "21:00",
      stadium: "โอลด์ แทรฟฟอร์ด",
    },
    {
      id: "4",
      home: "นิวคาสเซิล",
      away: "แอสตัน วิลล่า",
      score: "2-0",
      date: "8 ม.ค. 2026",
      time: "20:00",
      stadium: "เซนต์ เจมส์ พาร์ค",
    },
  ]

  const playersByTeam: Record<
    string,
    Array<{ id: string; name: string; position: string; number: number; image?: string }>
  > = {
    "แมนเชสเตอร์ ซิตี้": [
      { id: "1", name: "เออร์ลิง ฮาลันด์", position: "กองหน้า", number: 9 },
      { id: "2", name: "เควิน เดอ บรอยน์", position: "กองกลาง", number: 17 },
      { id: "3", name: "ฟิล โฟเด้น", position: "กองกลาง", number: 47 },
    ],
    ลิเวอร์พูล: [
      { id: "5", name: "โมฮาเหม็ด ซาลาห์", position: "กองหน้า", number: 11 },
      { id: "6", name: "ดาร์วิน นูนเญซ", position: "กองหน้า", number: 9 },
    ],
    อาร์เซนอล: [
      { id: "9", name: "บูคาโย่ ซากา", position: "กองหน้า", number: 7 },
      { id: "10", name: "มาร์ติน เอเดการ์ด", position: "กองกลาง", number: 8 },
    ],
    เชลซี: [
      { id: "12", name: "โคล พาล์มเมอร์", position: "กองกลาง", number: 20 },
      { id: "13", name: "นิโคลัส แจ็คสัน", position: "กองหน้า", number: 15 },
    ],
    "แมนเชสเตอร์ ยูไนเต็ด": [
      { id: "14", name: "บรูโน่ แฟร์นันด์ส", position: "กองกลาง", number: 8 },
      { id: "15", name: "มาร์คัส แรชฟอร์ด", position: "กองหน้า", number: 10 },
    ],
    ท็อตแน่ม: [
      { id: "16", name: "ซน ฮึง-มิน", position: "กองหน้า", number: 7 },
      { id: "17", name: "เจมส์ แมดดิสัน", position: "กองกลาง", number: 10 },
    ],
    นิวคาสเซิล: [
      { id: "18", name: "อเล็กซานเดอร์ อิซัค", position: "กองหน้า", number: 14 },
      { id: "19", name: "บรูโน่ กิมาไรส์", position: "กองกลาง", number: 39 },
    ],
    "แอสตัน วิลล่า": [
      { id: "20", name: "โอลลี่ วัตกินส์", position: "กองหน้า", number: 11 },
      { id: "21", name: "จอห์น แม็คกินน์", position: "กองกลาง", number: 7 },
    ],
  }

  const handleGenerateHeatmap = () => {
    if (!selectedMatch || !selectedTeam || !selectedPlayer) return

    const player = playersByTeam[selectedTeam]?.find((p) => p.id === selectedPlayer)
    if (!player) return

    setHeatmapData({
      match: selectedMatch,
      team: selectedTeam,
      player,
      statistics: {
        distance: (10 + Math.random() * 3).toFixed(1) + " km",
        sprints: Math.floor(30 + Math.random() * 30),
        topSpeed: (30 + Math.random() * 6).toFixed(1) + " km/h",
        touches: Math.floor(40 + Math.random() * 50),
        passes: Math.floor(30 + Math.random() * 40),
        shots: Math.floor(1 + Math.random() * 5),
      },
      zones: [
        { zone: "โซนโจมตี", percentage: Math.floor(30 + Math.random() * 30) },
        { zone: "โซนกลาง", percentage: Math.floor(20 + Math.random() * 30) },
        { zone: "โซนป้องกัน", percentage: Math.floor(10 + Math.random() * 30) },
      ],
    })
    setDialogOpen(false)
  }

  const openMatchDialog = (match: any) => {
    setSelectedMatch(match)
    setSelectedTeam("")
    setSelectedPlayer("")
    setDialogOpen(true)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <div className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="container mx-auto px-4 py-12 relative">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-4 border-primary/50 text-primary">
              PLAYER ANALYTICS
            </Badge>
            <h1 className="text-4xl md:text-6xl font-display tracking-tight mb-4">
              PLAYER <span className="text-primary">HEATMAP</span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              วิเคราะห์การเคลื่อนไหวและพื้นที่ครอบครองของนักเตะบนสนาม ด้วยข้อมูลเชิงลึกจากทุกนัดการแข่งขัน
            </p>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-lg">เลือกแมตช์</h2>
              <span className="text-xs text-muted-foreground">{recentMatches.length} แมตช์</span>
            </div>

            <div className="space-y-3">
              {recentMatches.map((match) => (
                <MatchItem key={match.id} match={match} onSelect={() => openMatchDialog(match)} />
              ))}
            </div>
          </div>

          <div className="lg:col-span-3">
            {heatmapData ? (
              <div className="space-y-6">
                {/* Player Header */}
                <div className="flex items-start gap-4 p-6 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/50">
                  <div className="w-20 h-20 rounded-xl bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary">
                    {heatmapData.player.number}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-1">{heatmapData.player.name}</h2>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>{heatmapData.player.position}</span>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                      <span>{heatmapData.team}</span>
                    </div>
                    <div className="mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {heatmapData.match.home} {heatmapData.match.score} {heatmapData.match.away}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Pitch Heatmap */}
                <div className="relative">
                  <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 to-transparent rounded-3xl blur-xl" />
                  <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-card p-4">
                    <FootballPitch heatmapData={heatmapData} />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  <StatCard icon={Route} value={heatmapData.statistics.distance} label="ระยะทาง" highlight />
                  <StatCard icon={Zap} value={String(heatmapData.statistics.sprints)} label="สปรินต์" />
                  <StatCard icon={Timer} value={heatmapData.statistics.topSpeed} label="ความเร็วสูงสุด" highlight />
                  <StatCard icon={Footprints} value={String(heatmapData.statistics.touches)} label="แตะบอล" />
                  <StatCard icon={Activity} value={String(heatmapData.statistics.passes)} label="พาส" />
                  <StatCard icon={Target} value={String(heatmapData.statistics.shots)} label="ยิง" />
                </div>

                {/* Zone Distribution */}
                <div className="p-6 rounded-2xl bg-card/50 border border-border/50">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    การกระจายตัวตามโซน
                  </h3>
                  <div className="space-y-4">
                    {heatmapData.zones.map((zone: any, i: number) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{zone.zone}</span>
                          <span className="font-bold text-primary">{zone.percentage}%</span>
                        </div>
                        <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{
                              width: `${zone.percentage}%`,
                              background:
                                i === 0
                                  ? "linear-gradient(90deg, #d4a574, #e8dcc8)"
                                  : i === 1
                                    ? "linear-gradient(90deg, #fbbf24, #f59e0b)"
                                    : "linear-gradient(90deg, #3b82f6, #60a5fa)",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Empty state with better design */
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md p-12 rounded-3xl border-2 border-dashed border-border/50 bg-card/20">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Activity className="w-12 h-12 text-primary/50" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">เลือกแมตช์เพื่อดู Heatmap</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    คลิกที่แมตช์ด้านซ้ายและเลือกนักเตะที่ต้องการวิเคราะห์ เพื่อดูข้อมูลการเคลื่อนไหวบนสนาม
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">เลือกนักเตะ</DialogTitle>
            {selectedMatch && (
              <DialogDescription className="flex items-center gap-2 pt-2">
                <span>{selectedMatch.home}</span>
                <span className="font-bold text-primary">{selectedMatch.score}</span>
                <span>{selectedMatch.away}</span>
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">ทีม</Label>
              <Select
                value={selectedTeam}
                onValueChange={(v) => {
                  setSelectedTeam(v)
                  setSelectedPlayer("")
                }}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="เลือกทีม" />
                </SelectTrigger>
                <SelectContent>
                  {selectedMatch && (
                    <>
                      <SelectItem value={selectedMatch.home}>{selectedMatch.home}</SelectItem>
                      <SelectItem value={selectedMatch.away}>{selectedMatch.away}</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">นักเตะ</Label>
              <Select value={selectedPlayer} onValueChange={setSelectedPlayer} disabled={!selectedTeam}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="เลือกนักเตะ" />
                </SelectTrigger>
                <SelectContent>
                  {selectedTeam &&
                    playersByTeam[selectedTeam]?.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        <span className="font-mono text-primary mr-2">#{player.number}</span>
                        {player.name}
                        <span className="text-muted-foreground ml-2 text-xs">({player.position})</span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerateHeatmap}
              disabled={!selectedTeam || !selectedPlayer}
              className="w-full h-12 text-base font-semibold mt-2"
            >
              <Activity className="w-5 h-5 mr-2" />
              แสดง Heatmap
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
