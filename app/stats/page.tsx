"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, ChevronDown, ChevronUp, Trophy, Target, HandHelping, Shield } from "lucide-react"
import useSWR from "swr"
import Image from "next/image"
import { useState } from "react"
import { PREMIER_LEAGUE_DATA_SEASON } from "@/lib/season"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface PlayerStat {
  id: string
  name: string
  photo: string
  team: string
  teamLogo: string
  value: number
}

function StatHeroCard({
  title,
  icon: Icon,
  players,
  accentColor,
  isLoading,
}: {
  title: string
  icon: React.ElementType
  players: PlayerStat[]
  accentColor: string
  isLoading: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const topPlayer = players[0]
  const runnerUps = players.slice(1, 3)
  const restPlayers = players.slice(3, expanded ? 20 : 3)

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
        <div className="aspect-[4/3] animate-pulse bg-muted/30" />
        <div className="space-y-3 p-4">
          <div className="h-5 w-24 animate-pulse rounded bg-muted/30" />
          <div className="h-4 w-full animate-pulse rounded bg-muted/20" />
          <div className="h-4 w-full animate-pulse rounded bg-muted/20" />
        </div>
      </div>
    )
  }

  if (!topPlayer) {
    return (
      <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
        <div className="flex aspect-[4/3] items-center justify-center bg-muted/10">
          <p className="text-sm text-muted-foreground">ไม่มีข้อมูล</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card group">
      <div className="relative">
        <div
          className="absolute left-0 right-0 top-0 z-10 px-4 py-3"
          style={{ background: `linear-gradient(180deg, ${accentColor}ee 0%, ${accentColor}00 100%)` }}
        >
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-white" />
            <span className="font-display text-xl uppercase tracking-wider text-white">{title}</span>
          </div>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-b from-muted/20 to-card">
          {topPlayer.photo && <Image src={topPlayer.photo} alt={topPlayer.name} fill className="object-cover object-top" sizes="(max-width: 768px) 100vw, 33vw" />}

          {topPlayer.teamLogo && (
            <div className="absolute bottom-14 left-3 h-10 w-10 rounded-full border border-border/50 bg-background/80 p-1.5 backdrop-blur-sm sm:h-12 sm:w-12">
              <Image src={topPlayer.teamLogo} alt={topPlayer.team} width={48} height={48} className="h-full w-full object-contain" />
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: accentColor }}>
            <div className="min-w-0">
              <span className="text-sm font-bold text-white sm:text-base">{topPlayer.name}</span>
            </div>
            <span className="ml-2 flex-shrink-0 font-display text-2xl text-white sm:text-3xl">{topPlayer.value}</span>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border/30">
        {runnerUps.map((player, i) => (
          <div key={player.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
            <span className="w-5 flex-shrink-0 text-center font-display text-lg text-muted-foreground">{i + 2}</span>
            <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-muted/50">
              {player.photo && <Image src={player.photo} alt={player.name} width={32} height={32} className="h-full w-full object-cover" />}
            </div>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{player.name}</span>
            <span className="w-8 flex-shrink-0 text-right text-sm font-bold text-foreground">{player.value}</span>
          </div>
        ))}

        {expanded &&
          restPlayers.map((player, i) => (
            <div key={player.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
              <span className="w-5 flex-shrink-0 text-center font-display text-lg text-muted-foreground">{i + 4}</span>
              <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-muted/50">
                {player.photo && <Image src={player.photo} alt={player.name} width={32} height={32} className="h-full w-full object-cover" />}
              </div>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{player.name}</span>
              <span className="w-8 flex-shrink-0 text-right text-sm font-bold text-foreground">{player.value}</span>
            </div>
          ))}
      </div>

      {players.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-center gap-1 border-t border-border/30 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:bg-muted/20 hover:text-foreground"
        >
          {expanded ? "ซ่อนรายชื่อ" : "แสดงทั้งหมด"}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
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
      <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
        <div className="h-32 animate-pulse bg-muted/30" />
        <div className="space-y-3 p-4">
          <div className="h-4 w-full animate-pulse rounded bg-muted/20" />
          <div className="h-4 w-full animate-pulse rounded bg-muted/20" />
        </div>
      </div>
    )
  }

  if (!topTeam) return null

  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
      <div className="relative bg-gradient-to-br from-accent to-accent/80 px-4 py-4">
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-5 w-5 text-accent-foreground" />
          <span className="font-display text-xl uppercase tracking-wider text-accent-foreground">คลีนชีต</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display text-2xl text-accent-foreground/60">1</span>
            {topTeam.teamLogo && (
              <div className="h-12 w-12 rounded-full bg-white/10 p-1.5 backdrop-blur-sm">
                <Image src={topTeam.teamLogo} alt={topTeam.teamNameThai} width={48} height={48} className="h-full w-full object-contain" />
              </div>
            )}
            <span className="text-base font-bold text-accent-foreground">{topTeam.teamNameThai}</span>
          </div>
          <span className="font-display text-4xl text-accent-foreground">{topTeam.cleanSheets}</span>
        </div>
      </div>

      <div className="divide-y divide-border/30">
        {runnerUps.map((team) => (
          <div key={team.rank} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
            <span className="w-5 flex-shrink-0 text-center font-display text-lg text-muted-foreground">{team.rank}</span>
            {team.teamLogo && <Image src={team.teamLogo} alt={team.teamNameThai} width={28} height={28} className="h-7 w-7 flex-shrink-0 object-contain" />}
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{team.teamNameThai}</span>
            <span className="w-8 flex-shrink-0 text-right text-sm font-bold text-foreground">{team.cleanSheets}</span>
          </div>
        ))}

        {expanded &&
          restTeams.map((team) => (
            <div key={team.rank} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
              <span className="w-5 flex-shrink-0 text-center font-display text-lg text-muted-foreground">{team.rank}</span>
              {team.teamLogo && <Image src={team.teamLogo} alt={team.teamNameThai} width={28} height={28} className="h-7 w-7 flex-shrink-0 object-contain" />}
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{team.teamNameThai}</span>
              <span className="w-8 flex-shrink-0 text-right text-sm font-bold text-foreground">{team.cleanSheets}</span>
            </div>
          ))}
      </div>

      {teams.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-center gap-1 border-t border-border/30 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:bg-muted/20 hover:text-foreground"
        >
          {expanded ? "ซ่อนรายชื่อ" : "แสดงทั้งหมด"}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
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
      }))
    : []

  const cleanSheetTeams = cleanSheetsData?.teams || []

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <div className="border-b border-border/50 bg-gradient-to-b from-muted/30 to-transparent">
          <div className="container mx-auto px-4 py-8 md:py-12">
            <div className="space-y-3 text-center">
              <h1 className="font-display text-4xl uppercase tracking-wider text-foreground sm:text-5xl md:text-6xl">Premier League Stats</h1>
              <p className="text-sm text-muted-foreground sm:text-base">{`สถิติพรีเมียร์ลีก ฤดูกาล ${PREMIER_LEAGUE_DATA_SEASON.labelLong}`}</p>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4">
          <Tabs defaultValue="players" className="w-full">
            <div className="flex items-center justify-between border-b border-border/30">
              <TabsList className="h-auto gap-0 rounded-none bg-transparent p-0">
                <TabsTrigger
                  value="players"
                  className="rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-semibold uppercase tracking-wider data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  ผู้เล่น
                </TabsTrigger>
                <TabsTrigger
                  value="clubs"
                  className="rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-semibold uppercase tracking-wider data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  สโมสร
                </TabsTrigger>
              </TabsList>
              <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                <span>Season</span>
                <span className="rounded border border-border/50 px-3 py-1.5 font-semibold text-foreground">{PREMIER_LEAGUE_DATA_SEASON.labelLong}</span>
              </div>
            </div>

            <TabsContent value="players" className="mt-6 pb-12 md:mt-8">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">กำลังโหลดสถิติ...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                  <StatHeroCard title="Goals" icon={Target} players={topScorers} accentColor="#dc2626" isLoading={scorersLoading} />
                  <StatHeroCard title="Assists" icon={HandHelping} players={topAssists} accentColor="#2563eb" isLoading={assistsLoading} />
                  <CleanSheetCard teams={cleanSheetTeams} isLoading={cleanSheetsLoading} />
                </div>
              )}

              {!isLoading && (topScorers.length > 0 || topAssists.length > 0) && (
                <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                  <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
                    <Trophy className="mx-auto mb-2 h-5 w-5 text-primary" />
                    <p className="font-display text-2xl text-foreground">{topScorers[0]?.value || 0}</p>
                    <p className="mt-1 text-xs text-muted-foreground">ดาวซัลโวสูงสุด</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
                    <HandHelping className="mx-auto mb-2 h-5 w-5 text-primary" />
                    <p className="font-display text-2xl text-foreground">{topAssists[0]?.value || 0}</p>
                    <p className="mt-1 text-xs text-muted-foreground">แอสซิสต์สูงสุด</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
                    <Shield className="mx-auto mb-2 h-5 w-5 text-primary" />
                    <p className="font-display text-2xl text-foreground">{cleanSheetTeams[0]?.cleanSheets || 0}</p>
                    <p className="mt-1 text-xs text-muted-foreground">คลีนชีตสูงสุด</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
                    <Target className="mx-auto mb-2 h-5 w-5 text-primary" />
                    <p className="font-display text-2xl text-foreground">
                      {topScorers.length > 0 ? (topScorers.reduce((a: number, b: PlayerStat) => a + b.value, 0) / topScorers.length).toFixed(1) : 0}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">ค่าเฉลี่ยประตู Top 20</p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="clubs" className="mt-6 pb-12 md:mt-8">
              <CleanSheetCard teams={cleanSheetTeams} isLoading={cleanSheetsLoading} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  )
}
