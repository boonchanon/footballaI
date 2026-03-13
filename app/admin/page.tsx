import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, Newspaper, TrendingUp, Eye, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react"
import Link from "next/link"

const stats = [
  {
    title: "ผู้ใช้ทั้งหมด",
    value: "12,543",
    change: "+12.5%",
    trend: "up",
    icon: Users,
    description: "เทียบกับเดือนที่แล้ว",
  },
  {
    title: "แมตช์ที่กำลังแข่ง",
    value: "48",
    change: "+8.2%",
    trend: "up",
    icon: Calendar,
    description: "สัปดาห์นี้",
  },
  {
    title: "ข่าวที่เผยแพร่",
    value: "256",
    change: "+23.1%",
    trend: "up",
    icon: Newspaper,
    description: "เดือนนี้",
  },
  {
    title: "ยอดเข้าชม",
    value: "1.2M",
    change: "-2.4%",
    trend: "down",
    icon: Eye,
    description: "เทียบกับสัปดาห์ที่แล้ว",
  },
]

const recentActivities = [
  { action: "ผู้ใช้ใหม่ลงทะเบียน", user: "john@example.com", time: "2 นาทีที่แล้ว" },
  { action: "อัปเดตผลการแข่งขัน", user: "admin", time: "15 นาทีที่แล้ว" },
  { action: "เผยแพร่บทความข่าว", user: "editor", time: "1 ชั่วโมงที่แล้ว" },
  { action: "เปลี่ยนบทบาทผู้ใช้", user: "admin", time: "2 ชั่วโมงที่แล้ว" },
  { action: "สำรองข้อมูลระบบเสร็จสิ้น", user: "system", time: "3 ชั่วโมงที่แล้ว" },
]

const topPages = [
  { page: "/matches", views: "45,234", percentage: 32 },
  { page: "/standings", views: "32,456", percentage: 23 },
  { page: "/players", views: "28,123", percentage: 20 },
  { page: "/news", views: "18,567", percentage: 13 },
  { page: "/ai-prediction", views: "16,890", percentage: 12 },
]

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">แดชบอร์ด</h1>
        <p className="text-muted-foreground">ยินดีต้อนรับกลับ ผู้ดูแลระบบ นี่คือสิ่งที่เกิดขึ้นวันนี้</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div className={`flex items-center gap-1 text-sm ${
                  stat.trend === "up" ? "text-green-500" : "text-red-500"
                }`}>
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {stat.change}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              กิจกรรมล่าสุด
            </CardTitle>
            <CardDescription>การดำเนินการล่าสุดบนแพลตฟอร์ม</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <div>
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">โดย {activity.user}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              หน้ายอดนิยม
            </CardTitle>
            <CardDescription>หน้าที่มีผู้เข้าชมมากที่สุดในสัปดาห์นี้</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPages.map((page, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{page.page}</span>
                    <span className="text-muted-foreground">{page.views}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${page.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>การดำเนินการด่วน</CardTitle>
          <CardDescription>งานบริหารทั่วไป</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/admin/users/add" className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-left">
              <Users className="h-6 w-6 text-primary mb-2" />
              <p className="font-medium">เพิ่มผู้ใช้</p>
              <p className="text-sm text-muted-foreground">สร้างบัญชีใหม่</p>
            </Link>
            <Link href="/admin/matches/add" className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-left">
              <Calendar className="h-6 w-6 text-primary mb-2" />
              <p className="font-medium">เพิ่มแมตช์</p>
              <p className="text-sm text-muted-foreground">กำหนดการแข่งขันใหม่</p>
            </Link>
            <Link href="/admin/news" className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-left">
              <Newspaper className="h-6 w-6 text-primary mb-2" />
              <p className="font-medium">เขียนข่าว</p>
              <p className="text-sm text-muted-foreground">เผยแพร่บทความ</p>
            </Link>
            <Link href="/admin/analytics" className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-left">
              <TrendingUp className="h-6 w-6 text-primary mb-2" />
              <p className="font-medium">ดูรายงาน</p>
              <p className="text-sm text-muted-foreground">ข้อมูลวิเคราะห์</p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
