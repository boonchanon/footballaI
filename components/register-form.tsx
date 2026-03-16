"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, CheckCircle2, Lock, Mail, ShieldCheck, Star, User, UserPlus, Users } from "lucide-react"

import { fetchJson } from "@/lib/api-client"
import { saveAuthSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

const highlights = [
  {
    icon: Star,
    title: "ประสบการณ์ที่ตรงกับคุณ",
    description: "ติดตามทีมและนักเตะที่คุณสนใจ เพื่อให้หน้าใช้งานตรงกับสไตล์คอบอลของคุณ",
  },
  {
    icon: Users,
    title: "เข้าถึงคอมมูนิตี้",
    description: "โพสต์ แสดงความคิดเห็น และร่วมบทสนทนากับแฟนบอลคนอื่นใน FootballAI",
  },
  {
    icon: ShieldCheck,
    title: "บัญชีเดียวครบทุกการใช้งาน",
    description: "ใช้บัญชีเดียวสำหรับการทำนายผล รายการโปรด โปรไฟล์ และการกู้คืนรหัสผ่าน",
  },
]

export function RegisterForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [favoriteTeam, setFavoriteTeam] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedFavoriteTeam = favoriteTeam.trim()

    if (trimmedName.length < 2) {
      toast({
        title: "สมัครสมาชิกไม่สำเร็จ",
        description: "กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร",
        variant: "destructive",
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: "สมัครสมาชิกไม่สำเร็จ",
        description: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
        variant: "destructive",
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: "สมัครสมาชิกไม่สำเร็จ",
        description: "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const data = await fetchJson<{ token: string; user: unknown }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          password,
          favoriteTeam: trimmedFavoriteTeam,
        }),
      })

      saveAuthSession(data)
      toast({
        title: "สมัครสมาชิกสำเร็จ",
        description: "บัญชี FootballAI ของคุณพร้อมใช้งานแล้ว",
      })
      router.push("/profile")
    } catch (error) {
      toast({
        title: "สมัครสมาชิกไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาดบางอย่าง",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="w-full max-w-6xl"
    >
      <Card className="overflow-hidden border-border/70 bg-card/90 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur">
        <CardContent className="grid p-0 lg:grid-cols-[0.98fr_1.02fr]">
          <div className="relative hidden overflow-hidden border-r border-border/70 lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,184,48,0.22),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(185,28,28,0.22),transparent_28%),linear-gradient(180deg,#0b0b0e_0%,#050507_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(130deg,transparent_0%,rgba(255,255,255,0.04)_35%,transparent_70%)]" />
            <div className="relative flex h-full flex-col justify-between p-10">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-primary">
                  <UserPlus className="h-3.5 w-3.5" />
                  เริ่มต้นใช้งาน
                </div>
                <h1 className="mt-8 max-w-md font-display text-5xl leading-[0.95] text-foreground">
                  สร้างบัญชี
                  <br />
                  แล้วเข้าสู่โลกฟุตบอลที่ไม่เหมือนใครกับ FootballAI
                </h1>
                <p className="mt-5 max-w-lg text-sm leading-7 text-muted-foreground">
                  สมัครสมาชิกเพื่อเริ่มใช้งาน FootballAI แบบเต็มรูปแบบ ไม่ว่าจะเป็นการติดตามสถิติ การทำนายผล และการมีส่วนร่วมในคอมมูนิตี้ฟุตบอล
                </p>
              </div>

              <div className="space-y-4">
                {highlights.map(({ icon: Icon, title, description }) => (
                  <div key={title} className="flex items-start gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_16%)] p-6 sm:p-8 lg:p-10">
            <div className="mx-auto max-w-md">
              <div className="mb-8 text-center lg:text-left">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/12 text-primary lg:mx-0">
                  <UserPlus className="h-8 w-8" />
                </div>
                <h2 className="font-display text-3xl text-foreground">สมัครสมาชิก</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  ตั้งค่าบัญชีของคุณ แล้วเริ่มใช้งานระบบวิเคราะห์ฟุตบอล รายการโปรด และคอมมูนิตี้ของ FootballAI
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    ชื่อที่แสดง
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="ชื่อของคุณ"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-12 rounded-xl border-border/80 bg-secondary/35 pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    อีเมล
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 rounded-xl border-border/80 bg-secondary/35 pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      รหัสผ่าน
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="อย่างน้อย 6 ตัวอักษร"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 rounded-xl border-border/80 bg-secondary/35 pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      ยืนยันรหัสผ่าน
                    </Label>
                    <div className="relative">
                      <CheckCircle2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="กรอกรหัสผ่านอีกครั้ง"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-12 rounded-xl border-border/80 bg-secondary/35 pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="favoriteTeam" className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    ทีมโปรด
                  </Label>
                  <Input
                    id="favoriteTeam"
                    type="text"
                    placeholder="ไม่กรอกตอนนี้ก็ได้"
                    value={favoriteTeam}
                    onChange={(e) => setFavoriteTeam(e.target.value)}
                    className="h-12 rounded-xl border-border/80 bg-secondary/35"
                  />
                </div>

                <Button type="submit" className="mt-2 h-12 w-full rounded-xl text-sm font-semibold" disabled={isLoading}>
                  {isLoading ? (
                    "กำลังสร้างบัญชี..."
                  ) : (
                    <>
                      สร้างบัญชี FootballAI
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/8 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">มีบัญชีอยู่แล้ว?</p>
                <p className="mt-1 leading-6">
                  เข้าสู่ระบบเพื่อใช้งานต่อจากทีมโปรด โปรไฟล์ และกิจกรรมต่าง ๆ ที่คุณบันทึกไว้
                </p>
                <Link href="/login" className="mt-3 inline-flex items-center font-medium text-primary hover:underline">
                  ไปหน้าเข้าสู่ระบบ
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
