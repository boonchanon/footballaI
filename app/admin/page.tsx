"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Activity, ArrowRight, Calendar, Eye, MessageSquare, Newspaper, Shield, TrendingUp, Users } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchJson } from "@/lib/api-client"
import { getAuthToken } from "@/lib/auth-client"

type DashboardData = {
  stats: {
    totalUsers: number
    totalAdmins: number
    totalPosts: number
    totalComments: number
    totalReports: number
    pendingReports: number
    hiddenPosts: number
    totalPredictions: number
    totalFavorites: number
  }
  recentActivity: Array<{
    id: string
    action: string
    actor: string
    target: string
    timeAgo: string
  }>
  topSections: Array<{
    label: string
    value: number
    description: string
  }>
}

const statCards = [
  { key: "totalUsers", title: "ผู้ใช้ทั้งหมด", icon: Users, color: "text-cyan-400" },
  { key: "totalPosts", title: "โพสต์คอมมูนิตี้", icon: Newspaper, color: "text-lime-400" },
  { key: "pendingReports", title: "รายงานรอตรวจ", icon: Shield, color: "text-amber-400" },
  { key: "totalPredictions", title: "การทำนาย AI", icon: TrendingUp, color: "text-fuchsia-400" },
] as const

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      setError("ไม่พบสิทธิ์แอดมิน กรุณาเข้าสู่ระบบใหม่")
      setLoading(false)
      return
    }

    fetchJson<DashboardData>("/admin/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(setData)
      .catch((fetchError) => setError(fetchError instanceof Error ? fetchError.message : "โหลดแดชบอร์ดไม่สำเร็จ"))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">แดชบอร์ด</h1>
        <p className="text-muted-foreground">ภาพรวมข้อมูลจริงจาก MongoDB สำหรับการดูแลระบบ</p>
      </div>

      {error ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => (
          <Card key={item.key}>
            <CardContent className="p-6">
              {loading || !data ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{item.title}</p>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <p className="text-3xl font-bold">{data.stats[item.key]}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              กิจกรรมล่าสุด
            </CardTitle>
            <CardDescription>รายการล่าสุดจากผู้ใช้ คอมมูนิตี้ และรายงาน</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)
            ) : data?.recentActivity.length ? (
              data.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
                  <div className="space-y-1">
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.actor} • {activity.target}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-muted-foreground">{activity.timeAgo}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">ยังไม่พบกิจกรรมในระบบ</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              หมวดที่มีข้อมูลมากสุด
            </CardTitle>
            <CardDescription>สรุปจาก collection ที่ใช้งานจริง</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)
            ) : (
              data?.topSections.map((section) => (
                <div key={section.label} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{section.label}</p>
                    <p className="text-xl font-bold">{section.value}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ทางลัด</CardTitle>
          <CardDescription>ไปยังหน้าที่ใช้บ่อยในระบบแอดมิน</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Button asChild variant="outline" className="justify-between">
            <Link href="/admin/users">
              จัดการผู้ใช้
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/admin/community">
              คุมคอมมูนิตี้
              <MessageSquare className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/admin/community/reports">
              ดูรายงาน
              <Shield className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/admin/matches">
              แมตช์และโปรแกรม
              <Calendar className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
