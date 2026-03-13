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
  Zap,
  ArrowLeft,
  CheckCircle2,
  Timer,
  Trophy,
  ChevronRight,
  Send,
  Search,
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
    players: [
      { id: "p1", name: "Erling Haaland", team: "แมนซิตี้", position: "ST", img: "/players/haaland.webp" },
      { id: "p2", name: "Phil Foden", team: "แมนซิตี้", position: "MF", img: "/erling-haaland-celebration.png" },
      { id: "p3", name: "Kevin De Bruyne", team: "แมนซิตี้", position: "MF", img: "/kevin-de-bruyne-action.png" },
      { id: "p4", name: "Mohamed Salah", team: "ลิเวอร์พูล", position: "FW", img: "/mohamed-salah-action.png" },
      { id: "p5", name: "Darwin Nunez", team: "ลิเวอร์พูล", position: "ST", img: "/salah-liverpool-team.jpg" },
      { id: "p6", name: "Diogo Jota", team: "ลิเวอร์พูล", position: "FW", img: "/liverpool-football-match.jpg" },
    ],
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
    players: [
      { id: "p7", name: "Bukayo Saka", team: "อาร์เซนอล", position: "FW", img: "/players/saka.webp" },
      { id: "p8", name: "Declan Rice", team: "อาร์เซนอล", position: "MF", img: "/players/rice.jpg" },
      { id: "p9", name: "Kai Havertz", team: "อาร์เซนอล", position: "FW", img: "/arsenal-player-saka.jpg" },
      { id: "p10", name: "Cole Palmer", team: "เชลซี", position: "MF", img: "/players/palmer.webp" },
      { id: "p11", name: "Nicolas Jackson", team: "เชลซี", position: "ST", img: "/chelsea-football-transfer.jpg" },
      { id: "p12", name: "Noni Madueke", team: "เชลซี", position: "FW", img: "/palmer-chelsea-team.jpg" },
    ],
  },
]

export default function FirstScorerPage() {
  const [selections, setSelections] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [searchTerms, setSearchTerms] = useState<Record<number, string>>({})

  const handleSelect = (matchId: number, playerId: string) => {
    if (submitted) return
    setSelections((prev) => ({ ...prev, [matchId]: playerId }))
  }

  const predictedCount = Object.keys(selections).length
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
            <div className="w-14 h-14 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
              <Zap className="w-7 h-7 text-sky-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-display">ทายคนยิงประตูแรก</h1>
                <Badge className="bg-sky-500/10 text-sky-500 border-sky-500/20 text-xs">
                  +50 แต้ม/ข้อ
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                เลือกนักเตะที่คุณคิดว่าจะยิงประตูแรกของแมตช์
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
              <Badge className="bg-sky-500/10 text-sky-500 border-sky-500/20">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                ส่งคำตอบแล้ว
              </Badge>
            ) : (
              <span className="text-sm text-primary font-medium">
                +{predictedCount * 50} แต้มที่อาจได้
              </span>
            )}
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all duration-500"
              style={{ width: `${(predictedCount / matches.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Matches */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {matches.map((match) => {
            const selected = selections[match.id]
            const search = searchTerms[match.id] || ""
            const filteredPlayers = match.players.filter(
              (p) =>
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.team.includes(search)
            )

            return (
              <Card
                key={match.id}
                className={`border-border/50 overflow-hidden transition-all ${
                  selected ? "border-sky-500/30" : ""
                } ${submitted ? "opacity-80" : ""}`}
              >
                <CardContent className="p-0">
                  {/* Match header */}
                  <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center overflow-hidden">
                          <Image src={match.homeLogo || "/placeholder.svg"} alt={match.home} width={24} height={24} className="object-contain" />
                        </div>
                        <span className="text-sm font-medium">{match.home}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">vs</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{match.away}</span>
                        <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center overflow-hidden">
                          <Image src={match.awayLogo || "/placeholder.svg"} alt={match.away} width={24} height={24} className="object-contain" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Timer className="w-3.5 h-3.5" />
                      {match.time} น.
                    </div>
                  </div>

                  <div className="p-5">
                    {/* Search */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="ค้นหานักเตะ..."
                        value={search}
                        onChange={(e) =>
                          setSearchTerms((prev) => ({
                            ...prev,
                            [match.id]: e.target.value,
                          }))
                        }
                        className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                        disabled={submitted}
                      />
                    </div>

                    {/* Player grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {filteredPlayers.map((player) => (
                        <button
                          key={player.id}
                          type="button"
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                            selected === player.id
                              ? "border-sky-500 bg-sky-500/10"
                              : "border-border/50 hover:border-sky-500/50 hover:bg-sky-500/5"
                          } ${submitted ? "pointer-events-none" : ""}`}
                          onClick={() => handleSelect(match.id, player.id)}
                        >
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
                            <Image
                              src={player.img || "/placeholder.svg"}
                              alt={player.name}
                              width={40}
                              height={40}
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{player.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {player.team} &middot; {player.position}
                            </p>
                          </div>
                          {selected === player.id && (
                            <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0 ml-auto" />
                          )}
                        </button>
                      ))}
                    </div>
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
              {allPredicted ? "ส่งคำตอบทั้งหมด" : `เลือกให้ครบ ${matches.length} แมตช์`}
            </Button>
          </div>
        )}

        {submitted && (
          <div className="max-w-3xl mx-auto mt-8">
            <Card className="border-sky-500/30 bg-sky-500/5">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-sky-500/10 flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-sky-500" />
                </div>
                <h3 className="text-2xl font-display mb-2">ส่งคำตอบเรียบร้อย!</h3>
                <p className="text-muted-foreground mb-6">
                  รอลุ้นว่านักเตะที่คุณเลือกจะยิงประตูแรกหรือไม่
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button asChild variant="outline" className="bg-transparent gap-1">
                    <Link href="/games/quiz">
                      ไปเล่นควิซ <ChevronRight className="w-4 h-4" />
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
