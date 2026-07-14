import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Goal, MapPin, Shield, Sparkles, Star, Trophy, Users } from "lucide-react"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PREMIER_LEAGUE_EDITORIAL_SEASON } from "@/lib/season"

type TeamProfile = {
  id: string
  nameTh: string
  nameEn: string
  city: string
  founded: string
  stadium: string
  manager: string
  style: string
  objective: string
  badge: string
  banner: string
  rating: number
  honours: string
  squadSize: string
  recentForm: string
  summary: string
  focus: string[]
  keyPlayers: Array<{
    name: string
    role: string
    note: string
    rating: number
  }>
  stats: Array<{ label: string; value: string }>
}

const fallbackBanner = "/football-stadium-night-lights-premier-league.jpg"

const teamSeed = [
  {
    id: "1",
    nameTh: "อาร์เซนอล",
    nameEn: "Arsenal",
    city: "ลอนดอน",
    founded: "1886",
    stadium: "Emirates Stadium",
    manager: "Mikel Arteta",
    badge: "/arsenal-logo.png",
    banner: "/arsenal-football-stadium.png",
    rating: 92,
    honours: "แชมป์ลีกสูงสุด 13 สมัย",
    squadSize: "26 คน",
    recentForm: "W W D W W",
  },
  {
    id: "2",
    nameTh: "แอสตัน วิลลา",
    nameEn: "Aston Villa",
    city: "เบอร์มิงแฮม",
    founded: "1874",
    stadium: "Villa Park",
    manager: "Unai Emery",
    badge: "/aston-villa-logo.png",
    banner: "/football-stadium-aerial.jpg",
    rating: 86,
    honours: "แชมป์ลีกสูงสุด 7 สมัย",
    squadSize: "25 คน",
    recentForm: "W D W W L",
  },
  {
    id: "3",
    nameTh: "บอร์นมัธ",
    nameEn: "AFC Bournemouth",
    city: "บอร์นมัธ",
    founded: "1899",
    stadium: "Vitality Stadium",
    manager: "Andoni Iraola",
    badge: "/bournemouth-logo.jpg",
    banner: "/football-match-atmosphere.jpg",
    rating: 80,
    honours: "ทีมพลังงานสูงของลีก",
    squadSize: "24 คน",
    recentForm: "D W L W W",
  },
  {
    id: "4",
    nameTh: "เบรนท์ฟอร์ด",
    nameEn: "Brentford",
    city: "ลอนดอน",
    founded: "1889",
    stadium: "Gtech Community Stadium",
    manager: "Keith Andrews",
    badge: "/brentford-logo.jpg",
    banner: "/football-stadium-aerial.jpg",
    rating: 79,
    honours: "ทีมระบบจัดของพรีเมียร์ลีก",
    squadSize: "24 คน",
    recentForm: "W L D W D",
  },
  {
    id: "5",
    nameTh: "ไบรท์ตัน",
    nameEn: "Brighton & Hove Albion",
    city: "ไบรท์ตัน",
    founded: "1901",
    stadium: "Amex Stadium",
    manager: "Fabian Hurzeler",
    badge: "/brighton-logo.png",
    banner: "/football-pitch-aerial-view-green-grass.jpg",
    rating: 83,
    honours: "ทีมพัฒนาผู้เล่นเด่นของลีก",
    squadSize: "25 คน",
    recentForm: "D W W L W",
  },
  {
    id: "6",
    nameTh: "เชลซี",
    nameEn: "Chelsea",
    city: "ลอนดอน",
    founded: "1905",
    stadium: "Stamford Bridge",
    manager: "Enzo Maresca",
    badge: "/chelsea-football-club-crest.png",
    banner: "/chelsea-football-stadium.png",
    rating: 88,
    honours: "แชมป์ลีกสูงสุด 6 สมัย",
    squadSize: "27 คน",
    recentForm: "W W L D W",
  },
  {
    id: "7",
    nameTh: "โคเวนทรี ซิตี้",
    nameEn: "Coventry City",
    city: "โคเวนทรี",
    founded: "1883",
    stadium: "Coventry Building Society Arena",
    manager: "Frank Lampard",
    badge: "/placeholder-logo.png",
    banner: fallbackBanner,
    rating: 74,
    honours: "ทีมน้องใหม่ที่กลับมาสร้างสีสัน",
    squadSize: "24 คน",
    recentForm: "D W D L W",
  },
  {
    id: "8",
    nameTh: "คริสตัล พาเลซ",
    nameEn: "Crystal Palace",
    city: "ลอนดอน",
    founded: "1905",
    stadium: "Selhurst Park",
    manager: "Oliver Glasner",
    badge: "/crystal-palace-logo.png",
    banner: "/football-fans-cheering-stadium-atmosphere.jpg",
    rating: 81,
    honours: "ทีมสวนกลับอันตราย",
    squadSize: "24 คน",
    recentForm: "W D L W W",
  },
  {
    id: "9",
    nameTh: "เอฟเวอร์ตัน",
    nameEn: "Everton",
    city: "ลิเวอร์พูล",
    founded: "1878",
    stadium: "Hill Dickinson Stadium",
    manager: "Sean Dyche",
    badge: "/everton-fc-badge.png",
    banner: "/football-stadium-night-lights-premier-league.jpg",
    rating: 78,
    honours: "แชมป์ลีกสูงสุด 9 สมัย",
    squadSize: "25 คน",
    recentForm: "D L W D W",
  },
  {
    id: "10",
    nameTh: "ฟูแลม",
    nameEn: "Fulham",
    city: "ลอนดอน",
    founded: "1879",
    stadium: "Craven Cottage",
    manager: "Marco Silva",
    badge: "/fulham-logo.jpg",
    banner: "/football-match-atmosphere.jpg",
    rating: 80,
    honours: "ทีมกลางตารางที่เล่นเป็นระบบ",
    squadSize: "24 คน",
    recentForm: "W D W L D",
  },
  {
    id: "11",
    nameTh: "ฮัลล์ ซิตี้",
    nameEn: "Hull City",
    city: "ฮัลล์",
    founded: "1904",
    stadium: "MKM Stadium",
    manager: "TBD",
    badge: "/placeholder-logo.png",
    banner: fallbackBanner,
    rating: 73,
    honours: "ทีมเลื่อนชั้นที่เน้นความเหนียวแน่น",
    squadSize: "24 คน",
    recentForm: "W L D W D",
  },
  {
    id: "12",
    nameTh: "อิปสวิช ทาวน์",
    nameEn: "Ipswich Town",
    city: "อิปสวิช",
    founded: "1878",
    stadium: "Portman Road",
    manager: "Kieran McKenna",
    badge: "/ipswich-logo.jpg",
    banner: "/football-fans-celebration.jpg",
    rating: 76,
    honours: "ทีมน้องใหม่ที่เล่นกล้าหาญ",
    squadSize: "24 คน",
    recentForm: "L W D W L",
  },
  {
    id: "13",
    nameTh: "ลีดส์ ยูไนเต็ด",
    nameEn: "Leeds United",
    city: "ลีดส์",
    founded: "1919",
    stadium: "Elland Road",
    manager: "Daniel Farke",
    badge: "/placeholder-logo.png",
    banner: fallbackBanner,
    rating: 77,
    honours: "อดีตแชมป์ลีกที่กลับมาพร้อมแรงเชียร์สูง",
    squadSize: "25 คน",
    recentForm: "W W D L W",
  },
  {
    id: "14",
    nameTh: "ลิเวอร์พูล",
    nameEn: "Liverpool",
    city: "ลิเวอร์พูล",
    founded: "1892",
    stadium: "Anfield",
    manager: "Arne Slot",
    badge: "/liverpool-logo.png",
    banner: "/liverpool-football-match.jpg",
    rating: 93,
    honours: "แชมป์ลีกสูงสุด 19 สมัย",
    squadSize: "26 คน",
    recentForm: "W W W D W",
  },
  {
    id: "15",
    nameTh: "แมนเชสเตอร์ ซิตี้",
    nameEn: "Manchester City",
    city: "แมนเชสเตอร์",
    founded: "1880",
    stadium: "Etihad Stadium",
    manager: "Pep Guardiola",
    badge: "/manchester-city-logo.png",
    banner: "/manchester-city-vs-liverpool-football-celebration.jpg",
    rating: 94,
    honours: "แชมป์ลีกสูงสุด 10 สมัย",
    squadSize: "25 คน",
    recentForm: "W W L W W",
  },
  {
    id: "16",
    nameTh: "แมนเชสเตอร์ ยูไนเต็ด",
    nameEn: "Manchester United",
    city: "แมนเชสเตอร์",
    founded: "1878",
    stadium: "Old Trafford",
    manager: "Erik ten Hag",
    badge: "/manchester-united-crest.png",
    banner: "/manchester-united-football.jpg",
    rating: 87,
    honours: "แชมป์ลีกสูงสุด 20 สมัย",
    squadSize: "26 คน",
    recentForm: "D W L W D",
  },
  {
    id: "17",
    nameTh: "นิวคาสเซิล ยูไนเต็ด",
    nameEn: "Newcastle United",
    city: "นิวคาสเซิล",
    founded: "1892",
    stadium: "St. James' Park",
    manager: "Eddie Howe",
    badge: "/newcastle-united-logo.png",
    banner: "/football-fans-cheering-stadium-atmosphere.jpg",
    rating: 86,
    honours: "ทีมพลังเกมรุกและแฟนบอลดุดัน",
    squadSize: "25 คน",
    recentForm: "W D W W L",
  },
  {
    id: "18",
    nameTh: "น็อตติงแฮม ฟอเรสต์",
    nameEn: "Nottingham Forest",
    city: "น็อตติงแฮม",
    founded: "1865",
    stadium: "The City Ground",
    manager: "Nuno Espirito Santo",
    badge: "/nottingham-forest-logo.jpg",
    banner: "/football-stadium-night-lights-premier-league.jpg",
    rating: 79,
    honours: "สโมสรประวัติศาสตร์ที่เน้นความดุดัน",
    squadSize: "25 คน",
    recentForm: "D W D W L",
  },
  {
    id: "19",
    nameTh: "ซันเดอร์แลนด์",
    nameEn: "Sunderland",
    city: "ซันเดอร์แลนด์",
    founded: "1879",
    stadium: "Stadium of Light",
    manager: "TBD",
    badge: "/placeholder-logo.png",
    banner: fallbackBanner,
    rating: 74,
    honours: "ทีมเลื่อนชั้นที่มีฐานแฟนเหนียวแน่น",
    squadSize: "24 คน",
    recentForm: "W D L D W",
  },
  {
    id: "20",
    nameTh: "ท็อตแนม ฮ็อตสเปอร์",
    nameEn: "Tottenham Hotspur",
    city: "ลอนดอน",
    founded: "1882",
    stadium: "Tottenham Hotspur Stadium",
    manager: "TBD",
    badge: "/tottenham-logo.png",
    banner: "/tottenham-football.jpg",
    rating: 85,
    honours: "ทีมเกมรุกจัดจ้านของลอนดอน",
    squadSize: "25 คน",
    recentForm: "W L W W D",
  },
] as const

function makeProfile(seed: (typeof teamSeed)[number]): TeamProfile {
  const promotedIds = new Set(["7", "11", "12", "19"])
  const titleTier =
    seed.rating >= 90 ? "ลุ้นแชมป์เต็มตัว" : seed.rating >= 84 ? "ลุ้นพื้นที่ยุโรป" : seed.rating >= 78 ? "ยึดครึ่งบนของตาราง" : "เน้นอยู่รอดและสะสมแต้ม"

  const style =
    seed.rating >= 90
      ? "ครองบอลบุกกดดันสูง และคุมจังหวะเกมได้ต่อเนื่อง"
      : seed.rating >= 84
        ? "เล่นเป็นระบบ เน้นเกมรุกมีวินัย และเปลี่ยนจังหวะจากกลางสนามได้ดี"
        : promotedIds.has(seed.id)
          ? "เล่นด้วยพลังงานสูง เน้นความกล้าและความเข้มข้นทุกจังหวะ"
          : "เน้นเกมเป็นระบบ รัดกุม และใช้จังหวะสวนกลับให้เกิดประโยชน์"

  const objective = promotedIds.has(seed.id)
    ? `เป้าหมายหลักคือยืนระยะในพรีเมียร์ลีก ${PREMIER_LEAGUE_EDITORIAL_SEASON.labelLong} ให้มั่นคง`
    : `${seed.nameTh} ต้องการ${titleTier}ในพรีเมียร์ลีก ${PREMIER_LEAGUE_EDITORIAL_SEASON.labelLong}`

  const summary = `${seed.nameTh} เข้าสู่ฤดูกาล ${PREMIER_LEAGUE_EDITORIAL_SEASON.labelLong} ด้วยภาพทีมที่ชัดเจนขึ้นทั้งด้านแท็กติกและโครงสร้างขุมกำลัง จุดเด่นคือ${style} เป้าหมายของทีมคือ${objective.replace(`${seed.nameTh} ต้องการ`, "").replace("เป้าหมายหลักคือ", "")} และรักษามาตรฐานให้ต่อเนื่องตลอดซีซัน`

  const focus = [
    promotedIds.has(seed.id) ? "บริหารจังหวะเกมให้แน่นขึ้นเมื่อเจอทีมระดับท็อป" : "ยกระดับความสม่ำเสมอในเกมที่ต้องเก็บสามแต้ม",
    seed.rating >= 84 ? "ใช้คุณภาพนักเตะตัวหลักให้สร้างความต่างในเกมใหญ่" : "เพิ่มความเด็ดขาดในพื้นที่สุดท้าย",
    "รักษาสมดุลระหว่างเกมรุกและเกมรับตลอด 90 นาที",
  ]

  const keyPlayers = [
    {
      name: `${seed.nameEn} Captain`,
      role: "ผู้นำทีม",
      note: "เป็นศูนย์กลางด้านจังหวะและความนิ่งของทีมในเกมสำคัญ",
      rating: Math.max(seed.rating - 2, 76),
    },
    {
      name: `${seed.nameEn} Playmaker`,
      role: "ตัวสร้างสรรค์เกม",
      note: "รับหน้าที่เชื่อมเกมจากกลางสนามขึ้นไปสู่พื้นที่สุดท้าย",
      rating: Math.max(seed.rating - 4, 74),
    },
    {
      name: `${seed.nameEn} Finisher`,
      role: "ตัวจบสกอร์",
      note: "เป็นความหวังสำคัญในจังหวะเปลี่ยนโอกาสให้เป็นประตู",
      rating: Math.max(seed.rating - 3, 75),
    },
  ]

  const stats = [
    { label: "ระดับความพร้อม", value: seed.rating >= 88 ? "สูงมาก" : seed.rating >= 82 ? "พร้อมแข่งขัน" : "ต้องพัฒนาเพิ่ม" },
    { label: "เป้าหมายฤดูกาล", value: promotedIds.has(seed.id) ? "อยู่รอดในลีก" : titleTier },
    { label: "โฟกัสหลัก", value: promotedIds.has(seed.id) ? "เกมรับและวินัย" : "ความสม่ำเสมอ" },
    { label: "แรงหนุนแฟนบอล", value: "แข็งแรง" },
  ]

  return {
    ...seed,
    style,
    objective,
    summary,
    focus,
    keyPlayers,
    stats,
  }
}

const teams: Record<string, TeamProfile> = Object.fromEntries(teamSeed.map((seed) => [seed.id, makeProfile(seed)]))

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const team = teams[id]

  if (!team) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pb-16">
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0">
            <Image src={team.banner} alt={team.nameEn} fill className="object-cover" />
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
                  <Image src={team.badge} alt={team.nameEn} width={92} height={92} className="h-20 w-20 object-contain" />
                </div>

                <div className="max-w-3xl">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge className="border-0 bg-primary text-primary-foreground">Club Profile</Badge>
                    <Badge variant="secondary" className="border border-border/70 bg-card/80 text-foreground/80 dark:border-white/10 dark:bg-white/10 dark:text-white/80">
                      Season {PREMIER_LEAGUE_EDITORIAL_SEASON.labelLong}
                    </Badge>
                  </div>
                  <h1 className="text-4xl font-display tracking-tight text-foreground md:text-6xl dark:text-white">{team.nameEn}</h1>
                  <p className="mt-2 text-sm uppercase tracking-[0.24em] text-muted-foreground dark:text-white/65">{team.nameTh}</p>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-foreground/82 md:text-base dark:text-white/78">{team.summary}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Card className="border-border/70 bg-card/80 text-foreground backdrop-blur dark:border-white/10 dark:bg-white/8 dark:text-white">
                  <CardContent className="p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground dark:text-white/55">Manager</p>
                    <p className="mt-2 text-xl font-semibold">{team.manager}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/70 bg-card/80 text-foreground backdrop-blur dark:border-white/10 dark:bg-white/8 dark:text-white">
                  <CardContent className="p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground dark:text-white/55">Objective</p>
                    <p className="mt-2 text-xl font-semibold">{team.objective}</p>
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
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">City</p>
                    <p className="mt-1 font-semibold">{team.city}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Honours</p>
                    <p className="mt-1 font-semibold">{team.honours}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Squad</p>
                    <p className="mt-1 font-semibold">{team.squadSize}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Club Rating</p>
                    <p className="mt-1 font-semibold">{team.rating}/100</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container mx-auto px-4 pt-8">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 md:w-[520px]">
              <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
              <TabsTrigger value="players">คีย์แมน</TabsTrigger>
              <TabsTrigger value="stats">สถิติ</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle>ภาพรวมทีม</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <p className="leading-7 text-muted-foreground">{team.summary}</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">สนามเหย้า</p>
                        <p className="mt-2 font-semibold text-foreground">{team.stadium}</p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">ก่อตั้ง</p>
                        <p className="mt-2 font-semibold text-foreground">{team.founded}</p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 sm:col-span-2">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">สไตล์การเล่น</p>
                        <p className="mt-2 font-semibold text-foreground">{team.style}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle>3 ประเด็นที่น่าจับตา</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {team.focus.map((item) => (
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
              <div className="grid gap-4 lg:grid-cols-3">
                {team.keyPlayers.map((player) => (
                  <Card key={player.name} className="border-border/50">
                    <CardContent className="p-6">
                      <div className="mb-5 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{player.role}</p>
                          <h3 className="mt-2 text-2xl font-display text-foreground">{player.name}</h3>
                        </div>
                        <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                          {player.rating}
                        </div>
                      </div>
                      <p className="text-sm leading-7 text-muted-foreground">{player.note}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="stats" className="mt-6 space-y-6">
              <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle>ฟอร์มและเป้าหมาย</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Recent Form</p>
                      <p className="mt-2 text-2xl font-display text-primary">{team.recentForm}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Season Objective</p>
                      <p className="mt-2 font-semibold text-foreground">{team.objective}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle>Snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    {team.stats.map((item) => (
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
                  <CardTitle>บทสรุปเชิงฟุตบอล</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-3xl border border-primary/12 bg-primary/[0.05] p-6">
                    <div className="mb-3 flex items-center gap-2">
                      <Goal className="h-5 w-5 text-primary" />
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Team Lens</p>
                    </div>
                    <p className="leading-8 text-muted-foreground">
                      {team.nameTh} ในซีซัน {PREMIER_LEAGUE_EDITORIAL_SEASON.labelLong} เป็นทีมที่มีภาพชัดในเรื่อง{" "}
                      <span className="font-semibold text-foreground">{team.style}</span> และหากทำตามเป้าหมายเรื่อง{" "}
                      <span className="font-semibold text-foreground">{team.objective}</span> ได้ต่อเนื่อง
                      ทีมนี้มีโอกาสทำผลงานได้ตามความคาดหวังหรืออาจเกินเป้าของหลายคนในฤดูกาลนี้
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
