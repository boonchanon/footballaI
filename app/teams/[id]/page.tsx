import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Goal, MapPin, Shield, Sparkles, Star, Trophy, Users } from "lucide-react"

import { footballService } from "@/app/api/football/service"
import { Navigation } from "@/components/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PREMIER_LEAGUE_EDITORIAL_SEASON } from "@/lib/season"

type ApiSquadPlayer = {
  id: string
  name: string
  position: string
  number: number | null
  age: number | null
  nationality: string
  photo: string
}

type ApiTeamFixture = {
  id: string
  date: string
  league: string
  homeTeam: { id: string; name: string; nameEn: string; logo: string }
  awayTeam: { id: string; name: string; nameEn: string; logo: string }
  result: string
  status: { short: string; long: string; isLive: boolean; isFinished: boolean; isUpcoming: boolean }
}

type ApiTeamStatistics = {
  matchesPlayed: number
  wins: number
  draws: number
  losses: number
  goals: number
  goalsAgainst: number
  points: number
  rank: number
  form: string
}

type ApiTeamDetail = {
  id: string
  name: string
  nameEn: string
  logo: string
  country: string
  league: string
  stadium: string
  city: string
  founded: number | null
  website: string
  coach: string
  latestFormation: string
  players: ApiSquadPlayer[]
  fixtures: ApiTeamFixture[]
  statistics: ApiTeamStatistics | null
}

const fallbackBanner = "/football-stadium-night-lights-premier-league.jpg"
const fallbackBadge = "/placeholder-logo.png"

function normalizeSquadPositionLabel(position?: string) {
  const value = String(position || "").toLowerCase()
  if (!value) return "ไม่ระบุตำแหน่ง"
  if (value.includes("goal")) return "ผู้รักษาประตู"
  if (value.includes("def")) return "กองหลัง"
  if (value.includes("mid")) return "กองกลาง"
  if (value.includes("for") || value.includes("str") || value.includes("wing") || value.includes("att")) return "กองหน้า"
  return position || "ไม่ระบุตำแหน่ง"
}

function groupSquadByPosition(players: ApiSquadPlayer[]) {
  const order = ["ผู้รักษาประตู", "กองหลัง", "กองกลาง", "กองหน้า", "ไม่ระบุตำแหน่ง"]
  const groups = new Map<string, ApiSquadPlayer[]>()

  for (const player of players) {
    const label = normalizeSquadPositionLabel(player.position)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)?.push(player)
  }

  return order
    .map((label) => ({
      label,
      players: (groups.get(label) || []).sort((left, right) => {
        const leftNumber = left.number ?? Number.MAX_SAFE_INTEGER
        const rightNumber = right.number ?? Number.MAX_SAFE_INTEGER
        return leftNumber - rightNumber || left.name.localeCompare(right.name)
      }),
    }))
    .filter((group) => group.players.length > 0)
}

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const teamDetail: ApiTeamDetail | null = await footballService.getTeam(String(id)).catch(() => null)

  if (!teamDetail) {
    notFound()
  }

  const squadGroups = groupSquadByPosition(Array.isArray(teamDetail.players) ? teamDetail.players : [])
  const latestFixtures = Array.isArray(teamDetail.fixtures) ? teamDetail.fixtures : []
  const teamStatistics = teamDetail.statistics

  const overviewStats = [
    { label: "ประเทศ", value: teamDetail.country || "ไม่มีข้อมูล" },
    { label: "ลีก", value: teamDetail.league || "ไม่มีข้อมูล" },
    { label: "แผนการเล่น", value: teamDetail.latestFormation || "ไม่มีข้อมูล" },
    { label: "เว็บไซต์", value: teamDetail.website || "ไม่มีข้อมูล" },
  ]

  const statSnapshot = teamStatistics
    ? [
        { label: "แข่งแล้ว", value: String(teamStatistics.matchesPlayed) },
        { label: "ชนะ", value: String(teamStatistics.wins) },
        { label: "เสมอ", value: String(teamStatistics.draws) },
        { label: "แพ้", value: String(teamStatistics.losses) },
        { label: "ได้ประตู", value: String(teamStatistics.goals) },
        { label: "เสียประตู", value: String(teamStatistics.goalsAgainst) },
      ]
    : [
        { label: "แข่งแล้ว", value: "-" },
        { label: "ชนะ", value: "-" },
        { label: "เสมอ", value: "-" },
        { label: "แพ้", value: "-" },
        { label: "ได้ประตู", value: "-" },
        { label: "เสียประตู", value: "-" },
      ]

  const teamSummary = `${teamDetail.nameEn} ในฤดูกาล ${PREMIER_LEAGUE_EDITORIAL_SEASON.labelLong} หน้านี้แสดงข้อมูลทีมจาก API ผ่าน backend ของระบบโดยตรง ไม่มีการใช้ข้อมูลม็อกหรือข้อมูลจำลองในการแสดงผล`
  const teamObjective =
    teamStatistics?.rank && teamStatistics.rank <= 6 ? "ลุ้นพื้นที่ฟุตบอลยุโรปและรักษาความสม่ำเสมอของผลงาน" : "เก็บแต้มให้ต่อเนื่องและพัฒนาผลงานรายสัปดาห์"

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pb-16">
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0">
            <Image src={fallbackBanner} alt={teamDetail.nameEn} fill className="object-cover" />
            <div className="absolute inset-0 bg-background/70 dark:bg-black/75" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent" />
          </div>

          <div className="container relative z-10 mx-auto px-4 py-12 md:py-16">
            <Link href="/clubs" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              กลับไปหน้าสโมสร
            </Link>

            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
                <div className="flex h-28 w-28 items-center justify-center rounded-[28px] border border-border/70 bg-card/80 p-4 backdrop-blur dark:border-white/10 dark:bg-white/8">
                  <Image src={teamDetail.logo || fallbackBadge} alt={teamDetail.nameEn} width={92} height={92} className="h-20 w-20 object-contain" unoptimized={String(teamDetail.logo || "").startsWith("http")} />
                </div>

                <div className="max-w-3xl">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge className="border-0 bg-primary text-primary-foreground">โปรไฟล์สโมสร</Badge>
                    <Badge variant="secondary" className="border border-border/70 bg-card/80 text-foreground/80 dark:border-white/10 dark:bg-white/10 dark:text-white/80">
                      ฤดูกาล {PREMIER_LEAGUE_EDITORIAL_SEASON.labelLong}
                    </Badge>
                  </div>
                  <h1 className="text-4xl font-display tracking-tight text-foreground md:text-6xl dark:text-white">{teamDetail.nameEn}</h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-foreground/82 md:text-base dark:text-white/78">{teamSummary}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Card className="border-border/70 bg-card/80 text-foreground backdrop-blur dark:border-white/10 dark:bg-white/8 dark:text-white">
                  <CardContent className="p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground dark:text-white/55">ผู้จัดการทีม</p>
                    <p className="mt-2 text-xl font-semibold">{teamDetail.coach || "ไม่มีข้อมูล"}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/70 bg-card/80 text-foreground backdrop-blur dark:border-white/10 dark:bg-white/8 dark:text-white">
                  <CardContent className="p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground dark:text-white/55">เป้าหมาย</p>
                    <p className="mt-2 text-xl font-semibold">{teamObjective}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pt-8">
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">เมือง</p>
                    <p className="mt-1 font-semibold">{teamDetail.city || "ไม่มีข้อมูล"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">สนาม</p>
                    <p className="mt-1 font-semibold">{teamDetail.stadium || "ไม่มีข้อมูล"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">ขุมกำลัง</p>
                    <p className="mt-1 font-semibold">{teamDetail.players.length} คน</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">คะแนนทีม</p>
                    <p className="mt-1 font-semibold">{teamStatistics?.rank ? `อันดับ ${teamStatistics.rank}` : "ไม่มีข้อมูล"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container mx-auto px-4 pt-8">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4 md:w-[720px]">
              <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
              <TabsTrigger value="players">นักเตะ</TabsTrigger>
              <TabsTrigger value="fixtures">โปรแกรม/ผล</TabsTrigger>
              <TabsTrigger value="stats">สถิติ</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle>ภาพรวมทีม</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <p className="leading-7 text-muted-foreground">{teamSummary}</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">ก่อตั้ง</p>
                        <p className="mt-2 font-semibold text-foreground">{teamDetail.founded ? String(teamDetail.founded) : "ไม่มีข้อมูล"}</p>
                      </div>
                      {overviewStats.map((item) => (
                        <div key={item.label} className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                          <p className="mt-2 break-all font-semibold text-foreground">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle>ข้อมูลสำคัญของทีม</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      `โค้ช: ${teamDetail.coach || "ไม่มีข้อมูล"}`,
                      `ลีก: ${teamDetail.league || "ไม่มีข้อมูล"}`,
                      `ประเทศ: ${teamDetail.country || "ไม่มีข้อมูล"}`,
                      `แผนการเล่นล่าสุด: ${teamDetail.latestFormation || "ไม่มีข้อมูล"}`,
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
                        <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                        <p className="text-sm leading-6 text-foreground">{item}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="players" className="mt-6">
              {squadGroups.length > 0 ? (
                <div className="space-y-6">
                  {squadGroups.map((group) => (
                    <Card key={group.label} className="border-border/50">
                      <CardHeader>
                        <CardTitle>{group.label}</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {group.players.map((player) => (
                          <Link
                            key={`${group.label}-${player.id}-${player.name}`}
                            href={player.id ? `/players/${player.id}` : "#"}
                            className="rounded-2xl border border-border/60 bg-muted/30 p-4 transition-colors hover:border-primary/40"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-start gap-3">
                                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-card">
                                  {player.photo ? (
                                    <Image src={player.photo} alt={player.name} width={48} height={48} className="h-full w-full object-cover" unoptimized={player.photo.startsWith("http")} />
                                  ) : (
                                    <Users className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-foreground">{player.name}</p>
                                  <p className="mt-1 text-sm text-muted-foreground">{player.nationality || "ไม่ทราบสัญชาติ"}</p>
                                </div>
                              </div>
                              <div className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">#{player.number ?? "-"}</div>
                            </div>
                            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{normalizeSquadPositionLabel(player.position)}</span>
                              <span>•</span>
                              <span>{player.age ? `${player.age} ปี` : "ไม่ทราบอายุ"}</span>
                            </div>
                          </Link>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-border/50">
                  <CardContent className="p-6 text-sm text-muted-foreground">ไม่มีข้อมูลนักเตะ</CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="fixtures" className="mt-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>5 นัดล่าสุด</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {latestFixtures.length > 0 ? (
                    latestFixtures.map((fixture) => (
                      <div key={fixture.id} className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{fixture.league || "ไม่มีข้อมูลลีก"}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{fixture.date || "ไม่มีข้อมูลวันที่"}</p>
                          </div>
                          <div className="text-sm font-semibold text-foreground">
                            {fixture.homeTeam.name} vs {fixture.awayTeam.name}
                          </div>
                          <div className="inline-flex w-fit rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{fixture.result}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">ไม่มีข้อมูลโปรแกรมหรือผลการแข่งขัน</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats" className="mt-6 space-y-6">
              <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle>ฟอร์มและเป้าหมาย</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">ฟอร์มล่าสุด</p>
                      <p className="mt-2 text-2xl font-display text-primary">{teamStatistics?.form || "ไม่มีข้อมูลฟอร์ม"}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">เป้าหมายฤดูกาล</p>
                      <p className="mt-2 font-semibold text-foreground">{teamObjective}</p>
                    </div>
                    {teamStatistics ? (
                      <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">อันดับในลีก</p>
                        <p className="mt-2 font-semibold text-foreground">อันดับ {teamStatistics.rank} • {teamStatistics.points} คะแนน</p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle>สรุปสถิติ</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    {statSnapshot.map((item) => (
                      <div key={item.label} className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                        </div>
                        <p className="mt-3 text-lg font-semibold text-foreground">{item.value}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>มุมมองทีม</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-3xl border border-primary/12 bg-primary/[0.05] p-6">
                    <div className="mb-3 flex items-center gap-2">
                      <Goal className="h-5 w-5 text-primary" />
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">ภาพรวมผลงาน</p>
                    </div>
                    <p className="leading-8 text-muted-foreground">
                      {teamDetail.nameEn} ในฤดูกาล {PREMIER_LEAGUE_EDITORIAL_SEASON.labelLong} แสดงผลด้วยข้อมูลจริงจาก API ผ่าน backend ของระบบ โดยไม่มีการสลับไปใช้ข้อมูลม็อกหรือข้อมูลฮาร์ดโค้ดระหว่างการโหลดหน้า
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      </main>
    </div>
  )
}
