"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Clock, TrendingUp, Shield } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { MatchEventsTimeline, type MatchEvent } from "@/components/match-events-timeline"

export default function MatchDetailPage() {
  const params = useParams()
  const matchId = params.id as string

  console.log("[v0] Match ID:", matchId)

  // Mock match data
  const match = {
    id: matchId,
    round: 28,
    homeTeam: "แมนเชสเตอร์ ซิตี้",
    awayTeam: "ลิเวอร์พูล",
    homeScore: 2,
    awayScore: 1,
    date: "8 มี.ค. 2025",
    time: "22:30",
    status: "finished",
    stadium: "เอติฮัด สเตเดี้ยม",
    attendance: "53,400",
    referee: "ไมเคิล โอลิเวอร์",
  }

  // Mock match events data
  const matchEvents: MatchEvent[] = [
    {
      id: "1",
      type: "yellow_card",
      minute: 29,
      team: "away",
      player: "Lewis Dunk",
    },
    {
      id: "2",
      type: "yellow_card",
      minute: 41,
      team: "away",
      player: "Pascal Gross",
    },
    {
      id: "3",
      type: "yellow_card",
      minute: 41,
      team: "home",
      player: "Pep Guardiola",
      role: "Coach",
    },
    {
      id: "4",
      type: "goal",
      minute: 41,
      team: "home",
      player: "Erling Haaland",
      score: { home: 1, away: 0 },
      isPenalty: true,
    },
    {
      id: "5",
      type: "yellow_card",
      minute: 53,
      team: "away",
      player: "Jan Paul van Hecke",
    },
    {
      id: "6",
      type: "goal",
      minute: 60,
      team: "away",
      player: "Kaoru Mitoma",
      assist: "Yasin Ayari",
      score: { home: 1, away: 1 },
    },
    {
      id: "7",
      type: "yellow_card",
      minute: 60,
      team: "away",
      player: "Maxim De Cuyper",
    },
    {
      id: "8",
      type: "yellow_card",
      minute: 60,
      team: "home",
      player: "Gianluigi Donnarumma",
    },
    {
      id: "9",
      type: "substitution",
      minute: 64,
      team: "home",
      playerOut: "Rodri",
      playerIn: "Nico González",
    },
    {
      id: "10",
      type: "yellow_card",
      minute: 69,
      team: "away",
      player: "Kaoru Mitoma",
    },
    {
      id: "11",
      type: "substitution",
      minute: 73,
      team: "home",
      playerOut: "Rayan Cherki",
      playerIn: "Phil Foden",
    },
    {
      id: "12",
      type: "substitution",
      minute: 73,
      team: "home",
      playerOut: "Nico O'Reilly",
      playerIn: "Nathan Aké",
    },
    {
      id: "13",
      type: "substitution",
      minute: 73,
      team: "home",
      playerOut: "Rico Lewis",
      playerIn: "Matheus Nunes",
    },
    {
      id: "14",
      type: "substitution",
      minute: 77,
      team: "away",
      playerOut: "Danny Welbeck",
      playerIn: "Georginio Rutter",
    },
    {
      id: "15",
      type: "substitution",
      minute: 77,
      team: "away",
      playerOut: "Brajan Gruda",
      playerIn: "Diego Gomez",
    },
    {
      id: "16",
      type: "substitution",
      minute: 83,
      team: "away",
      playerOut: "Tom Watson",
      playerIn: "Kaoru Mitoma",
    },
    {
      id: "17",
      type: "substitution",
      minute: 83,
      team: "away",
      playerOut: "James Milner",
      playerIn: "Yasin Ayari",
    },
    {
      id: "18",
      type: "yellow_card",
      minute: 89,
      team: "away",
      player: "Tom Watson",
    },
  ]

  const homeLineup = {
    formation: "4-3-3",
    manager: { name: "เป๊ป กวาร์ดิโอล่า", nationality: "สเปน" },
    starting: [
      { id: 1100, name: "เอเดอร์ซอน", number: 31, position: "GK", rating: 7.5, x: 50, y: 90 },
      { id: 1101, name: "วอล์คเกอร์", number: 2, position: "RB", rating: 7.8, x: 80, y: 70 },
      { id: 1102, name: "ดิอาส", number: 3, position: "CB", rating: 8.2, x: 60, y: 75 },
      { id: 1103, name: "อาคานจี", number: 25, position: "CB", rating: 7.9, x: 40, y: 75 },
      { id: 1104, name: "อาเกโร่", number: 21, position: "LB", rating: 7.6, x: 20, y: 70 },
      { id: 1105, name: "โรดรี", number: 16, position: "CDM", rating: 8.5, x: 50, y: 55 },
      { id: 1106, name: "เดอ บรอยเนอร์", number: 17, position: "CM", rating: 8.8, x: 65, y: 45 },
      { id: 1107, name: "กุนโดกัน", number: 19, position: "CM", rating: 7.7, x: 35, y: 45 },
      { id: 1108, name: "ฟอร์เด้น", number: 47, position: "RW", rating: 7.9, x: 75, y: 25 },
      { id: 1109, name: "ฮาแลนด์", number: 9, position: "ST", rating: 9.2, x: 50, y: 15, goals: 2 },
      { id: 1110, name: "กรีลิช", number: 10, position: "LW", rating: 7.4, x: 25, y: 25 },
    ],
    substitutes: [
      { id: 1111, name: "ออร์เตก้า", number: 18, position: "GK" },
      { id: 1112, name: "สโตนส์", number: 5, position: "DEF" },
      { id: 1113, name: "อาคันจี", number: 6, position: "MID" },
      { id: 1114, name: "เบอร์นาร์โด้ ซิลวา", number: 20, position: "MID", subbedIn: 75 },
      { id: 1115, name: "อัลวาเรซ", number: 19, position: "FWD" },
    ],
  }

  const awayLineup = {
    formation: "4-3-3",
    manager: { name: "เจอร์เกน คล็อปป์", nationality: "เยอรมัน" },
    starting: [
      { id: 1200, name: "อลิสซง", number: 1, position: "GK", rating: 7.2, x: 50, y: 10 },
      { id: 1201, name: "อเล็กซานเดอร์-อาร์โนลด์", number: 66, position: "RB", rating: 7.5, x: 80, y: 30 },
      { id: 1202, name: "โควาเต้", number: 5, position: "CB", rating: 6.8, x: 60, y: 25 },
      { id: 1203, name: "ฟาน ไดค์", number: 4, position: "CB", rating: 7.3, x: 40, y: 25 },
      { id: 1204, name: "โรเบิร์ตสัน", number: 26, position: "LB", rating: 7.0, x: 20, y: 30 },
      { id: 1205, name: "มัค อัลลิสเตอร์", number: 10, position: "CM", rating: 7.4, x: 50, y: 45 },
      { id: 1206, name: "เซอบิสลอส", number: 3, position: "CM", rating: 7.1, x: 65, y: 50 },
      { id: 1207, name: "โจนส์", number: 17, position: "CM", rating: 6.9, x: 35, y: 50 },
      { id: 1208, name: "ซาลาห์", number: 11, position: "RW", rating: 8.1, x: 75, y: 70, goals: 1 },
      { id: 1209, name: "นูเนซ", number: 9, position: "ST", rating: 6.7, x: 50, y: 80 },
      { id: 1210, name: "ดิอาซ", number: 7, position: "LW", rating: 7.2, x: 25, y: 70 },
    ],
    substitutes: [
      { id: 1211, name: "เคลเลเฮอร์", number: 62, position: "GK" },
      { id: 1212, name: "ชิมิคัส", number: 21, position: "DEF" },
      { id: 1213, name: "กราเวนเบิร์ช", number: 38, position: "MID", subbedIn: 68 },
      { id: 1214, name: "เอลเลียต", number: 19, position: "MID" },
      { id: 1215, name: "กัคโป", number: 18, position: "FWD", subbedIn: 82 },
    ],
  }

  const PlayerCard = ({
    player,
    isHome,
  }: {
    player: (typeof homeLineup.starting)[0]
    isHome: boolean
  }) => (
    <Link
      href={`/players/${player.id}`}
      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
      style={{ left: `${isHome ? player.x : 100 - player.x}%`, top: `${isHome ? player.y : 100 - player.y}%` }}
    >
      <div className="flex flex-col items-center gap-1">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-lg shadow-lg border-2 border-white group-hover:scale-110 group-hover:border-primary transition-all">
            {player.number}
          </div>
          {player.goals && player.goals > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-white border-2 border-white">
              {player.goals}
            </div>
          )}
        </div>
        <div className="bg-background/95 backdrop-blur-sm rounded-lg px-2 py-1 shadow-md border border-border/50 group-hover:border-primary/50 transition-colors">
          <div className="text-xs font-medium text-center whitespace-nowrap">{player.name}</div>
          {match.status === "finished" && player.rating && (
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3 text-primary" />
              <span className="text-xs font-bold text-primary">{player.rating}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )

  const SubstituteCard = ({
    sub,
    teamColor,
  }: {
    sub: (typeof homeLineup.substitutes)[0]
    teamColor: "primary" | "destructive"
  }) => (
    <Link
      href={`/players/${sub.id}`}
      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
    >
      <div
        className={`w-8 h-8 rounded-full bg-${teamColor}/20 flex items-center justify-center text-xs font-bold group-hover:bg-${teamColor}/40 transition-colors`}
      >
        {sub.number}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium group-hover:text-primary transition-colors">{sub.name}</div>
        <div className="text-xs text-muted-foreground">{sub.position}</div>
      </div>
      {sub.subbedIn && (
        <Badge variant="secondary" className="text-xs">
          ↑ {sub.subbedIn}'
        </Badge>
      )}
    </Link>
  )

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-7xl mx-auto space-y-8">
          <Link
            href="/matches"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับไปหน้าแมทช์
          </Link>

          <Card className="border-border/50 shadow-lg">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-sm">
                  FT
                </Badge>
                <Badge variant="outline" className="text-sm">
                  นัดที่ {match.round}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-8">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                    <Shield className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display">{match.homeTeam}</h2>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-5xl font-bold text-primary">{match.homeScore}</span>
                  <span className="text-3xl font-bold text-muted-foreground">-</span>
                  <span className="text-5xl font-bold text-destructive">{match.awayScore}</span>
                </div>
                <div className="flex items-center gap-4 flex-1 justify-end">
                  <div className="text-right">
                    <h2 className="text-2xl font-display">{match.awayTeam}</h2>
                  </div>
                  <div className="w-20 h-20 bg-gradient-to-br from-destructive/20 to-destructive/10 rounded-full flex items-center justify-center">
                    <Shield className="w-10 h-10 text-destructive" />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    {match.date} • {match.time}
                  </span>
                </div>
                <span>•</span>
                <span>{match.stadium}</span>
                <span>•</span>
                <span>ผู้ชม: {match.attendance}</span>
              </div>
            </CardHeader>
          </Card>

          <Tabs defaultValue="lineup" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="facts">ข้อมูล</TabsTrigger>
              <TabsTrigger value="events">เหตุการณ์</TabsTrigger>
              <TabsTrigger value="lineup">Line-up</TabsTrigger>
              <TabsTrigger value="table">ตาราง</TabsTrigger>
              <TabsTrigger value="stats">สถิติ</TabsTrigger>
              <TabsTrigger value="h2h">ดวลกัน</TabsTrigger>
            </TabsList>

            <TabsContent value="facts" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <h3 className="text-xl font-display">ข้อมูลการแข่งขัน</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">สนามแข่งขัน</span>
                    <span className="font-medium">{match.stadium}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">ผู้เข้าชม</span>
                    <span className="font-medium">{match.attendance}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">ผู้ตัดสิน</span>
                    <span className="font-medium">{match.referee}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="events" className="space-y-6 mt-6">
              <Card className="border-border/50">
                <CardContent className="p-0">
                  <MatchEventsTimeline
                    events={matchEvents}
                    homeTeam={match.homeTeam}
                    awayTeam={match.awayTeam}
                    halfTimeScore={{ home: 1, away: 0 }}
                    fullTimeScore={{ home: 1, away: 1 }}
                    firstHalfAddedTime={4}
                    secondHalfAddedTime={5}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lineup" className="space-y-6 mt-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Home Team Lineup */}
                <Card className="border-border/50 shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-display">{match.homeTeam}</h3>
                        <p className="text-sm text-muted-foreground mt-1">แผน {homeLineup.formation}</p>
                      </div>
                      <Shield className="w-8 h-8 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Football Pitch */}
                    <div className="relative aspect-[9/14] bg-gradient-to-b from-emerald-700 to-emerald-600 rounded-lg overflow-hidden shadow-inner">
                      {/* Pitch markings */}
                      <div className="absolute inset-0">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-12 border-2 border-white/30 rounded-b-lg" />
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-6 border-2 border-white/30 rounded-b-lg" />
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/30" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/30 rounded-full" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/30 rounded-full" />
                      </div>

                      {/* Players - now clickable */}
                      {homeLineup.starting.map((player) => (
                        <PlayerCard key={player.id} player={player} isHome={true} />
                      ))}
                    </div>

                    {/* Substitutes - now clickable */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <div className="w-1 h-4 bg-primary rounded" />
                        นักเตะสำรอง
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {homeLineup.substitutes.map((sub) => (
                          <SubstituteCard key={sub.id} sub={sub} teamColor="primary" />
                        ))}
                      </div>
                    </div>

                    {/* Manager */}
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                          <span className="text-lg">👔</span>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">ผู้จัดการทีม</div>
                          <div className="font-semibold">{homeLineup.manager.name}</div>
                          <div className="text-xs text-muted-foreground">{homeLineup.manager.nationality}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Away Team Lineup */}
                <Card className="border-border/50 shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-display">{match.awayTeam}</h3>
                        <p className="text-sm text-muted-foreground mt-1">แผน {awayLineup.formation}</p>
                      </div>
                      <Shield className="w-8 h-8 text-destructive" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Football Pitch */}
                    <div className="relative aspect-[9/14] bg-gradient-to-b from-emerald-700 to-emerald-600 rounded-lg overflow-hidden shadow-inner">
                      {/* Pitch markings */}
                      <div className="absolute inset-0">
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-12 border-2 border-white/30 rounded-t-lg" />
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-6 border-2 border-white/30 rounded-t-lg" />
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/30" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/30 rounded-full" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/30 rounded-full" />
                      </div>

                      {/* Players - now clickable */}
                      {awayLineup.starting.map((player) => (
                        <PlayerCard key={player.id} player={player} isHome={false} />
                      ))}
                    </div>

                    {/* Substitutes - now clickable */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <div className="w-1 h-4 bg-destructive rounded" />
                        นักเตะสำรอง
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {awayLineup.substitutes.map((sub) => (
                          <SubstituteCard key={sub.id} sub={sub} teamColor="destructive" />
                        ))}
                      </div>
                    </div>

                    {/* Manager */}
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-destructive to-destructive/60 flex items-center justify-center">
                          <span className="text-lg">👔</span>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">ผู้จัดการทีม</div>
                          <div className="font-semibold">{awayLineup.manager.name}</div>
                          <div className="text-xs text-muted-foreground">{awayLineup.manager.nationality}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="table" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <h3 className="text-xl font-display">ตารางคะแนน</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">ตารางคะแนนจะแสดงที่นี่</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <h3 className="text-xl font-display">สถิติการแข่งขัน</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">สถิติการแข่งขันจะแสดงที่นี่</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="h2h" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <h3 className="text-xl font-display">ประวัติการพบกัน</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">ประวัติการพบกันจะแสดงที่นี่</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
