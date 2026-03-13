import { Navigation } from "@/components/navigation"
import { Card, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Calendar, Users, MapPin } from "lucide-react"
import Link from "next/link"

export default function LeaguesPage() {
  const league = {
    name: "พรีเมียร์ลีก",
    country: "อังกฤษ",
    teams: 20,
    founded: 1992,
    currentChampion: "แมนเชสเตอร์ ซิตี้",
    topScorer: "เออร์ลิง ฮาแลนด์",
    description: "พรีเมียร์ลีกเป็นลีกฟุตบอลสูงสุดของอังกฤษ ก่อตั้งในปี 1992 และเป็นหนึ่งในลีกที่มีผู้ชมมากที่สุดในโลก",
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-5xl font-display">การแข่งขัน</h1>
            <p className="text-lg text-muted-foreground">ข้อมูลพรีเมียร์ลีกอังกฤษ</p>
          </div>

          <Card className="border-border/50 overflow-hidden">
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-32 h-32 bg-background rounded-full flex items-center justify-center shadow-lg">
                  <Trophy className="w-16 h-16 text-primary" />
                </div>
                <div className="text-center md:text-left">
                  <h2 className="text-4xl font-display mb-2">{league.name}</h2>
                  <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                    <MapPin className="w-4 h-4" />
                    {league.country}
                  </p>
                </div>
              </div>
            </div>

            <CardHeader className="space-y-6">
              <p className="text-muted-foreground leading-relaxed">{league.description}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{league.teams}</p>
                  <p className="text-xs text-muted-foreground">ทีมในลีก</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <Calendar className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{league.founded}</p>
                  <p className="text-xs text-muted-foreground">ปีก่อตั้ง</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center col-span-2 md:col-span-1">
                  <Trophy className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                  <p className="text-sm font-bold">{league.currentChampion}</p>
                  <p className="text-xs text-muted-foreground">แชมป์ปัจจุบัน</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center col-span-2 md:col-span-1">
                  <span className="text-2xl mb-2 block">⚽</span>
                  <p className="text-sm font-bold">{league.topScorer}</p>
                  <p className="text-xs text-muted-foreground">ดาวซัลโว</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-4">
                <Button asChild className="flex-1 min-w-[140px]">
                  <Link href="/standings">ตารางคะแนน</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1 min-w-[140px] bg-transparent">
                  <Link href="/matches">โปรแกรมแข่งขัน</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1 min-w-[140px] bg-transparent">
                  <Link href="/teams">ทีมทั้งหมด</Link>
                </Button>
              </div>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  )
}
