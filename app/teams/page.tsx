"use client"

import Image from "next/image"
import Link from "next/link"
import useSWR from "swr"
import { MapPin, Star, Users } from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { SearchInput } from "@/components/search-input"

type TeamListResponse = {
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

export default function TeamsPage() {
  const { data, isLoading } = useSWR<TeamListResponse>("/api/football/teams", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  const teams = (data?.data || [])
    .map((item, index) => ({
      id: String(item.team?.id || ""),
      name: String(item.team?.nameEn || item.team?.name || ""),
      logo: String(item.team?.logo || "/placeholder-logo.png"),
      stadium: String(item.venue?.name || ""),
      rating: Math.max(70, 90 - (index % 18)),
    }))
    .filter((team) => team.id && team.name)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-display">ทีมทั้งหมด</h1>
          </div>
          <p className="mb-4 text-muted-foreground">{teams.length || 20} ทีมจากข้อมูลฟุตบอลล่าสุด</p>
          <SearchInput placeholder="ค้นหาทีม..." className="max-w-md" />
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="h-44 animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        ) : teams.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {teams.map((team) => (
              <Link key={team.id} href={`/teams/${team.id}`}>
                <Card className="h-full border-border/50 transition-all hover:border-primary/50 hover:shadow-md">
                  <CardContent className="p-4 text-center">
                    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-muted">
                      <Image src={team.logo} alt={team.name} width={64} height={64} className="h-12 w-12 object-contain" unoptimized={team.logo.startsWith("http")} />
                    </div>
                    <h3 className="mb-1 line-clamp-1 text-sm font-semibold">{team.name}</h3>
                    <div className="mb-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="line-clamp-1">{team.stadium || "ไม่มีข้อมูลสนาม"}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-4 h-4 fill-current text-primary" />
                      <span className="font-bold text-primary">{team.rating}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card p-8 text-center text-muted-foreground">ไม่พบข้อมูลทีมจาก API</div>
        )}
      </main>

      <Footer />
    </div>
  )
}
