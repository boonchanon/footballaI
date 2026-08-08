"use client"

import Image from "next/image"
import Link from "next/link"
import useSWR from "swr"
import { ArrowUpRight, MapPin, Sparkles } from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { PREMIER_LEAGUE_EDITORIAL_SEASON } from "@/lib/season"

type ClubCard = {
  id: string
  name: string
  stadium: string
  logo: string
}

type FootballTeamsResponse = {
  data?: Array<{
    team?: {
      id?: string
      name?: string
      nameEn?: string
      logo?: string
    }
    venue?: {
      name?: string
    }
  }>
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ClubsPage() {
  const { data, isLoading } = useSWR<FootballTeamsResponse>("/api/football/teams", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  const clubs: ClubCard[] = (data?.data || [])
    .map((item) => ({
      id: String(item.team?.id || ""),
      name: String(item.team?.nameEn || item.team?.name || ""),
      stadium: String(item.venue?.name || ""),
      logo: String(item.team?.logo || "/placeholder-logo.png"),
    }))
    .filter((club) => club.id && club.name)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navigation />

      <header className="border-b border-border bg-[radial-gradient(circle_at_top,rgba(234,179,8,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              สโมสรพรีเมียร์ลีก
            </div>
            <h1 className="text-4xl font-display tracking-tight text-foreground md:text-6xl">รายชื่อสโมสร</h1>
            <p className="mt-3 text-sm font-medium uppercase tracking-[0.26em] text-muted-foreground md:text-base">ฤดูกาล {PREMIER_LEAGUE_EDITORIAL_SEASON.labelLong}</p>
            <p className="mx-auto mt-5 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
              แสดงรายชื่อทีมและสนามจากข้อมูล API โดยตรง และเชื่อมไปยังหน้ารายละเอียดทีมด้วยรหัสทีมจริง
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 px-4 py-10 md:py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : clubs.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => (
              <Link key={club.id} href={`/teams/${club.id}`} className="group block">
                <article className="rounded-2xl border border-border/50 bg-card px-5 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-background">
                      <Image src={club.logo} alt={club.name} width={56} height={56} className="h-14 w-14 object-contain" unoptimized={club.logo.startsWith("http")} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                          <h2 className="truncate text-lg font-bold text-foreground transition-colors group-hover:text-primary">{club.name}</h2>
                      </div>
                        <ArrowUpRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                      </div>

                      <div className="mt-2 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm text-muted-foreground">{club.stadium || "ไม่มีข้อมูลสนาม"}</span>
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card p-8 text-center text-muted-foreground">ไม่พบข้อมูลสโมสรจาก API</div>
        )}
      </main>

      <Footer />
    </div>
  )
}
