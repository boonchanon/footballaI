"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Save,
  Shield,
  MessageSquare,
  Users,
  Clock,
  AlertTriangle,
  Bell,
  Lock,
  Eye,
  Ban,
} from "lucide-react"

export default function AdminCommunitySettingsPage() {
  // General settings
  const [allowNewPosts, setAllowNewPosts] = useState(true)
  const [allowComments, setAllowComments] = useState(true)
  const [requireApproval, setRequireApproval] = useState(false)
  const [allowAnonymous, setAllowAnonymous] = useState(false)

  // Post limits
  const [maxPostsPerDay, setMaxPostsPerDay] = useState("10")
  const [maxCommentsPerHour, setMaxCommentsPerHour] = useState("20")
  const [minAccountAge, setMinAccountAge] = useState("0")

  // Content moderation
  const [autoModeration, setAutoModeration] = useState(true)
  const [strictMode, setStrictMode] = useState(false)
  const [hideOnReport, setHideOnReport] = useState("5")

  // Notifications
  const [notifyOnReport, setNotifyOnReport] = useState(true)
  const [notifyOnFlag, setNotifyOnFlag] = useState(true)
  const [notifyEmail, setNotifyEmail] = useState("admin@example.com")

  // Spam protection
  const [enableCaptcha, setEnableCaptcha] = useState(true)
  const [linkLimit, setLinkLimit] = useState("2")
  const [duplicateCheck, setDuplicateCheck] = useState(true)

  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">ตั้งค่าคอมมูนิตี้</h1>
          <p className="text-muted-foreground">กำหนดค่าและข้อจำกัดสำหรับชุมชน</p>
        </div>
        <Button className="gap-2" onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4" />
          {isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              ตั้งค่าทั่วไป
            </CardTitle>
            <CardDescription>การตั้งค่าพื้นฐานสำหรับคอมมูนิตี้</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>อนุญาตให้สร้างโพสต์ใหม่</Label>
                <p className="text-sm text-muted-foreground">ผู้ใช้สามารถสร้างกระทู้ใหม่ได้</p>
              </div>
              <Switch checked={allowNewPosts} onCheckedChange={setAllowNewPosts} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>อนุญาตให้แสดงความคิดเห็น</Label>
                <p className="text-sm text-muted-foreground">ผู้ใช้สามารถแสดงความคิดเห็นได้</p>
              </div>
              <Switch checked={allowComments} onCheckedChange={setAllowComments} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>ต้องอนุมัติก่อนเผยแพร่</Label>
                <p className="text-sm text-muted-foreground">โพสต์ต้องผ่านการอนุมัติจาก Admin</p>
              </div>
              <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>อนุญาตโพสต์แบบไม่ระบุตัวตน</Label>
                <p className="text-sm text-muted-foreground">ผู้ใช้สามารถโพสต์โดยไม่แสดงชื่อ</p>
              </div>
              <Switch checked={allowAnonymous} onCheckedChange={setAllowAnonymous} />
            </div>
          </CardContent>
        </Card>

        {/* Post Limits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              ข้อจำกัดการโพสต์
            </CardTitle>
            <CardDescription>กำหนดข้อจำกัดเพื่อป้องกันสแปม</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>จำนวนโพสต์สูงสุดต่อวัน</Label>
              <Input
                type="number"
                value={maxPostsPerDay}
                onChange={(e) => setMaxPostsPerDay(e.target.value)}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">0 = ไม่จำกัด</p>
            </div>

            <div>
              <Label>จำนวนความคิดเห็นสูงสุดต่อชั่วโมง</Label>
              <Input
                type="number"
                value={maxCommentsPerHour}
                onChange={(e) => setMaxCommentsPerHour(e.target.value)}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">0 = ไม่จำกัด</p>
            </div>

            <div>
              <Label>อายุบัญชีขั้นต่ำ (วัน)</Label>
              <Input
                type="number"
                value={minAccountAge}
                onChange={(e) => setMinAccountAge(e.target.value)}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                บัญชีที่สร้างใหม่ต้องรออายุบัญชีถึงจำนวนวันที่กำหนดก่อนโพสต์ได้
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Content Moderation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              การกรองเนื้อหา
            </CardTitle>
            <CardDescription>ตั้งค่าระบบกรองเนื้อหาอัตโนมัติ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>เปิดใช้การกรองอัตโนมัติ</Label>
                <p className="text-sm text-muted-foreground">กรองคำหยาบและเนื้อหาไม่เหมาะสม</p>
              </div>
              <Switch checked={autoModeration} onCheckedChange={setAutoModeration} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>โหมดเข้มงวด</Label>
                <p className="text-sm text-muted-foreground">บล็อกเนื้อหาที่น่าสงสัยทั้งหมด</p>
              </div>
              <Switch checked={strictMode} onCheckedChange={setStrictMode} />
            </div>

            <div>
              <Label>ซ่อนโพสต์เมื่อถูกรายงาน (ครั้ง)</Label>
              <Input
                type="number"
                value={hideOnReport}
                onChange={(e) => setHideOnReport(e.target.value)}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                โพสต์จะถูกซ่อนอัตโนมัติเมื่อถูกรายงานถึงจำนวนที่กำหนด
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              การแจ้งเตือน
            </CardTitle>
            <CardDescription>ตั้งค่าการแจ้งเตือนสำหรับ Admin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>แจ้งเตือนเมื่อมีการรายงาน</Label>
                <p className="text-sm text-muted-foreground">รับการแจ้งเตือนเมื่อมีรายงานใหม่</p>
              </div>
              <Switch checked={notifyOnReport} onCheckedChange={setNotifyOnReport} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>แจ้งเตือนเมื่อมีการตั้งค่าสถานะ</Label>
                <p className="text-sm text-muted-foreground">รับการแจ้งเตือนเมื่อระบบตรวจพบเนื้อหาน่าสงสัย</p>
              </div>
              <Switch checked={notifyOnFlag} onCheckedChange={setNotifyOnFlag} />
            </div>

            <div>
              <Label>อีเมลสำหรับรับการแจ้งเตือน</Label>
              <Input
                type="email"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>

        {/* Spam Protection */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5" />
              ป้องกันสแปม
            </CardTitle>
            <CardDescription>ตั้งค่าการป้องกันสแปมและบอท</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="space-y-0.5">
                  <Label>เปิดใช้ CAPTCHA</Label>
                  <p className="text-sm text-muted-foreground">ต้องยืนยันว่าไม่ใช่บอทก่อนโพสต์</p>
                </div>
                <Switch checked={enableCaptcha} onCheckedChange={setEnableCaptcha} />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="space-y-0.5">
                  <Label>ตรวจสอบโพสต์ซ้ำ</Label>
                  <p className="text-sm text-muted-foreground">บล็อกโพสต์ที่มีเนื้อหาซ้ำกัน</p>
                </div>
                <Switch checked={duplicateCheck} onCheckedChange={setDuplicateCheck} />
              </div>

              <div className="p-4 rounded-lg border">
                <Label>จำกัดลิงก์ต่อโพสต์</Label>
                <Input
                  type="number"
                  value={linkLimit}
                  onChange={(e) => setLinkLimit(e.target.value)}
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">0 = ไม่อนุญาตลิงก์</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
