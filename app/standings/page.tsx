"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Trophy, TrendingDown, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import useSWR from "swr"
import Image from "next/image"
import { PREMIER_LEAGUE_DATA_SEASON } from "@/lib/season"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function StandingsPage() {
  const { data, isLoading, mutate, error } = useSWR("/api/football/standings", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000,
  })

  const standings = data?.data
    ? data.data.map((item: any) => ({
        position: item.rank,
        team: item.team.name,
        teamEn: item.team.nameEn,
        logo: item.team.logo,
        played: item.all.played,
        won: item.all.win,
        drawn: item.all.draw,
        lost: item.all.lose,
        gf: item.all.goals.for,
        ga: item.all.goals.against,
        gd: item.goalsDiff,
        points: item.points,
        form: item.form ? item.form.split("").slice(0, 5) : [],
      }))
    : []

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <Trophy className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-display md:text-4xl">ตารางคะแนน</h1>
              </div>
              <p className="text-muted-foreground">พรีเมียร์ลีก อังกฤษ ฤดูกาล {PREMIER_LEAGUE_DATA_SEASON.labelLong}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isLoading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              รีเฟรช
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {isLoading ? (
            <Card className="border-border/50">
              <CardContent className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">กำลังโหลดข้อมูลตารางคะแนน...</span>
              </CardContent>
            </Card>
          ) : error || standings.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center">
                <Trophy className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mb-2 text-lg font-medium">ไม่สามารถโหลดข้อมูลตารางคะแนนได้</p>
                <p className="mb-4 text-muted-foreground">กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง</p>
                <Button variant="outline" onClick={() => mutate()}>
                  ลองใหม่
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="overflow-hidden border-border/50">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-border bg-muted/50">
                      <tr className="text-sm text-muted-foreground">
                        <th className="w-16 px-4 py-4 text-left font-medium">อันดับ</th>
                        <th className="px-4 py-4 text-left font-medium">ทีม</th>
                        <th className="px-3 py-4 text-center font-medium">เล่น</th>
                        <th className="px-3 py-4 text-center font-medium">ชนะ</th>
                        <th className="px-3 py-4 text-center font-medium">เสมอ</th>
                        <th className="px-3 py-4 text-center font-medium">แพ้</th>
                        <th className="px-3 py-4 text-center font-medium">ได้</th>
                        <th className="px-3 py-4 text-center font-medium">เสีย</th>
                        <th className="px-3 py-4 text-center font-medium">+/-</th>
                        <th className="px-4 py-4 text-center font-medium">คะแนน</th>
                        <th className="px-4 py-4 text-center font-medium">ฟอร์ม</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((team: any, i: number) => (
                        <tr
                          key={i}
                          className={`border-b border-border/50 transition-colors hover:bg-muted/30 ${
                            i < 4 ? "bg-primary/5" : i >= standings.length - 3 ? "bg-destructive/5" : ""
                          }`}
                        >
                          <td className="px-4 py-4">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
                                i < 4
                                  ? "bg-primary text-primary-foreground"
                                  : i === 4
                                    ? "bg-amber-500 text-white"
                                    : i >= standings.length - 3
                                      ? "bg-destructive/20 text-destructive"
                                      : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {team.position}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              {team.logo ? (
                                <Image
                                  src={team.logo || "/placeholder.svg"}
                                  alt={team.team}
                                  width={32}
                                  height={32}
                                  className="h-8 w-8 rounded-full bg-white p-0.5 object-contain"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-muted" />
                              )}
                              <div>
                                <span className="font-semibold">{team.team}</span>
                                {team.teamEn && team.teamEn !== team.team && (
                                  <p className="text-xs text-muted-foreground">{team.teamEn}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-center text-muted-foreground">{team.played}</td>
                          <td className="px-3 py-4 text-center font-medium text-green-600 dark:text-green-400">{team.won}</td>
                          <td className="px-3 py-4 text-center text-muted-foreground">{team.drawn}</td>
                          <td className="px-3 py-4 text-center text-red-600 dark:text-red-400">{team.lost}</td>
                          <td className="px-3 py-4 text-center">{team.gf}</td>
                          <td className="px-3 py-4 text-center">{team.ga}</td>
                          <td
                            className={`px-3 py-4 text-center font-semibold ${
                              team.gd > 0
                                ? "text-green-600 dark:text-green-400"
                                : team.gd < 0
                                  ? "text-red-600 dark:text-red-400"
                                  : ""
                            }`}
                          >
                            {team.gd > 0 ? `+${team.gd}` : team.gd}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-lg font-bold text-primary">{team.points}</span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-1">
                              {team.form.length > 0 ? (
                                team.form.map((result: string, j: number) => (
                                  <div
                                    key={j}
                                    className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
                                      result === "W"
                                        ? "bg-green-500 text-white"
                                        : result === "D"
                                          ? "bg-muted text-muted-foreground"
                                          : "bg-red-500 text-white"
                                    }`}
                                  >
                                    {result}
                                  </div>
                                ))
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card className="border-primary/50 bg-primary/5">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                      <Trophy className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Champions League</h3>
                      <p className="text-xs text-muted-foreground">อันดับ 1-4</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-amber-500/50 bg-amber-500/5">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500">
                      <Trophy className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Europa League</h3>
                      <p className="text-xs text-muted-foreground">อันดับ 5</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-destructive/50 bg-destructive/5">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive">
                      <TrendingDown className="h-5 w-5 text-destructive-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">ตกชั้น</h3>
                      <p className="text-xs text-muted-foreground">อันดับ 18-20</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
