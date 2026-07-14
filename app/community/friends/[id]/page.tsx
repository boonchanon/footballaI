"use client"

import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import useSWR from "swr"
import { ArrowLeft, Loader2, MessageSquare, UserPlus, Users } from "lucide-react"

import { Navigation } from "@/components/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { fetchJson } from "@/lib/api-client"
import { useAuthSession } from "@/hooks/use-auth-session"

function authFetcher<T>(path: string, token: string) {
  return fetchJson<T>(path, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export default function FriendProfilePage() {
  const params = useParams()
  const userId = params.id as string
  const { token } = useAuthSession()
  const { toast } = useToast()

  const { data, isLoading, mutate } = useSWR(
    token ? [`/community/friends/${userId}`, token] : null,
    ([url, authToken]) => authFetcher<{
      profile: { id: string; name: string; avatar: string; favoriteTeam: string; bio: string }
      relationship: { isSelf: boolean; isFriend: boolean; hasPendingRequest: boolean; requestDirection: "incoming" | "outgoing" | null; requestId: string | null }
      posts: Array<{ id: string; title: string; excerpt: string; timeAgo: string; categoryLabel: string; images?: string[]; likes: number; comments: number }>
    }>(url, authToken),
  )

  async function sendFriendRequest() {
    if (!token) return
    try {
      await fetchJson("/community/friends", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "request", targetUserId: userId }),
      })
      await mutate()
    } catch (error) {
      toast({ title: "ส่งคำขอไม่สำเร็จ", description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด", variant: "destructive" })
    }
  }

  async function handleRequest(action: "accept" | "decline") {
    if (!token || !data?.relationship.requestId) return
    try {
      await fetchJson("/community/friends", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, requestId: data.relationship.requestId }),
      })
      await mutate()
    } catch (error) {
      toast({ title: "อัปเดตคำขอไม่สำเร็จ", description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด", variant: "destructive" })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto max-w-6xl px-4 py-20">
        <Link href="/community" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          กลับไปคอมมูนิตี้
        </Link>

        {!token ? (
          <Card className="rounded-[28px] border-border/60 bg-card/80">
            <CardContent className="py-16 text-center">
              <p className="text-sm text-muted-foreground">เข้าสู่ระบบก่อนเพื่อดูโปรไฟล์เพื่อน</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            <Card className="overflow-hidden rounded-[28px] border-border/60 bg-card/80">
              <CardContent className="p-0">
                <div className="bg-[radial-gradient(circle_at_left_top,rgba(184,255,0,0.18),transparent_34%),linear-gradient(120deg,rgba(255,255,255,0.02),rgba(255,255,255,0.06))] px-6 py-8">
                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-24 w-24 border-4 border-background/70">
                        <AvatarImage src={data.profile.avatar || "/placeholder-user.jpg"} />
                        <AvatarFallback>{data.profile.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h1 className="text-3xl font-bold">{data.profile.name}</h1>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {data.profile.favoriteTeam ? <Badge variant="outline">{data.profile.favoriteTeam}</Badge> : null}
                          {data.relationship.isFriend ? <Badge className="bg-primary/15 text-primary hover:bg-primary/15">เพื่อนแล้ว</Badge> : null}
                        </div>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{data.profile.bio || "ยังไม่มีคำอธิบายโปรไฟล์"}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {data.relationship.isFriend ? (
                        <Link href="/community/messages">
                          <Button className="rounded-2xl">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            ไปที่แชต
                          </Button>
                        </Link>
                      ) : data.relationship.hasPendingRequest ? (
                        data.relationship.requestDirection === "incoming" ? (
                          <>
                            <Button className="rounded-2xl" onClick={() => handleRequest("accept")}>
                              <Users className="mr-2 h-4 w-4" />
                              รับเป็นเพื่อน
                            </Button>
                            <Button variant="outline" className="rounded-2xl" onClick={() => handleRequest("decline")}>
                              ปฏิเสธ
                            </Button>
                          </>
                        ) : (
                          <Button variant="outline" className="rounded-2xl" disabled>
                            ส่งคำขอแล้ว
                          </Button>
                        )
                      ) : !data.relationship.isSelf ? (
                        <Button className="rounded-2xl" onClick={sendFriendRequest}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          เพิ่มเพื่อน
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.posts.map((post) => (
                <Card key={post.id} className="overflow-hidden rounded-[24px] border-border/60 bg-card/80">
                  {post.images?.[0] ? (
                    <div className="relative h-48">
                      <Image src={post.images[0]} alt={post.title} fill className="object-cover" unoptimized />
                    </div>
                  ) : null}
                  <CardContent className="p-5">
                    <Badge variant="outline">{post.categoryLabel}</Badge>
                    <Link href={`/community/${post.id}`} className="mt-3 block text-lg font-semibold hover:text-primary">
                      {post.title}
                    </Link>
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{post.timeAgo}</span>
                      <span>{post.likes} ถูกใจ • {post.comments} คอมเมนต์</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="rounded-[28px] border-border/60 bg-card/80">
            <CardContent className="py-16 text-center">
              <p className="text-sm text-muted-foreground">ไม่พบโปรไฟล์นี้</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
