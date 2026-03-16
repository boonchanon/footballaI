"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Github, Lock, LogIn, Mail, ShieldCheck, Sparkles, Trophy } from "lucide-react"

import { fetchJson } from "@/lib/api-client"
import { saveAuthSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

function GoogleMark() {
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-black shadow-sm">
      G
    </span>
  )
}

const highlights = [
  {
    icon: Sparkles,
    title: "อินไซต์การแข่งขันอัจฉริยะ",
    description: "ติดตามทรรศนะจาก AI ตัวจริง และสถิติสำคัญได้ในที่เดียว",
  },
  {
    icon: Trophy,
    title: "คอมมูนิตี้คอบอล",
    description: "ร่วมคุยก่อนเกม แชร์มุมมอง และบันทึกทีมกับนักเตะที่คุณชอบ",
  },
  {
    icon: ShieldCheck,
    title: "เข้าใช้งานอย่างปลอดภัย",
    description: "ล็อกอินด้วยอีเมล หรือใช้งานต่อผ่าน Google และ GitHub ได้ทันที",
  },
]

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<"" | "google" | "github">("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    const oauthError = searchParams.get("oauthError")
    if (!oauthError) return

    toast({
      title: "เข้าสู่ระบบผ่านโซเชียลไม่สำเร็จ",
      description: oauthError,
      variant: "destructive",
    })
  }, [searchParams, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const data = await fetchJson<{ token: string; user: unknown }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })

      saveAuthSession(data)
      toast({
        title: "เข้าสู่ระบบสำเร็จ",
        description: "ยินดีต้อนรับกลับสู่ FootballAI",
      })
      router.push("/profile")
    } catch (error) {
      toast({
        title: "เข้าสู่ระบบไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาดบางอย่าง",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOauthLogin = (provider: "google" | "github") => {
    setOauthLoading(provider)
    window.location.href = `/api/auth/oauth/${provider}/start`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="w-full max-w-6xl"
    >
      <Card className="overflow-hidden border-border/70 bg-card/90 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur">
        <CardContent className="grid p-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative hidden overflow-hidden border-r border-border/70 lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,184,48,0.22),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(185,28,28,0.22),transparent_28%),linear-gradient(180deg,#0b0b0e_0%,#050507_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(130deg,transparent_0%,rgba(255,255,255,0.04)_35%,transparent_70%)]" />
            <div className="relative flex h-full flex-col justify-between p-10">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-primary">
                  <LogIn className="h-3.5 w-3.5" />
                  ทางเข้าใช้งานสมาชิก
                </div>
                <h1 className="mt-8 max-w-md font-display text-5xl leading-[0.95] text-foreground">
                  เเข้าสู่ระบบ
                  <br />
                  เพื่อเข้าสู่โลกของ FootballAI
                </h1>
                <p className="mt-5 max-w-lg text-sm leading-7 text-muted-foreground">
                  เข้าสู่ระบบเพื่อใช้งาน FootballAI แบบเต็มรูปแบบ ทั้งการทำนายผลด้วย AI การติดตามสถิติ และคอมมูนิตี้แฟนบอลในที่เดียว
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
                  <LogIn className="h-8 w-8" />
                </div>
                <h2 className="font-display text-3xl text-foreground">เข้าสู่ระบบ</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  เลือกเข้าสู่ระบบผ่านโซเชียล หรือใช้อีเมลและรหัสผ่านของคุณ
                </p>
              </div>

              <div className="grid gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full justify-center rounded-xl border-border/80 bg-secondary/40 text-foreground hover:bg-secondary"
                  disabled={oauthLoading !== ""}
                  onClick={() => handleOauthLogin("google")}
                >
                  <GoogleMark />
                  <span className="ml-2">{oauthLoading === "google" ? "กำลังไปยัง Google..." : "เข้าสู่ระบบด้วย Google"}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full justify-center rounded-xl border-border/80 bg-secondary/40 text-foreground hover:bg-secondary"
                  disabled={oauthLoading !== ""}
                  onClick={() => handleOauthLogin("github")}
                >
                  <Github className="h-4 w-4" />
                  <span className="ml-2">{oauthLoading === "github" ? "กำลังไปยัง GitHub..." : "เข้าสู่ระบบด้วย GitHub"}</span>
                </Button>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/80" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase tracking-[0.3em]">
                  <span className="bg-card px-3 text-muted-foreground">หรือใช้อีเมล</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      รหัสผ่าน
                    </Label>
                    <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                      ลืมรหัสผ่าน?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 rounded-xl border-border/80 bg-secondary/35 pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="mt-2 h-12 w-full rounded-xl text-sm font-semibold" disabled={isLoading}>
                  {isLoading ? (
                    "กำลังเข้าสู่ระบบ..."
                  ) : (
                    <>
                      เข้าสู่ระบบ FootballAI
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/8 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">ยังไม่มีบัญชี?</p>
                <p className="mt-1 leading-6">
                  สมัครสมาชิกเพื่อบันทึกทีมโปรด ติดตามทรรศนะของคุณ และเข้าร่วมคอมมูนิตี้แฟนบอลของ FootballAI
                </p>
                <Link href="/register" className="mt-3 inline-flex items-center font-medium text-primary hover:underline">
                  สมัครสมาชิกตอนนี้
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
