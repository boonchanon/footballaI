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

// --- Mock Data ---

const leaderboardWeekly = [
  { rank: 1, name: "SomchaiGoal99", points: 2480, avatar: "/thai-man-football-fan.jpg", change: "up" },
  { rank: 2, name: "BallKingTH", points: 2350, avatar: "/thai-man-liverpool-supporter.jpg", change: "up" },
  { rank: 3, name: "FootballNerd", points: 2210, avatar: "/thai-man-arsenal-fan.jpg", change: "down" },
  { rank: 4, name: "PremFanatic", points: 2100, avatar: "/thai-man-chelsea-supporter.jpg", change: "same" },
  { rank: 5, name: "GoalMachine", points: 1980, avatar: "/thai-man-manchester-united-fan.jpg", change: "up" },
]

const upcomingPredictions = [
  {
    id: 1,
    home: "แมนเชสเตอร์ ซิตี้",
    away: "ลิเวอร์พูล",
    homeLogo: "/manchester-city-logo.png",
    awayLogo: "/liverpool-logo.png",
    date: "วันเสาร์ 15 ก.พ. 2026",
    time: "23:30",
    league: "Premier League",
    status: "open",
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
    status: "open",
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
    status: "open",
  },
]

const quizCategories = [
  { key: "world-cup", title: "ประวัติศาสตร์ฟุตบอลโลก", questions: 20, difficulty: "ยาก", icon: Trophy, color: "text-amber-500" },
  { key: "legendary-players", title: "นักเตะในตำนาน", questions: 15, difficulty: "ปานกลาง", icon: Star, color: "text-primary" },
  { key: "premier-league-stats", title: "สถิติพรีเมียร์ลีก", questions: 25, difficulty: "ง่าย", icon: TrendingUp, color: "text-emerald-500" },
  { key: "clubs-stadiums", title: "สโมสรและสนาม", questions: 15, difficulty: "ปานกลาง", icon: CircleDot, color: "text-sky-500" },
]

const recentResults = [
  { match: "แมนซิตี้ 2-1 อาร์เซนอล", prediction: "แมนซิตี้ชนะ", result: "ถูก", points: "+30" },
  { match: "ลิเวอร์พูล 0-0 เชลซี", prediction: "ลิเวอร์พูลชนะ", result: "ผิด", points: "0" },
  { match: "สเปอร์ส 3-2 แมนยู", prediction: "สเปอร์สชนะ", result: "ถูก", points: "+30" },
  { match: "นิวคาสเซิล 1-0 บิ๊กตัน", prediction: "สกอร์ 1-0", result: "ถูก", points: "+100" },
]

// --- Components ---

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/games-hero.jpg"
          alt="Football stadium atmosphere"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/80 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/60" />
      </div>
      <div className="container mx-auto px-4 py-20 md:py-28 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            Predictions & Gaming
          </Badge>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display tracking-tight text-foreground mb-4">
            ทายผล <span className="text-primary">ชิงแต้ม</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
            ทายผลแมตช์ ทายสกอร์ ทายดาวยิงคนแรก แข่งขันกับเพื่อน ไต่อันดับลีดเดอร์บอร์ด
            และทดสอบความรู้ฟุตบอลของคุณ
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" className="h-12 px-8 rounded-lg shadow-lg shadow-primary/20 gap-2">
              <Target className="w-5 h-5" />
              เริ่มทายผลเลย
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 rounded-lg bg-transparent gap-2">
              <Crown className="w-5 h-5" />
              ดูอันดับ
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-border/30 max-w-lg mx-auto">
            <div>
              <p className="text-3xl font-display text-primary">12K+</p>
              <p className="text-sm text-muted-foreground">ผู้เล่น</p>
            </div>
            <div>
              <p className="text-3xl font-display text-primary">85K+</p>
              <p className="text-sm text-muted-foreground">ทายผลแล้ว</p>
            </div>
            <div>
              <p className="text-3xl font-display text-primary">5M+</p>
              <p className="text-sm text-muted-foreground">แต้มแจก</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function GameModeCards() {
  const gameModes = [
    {
      icon: User,
      title: "Who Am I?",
      subtitle: "ทายชื่อนักเตะจากคำใบ้",
      description: "อ่านคำใบ้เกี่ยวกับนักเตะพรีเมียร์ลีก ยิ่งเปิดน้อย ยิ่งได้แต้มเยอะ",
      points: "+40 แต้ม/ข้อ",
      color: "from-amber-500/20 to-amber-500/5",
      borderColor: "hover:border-amber-500/50",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
      available: true,
      href: "/games/who-am-i",
    },
    {
      icon: Hash,
      title: "ทายสกอร์",
      subtitle: "ทายผลแบบแม่น",
      description: "ทายสกอร์ที่แน่นอนของแต่ละแมตช์ ได้แต้มสูงสุดถ้าตรง",
      points: "+100 แต้ม",
      color: "from-emerald-500/20 to-emerald-500/5",
      borderColor: "hover:border-emerald-500/50",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
      available: true,
      href: "/games/predict-score",
    },
    {
      icon: Zap,
      title: "ทายคนยิงประตูแรก",
      subtitle: "First Goal Scorer",
      description: "เลือกนักเตะที่คุณคิดว่าจะยิงประตูแรกของแมตช์",
      points: "+50 แต้ม",
      color: "from-sky-500/20 to-sky-500/5",
      borderColor: "hover:border-sky-500/50",
      iconBg: "bg-sky-500/10",
      iconColor: "text-sky-500",
      available: true,
      href: "/games/first-scorer",
    },
    {
      icon: Brain,
      title: "แบบทดสอบความรู้ฟุตบอล",
      subtitle: "Football Quiz",
      description: "ตอบคำถามความรู้ฟุตบอล สะสมแต้มและแข่งกับเพื่อน",
      points: "+10 แต้ม/ข้อ",
      color: "from-violet-500/20 to-violet-500/5",
      borderColor: "hover:border-violet-500/50",
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-500",
      available: true,
      href: "/games/quiz",
    },
  ]

  return (
    <section className="py-16 md:py-24 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">โหมดเกม</Badge>
          <h2 className="text-3xl md:text-5xl font-display mb-4">เลือกโหมดที่คุณชอบ</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            4 โหมดเกมให้เลือกเล่น แต่ละโหมดมีระบบแต้มที่แตกต่างกัน
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {gameModes.map((mode, i) => (
            <Link key={i} href={mode.href}>
              <Card
                className={`border-border/50 ${mode.borderColor} transition-all duration-300 group cursor-pointer relative overflow-hidden h-full`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${mode.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                <CardContent className="p-6 relative z-10">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl ${mode.iconBg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                      <mode.icon className={`w-7 h-7 ${mode.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{mode.title}</h3>
                        {mode.available ? (
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">เปิดให้เล่น</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]"><Lock className="w-3 h-3 mr-1" />เร็ว ๆ นี้</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{mode.subtitle}</p>
                      <p className="text-sm text-muted-foreground mb-3">{mode.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-primary">{mode.points}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                          เล่นเลย <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function PredictionSection() {
  const [selectedPredictions, setSelectedPredictions] = useState<Record<number, string>>({})

  const handlePrediction = (matchId: number, prediction: string) => {
    setSelectedPredictions((prev) => ({ ...prev, [matchId]: prediction }))
  }

  return (
    <section className="py-16 md:py-24 bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-8">
          <div>
            <Badge variant="outline" className="mb-2">ทายผลแมตช์</Badge>
            <h2 className="text-3xl md:text-4xl font-display">แมตช์ที่เปิดให้ทาย</h2>
          </div>
          <Button variant="ghost" className="gap-1 text-primary hidden sm:flex">
            ดูทั้งหมด <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {upcomingPredictions.map((match) => {
            const selected = selectedPredictions[match.id]
            return (
              <Card key={match.id} className="border-border/50 overflow-hidden">
                <CardContent className="p-0">
                  {/* Match Header */}
                  <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-2">
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
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
                          <Image src={match.homeLogo || "/placeholder.svg"} alt={match.home} width={40} height={40} className="object-contain" />
                        </div>
                        <span className="font-semibold truncate">{match.home}</span>
                      </div>

                      <span className="text-sm font-display text-2xl text-muted-foreground px-4">VS</span>

                      {/* Away */}
                      <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                        <span className="font-semibold truncate text-right">{match.away}</span>
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
                      >
                        {selected === "home" && <CheckCircle2 className="w-4 h-4 mr-1.5" />}
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
                      >
                        {selected === "draw" && <CheckCircle2 className="w-4 h-4 mr-1.5" />}
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
                      >
                        {selected === "away" && <CheckCircle2 className="w-4 h-4 mr-1.5" />}
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
          <Button variant="outline" className="gap-1 bg-transparent">
            ดูแมตช์ทั้งหมด <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}

function LeaderboardSection() {
  const [period, setPeriod] = useState<"weekly" | "monthly" | "season">("weekly")

  return (
    <section className="py-16 md:py-24 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Leaderboard */}
          <div className="lg:col-span-3">
            <div className="flex items-end justify-between mb-6">
              <div>
                <Badge variant="outline" className="mb-2">อันดับ</Badge>
                <h2 className="text-3xl md:text-4xl font-display">ลีดเดอร์บอร์ด</h2>
              </div>
              <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
                {(["weekly", "monthly", "season"] as const).map((p) => (
                  <button
                    key={p}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      period === p
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setPeriod(p)}
                  >
                    {p === "weekly" ? "สัปดาห์" : p === "monthly" ? "เดือน" : "ฤดูกาล"}
                  </button>
                ))}
              </div>
            </div>

            <Card className="border-border/50">
              <CardContent className="p-0">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-border/50 text-xs text-muted-foreground font-medium bg-muted/30">
                  <div className="col-span-1">อันดับ</div>
                  <div className="col-span-7">ผู้เล่น</div>
                  <div className="col-span-2 text-right">แต้ม</div>
                  <div className="col-span-2 text-right">สถานะ</div>
                </div>

                {leaderboardWeekly.map((player, i) => (
                  <div
                    key={player.rank}
                    className={`grid grid-cols-12 gap-2 px-5 py-4 items-center transition-colors hover:bg-muted/30 ${
                      i !== leaderboardWeekly.length - 1 ? "border-b border-border/30" : ""
                    }`}
                  >
                    <div className="col-span-1">
                      {player.rank <= 3 ? (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display text-lg ${
                          player.rank === 1
                            ? "bg-amber-500/20 text-amber-500"
                            : player.rank === 2
                              ? "bg-slate-300/20 text-slate-300"
                              : "bg-orange-600/20 text-orange-600"
                        }`}>
                          {player.rank}
                        </div>
                      ) : (
                        <span className="text-muted-foreground font-medium pl-2">{player.rank}</span>
                      )}
                    </div>
                    <div className="col-span-7 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
                        <Image src={player.avatar || "/placeholder.svg"} alt={player.name} width={40} height={40} className="object-cover w-full h-full" />
                      </div>
                      <span className="font-medium truncate">{player.name}</span>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="font-display text-xl text-primary">{player.points.toLocaleString()}</span>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      {player.change === "up" && (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                          <TrendingUp className="w-3 h-3 mr-0.5" /> ขึ้น
                        </Badge>
                      )}
                      {player.change === "down" && (
                        <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px]">
                          <TrendingUp className="w-3 h-3 mr-0.5 rotate-180" /> ลง
                        </Badge>
                      )}
                      {player.change === "same" && (
                        <Badge variant="outline" className="text-[10px]">คงที่</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Points System + Recent Results */}
          <div className="lg:col-span-2 space-y-6">
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

            {/* My Recent Results */}
            <div>
              <h3 className="text-2xl font-display mb-4">ผลทายล่าสุด</h3>
              <Card className="border-border/50">
                <CardContent className="p-5 space-y-3">
                  {recentResults.map((r, i) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${
                      r.result === "ถูก" ? "bg-emerald-500/5" : "bg-red-500/5"
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        r.result === "ถูก" ? "bg-emerald-500/10" : "bg-red-500/10"
                      }`}>
                        {r.result === "ถูก" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <span className="text-red-500 text-xs font-bold">X</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.match}</p>
                        <p className="text-xs text-muted-foreground">ทาย: {r.prediction}</p>
                      </div>
                      <span className={`text-sm font-semibold shrink-0 ${
                        r.result === "ถูก" ? "text-emerald-500" : "text-red-500"
                      }`}>
                        {r.points}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
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
    <div className="min-h-screen bg-background">
      <Navigation />
      <HeroSection />
      <GameModeCards />
      <PredictionSection />
      <LeaderboardSection />
      <QuizSection />
      <RewardsSection />
      <CTASection />
      <Footer />
    </div>
  )
}
