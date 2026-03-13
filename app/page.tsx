"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Brain, Loader2, ChevronRight, Calendar, Users, Zap, Shield, BarChart3, Play } from "lucide-react"
import { CompactStandings } from "@/components/compact-standings"
import { NewsFeed } from "@/components/news-feed"
import useSWR from "swr"
import Image from "next/image"
import { HeroBackground } from "@/components/hero-background"
import { WorldCupBanner } from "@/components/worldcup-banner"
import { WorldCupPopup } from "@/components/worldcup-popup"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function Home() {
  const { data: fixturesData } = useSWR("/api/football/fixtures?type=upcoming&limit=6", fetcher)
  const { data: topScorersData } = useSWR("/api/football/topscorers", fetcher)
  const { data: liveData } = useSWR("/api/football/fixtures?type=live", fetcher)

  const fixtures = fixturesData?.fixtures || []
  const liveMatches = liveData?.fixtures || []

  const upcomingMatches = fixtures.slice(0, 4).map((match: any) => ({
    home: match.homeTeamThai || match.homeTeam,
    away: match.awayTeamThai || match.awayTeam,
    time: match.dateThai || match.date,
    homeLogo: match.homeLogo,
    awayLogo: match.awayLogo,
    fixtureId: match.id,
    venue: match.venue || "สนามแข่งขัน",
  }))

  const scorers = topScorersData?.players || []
  const topScorers = scorers.slice(0, 5).map((player: any) => ({
    name: player.name,
    team: player.teamNameThai || player.teamName,
    goals: player.goals,
    photo: player.photo,
    teamLogo: player.teamLogo,
  }))

  const features = [
    {
      icon: Brain,
      title: "AI ทำนายผล",
      description: "ใช้ Machine Learning 5 โมเดลวิเคราะห์ผลการแข่งขันอย่างแม่นยำ",
    },
    {
      icon: BarChart3,
      title: "สถิติเชิงลึก",
      description: "ข้อมูลสถิติครบถ้วนของทีมและนักเตะทุกคน",
    },
    {
      icon: Zap,
      title: "อัปเดตเรียลไทม์",
      description: "ติดตามผลการแข่งขันสดและข่าวสารล่าสุดทันที",
    },
    {
      icon: Shield,
      title: "ข้อมูลน่าเชื่อถือ",
      description: "ข้อมูลจากแหล่งทางการและ API ที่ได้รับการรับรอง",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <WorldCupPopup />
      <WorldCupBanner />
      <Navigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        <HeroBackground />

        <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full text-sm font-medium text-primary border border-primary/20">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                Premier League 2025/26
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display tracking-tight text-foreground leading-tight">
                วิเคราะห์ฟุตบอล
                <br />
                <span className="text-primary">ด้วยพลัง AI</span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
                แพลตฟอร์มวิเคราะห์ฟุตบอลอันดับ 1 ของไทย พร้อมระบบ AI ทำนายผล สถิติเชิงลึก และชุมชนแฟนบอลที่ใหญ่ที่สุด
              </p>

              <div className="flex flex-wrap gap-4">
                <Button asChild size="lg" className="h-12 px-6 rounded-lg shadow-lg shadow-primary/20">
                  <Link href="/ai-prediction" className="gap-2">
                    <Brain className="w-5 h-5" />
                    ทำนายผลด้วย AI
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 px-6 rounded-lg bg-background/50 backdrop-blur-sm"
                >
                  <Link href="/matches" className="gap-2">
                    <Play className="w-5 h-5" />
                    ดูโปรแกรม
                  </Link>
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-border/50">
                <div>
                  <p className="text-3xl font-display text-primary">93.7%</p>
                  <p className="text-sm text-muted-foreground">ความแม่นยำ AI</p>
                </div>
                <div>
                  <p className="text-3xl font-display text-primary">50K+</p>
                  <p className="text-sm text-muted-foreground">ผู้ใช้งาน</p>
                </div>
                <div>
                  <p className="text-3xl font-display text-primary">380+</p>
                  <p className="text-sm text-muted-foreground">แมตช์/ฤดูกาล</p>
                </div>
              </div>
            </div>

            {/* Right - Live Matches or Upcoming */}
            <div className="space-y-4">
              {liveMatches.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-live-pulse" />
                    <span className="text-sm font-medium text-red-500">กำลังแข่งขันสด</span>
                  </div>
                  {liveMatches.slice(0, 1).map((match: any, i: number) => (
                    <Card key={i} className="border-red-500/50 bg-red-500/5 backdrop-blur-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {match.homeLogo && (
                              <Image
                                src={match.homeLogo || "/placeholder.svg"}
                                alt=""
                                width={40}
                                height={40}
                                className="rounded-full"
                              />
                            )}
                            <span className="font-semibold">{match.homeTeamThai || match.homeTeam}</span>
                          </div>
                          <div className="text-2xl font-bold">
                            {match.homeScore ?? 0} - {match.awayScore ?? 0}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">{match.awayTeamThai || match.awayTeam}</span>
                            {match.awayLogo && (
                              <Image
                                src={match.awayLogo || "/placeholder.svg"}
                                alt=""
                                width={40}
                                height={40}
                                className="rounded-full"
                              />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <Card className="border-border/50 shadow-xl bg-card/80 backdrop-blur-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">แมตช์ที่กำลังจะมาถึง</h3>
                    </div>
                    <Link href="/matches" className="text-sm text-primary hover:underline">
                      ดูทั้งหมด
                    </Link>
                  </div>

                  <div className="space-y-4">
                    {upcomingMatches.length > 0 ? (
                      upcomingMatches.map((match: any, i: number) => (
                        <Link
                          key={i}
                          href={`/ai-prediction?fixture=${match.fixtureId}`}
                          className="block p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 flex-1">
                              {match.homeLogo && (
                                <Image
                                  src={match.homeLogo || "/placeholder.svg"}
                                  alt=""
                                  width={24}
                                  height={24}
                                  className="rounded-full"
                                />
                              )}
                              <span className="font-medium text-sm truncate">{match.home}</span>
                            </div>
                            <span className="text-xs text-muted-foreground px-2">vs</span>
                            <div className="flex items-center gap-2 flex-1 justify-end">
                              <span className="font-medium text-sm truncate">{match.away}</span>
                              {match.awayLogo && (
                                <Image
                                  src={match.awayLogo || "/placeholder.svg"}
                                  alt=""
                                  width={24}
                                  height={24}
                                  className="rounded-full"
                                />
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{match.time}</span>
                            <span className="text-primary">ทำนายผล →</span>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="flex items-center justify-center py-8 text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        กำลังโหลด...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              ฟีเจอร์
            </Badge>
            <h2 className="text-3xl md:text-4xl font-display mb-4">ทำไมต้องเลือก FootballAI</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              เครื่องมือวิเคราะห์ฟุตบอลที่ครบครันที่สุด พร้อมเทคโนโลยี AI ที่ทันสมัย
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <Card key={i} className="border-border/50 hover:border-primary/50 transition-colors group">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Top Scorers Section */}
      <section className="py-16 md:py-24 bg-muted/30 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <Badge variant="outline" className="mb-2">
                สถิติ
              </Badge>
              <h2 className="text-3xl md:text-4xl font-display">ดาวซัลโวสูงสุด</h2>
            </div>
            <Link href="/players" className="text-sm text-primary hover:underline flex items-center gap-1">
              ดูทั้งหมด
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {topScorers.length > 0 ? (
              topScorers.map((player: any, i: number) => (
                <Card key={i} className="border-border/50 overflow-hidden hover:border-primary/50 transition-colors">
                  <div className="aspect-square relative bg-gradient-to-br from-muted to-muted/50">
                    {player.photo ? (
                      <Image src={player.photo || "/placeholder.svg"} alt={player.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users className="w-16 h-16 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-display text-lg">
                      {i + 1}
                    </div>
                    <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md">
                      <span className="font-display text-xl text-primary">{player.goals}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">ประตู</span>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-semibold text-sm truncate">{player.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {player.teamLogo && (
                        <Image
                          src={player.teamLogo || "/placeholder.svg"}
                          alt=""
                          width={12}
                          height={12}
                          className="rounded-full"
                        />
                      )}
                      <span className="truncate">{player.team}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                กำลังโหลด...
              </div>
            )}
          </div>
        </div>
      </section>

      {/* News & Standings Section */}
      <section className="py-16 md:py-24 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* News */}
            <div className="lg:col-span-2">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <Badge variant="outline" className="mb-2">
                    อัปเดต
                  </Badge>
                  <h2 className="text-3xl md:text-4xl font-display">ข่าวล่าสุด</h2>
                </div>
                <Link href="/news" className="text-sm text-primary hover:underline flex items-center gap-1">
                  ดูทั้งหมด
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <NewsFeed />
            </div>

            {/* Standings */}
            <div>
              <div className="flex items-end justify-between mb-6">
                <div>
                  <Badge variant="outline" className="mb-2">
                    อันดับ
                  </Badge>
                  <h2 className="text-3xl md:text-4xl font-display">ตารางคะแนน</h2>
                </div>
                <Link href="/standings" className="text-sm text-primary hover:underline flex items-center gap-1">
                  ดูทั้งหมด
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <CompactStandings />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary/5 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-display mb-4">พร้อมเริ่มต้นวิเคราะห์ฟุตบอลแล้วหรือยัง?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            สมัครสมาชิกฟรีวันนี้ เพื่อเข้าถึงฟีเจอร์ AI ทำนายผลและสถิติเชิงลึกทั้งหมด
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="h-12 px-8 rounded-lg shadow-lg shadow-primary/20">
              <Link href="/register">สมัครสมาชิกฟรี</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 rounded-lg bg-transparent">
              <Link href="/login">เข้าสู่ระบบ</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
