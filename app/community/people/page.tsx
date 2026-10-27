"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import useSWRInfinite from "swr/infinite"
import { ArrowLeft, Loader2, MessageSquare, Search, UserPlus, Users } from "lucide-react"

import { Navigation } from "@/components/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useAuthSession } from "@/hooks/use-auth-session"
import { fetchJson } from "@/lib/api-client"

type Person = {
  id: string
  name: string
  avatar: string
  favoriteTeam: string
  bio: string
  status: "mutual" | "following" | "follower" | "none"
  requestId: string | null
  conversationId: string | null
}

type PeoplePage = { items: Person[]; hasMore: boolean; nextSkip: number }

const STATUS_LABEL: Record<Person["status"], string | null> = {
  mutual: "ติดตามกันแล้ว",
  following: "กำลังติดตาม",
  follower: "ติดตามคุณอยู่",
  none: null,
}

function PeopleDirectory() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { token } = useAuthSession()
  const { toast } = useToast()
  const [query, setQuery] = useState(searchParams.get("q") || "")
  const [debouncedQuery, setDebouncedQuery] = useState(query.trim())
  const [busyId, setBusyId] = useState<string | null>(null)

  // The page is prerendered, so ?q may only be known after hydration (e.g. arriving from the
  // search box on /community). Take it from the URL whenever it differs from what is typed.
  const urlQuery = searchParams.get("q") || ""
  useEffect(() => {
    setQuery((current) => (current.trim() === urlQuery ? current : urlQuery))
  }, [urlQuery])

  // Search as the user types (after a short pause) and keep ?q in the address bar. The URL is only
  // written when the typed text differs from it, so a slow first load cannot wipe an incoming ?q.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = query.trim()
      setDebouncedQuery(next)
      if (next !== urlQuery) {
        router.replace(next ? `/community/people?q=${encodeURIComponent(next)}` : "/community/people", { scroll: false })
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query, router, urlQuery])

  const { data, size, setSize, isLoading, isValidating, mutate } = useSWRInfinite<PeoplePage>(
    (index, previous: PeoplePage | null) => {
      if (!token || (previous && !previous.hasMore)) return null
      const skip = previous ? previous.nextSkip : 0
      return [`/community/people?q=${encodeURIComponent(debouncedQuery)}&skip=${skip}`, token]
    },
    ([url, authToken]: [string, string]) => fetchJson<PeoplePage>(url, { headers: { Authorization: `Bearer ${authToken}` } }),
  )
  const people = data?.flatMap((page) => page.items) || []
  const hasMore = Boolean(data?.[data.length - 1]?.hasMore)

  async function act(person: Person, body: Record<string, string>, success?: (result: any) => string | null) {
    if (!token) return
    try {
      setBusyId(person.id)
      const result = await fetchJson("/community/friends", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const message = success?.(result)
      if (message) toast({ title: message })
      await mutate()
    } catch (error) {
      toast({ title: "อัปเดตการติดตามไม่สำเร็จ", description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด", variant: "destructive" })
    } finally {
      setBusyId(null)
    }
  }

  const follow = (person: Person) =>
    act(person, { action: "request", targetUserId: person.id }, (result) =>
      result?.mutual ? `ติดตามกันกับ ${person.name} แล้ว ส่งข้อความหากันได้เลย` : `ติดตาม ${person.name} แล้ว`,
    )
  const followBack = (person: Person) =>
    act(person, { action: "accept", requestId: person.requestId || "" }, () => `ติดตามกันกับ ${person.name} แล้ว ส่งข้อความหากันได้เลย`)
  const unfollow = (person: Person) => {
    if (!window.confirm(`เลิกติดตาม ${person.name} ใช่ไหม?`)) return
    void act(person, { action: "unfollow", targetUserId: person.id })
  }

  if (!token) {
    return (
      <Card className="rounded-[24px]">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">เข้าสู่ระบบก่อนเพื่อค้นหาและติดตามคนในคอมมูนิตี้</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ค้นหาชื่อคนในคอมมูนิตี้..."
          aria-label="ค้นหาชื่อคนในคอมมูนิตี้"
          className="h-12 rounded-full pl-11"
        />
      </div>

      {isLoading && !people.length ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : people.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {people.map((person) => {
            const busy = busyId === person.id
            return (
              <Card key={person.id} className="rounded-[20px] border-border/70">
                <CardContent className="flex items-center gap-3 p-4">
                  <Link href={`/community/friends/${person.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar className="h-11 w-11 border border-border">
                      <AvatarImage src={person.avatar || undefined} />
                      <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{person.name}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {STATUS_LABEL[person.status] ? (
                          <Badge variant={person.status === "mutual" ? "default" : "outline"} className="rounded-full px-2 py-0 text-[11px]">
                            {STATUS_LABEL[person.status]}
                          </Badge>
                        ) : null}
                        <span className="truncate text-xs text-muted-foreground">{person.favoriteTeam || person.bio || ""}</span>
                      </div>
                    </div>
                  </Link>
                  {person.status === "mutual" ? (
                    <Button asChild size="sm" className="rounded-full">
                      <Link href={person.conversationId ? `/community/messages?conversation=${person.conversationId}` : "/community/messages"}>
                        <MessageSquare className="mr-1.5 h-4 w-4" />
                        ส่งข้อความ
                      </Link>
                    </Button>
                  ) : person.status === "follower" ? (
                    <Button size="sm" className="rounded-full" disabled={busy} onClick={() => void followBack(person)}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="mr-1.5 h-4 w-4" />}
                      ติดตามกลับ
                    </Button>
                  ) : person.status === "following" ? (
                    <Button size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={() => unfollow(person)}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      กำลังติดตาม
                    </Button>
                  ) : (
                    <Button size="sm" className="rounded-full" disabled={busy} onClick={() => void follow(person)}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="mr-1.5 h-4 w-4" />}
                      ติดตาม
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="rounded-[20px]">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {debouncedQuery ? `ไม่พบชื่อที่ตรงกับ "${debouncedQuery}"` : "ยังไม่มีคนอื่นในคอมมูนิตี้"}
          </CardContent>
        </Card>
      )}

      {hasMore ? (
        <div className="flex justify-center">
          <Button variant="outline" className="rounded-full" disabled={isValidating} onClick={() => void setSize(size + 1)}>
            {isValidating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            โหลดเพิ่ม
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export default function CommunityPeoplePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto max-w-4xl px-4 py-20">
        <Link href="/community" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          กลับไปคอมมูนิตี้
        </Link>
        <h1 className="text-3xl font-bold">คนในคอมมูนิตี้</h1>
        <p className="mb-6 mt-2 text-sm text-muted-foreground">ค้นหาและติดตามคนอื่น เมื่อติดตามกันทั้งสองฝ่ายจะส่งข้อความหากันได้</p>
        <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-primary" />}>
          <PeopleDirectory />
        </Suspense>
      </main>
    </div>
  )
}
