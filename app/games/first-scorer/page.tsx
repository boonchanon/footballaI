"use client"

import { useState } from "react"
import { useFirstScorer } from "@/components/games/use-first-scorer"
import { canSelectScorer } from "@/lib/games/first-scorer"
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
  ChevronLeft,
  Send,
  Search,
} from "lucide-react"

export default function FirstScorerPage() {
  const { matches, isLoading, error, retry, retryPlayers, week, weekOffset, setWeekOffset, nextWeekOffset } = useFirstScorer()
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [confirmed, setConfirmed] = useState("")
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({})
  const openMatches = matches.filter(match => match.openForPrediction)
  const currentSelection = JSON.stringify(openMatches.map(match => [match.id, selections[match.id] || ""]))
  const predictedCount = matches.filter(match => canSelectScorer(match, selections[match.id], Date.now())).length
  const allPredicted = !error && openMatches.length > 0 && predictedCount === openMatches.length
  const submitted = allPredicted && confirmed === currentSelection

  const handleSelect = (matchId: string, playerId: string) => {
    const match = matches.find(item => item.id === matchId)
    if (submitted || error || !match || !canSelectScorer(match, playerId, Date.now())) return
    setSelections((prev) => ({ ...prev, [matchId]: playerId }))
  }

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
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-display">ทายคนยิงประตูแรก</h1>
                <Badge className="bg-sky-500/10 text-sky-500 border-sky-500/20 text-xs">
                  ทดลองทาย
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
              ทายแล้ว {predictedCount}/{openMatches.length} แมตช์ที่เปิดให้ทาย
            </span>
            {submitted ? (
              <Badge className="bg-sky-500/10 text-sky-500 border-sky-500/20">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                ยืนยันตัวเลือกแล้ว
              </Badge>
            ) : (
              <span className="text-sm text-primary font-medium">
                ยังไม่สะสมคะแนน
              </span>
            )}
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all duration-500"
              style={{ width: `${openMatches.length ? (predictedCount / openMatches.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Matches */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3" aria-label="เลือกสัปดาห์แข่งขัน">
            <div className="min-w-0">
              <h2 className="font-semibold">โปรแกรมประจำสัปดาห์</h2>
              <p className="text-sm text-muted-foreground" aria-live="polite">{week?.label || "กำลังโหลด..."}</p>
              <p className="text-xs text-muted-foreground mt-1">จันทร์–อาทิตย์ · เวลาไทย{!isLoading && !error ? ` · ${matches.length} คู่` : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" aria-label="สัปดาห์ก่อนหน้า" title="สัปดาห์ก่อนหน้า" onClick={() => setWeekOffset(offset => offset - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" disabled={weekOffset === 0} onClick={() => setWeekOffset(0)}>สัปดาห์นี้</Button>
              <Button variant="outline" size="icon" aria-label="สัปดาห์ถัดไป" title="สัปดาห์ถัดไป" onClick={() => setWeekOffset(offset => offset + 1)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
          {isLoading ? <p role="status">กำลังโหลดโปรแกรมแข่งขัน...</p>
            : error ? <div role="alert">โหลดโปรแกรมแข่งขันไม่สำเร็จ <Button variant="outline" onClick={retry}>ลองอีกครั้ง</Button></div>
            : matches.length === 0 ? <div className="space-y-3">
              <p className="text-muted-foreground">ไม่พบโปรแกรมแข่งขันในข้อมูลของสัปดาห์นี้</p>
              {nextWeekOffset !== null && <Button variant="outline" onClick={() => setWeekOffset(nextWeekOffset)}>ไปสัปดาห์ถัดไปที่มีแมตช์ <ChevronRight className="w-4 h-4" /></Button>}
            </div> : null}
          {!isLoading && !error && matches.map((match) => {
            const selected = selections[match.id]
            const search = searchTerms[match.id] || ""
            const filteredPlayers = match.players.filter(
              (p) =>
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.team.toLowerCase().includes(search.toLowerCase())
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
                  <div className="px-5 py-3 border-b border-border/50 flex flex-wrap gap-3 items-center justify-between bg-muted/30">
                    <div className="flex flex-wrap items-center gap-3">
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
                    <p className="text-xs text-muted-foreground mb-2">{match.league} · {match.date}</p>
                    {!match.openForPrediction ? <Badge variant="outline">{match.statusLabel}</Badge> : <>
                    <p className="text-xs text-muted-foreground mb-4">รายชื่อนักเตะจาก API ของทีม ยังไม่ใช่รายชื่อผู้ลงสนามที่ยืนยันแล้ว</p>
                    {match.playersLoading ? <p role="status" className="mb-4">กำลังโหลดรายชื่อนักเตะ...</p>
                      : match.playersError ? <div role="alert" className="mb-4">โหลดรายชื่อนักเตะไม่สำเร็จ <Button variant="outline" onClick={retryPlayers}>ลองอีกครั้ง</Button></div>
                      : !match.playersReady ? <p className="text-muted-foreground mb-4">ยังไม่มีรายชื่อนักเตะครบทั้งสองทีม</p> : null}
                    {/* Search */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="ค้นหานักเตะ..."
                        aria-label={`ค้นหานักเตะ ${match.home} vs ${match.away}`}
                        value={search}
                        onChange={(e) =>
                          setSearchTerms((prev) => ({
                            ...prev,
                            [match.id]: e.target.value,
                          }))
                        }
                        className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                        disabled={submitted || !match.playersReady}
                      />
                    </div>

                    {/* Player grid */}
                    {match.playersReady && filteredPlayers.length === 0 && <p className="text-sm text-muted-foreground">ไม่พบนักเตะที่ตรงกับการค้นหา</p>}
                    <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                      {match.playersReady && filteredPlayers.map((player) => (
                        <button
                          key={player.id}
                          type="button"
                          disabled={submitted}
                          aria-pressed={selected === player.id}
                          aria-label={`${player.name} (${player.team})`}
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
                              onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = "/placeholder.svg" }}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium break-words">{player.name}</p>
                            <p className="text-[10px] text-muted-foreground break-words">
                              {player.team} &middot; {player.position}
                            </p>
                          </div>
                          {selected === player.id && (
                            <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0 ml-auto" />
                          )}
                        </button>
                      ))}
                    </div>
                    </>}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {!submitted && !isLoading && !error && openMatches.length > 0 && (
          <div className="max-w-3xl mx-auto mt-8">
            <Button
              size="lg"
              className="w-full h-14 rounded-xl shadow-lg shadow-primary/20 gap-2 text-lg"
              disabled={!allPredicted}
              onClick={() => {
                if (openMatches.length > 0 && openMatches.every(match => canSelectScorer(match, selections[match.id], Date.now()))) setConfirmed(currentSelection)
              }}
            >
              <Send className="w-5 h-5" />
              {allPredicted ? "ยืนยันตัวเลือก" : `เลือกให้ครบ ${openMatches.length} แมตช์`}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">ตัวเลือกอยู่เฉพาะหน้านี้ ยังไม่บันทึกลงบัญชีหรือคิดคะแนน</p>
          </div>
        )}

        {submitted && (
          <div className="max-w-3xl mx-auto mt-8">
            <Card className="border-sky-500/30 bg-sky-500/5">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-sky-500/10 flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-sky-500" />
                </div>
                <h3 className="text-2xl font-display mb-2">ยืนยันตัวเลือกแล้ว</h3>
                <p className="text-muted-foreground mb-6">
                  ตัวเลือกอยู่เฉพาะหน้านี้ ยังไม่บันทึกลงบัญชีหรือคิดคะแนน
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button variant="outline" onClick={() => setConfirmed("")}>แก้ไขตัวเลือก</Button>
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
