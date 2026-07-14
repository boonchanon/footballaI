"use client"

import Image from "next/image"
import Link from "next/link"
import useSWR from "swr"
import { ArrowRight, Loader2, Trophy } from "lucide-react"

import { backendFetcher } from "@/lib/api-client"
import { PREMIER_LEAGUE_DATA_SEASON } from "@/lib/season"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type CompactStandingItem = {
  position: number
  team: string
  logo?: string
  played: number
  gd: number
  points: number
}

type CompactStandingsProps = {
  items?: CompactStandingItem[]
  href?: string
  seasonLabel?: string
  title?: string
}

export function CompactStandings({
  items,
  href = "/standings",
  seasonLabel = PREMIER_LEAGUE_DATA_SEASON.labelShort,
  title = "Premier League",
}: CompactStandingsProps) {
  const { data, isLoading } = useSWR("/football/standings", backendFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000,
  })

  const standings: CompactStandingItem[] =
    items && items.length > 0
      ? items
      : (data?.data || []).slice(0, 6).map((item: any) => ({
          position: item.rank,
          team: item.team.name,
          logo: item.team.logo,
          played: item.all.played,
          gd: item.goalsDiff,
          points: item.points,
        }))

  const showLoading = !items?.length && isLoading

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">{seasonLabel}</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {showLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : standings.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-y border-border/50 bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-2 py-2 text-left font-medium">Team</th>
                    <th className="px-2 py-2 text-center font-medium">P</th>
                    <th className="px-2 py-2 text-center font-medium">GD</th>
                    <th className="px-3 py-2 text-center font-medium">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((team, index) => (
                    <tr
                      key={`${team.position}-${team.team}`}
                      className={`border-b border-border/30 transition-colors hover:bg-muted/30 ${index < 4 ? "bg-primary/5" : ""}`}
                    >
                      <td className="px-3 py-2.5">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
                            index < 4 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {team.position}
                        </span>
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-2">
                          {team.logo ? (
                            <Image
                              src={team.logo || "/placeholder.svg"}
                              alt={team.team}
                              width={20}
                              height={20}
                              className="h-5 w-5 rounded-full"
                            />
                          ) : (
                            <div className="h-5 w-5 rounded-full bg-muted" />
                          )}
                          <span className="max-w-[120px] truncate text-sm font-medium">{team.team}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-center text-sm text-muted-foreground">{team.played}</td>
                      <td
                        className={`px-2 py-2.5 text-center text-sm font-medium ${
                          team.gd > 0 ? "text-green-400" : team.gd < 0 ? "text-red-400" : ""
                        }`}
                      >
                        {team.gd > 0 ? "+" : ""}
                        {team.gd}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="font-bold text-primary">{team.points}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3">
              <Button asChild variant="outline" className="h-9 w-full justify-center gap-2 bg-transparent text-sm">
                <Link href={href}>
                  View Full Table
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">No standings snapshot available.</div>
        )}
      </CardContent>
    </Card>
  )
}
