"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Trophy, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import useSWR from "swr"
import Image from "next/image"

import { backendFetcher } from "@/lib/api-client"

const mockStandings = [
  { position: 1, team: "อาร์เซนอล", played: 21, gd: 26, points: 49 },
  { position: 2, team: "แมนเชสเตอร์ ซิตี้", played: 21, gd: 26, points: 43 },
  { position: 3, team: "แอสตัน วิลล่า", played: 21, gd: 9, points: 43 },
  { position: 4, team: "ลิเวอร์พูล", played: 21, gd: 4, points: 35 },
  { position: 5, team: "เบรนท์ฟอร์ด", played: 21, gd: 7, points: 33 },
  { position: 6, team: "นิวคาสเซิล", played: 21, gd: 5, points: 32 },
]

export function CompactStandings() {
  const { data, isLoading } = useSWR("/football/standings", backendFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000,
  })

  const standings = data?.data
    ? data.data.slice(0, 6).map((item: any) => ({
        position: item.rank,
        team: item.team.name,
        logo: item.team.logo,
        played: item.all.played,
        gd: item.goalsDiff,
        points: item.points,
      }))
    : mockStandings

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Premier League</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">2024/25</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-y border-border/50 bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-2 py-2 text-left font-medium">ทีม</th>
                    <th className="px-2 py-2 text-center font-medium">แข่ง</th>
                    <th className="px-2 py-2 text-center font-medium">+/-</th>
                    <th className="px-3 py-2 text-center font-medium">คะแนน</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((team: any, index: number) => (
                    <tr
                      key={team.position}
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
                          <span className="max-w-[100px] truncate text-sm font-medium">{team.team}</span>
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
                <Link href="/standings">
                  ดูตารางทั้งหมด
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
