"use client"

import React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Calendar, MapPin, Trophy, Clock, Save, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

const teams = [
  { id: "1", name: "แมนเชสเตอร์ ซิตี้", logo: "/manchester-city-logo.png" },
  { id: "2", name: "ลิเวอร์พูล", logo: "/liverpool-logo.png" },
  { id: "3", name: "อาร์เซนอล", logo: "/arsenal-logo.png" },
  { id: "4", name: "เชลซี", logo: "/chelsea-football-club-crest.png" },
  { id: "5", name: "แมนเชสเตอร์ ยูไนเต็ด", logo: "/manchester-united-crest.png" },
  { id: "6", name: "สเปอร์ส", logo: "/tottenham-logo.png" },
]

const leagues = [
  { id: "1", name: "พรีเมียร์ลีก" },
  { id: "2", name: "แชมเปี้ยนส์ลีก" },
  { id: "3", name: "เอฟเอคัพ" },
  { id: "4", name: "คาราบาว คัพ" },
]

export default function AddMatchPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    homeTeam: "",
    awayTeam: "",
    league: "",
    date: "",
    time: "",
    venue: "",
    matchweek: "",
    status: "scheduled",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    await new Promise((resolve) => setTimeout(resolve, 1500))
    
    alert("สร้างแมตช์สำเร็จ!")
    setIsLoading(false)
    router.push("/admin/matches")
  }

  const selectedHomeTeam = teams.find(t => t.id === formData.homeTeam)
  const selectedAwayTeam = teams.find(t => t.id === formData.awayTeam)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/matches">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">เพิ่มแมตช์ใหม่</h1>
          <p className="text-muted-foreground">กำหนดการแข่งขันใหม่ในระบบ</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Match Preview */}
            <Card>
              <CardHeader>
                <CardTitle>ตัวอย่างแมตช์</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-8 py-6">
                  <div className="text-center">
                    {selectedHomeTeam ? (
                      <>
                        <div className="w-20 h-20 mx-auto mb-2 relative">
                          <Image
                            src={selectedHomeTeam.logo || "/placeholder.svg"}
                            alt={selectedHomeTeam.name}
                            fill
                            className="object-contain"
                          />
                        </div>
                        <p className="font-medium">{selectedHomeTeam.name}</p>
                      </>
                    ) : (
                      <>
                        <div className="w-20 h-20 mx-auto mb-2 bg-muted rounded-full flex items-center justify-center">
                          <Trophy className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">ทีมเหย้า</p>
                      </>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-muted-foreground">VS</div>
                    {formData.date && formData.time && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {formData.date} - {formData.time}
                      </p>
                    )}
                  </div>
                  <div className="text-center">
                    {selectedAwayTeam ? (
                      <>
                        <div className="w-20 h-20 mx-auto mb-2 relative">
                          <Image
                            src={selectedAwayTeam.logo || "/placeholder.svg"}
                            alt={selectedAwayTeam.name}
                            fill
                            className="object-contain"
                          />
                        </div>
                        <p className="font-medium">{selectedAwayTeam.name}</p>
                      </>
                    ) : (
                      <>
                        <div className="w-20 h-20 mx-auto mb-2 bg-muted rounded-full flex items-center justify-center">
                          <Trophy className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">ทีมเยือน</p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Teams */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  เลือกทีม
                </CardTitle>
                <CardDescription>เลือกทีมเหย้าและทีมเยือน</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ทีมเหย้า</Label>
                    <Select
                      value={formData.homeTeam}
                      onValueChange={(value) => setFormData({ ...formData, homeTeam: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกทีมเหย้า" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id} disabled={team.id === formData.awayTeam}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>ทีมเยือน</Label>
                    <Select
                      value={formData.awayTeam}
                      onValueChange={(value) => setFormData({ ...formData, awayTeam: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกทีมเยือน" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id} disabled={team.id === formData.homeTeam}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Date & Time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  วันเวลาและสถานที่
                </CardTitle>
                <CardDescription>กำหนดวันเวลาและสนามแข่งขัน</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">วันที่</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">เวลา</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venue">สนามแข่งขัน</Label>
                  <Input
                    id="venue"
                    placeholder="เช่น Etihad Stadium"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* League & Matchweek */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  รายละเอียดการแข่งขัน
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>ลีก/รายการ</Label>
                  <Select
                    value={formData.league}
                    onValueChange={(value) => setFormData({ ...formData, league: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกลีก" />
                    </SelectTrigger>
                    <SelectContent>
                      {leagues.map((league) => (
                        <SelectItem key={league.id} value={league.id}>
                          {league.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="matchweek">นัด/สัปดาห์</Label>
                  <Input
                    id="matchweek"
                    placeholder="เช่น 25"
                    value={formData.matchweek}
                    onChange={(e) => setFormData({ ...formData, matchweek: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>สถานะ</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกสถานะ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">กำหนดการ</SelectItem>
                      <SelectItem value="live">กำลังแข่ง</SelectItem>
                      <SelectItem value="finished">จบแล้ว</SelectItem>
                      <SelectItem value="postponed">เลื่อน</SelectItem>
                      <SelectItem value="cancelled">ยกเลิก</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      บันทึกแมตช์
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" className="w-full bg-transparent" onClick={() => router.back()}>
                  ยกเลิก
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
