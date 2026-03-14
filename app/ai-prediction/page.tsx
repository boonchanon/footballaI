"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Brain, Calendar, Clock, Loader2, MapPin, Save, Sparkles, Target, Trophy, Zap } from "lucide-react"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { backendFetcher, fetchJson } from "@/lib/api-client"
import { getAuthToken } from "@/lib/auth-client"

type Fixture = {
  id: string
  date: string
  status: { isUpcoming: boolean; isLive: boolean; isFinished: boolean; long: string }
  teams: {
    home: { name: string; logo: string }
    away: { name: string; logo: string }
  }
  goals: { home: number | null; away: number | null }
  venue: { name: string; city: string }
}

export default function AIPredictionPage() {
  const { toast } = useToast()
  const [selectedMatch, setSelectedMatch] = useState<Fixture | null>(null)
  const [scoreForm, setScoreForm] = useState({ home: "1", away: "0" })
  const [saving, setSaving] = useState(false)

  const { data, isLoading } = useSWR<{ data: Fixture[] }>("/football/fixtures?type=all&limit=12", backendFetcher)
  const matches = useMemo(() => (data?.data || []).filter((match) => match.status.isUpcoming || match.status.isLive), [data?.data])

  async function handleSavePrediction() {
    const token = getAuthToken()
    if (!token || !selectedMatch) {
      toast({ title: "ต้องเข้าสู่ระบบก่อน", description: "กรุณาเข้าสู่ระบบเพื่อบันทึกการทายผล", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      await fetchJson("/predictions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fixtureId: selectedMatch.id,
          homeTeam: selectedMatch.teams.home.name,
          awayTeam: selectedMatch.teams.away.name,
          model: "user-pick",
          predictedScore: {
            home: Number(scoreForm.home),
            away: Number(scoreForm.away),
          },
        }),
      })
      toast({ title: "บันทึกการทายผลแล้ว", description: "ประวัติการทายผลถูกเก็บไว้ในโปรไฟล์ของคุณ" })
      setSelectedMatch(null)
    } catch (error) {
      toast({
        title: "บันทึกการทายผลไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[420px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[140px]" />
        </div>
        <div className="relative container mx-auto px-4 py-16 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            Mock Prediction Game
          </div>
          <h1 className="mb-4 text-4xl font-display md:text-6xl">
            ทายผลฟุตบอลด้วย
            <span className="text-primary"> Mock + Backend</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
            ใช้ข้อมูล mock เป็นฐานก่อนในตอนนี้ แล้วเก็บประวัติการทายผลจริงลง backend เพื่อให้พร้อมต่อยอดเป็น live data ในอนาคต
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="rounded-xl border border-border/50 bg-card/50 px-4 py-3">
              <p className="text-xs text-muted-foreground">ข้อมูลคู่แข่ง</p>
              <p className="font-semibold">Mock Fixtures</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/50 px-4 py-3">
              <p className="text-xs text-muted-foreground">บันทึกผล</p>
              <p className="font-semibold">MongoDB History</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/50 px-4 py-3">
              <p className="text-xs text-muted-foreground">พร้อมต่อยอด</p>
              <p className="font-semibold">Live API Later</p>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto flex-1 px-4 py-8">
        {isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {matches.map((match) => (
              <Card key={match.id} className="border-border/50">
                <CardContent className="space-y-5 p-6">
                  <div className="flex items-center justify-between">
                    <Badge variant={match.status.isLive ? "default" : "outline"}>{match.status.isLive ? "LIVE" : "Upcoming"}</Badge>
                    <div className="text-sm text-muted-foreground">{match.status.long}</div>
                  </div>

                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                    <div className="text-center">
                      <img src={match.teams.home.logo || "/placeholder.svg"} alt={match.teams.home.name} className="mx-auto mb-3 h-14 w-14 object-contain" />
                      <p className="font-medium">{match.teams.home.name}</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-display text-primary">VS</div>
                      {match.status.isLive && (
                        <div className="text-sm font-semibold">
                          {match.goals.home ?? 0} - {match.goals.away ?? 0}
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <img src={match.teams.away.logo || "/placeholder.svg"} alt={match.teams.away.name} className="mx-auto mb-3 h-14 w-14 object-contain" />
                      <p className="font-medium">{match.teams.away.name}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(match.date).toLocaleDateString("th-TH")}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {new Date(match.date).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {match.venue.name || match.venue.city}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <Brain className="mx-auto mb-1 h-4 w-4 text-primary" />
                      <p className="text-xs text-muted-foreground">โมเดล</p>
                      <p className="text-sm font-semibold">Mock AI</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <Target className="mx-auto mb-1 h-4 w-4 text-primary" />
                      <p className="text-xs text-muted-foreground">รูปแบบ</p>
                      <p className="text-sm font-semibold">User Score</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <Zap className="mx-auto mb-1 h-4 w-4 text-primary" />
                      <p className="text-xs text-muted-foreground">บันทึก</p>
                      <p className="text-sm font-semibold">Backend</p>
                    </div>
                  </div>

                  <Button
                    className="w-full gap-2"
                    onClick={() => {
                      setSelectedMatch(match)
                      setScoreForm({ home: "1", away: "0" })
                    }}
                  >
                    <Trophy className="h-4 w-4" />
                    ทายสกอร์คู่นี้
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!selectedMatch} onOpenChange={(open) => !open && setSelectedMatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ทายผลการแข่งขัน</DialogTitle>
          </DialogHeader>
          {selectedMatch && (
            <div className="space-y-5">
              <div className="rounded-xl border border-border/50 bg-muted/30 p-4 text-center">
                <p className="font-semibold">
                  {selectedMatch.teams.home.name} vs {selectedMatch.teams.away.name}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{selectedMatch.venue.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="homeScore">สกอร์เจ้าบ้าน</Label>
                  <Input id="homeScore" type="number" min="0" max="20" value={scoreForm.home} onChange={(e) => setScoreForm((prev) => ({ ...prev, home: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="awayScore">สกอร์ทีมเยือน</Label>
                  <Input id="awayScore" type="number" min="0" max="20" value={scoreForm.away} onChange={(e) => setScoreForm((prev) => ({ ...prev, away: e.target.value }))} />
                </div>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                ระบบจะบันทึกการทายผลของคุณลง backend พร้อม fixture id เพื่อให้ดูย้อนหลังได้ในหน้าโปรไฟล์
              </div>

              <Button onClick={handleSavePrediction} disabled={saving} className="w-full gap-2">
                <Save className="h-4 w-4" />
                {saving ? "กำลังบันทึก..." : "บันทึกการทายผล"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
