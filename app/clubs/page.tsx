"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import Image from "next/image"
import Link from "next/link"
import { MapPin } from "lucide-react"

const premierLeagueClubs = [
  {
    id: 1,
    name: "แมนเชสเตอร์ ซิตี้",
    nameEn: "Manchester City",
    stadium: "Etihad Stadium",
    logo: "/manchester-city-logo.png",
  },
  {
    id: 2,
    name: "ลิเวอร์พูล",
    nameEn: "Liverpool",
    stadium: "Anfield",
    logo: "/liverpool-logo.png",
  },
  {
    id: 3,
    name: "อาร์เซนอล",
    nameEn: "Arsenal",
    stadium: "Emirates Stadium",
    logo: "/arsenal-logo.png",
  },
  {
    id: 4,
    name: "เชลซี",
    nameEn: "Chelsea",
    stadium: "Stamford Bridge",
    logo: "/chelsea-football-club-crest.png",
  },
  {
    id: 5,
    name: "แมนเชสเตอร์ ยูไนเต็ด",
    nameEn: "Manchester United",
    stadium: "Old Trafford",
    logo: "/manchester-united-crest.png",
  },
  {
    id: 6,
    name: "ท็อตแนม ฮ็อทสเปอร์",
    nameEn: "Tottenham Hotspur",
    stadium: "Tottenham Hotspur Stadium",
    logo: "/tottenham-logo.png",
  },
  {
    id: 7,
    name: "นิวคาสเซิล ยูไนเต็ด",
    nameEn: "Newcastle United",
    stadium: "St. James' Park",
    logo: "/newcastle-united-logo.png",
  },
  {
    id: 8,
    name: "แอสตัน วิลล่า",
    nameEn: "Aston Villa",
    stadium: "Villa Park",
    logo: "/aston-villa-logo.png",
  },
  {
    id: 9,
    name: "ไบรท์ตัน",
    nameEn: "Brighton & Hove Albion",
    stadium: "Amex Stadium",
    logo: "/brighton-logo.png",
  },
  {
    id: 10,
    name: "เวสต์แฮม ยูไนเต็ด",
    nameEn: "West Ham United",
    stadium: "London Stadium",
    logo: "/west-ham-united-badge.png",
  },
  {
    id: 11,
    name: "คริสตัล พาเลซ",
    nameEn: "Crystal Palace",
    stadium: "Selhurst Park",
    logo: "/crystal-palace-logo.png",
  },
  {
    id: 12,
    name: "น็อตติงแฮม ฟอเรสต์",
    nameEn: "Nottingham Forest",
    stadium: "The City Ground",
    logo: "/nottingham-forest-logo.jpg",
  },
  {
    id: 13,
    name: "ฟูแล่ม",
    nameEn: "Fulham",
    stadium: "Craven Cottage",
    logo: "/fulham-logo.jpg",
  },
  {
    id: 14,
    name: "บอร์นมัธ",
    nameEn: "AFC Bournemouth",
    stadium: "Vitality Stadium",
    logo: "/bournemouth-logo.jpg",
  },
  {
    id: 15,
    name: "เบรนท์ฟอร์ด",
    nameEn: "Brentford",
    stadium: "Gtech Community Stadium",
    logo: "/brentford-logo.jpg",
  },
  {
    id: 16,
    name: "เอฟเวอร์ตัน",
    nameEn: "Everton",
    stadium: "Goodison Park",
    logo: "/everton-fc-badge.png",
  },
  {
    id: 17,
    name: "วูล์ฟแฮมป์ตัน",
    nameEn: "Wolverhampton Wanderers",
    stadium: "Molineux Stadium",
    logo: "/wolves-logo.jpg",
  },
  {
    id: 18,
    name: "เลสเตอร์ ซิตี้",
    nameEn: "Leicester City",
    stadium: "King Power Stadium",
    logo: "/leicester-logo.jpg",
  },
  {
    id: 19,
    name: "อิปสวิช ทาวน์",
    nameEn: "Ipswich Town",
    stadium: "Portman Road",
    logo: "/ipswich-logo.jpg",
  },
  {
    id: 20,
    name: "เซาท์แธมป์ตัน",
    nameEn: "Southampton",
    stadium: "St Mary's Stadium",
    logo: "/southampton-logo.png",
  },
]

export default function ClubsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      {/* Header */}
      <div className="pt-10 pb-6 text-center">
        <h1 className="text-4xl md:text-5xl font-display tracking-wider mb-2">
          CLUBS
        </h1>
        <p className="text-sm md:text-base text-muted-foreground font-medium tracking-widest uppercase">
          2025-2026 Season
        </p>
      </div>

      {/* Clubs Grid */}
      <main className="flex-1 container mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {premierLeagueClubs.map((club) => (
            <Link
              key={club.id}
              href={`/teams/${club.id}`}
              className="group block"
            >
              <div className="flex items-center gap-4 rounded-lg bg-card border border-border/40 px-5 py-4 transition-all duration-200 hover:border-primary/50 hover:bg-card/80">
                {/* Club Logo */}
                <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center">
                  <Image
                    src={club.logo}
                    alt={club.nameEn}
                    width={56}
                    height={56}
                    className="w-14 h-14 object-contain"
                  />
                </div>

                {/* Club Info */}
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                    {club.nameEn}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground truncate">
                      {club.stadium}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
