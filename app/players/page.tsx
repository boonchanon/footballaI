"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import useSWR from "swr"
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Crosshair,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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

type TeamCleanSheet = {
  rank: number
  teamName: string
  teamNameThai: string
  teamLogo: string
  cleanSheets: number
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(" ")
  if (parts.length <= 1) return { first: "", last: parts[0] || fullName }
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] }
}

function PlayerCategoryCard({
  title,
  subtitle,
  valueLabel,
  players,
  icon: Icon,
  accent,
}: {
  title: string
  subtitle: string
  valueLabel: string
  players: PlayerStat[]
  icon: React.ElementType
  accent: string
}) {
  const [expanded, setExpanded] = useState(false)
  const hero = players[0]
  const rest = players.slice(1)

  if (!hero) return null

  return (
    <Card className="overflow-hidden border-border/60 bg-card shadow-none">
      <CardContent className="p-0">
        <div className="border-b border-border/60 px-5 pb-3 pt-5">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">{subtitle}</p>
            <div className="mt-3 flex items-end justify-center gap-3">
              <span className="text-6xl font-black leading-none text-foreground md:text-7xl">{hero.value}</span>
              <div className="pb-1 text-left">
                <p className="text-2xl font-black uppercase leading-none text-foreground md:text-3xl">{valueLabel}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.24em] text-muted-foreground">{title}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-5">
          <div className="relative overflow-hidden rounded-[28px] border border-border bg-background">
            <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
            <div className="absolute right-4 top-4 rounded-full border border-border bg-card p-2.5 text-muted-foreground">
              <Icon className="h-4 w-4" />
            </div>

            <div className="px-4 pt-4">
              <Badge className="border-0 bg-primary text-primary-foreground">อันดับ 1</Badge>
            </div>

              <Link href={`/players/${hero.id}`} className="block">
              <div className="relative mt-3 h-[200px] flex items-center justify-center">
                <div className="text-center px-6">
                  <h2 className="text-3xl md:text-4xl font-black text-foreground">{hero.name}</h2>
                  <p className="mt-2 text-sm uppercase tracking-[0.12em] text-muted-foreground">{hero.team}</p>
                </div>
              </div>

              <div className="border-t border-border/60 px-4 py-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-2xl font-black leading-none text-foreground">{hero.team}</h3>
                  </div>
                  {hero.teamLogo ? (
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-card p-1.5">
                      <Image src={hero.teamLogo} alt={hero.team} width={32} height={32} className="h-full w-full object-contain" />
                    </div>
                  ) : null}
                </div>

                <p className="mb-4 text-xs uppercase tracking-[0.22em] text-muted-foreground">{hero.team}</p>
              </div>
            </Link>

            <div className="border-t border-border/60 px-4 py-4">
              <div className="space-y-2.5">
                {rest.slice(0, expanded ? rest.length : 2).map((player, index) => {
                  const name = splitName(player.name)
                  return (
                    <Link
                      key={player.id}
                      href={`/players/${player.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-muted/20 px-3 py-2.5 transition-colors hover:bg-muted/40"
                    >
                      <span className="w-5 flex-shrink-0 text-center text-xs font-black text-muted-foreground">{index + 2}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{`${name.first} ${name.last}`.trim()}</p>
                      </div>
                      <span className="text-lg font-black tabular-nums text-foreground">{player.value}</span>
                    </Link>
                  )
                })}
              </div>

              {rest.length > 2 ? (
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => !prev)}
                  className="mt-4 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {expanded ? "ซ่อนรายการ" : "ดูทั้งหมด"}
                  {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CleanSheetCategoryCard({ teams }: { teams: TeamCleanSheet[] }) {
  const [expanded, setExpanded] = useState(false)
  const hero = teams[0]
  const rest = teams.slice(1)

  if (!hero) return null

  return (
    <Card className="overflow-hidden border-border/60 bg-card shadow-none">
      <CardContent className="p-0">
        <div className="border-b border-border/60 px-5 pb-3 pt-5">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">defensive table</p>
            <div className="mt-3 flex items-end justify-center gap-3">
              <span className="text-6xl font-black leading-none text-foreground md:text-7xl">{hero.cleanSheets}</span>
              <div className="pb-1 text-left">
                <p className="text-2xl font-black uppercase leading-none text-foreground md:text-3xl">CLEAN SHEETS</p>
                <p className="mt-1 text-xs uppercase tracking-[0.24em] text-muted-foreground">best defensive team</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-5">
          <div className="relative overflow-hidden rounded-[28px] border border-border bg-background">
            <div className="absolute inset-x-0 top-0 h-1 bg-sky-500" />
            <div className="absolute right-4 top-4 rounded-full border border-border bg-card p-2.5 text-muted-foreground">
              <Shield className="h-4 w-4" />
            </div>

            <div className="px-4 pt-4">
              <Badge className="border-0 bg-primary text-primary-foreground">อันดับ 1</Badge>
            </div>

            <div className="relative mt-3 h-[290px]">
              <div className="absolute inset-x-5 top-0 h-[150px] rounded-[26px] bg-gradient-to-b from-muted/40 to-muted/10" />
              <div className="absolute inset-x-0 bottom-8 mx-auto flex h-[180px] w-[180px] items-center justify-center rounded-full bg-card p-6">
                <Image src={hero.teamLogo} alt={hero.teamNameThai} width={140} height={140} className="h-full w-full object-contain" />
              </div>
            </div>

            <div className="border-t border-border/60 px-4 py-4">
              <div className="mb-3 min-w-0">
                <h3 className="truncate text-2xl font-black uppercase leading-none text-foreground">{hero.teamNameThai}</h3>
                <p className="mt-1 truncate text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">{hero.teamName}</p>
              </div>

              <div className="space-y-2.5">
                {rest.slice(0, expanded ? rest.length : 2).map((team, index) => (
                  <div key={team.teamName} className="flex items-center gap-3 rounded-2xl border border-border bg-muted/20 px-3 py-2.5">
                    <span className="w-5 flex-shrink-0 text-center text-xs font-black text-muted-foreground">{index + 2}</span>
                    <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-background p-1">
                      <Image src={team.teamLogo} alt={team.teamNameThai} width={36} height={36} className="h-full w-full object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{team.teamNameThai}</p>
                    </div>
                    <span className="text-lg font-black tabular-nums text-foreground">{team.cleanSheets}</span>
                  </div>
                ))}
              </div>

              {rest.length > 2 ? (
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => !prev)}
                  className="mt-4 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {expanded ? "ซ่อนรายการ" : "ดูทั้งหมด"}
                  {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SkeletonCard() {
  return (
    <Card className="overflow-hidden border-border/60 bg-card shadow-none">
      <CardContent className="p-0">
        <div className="h-28 animate-pulse border-b border-border/60 bg-muted/30" />
        <div className="p-4 md:p-5">
          <div className="h-[420px] animate-pulse rounded-[28px] bg-muted/30" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function PlayersPage() {
  const { data: statsData, isLoading: statsLoading } = useSWR("/api/football/player-stats", fetcher)
  const { data: cleanData, isLoading: cleanLoading } = useSWR("/api/football/cleansheets", fetcher)

  const isLoading = statsLoading || cleanLoading
  const cats = statsData?.data || {}
  const cleanSheetTeams = cleanData?.teams || []

  const cardConfig: Array<{
    key: string
    title: string
    subtitle: string
    valueLabel: string
    icon: React.ElementType
    accent: string
  }> = [
    { key: "goals", title: "Goals", subtitle: "golden boot race", valueLabel: "GOALS", icon: Trophy, accent: "bg-primary" },
    { key: "assists", title: "Assists", subtitle: "chance creators", valueLabel: "ASSISTS", icon: Target, accent: "bg-emerald-500" },
    { key: "shots", title: "Shots", subtitle: "shot volume", valueLabel: "SHOTS", icon: Crosshair, accent: "bg-amber-500" },
    { key: "penalties", title: "Penalties", subtitle: "from the spot", valueLabel: "PENS", icon: CircleDot, accent: "bg-orange-500" },
    { key: "yellowCards", title: "Yellow Cards", subtitle: "discipline watch", valueLabel: "YELLOWS", icon: AlertTriangle, accent: "bg-yellow-500" },
    { key: "appearances", title: "Appearances", subtitle: "most used players", valueLabel: "APPS", icon: Users, accent: "bg-sky-500" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="border-b border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.005))]">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Player Categories
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tight text-foreground md:text-6xl">Premier League Players</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
              สรุปหมวดสถิตินักเตะพรีเมียร์ลีกแบบดูง่ายในหน้าเดียว ทั้งดาวซัลโว แอสซิสต์ ยิงเยอะ จุดโทษ ใบเหลือง
              และจำนวนนัดลงสนาม โดยดึงข้อมูลจริงของฤดูกาลนี้มาแสดงเป็นการ์ดแยกหมวด
            </p>
            <div className="mt-5">
              <Badge variant="outline" className="px-3 py-1 text-xs uppercase tracking-[0.2em]">
                Season {PREMIER_LEAGUE_DATA_SEASON.labelLong}
              </Badge>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-6 md:py-10">
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {cardConfig.map((cfg) => {
              const players: PlayerStat[] = cats[cfg.key] || []
              if (players.length === 0) return null

              return (
                <PlayerCategoryCard
                  key={cfg.key}
                  title={cfg.title}
                  subtitle={cfg.subtitle}
                  valueLabel={cfg.valueLabel}
                  players={players}
                  icon={cfg.icon}
                  accent={cfg.accent}
                />
              )
            })}

            {cleanSheetTeams.length > 0 ? <CleanSheetCategoryCard teams={cleanSheetTeams} /> : null}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
