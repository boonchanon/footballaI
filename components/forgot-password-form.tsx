"use client"

import type React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowRight, KeyRound, Mail } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { fetchJson } from "@/lib/api-client"

type ForgotPasswordResponse = {
  message: string
  devOtp?: string
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [devOtp, setDevOtp] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setDevOtp("")

    try {
      const normalizedEmail = email.trim().toLowerCase()
      const data = await fetchJson<ForgotPasswordResponse>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: normalizedEmail }),
      })

      setDevOtp(data.devOtp || "")
      toast({
        title: "OTP sent",
        description: data.message,
      })
      router.push(`/verify-otp?email=${encodeURIComponent(normalizedEmail)}${data.devOtp ? `&devOtp=${encodeURIComponent(data.devOtp)}` : ""}`)
    } catch (error) {
      toast({
        title: "Request failed",
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
          <CardTitle className="text-2xl font-display">Forgot password</CardTitle>
          <CardDescription>Enter your email and we will send a 6-digit OTP.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="h-11 w-full" disabled={isLoading}>
              {isLoading ? "Sending OTP..." : "Send OTP"}
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
            Remembered it?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Back to login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
