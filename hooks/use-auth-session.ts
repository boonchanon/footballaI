"use client"

import { useEffect, useState } from "react"

import { clearAuthSession, getAuthSession, type AuthUser, subscribeToAuthSession } from "@/lib/auth-client"

export function useAuthSession() {
  const [session, setSession] = useState(() => getAuthSession())

  useEffect(() => subscribeToAuthSession(() => setSession(getAuthSession())), [])

  return {
    token: session?.token || null,
    user: (session?.user as AuthUser | null) || null,
    isLoggedIn: Boolean(session?.token),
    logout: clearAuthSession,
  }
}
