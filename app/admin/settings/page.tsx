"use client"

import { useEffect, useState } from "react"
import { Database, RefreshCw, Save, Wifi, WifiOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { getAuthToken } from "@/lib/auth-client"

type SettingsResponse = {
  footballApi?: {
    enabled: boolean
  }
  footballTeamsApi?: {
    enabled: boolean
  }
  newsApi?: {
    enabled: boolean
  }
  fixtureCount?: number
}

export default function SettingsPage() {
  const [footballApiEnabled, setFootballApiEnabled] = useState(true)
  const [footballTeamsApiEnabled, setFootballTeamsApiEnabled] = useState(true)
  const [newsApiEnabled, setNewsApiEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncingHistorical, setSyncingHistorical] = useState(false)
  const [message, setMessage] = useState("")

  const loadSettings = async () => {
    const token = getAuthToken()
    if (!token) {
      setMessage("ไม่พบ token ของแอดมิน")
      setLoading(false)
      return
    }

    setLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/admin/sync/premier-league", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = (await response.json().catch(() => null)) as SettingsResponse | null

      if (!response.ok) {
        setMessage("โหลดการตั้งค่าไม่สำเร็จ")
        return
      }

      setFootballApiEnabled(Boolean(data?.footballApi?.enabled))
      setFootballTeamsApiEnabled(Boolean(data?.footballTeamsApi?.enabled))
      setNewsApiEnabled(Boolean(data?.newsApi?.enabled))
    } catch {
      setMessage("เชื่อมต่อการตั้งค่าแอดมินไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    const token = getAuthToken()
    if (!token) {
      setMessage("ไม่พบ token ของแอดมิน")
      return
    }

    setSaving(true)
    setMessage("")

    try {
      const response = await fetch("/api/admin/sync/premier-league", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          footballApi: {
            enabled: footballApiEnabled,
          },
          footballTeamsApi: {
            enabled: footballTeamsApiEnabled,
          },
          newsApi: {
            enabled: newsApiEnabled,
          },
        }),
      })

      const data = (await response.json().catch(() => null)) as SettingsResponse | null
      if (!response.ok) {
        setMessage("บันทึกการตั้งค่าไม่สำเร็จ")
        return
      }

      setFootballApiEnabled(Boolean(data?.footballApi?.enabled))
      setFootballTeamsApiEnabled(Boolean(data?.footballTeamsApi?.enabled))
      setNewsApiEnabled(Boolean(data?.newsApi?.enabled))
      setMessage("บันทึกการตั้งค่าเรียบร้อยแล้ว")
    } catch {
      setMessage("เชื่อมต่อเพื่อบันทึกการตั้งค่าไม่สำเร็จ")
    } finally {
      setSaving(false)
    }
  }

  const syncFiveSeasons = async () => {
    const token = getAuthToken()
    if (!token) {
      setMessage("ไม่พบ token ของแอดมิน")
      return
    }

    setSyncingHistorical(true)
    setMessage("กำลัง sync ข้อมูลพรีเมียร์ลีกย้อนหลัง 5 ฤดูกาล...")

    try {
      const response = await fetch("/api/admin/sync/premier-league", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mode: "fixtures",
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        setMessage("sync 5 ฤดูกาลไม่สำเร็จ")
        return
      }

      const syncedCount = Number(data?.status?.fixtureCount || 0)
      setMessage(`sync 5 ฤดูกาลเรียบร้อยแล้ว ขณะนี้มี fixtures ในฐานข้อมูล ${syncedCount.toLocaleString()} รายการ`)
      await loadSettings()
    } catch {
      setMessage("เชื่อมต่อเพื่อ sync 5 ฤดูกาลไม่สำเร็จ")
    } finally {
      setSyncingHistorical(false)
    }
  }

  useEffect(() => {
    void loadSettings()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ตั้งค่า</h1>
          <p className="mt-1 text-muted-foreground">ควบคุมการใช้งาน API ภายนอกและแหล่งข้อมูลสำรองใน MongoDB</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => void loadSettings()} disabled={loading || saving}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
          <Button onClick={() => void saveSettings()} disabled={loading || saving}>
            <Save className={`mr-2 h-4 w-4 ${saving ? "animate-pulse" : ""}`} />
            บันทึก
          </Button>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Football API Fixtures
          </CardTitle>
          <CardDescription>ควบคุมการ refresh ข้อมูลแมตช์จาก API ภายนอก และใช้ MongoDB เป็นข้อมูลหลักเมื่อ API มีปัญหา</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 p-4">
            <div className="space-y-1">
              <Label className="text-base">เปิดใช้งาน Football API Refresh</Label>
              <p className="text-sm text-muted-foreground">เมื่อเปิด ระบบจะ refresh ข้อมูลแมตช์จาก API แล้ว sync ลง MongoDB ตามรอบ cache</p>
            </div>
            <Switch checked={footballApiEnabled} onCheckedChange={setFootballApiEnabled} disabled={loading || saving} />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {footballApiEnabled ? <Wifi className="h-4 w-4 text-primary" /> : <WifiOff className="h-4 w-4 text-destructive" />}
            <span>{footballApiEnabled ? "สถานะปัจจุบัน: เปิดใช้งาน API แมตช์" : "สถานะปัจจุบัน: ปิด API แมตช์ ใช้ข้อมูลจาก MongoDB เท่านั้น"}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-lime-500/30 bg-lime-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Sync 5 Seasons
          </CardTitle>
          <CardDescription>ดึง fixtures พรีเมียร์ลีกย้อนหลัง 5 ฤดูกาลลง MongoDB เพื่อให้หน้า player, match และ season dropdown ใช้ข้อมูลย้อนหลังได้จริงโดยไม่ต้องรอ API ตอนเปิดหน้า</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
            <p className="text-sm text-muted-foreground">
              ปุ่มนี้จะ sync ฤดูกาล 2026/27, 2025/26, 2024/25, 2023/24 และ 2022/23 ลงฐานข้อมูลของระบบ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => void syncFiveSeasons()}
              disabled={loading || saving || syncingHistorical}
              className="bg-lime-500 text-slate-950 hover:bg-lime-400"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${syncingHistorical ? "animate-spin" : ""}`} />
              {syncingHistorical ? "กำลัง Sync 5 Seasons..." : "Sync 5 Seasons"}
            </Button>
            <span className="text-sm text-muted-foreground">ใช้เมื่ออยากเติม historical cache ให้ครบก่อนเปิดหน้าผู้เล่นย้อนหลัง</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Football API Teams
          </CardTitle>
          <CardDescription>ควบคุมการ refresh รายชื่อสโมสรและทีมสำหรับหน้า /clubs และ /teams โดยเก็บข้อมูลลง MongoDB เป็นแหล่งสำรอง</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 p-4">
            <div className="space-y-1">
              <Label className="text-base">เปิดใช้งาน Team Directory API Refresh</Label>
              <p className="text-sm text-muted-foreground">เมื่อเปิด ระบบจะ refresh รายชื่อทีมจาก AllSportsAPI แล้วบันทึกลง MongoDB เมื่อปิด ระบบจะใช้ข้อมูลสโมสรและทีมที่เก็บไว้ในฐานข้อมูลเท่านั้น</p>
            </div>
            <Switch checked={footballTeamsApiEnabled} onCheckedChange={setFootballTeamsApiEnabled} disabled={loading || saving} />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {footballTeamsApiEnabled ? <Wifi className="h-4 w-4 text-primary" /> : <WifiOff className="h-4 w-4 text-destructive" />}
            <span>{footballTeamsApiEnabled ? "สถานะปัจจุบัน: เปิดใช้งาน API รายชื่อทีมและสโมสร" : "สถานะปัจจุบัน: ปิด API รายชื่อทีมและสโมสร ใช้ข้อมูลจาก MongoDB เท่านั้น"}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            API ข่าว
          </CardTitle>
          <CardDescription>ควบคุมการดึงข่าวจาก GNews แยกจากข้อมูลฟุตบอล เมื่อปิดจะใช้ fallback news ภายในระบบแทน</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 p-4">
            <div className="space-y-1">
              <Label className="text-base">เปิดใช้งาน API ข่าว</Label>
              <p className="text-sm text-muted-foreground">เมื่อเปิด ระบบจะเรียก GNews ตามปกติ เมื่อปิดจะหยุดยิง API ข่าวและใช้ fallback news ของระบบแทน</p>
            </div>
            <Switch checked={newsApiEnabled} onCheckedChange={setNewsApiEnabled} disabled={loading || saving} />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {newsApiEnabled ? <Wifi className="h-4 w-4 text-primary" /> : <WifiOff className="h-4 w-4 text-destructive" />}
            <span>{newsApiEnabled ? "สถานะปัจจุบัน: เปิดใช้งาน API ข่าว" : "สถานะปัจจุบัน: ปิด API ข่าว ใช้ fallback news"}</span>
          </div>
        </CardContent>
      </Card>

      {message ? <div className="text-sm text-muted-foreground">{message}</div> : null}
    </div>
  )
}
