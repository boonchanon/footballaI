"use client"

import { useState } from "react"
import type { CSSProperties, ElementType, PointerEvent } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { useUpcomingPredictions } from "@/components/games/use-upcoming-predictions"
import { QuizHistoryPanel, QuizLeaderboardPanel } from "@/components/games/quiz-results"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import {
  Trophy,
  Target,
  Hash,
  Crown,
  Star,
  Brain,
  ChevronRight,
  Medal,
  Flame,
  TrendingUp,
  Users,
  User,
  Zap,
  Award,
  CircleDot,
  Timer,
  CheckCircle2,
  Lock,
  ArrowRight,
} from "lucide-react"

const quizCategories = [
  { key: "world-cup", title: "ประวัติศาสตร์ฟุตบอลโลก", questions: 6, difficulty: "เลือกระดับได้", icon: Trophy, color: "text-amber-500" },
  { key: "legendary-players", title: "นักเตะในตำนาน", questions: 6, difficulty: "เลือกระดับได้", icon: Star, color: "text-primary" },
  { key: "premier-league-stats", title: "สถิติพรีเมียร์ลีก", questions: 6, difficulty: "เลือกระดับได้", icon: TrendingUp, color: "text-emerald-500" },
  { key: "clubs-stadiums", title: "สโมสรและสนาม", questions: 6, difficulty: "เลือกระดับได้", icon: CircleDot, color: "text-sky-500" },
]

type GameMode = {
  icon: ElementType
  title: string
  subtitle: string
  description: string
  points: string
  unit: string
  color: string
  available: boolean
  href: string
}

const gameModes: GameMode[] = [
  {
    icon: User,
    title: "Who Am I?",
    subtitle: "ทายชื่อนักเตะจากคำใบ้",
    description: "อ่านคำใบ้เกี่ยวกับนักเตะพรีเมียร์ลีก ยิ่งเปิดน้อย ยิ่งได้แต้มเยอะ",
    points: "+40",
    unit: "แต้ม/ข้อ",
    color: "#FFC24A",
    available: true,
    href: "/games/who-am-i",
  },
  {
    icon: Hash,
    title: "ทายสกอร์",
    subtitle: "ทายผลแบบแม่น",
    description: "ทายสกอร์ที่แม่นของแต่ละแมตช์ ได้แต้มสูงสุดถ้าตรง",
    points: "+100",
    unit: "แต้ม",
    color: "#C8FF2E",
    available: true,
    href: "/games/predict-score",
  },
  {
    icon: Zap,
    title: "ทายคนยิงประตูแรก",
    subtitle: "First Goal Scorer",
    description: "เลือกนักเตะที่คุณคิดว่าจะยิงประตูแรกของแมตช์",
    points: "+50",
    unit: "แต้ม",
    color: "#4FD6FF",
    available: true,
    href: "/games/first-scorer",
  },
  {
    icon: Brain,
    title: "แบบทดสอบความรู้ฟุตบอล",
    subtitle: "Football Quiz",
    description: "ตอบคำถามความรู้ฟุตบอล สะสมแต้มและแข่งกับเพื่อน",
    points: "+10",
    unit: "แต้ม/ข้อ",
    color: "#9D8BFF",
    available: true,
    href: "/games/quiz",
  },
]

function handleGameCardPointerMove(event: PointerEvent<HTMLAnchorElement>) {
  if (typeof window === "undefined" || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return
  const rect = event.currentTarget.getBoundingClientRect()
  event.currentTarget.style.setProperty("--x", `${event.clientX - rect.left}px`)
  event.currentTarget.style.setProperty("--y", `${event.clientY - rect.top}px`)
}

// --- Components ---

function HeroSection() {
  return (
    <section className="games-hero relative isolate overflow-hidden">
      <div className="games-hero__spotlight games-hero__spotlight--left" aria-hidden="true" />
      <div className="games-hero__spotlight games-hero__spotlight--right" aria-hidden="true" />
      <div className="games-hero__glow" aria-hidden="true" />
      <div className="games-hero__pitch" aria-hidden="true" />
      <div className="container relative z-10 mx-auto px-4 py-24 sm:py-28 md:py-36 lg:py-40">
        <div className="max-w-3xl mx-auto text-center">
          <div className="games-hero-badge mb-6 inline-flex items-center gap-2">
            <span className="games-hero-badge__dot" aria-hidden="true" />
            Predictions & Gaming
          </div>
          <h1 className="games-hero-title mx-auto mb-5 max-w-full break-words">
            ทายผล ชิงแต้ม
          </h1>
          <p className="games-hero-copy mx-auto mb-9 max-w-[56ch] text-base leading-[1.85] sm:text-lg md:text-xl">
            ทายผลแมตช์ ทายสกอร์ ทายดาวยิงคนแรก แข่งขันกับเพื่อน ไต่อันดับลีดเดอร์บอร์ด
            และทดสอบความรู้ฟุตบอลของคุณ
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild size="lg" className="games-hero-action games-hero-action--primary h-12 rounded-full px-8 gap-2">
              <a href="#game-modes">
                <Target className="w-5 h-5" />
                เริ่มทายผลเลย
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="games-hero-action games-hero-action--secondary h-12 rounded-full px-8 gap-2">
              <a href="#leaderboard">
                <Crown className="w-5 h-5" />
                ดูอันดับ
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function GameModeCards() {
  return (
    <section id="game-modes" className="games-modes relative isolate overflow-hidden py-16 scroll-mt-24 md:py-24">
      <div className="games-modes__heading-glow" aria-hidden="true" />
      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Badge variant="outline" className="games-section-badge mb-4">โหมดเกม</Badge>
          <h2 className="games-section-title mb-4 text-3xl md:text-5xl">เลือกโหมดที่คุณชอบ</h2>
          <p className="games-section-copy mx-auto max-w-xl">
            4 โหมดเกมให้เลือกเล่น แต่ละโหมดมีระบบแต้มที่แตกต่างกัน
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
          {gameModes.map((mode, i) => (
            <Link
              key={mode.href}
              href={mode.href}
              onPointerMove={handleGameCardPointerMove}
              className="game-mode-card group"
              style={{ "--mode-color": mode.color } as CSSProperties}
              aria-label={`${mode.title}: ${mode.subtitle}`}
            >
              <div className="game-mode-card__pointer-glow" aria-hidden="true" />
              <div
                className="game-mode-card__watermark"
                aria-hidden="true"
              >
                {mode.points.replace("+", "")}
              </div>
              <div className="relative z-10 flex h-full min-h-[300px] flex-col">
                <div className="mb-8 flex items-start justify-between gap-4">
                  <div className="game-mode-card__icon">
                    <mode.icon className="h-7 w-7" />
                  </div>
                  {mode.available ? (
                    <span className="game-mode-card__status">เปิดให้เล่น</span>
                  ) : (
                    <span className="game-mode-card__status game-mode-card__status--locked">
                      <Lock className="h-3 w-3" />
                      เร็ว ๆ นี้
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="game-mode-card__title">{mode.title}</h3>
                  <p className="game-mode-card__subtitle">{mode.subtitle}</p>
                  <p className="game-mode-card__description">{mode.description}</p>
                </div>
                <div className="mt-8 flex items-end justify-between gap-4">
                  <div>
                    <span className="game-mode-card__points">{mode.points}</span>
                    <span className="game-mode-card__unit">{mode.unit}</span>
                  </div>
                  <span className="game-mode-card__arrow" aria-hidden="true">
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function PredictionSection() {
  const { matches: upcomingPredictions, isLoading, error, retry } = useUpcomingPredictions()
  const [selectedPredictions, setSelectedPredictions] = useState<Record<string, string>>({})

  const handlePrediction = (matchId: string, prediction: string) => {
    const match = upcomingPredictions.find(item => item.id === matchId)
    if (!match || error || match.kickoffAt <= Date.now()) return
    setSelectedPredictions((prev) => ({ ...prev, [matchId]: prediction }))
  }

  return (
    <section id="upcoming-predictions" className="py-16 md:py-24 bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-8">
          <div>
            <Badge variant="outline" className="mb-2">ทายผลแมตช์</Badge>
            <h2 className="text-3xl md:text-4xl font-display">แมตช์ที่เปิดให้ทาย</h2>
          </div>
          <Button asChild variant="ghost" className="gap-1 text-primary hidden sm:flex">
            <Link href="/matches">ดูทั้งหมด <ChevronRight className="w-4 h-4" /></Link>
          </Button>
        </div>

        <div className="space-y-4" aria-busy={isLoading}>
          {isLoading ? <p role="status" className="py-6 text-sm text-muted-foreground">กำลังโหลดโปรแกรมแข่งขัน...</p>
            : error ? <div role="alert" className="flex flex-wrap items-center gap-3 py-6 text-sm text-destructive">โหลดโปรแกรมแข่งขันไม่สำเร็จ <Button variant="outline" onClick={retry}>ลองอีกครั้ง</Button></div>
            : upcomingPredictions.length === 0 ? <p className="py-6 text-sm text-muted-foreground">ยังไม่มีแมตช์ที่กำหนดเวลาแข่งขันและเปิดให้ทายในขณะนี้</p> : null}
          {!isLoading && !error && upcomingPredictions.map((match) => {
            const selected = selectedPredictions[match.id]
            return (
              <Card key={match.id} className="border-border/50 overflow-hidden">
                <CardContent className="p-0">
                  {/* Match Header */}
                  <div className="px-5 py-3 border-b border-border/50 flex flex-wrap gap-2 items-center justify-between bg-muted/30">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{match.league}</Badge>
                      <span className="text-xs text-muted-foreground">{match.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Timer className="w-3.5 h-3.5" />
                      {match.time} น.
                    </div>
                  </div>

                  {/* Match Body */}
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-4 mb-5">
                      {/* Home */}
                      <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
                          <Image src={match.homeLogo || "/placeholder.svg"} alt={match.home} width={40} height={40} className="object-contain" />
                        </div>
                        <span className="font-semibold text-center sm:text-left break-words min-w-0 max-w-full">{match.home}</span>
                      </div>

                      <span className="text-sm font-display text-2xl text-muted-foreground px-4">VS</span>

                      {/* Away */}
                      <div className="flex flex-col-reverse sm:flex-row items-center gap-3 flex-1 min-w-0 justify-end">
                        <span className="font-semibold text-center sm:text-right break-words min-w-0 max-w-full">{match.away}</span>
                        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
                          <Image src={match.awayLogo || "/placeholder.svg"} alt={match.away} width={40} height={40} className="object-contain" />
                        </div>
                      </div>
                    </div>

                    {/* Prediction Buttons */}
                    <div className="grid grid-cols-3 gap-3">
                      <Button
                        variant={selected === "home" ? "default" : "outline"}
                        className={`h-11 rounded-lg transition-all ${
                          selected === "home"
                            ? "shadow-lg shadow-primary/20"
                            : "bg-transparent hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                        }`}
                        onClick={() => handlePrediction(match.id, "home")}
                        aria-pressed={selected === "home"}
                      >
                        {selected === "home" && <CheckCircle2 className="hidden sm:block w-4 h-4 mr-1.5" />}
                        เจ้าบ้านชนะ
                      </Button>
                      <Button
                        variant={selected === "draw" ? "default" : "outline"}
                        className={`h-11 rounded-lg transition-all ${
                          selected === "draw"
                            ? "shadow-lg shadow-primary/20"
                            : "bg-transparent hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                        }`}
                        onClick={() => handlePrediction(match.id, "draw")}
                        aria-pressed={selected === "draw"}
                      >
                        {selected === "draw" && <CheckCircle2 className="hidden sm:block w-4 h-4 mr-1.5" />}
                        เสมอ
                      </Button>
                      <Button
                        variant={selected === "away" ? "default" : "outline"}
                        className={`h-11 rounded-lg transition-all ${
                          selected === "away"
                            ? "shadow-lg shadow-primary/20"
                            : "bg-transparent hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                        }`}
                        onClick={() => handlePrediction(match.id, "away")}
                        aria-pressed={selected === "away"}
                      >
                        {selected === "away" && <CheckCircle2 className="hidden sm:block w-4 h-4 mr-1.5" />}
                        ทีมเยือนชนะ
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="flex justify-center mt-6 sm:hidden">
          <Button asChild variant="outline" className="gap-1 bg-transparent">
            <Link href="/matches">ดูแมตช์ทั้งหมด <ChevronRight className="w-4 h-4" /></Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

function LeaderboardSection() {
  return (
    <section id="leaderboard" className="py-16 md:py-24 border-t border-border scroll-mt-24">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-5 gap-8">
          <QuizLeaderboardPanel />
          <div className="lg:col-span-2 space-y-6 min-w-0">
            {/* Points System */}
            <div>
              <Badge variant="outline" className="mb-2">ระบบแต้ม</Badge>
              <h3 className="text-2xl font-display mb-4">คะแนนจากการทาย</h3>
              <Card className="border-border/50">
                <CardContent className="p-5 space-y-4">
                  {[
                    { label: "Who Am I? ทายถูก", pts: "+40", icon: User, color: "text-amber-500" },
                    { label: "ทายสกอร์ถูกต้อง", pts: "+100", icon: Hash, color: "text-emerald-500" },
                    { label: "ทายคนยิงประตูแรกถูก", pts: "+50", icon: Zap, color: "text-sky-500" },
                    { label: "ตอบคำถามควิซถูก", pts: "+10", icon: Brain, color: "text-violet-500" },
                    { label: "โบนัสทายถูก 5 แมตช์ติด", pts: "+200", icon: Flame, color: "text-red-500" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0`}>
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.label}</p>
                      </div>
                      <span className="text-sm font-semibold text-primary shrink-0">{item.pts}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <QuizHistoryPanel />
          </div>
        </div>
      </div>
    </section>
  )
}

function QuizSection() {
  return (
    <section className="py-16 md:py-24 bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">ควิซ</Badge>
          <h2 className="text-3xl md:text-5xl font-display mb-4">แบบทดสอบความรู้ฟุตบอล</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            ทดสอบความรู้ฟุตบอลของคุณ สะสมแต้มไต่อันดับ
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {quizCategories.map((quiz, i) => (
            <Link key={i} href={`/games/quiz?category=${quiz.key}`}>
              <Card className="border-border/50 hover:border-primary/50 transition-all group cursor-pointer h-full">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <quiz.icon className={`w-8 h-8 ${quiz.color}`} />
                  </div>
                  <h3 className="font-semibold mb-1">{quiz.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{quiz.questions} คำถาม</p>
                  <Badge variant="outline" className="text-[10px]">{quiz.difficulty}</Badge>
                  <Button size="sm" variant="ghost" className="w-full mt-4 gap-1 text-primary" asChild>
                    <span>
                      เล่นเลย <ArrowRight className="w-3 h-3" />
                    </span>
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function RewardsSection() {
  const rewards = [
    { icon: Medal, title: "นักทาย Rookie", desc: "ทายผลครบ 10 แมตช์", unlocked: true },
    { icon: Award, title: "นักทาย Pro", desc: "ทายถูก 50 ครั้ง", unlocked: true },
    { icon: Trophy, title: "นักทาย Legend", desc: "ขึ้นอันดับ Top 10 ประจำเดือน", unlocked: false },
    { icon: Crown, title: "แชมป์ฤดูกาล", desc: "อันดับ 1 ตลอดฤดูกาล", unlocked: false },
  ]

  return (
    <section className="py-16 md:py-24 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">รางวัล</Badge>
          <h2 className="text-3xl md:text-5xl font-display mb-4">เหรียญรางวัล & ความสำเร็จ</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            สะสมเหรียญรางวัลจากการทายผลและเล่นเกม
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {rewards.map((reward, i) => (
            <Card
              key={i}
              className={`border-border/50 transition-all ${
                reward.unlocked ? "hover:border-primary/50" : "opacity-60"
              }`}
            >
              <CardContent className="p-6 text-center relative">
                {!reward.unlocked && (
                  <div className="absolute top-3 right-3">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                  reward.unlocked ? "bg-primary/10" : "bg-muted/50"
                }`}>
                  <reward.icon className={`w-8 h-8 ${reward.unlocked ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <h3 className="font-semibold mb-1">{reward.title}</h3>
                <p className="text-xs text-muted-foreground">{reward.desc}</p>
                {reward.unlocked && (
                  <Badge className="mt-3 bg-primary/10 text-primary border-primary/20 text-[10px]">
                    <CheckCircle2 className="w-3 h-3 mr-0.5" /> ปลดล็อกแล้ว
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTASection() {
  return (
    <section className="py-16 md:py-24 bg-primary/5 border-t border-border">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-display mb-4">พร้อมทายผลแล้วหรือยัง?</h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-8">
          สมัครสมาชิกฟรี เริ่มทายผล สะสมแต้ม และไต่อันดับลีดเดอร์บอร์ดกับเพื่อน ๆ ได้เลย
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild size="lg" className="h-12 px-8 rounded-lg shadow-lg shadow-primary/20 gap-2">
            <Link href="/register">
              <Users className="w-5 h-5" />
              สมัครสมาชิกฟรี
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 px-8 rounded-lg bg-transparent">
            <Link href="/login">เข้าสู่ระบบ</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

// --- Main Page ---

export default function GamesPage() {
  return (
    <div className="games-landing min-h-screen">
      <Navigation />
      {/* The landing is always dark; scope the theme tokens so cards and badges match it. */}
      <div className="dark text-foreground">
        <HeroSection />
        <GameModeCards />
        <PredictionSection />
        <LeaderboardSection />
        <QuizSection />
        <RewardsSection />
        <CTASection />
      </div>
      <Footer />
      <style jsx global>{`
        .games-landing {
          --games-bg: #040a12;
          --games-fg: #f4f6ff;
          --games-muted: #8c9ab3;
          --games-copy: #b7c3d8;
          --games-border: rgba(255, 255, 255, 0.09);
          --games-lime: #c8ff2e;
          --games-prompt: var(--font-prompt), system-ui, sans-serif;
          --games-anuphan: var(--font-anuphan), system-ui, sans-serif;
          overflow-x: clip;
          background:
            radial-gradient(circle at 50% 12%, rgba(200, 255, 46, 0.1), transparent 30rem),
            linear-gradient(180deg, #040a12 0%, #050b14 48%, #040a12 100%);
          color: var(--games-fg);
          font-family: var(--games-anuphan);
        }

        .games-landing section {
          border-color: var(--games-border);
        }

        .games-landing .bg-muted\\/30 {
          background-color: rgba(255, 255, 255, 0.025);
        }

        .games-landing .border-border,
        .games-landing .border-border\\/50 {
          border-color: var(--games-border);
        }

        .games-landing .text-muted-foreground {
          color: var(--games-muted);
        }

        .games-landing .text-primary {
          color: var(--games-lime);
        }

        .games-landing .bg-primary\\/5 {
          background-color: rgba(200, 255, 46, 0.045);
        }

        .games-landing .font-display,
        .games-landing h2,
        .games-landing h3 {
          font-family: var(--games-prompt);
        }

        .games-hero {
          min-height: min(760px, 100svh);
          background:
            linear-gradient(180deg, rgba(4, 10, 18, 0.76), var(--games-bg) 88%),
            radial-gradient(circle at 50% 78%, rgba(200, 255, 46, 0.09), transparent 26rem);
        }

        .games-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
          background-size: 88px 88px;
          mask-image: linear-gradient(to bottom, transparent, black 20%, black 70%, transparent);
          opacity: 0.22;
        }

        .games-hero__spotlight {
          position: absolute;
          top: -9rem;
          width: min(44vw, 35rem);
          height: 42rem;
          pointer-events: none;
          filter: blur(18px);
          opacity: 0.38;
          mix-blend-mode: screen;
        }

        .games-hero__spotlight--left {
          left: -4rem;
          transform: rotate(-21deg);
          background: conic-gradient(from 188deg at 50% 0%, transparent 0deg, rgba(255, 244, 210, 0.56) 19deg, transparent 42deg);
        }

        .games-hero__spotlight--right {
          right: -4rem;
          transform: rotate(21deg);
          background: conic-gradient(from 150deg at 50% 0%, transparent 0deg, rgba(200, 255, 46, 0.34) 20deg, transparent 43deg);
        }

        .games-hero__glow {
          position: absolute;
          inset: auto 5% 12% 5%;
          height: 20rem;
          border-radius: 999px;
          pointer-events: none;
          background: radial-gradient(ellipse at center, rgba(116, 255, 92, 0.16), transparent 68%);
          filter: blur(28px);
        }

        .games-hero__pitch {
          position: absolute;
          left: 50%;
          bottom: -17rem;
          width: min(92vw, 58rem);
          aspect-ratio: 1;
          transform: translateX(-50%);
          border: 1px solid rgba(200, 255, 46, 0.14);
          border-radius: 999px;
          pointer-events: none;
          box-shadow: inset 0 0 48px rgba(200, 255, 46, 0.05), 0 0 54px rgba(200, 255, 46, 0.04);
        }

        .games-hero-badge,
        .games-section-badge {
          border: 1px solid rgba(200, 255, 46, 0.24);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.045);
          color: var(--games-lime);
          font-family: var(--games-anuphan);
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          backdrop-filter: blur(16px);
        }

        .games-hero-badge {
          padding: 0.55rem 0.9rem;
        }

        .games-hero-badge__dot {
          width: 0.48rem;
          height: 0.48rem;
          border-radius: 999px;
          background: var(--games-lime);
          box-shadow: 0 0 0 0 rgba(200, 255, 46, 0.58);
          animation: gamesPulse 1.8s ease-out infinite;
        }

        .games-hero-title {
          max-width: min(100%, 12ch);
          font-family: var(--games-prompt);
          font-size: clamp(3.75rem, 12vw, 9.375rem);
          font-weight: 800;
          line-height: 0.98;
          letter-spacing: 0;
          color: transparent;
          background: linear-gradient(112deg, #ffffff 8%, #f4f6ff 42%, var(--games-lime) 92%);
          background-clip: text;
          -webkit-background-clip: text;
          text-shadow: 0 0 34px rgba(200, 255, 46, 0.22);
        }

        .games-hero-copy,
        .games-section-copy {
          color: var(--games-copy);
        }

        .games-hero .games-hero-action {
          border: 1px solid transparent;
          font-family: var(--games-anuphan);
          font-weight: 700;
          transition: transform 180ms ease, border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease;
        }

        .games-hero .games-hero-action:hover {
          transform: translateY(-2px);
        }

        .games-hero .games-hero-action:focus-visible,
        .game-mode-card:focus-visible {
          outline: 2px solid var(--games-lime);
          outline-offset: 4px;
        }

        .games-hero .games-hero-action--primary {
          background: var(--games-lime);
          color: #101706;
          box-shadow: 0 14px 42px rgba(200, 255, 46, 0.24);
        }

        .games-hero .games-hero-action--primary:hover {
          background: #d6ff5d;
          color: #101706;
          box-shadow: 0 18px 52px rgba(200, 255, 46, 0.3);
        }

        .games-hero .games-hero-action--secondary {
          border-color: var(--games-border);
          background: rgba(255, 255, 255, 0.055);
          color: var(--games-fg);
          backdrop-filter: blur(16px);
        }

        .games-hero .games-hero-action--secondary:hover {
          border-color: rgba(200, 255, 46, 0.34);
          background: rgba(255, 255, 255, 0.085);
          color: var(--games-fg);
        }

        .games-modes {
          background:
            radial-gradient(circle at 50% 5%, rgba(157, 139, 255, 0.14), transparent 19rem),
            linear-gradient(180deg, rgba(4, 10, 18, 0.98), #050b14 48%, var(--games-bg));
        }

        .games-modes__heading-glow {
          position: absolute;
          left: 50%;
          top: 4rem;
          width: min(52rem, 90vw);
          height: 18rem;
          transform: translateX(-50%);
          border-radius: 999px;
          background: radial-gradient(ellipse at center, rgba(157, 139, 255, 0.16), transparent 68%);
          filter: blur(34px);
          pointer-events: none;
        }

        .games-section-title {
          color: var(--games-fg);
          font-family: var(--games-prompt);
          font-weight: 800;
          letter-spacing: 0;
        }

        .game-mode-card {
          --x: 50%;
          --y: 50%;
          position: relative;
          display: block;
          min-height: 300px;
          overflow: hidden;
          border: 1px solid var(--games-border);
          border-radius: 28px;
          padding: clamp(1.25rem, 3vw, 1.875rem);
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.015)),
            radial-gradient(circle at 20% 0%, color-mix(in srgb, var(--mode-color) 12%, transparent), transparent 19rem);
          color: var(--games-fg);
          text-decoration: none;
          isolation: isolate;
          transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
        }

        .game-mode-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at var(--x) var(--y), color-mix(in srgb, var(--mode-color) 24%, transparent), transparent 15rem);
          opacity: 0;
          transition: opacity 180ms ease;
          z-index: 0;
        }

        .game-mode-card__pointer-glow {
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          pointer-events: none;
          background: radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--mode-color) 10%, transparent), transparent 17rem);
          opacity: 0.72;
        }

        .game-mode-card__watermark {
          position: absolute;
          right: -0.35rem;
          bottom: -2.35rem;
          pointer-events: none;
          color: transparent;
          -webkit-text-stroke: 1px color-mix(in srgb, var(--mode-color) 19%, transparent);
          font-family: var(--games-prompt);
          font-size: clamp(6.5rem, 16vw, 9.375rem);
          font-weight: 800;
          line-height: 1;
          opacity: 0.74;
          z-index: 0;
        }

        .game-mode-card__icon {
          display: flex;
          width: 3.5rem;
          height: 3.5rem;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border: 1px solid color-mix(in srgb, var(--mode-color) 28%, transparent);
          border-radius: 18px;
          background: color-mix(in srgb, var(--mode-color) 12%, transparent);
          color: var(--mode-color);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .game-mode-card__status {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          white-space: nowrap;
          border: 1px solid rgba(200, 255, 46, 0.22);
          border-radius: 999px;
          background: rgba(200, 255, 46, 0.09);
          color: var(--games-lime);
          padding: 0.32rem 0.62rem;
          font-size: 0.68rem;
          font-weight: 700;
        }

        .game-mode-card__status--locked {
          border-color: var(--games-border);
          background: rgba(255, 255, 255, 0.04);
          color: var(--games-muted);
        }

        .game-mode-card__title {
          color: var(--games-fg);
          font-family: var(--games-prompt);
          font-size: clamp(1.45rem, 3vw, 1.75rem);
          font-weight: 800;
          line-height: 1.18;
          letter-spacing: 0;
        }

        .game-mode-card__subtitle {
          margin-top: 0.45rem;
          color: var(--mode-color);
          font-weight: 700;
        }

        .game-mode-card__description {
          margin-top: 1rem;
          max-width: 33rem;
          color: var(--games-copy);
          font-size: 0.95rem;
          line-height: 1.75;
        }

        .game-mode-card__points {
          display: block;
          color: var(--mode-color);
          font-family: var(--games-prompt);
          font-size: clamp(2.35rem, 5vw, 2.75rem);
          font-weight: 800;
          line-height: 0.95;
          letter-spacing: 0;
        }

        .game-mode-card__unit {
          display: block;
          margin-top: 0.4rem;
          color: var(--games-muted);
          font-size: 0.85rem;
          font-weight: 600;
        }

        .game-mode-card__arrow {
          display: inline-flex;
          width: 3rem;
          height: 3rem;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--games-border);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.045);
          color: var(--games-fg);
          transition: transform 220ms ease, background-color 220ms ease, color 220ms ease, border-color 220ms ease;
        }

        .game-mode-card:hover,
        .game-mode-card:focus-visible {
          border-color: color-mix(in srgb, var(--mode-color) 58%, transparent);
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
        }

        .game-mode-card:hover::before,
        .game-mode-card:focus-visible::before {
          opacity: 1;
        }

        .game-mode-card:hover .game-mode-card__arrow,
        .game-mode-card:focus-visible .game-mode-card__arrow {
          border-color: transparent;
          background: var(--mode-color);
          color: #07100d;
          transform: rotate(-45deg);
        }

        @media (hover: hover) and (pointer: fine) {
          .game-mode-card:hover {
            transform: translateY(-6px);
          }
        }

        @media (max-width: 420px) {
          .games-hero-title {
            max-width: 6ch;
            font-size: clamp(3.15rem, 15vw, 3.55rem);
          }

          .game-mode-card__watermark {
            right: -0.75rem;
            bottom: -1.45rem;
            font-size: 6.4rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .games-hero-badge__dot {
            animation: none;
          }

          .games-hero .games-hero-action,
          .game-mode-card,
          .game-mode-card::before,
          .game-mode-card__arrow {
            transition-duration: 1ms;
          }

          .games-hero .games-hero-action:hover,
          .game-mode-card:hover,
          .game-mode-card:hover .game-mode-card__arrow,
          .game-mode-card:focus-visible .game-mode-card__arrow {
            transform: none;
          }
        }

        @keyframes gamesPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(200, 255, 46, 0.58);
          }
          70% {
            box-shadow: 0 0 0 9px rgba(200, 255, 46, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(200, 255, 46, 0);
          }
        }
      `}</style>
    </div>
  )
}
