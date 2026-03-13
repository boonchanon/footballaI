"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Play,
  Clock,
  CheckCircle,
  Trophy,
  MapPin,
  TrendingUp,
} from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import Image from "next/image"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function MatchesContent() {
  const searchParams = useSearchParams()
  const filterParam = searchParams.get("filter")

  const getDefaultTab = () => {
    switch (filterParam) {
      case "live":
        return "live"
      case "upcoming":
        return "upcoming"
      case "finished":
        return "finished"
      default:
        return "upcoming"
    }
  }

  const [activeTab, setActiveTab] = useState(getDefaultTab())
  const [selectedRound, setSelectedRound] = useState<number>(0)
  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [showCount, setShowCount] = useState(20)
  const [roundInitialized, setRoundInitialized] = useState(false)

  useEffect(() => {
    setActiveTab(getDefaultTab())
  }, [filterParam])

  const {
    data: allData,
    isLoading,
    mutate,
  } = useSWR("/api/football/fixtures?type=all", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  const transformFixture = (fixture: any) => {
    const date = new Date(fixture.date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    let dateStr = date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
    if (date.toDateString() === today.toDateString()) dateStr = "วันนี้"
    else if (date.toDateString() === tomorrow.toDateString()) dateStr = "พรุ่งนี้"

    return {
      id: fixture.id?.toString(),
      round: fixture.roundNumber || 1,
      homeTeam: fixture.teams.home.name,
      awayTeam: fixture.teams.away.name,
      homeTeamEn: fixture.teams.home.nameEn || fixture.teams.home.name,
      awayTeamEn: fixture.teams.away.nameEn || fixture.teams.away.name,
      homeId: fixture.teams.home.id,
      awayId: fixture.teams.away.id,
      homeLogo: fixture.teams.home.logo,
      awayLogo: fixture.teams.away.logo,
      homeScore: fixture.goals.home,
      awayScore: fixture.goals.away,
      date: dateStr,
      fullDate: date,
      time: date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
      status: fixture.status.isLive ? "live" : fixture.status.isFinished ? "finished" : "upcoming",
      venue: fixture.venue?.name || "",
    }
  }

  const allFixtures = (allData?.data || []).map(transformFixture)
  const availableRounds: number[] = allData?.rounds?.available || []
  const totalRounds = allData?.rounds?.total || 38

  // Auto-select round to the latest round with finished matches or the first upcoming round
  useEffect(() => {
    if (!roundInitialized && allFixtures.length > 0 && availableRounds.length > 0) {
      const finishedRounds = allFixtures
        .filter((m: any) => m.status === "finished")
        .map((m: any) => m.round)
      const maxFinishedRound = finishedRounds.length > 0 ? Math.max(...finishedRounds) : 0

      const upcomingRounds = allFixtures
        .filter((m: any) => m.status === "upcoming")
        .map((m: any) => m.round)
      const minUpcomingRound = upcomingRounds.length > 0 ? Math.min(...upcomingRounds) : 0

      // Pick the current round (the one with a mix of finished and upcoming, or latest finished)
      const currentRound = minUpcomingRound || maxFinishedRound || availableRounds[0] || 1
      setSelectedRound(currentRound)
      setRoundInitialized(true)
    }
  }, [allFixtures, availableRounds, roundInitialized])

  // Extract unique team list from fixtures
  const teamList = (() => {
    const teams = new Map<string, { id: string; name: string; logo: string }>()
    allFixtures.forEach((m: any) => {
      if (m.homeId && !teams.has(m.homeId)) teams.set(m.homeId, { id: m.homeId, name: m.homeTeam, logo: m.homeLogo })
      if (m.awayId && !teams.has(m.awayId)) teams.set(m.awayId, { id: m.awayId, name: m.awayTeam, logo: m.awayLogo })
    })
    return Array.from(teams.values()).sort((a, b) => a.name.localeCompare(b.name, "th"))
  })()

  // Apply team filter
  const filterByTeam = (matches: any[]) => {
    if (selectedTeam === "all") return matches
    return matches.filter((m: any) => m.homeId === selectedTeam || m.awayId === selectedTeam)
  }

  // Apply status filter
  const filterByStatus = (matches: any[]) => {
    if (selectedStatus === "all") return matches
    return matches.filter((m: any) => m.status === selectedStatus)
  }

  const roundFixtures = filterByTeam(allFixtures.filter((m: any) => m.round === selectedRound))
  const liveMatches = filterByTeam(allFixtures.filter((m: any) => m.status === "live"))
  const upcomingMatches = filterByTeam(allFixtures.filter((m: any) => m.status === "upcoming"))
  const finishedMatches = filterByTeam(allFixtures.filter((m: any) => m.status === "finished"))

  // Get next upcoming match for featured section
  const nextMatch = upcomingMatches[0]

  const FeaturedMatchCard = ({ match }: { match: any }) => {
    if (!match) return null

    return (
      <Link href={`/matches/${match.id}`} className="block">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-primary/20 text-primary border-0">แมตช์ถัดไป</Badge>
              <span className="text-sm text-muted-foreground">นัดที่ {match.round}</span>
            </div>

            <div className="flex items-center justify-between gap-6">
              {/* Home Team */}
              <div className="flex-1 text-center">
                <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-card border border-border/50 flex items-center justify-center p-2">
                  {match.homeLogo ? (
                    <Image
                      src={match.homeLogo || "/placeholder.svg"}
                      alt={match.homeTeam}
                      width={64}
                      height={64}
                      className="w-16 h-16 object-contain"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-full" />
                  )}
                </div>
                <h3 className="font-semibold text-lg">{match.homeTeam}</h3>
                <span className="text-sm text-muted-foreground">เจ้าบ้าน</span>
              </div>

              {/* VS and Time */}
              <div className="text-center px-6">
                <div className="text-3xl font-bold text-muted-foreground mb-2">VS</div>
                <div className="bg-card border border-border/50 rounded-lg px-4 py-2">
                  <div className="text-primary font-semibold">{match.date}</div>
                  <div className="text-2xl font-bold">{match.time}</div>
                </div>
              </div>

              {/* Away Team */}
              <div className="flex-1 text-center">
                <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-card border border-border/50 flex items-center justify-center p-2">
                  {match.awayLogo ? (
                    <Image
                      src={match.awayLogo || "/placeholder.svg"}
                      alt={match.awayTeam}
                      width={64}
                      height={64}
                      className="w-16 h-16 object-contain"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-full" />
                  )}
                </div>
                <h3 className="font-semibold text-lg">{match.awayTeam}</h3>
                <span className="text-sm text-muted-foreground">ทีมเยือน</span>
              </div>
            </div>

            {match.venue && (
              <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-border/50 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{match.venue}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    )
  }

  const MatchCard = ({ match, showDate = true }: { match: any; showDate?: boolean }) => (
    <Link href={`/matches/${match.id}`} className="block group">
      <Card className="border-border/50 hover:border-primary/50 transition-all duration-200 overflow-hidden">
        <CardContent className="p-0">
          {/* Status bar */}
          <div
            className={`h-1 ${match.status === "live" ? "bg-red-500" : match.status === "finished" ? "bg-muted" : "bg-primary/50"}`}
          />

          <div className="p-4">
            {/* Header with status and round */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {match.status === "live" && (
                  <Badge variant="destructive" className="gap-1">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    LIVE
                  </Badge>
                )}
                {match.status === "finished" && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle className="w-3 h-3" /> จบแล้ว
                  </Badge>
                )}
                {match.status === "upcoming" && showDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{match.date}</span>
                    <span className="font-semibold text-primary">{match.time}</span>
                  </div>
                )}
              </div>
              <Badge variant="outline" className="text-xs">
                นัด {match.round}
              </Badge>
            </div>

            {/* Teams */}
            <div className="flex items-center gap-4">
              {/* Home Team */}
              <div className="flex-1 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-card border border-border/50 flex items-center justify-center p-1 shrink-0">
                  {match.homeLogo ? (
                    <Image
                      src={match.homeLogo || "/placeholder.svg"}
                      alt={match.homeTeam}
                      width={40}
                      height={40}
                      className="w-10 h-10 object-contain"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{match.homeTeam}</p>
                  <p className="text-xs text-muted-foreground">เจ้าบ้าน</p>
                </div>
              </div>

              {/* Score */}
              <div className="px-4 text-center shrink-0">
                {match.status === "upcoming" ? (
                  <div className="text-2xl font-bold text-muted-foreground">-</div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${match.homeScore > match.awayScore ? "text-primary" : ""}`}>
                      {match.homeScore}
                    </span>
                    <span className="text-muted-foreground">:</span>
                    <span className={`text-2xl font-bold ${match.awayScore > match.homeScore ? "text-primary" : ""}`}>
                      {match.awayScore}
                    </span>
                  </div>
                )}
              </div>

              {/* Away Team */}
              <div className="flex-1 flex items-center gap-3 justify-end">
                <div className="min-w-0 text-right">
                  <p className="font-semibold truncate">{match.awayTeam}</p>
                  <p className="text-xs text-muted-foreground">ทีมเยือน</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-card border border-border/50 flex items-center justify-center p-1 shrink-0">
                  {match.awayLogo ? (
                    <Image
                      src={match.awayLogo || "/placeholder.svg"}
                      alt={match.awayTeam}
                      width={40}
                      height={40}
                      className="w-10 h-10 object-contain"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded" />
                  )}
                </div>
              </div>
            </div>

            {/* Venue */}
            {match.venue && (
              <div className="flex items-center justify-center gap-1.5 mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{match.venue}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )

  const StatsCard = ({
    icon: Icon,
    label,
    value,
    color,
  }: { icon: any; label: string; value: number; color: string }) => (
    <Card className="border-border/50">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Page Header */}
      <div className="border-b border-border/50 bg-gradient-to-b from-muted/50 to-transparent">
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold">{"โปรแกรมการแข่งขัน"}</h1>
                </div>
                <p className="text-sm text-muted-foreground ml-[52px]">{"พรีเมียร์ลีก 2024/25"}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => mutate()}
                disabled={isLoading}
                className="gap-2 self-start sm:self-center"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                {"อัปเดต"}
              </Button>
            </div>

            {/* Filter Bar */}
            {!isLoading && allFixtures.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex-shrink-0">{"กรองข้อมูล"}</span>
                <div className="flex flex-wrap gap-2">
                  <Select value={selectedTeam} onValueChange={(v) => { setSelectedTeam(v); setShowCount(20) }}>
                    <SelectTrigger className="w-[180px] sm:w-[200px] h-9 text-sm">
                      <SelectValue placeholder="เลือกทีม" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{"ทุกทีม"}</SelectItem>
                      {teamList.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          <span className="flex items-center gap-2">
                            {team.logo && (
                              <Image
                                src={team.logo}
                                alt=""
                                width={16}
                                height={16}
                                className="w-4 h-4 object-contain"
                              />
                            )}
                            {team.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v); setShowCount(20) }}>
                    <SelectTrigger className="w-[140px] sm:w-[160px] h-9 text-sm">
                      <SelectValue placeholder="สถานะ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{"ทุกสถานะ"}</SelectItem>
                      <SelectItem value="live">{"กำลังแข่ง"}</SelectItem>
                      <SelectItem value="upcoming">{"รอแข่ง"}</SelectItem>
                      <SelectItem value="finished">{"จบแล้ว"}</SelectItem>
                    </SelectContent>
                  </Select>

                  {(selectedTeam !== "all" || selectedStatus !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 text-sm text-muted-foreground hover:text-foreground"
                      onClick={() => { setSelectedTeam("all"); setSelectedStatus("all") }}
                    >
                      {"ล้างตัวกรอง"}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        {isLoading ? (
          <Card className="border-border/50">
            <CardContent className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">กำลังโหลดโปรแกรมการแข่งขัน...</span>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <StatsCard icon={Play} label="แมตช์สด" value={liveMatches.length} color="bg-red-500/10 text-red-500" />
              <StatsCard icon={Clock} label="รอแข่ง" value={upcomingMatches.length} color="bg-primary/10 text-primary" />
              <StatsCard
                icon={CheckCircle}
                label="จบแล้ว"
                value={finishedMatches.length}
                color="bg-muted text-muted-foreground"
              />
              <StatsCard icon={Trophy} label="ทั้งหมด" value={filterByTeam(allFixtures).length} color="bg-primary/10 text-primary" />
            </div>

            {/* Active filter badge */}
            {selectedTeam !== "all" && (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="gap-2 py-1.5 px-3">
                  {teamList.find((t) => t.id === selectedTeam)?.logo && (
                    <Image
                      src={teamList.find((t) => t.id === selectedTeam)?.logo || ""}
                      alt=""
                      width={16}
                      height={16}
                      className="w-4 h-4 object-contain"
                    />
                  )}
                  {"กรองตาม: "}{teamList.find((t) => t.id === selectedTeam)?.name}
                  <button
                    onClick={() => setSelectedTeam("all")}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                    aria-label="ล้างตัวกรอง"
                  >
                    &times;
                  </button>
                </Badge>
              </div>
            )}

            {/* Featured Next Match */}
            {nextMatch && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  แมตช์ที่กำลังจะมาถึง
                </h2>
                <FeaturedMatchCard match={nextMatch} />
              </div>
            )}

            {/* Match Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setShowCount(20) }} className="w-full">
              <TabsList className="w-full justify-start bg-muted/50 p-1 h-auto flex-wrap">
                <TabsTrigger value="upcoming" className="gap-2 data-[state=active]:bg-background">
                  <Clock className="w-4 h-4" />
                  รอแข่ง
                </TabsTrigger>
                <TabsTrigger value="live" className="gap-2 data-[state=active]:bg-background">
                  {liveMatches.length > 0 && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                  <Play className="w-4 h-4" />
                  สด
                </TabsTrigger>
                <TabsTrigger value="finished" className="gap-2 data-[state=active]:bg-background">
                  <CheckCircle className="w-4 h-4" />
                  จบแล้ว
                </TabsTrigger>
                <TabsTrigger value="byRound" className="gap-2 data-[state=active]:bg-background">
                  <Calendar className="w-4 h-4" />
                  ตามนัด
                </TabsTrigger>
              </TabsList>

              {/* By Round Content */}
              <TabsContent value="byRound" className="mt-6 space-y-4">
                <Card className="border-border/50">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-2 sm:gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 flex-shrink-0"
                        onClick={() => setSelectedRound(Math.max(1, selectedRound - 1))}
                        disabled={selectedRound <= 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <div className="flex items-center gap-2 sm:gap-4">
                        <Select value={selectedRound.toString()} onValueChange={(v) => setSelectedRound(Number(v))}>
                          <SelectTrigger className="w-28 sm:w-36 h-9 text-sm">
                            <SelectValue placeholder="เลือกนัด" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRounds.length > 0
                              ? availableRounds.map((round: number) => {
                                  const roundMatches = allFixtures.filter((m: any) => m.round === round)
                                  const finCount = roundMatches.filter((m: any) => m.status === "finished").length
                                  const total = roundMatches.length
                                  return (
                                    <SelectItem key={round} value={round.toString()}>
                                      <span className="flex items-center gap-2">
                                        {"นัดที่ "}{round}
                                        {total > 0 && (
                                          <span className="text-xs text-muted-foreground">
                                            ({finCount}/{total})
                                          </span>
                                        )}
                                      </span>
                                    </SelectItem>
                                  )
                                })
                              : Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => (
                                  <SelectItem key={round} value={round.toString()}>
                                    {"นัดที่ "}{round}
                                  </SelectItem>
                                ))}
                          </SelectContent>
                        </Select>
                        <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">{"จาก "}{totalRounds}{" นัด"}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 flex-shrink-0"
                        onClick={() => setSelectedRound(Math.min(totalRounds, selectedRound + 1))}
                        disabled={selectedRound >= totalRounds}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Round summary */}
                    {roundFixtures.length > 0 && (
                      <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />{roundFixtures.filter((m: any) => m.status === "finished").length}{" จบ"}</span>
                        <span className="flex items-center gap-1"><Play className="w-3 h-3" />{roundFixtures.filter((m: any) => m.status === "live").length}{" สด"}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{roundFixtures.filter((m: any) => m.status === "upcoming").length}{" รอแข่ง"}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="grid gap-3">
                  {roundFixtures.length > 0 ? (
                    roundFixtures.map((match: any) => <MatchCard key={match.id} match={match} />)
                  ) : (
                    <Card className="border-border/50">
                      <CardContent className="text-center py-12">
                        <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-muted-foreground">{"ยังไม่มีข้อมูลสำหรับนัดที่ "}{selectedRound}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Live Content */}
              <TabsContent value="live" className="mt-6">
                <div className="grid gap-3">
                  {liveMatches.length > 0 ? (
                    liveMatches.map((match: any) => <MatchCard key={match.id} match={match} />)
                  ) : (
                    <Card className="border-border/50">
                      <CardContent className="text-center py-12">
                        <Play className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-muted-foreground">ไม่มีแมตช์ที่กำลังแข่งขันในขณะนี้</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Upcoming Content */}
              <TabsContent value="upcoming" className="mt-6">
                <div className="grid gap-3">
                  {upcomingMatches.length > 0 ? (
                    <>
                      {upcomingMatches.slice(nextMatch ? 1 : 0, showCount).map((match: any) => (
                        <MatchCard key={match.id} match={match} />
                      ))}
                      {upcomingMatches.length > showCount && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowCount((prev) => prev + 20)}
                        >
                          {"แสดงเพิ่มเติม"} ({upcomingMatches.length - showCount} {"แมตช์"})
                        </Button>
                      )}
                    </>
                  ) : (
                    <Card className="border-border/50">
                      <CardContent className="text-center py-12">
                        <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-muted-foreground">{"ไม่มีแมตช์ที่รอแข่งขัน"}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Finished Content */}
              <TabsContent value="finished" className="mt-6">
                <div className="grid gap-3">
                  {finishedMatches.length > 0 ? (
                    <>
                      {[...finishedMatches]
                        .reverse()
                        .slice(0, showCount)
                        .map((match: any) => (
                          <MatchCard key={match.id} match={match} showDate={true} />
                        ))}
                      {finishedMatches.length > showCount && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowCount((prev) => prev + 20)}
                        >
                          {"แสดงเพิ่มเติม"} ({finishedMatches.length - showCount} {"แมตช์"})
                        </Button>
                      )}
                    </>
                  ) : (
                    <Card className="border-border/50">
                      <CardContent className="text-center py-12">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-muted-foreground">{"ยังไม่มีแมตช์ที่จบแล้ว"}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
