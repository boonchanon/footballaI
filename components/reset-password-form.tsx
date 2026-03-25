"use client"

import type React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowRight, CheckCircle2, KeyRound, Lock } from "lucide-react"
import { useState } from "react"

import { fetchJson } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

type ResetField = "password" | "confirmPassword"

export function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const resetToken = searchParams.get("token") || ""
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ResetField, string>>>({})

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const nextErrors: Partial<Record<ResetField, string>> = {}

    if (!resetToken) {
      toast({
        title: "ลิงก์ไม่ถูกต้อง",
        description: "กรุณายืนยัน OTP ใหม่ก่อนตั้งรหัสผ่านใหม่",
        variant: "destructive",
      })
      return
    }

    if (password.length < 6) {
      nextErrors.password = "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร"
    }

    if (password !== confirmPassword) {
      nextErrors.confirmPassword = "รหัสผ่านและยืนยันรหัสผ่านต้องตรงกัน"
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      toast({
        title: "รีเซ็ตรหัสผ่านไม่สำเร็จ",
        description: Object.values(nextErrors)[0],
        variant: "destructive",
      })
      return
    }

    setFieldErrors({})
    setIsLoading(true)

    try {
      await fetchJson<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ resetToken, password }),
      })

      setIsSuccess(true)
      toast({
        title: "เปลี่ยนรหัสผ่านแล้ว",
        description: "ตอนนี้คุณเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้เลย",
      })
      window.setTimeout(() => router.push("/login"), 1200)
    } catch (error) {
      const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดบางอย่าง"

      if (message.includes("รหัสผ่าน")) {
        setFieldErrors((current) => ({ ...current, password: message }))
      }

      toast({
        title: "รีเซ็ตรหัสผ่านไม่สำเร็จ",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="mx-auto w-full max-w-md border-border/50 shadow-xl">
        <CardHeader className="space-y-2 pb-6 text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            {isSuccess ? <CheckCircle2 className="h-7 w-7 text-primary" /> : <KeyRound className="h-7 w-7 text-primary" />}
          </div>
          <CardTitle className="text-2xl font-display">{isSuccess ? "เปลี่ยนรหัสผ่านแล้ว" : "ตั้งรหัสผ่านใหม่"}</CardTitle>
          <CardDescription>
            {isSuccess ? "รหัสผ่านของคุณถูกอัปเดตเรียบร้อยแล้ว" : "กรอกรหัสผ่านใหม่และยืนยันอีกครั้ง"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <Button type="button" className="h-11 w-full" onClick={() => router.push("/login")}>
              กลับไปหน้าเข้าสู่ระบบ
            </Button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">รหัสผ่านใหม่</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setFieldErrors((current) => ({ ...current, password: undefined, confirmPassword: undefined }))
                    }}
                    className="pl-10"
                    required
                  />
                </div>
                {fieldErrors.password ? <p className="text-sm text-destructive">{fieldErrors.password}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="กรอกรหัสผ่านเดิมอีกครั้ง"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value)
                      setFieldErrors((current) => ({ ...current, confirmPassword: undefined }))
                    }}
                    className="pl-10"
                    required
                  />
                </div>
                {fieldErrors.confirmPassword ? <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p> : null}
              </div>

              <Button type="submit" className="h-11 w-full" disabled={isLoading}>
                {isLoading ? "กำลังอัปเดตรหัสผ่าน..." : "อัปเดตรหัสผ่าน"}
                {!isLoading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="justify-center border-t border-border pt-6">
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary hover:underline">
              กลับไปหน้าเข้าสู่ระบบ
            </Link>
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
