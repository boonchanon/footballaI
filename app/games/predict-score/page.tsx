"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import {
  Hash,
  ArrowLeft,
  CheckCircle2,
  Timer,
  Trophy,
  ChevronRight,
  Send,
  Minus,
  Plus,
} from "lucide-react"

const matches = [
  {
    id: 1,
    home: "แมนเชสเตอร์ ซิตี้",
    away: "ลิเวอร์พูล",
    homeLogo: "/manchester-city-logo.png",
    awayLogo: "/liverpool-logo.png",
    date: "วันเสาร์ 15 ก.พ. 2026",
    time: "23:30",
    league: "Premier League",
  },
  {
    id: 2,
    home: "อาร์เซนอล",
    away: "เชลซี",
    homeLogo: "/arsenal-logo.png",
    awayLogo: "/chelsea-football-club-crest.png",
    date: "วันอาทิตย์ 16 ก.พ. 2026",
    time: "00:00",
    league: "Premier League",
  },
  {
    id: 3,
    home: "สเปอร์ส",
    away: "แมนยู",
    homeLogo: "/tottenham-logo.png",
    awayLogo: "/manchester-united-crest.png",
    date: "วันอาทิตย์ 16 ก.พ. 2026",
    time: "02:30",
    league: "Premier League",
  },
]

type ScorePrediction = { home: number; away: number }

export default function PredictScorePage() {
  const [scores, setScores] = useState<Record<number, ScorePrediction>>({})
  const [submitted, setSubmitted] = useState(false)

  const adjustScore = (matchId: number, team: "home" | "away", delta: number) => {
    if (submitted) return
    setScores((prev) => {
      const current = prev[matchId] || { home: 0, away: 0 }
      const newVal = Math.max(0, Math.min(15, current[team] + delta))
      return { ...prev, [matchId]: { ...current, [team]: newVal } }
    })
  }

  const predictedCount = Object.keys(scores).length
  const allPredicted = predictedCount === matches.length

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Header */}
      <div className="border-b border-border bg-muted/20">
        <div className="container mx-auto px-4 py-6">
          <Link
            href="/games"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับไปหน้าเกม
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Hash className="w-7 h-7 text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-display">ทายสกอร์</h1>
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">
                  +100 แต้ม/ข้อ
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                ทายผลสกอร์ที่แน่นอนของแต่ละแมตช์ ทายถูกได้แต้มสูงสุด
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              ทายแล้ว {predictedCount}/{matches.length} แมตช์
            </span>
            {submitted ? (
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                ส่งคำตอบแล้ว
              </Badge>
            ) : (
              <span className="text-sm text-primary font-medium">
                +{predictedCount * 100} แต้มที่อาจได้
              </span>
            )}
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(predictedCount / matches.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Matches */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-4">
          {matches.map((match) => {
            const score = scores[match.id]
            return (
              <Card
                key={match.id}
                className={`border-border/50 overflow-hidden transition-all ${
                  score ? "border-emerald-500/30" : ""
                } ${submitted ? "opacity-80" : ""}`}
              >
                <CardContent className="p-0">
                  <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {match.league}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{match.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Timer className="w-3.5 h-3.5" />
                      {match.time} น.
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2">
                      {/* Home team */}
                      <div className="flex-1 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center overflow-hidden mx-auto mb-2">
                          <Image
                            src={match.homeLogo || "/placeholder.svg"}
                            alt={match.home}
                            width={48}
                            height={48}
                            className="object-contain"
                          />
                        </div>
                        <p className="font-semibold text-sm mb-3 truncate px-2">{match.home}</p>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="w-10 h-10 rounded-lg bg-transparent"
                            onClick={() => adjustScore(match.id, "home", -1)}
                            disabled={submitted || !score || score.home <= 0}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <div className="w-16 h-16 rounded-xl bg-muted/50 border border-border flex items-center justify-center">
                            <span className="font-display text-4xl text-foreground">
                              {score?.home ?? 0}
                            </span>
                          </div>
                          <Button
                            size="icon"
                            variant="outline"
                            className="w-10 h-10 rounded-lg bg-transparent"
                            onClick={() => adjustScore(match.id, "home", 1)}
                            disabled={submitted}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="flex flex-col items-center gap-1 px-2">
                        <span className="font-display text-2xl text-muted-foreground">-</span>
                      </div>

                      {/* Away team */}
                      <div className="flex-1 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center overflow-hidden mx-auto mb-2">
                          <Image
                            src={match.awayLogo || "/placeholder.svg"}
                            alt={match.away}
                            width={48}
                            height={48}
                            className="object-contain"
                          />
                        </div>
                        <p className="font-semibold text-sm mb-3 truncate px-2">{match.away}</p>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="w-10 h-10 rounded-lg bg-transparent"
                            onClick={() => adjustScore(match.id, "away", -1)}
                            disabled={submitted || !score || score.away <= 0}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <div className="w-16 h-16 rounded-xl bg-muted/50 border border-border flex items-center justify-center">
                            <span className="font-display text-4xl text-foreground">
                              {score?.away ?? 0}
                            </span>
                          </div>
                          <Button
                            size="icon"
                            variant="outline"
                            className="w-10 h-10 rounded-lg bg-transparent"
                            onClick={() => adjustScore(match.id, "away", 1)}
                            disabled={submitted}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Confirm this match */}
                    {!submitted && !score && (
                      <p className="text-center text-xs text-muted-foreground mt-4">
                        กด + หรือ - เพื่อตั้งสกอร์
                      </p>
                    )}
                    {score && !submitted && (
                      <p className="text-center text-xs text-emerald-500 mt-4">
                        <CheckCircle2 className="w-3 h-3 inline mr-1" />
                        ทายสกอร์ {score.home} - {score.away}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {!submitted && (
          <div className="max-w-3xl mx-auto mt-8">
            <Button
              size="lg"
              className="w-full h-14 rounded-xl shadow-lg shadow-primary/20 gap-2 text-lg"
              disabled={!allPredicted}
              onClick={() => setSubmitted(true)}
            >
              <Send className="w-5 h-5" />
              {allPredicted ? "ส่งคำตอบทั้งหมด" : `เลือกสกอร์ให้ครบ ${matches.length} แมตช์`}
            </Button>
          </div>
        )}

        {submitted && (
          <div className="max-w-3xl mx-auto mt-8">
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-display mb-2">ส่งคำตอบเรียบร้อย!</h3>
                <p className="text-muted-foreground mb-6">
                  คุณทายสกอร์ {predictedCount} แมตช์ ถ้าถูกหมดจะได้ +{predictedCount * 100} แต้ม
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button asChild variant="outline" className="bg-transparent gap-1">
                    <Link href="/games/first-scorer">
                      ไปทายดาวยิงคนแรก <ChevronRight className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="bg-transparent gap-1">
                    <Link href="/games">กลับหน้าเกม</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
