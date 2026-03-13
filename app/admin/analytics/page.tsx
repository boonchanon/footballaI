"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Eye, 
  Clock, 
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Download,
  Calendar
} from "lucide-react"
import Link from "next/link"

const overviewStats = [
  { title: "ผู้เข้าชมทั้งหมด", value: "1,234,567", change: "+12.5%", trend: "up" },
  { title: "ผู้ใช้ที่ใช้งานอยู่", value: "8,432", change: "+5.2%", trend: "up" },
  { title: "เวลาเฉลี่ยบนเว็บ", value: "4:32", change: "-2.1%", trend: "down" },
  { title: "อัตราตีกลับ", value: "32.5%", change: "-8.3%", trend: "up" },
]

const topPages = [
  { page: "/matches", title: "แมตช์", views: "145,234", unique: "98,432" },
  { page: "/standings", title: "ตารางคะแนน", views: "132,456", unique: "87,654" },
  { page: "/players", title: "นักเตะ", views: "98,123", unique: "65,432" },
  { page: "/news", title: "ข่าว", views: "78,567", unique: "54,321" },
  { page: "/ai-prediction", title: "AI ทำนายผล", views: "56,890", unique: "43,210" },
  { page: "/teams", title: "ทีม", views: "45,678", unique: "32,109" },
  { page: "/compare", title: "เปรียบเทียบ", views: "34,567", unique: "23,456" },
]

const deviceStats = [
  { device: "มือถือ", icon: Smartphone, users: "58%", sessions: "487,234" },
  { device: "คอมพิวเตอร์", icon: Monitor, users: "35%", sessions: "293,456" },
  { device: "แท็บเล็ต", icon: Tablet, users: "7%", sessions: "58,765" },
]

const countryStats = [
  { country: "ไทย", flag: "TH", users: "456,789", percentage: 45 },
  { country: "อังกฤษ", flag: "GB", users: "234,567", percentage: 23 },
  { country: "สหรัฐอเมริกา", flag: "US", users: "123,456", percentage: 12 },
  { country: "ออสเตรเลีย", flag: "AU", users: "87,654", percentage: 8 },
  { country: "อื่นๆ", flag: "XX", users: "123,456", percentage: 12 },
]

const trafficSources = [
  { source: "ค้นหาทั่วไป", users: "456,789", percentage: 45 },
  { source: "โซเชียลมีเดีย", users: "234,567", percentage: 23 },
  { source: "เข้าตรง", users: "198,765", percentage: 19 },
  { source: "อ้างอิง", users: "87,654", percentage: 8 },
  { source: "อีเมล", users: "51,234", percentage: 5 },
]

const dailyData = [
  { date: "จ.", views: 45000, users: 12000 },
  { date: "อ.", views: 52000, users: 14000 },
  { date: "พ.", views: 48000, users: 13000 },
  { date: "พฤ.", views: 61000, users: 16000 },
  { date: "ศ.", views: 58000, users: 15000 },
  { date: "ส.", views: 72000, users: 19000 },
  { date: "อา.", views: 85000, users: 22000 },
]

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("7days")

  const maxViews = Math.max(...dailyData.map(d => d.views))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">รายงานและวิเคราะห์</h1>
            <p className="text-muted-foreground">ข้อมูลการเข้าชมและพฤติกรรมผู้ใช้</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">วันนี้</SelectItem>
              <SelectItem value="7days">7 วันที่ผ่านมา</SelectItem>
              <SelectItem value="30days">30 วันที่ผ่านมา</SelectItem>
              <SelectItem value="90days">90 วันที่ผ่านมา</SelectItem>
              <SelectItem value="year">ปีนี้</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            ส่งออก
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewStats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <div className={`flex items-center gap-1 text-sm ${
                  stat.trend === "up" ? "text-green-500" : "text-red-500"
                }`}>
                  {stat.trend === "up" ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {stat.change}
                </div>
              </div>
              <p className="text-3xl font-bold mt-2">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>ภาพรวมการเข้าชม</CardTitle>
          <CardDescription>จำนวนผู้เข้าชมและผู้ใช้ในช่วง 7 วันที่ผ่านมา</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <div className="flex items-end justify-between h-full gap-2">
              {dailyData.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col items-center gap-1" style={{ height: '200px' }}>
                    <div 
                      className="w-full bg-primary/20 rounded-t"
                      style={{ height: `${(day.views / maxViews) * 100}%` }}
                    >
                      <div 
                        className="w-full bg-primary rounded-t"
                        style={{ height: `${(day.users / day.views) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">{day.date}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded" />
              <span className="text-sm text-muted-foreground">ผู้ใช้</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary/20 rounded" />
              <span className="text-sm text-muted-foreground">ยอดเข้าชม</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              หน้ายอดนิยม
            </CardTitle>
            <CardDescription>หน้าที่มีผู้เข้าชมมากที่สุด</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPages.map((page, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium">{page.title}</p>
                    <p className="text-sm text-muted-foreground">{page.page}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{page.views}</p>
                    <p className="text-sm text-muted-foreground">{page.unique} unique</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Device Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              อุปกรณ์
            </CardTitle>
            <CardDescription>แยกตามประเภทอุปกรณ์</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {deviceStats.map((device, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <device.icon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{device.device}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold">{device.users}</span>
                      <span className="text-sm text-muted-foreground ml-2">({device.sessions})</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: device.users }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Country Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              ประเทศ
            </CardTitle>
            <CardDescription>ผู้เข้าชมแยกตามประเทศ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {countryStats.map((country, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{country.flag === "TH" ? "🇹🇭" : country.flag === "GB" ? "🇬🇧" : country.flag === "US" ? "🇺🇸" : country.flag === "AU" ? "🇦🇺" : "🌍"}</span>
                      <span className="font-medium">{country.country}</span>
                    </div>
                    <span className="font-medium">{country.users}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${country.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Traffic Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              แหล่งที่มา
            </CardTitle>
            <CardDescription>ช่องทางที่ผู้ใช้เข้ามา</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trafficSources.map((source, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{source.source}</span>
                    <div>
                      <span className="font-medium">{source.users}</span>
                      <span className="text-sm text-muted-foreground ml-2">({source.percentage}%)</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${source.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
