import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeftRight, Trophy, Target, Users } from "lucide-react"

export default function ComparePage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-5xl font-display">เปรียบเทียบ</h1>
            <p className="text-lg text-muted-foreground">เปรียบเทียบสถิติระหว่างทีมหรือนักเตะ</p>
          </div>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>เลือกทีมหรือนักเตะเพื่อเปรียบเทียบ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-sm font-medium">ทีม/นักเตะ 1</label>
                  <Select defaultValue="mancity">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mancity">แมนเชสเตอร์ ซิตี้</SelectItem>
                      <SelectItem value="arsenal">อาร์เซนอล</SelectItem>
                      <SelectItem value="liverpool">ลิเวอร์พูล</SelectItem>
                      <SelectItem value="realmadrid">เรอัล มาดริด</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-center">
                  <Button variant="outline" size="icon" className="rounded-full bg-transparent">
                    <ArrowLeftRight className="w-5 h-5" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">ทีม/นักเตะ 2</label>
                  <Select defaultValue="arsenal">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mancity">แมนเชสเตอร์ ซิตี้</SelectItem>
                      <SelectItem value="arsenal">อาร์เซนอล</SelectItem>
                      <SelectItem value="liverpool">ลิเวอร์พูล</SelectItem>
                      <SelectItem value="realmadrid">เรอัล มาดริด</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="text-center space-y-4">
                <div className="w-24 h-24 bg-muted rounded-full mx-auto" />
                <div>
                  <CardTitle className="text-2xl font-display">แมนเชสเตอร์ ซิตี้</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">พรีเมียร์ลีก</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">ประตูยิงได้</span>
                    <span className="font-bold text-lg">78</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">ประตูเสีย</span>
                    <span className="font-bold text-lg">28</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">ชนะ</span>
                    <span className="font-bold text-lg">22</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">เสมอ</span>
                    <span className="font-bold text-lg">4</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">แพ้</span>
                    <span className="font-bold text-lg">2</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-border/50">
                    <span className="text-sm text-muted-foreground">คะแนน</span>
                    <span className="font-bold text-2xl text-primary">70</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="text-center space-y-4">
                <div className="w-24 h-24 bg-muted rounded-full mx-auto" />
                <div>
                  <CardTitle className="text-2xl font-display">อาร์เซนอล</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">พรีเมียร์ลีก</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">ประตูยิงได้</span>
                    <span className="font-bold text-lg">72</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">ประตูเสีย</span>
                    <span className="font-bold text-lg">32</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">ชนะ</span>
                    <span className="font-bold text-lg">20</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">เสมอ</span>
                    <span className="font-bold text-lg">6</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">แพ้</span>
                    <span className="font-bold text-lg">2</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-border/50">
                    <span className="text-sm text-muted-foreground">คะแนน</span>
                    <span className="font-bold text-2xl text-primary">66</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>สถิติเปรียบเทียบ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">ประตูเฉลี่ย/นัด</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold min-w-[3rem] text-right">2.79</span>
                  <div className="flex-1 flex gap-1">
                    <div className="h-8 bg-primary rounded-l" style={{ width: "60%" }} />
                    <div className="h-8 bg-primary/30 rounded-r" style={{ width: "40%" }} />
                  </div>
                  <span className="text-sm font-bold min-w-[3rem]">2.57</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">ครองบอล %</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold min-w-[3rem] text-right">65%</span>
                  <div className="flex-1 flex gap-1">
                    <div className="h-8 bg-primary rounded-l" style={{ width: "65%" }} />
                    <div className="h-8 bg-primary/30 rounded-r" style={{ width: "35%" }} />
                  </div>
                  <span className="text-sm font-bold min-w-[3rem]">58%</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">ความแม่นยำการส่งบอล %</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold min-w-[3rem] text-right">88%</span>
                  <div className="flex-1 flex gap-1">
                    <div className="h-8 bg-primary rounded-l" style={{ width: "52%" }} />
                    <div className="h-8 bg-primary/30 rounded-r" style={{ width: "48%" }} />
                  </div>
                  <span className="text-sm font-bold min-w-[3rem]">86%</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">การยิงโดนกรอบ</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold min-w-[3rem] text-right">210</span>
                  <div className="flex-1 flex gap-1">
                    <div className="h-8 bg-primary rounded-l" style={{ width: "55%" }} />
                    <div className="h-8 bg-primary/30 rounded-r" style={{ width: "45%" }} />
                  </div>
                  <span className="text-sm font-bold min-w-[3rem]">195</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  ฟอร์มล่าสุด
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">แมนเชสเตอร์ ซิตี้</p>
                    <div className="flex gap-1">
                      <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white text-xs font-bold">
                        W
                      </div>
                      <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white text-xs font-bold">
                        W
                      </div>
                      <div className="w-8 h-8 bg-gray-500 rounded flex items-center justify-center text-white text-xs font-bold">
                        D
                      </div>
                      <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white text-xs font-bold">
                        W
                      </div>
                      <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white text-xs font-bold">
                        W
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">อาร์เซนอล</p>
                    <div className="flex gap-1">
                      <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white text-xs font-bold">
                        W
                      </div>
                      <div className="w-8 h-8 bg-gray-500 rounded flex items-center justify-center text-white text-xs font-bold">
                        D
                      </div>
                      <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white text-xs font-bold">
                        W
                      </div>
                      <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white text-xs font-bold">
                        W
                      </div>
                      <div className="w-8 h-8 bg-gray-500 rounded flex items-center justify-center text-white text-xs font-bold">
                        D
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  ดาวซัลโวของทีม
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">ฮาลันด์</span>
                    <span className="font-bold">28</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">ซากา</span>
                    <span className="font-bold">18</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  มูลค่าทีม
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">แมนเชสเตอร์ ซิตี้</span>
                    <span className="font-bold">€1.2B</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">อาร์เซนอล</span>
                    <span className="font-bold">€980M</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
