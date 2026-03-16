"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { saveAuthSession } from "@/lib/auth-client"

export function OauthComplete() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get("token") || ""
    const userRaw = searchParams.get("user") || ""

    if (!token || !userRaw) {
      router.replace("/login?oauthError=Missing%20OAuth%20session")
      return
    }

    try {
      saveAuthSession({
        token,
        user: JSON.parse(userRaw),
      })
      router.replace("/profile")
    } catch {
      router.replace("/login?oauthError=Invalid%20OAuth%20session")
    }
  }, [router, searchParams])

  return <p className="text-sm text-muted-foreground">Completing sign in...</p>
}
