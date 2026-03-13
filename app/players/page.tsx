"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Trophy,
  Target,
  Crosshair,
  AlertTriangle,
  CircleDot,
  Users,
  Shield,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import Link from "next/link"
import useSWR from "swr"
import Image from "next/image"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface PlayerStat {
  id: string
  name: string
  photo: string
  team: string
  teamLogo: string
  value: number
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.split(" ")
  if (parts.length === 1) return { first: "", last: parts[0] }
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] }
}

/* ──────────────────────────────────────────────
   Hero Stat Card  (matches Bundesliga screenshot)
   ────────────────────────────────────────────── */
function HeroStatCard({
  title,
  icon: Icon,
  accentColor,
  players,
}: {
  title: string
  icon: React.ElementType
  accentColor: string
  players: PlayerStat[]
}) {
  const [expanded, setExpanded] = useState(false)
  const hero = players[0]
  const runnersUp = players.slice(1, 3)
  const fullList = players.slice(3)

  if (!hero) return null
  const heroName = splitName(hero.name)

  return (
    <Card className="border-border/50 overflow-hidden bg-card group">
      {/* ── Hero section ── */}
      <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-b from-muted/80 to-muted/30">
        {/* background glow */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            background: `radial-gradient(ellipse at 60% 90%, ${accentColor}, transparent 70%)`,
          }}
        />

        {/* category pill */}
        <div className="absolute top-3 left-3 z-10">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-black uppercase tracking-wider text-white"
            style={{ backgroundColor: accentColor }}
          >
            <Icon className="w-3.5 h-3.5" />
            {title}
          </span>
        </div>

        {/* player image */}
        <div className="absolute inset-0 flex items-end justify-center">
          <div className="relative w-[75%] h-[82%]">
            <Image
              src={hero.photo}
              alt={hero.name}
              fill
              className="object-contain object-bottom drop-shadow-2xl"
              sizes="(max-width:640px) 75vw,(max-width:1024px) 35vw,22vw"
            />
          </div>
        </div>

        {/* team badge */}
        {hero.teamLogo && (
          <div className="absolute bottom-14 left-3 z-10">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-background/80 backdrop-blur p-1 shadow-lg">
              <Image
                src={hero.teamLogo}
                alt={hero.team}
                width={36}
                height={36}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}

        {/* accent bar with name + stat */}
        <div
          className="absolute bottom-0 inset-x-0 px-3 py-2.5 flex items-center justify-between"
          style={{ backgroundColor: accentColor }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-white/60 font-bold text-xs flex-shrink-0">1</span>
            <span className="text-white text-sm font-bold truncate">
              {heroName.first}{" "}
              <span className="uppercase font-black">{heroName.last}</span>
            </span>
          </div>
          <span className="text-white text-2xl font-black flex-shrink-0 tabular-nums ml-2">
            {hero.value}
          </span>
        </div>
      </div>

      {/* ── Runners-up #2 & #3 ── */}
      <div className="divide-y divide-border/20">
        {runnersUp.map((p, i) => {
          const pn = splitName(p.name)
          return (
            <Link key={p.id} href={`/players/${p.id}`} className="block">
              <div className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/30 transition-colors">
                <span className="text-muted-foreground font-bold text-xs w-4 text-center flex-shrink-0">
                  {i + 2}
                </span>
                <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
                  <Image src={p.photo} alt={p.name} width={32} height={32} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium truncate">
                    {pn.first} <span className="uppercase font-bold">{pn.last}</span>
                  </p>
                </div>
                {p.teamLogo && (
                  <Image src={p.teamLogo} alt="" width={18} height={18} className="w-[18px] h-[18px] object-contain flex-shrink-0" />
                )}
                <span className="font-bold text-xs sm:text-sm tabular-nums flex-shrink-0 w-7 text-right">
                  {p.value}
                </span>
              </div>
            </Link>
          )
        })}
      </div>

      {/* ── Expanded full list ── */}
      {expanded && fullList.length > 0 && (
        <div className="divide-y divide-border/10 border-t border-border/20">
          {fullList.map((p, i) => {
            const pn = splitName(p.name)
            return (
              <Link key={p.id} href={`/players/${p.id}`} className="block">
                <div className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/30 transition-colors">
                  <span className="text-muted-foreground text-[10px] w-4 text-center flex-shrink-0">
                    {i + 4}
                  </span>
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-muted flex-shrink-0">
                    <Image src={p.photo} alt={p.name} width={24} height={24} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate">
                      {pn.first} <span className="uppercase font-semibold">{pn.last}</span>
                    </p>
                  </div>
                  {p.teamLogo && (
                    <Image src={p.teamLogo} alt="" width={14} height={14} className="w-3.5 h-3.5 object-contain flex-shrink-0" />
                  )}
                  <span className="font-semibold text-[11px] tabular-nums flex-shrink-0 w-7 text-right">
                    {p.value}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* ── Show full list toggle ── */}
      {fullList.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors border-t border-border/20 flex items-center justify-center gap-1"
        >
          {expanded ? (
            <>{"ย่อรายการ"}<ChevronUp className="w-3 h-3" /></>
          ) : (
            <>{"แสดงทั้งหมด"}<ChevronDown className="w-3 h-3" /></>
          )}
        </button>
      )}
    </Card>
  )
}

/* ──────────────────────────────────────────────
   Clean Sheet Card (team-based, not players)
   ────────────────────────────────────────────── */
function CleanSheetCard({
  teams,
}: {
  teams: { rank: number; teamName: string; teamNameThai: string; teamLogo: string; cleanSheets: number }[]
}) {
  const [expanded, setExpanded] = useState(false)
  const hero = teams[0]
  const runnersUp = teams.slice(1, 3)
  const fullList = teams.slice(3)

  if (!hero) return null

  return (
    <Card className="border-border/50 overflow-hidden bg-card">
      {/* Hero */}
      <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-b from-muted/80 to-muted/30">
        <div
          className="absolute inset-0 opacity-15"
          style={{ background: "radial-gradient(ellipse at 60% 90%, #3b82f6, transparent 70%)" }}
        />
        <div className="absolute top-3 left-3 z-10">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-black uppercase tracking-wider text-white bg-blue-600">
            <Shield className="w-3.5 h-3.5" />
            {"CLEAN SHEETS"}
          </span>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-[45%] aspect-square">
            {hero.teamLogo && (
              <Image
                src={hero.teamLogo}
                alt={hero.teamNameThai}
                fill
                className="object-contain drop-shadow-2xl"
                sizes="(max-width:640px) 40vw,18vw"
              />
            )}
          </div>
        </div>

        <div className="absolute bottom-0 inset-x-0 px-3 py-2.5 flex items-center justify-between bg-blue-600">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-white/60 font-bold text-xs flex-shrink-0">1</span>
            <span className="text-white text-sm font-black uppercase truncate">{hero.teamNameThai}</span>
          </div>
          <span className="text-white text-2xl font-black flex-shrink-0 tabular-nums ml-2">{hero.cleanSheets}</span>
        </div>
      </div>

      {/* Runners */}
      <div className="divide-y divide-border/20">
        {runnersUp.map((t, i) => (
          <div key={t.teamName} className="flex items-center gap-2.5 px-3 py-2.5">
            <span className="text-muted-foreground font-bold text-xs w-4 text-center flex-shrink-0">{i + 2}</span>
            <div className="w-8 h-8 rounded-full bg-muted/40 p-1 flex-shrink-0">
              {t.teamLogo && <Image src={t.teamLogo} alt="" width={28} height={28} className="w-full h-full object-contain" />}
            </div>
            <span className="flex-1 text-xs sm:text-sm font-bold uppercase truncate">{t.teamNameThai}</span>
            <span className="font-bold text-xs sm:text-sm tabular-nums flex-shrink-0 w-7 text-right">{t.cleanSheets}</span>
          </div>
        ))}
      </div>

      {expanded && fullList.length > 0 && (
        <div className="divide-y divide-border/10 border-t border-border/20">
          {fullList.map((t, i) => (
            <div key={t.teamName} className="flex items-center gap-2.5 px-3 py-2">
              <span className="text-muted-foreground text-[10px] w-4 text-center flex-shrink-0">{i + 4}</span>
              <div className="w-6 h-6 rounded-full bg-muted/40 p-0.5 flex-shrink-0">
                {t.teamLogo && <Image src={t.teamLogo} alt="" width={20} height={20} className="w-full h-full object-contain" />}
              </div>
              <span className="flex-1 text-[11px] font-semibold uppercase truncate">{t.teamNameThai}</span>
              <span className="font-semibold text-[11px] tabular-nums flex-shrink-0 w-7 text-right">{t.cleanSheets}</span>
            </div>
          ))}
        </div>
      )}

      {fullList.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors border-t border-border/20 flex items-center justify-center gap-1"
        >
          {expanded ? (
            <>{"ย่อรายการ"}<ChevronUp className="w-3 h-3" /></>
          ) : (
            <>{"แสดงทั้งหมด"}<ChevronDown className="w-3 h-3" /></>
          )}
        </button>
      )}
    </Card>
  )
}

/* ──────────────────────────────────────────────
   Skeleton loader
   ────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <Card className="border-border/50 overflow-hidden">
      <div className="aspect-[4/5] bg-muted animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-9 bg-muted animate-pulse rounded" />
        <div className="h-9 bg-muted animate-pulse rounded" />
      </div>
      <div className="h-9 bg-muted/50 animate-pulse" />
    </Card>
  )
}

/* ──────────────────────────────────────────────
   Page
   ────────────────────────────────────────────── */
export default function PlayersPage() {
  const { data: statsData, isLoading: statsLoading } = useSWR("/api/football/player-stats", fetcher)
  const { data: cleanData, isLoading: cleanLoading } = useSWR("/api/football/cleansheets", fetcher)

  const isLoading = statsLoading || cleanLoading
  const cats = statsData?.data || {}

  const cardConfig: {
    key: string
    title: string
    icon: React.ElementType
    color: string
  }[] = [
    { key: "goals", title: "GOALS", icon: Trophy, color: "#dc2626" },
    { key: "assists", title: "ASSISTS", icon: Target, color: "#dc2626" },
    { key: "shots", title: "SHOTS", icon: Crosshair, color: "#dc2626" },
    { key: "penalties", title: "PENALTIES", icon: CircleDot, color: "#f59e0b" },
    { key: "yellowCards", title: "YELLOW CARDS", icon: AlertTriangle, color: "#eab308" },
    { key: "appearances", title: "APPEARANCES", icon: Users, color: "#16a34a" },
  ]

  const cleanSheetTeams = cleanData?.teams || []

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* ── Header ── */}
      <div className="border-b border-border/50 bg-gradient-to-b from-muted/50 to-transparent">
        <div className="container mx-auto px-4 py-6 md:py-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-balance">
                {"Premier League Stats"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {"สถิตินักเตะพรีเมียร์ลีก ฤดูกาล 2024/25"}
              </p>
            </div>
            <Badge variant="outline" className="self-start sm:self-auto text-xs py-1 px-3">
              {"Season 2024-2025"}
            </Badge>
          </div>
        </div>
      </div>

      {/* ── Main grid ── */}
      <main className="container mx-auto px-4 py-6 md:py-10">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {/* Player stat cards */}
            {cardConfig.map((cfg) => {
              const players: PlayerStat[] = cats[cfg.key] || []
              if (players.length === 0) return null
              return (
                <HeroStatCard
                  key={cfg.key}
                  title={cfg.title}
                  icon={cfg.icon}
                  accentColor={cfg.color}
                  players={players}
                />
              )
            })}

            {/* Clean Sheets (team-based) */}
            {cleanSheetTeams.length > 0 && <CleanSheetCard teams={cleanSheetTeams} />}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
