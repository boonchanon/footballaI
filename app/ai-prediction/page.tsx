"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import {
  MapPin,
  Clock,
  Calendar,
  CheckCircle2,
  Brain,
  Sparkles,
  TrendingUp,
  Target,
  Zap,
  ChevronRight,
  Trophy,
} from "lucide-react"
import { useState, useEffect } from "react"

export default function AIPredictionPage() {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<any>(null)
  const [filter, setFilter] = useState<"all" | "upcoming" | "finished">("all")

  const mlModels = [
    { id: "svm", name: "SVM", accuracy: "87.5%", color: "from-blue-500 to-cyan-500" },
    { id: "rf", name: "Random Forest", accuracy: "89.2%", color: "from-green-500 to-emerald-500" },
    { id: "xgb", name: "XGBoost", accuracy: "91.3%", color: "from-amber-500 to-orange-500" },
    { id: "nn", name: "Neural Network", accuracy: "90.8%", color: "from-purple-500 to-pink-500" },
    { id: "ens", name: "Ensemble", accuracy: "93.7%", color: "from-primary to-accent" },
  ]

  useEffect(() => {
    const mockMatches = [
      {
        id: 1,
        homeTeam: "แมนเชสเตอร์ ซิตี้",
        awayTeam: "ลิเวอร์พูล",
        homeLogo: "/generic-football-club-badge.png",
        awayLogo: "/liverpool-crest.png",
        date: "10 ม.ค. 2026",
        time: "22:00",
        stadium: "Etihad Stadium",
        league: "Premier League",
        status: "finished",
        actualScore: { home: 2, away: 1 },
        goals: [
          { team: "home", player: "Erling Haaland", minute: 23 },
          { team: "away", player: "Mohamed Salah", minute: 45 },
          { team: "home", player: "Kevin De Bruyne", minute: 78 },
        ],
        predictions: [
          { model: "svm", homeScore: 2, awayScore: 1, confidence: 78, correct: true },
          { model: "rf", homeScore: 2, awayScore: 2, confidence: 82, correct: false },
          { model: "xgb", homeScore: 3, awayScore: 1, confidence: 85, correct: false },
          { model: "nn", homeScore: 2, awayScore: 1, confidence: 81, correct: true },
          { model: "ens", homeScore: 2, awayScore: 1, confidence: 88, correct: true },
        ],
        winProbability: { home: 55, draw: 25, away: 20 },
      },
      {
        id: 2,
        homeTeam: "อาร์เซนอล",
        awayTeam: "เชลซี",
        homeLogo: "/arsenal-football-club-emblem.png",
        awayLogo: "/football-club-badge.png",
        date: "12 ม.ค. 2026",
        time: "00:30",
        stadium: "Emirates Stadium",
        league: "Premier League",
        status: "finished",
        actualScore: { home: 2, away: 1 },
        goals: [
          { team: "home", player: "Bukayo Saka", minute: 15 },
          { team: "away", player: "Cole Palmer", minute: 58 },
          { team: "home", player: "Martin Ødegaard", minute: 89 },
        ],
        predictions: [
          { model: "svm", homeScore: 1, awayScore: 1, confidence: 75, correct: false },
          { model: "rf", homeScore: 2, awayScore: 0, confidence: 79, correct: false },
          { model: "xgb", homeScore: 2, awayScore: 1, confidence: 83, correct: true },
          { model: "nn", homeScore: 1, awayScore: 0, confidence: 77, correct: false },
          { model: "ens", homeScore: 2, awayScore: 1, confidence: 86, correct: true },
        ],
        winProbability: { home: 48, draw: 28, away: 24 },
      },
      {
        id: 3,
        homeTeam: "แมนเชสเตอร์ ยูไนเต็ด",
        awayTeam: "ท็อตแน่ม ฮ็อทสเปอร์",
        homeLogo: "/manchester-united-crest.png",
        awayLogo: "/tottenham-hotspur-crest.png",
        date: "17 ม.ค. 2026",
        time: "21:00",
        stadium: "Old Trafford",
        league: "Premier League",
        status: "upcoming",
        predictions: [
          { model: "svm", homeScore: 1, awayScore: 2, confidence: 72 },
          { model: "rf", homeScore: 1, awayScore: 1, confidence: 76 },
          { model: "xgb", homeScore: 2, awayScore: 2, confidence: 80 },
          { model: "nn", homeScore: 1, awayScore: 1, confidence: 74 },
          { model: "ens", homeScore: 1, awayScore: 2, confidence: 82 },
        ],
        winProbability: { home: 35, draw: 30, away: 35 },
      },
      {
        id: 4,
        homeTeam: "นิวคาสเซิล ยูไนเต็ด",
        awayTeam: "แอสตัน วิลล่า",
        homeLogo: "/newcastle-united-logo.png",
        awayLogo: "/aston-villa-logo.png",
        date: "18 ม.ค. 2026",
        time: "19:30",
        stadium: "St James' Park",
        league: "Premier League",
        status: "upcoming",
        predictions: [
          { model: "svm", homeScore: 2, awayScore: 0, confidence: 80 },
          { model: "rf", homeScore: 3, awayScore: 1, confidence: 84 },
          { model: "xgb", homeScore: 2, awayScore: 1, confidence: 87 },
          { model: "nn", homeScore: 2, awayScore: 0, confidence: 82 },
          { model: "ens", homeScore: 2, awayScore: 1, confidence: 89 },
        ],
        winProbability: { home: 58, draw: 24, away: 18 },
      },
    ]

    setTimeout(() => {
      setMatches(mockMatches)
      setLoading(false)
    }, 800)
  }, [])

  const getModelDetails = (modelId: string) => mlModels.find((m) => m.id === modelId) || mlModels[0]
  const getEnsemblePrediction = (match: any) => {
    if (!match?.predictions) return { homeScore: 0, awayScore: 0, confidence: 0 }
    return match.predictions.find((p: any) => p.model === "ens") || { homeScore: 0, awayScore: 0, confidence: 0 }
  }

  const filteredMatches = matches.filter((match) => {
    if (filter === "all") return true
    return match.status === filter
  })

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <div className="relative overflow-hidden border-b border-border">
        {/* Gradient Glow Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/20 rounded-full blur-[120px]" />
          <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[100px]" />
        </div>

        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            {/* AI Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">AI-Powered Predictions</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display text-balance mb-6">
              ทำนายผลด้วย
              <span className="text-primary"> AI </span>
              ที่แม่นยำที่สุด
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 text-pretty">
              วิเคราะห์โดย 5 โมเดล Machine Learning รวมถึง Neural Network และ XGBoost ด้วยความแม่นยำสูงสุดถึง 93.7%
            </p>

            {/* Model Stats Row */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-8">
              {[
                { icon: Brain, label: "5 ML Models", value: "Ensemble" },
                { icon: Target, label: "Accuracy", value: "93.7%" },
                { icon: Zap, label: "Real-time", value: "Analysis" },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card/50 backdrop-blur border border-border/50"
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="font-semibold text-foreground">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {[
                { key: "all", label: "ทั้งหมด", count: matches.length },
                { key: "upcoming", label: "ยังไม่แข่ง", count: matches.filter((m) => m.status === "upcoming").length },
                { key: "finished", label: "จบแล้ว", count: matches.filter((m) => m.status === "finished").length },
              ].map((tab) => (
                <Button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as any)}
                  variant={filter === tab.key ? "default" : "ghost"}
                  size="sm"
                  className={`rounded-full gap-2 ${filter === tab.key ? "" : "text-muted-foreground"}`}
                >
                  {tab.label}
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${filter === tab.key ? "bg-primary-foreground/20" : "bg-muted"}`}
                  >
                    {tab.count}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <Brain className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-muted-foreground">AI กำลังวิเคราะห์ข้อมูล...</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 max-w-5xl mx-auto">
            {filteredMatches.map((match) => {
              const ensemblePred = getEnsemblePrediction(match)
              return (
                <Card
                  key={match.id}
                  className="group relative overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <CardContent className="relative p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <Badge variant="outline" className="gap-1.5">
                        <Trophy className="w-3 h-3" />
                        {match.league}
                      </Badge>
                      {match.status === "finished" ? (
                        <Badge className="gap-1 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          จบแล้ว
                        </Badge>
                      ) : (
                        <Badge className="gap-1 bg-primary/10 text-primary border-primary/20">
                          <Clock className="w-3 h-3" />
                          กำลังจะแข่ง
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-6">
                      <div className="flex-1 text-center">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center overflow-hidden">
                          <img
                            src={match.homeLogo || "/placeholder.svg"}
                            alt={match.homeTeam}
                            className="w-12 h-12 object-contain"
                          />
                        </div>
                        <p className="font-semibold text-sm">{match.homeTeam}</p>
                      </div>

                      <div className="px-4">
                        {match.status === "finished" ? (
                          <div className="text-center">
                            <div className="text-3xl font-bold font-display text-primary mb-1">
                              {match.actualScore.home} - {match.actualScore.away}
                            </div>
                            <p className="text-xs text-muted-foreground">สกอร์จริง</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className="text-3xl font-bold font-display text-primary mb-1">
                              {ensemblePred.homeScore} - {ensemblePred.awayScore}
                            </div>
                            <p className="text-xs text-muted-foreground">AI ทำนาย</p>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 text-center">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center overflow-hidden">
                          <img
                            src={match.awayLogo || "/placeholder.svg"}
                            alt={match.awayTeam}
                            className="w-12 h-12 object-contain"
                          />
                        </div>
                        <p className="font-semibold text-sm">{match.awayTeam}</p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex justify-between text-xs text-muted-foreground mb-2">
                        <span>เจ้าบ้านชนะ</span>
                        <span>เสมอ</span>
                        <span>ทีมเยือนชนะ</span>
                      </div>
                      <div className="flex h-3 rounded-full overflow-hidden bg-muted/50">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                          style={{ width: `${match.winProbability.home}%` }}
                        />
                        <div
                          className="bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                          style={{ width: `${match.winProbability.draw}%` }}
                        />
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                          style={{ width: `${match.winProbability.away}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-sm font-semibold mt-2">
                        <span className="text-emerald-500">{match.winProbability.home}%</span>
                        <span className="text-amber-500">{match.winProbability.draw}%</span>
                        <span className="text-blue-500">{match.winProbability.away}%</span>
                      </div>
                    </div>

                    {/* Match Info */}
                    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mb-6">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{match.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{match.time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{match.stadium}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 mb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-sm">AI Confidence</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                            style={{ width: `${ensemblePred.confidence}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-primary">{ensemblePred.confidence}%</span>
                      </div>
                    </div>

                    <Button onClick={() => setSelectedMatch(match)} className="w-full gap-2 group/btn">
                      <Brain className="w-4 h-4" />
                      {match.status === "finished" ? "ดูผลการวิเคราะห์" : "ดูการทำนายละเอียด"}
                      <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      <Dialog open={!!selectedMatch} onOpenChange={(open) => !open && setSelectedMatch(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0">
          {/* Dialog Header with Gradient */}
          <div className="relative p-6 pb-8 border-b border-border overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
            <DialogHeader className="relative">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Badge variant="outline" className="gap-1.5">
                  <Trophy className="w-3 h-3" />
                  {selectedMatch?.league}
                </Badge>
                {selectedMatch?.status === "finished" && (
                  <Badge className="gap-1 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    จบแล้ว
                  </Badge>
                )}
              </div>

              {/* Teams in Dialog */}
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-muted/50 flex items-center justify-center">
                    <img
                      src={selectedMatch?.homeLogo || "/placeholder.svg"}
                      alt=""
                      className="w-14 h-14 object-contain"
                    />
                  </div>
                  <p className="font-semibold">{selectedMatch?.homeTeam}</p>
                </div>

                <div className="text-center">
                  {selectedMatch?.status === "finished" ? (
                    <>
                      <div className="text-5xl font-bold font-display text-primary">
                        {selectedMatch.actualScore.home} - {selectedMatch.actualScore.away}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">สกอร์จริง</p>
                    </>
                  ) : (
                    <>
                      <div className="text-5xl font-bold font-display text-primary">
                        {getEnsemblePrediction(selectedMatch)?.homeScore} -{" "}
                        {getEnsemblePrediction(selectedMatch)?.awayScore}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">AI ทำนาย (Ensemble)</p>
                    </>
                  )}
                </div>

                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-muted/50 flex items-center justify-center">
                    <img
                      src={selectedMatch?.awayLogo || "/placeholder.svg"}
                      alt=""
                      className="w-14 h-14 object-contain"
                    />
                  </div>
                  <p className="font-semibold">{selectedMatch?.awayTeam}</p>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-6">
            {/* Win Probability Section */}
            {selectedMatch?.winProbability && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  โอกาสชนะ
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "เจ้าบ้านชนะ", value: selectedMatch.winProbability.home, color: "emerald" },
                    { label: "เสมอ", value: selectedMatch.winProbability.draw, color: "amber" },
                    { label: "ทีมเยือนชนะ", value: selectedMatch.winProbability.away, color: "blue" },
                  ].map((item) => (
                    <div key={item.label} className="text-center p-4 rounded-xl bg-muted/30">
                      <div className={`text-3xl font-bold text-${item.color}-500 mb-1`}>{item.value}%</div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Goals Timeline */}
            {selectedMatch?.status === "finished" && selectedMatch?.goals && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">ไทม์ไลน์ประตู</h3>
                <div className="space-y-2">
                  {selectedMatch.goals.map((goal: any, i: number) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        goal.team === "home" ? "bg-emerald-500/10" : "bg-blue-500/10"
                      }`}
                    >
                      <span className="text-sm font-mono font-bold text-muted-foreground w-10">{goal.minute}'</span>
                      <span className="font-semibold">{goal.player}</span>
                      <Badge variant="outline" className="ml-auto">
                        {goal.team === "home" ? selectedMatch.homeTeam : selectedMatch.awayTeam}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ML Models Predictions */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                การทำนายจาก 5 โมเดล ML
              </h3>
              <div className="space-y-3">
                {selectedMatch?.predictions.map((prediction: any) => {
                  const modelInfo = getModelDetails(prediction.model)
                  return (
                    <div
                      key={prediction.model}
                      className={`relative overflow-hidden rounded-xl border transition-all ${
                        prediction.correct ? "border-emerald-500/50 bg-emerald-500/5" : "border-border bg-card/50"
                      }`}
                    >
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg bg-gradient-to-br ${modelInfo.color} flex items-center justify-center`}
                          >
                            <Brain className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{modelInfo.name}</span>
                              {prediction.correct && <Badge className="bg-emerald-500 text-white text-xs">ถูกต้อง</Badge>}
                            </div>
                            <span className="text-xs text-muted-foreground">ความแม่นยำ {modelInfo.accuracy}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold font-display">
                              {prediction.homeScore} - {prediction.awayScore}
                            </div>
                            <p className="text-xs text-muted-foreground">ทำนาย</p>
                          </div>

                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">{prediction.confidence}%</div>
                            <p className="text-xs text-muted-foreground">ความมั่นใจ</p>
                          </div>
                        </div>
                      </div>

                      {/* Confidence Bar */}
                      <div className="h-1 bg-muted">
                        <div
                          className={`h-full bg-gradient-to-r ${modelInfo.color} transition-all duration-500`}
                          style={{ width: `${prediction.confidence}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Match Info */}
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground pt-4 border-t border-border">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>{selectedMatch?.date}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{selectedMatch?.time}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span>{selectedMatch?.stadium}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
