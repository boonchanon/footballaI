import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { SearchInput } from "@/components/search-input"
import { Star, Users } from "lucide-react"
import Link from "next/link"

export default function TeamsPage() {
  const teams = [
    { name: "แมนเชสเตอร์ ซิตี้", rating: 90 },
    { name: "ลิเวอร์พูล", rating: 89 },
    { name: "อาร์เซนอล", rating: 88 },
    { name: "แมนเชสเตอร์ ยูไนเต็ด", rating: 85 },
    { name: "เชลซี", rating: 84 },
    { name: "ท็อตแนม ฮ็อทสเปอร์", rating: 83 },
    { name: "นิวคาสเซิล ยูไนเต็ด", rating: 82 },
    { name: "แอสตัน วิลล่า", rating: 81 },
    { name: "ไบรท์ตัน", rating: 80 },
    { name: "เวสต์แฮม ยูไนเต็ด", rating: 79 },
    { name: "คริสตัล พาเลซ", rating: 78 },
    { name: "เบรนท์ฟอร์ด", rating: 77 },
    { name: "ฟูแล่ม", rating: 77 },
    { name: "วูล์ฟแฮมป์ตัน", rating: 76 },
    { name: "บอร์นมัธ", rating: 75 },
    { name: "น็อตติงแฮม ฟอเรสต์", rating: 75 },
    { name: "เอฟเวอร์ตัน", rating: 74 },
    { name: "เลสเตอร์ ซิตี้", rating: 74 },
    { name: "อิปสวิช ทาวน์", rating: 72 },
    { name: "เซาท์แธมป์ตัน", rating: 71 },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      {/* Header */}
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-display">ทีมทั้งหมด</h1>
          </div>
          <p className="text-muted-foreground mb-4">20 ทีมในพรีเมียร์ลีก อังกฤษ</p>
          <SearchInput placeholder="ค้นหาทีม..." className="max-w-md" />
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {teams.map((team, i) => (
            <Link key={i} href={`/teams/${i + 1}`}>
              <Card className="border-border/50 hover:border-primary/50 transition-all hover:shadow-md h-full">
                <CardContent className="p-4 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-3 flex items-center justify-center">
                    <Users className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1 line-clamp-1">{team.name}</h3>
                  <p className="text-xs text-muted-foreground mb-2">พรีเมียร์ลีก</p>
                  <div className="flex items-center justify-center gap-1">
                    <Star className="w-4 h-4 text-primary fill-current" />
                    <span className="font-bold text-primary">{team.rating}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
