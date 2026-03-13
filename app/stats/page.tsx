"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, ChevronDown, ChevronUp, Trophy, Target, HandHelping, Shield } from "lucide-react"
import Link from "next/link"
import useSWR from "swr"
import Image from "next/image"
import { useState } from "react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface PlayerStat {
  id: string
  name: string
  photo: string
  team: string
  teamLogo: string
  value: number
  goals: number
  assists: number
  matches: number
}

function StatHeroCard({
  title,
  icon: Icon,
  players,
  statKey,
  statLabel,
  accentColor,
  isLoading,
}: {
  title: string
  icon: React.ElementType
  players: PlayerStat[]
  statKey: "value"
  statLabel: string
  accentColor: string
  isLoading: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const topPlayer = players[0]
  const runnerUps = players.slice(1, 3)
  const restPlayers = players.slice(3, expanded ? 20 : 3)

  if (isLoading) {
    return (
      <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
        <div className="aspect-[4/3] bg-muted/30 animate-pulse" />
        <div className="p-4 space-y-3">
          <div className="h-5 w-24 bg-muted/30 rounded animate-pulse" />
          <div className="h-4 w-full bg-muted/20 rounded animate-pulse" />
          <div className="h-4 w-full bg-muted/20 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (!topPlayer) {
    return (
      <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
        <div className="aspect-[4/3] flex items-center justify-center bg-muted/10">
          <p className="text-muted-foreground text-sm">{"ไม่มีข้อมูล"}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-card border border-border/50 overflow-hidden group">
      {/* Hero Section - #1 Player */}
      <div className="relative">
        {/* Category Label */}
        <div
          className="absolute top-0 left-0 right-0 z-10 px-4 py-3"
          style={{ background: `linear-gradient(180deg, ${accentColor}ee 0%, ${accentColor}00 100%)` }}
        >
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-white" />
            <span className="font-display text-xl tracking-wider text-white uppercase">{title}</span>
          </div>
        </div>

        {/* Player Image */}
        <div className="relative aspect-[4/3] bg-gradient-to-b from-muted/20 to-card overflow-hidden">
          {topPlayer.photo && (
            <Image
              src={topPlayer.photo}
              alt={topPlayer.name}
              fill
              className="object-cover object-top"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          )}

          {/* Team Logo */}
          {topPlayer.teamLogo && (
            <div className="absolute bottom-14 left-3 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-background/80 backdrop-blur-sm p-1.5 border border-border/50">
              <Image
                src={topPlayer.teamLogo}
                alt={topPlayer.team}
                width={48}
                height={48}
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* #1 Player Info Bar */}
          <div
            className="absolute bottom-0 left-0 right-0 px-4 py-2.5 flex items-center justify-between"
            style={{ backgroundColor: accentColor }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-white/70 font-display text-lg">1</span>
              <Link href={`/players/${topPlayer.id}`} className="hover:underline min-w-0">
                <span className="text-white font-bold text-sm sm:text-base truncate block">
                  {topPlayer.name}
                </span>
              </Link>
            </div>
            <span className="text-white font-display text-2xl sm:text-3xl flex-shrink-0 ml-2">
              {topPlayer.value}
            </span>
          </div>
        </div>
      </div>

      {/* Runner-ups */}
      <div className="divide-y divide-border/30">
        {runnerUps.map((player, i) => (
          <div
            key={player.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
          >
            <span className="text-muted-foreground font-display text-lg w-5 text-center flex-shrink-0">
              {i + 2}
            </span>
            <div className="w-8 h-8 rounded-full bg-muted/50 overflow-hidden flex-shrink-0">
              {player.photo && (
                <Image
                  src={player.photo}
                  alt={player.name}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <Link href={`/players/${player.id}`} className="flex-1 min-w-0 hover:underline">
              <span className="text-sm font-medium text-foreground truncate block">
                {player.name}
              </span>
            </Link>
            {player.teamLogo && (
              <Image
                src={player.teamLogo}
                alt={player.team}
                width={20}
                height={20}
                className="w-5 h-5 object-contain flex-shrink-0"
              />
            )}
            <span className="font-bold text-sm text-foreground w-8 text-right flex-shrink-0">
              {player.value}
            </span>
          </div>
        ))}

        {/* Expanded list */}
        {expanded &&
          restPlayers.map((player, i) => (
            <div
              key={player.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <span className="text-muted-foreground font-display text-lg w-5 text-center flex-shrink-0">
                {i + 4}
              </span>
              <div className="w-8 h-8 rounded-full bg-muted/50 overflow-hidden flex-shrink-0">
                {player.photo && (
                  <Image
                    src={player.photo}
                    alt={player.name}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <Link href={`/players/${player.id}`} className="flex-1 min-w-0 hover:underline">
                <span className="text-sm font-medium text-foreground truncate block">
                  {player.name}
                </span>
              </Link>
              {player.teamLogo && (
                <Image
                  src={player.teamLogo}
                  alt={player.team}
                  width={20}
                  height={20}
                  className="w-5 h-5 object-contain flex-shrink-0"
                />
              )}
              <span className="font-bold text-sm text-foreground w-8 text-right flex-shrink-0">
                {player.value}
              </span>
            </div>
          ))}
      </div>

      {/* Show Full List Button */}
      {players.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors border-t border-border/30 flex items-center justify-center gap-1"
        >
          {expanded ? (
            <>
              {"ซ่อนรายชื่อ"}
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              {"แสดงทั้งหมด"}
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  )
}

function CleanSheetCard({
  teams,
  isLoading,
}: {
  teams: { rank: number; teamName: string; teamNameThai: string; teamLogo: string; cleanSheets: number }[]
  isLoading: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const topTeam = teams[0]
  const runnerUps = teams.slice(1, 3)
  const restTeams = teams.slice(3, expanded ? 10 : 3)

  if (isLoading) {
    return (
      <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
        <div className="h-32 bg-muted/30 animate-pulse" />
        <div className="p-4 space-y-3">
          <div className="h-4 w-full bg-muted/20 rounded animate-pulse" />
          <div className="h-4 w-full bg-muted/20 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (!topTeam) return null

  return (
    <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-accent to-accent/80 px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-accent-foreground" />
          <span className="font-display text-xl tracking-wider text-accent-foreground uppercase">
            {"คลีนชีต"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-accent-foreground/60 font-display text-2xl">1</span>
            {topTeam.teamLogo && (
              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm p-1.5">
                <Image
                  src={topTeam.teamLogo}
                  alt={topTeam.teamNameThai}
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <span className="text-accent-foreground font-bold text-base">
              {topTeam.teamNameThai}
            </span>
          </div>
          <span className="text-accent-foreground font-display text-4xl">{topTeam.cleanSheets}</span>
        </div>
      </div>

      {/* Runner ups */}
      <div className="divide-y divide-border/30">
        {runnerUps.map((team) => (
          <div key={team.rank} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
            <span className="text-muted-foreground font-display text-lg w-5 text-center flex-shrink-0">
              {team.rank}
            </span>
            {team.teamLogo && (
              <Image
                src={team.teamLogo}
                alt={team.teamNameThai}
                width={28}
                height={28}
                className="w-7 h-7 object-contain flex-shrink-0"
              />
            )}
            <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">
              {team.teamNameThai}
            </span>
            <span className="font-bold text-sm text-foreground w-8 text-right flex-shrink-0">
              {team.cleanSheets}
            </span>
          </div>
        ))}

        {expanded &&
          restTeams.map((team) => (
            <div key={team.rank} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
              <span className="text-muted-foreground font-display text-lg w-5 text-center flex-shrink-0">
                {team.rank}
              </span>
              {team.teamLogo && (
                <Image
                  src={team.teamLogo}
                  alt={team.teamNameThai}
                  width={28}
                  height={28}
                  className="w-7 h-7 object-contain flex-shrink-0"
                />
              )}
              <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">
                {team.teamNameThai}
              </span>
              <span className="font-bold text-sm text-foreground w-8 text-right flex-shrink-0">
                {team.cleanSheets}
              </span>
            </div>
          ))}
      </div>

      {teams.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors border-t border-border/30 flex items-center justify-center gap-1"
        >
          {expanded ? (
            <>
              {"ซ่อนรายชื่อ"}
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              {"แสดงทั้งหมด"}
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  )
}

export default function StatsPage() {
  const { data: scorersData, isLoading: scorersLoading } = useSWR("/api/football/topscorers", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 120000,
  })
  const { data: assistsData, isLoading: assistsLoading } = useSWR("/api/football/topassists", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 120000,
  })
  const { data: cleanSheetsData, isLoading: cleanSheetsLoading } = useSWR("/api/football/cleansheets", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 120000,
  })

  const isLoading = scorersLoading || assistsLoading || cleanSheetsLoading

  const topScorers: PlayerStat[] = scorersData?.data
    ? scorersData.data.slice(0, 20).map((item: any) => ({
        id: item.player.id,
        name: item.player.name,
        photo: item.player.photo,
        team: item.statistics[0]?.team?.name || "",
        teamLogo: item.statistics[0]?.team?.logo || "",
        value: item.statistics[0]?.goals?.total || 0,
        goals: item.statistics[0]?.goals?.total || 0,
        assists: item.statistics[0]?.goals?.assists || 0,
        matches: item.statistics[0]?.games?.appearences || 0,
      }))
    : []

  const topAssists: PlayerStat[] = assistsData?.data
    ? assistsData.data.slice(0, 20).map((item: any) => ({
        id: item.player.id,
        name: item.player.name,
        photo: item.player.photo,
        team: item.statistics[0]?.team?.name || "",
        teamLogo: item.statistics[0]?.team?.logo || "",
        value: item.statistics[0]?.goals?.assists || 0,
        goals: item.statistics[0]?.goals?.total || 0,
        assists: item.statistics[0]?.goals?.assists || 0,
        matches: item.statistics[0]?.games?.appearences || 0,
      }))
    : []

  const cleanSheetTeams = cleanSheetsData?.teams || []

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        {/* Header */}
        <div className="border-b border-border/50 bg-gradient-to-b from-muted/30 to-transparent">
          <div className="container mx-auto px-4 py-8 md:py-12">
            <div className="text-center space-y-3">
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl tracking-wider uppercase text-foreground">
                {"Premier League Stats"}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {"สถิติพรีเมียร์ลีก ฤดูกาล 2024-2025"}
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
                <span>{"powered by"}</span>
                <span className="font-bold text-muted-foreground">FootballAI</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="container mx-auto px-4">
          <Tabs defaultValue="players" className="w-full">
            <div className="flex items-center justify-between border-b border-border/30">
              <TabsList className="bg-transparent rounded-none h-auto p-0 gap-0">
                <TabsTrigger
                  value="players"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-5 py-3 text-sm font-semibold uppercase tracking-wider"
                >
                  {"ผู้เล่น"}
                </TabsTrigger>
                <TabsTrigger
                  value="clubs"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-5 py-3 text-sm font-semibold uppercase tracking-wider"
                >
                  {"สโมสร"}
                </TabsTrigger>
              </TabsList>
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <span>{"Season"}</span>
                <span className="text-foreground font-semibold border border-border/50 px-3 py-1.5 rounded">
                  {"2024-2025"}
                </span>
              </div>
            </div>

            {/* Players Tab */}
            <TabsContent value="players" className="mt-6 md:mt-8 pb-12">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">{"กำลังโหลดสถิติ..."}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  <StatHeroCard
                    title="Goals"
                    icon={Target}
                    players={topScorers}
                    statKey="value"
                    statLabel="ประตู"
                    accentColor="#dc2626"
                    isLoading={scorersLoading}
                  />
                  <StatHeroCard
                    title="Assists"
                    icon={HandHelping}
                    players={topAssists}
                    statKey="value"
                    statLabel="แอสซิสต์"
                    accentColor="#2563eb"
                    isLoading={assistsLoading}
                  />
                  <CleanSheetCard
                    teams={cleanSheetTeams}
                    isLoading={cleanSheetsLoading}
                  />
                </div>
              )}

              {/* Additional Stats Summary */}
              {!isLoading && (topScorers.length > 0 || topAssists.length > 0) && (
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  <div className="rounded-xl bg-card border border-border/50 p-4 text-center">
                    <Trophy className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="font-display text-2xl text-foreground">
                      {topScorers[0]?.value || 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{"ดาวซัลโวสูงสุด"}</p>
                  </div>
                  <div className="rounded-xl bg-card border border-border/50 p-4 text-center">
                    <HandHelping className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="font-display text-2xl text-foreground">
                      {topAssists[0]?.value || 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{"แอสซิสต์สูงสุด"}</p>
                  </div>
                  <div className="rounded-xl bg-card border border-border/50 p-4 text-center">
                    <Shield className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="font-display text-2xl text-foreground">
                      {cleanSheetTeams[0]?.cleanSheets || 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{"คลีนชีตสูงสุด"}</p>
                  </div>
                  <div className="rounded-xl bg-card border border-border/50 p-4 text-center">
                    <Target className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="font-display text-2xl text-foreground">
                      {topScorers.length > 0
                        ? (topScorers.reduce((a: number, b: PlayerStat) => a + b.value, 0) / topScorers.length).toFixed(1)
                        : 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{"ประตูเฉลี่ย (Top 20)"}</p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Clubs Tab */}
            <TabsContent value="clubs" className="mt-6 md:mt-8 pb-12">
              <CleanSheetCard teams={cleanSheetTeams} isLoading={cleanSheetsLoading} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  )
}
