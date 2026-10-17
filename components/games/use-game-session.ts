"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { fetchJson } from "@/lib/api-client"
import { getAuthToken, subscribeToAuthSession } from "@/lib/auth-client"
type SessionView = {
  id: string; status: "playing" | "completed"; answered: boolean
  deadline: number; serverNow: number; currentQuestion: { id: string }; timedOut?: boolean
}

export function useGameSession<T extends SessionView>(path: string, continuousTimer = false) {
  const [session, setSession] = useState<T | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState("")
  const [needsLogin, setNeedsLogin] = useState(false)
  const [resultVisible, setResultVisible] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const pending = useRef(false)
  const generation = useRef(0)
  const retryAction = useRef<(() => void) | null>(null)
  const clock = useRef({ remaining: 0, received: 0 })

  const apply = useCallback((value: T | null, showCompleted: boolean) => {
    setSession(value)
    setResultVisible(showCompleted)
    if (value) {
      clock.current = { remaining: value.deadline - value.serverNow, received: performance.now() }
      setTimeLeft(Math.max(0, Math.ceil(clock.current.remaining / 1000)))
      const url = new URL(window.location.href)
      url.searchParams.set("session", value.id)
      window.history.replaceState(null, "", url)
    }
  }, [])

  const load = useCallback(async () => {
    if (pending.current) return
    if (!getAuthToken()) { setNeedsLogin(true); setBusy(false); return }
    pending.current = true
    setBusy(true)
    setError("")
    const currentGeneration = generation.current
    retryAction.current = () => { void load() }
    try {
      const id = new URL(window.location.href).searchParams.get("session")
      const value = await fetchJson<T | null>(path + (id ? "?session=" + encodeURIComponent(id) : ""), { cache: "no-store", signal: AbortSignal.timeout(30000) })
      if (generation.current !== currentGeneration) return
      setNeedsLogin(false)
      apply(value, value?.status === "completed")
    } catch (e) {
      if (generation.current !== currentGeneration) return
      setNeedsLogin((e as { status?: number }).status === 401)
      setError(e instanceof Error ? e.message : "โหลดเกมไม่สำเร็จ")
    } finally {
      if (generation.current === currentGeneration) { pending.current = false; setBusy(false) }
    }
  }, [apply, path])

  useEffect(() => {
    void load()
    return subscribeToAuthSession(() => {
      generation.current++
      pending.current = false
      setSession(null)
      const url = new URL(window.location.href)
      url.searchParams.delete("session")
      window.history.replaceState(null, "", url)
      void load()
    })
  }, [load])

  const send = useCallback(async (body: Record<string, unknown>) => {
    if (pending.current) return
    if (!getAuthToken()) { setNeedsLogin(true); return }
    pending.current = true
    setBusy(true)
    setError("")
    const currentGeneration = generation.current
    retryAction.current = () => { void send(body) }
    try {
      const value = await fetchJson<T>(path, { method: "POST", body: JSON.stringify(body), signal: AbortSignal.timeout(30000) })
      if (generation.current !== currentGeneration) return
      setNeedsLogin(false)
      apply(value, body.action === "complete" || value.timedOut === true)
    } catch (e) {
      if (generation.current !== currentGeneration) return
      setNeedsLogin((e as { status?: number }).status === 401)
      setError(e instanceof Error ? e.message : "บันทึกคำตอบไม่สำเร็จ")
    } finally {
      if (generation.current === currentGeneration) { pending.current = false; setBusy(false) }
    }
  }, [apply, path])

  useEffect(() => {
    if (!session || session.status === "completed" || (!continuousTimer && session.answered)) return
    const tick = () => setTimeLeft(Math.max(0, Math.ceil((clock.current.remaining - (performance.now() - clock.current.received)) / 1000)))
    const timer = window.setInterval(tick, 200)
    tick()
    return () => window.clearInterval(timer)
  }, [session, continuousTimer])

  useEffect(() => {
    if (session && session.status === "playing" && (continuousTimer || !session.answered) && timeLeft === 0 && !busy && !error && !needsLogin) {
      void send(continuousTimer ? { action: "expire", sessionId: session.id } : { action: "answer", sessionId: session.id, questionId: session.currentQuestion.id, selected: null })
    }
  }, [session, timeLeft, busy, error, needsLogin, send, continuousTimer])

  return {
    session, busy, error, needsLogin, timeLeft, resultVisible,
    send,
    retry: () => retryAction.current?.(),
    reset: () => {
      if (pending.current) return
      setSession(null)
      setError("")
      const url = new URL(window.location.href)
      url.searchParams.delete("session")
      window.history.replaceState(null, "", url)
    },
  }
}
