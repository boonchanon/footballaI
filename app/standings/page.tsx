"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Trophy, TrendingDown, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import useSWR from "swr"
import Image from "next/image"

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
        description: item.description,
      }))
    : []

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Header */}
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="w-8 h-8 text-primary" />
                <h1 className="text-3xl md:text-4xl font-display">ตารางคะแนน</h1>
              </div>
              <p className="text-muted-foreground">พรีเมียร์ลีก อังกฤษ ฤดูกาล 2024-2025</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isLoading} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              รีเฟรช
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {isLoading ? (
            <Card className="border-border/50">
              <CardContent className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">กำลังโหลดข้อมูลตารางคะแนน...</span>
              </CardContent>
            </Card>
          ) : error || standings.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="text-center py-12">
                <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">ไม่สามารถโหลดข้อมูลตารางคะแนนได้</p>
                <p className="text-muted-foreground mb-4">กรุณาตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง</p>
                <Button variant="outline" onClick={() => mutate()}>
                  ลองใหม่
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-border bg-muted/50">
                      <tr className="text-sm text-muted-foreground">
                        <th className="text-left py-4 px-4 font-medium w-16">อันดับ</th>
                        <th className="text-left py-4 px-4 font-medium">ทีม</th>
                        <th className="text-center py-4 px-3 font-medium">เล่น</th>
                        <th className="text-center py-4 px-3 font-medium">ชนะ</th>
                        <th className="text-center py-4 px-3 font-medium">เสมอ</th>
                        <th className="text-center py-4 px-3 font-medium">แพ้</th>
                        <th className="text-center py-4 px-3 font-medium">ได้</th>
                        <th className="text-center py-4 px-3 font-medium">เสีย</th>
                        <th className="text-center py-4 px-3 font-medium">+/-</th>
                        <th className="text-center py-4 px-4 font-medium">คะแนน</th>
                        <th className="text-center py-4 px-4 font-medium">ฟอร์ม</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((team: any, i: number) => (
                        <tr
                          key={i}
                          className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                            i < 4 ? "bg-primary/5" : i >= standings.length - 3 ? "bg-destructive/5" : ""
                          }`}
                        >
                          <td className="py-4 px-4">
                            <div
                              className={`flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${
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
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              {team.logo ? (
                                <Image
                                  src={team.logo || "/placeholder.svg"}
                                  alt={team.team}
                                  width={32}
                                  height={32}
                                  className="w-8 h-8 rounded-full object-contain bg-white p-0.5"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-muted rounded-full" />
                              )}
                              <div>
                                <span className="font-semibold">{team.team}</span>
                                {team.teamEn && team.teamEn !== team.team && (
                                  <p className="text-xs text-muted-foreground">{team.teamEn}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="text-center py-4 px-3 text-muted-foreground">{team.played}</td>
                          <td className="text-center py-4 px-3 font-medium text-green-600 dark:text-green-400">
                            {team.won}
                          </td>
                          <td className="text-center py-4 px-3 text-muted-foreground">{team.drawn}</td>
                          <td className="text-center py-4 px-3 text-red-600 dark:text-red-400">{team.lost}</td>
                          <td className="text-center py-4 px-3">{team.gf}</td>
                          <td className="text-center py-4 px-3">{team.ga}</td>
                          <td
                            className={`text-center py-4 px-3 font-semibold ${
                              team.gd > 0
                                ? "text-green-600 dark:text-green-400"
                                : team.gd < 0
                                  ? "text-red-600 dark:text-red-400"
                                  : ""
                            }`}
                          >
                            {team.gd > 0 ? `+${team.gd}` : team.gd}
                          </td>
                          <td className="text-center py-4 px-4">
                            <span className="font-bold text-primary text-lg">{team.points}</span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-1">
                              {team.form.length > 0 ? (
                                team.form.map((result: string, j: number) => (
                                  <div
                                    key={j}
                                    className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
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

              {/* Legend */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-primary/50 bg-primary/5">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Champions League</h3>
                      <p className="text-xs text-muted-foreground">อันดับ 1-4</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-amber-500/50 bg-amber-500/5">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Europa League</h3>
                      <p className="text-xs text-muted-foreground">อันดับ 5</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-destructive/50 bg-destructive/5">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-destructive flex items-center justify-center">
                      <TrendingDown className="w-5 h-5 text-destructive-foreground" />
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
