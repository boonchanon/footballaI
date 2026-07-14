"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Lock, Mail, Shield } from "lucide-react"

import { saveAuthSession, type AuthSession } from "@/lib/auth-client"
import { fetchJson } from "@/lib/api-client"
import { getDefaultAdminRoute } from "@/lib/admin-access"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const trimmedEmail = email.trim().toLowerCase()
    if (!isValidEmail(trimmedEmail)) {
      setError("กรุณากรอกอีเมลให้ถูกต้อง")
      setIsLoading(false)
      return
    }

    if (!password) {
      setError("กรุณากรอกรหัสผ่าน")
      setIsLoading(false)
      return
    }

    try {
      const session = await fetchJson<AuthSession>("/admin/login", {
        method: "POST",
        body: JSON.stringify({ email: trimmedEmail, password }),
      })

      saveAuthSession(session)
      router.push(getDefaultAdminRoute(session.user.role))
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "เข้าสู่ระบบแอดมินไม่สำเร็จ")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#efe6ee] p-4 text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(180,255,60,0.16),transparent_32%),radial-gradient(circle_at_bottom,rgba(0,0,0,0.12),transparent_35%)]" />

      <Card className="relative z-10 w-full max-w-md border-border/80 bg-card text-card-foreground shadow-2xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">เข้าสู่ระบบแอดมิน</CardTitle>
            <CardDescription className="text-muted-foreground">
              รองรับ 3 ระดับสิทธิ์: Super Admin, Admin และ Admin Community
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? <div className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">{error}</div> : null}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                อีเมล
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@footballai.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-border/70 bg-background pl-10 text-foreground"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                รหัสผ่าน
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="กรอกรหัสผ่าน"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-border/70 bg-background pl-10 pr-10 text-foreground"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(Boolean(checked))} />
                <Label htmlFor="remember" className="cursor-pointer text-sm font-normal text-foreground">
                  จดจำการเข้าสู่ระบบ
                </Label>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
