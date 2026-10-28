"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, CheckCircle2, Loader2, UserPlus } from "lucide-react"

import { ADMIN_ROLE_LABELS, ADMIN_ROLES, ADMIN_SECTIONS, type AdminRole, type AdminSection, getAdminSections } from "@/lib/admin-access"
import { fetchJson } from "@/lib/api-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const SECTION_LABELS: Record<AdminSection, string> = {
  dashboard: "แดชบอร์ด",
  leagues: "ลีก",
  matches: "แมตช์",
  teams: "ทีม",
  players: "นักเตะ",
  heatmap: "Heat Map",
  ai: "AI ทำนายผล",
  community: "คอมมูนิตี้",
  users: "ผู้ใช้และสิทธิ์",
  settings: "ตั้งค่า",
}

type CreatedAdmin = { id: string; email: string; role: AdminRole; permissions: AdminSection[] }

export default function AddUserPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [role, setRole] = useState<AdminRole>("admin")
  const [permissions, setPermissions] = useState<AdminSection[]>(getAdminSections("admin"))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [created, setCreated] = useState<CreatedAdmin | null>(null)

  function changeRole(next: AdminRole) {
    setRole(next)
    setPermissions(getAdminSections(next))
  }

  function togglePermission(section: AdminSection, checked: boolean) {
    setPermissions((current) => (checked ? [...current, section] : current.filter((item) => item !== section)))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    if (password !== confirm) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน")
      return
    }
    setSaving(true)
    try {
      const response = await fetchJson<{ item: CreatedAdmin }>("/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role, permissions }),
      })
      setCreated(response.item)
      setEmail("")
      setPassword("")
      setConfirm("")
    } catch (err) {
      const message = err instanceof Error ? err.message : "เพิ่มผู้ดูแลไม่สำเร็จ"
      setError(message === "Admin permission denied" ? "เฉพาะ Super Admin เท่านั้นที่เพิ่มผู้ดูแลได้" : message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/admin/users" aria-label="กลับ">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">เพิ่มผู้ดูแลระบบ</h1>
          <p className="text-muted-foreground">สร้างบัญชีผู้ดูแลใหม่ กำหนดบทบาทและส่วนที่เข้าถึงได้ (เฉพาะ Super Admin)</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            ข้อมูลบัญชี
          </CardTitle>
          <CardDescription>ผู้ดูแลจะเข้าสู่ระบบที่หน้า /admin/login ด้วยอีเมลและรหัสผ่านนี้</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="admin-email">อีเมล</Label>
              <Input id="admin-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="admin-password">รหัสผ่าน</Label>
                <Input id="admin-password" type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
                <p className="text-xs text-muted-foreground">อย่างน้อย 8 ตัว มีทั้งตัวอักษรและตัวเลข</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password-confirm">ยืนยันรหัสผ่าน</Label>
                <Input id="admin-password-confirm" type="password" required value={confirm} onChange={(event) => setConfirm(event.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>บทบาท</Label>
              <Select value={role} onValueChange={(value) => changeRole(value as AdminRole)}>
                <SelectTrigger aria-label="บทบาท">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_ROLES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {ADMIN_ROLE_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ส่วนที่เข้าถึงได้</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {ADMIN_SECTIONS.map((section) => (
                  <label key={section} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={permissions.includes(section)} onCheckedChange={(checked) => togglePermission(section, checked === true)} />
                    {SECTION_LABELS[section]}
                  </label>
                ))}
              </div>
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {created ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  เพิ่ม {created.email} ({ADMIN_ROLE_LABELS[created.role]}) แล้ว ·{" "}
                  <Link href="/admin/users/roles" className="font-medium underline">
                    ดูที่หน้าจัดการบทบาท
                  </Link>
                </AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              เพิ่มผู้ดูแล
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
