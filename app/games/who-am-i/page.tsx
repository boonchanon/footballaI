"use client"

import { useWhoAmI } from "@/components/games/use-who-am-i"
import { WhoChallenge } from "@/components/games/who-challenge"
import { WHO_TIMES, WHO_MODE_LABELS } from "@/lib/games/who-am-i"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  ArrowLeft,
  User,
  Timer,
  Trophy,
  ChevronRight,
  Eye,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Lightbulb,
  Shield,
  Sparkles,
  Route,
  BarChart3,
} from "lucide-react"

// --- Difficulty Config ---
const difficultyConfig = {
  easy: { label: "ง่าย", time: WHO_TIMES.easy, color: "text-emerald-500", bg: "bg-emerald-500", border: "border-emerald-500/30" },
  medium: { label: "ปานกลาง", time: WHO_TIMES.medium, color: "text-amber-500", bg: "bg-amber-500", border: "border-amber-500/30" },
  hard: { label: "ยาก", time: WHO_TIMES.hard, color: "text-red-500", bg: "bg-red-500", border: "border-red-500/30" },
} as const

type Difficulty = keyof typeof difficultyConfig

export default function WhoAmIPage() {
  const { session, busy, error, needsLogin, resultVisible, timeLeft, startGame, handleAnswer, handleRevealClue, handleNext, reset, retry } = useWhoAmI()
  const difficulty = session?.difficulty ?? null
  const currentChallenge = session?.currentQuestion
  const ModeIcon = currentChallenge?.mode === "career" ? Route : currentChallenge?.mode === "stats" ? BarChart3 : User
  const currentIndex = session?.currentIndex ?? 0
  const revealedClues = session?.revealedClues ?? 1
  const results = session?.answers ?? []
  const currentAnswer = results.find(result => result.questionId === currentChallenge?.id)
  const selected = currentAnswer?.selected ?? null
  const answered = session?.answered ?? false
  const score = session?.score ?? 0
  const totalChallenges = session?.totalQuestions ?? 6
  const shuffledOptions = currentChallenge?.options ?? []
  const gameOver = session?.status === "completed" && resultVisible
  const notice = (busy || error || needsLogin) && (
    <div className="container mx-auto px-4 py-3" aria-live="polite">
      {busy && <p className="text-sm text-muted-foreground">กำลังบันทึกหรือโหลดเกม...</p>}
      {needsLogin ? <p className="text-sm">กรุณาเข้าสู่ระบบเพื่อเล่นและบันทึกคะแนน <Link href="/login" className="text-primary underline">เข้าสู่ระบบ</Link></p>
        : error ? <div role="alert" className="flex items-center gap-3 text-sm text-destructive"><span>{error}</span><Button variant="outline" onClick={retry} disabled={busy}>ลองอีกครั้ง</Button></div> : null}
    </div>
  )

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  const totalTime = difficulty ? difficultyConfig[difficulty].time : 1
  const timerPercent = (timeLeft / totalTime) * 100
  const timerColor = timerPercent > 50 ? "bg-emerald-500" : timerPercent > 20 ? "bg-amber-500" : "bg-red-500"

  // --- Screens ---

  // Difficulty select screen
  if (!difficulty) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        {notice}
        <div className="border-b border-border bg-muted/20">
          <div className="container mx-auto px-4 py-6">
            <Link href="/games" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
              <ArrowLeft className="w-4 h-4" />
              กลับไปหน้าเกม
            </Link>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <User className="w-7 h-7 text-amber-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-display">Who Am I?</h1>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">+40 แต้ม/ข้อ</Badge>
                </div>
                <p className="text-muted-foreground text-sm mt-1">ทายชื่อนักเตะจากคำใบ้ ยิ่งเปิดน้อย ยิ่งได้แต้มเยอะ</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-display mb-3">เลือกระดับความยาก</h2>
              <p className="text-muted-foreground">ระดับที่ยากกว่าจะมีเวลาน้อยลง แต่ได้ความท้าทายมากขึ้น</p>
            </div>

            <div className="grid gap-4">
              {(Object.entries(difficultyConfig) as [Difficulty, typeof difficultyConfig.easy][]).map(([key, config]) => (
                <Card
                  key={key}
                  className={`border-border/50 hover:${config.border} transition-all cursor-pointer group`}
                  role="button"
                  tabIndex={busy ? -1 : 0}
                  aria-disabled={busy}
                  onKeyDown={event => { if (!busy && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); void startGame(key) } }}
                  onClick={() => { if (!busy) void startGame(key) }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl ${config.bg}/10 flex items-center justify-center`}>
                          <Timer className={`w-6 h-6 ${config.color}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            {config.label}
                            <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                              {Math.floor(config.time / 60)} นาที
                            </Badge>
                          </h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {key === "easy" && "เวลาเยอะ เหมาะสำหรับผู้เล่นใหม่"}
                            {key === "medium" && "ท้าทายพอดี สำหรับคนที่รู้จักนักเตะดี"}
                            {key === "hard" && "เวลาน้อยมาก สำหรับผู้เชี่ยวชาญเท่านั้น"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-border/50 mt-8">
              <CardContent className="p-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  วิธีเล่น
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-semibold mt-0.5">1.</span>
                    คุณจะได้รับคำใบ้เกี่ยวกับนักเตะพรีเมียร์ลีกทีละข้อ
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-semibold mt-0.5">2.</span>
                    กดปุ่ม "เปิดคำใบ้ถัดไป" เพื่อดูคำใบ้เพิ่มเติม
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-semibold mt-0.5">3.</span>
                    เมื่อคิดว่ารู้แล้ว เลือกคำตอบจากตัวเลือก 4 ตัว
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-semibold mt-0.5">4.</span>
                    ยิ่งเปิดคำใบ้น้อย ยิ่งได้คะแนนเยอะ (สูงสุด 40 แต้มต่อข้อ)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-semibold mt-0.5">5.</span>
                    ทั้งหมด 6 ข้อ ต้องตอบให้ทันภายในเวลาที่กำหนด
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        <Footer />
      </div>
    )
  }

  // Game over / results screen
  if (gameOver) {
    const answeredCount = results.length
    const correctCount = session?.correctCount ?? 0
    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0
    const grade =
      accuracy >= 90 ? "S" : accuracy >= 70 ? "A" : accuracy >= 50 ? "B" : accuracy >= 30 ? "C" : "D"
    const gradeColor =
      grade === "S"
        ? "text-amber-500"
        : grade === "A"
          ? "text-emerald-500"
          : grade === "B"
            ? "text-sky-500"
            : grade === "C"
              ? "text-orange-500"
              : "text-red-500"

    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        {notice}
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <Card className="border-primary/30">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Trophy className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-3xl font-display mb-2">
                  {session?.timedOut ? "หมดเวลา!" : "จบเกม!"}
                </h2>
                <p className="text-muted-foreground mb-6">
                  คุณตอบถูก {correctCount} จาก {answeredCount} ข้อ
                  {answeredCount < totalChallenges && ` (เหลืออีก ${totalChallenges - answeredCount} ข้อที่ยังไม่ได้ตอบ)`}
                </p>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-muted/30 rounded-xl p-4">
                    <p className={`text-4xl font-display ${gradeColor}`}>{grade}</p>
                    <p className="text-xs text-muted-foreground mt-1">เกรด</p>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-4">
                    <p className="text-4xl font-display text-primary">{score}</p>
                    <p className="text-xs text-muted-foreground mt-1">คะแนนรวม</p>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-4">
                    <p className="text-4xl font-display text-foreground">{accuracy}%</p>
                    <p className="text-xs text-muted-foreground mt-1">ความแม่นยำ</p>
                  </div>
                </div>

                {/* Results detail */}
                <div className="space-y-3 mb-8 text-left">
                  {results.map((r, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        r.correct ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-red-500/5 border border-red-500/20"
                      }`}
                    >
                      {r.correct ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{r.answer}</p>
                        {!r.correct && (
                          <p className="text-xs text-muted-foreground">คุณเลือก: {r.selected}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {/* Show unanswered */}
                  {answeredCount < totalChallenges && (
                    Array.from({ length: totalChallenges - answeredCount }).map((_, i) => (
                      <div key={`unanswered-${i}`} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                        <Timer className="w-5 h-5 text-muted-foreground shrink-0" />
                        <p className="text-sm text-muted-foreground">ไม่ได้ตอบ (หมดเวลา)</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  <Button disabled={busy} onClick={() => startGame(difficulty)} className="gap-2">
                    <RotateCcw className="w-4 h-4" />
                    เล่นอีกครั้ง ({difficultyConfig[difficulty].label})
                  </Button>
                  <Button variant="outline" className="bg-transparent gap-2" disabled={busy} onClick={reset}>
                    เปลี่ยนระดับ
                  </Button>
                  <Button asChild variant="outline" className="bg-transparent gap-1">
                    <Link href="/games">กลับหน้าเกม</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // Active game screen
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
        {notice}

      {/* Timer bar - sticky at top */}
      <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                ข้อ {currentIndex + 1}/{totalChallenges}
              </span>
              <Badge variant="outline" className={`text-[10px] ${difficultyConfig[difficulty].color}`}>
                {difficultyConfig[difficulty].label}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                คะแนน: <span className="text-primary">{score}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <Timer className={`w-4 h-4 ${timerPercent <= 20 ? "text-red-500 animate-pulse" : "text-muted-foreground"}`} />
                <span className={`text-sm font-mono font-semibold ${timerPercent <= 20 ? "text-red-500" : "text-foreground"}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${timerColor}`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Question card */}
          <Card className="border-border/50 mb-6">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <ModeIcon className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-display">{WHO_MODE_LABELS[currentChallenge?.mode ?? "clues"]}</h2>
                  <p className="text-xs text-muted-foreground">
                    เปิดคำใบ้แล้ว {revealedClues}/{currentChallenge?.clues.length || 6} ข้อ
                  </p>
                </div>
              </div>

              {currentChallenge && <WhoChallenge question={currentChallenge} />}

              {/* Reveal button */}
              {!answered && currentChallenge && revealedClues < currentChallenge.clues.length && (
                <Button variant="outline" className="w-full bg-transparent gap-2 mb-6" disabled={busy || needsLogin || timeLeft <= 0} onClick={handleRevealClue}>
                  <Eye className="w-4 h-4" />
                  เปิดคำใบ้ถัดไป (คำใบ้ที่ {revealedClues + 1})
                </Button>
              )}

              {/* Score indicator */}
              {!answered && (
                <div className="text-center mb-4">
                  <p className="text-xs text-muted-foreground">
                    ตอบตอนนี้จะได้{" "}
                    <span className="text-primary font-semibold">
                      {session?.availablePoints ?? 0} แต้ม
                    </span>
                  </p>
                </div>
              )}

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {shuffledOptions.map((option) => {
                  const isCorrectAnswer = option === currentChallenge?.answer
                  const isSelected = option === selected

                  let buttonStyle = "bg-transparent hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                  if (answered) {
                    if (isCorrectAnswer) {
                      buttonStyle = "bg-emerald-500/10 border-emerald-500/50 text-emerald-500"
                    } else if (isSelected && !isCorrectAnswer) {
                      buttonStyle = "bg-red-500/10 border-red-500/50 text-red-500"
                    } else {
                      buttonStyle = "opacity-50"
                    }
                  }

                  return (
                    <Button
                      key={option}
                      variant="outline"
                      className={`h-auto py-3 px-4 rounded-lg transition-all justify-start text-left ${buttonStyle}`}
                      onClick={() => handleAnswer(option)}
                      disabled={answered || busy || needsLogin || timeLeft <= 0}
                    >
                      <div className="flex items-center gap-2">
                        {answered && isCorrectAnswer && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                        {answered && isSelected && !isCorrectAnswer && <XCircle className="w-4 h-4 shrink-0" />}
                        {!answered && <Shield className="w-4 h-4 text-muted-foreground shrink-0" />}
                        <span className="text-sm">{option}</span>
                      </div>
                    </Button>
                  )
                })}
              </div>

              {/* Result feedback */}
              {answered && (
                <div className={`mt-6 p-4 rounded-lg text-center ${
                  currentAnswer?.correct
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-red-500/10 border border-red-500/20"
                }`}>
                  {currentAnswer?.correct ? (
                    <>
                      <p className="text-emerald-500 font-semibold">ถูกต้อง!</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        +{currentAnswer?.points ?? 0} แต้ม (ใช้คำใบ้ {revealedClues} ข้อ)
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-red-500 font-semibold">ผิด!</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        คำตอบที่ถูกคือ <span className="font-semibold text-foreground">{currentChallenge?.answer}</span>
                      </p>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next button */}
          {answered && (
            <Button size="lg" className="w-full h-14 rounded-xl shadow-lg shadow-primary/20 gap-2 text-lg" disabled={busy || needsLogin} onClick={handleNext}>
              {currentIndex + 1 >= totalChallenges ? (
                <>
                  <Trophy className="w-5 h-5" />
                  ดูผลลัพธ์
                </>
              ) : (
                <>
                  ข้อถัดไป
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
