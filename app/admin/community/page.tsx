"use client"

import { useEffect, useState } from "react"
import { CheckCircle, Eye, Flag, MessageSquare, Pin, Search, ThumbsUp, Trash2 } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchJson } from "@/lib/api-client"
import { getAuthToken } from "@/lib/auth-client"

type CommunityPostItem = {
  id: string
  title: string
  categoryLabel: string
  status: "published" | "flagged" | "hidden"
  isPinned: boolean
  likes: number
  comments: number
  views: number
  reports: number
  timeAgo: string
  author: {
    name: string
    avatar: string
  }
}

type CommunityResponse = {
  items: CommunityPostItem[]
  stats: {
    total: number
    published: number
    flagged: number
    hidden: number
  }
}

export default function AdminCommunityPage() {
  const [posts, setPosts] = useState<CommunityPostItem[]>([])
  const [stats, setStats] = useState<CommunityResponse["stats"] | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadPosts = async () => {
    const token = getAuthToken()
    if (!token) {
      setError("ไม่พบสิทธิ์แอดมิน กรุณาเข้าสู่ระบบใหม่")
      setLoading(false)
      return
    }

    const params = new URLSearchParams()
    if (searchQuery) params.set("q", searchQuery)
    if (statusFilter !== "all") params.set("status", statusFilter)

    setLoading(true)
    try {
      const response = await fetchJson<CommunityResponse>(`/admin/community?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setPosts(response.items)
      setStats(response.stats)
      setError("")
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "โหลดโพสต์คอมมูนิตี้ไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPosts()
  }, [searchQuery, statusFilter])

  const updatePost = async (id: string, payload: Record<string, unknown>) => {
    const token = getAuthToken()
    if (!token) return

    await fetchJson(`/admin/community/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
    await loadPosts()
  }

  const deletePost = async (id: string) => {
    const token = getAuthToken()
    if (!token) return

    await fetchJson(`/admin/community/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    await loadPosts()
  }

  const getStatusBadge = (status: CommunityPostItem["status"]) => {
    if (status === "published") return <Badge className="bg-emerald-500/10 text-emerald-400">เผยแพร่</Badge>
    if (status === "flagged") return <Badge className="bg-amber-500/10 text-amber-400">ถูกรายงาน</Badge>
    return <Badge className="bg-red-500/10 text-red-400">ซ่อน</Badge>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">จัดการคอมมูนิตี้</h1>
        <p className="text-muted-foreground">ดึงโพสต์จริงจาก MongoDB และจัดการสถานะได้ทันที</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "โพสต์ทั้งหมด", value: stats?.total ?? 0 },
          { label: "เผยแพร่", value: stats?.published ?? 0 },
          { label: "ถูกรายงาน", value: stats?.flagged ?? 0 },
          { label: "ซ่อน", value: stats?.hidden ?? 0 },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <p className="text-2xl font-bold">{loading ? "..." : stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ค้นหาโพสต์..." className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="published">เผยแพร่</SelectItem>
                <SelectItem value="flagged">ถูกรายงาน</SelectItem>
                <SelectItem value="hidden">ซ่อน</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>โพสต์ในระบบ</CardTitle>
          <CardDescription>โพสต์จริงที่ผู้ใช้สร้างไว้ในคอมมูนิตี้</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
          {loading
            ? Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-36 w-full" />)
            : posts.map((post) => (
                <div key={post.id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarImage src={post.author.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{post.author.name.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{post.title}</p>
                          {post.isPinned ? (
                            <Badge variant="secondary" className="gap-1">
                              <Pin className="h-3 w-3" />
                              ปักหมุด
                            </Badge>
                          ) : null}
                          {getStatusBadge(post.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {post.author.name} • {post.categoryLabel} • {post.timeAgo}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><ThumbsUp className="h-4 w-4" />{post.likes}</span>
                          <span className="flex items-center gap-1"><MessageSquare className="h-4 w-4" />{post.comments}</span>
                          <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{post.views}</span>
                          <span className="flex items-center gap-1 text-amber-400"><Flag className="h-4 w-4" />{post.reports}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="sm" onClick={() => updatePost(post.id, { isPinned: !post.isPinned })}>
                        {post.isPinned ? "เลิกปักหมุด" : "ปักหมุด"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updatePost(post.id, { status: post.status === "hidden" ? "published" : "hidden" })}
                      >
                        {post.status === "hidden" ? "เผยแพร่อีกครั้ง" : "ซ่อนโพสต์"}
                      </Button>
                      {post.status === "flagged" ? (
                        <Button variant="outline" size="sm" onClick={() => updatePost(post.id, { status: "published" })}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          อนุมัติ
                        </Button>
                      ) : null}
                      <Button variant="destructive" size="sm" onClick={() => deletePost(post.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        ลบโพสต์
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          {!loading && posts.length === 0 ? <p className="text-sm text-muted-foreground">ไม่พบโพสต์ตามเงื่อนไขที่เลือก</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}
