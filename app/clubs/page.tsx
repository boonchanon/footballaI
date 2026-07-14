"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, MapPin, Sparkles } from "lucide-react"
import { PREMIER_LEAGUE_EDITORIAL_SEASON } from "@/lib/season"

type ClubCard = {
  id: number
  nameTh: string
  nameEn: string
  stadium: string
  logo: string
  status?: "promoted"
}

const premierLeagueClubs: ClubCard[] = [
  { id: 1, nameTh: "อาร์เซนอล", nameEn: "Arsenal", stadium: "Emirates Stadium", logo: "/arsenal-logo.png" },
  { id: 2, nameTh: "แอสตัน วิลลา", nameEn: "Aston Villa", stadium: "Villa Park", logo: "/aston-villa-logo.png" },
  { id: 3, nameTh: "บอร์นมัธ", nameEn: "AFC Bournemouth", stadium: "Vitality Stadium", logo: "/bournemouth-logo.jpg" },
  { id: 4, nameTh: "เบรนท์ฟอร์ด", nameEn: "Brentford", stadium: "Gtech Community Stadium", logo: "/brentford-logo.jpg" },
  { id: 5, nameTh: "ไบรท์ตัน", nameEn: "Brighton & Hove Albion", stadium: "Amex Stadium", logo: "/brighton-logo.png" },
  { id: 6, nameTh: "เชลซี", nameEn: "Chelsea", stadium: "Stamford Bridge", logo: "/chelsea-football-club-crest.png" },
  { id: 7, nameTh: "โคเวนทรี ซิตี้", nameEn: "Coventry City", stadium: "Coventry Building Society Arena", logo: "/placeholder-logo.png", status: "promoted" },
  { id: 8, nameTh: "คริสตัล พาเลซ", nameEn: "Crystal Palace", stadium: "Selhurst Park", logo: "/crystal-palace-logo.png" },
  { id: 9, nameTh: "เอฟเวอร์ตัน", nameEn: "Everton", stadium: "Hill Dickinson Stadium", logo: "/everton-fc-badge.png" },
  { id: 10, nameTh: "ฟูแลม", nameEn: "Fulham", stadium: "Craven Cottage", logo: "/fulham-logo.jpg" },
  { id: 11, nameTh: "ฮัลล์ ซิตี้", nameEn: "Hull City", stadium: "MKM Stadium", logo: "/placeholder-logo.png", status: "promoted" },
  { id: 12, nameTh: "อิปสวิช ทาวน์", nameEn: "Ipswich Town", stadium: "Portman Road", logo: "/ipswich-logo.jpg", status: "promoted" },
  { id: 13, nameTh: "ลีดส์ ยูไนเต็ด", nameEn: "Leeds United", stadium: "Elland Road", logo: "/placeholder-logo.png" },
  { id: 14, nameTh: "ลิเวอร์พูล", nameEn: "Liverpool", stadium: "Anfield", logo: "/liverpool-logo.png" },
  { id: 15, nameTh: "แมนเชสเตอร์ ซิตี้", nameEn: "Manchester City", stadium: "Etihad Stadium", logo: "/manchester-city-logo.png" },
  { id: 16, nameTh: "แมนเชสเตอร์ ยูไนเต็ด", nameEn: "Manchester United", stadium: "Old Trafford", logo: "/manchester-united-crest.png" },
  { id: 17, nameTh: "นิวคาสเซิล ยูไนเต็ด", nameEn: "Newcastle United", stadium: "St. James' Park", logo: "/newcastle-united-logo.png" },
  { id: 18, nameTh: "น็อตติงแฮม ฟอเรสต์", nameEn: "Nottingham Forest", stadium: "The City Ground", logo: "/nottingham-forest-logo.jpg" },
  { id: 19, nameTh: "ซันเดอร์แลนด์", nameEn: "Sunderland", stadium: "Stadium of Light", logo: "/placeholder-logo.png" },
  { id: 20, nameTh: "ท็อตแนม ฮ็อตสเปอร์", nameEn: "Tottenham Hotspur", stadium: "Tottenham Hotspur Stadium", logo: "/tottenham-logo.png" },
]

const promotedClubs = premierLeagueClubs.filter((club) => club.status === "promoted")

export default function ClubsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navigation />

      <header className="border-b border-border bg-[radial-gradient(circle_at_top,rgba(234,179,8,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Premier League Clubs
            </div>
            <h1 className="text-4xl font-display tracking-tight text-foreground md:text-6xl">สโมสรพรีเมียร์ลีก</h1>
            <p className="mt-3 text-sm font-medium uppercase tracking-[0.26em] text-muted-foreground md:text-base">
              Season {PREMIER_LEAGUE_EDITORIAL_SEASON.labelLong}
            </p>
            <p className="mx-auto mt-5 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
              อัปเดตรายชื่อทีมสำหรับฤดูกาล {PREMIER_LEAGUE_EDITORIAL_SEASON.labelLong} พร้อมไฮไลต์ทีมที่เลื่อนชั้นขึ้นมา
              และลิงก์เข้าสู่หน้าโปรไฟล์แต่ละสโมสรแบบแยกทีม
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {promotedClubs.map((club) => (
                <div
                  key={`promoted-${club.id}`}
                  className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300"
                >
                  Promoted: {club.nameEn}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 px-4 py-10 md:py-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {premierLeagueClubs.map((club) => (
            <Link key={club.id} href={`/teams/${club.id}`} className="group block">
              <article className="rounded-2xl border border-border/50 bg-card px-5 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-background">
                    <Image src={club.logo} alt={club.nameEn} width={56} height={56} className="h-14 w-14 object-contain" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs uppercase tracking-[0.18em] text-muted-foreground">{club.nameTh}</p>
                        <h2 className="truncate text-lg font-bold text-foreground transition-colors group-hover:text-primary">{club.nameEn}</h2>
                      </div>
                      <ArrowUpRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </div>

                    <div className="mt-2 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm text-muted-foreground">{club.stadium}</span>
                    </div>

                    {club.status === "promoted" ? (
                      <div className="mt-3 inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                        New Promotion
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
