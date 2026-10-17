"use client"

import { Suspense, useState } from "react"
import { useRouter } from "next/navigation"
import { useFootballQuiz } from "@/components/games/use-football-quiz"
import { QUIZ_SECONDS, QUIZ_ROUND_SIZE, QUIZ_CATEGORIES, QUIZ_DIFFICULTIES, type QuizDifficulty } from "@/lib/games/quiz"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  Brain,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Trophy,
  ChevronRight,
  RotateCcw,
  Timer,
  Zap,
  Star,
  TrendingUp,
  CircleDot,
  ArrowRight,
  Flame,
} from "lucide-react"

const categoryStyles = [
  { icon: Brain, color: "text-primary", bgColor: "bg-primary/10" },
  { icon: Trophy, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  { icon: Star, color: "text-primary", bgColor: "bg-primary/10" },
  { icon: TrendingUp, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
  { icon: CircleDot, color: "text-sky-500", bgColor: "bg-sky-500/10" },
  { icon: CheckCircle2, color: "text-sky-500", bgColor: "bg-sky-500/10" },
  { icon: TrendingUp, color: "text-amber-500", bgColor: "bg-amber-500/10" },
]
const categories = QUIZ_CATEGORIES.map((category, index) => ({ ...category, ...categoryStyles[index] }))

const categoryMap = Object.fromEntries(categories.map(category => [category.key, category]))

export default function QuizPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">กำลังโหลด...</p>
        </div>
      </div>
    }>
      <QuizPage />
    </Suspense>
  )
}

function QuizPage() {
  const router = useRouter()
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("medium")
  const { session, busy, error, needsLogin, timeLeft, resultVisible, startGame, handleAnswer, nextQuestion, retry, goBackToCategories } = useFootballQuiz()
  const gameStarted = session !== null
  const selectedCategory = session?.category || null
  const totalQuestions = session?.totalQuestions || 0
  const currentIndex = session?.currentIndex || 0
  const currentQuestion = session ? { ...session.currentQuestion, answer: session.currentQuestion.answer ?? -1 } : null
  const answers = session?.answers || []
  const currentAnswer = answers.find(answer => answer.questionId === currentQuestion?.id)
  const selectedAnswer = currentAnswer?.selected ?? null
  const showResult = session?.answered || false
  const score = session?.score || 0
  const streak = session?.streak || 0
  const bestStreak = session?.bestStreak || 0
  const isFinished = session?.status === "completed" && resultVisible
  const notice = (busy || error || needsLogin) && (
    <div className="container mx-auto px-4 py-3" aria-live="polite">
      {busy && <p className="text-sm text-muted-foreground">กำลังบันทึกหรือโหลดเกม...</p>}
      {needsLogin ? (
        <p className="text-sm">กรุณาเข้าสู่ระบบเพื่อเล่นและบันทึกคะแนน <Link href="/login" className="text-primary underline">เข้าสู่ระบบ</Link></p>
      ) : error ? (
        <div role="alert" className="flex items-center gap-3 text-sm text-destructive">
          <span>{error}</span>
          <Button variant="outline" onClick={retry} disabled={busy}>ลองอีกครั้ง</Button>
        </div>
      ) : null}
    </div>
  )

  // ─── Category Selection Screen ───
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />

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
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Brain className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-display">แบบทดสอบความรู้ฟุตบอล</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  ทดสอบความรู้ฟุตบอลของคุณ สะสมแต้มไต่อันดับ
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-display mb-3">เลือกหมวดหมู่</h2>
              <p className="text-muted-foreground">เลือกหมวดหมู่ที่คุณต้องการทดสอบ คำถามจะถูกสุ่มทุกครั้ง</p>
            </div>

            {notice}
            <fieldset className="mb-6" disabled={busy}>
              <legend className="font-semibold mb-3">ระดับความยาก</legend>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(QUIZ_DIFFICULTIES) as Array<[QuizDifficulty, { label: string; seconds: number }]>).map(([key, value]) => (
                  <label key={key} className={`flex flex-col gap-1 p-3 rounded-lg border cursor-pointer ${difficulty === key ? "border-primary bg-primary/10" : "border-border"}`}>
                    <span className="flex items-center gap-2 text-sm"><input type="radio" name="quiz-difficulty" value={key} checked={difficulty === key} onChange={() => setDifficulty(key)} className="accent-primary" />{value.label}</span>
                    <span className="text-xs text-muted-foreground">{value.seconds} วินาที/ข้อ</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid sm:grid-cols-2 gap-4">
              {categories.map((cat) => {
                const IconComp = cat.icon
                return (
                  <button
                    key={cat.key}
                    type="button"
                    className="text-left"
                    onClick={() => needsLogin ? router.push("/login") : startGame(cat.key, difficulty)}
                    disabled={busy}
                  >
                    <Card className="border-border/50 hover:border-primary/50 transition-all group cursor-pointer h-full">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-xl ${cat.bgColor} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                            <IconComp className={`w-7 h-7 ${cat.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg mb-1">{cat.title}</h3>
                            <p className="text-sm text-muted-foreground mb-3">{QUIZ_ROUND_SIZE} คำถาม / รอบ</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">{QUIZ_DIFFICULTIES[difficulty].label}</Badge>
                              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                                +10 แต้ม/ข้อ
                              </Badge>
                            </div>
                            <p className="text-sm font-medium text-primary mt-3">{busy ? "กำลังโหลด..." : needsLogin ? "เข้าสู่ระบบเพื่อเล่น" : "เริ่มเล่น"}</p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                )
              })}
            </div>

            {/* Rules */}
            <Card className="mt-8 border-border/50">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4">กฎกติกา</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Timer className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{QUIZ_DIFFICULTIES[difficulty].seconds} วินาที</p>
                      <p className="text-xs text-muted-foreground">ต่อ 1 คำถาม หมดเวลาถือว่าตอบผิด</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">โบนัสเวลา</p>
                      <p className="text-xs text-muted-foreground">ตอบเร็วได้แต้มโบนัสเพิ่ม +1 ถึง +5</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Flame className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Streak</p>
                      <p className="text-xs text-muted-foreground">ตอบถูกติดต่อกันสะสม Streak</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Footer />
      </div>
    )
  }

  // ─── Finished Screen ───
  if (isFinished) {
    const totalPossible = totalQuestions * 15
    const percentage = Math.round((score / totalPossible) * 100)
    const correctCount = answers.filter((a) => a.correct).length
    const catData = selectedCategory ? categoryMap[selectedCategory] : null
    const CatIcon = catData?.icon || Brain

    return (
      <div className="min-h-screen bg-background">
        <Navigation />
      {notice}

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <Card className="border-primary/30 overflow-hidden">
              <div className="bg-gradient-to-b from-primary/10 to-transparent p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-3xl md:text-4xl font-display mb-2">จบแล้ว!</h2>
                {catData && (
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CatIcon className={`w-4 h-4 ${catData.color}`} />
                    <span className="text-sm text-muted-foreground">{catData.title}</span>
                  </div>
                )}
                <p className="text-muted-foreground">
                  คุณตอบถูก {correctCount} จาก {totalQuestions} ข้อ
                </p>
              </div>

              <CardContent className="p-6">
                {/* Score display */}
                <div className="flex items-center justify-center gap-6 py-6 mb-6 border-b border-border">
                  <div className="text-center">
                    <p className="text-5xl font-display text-primary">{score}</p>
                    <p className="text-sm text-muted-foreground">แต้มที่ได้</p>
                  </div>
                  <div className="w-px h-12 bg-border" />
                  <div className="text-center">
                    <p className="text-5xl font-display text-foreground">{Math.round((correctCount / totalQuestions) * 100)}%</p>
                    <p className="text-sm text-muted-foreground">ความแม่นยำ</p>
                  </div>
                  <div className="w-px h-12 bg-border" />
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Flame className="w-6 h-6 text-amber-500" />
                      <p className="text-5xl font-display text-amber-500">{bestStreak}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">Best Streak</p>
                  </div>
                </div>

                {/* Grade */}
                <div className="text-center mb-6">
                  {percentage >= 80 ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-sm px-4 py-1">
                      ยอดเยี่ยม! คุณเป็นผู้เชี่ยวชาญ
                    </Badge>
                  ) : percentage >= 60 ? (
                    <Badge className="bg-sky-500/10 text-sky-500 border-sky-500/20 text-sm px-4 py-1">
                      ดีมาก! ความรู้กว้างขวาง
                    </Badge>
                  ) : percentage >= 40 ? (
                    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-sm px-4 py-1">
                      พอใช้! ลองอีกครั้งนะ
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-sm px-4 py-1">
                      ต้องฝึกเพิ่ม! ลองอีกครั้ง
                    </Badge>
                  )}
                </div>

                {/* Answer summary */}
                <div className="space-y-2 mb-6 max-h-[300px] overflow-y-auto">
                  {answers.map((a, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-lg text-sm ${
                        a.correct ? "bg-emerald-500/5" : "bg-red-500/5"
                      }`}
                    >
                      {a.correct ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                      <span className="truncate">
                        <span className="text-muted-foreground mr-1">ข้อ {i + 1}.</span>
                        {a.question}
                      </span>
                      <span className={`ml-auto shrink-0 font-medium ${a.correct ? "text-emerald-500" : "text-red-500"}`}>
                        {a.correct ? "ถูก" : "ผิด"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap justify-center gap-3">
                  <Button className="gap-2" disabled={busy} onClick={() => selectedCategory && startGame(selectedCategory, session?.difficulty || difficulty)}>
                    <RotateCcw className="w-4 h-4" />
                    เล่นหมวดเดิมอีกครั้ง
                  </Button>
                  <Button variant="outline" className="bg-transparent gap-1" disabled={busy} onClick={goBackToCategories}>
                    เลือกหมวดอื่น
                  </Button>
                  <Button asChild variant="outline" className="bg-transparent gap-1">
                    <Link href="/games">
                      กลับหน้าเกม <ChevronRight className="w-4 h-4" />
                    </Link>
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

  if (!currentQuestion) return null

  // ─── Quiz In Progress ───
  const catData = selectedCategory ? categoryMap[selectedCategory] : null
  const CatIcon = catData?.icon || Brain
  const timerPercentage = Math.min(100, (timeLeft / (session?.secondsPerQuestion || QUIZ_SECONDS)) * 100)

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      {notice}

      {/* Progress bar */}
      <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-wrap gap-2 items-center justify-between mb-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">
                ข้อ {currentIndex + 1}/{totalQuestions}
              </span>
              {catData && (
                <Badge variant="outline" className="text-[10px]">
                  <CatIcon className={`w-3 h-3 mr-1 ${catData.color}`} />
                  {catData.title}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              {streak >= 2 && (
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-500">{streak}</span>
                </div>
              )}
              <Badge variant="outline" className="text-xs">
                {score} แต้ม
              </Badge>
            </div>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${((currentIndex + (showResult ? 1 : 0)) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Timer */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Timer className={`w-4 h-4 ${timeLeft <= 5 ? "text-red-500" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${timeLeft <= 5 ? "text-red-500" : "text-foreground"}`}>
                  {timeLeft} วินาที
                </span>
              </div>
              {timeLeft > 0 && !showResult && (
                <span className="text-xs text-muted-foreground">
                  โบนัสเวลา: +{timeLeft >= 10 ? 5 : timeLeft >= 5 ? 3 : 1}
                </span>
              )}
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                  timeLeft <= 5 ? "bg-red-500" : timeLeft <= 10 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${timerPercentage}%` }}
              />
            </div>
          </div>

          {/* Category badge */}
          <Badge variant="outline" className="mb-4 text-xs">
            {catData?.title || "ฟุตบอลควิซ"} · {session?.difficulty ? QUIZ_DIFFICULTIES[session.difficulty].label : "คลาสสิก"}
          </Badge>

          {/* Question */}
          <h2 className="text-2xl md:text-3xl font-display mb-8">{currentQuestion.question}</h2>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, i) => {
              let optionStyle = "border-border/50 hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
              if (showResult) {
                if (i === currentQuestion.answer) {
                  optionStyle = "border-emerald-500 bg-emerald-500/10"
                } else if (i === selectedAnswer && i !== currentQuestion.answer) {
                  optionStyle = "border-red-500 bg-red-500/10"
                } else {
                  optionStyle = "border-border/30 opacity-50"
                }
              } else if (selectedAnswer === i) {
                optionStyle = "border-primary bg-primary/10"
              }

              return (
                <button
                  key={i}
                  type="button"
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${optionStyle} ${
                    showResult ? "pointer-events-none" : ""
                  }`}
                  onClick={() => handleAnswer(i)}
                  disabled={showResult || busy || needsLogin || timeLeft === 0}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-display text-xl ${
                      showResult && i === currentQuestion.answer
                        ? "bg-emerald-500/20 text-emerald-500"
                        : showResult && i === selectedAnswer
                          ? "bg-red-500/20 text-red-500"
                          : "bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    {showResult && i === currentQuestion.answer ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : showResult && i === selectedAnswer && i !== currentQuestion.answer ? (
                      <XCircle className="w-5 h-5" />
                    ) : (
                      String.fromCharCode(65 + i)
                    )}
                  </div>
                  <span className="text-base font-medium">{option}</span>
                </button>
              )
            })}
          </div>

          {/* Result feedback */}
          {showResult && (
            <div className="mt-6">
              {currentAnswer?.correct ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span className="font-medium">ถูกต้อง! +{currentAnswer?.points || 0} แต้ม</span>
                  {streak >= 2 && (
                    <span className="ml-auto flex items-center gap-1 text-amber-500">
                      <Flame className="w-4 h-4" /> Streak x{streak}
                    </span>
                  )}
                </div>
              ) : selectedAnswer === null ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
                  <Timer className="w-5 h-5 shrink-0" />
                  <span className="font-medium">หมดเวลา! คำตอบที่ถูกคือ: {currentQuestion.options[currentQuestion.answer]}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
                  <XCircle className="w-5 h-5 shrink-0" />
                  <span className="font-medium">ผิด! คำตอบที่ถูกคือ: {currentQuestion.options[currentQuestion.answer]}</span>
                </div>
              )}

              <Button
                size="lg"
                className="w-full h-14 rounded-xl gap-2 text-lg mt-4"
                onClick={nextQuestion}
                disabled={busy || needsLogin}
              >
                {currentIndex < totalQuestions - 1 ? "ข้อถัดไป" : "ดูผลลัพธ์"}
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
