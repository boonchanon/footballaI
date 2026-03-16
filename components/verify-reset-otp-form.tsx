"use client"

import type React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowRight, KeyRound, Mail } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { fetchJson } from "@/lib/api-client"

type VerifyOtpResponse = {
  message: string
  resetToken: string
}

export function VerifyResetOtpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const email = searchParams.get("email") || ""
  const devOtp = searchParams.get("devOtp") || ""
  const [otp, setOtp] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!email) {
      toast({
        title: "Missing email",
        description: "Start from the forgot password page.",
        variant: "destructive",
      })
      return
    }

    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Enter the 6-digit code.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const data = await fetchJson<VerifyOtpResponse>("/auth/verify-reset-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp }),
      })

      toast({
        title: "OTP verified",
        description: data.message,
      })
      router.push(`/reset-password?token=${encodeURIComponent(data.resetToken)}`)
    } catch (error) {
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Something went wrong",
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
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-display">Verify OTP</CardTitle>
          <CardDescription>Enter the 6-digit code sent to your email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <Mail className="h-4 w-4" />
              <span>{email || "No email provided"}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">OTP code</Label>
              <InputOTP id="otp" maxLength={6} value={otp} onChange={setOtp} containerClassName="justify-center">
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button type="submit" className="h-11 w-full" disabled={isLoading}>
              {isLoading ? "Verifying OTP..." : "Verify OTP"}
              {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          {devOtp ? (
            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 text-sm">
              <p className="font-medium">Development OTP</p>
              <p className="mt-1 text-2xl font-semibold tracking-[0.4em] text-muted-foreground">{devOtp}</p>
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="justify-center border-t border-border pt-6">
          <p className="text-sm text-muted-foreground">
            <Link href="/forgot-password" className="font-medium text-primary hover:underline">
              Request a new OTP
            </Link>
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
