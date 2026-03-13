import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Star, MapPin, Calendar, Trophy, Users } from "lucide-react"

export default function TeamDetailPage() {
  const players = [
    { name: "เควิน เดอ บรอยน์", position: "กองกลาง", number: 17, rating: 91 },
    { name: "เออร์ลิง ฮาลันด์", position: "กองหน้า", number: 9, rating: 92 },
    { name: "ฟิล โฟเด้น", position: "กองกลาง", number: 47, rating: 87 },
    { name: "เรอูเบน ดิอาส", position: "กองหลัง", number: 3, rating: 88 },
  ]

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto space-y-8">
          <Card className="border-border/50">
            <CardHeader className="space-y-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-32 h-32 bg-muted rounded-full" />
                <div className="space-y-3 text-center md:text-left flex-1">
                  <h1 className="text-4xl font-display">แมนเชสเตอร์ ซิตี้</h1>
                  <div className="flex flex-wrap gap-4 justify-center md:justify-start text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>แมนเชสเตอร์, อังกฤษ</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>ก่อตั้ง 1880</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 fill-primary text-primary" />
                      <span className="font-bold">90/100</span>
                    </div>
                  </div>
                </div>
                <Button className="gap-2">
                  <Star className="w-4 h-4" />
                  ติดตามทีม
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
              <TabsTrigger value="squad">รายชื่อนักเตะ</TabsTrigger>
              <TabsTrigger value="stats">สถิติ</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-border/50">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Trophy className="w-8 h-8 text-primary" />
                      <div>
                        <CardTitle>แชมป์เปี้ยน</CardTitle>
                        <p className="text-2xl font-bold mt-1">7 สมัย</p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <Card className="border-border/50">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Users className="w-8 h-8 text-primary" />
                      <div>
                        <CardTitle>ผู้เล่น</CardTitle>
                        <p className="text-2xl font-bold mt-1">25 คน</p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <Card className="border-border/50">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Star className="w-8 h-8 text-primary" />
                      <div>
                        <CardTitle>ฟอร์มล่าสุด</CardTitle>
                        <p className="text-2xl font-bold mt-1">W W D W W</p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </div>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>เกี่ยวกับทีม</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    แมนเชสเตอร์ ซิตี้ เป็นหนึ่งในสโมสรฟุตบอลที่ประสบความสำเร็จสูงสุดในอังกฤษ
                    มีความโดดเด่นด้วยรูปแบบการเล่นที่สวยงามและคว้าแชมป์พรีเมียร์ลีกมาแล้วหลายสมัย ภายใต้การคุมทีมของเป๊ป กวาร์ดิโอลา
                    ทีมได้รับการยกย่องว่าเป็นหนึ่งในทีมที่ดีที่สุดในยุโรป
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="squad" className="space-y-4">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>นักเตะประจำทีม</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {players.map((player, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-muted rounded-full" />
                          <div>
                            <p className="font-semibold">{player.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {player.position} • #{player.number}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-primary">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="font-bold">{player.rating}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>สถิติฤดูกาลนี้</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">แข่งไปแล้ว</span>
                      <span className="font-bold">28 นัด</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">ชนะ</span>
                      <span className="font-bold">20 นัด</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">เสมอ</span>
                      <span className="font-bold">5 นัด</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">แพ้</span>
                      <span className="font-bold">3 นัด</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-border/50">
                      <span className="text-muted-foreground">ประตูที่ยิงได้</span>
                      <span className="font-bold text-primary">65 ประตู</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">ประตูที่เสีย</span>
                      <span className="font-bold">22 ประตู</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
