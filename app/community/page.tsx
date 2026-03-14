"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import {
  Bookmark,
  Flag,
  MessageSquare,
  ThumbsUp,
  MessageCircle,
  Plus,
  Clock,
  Eye,
  Users,
  Flame,
  Search,
  Pin,
  Send,
} from "lucide-react"

import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { backendFetcher, fetchJson } from "@/lib/api-client"
import { getAuthToken, getAuthSession } from "@/lib/auth-client"

type CommunityPost = {
  id: string
  title: string
  excerpt: string
  category: string
  categoryLabel: string
  likes: number
  comments: number
  views: number
  timeAgo: string
  isPinned: boolean
  isHot: boolean
  isLiked: boolean
  author: {
    id: string
    name: string
    avatar: string
  }
}

const categories = [
  { id: "all", label: "ทั้งหมด" },
  { id: "match-discussion", label: "วิเคราะห์แมตช์" },
  { id: "transfer-rumors", label: "ข่าวย้ายทีม" },
  { id: "player-discussion", label: "พูดคุยนักเตะ" },
  { id: "predictions", label: "ทายผล" },
  { id: "general", label: "ทั่วไป" },
]

export default function CommunityPage() {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [category, setCategory] = useState("general")
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const query = useMemo(() => {
    const params = new URLSearchParams()
    params.set("limit", "20")
    if (selectedCategory !== "all") params.set("category", selectedCategory)
    if (searchQuery.trim()) params.set("q", searchQuery.trim())
    return `/community/posts?${params.toString()}`
  }, [searchQuery, selectedCategory])

  const { data, isLoading, mutate } = useSWR(query, backendFetcher)

  const posts: CommunityPost[] = data?.items || []
  const stats = data?.stats || { total: 0 }
  const session = getAuthSession()

  async function savePost(post: CommunityPost) {
    const token = getAuthToken()
    if (!token) {
      toast({ title: "ต้องเข้าสู่ระบบก่อน", description: "กรุณาเข้าสู่ระบบเพื่อบันทึกโพสต์", variant: "destructive" })
      return
    }

    try {
      await fetchJson("/favorites", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          itemType: "post",
          itemId: post.id,
          title: post.title,
          subtitle: post.categoryLabel,
          meta: { route: `/community/${post.id}` },
        }),
      })
      toast({ title: "บันทึกโพสต์แล้ว", description: "เพิ่มโพสต์นี้ไว้ในรายการที่บันทึกแล้ว" })
    } catch (error) {
      toast({
        title: "บันทึกโพสต์ไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    }
  }

  async function reportPost(postId: string) {
    const token = getAuthToken()
    if (!token) {
      toast({ title: "ต้องเข้าสู่ระบบก่อน", description: "กรุณาเข้าสู่ระบบเพื่อรายงานโพสต์", variant: "destructive" })
      return
    }

    try {
      await fetchJson(`/community/posts/${postId}/report`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: "off-topic", description: "รายงานจากหน้า community" }),
      })
      toast({ title: "รายงานโพสต์แล้ว", description: "ระบบได้รับรายงานของคุณเรียบร้อย" })
      await mutate()
    } catch (error) {
      toast({
        title: "รายงานโพสต์ไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    }
  }

  async function handleCreatePost() {
    const token = getAuthToken()
    if (!token) {
      toast({ title: "ต้องเข้าสู่ระบบก่อน", description: "กรุณาเข้าสู่ระบบเพื่อสร้างโพสต์", variant: "destructive" })
      return
    }
    if (!title.trim() || !content.trim()) {
      toast({ title: "ข้อมูลไม่ครบ", description: "กรุณากรอกหัวข้อและเนื้อหา", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      await fetchJson("/community/posts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, content, category }),
      })
      setTitle("")
      setContent("")
      setCategory("general")
      setShowCreatePost(false)
      await mutate()
      toast({ title: "โพสต์สำเร็จ", description: "กระทู้ของคุณถูกเผยแพร่แล้ว" })
    } catch (error) {
      toast({
        title: "โพสต์ไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLike(postId: string) {
    const token = getAuthToken()
    if (!token) {
      toast({ title: "ต้องเข้าสู่ระบบก่อน", description: "กรุณาเข้าสู่ระบบเพื่อกดไลก์", variant: "destructive" })
      return
    }

    try {
      await fetchJson(`/community/posts/${postId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      await mutate()
    } catch (error) {
      toast({
        title: "ไม่สามารถกดไลก์ได้",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="border-b border-border/50 pb-8 pt-20">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <Badge variant="outline" className="text-xs font-normal">
                  <span className="mr-1.5 h-2 w-2 rounded-full bg-green-500" />
                  ชุมชนออนไลน์
                </Badge>
              </div>
              <h1 className="mb-2 text-4xl font-bold md:text-5xl">ชุมชนแฟนบอล</h1>
              <p className="text-lg text-muted-foreground">โพสต์ วิเคราะห์ และคุยกับแฟนบอลคนอื่นแบบสด ๆ</p>
            </div>

            <div className="flex gap-3">
              <div className="rounded-xl border border-border/50 bg-card/50 px-4 py-2 text-center">
                <div className="text-xl font-bold text-primary">{stats.total || 0}</div>
                <div className="text-xs text-muted-foreground">โพสต์</div>
              </div>
              <div className="rounded-xl border border-border/50 bg-card/50 px-4 py-2 text-center">
                <div className="text-xl font-bold text-primary">{session ? "MEMBER" : "GUEST"}</div>
                <div className="text-xs text-muted-foreground">สถานะ</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ค้นหากระทู้หรือหัวข้อ..."
                className="bg-card/50 pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={() => setShowCreatePost((value) => !value)} className="gap-2">
              <Plus className="h-4 w-4" />
              สร้างกระทู้ใหม่
            </Button>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="space-y-6 lg:col-span-3">
            {showCreatePost && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">สร้างกระทู้ใหม่</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {categories.slice(1).map((item) => (
                      <Button
                        key={item.id}
                        variant={category === item.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCategory(item.id)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                  <Input placeholder="หัวข้อกระทู้..." value={title} onChange={(e) => setTitle(e.target.value)} />
                  <Textarea
                    placeholder="เขียนสิ่งที่อยากคุยกับชุมชน..."
                    className="min-h-28 resize-none"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreatePost(false)}>
                      ยกเลิก
                    </Button>
                    <Button onClick={handleCreatePost} disabled={submitting} className="gap-2">
                      <Send className="h-4 w-4" />
                      {submitting ? "กำลังโพสต์..." : "โพสต์"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {categories.map((item) => (
                <Button
                  key={item.id}
                  variant={selectedCategory === item.id ? "default" : "outline"}
                  onClick={() => setSelectedCategory(item.id)}
                  className="rounded-full whitespace-nowrap"
                  size="sm"
                >
                  {item.label}
                </Button>
              ))}
            </div>

            <div className="space-y-3">
              {posts.map((post) => (
                <Card
                  key={post.id}
                  className={`border-border/50 transition-all hover:border-primary/30 hover:shadow-md ${
                    post.isPinned ? "border-primary/50 bg-primary/5" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <Avatar className="hidden h-12 w-12 ring-2 ring-border sm:block">
                        <AvatarImage src={post.author.avatar || "/placeholder-user.jpg"} />
                        <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{post.author.name}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {post.categoryLabel}
                          </Badge>
                          {post.isPinned && (
                            <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0">
                              <Pin className="h-2.5 w-2.5" />
                              ปักหมุด
                            </Badge>
                          )}
                          {post.isHot && (
                            <Badge className="bg-red-500/10 text-[10px] text-red-500">
                              <Flame className="mr-1 h-2.5 w-2.5" />
                              Hot
                            </Badge>
                          )}
                        </div>

                        <Link href={`/community/${post.id}`}>
                          <h3 className="mb-1.5 text-base font-semibold transition-colors hover:text-primary md:text-lg">
                            {post.title}
                          </h3>
                        </Link>
                        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm">
                            <button
                              onClick={() => handleLike(post.id)}
                              className={`flex items-center gap-1.5 transition-colors ${
                                post.isLiked ? "text-primary" : "text-muted-foreground hover:text-primary"
                              }`}
                            >
                              <ThumbsUp className="h-4 w-4" />
                              <span>{post.likes}</span>
                            </button>
                            <Link
                              href={`/community/${post.id}`}
                              className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
                            >
                              <MessageCircle className="h-4 w-4" />
                              <span>{post.comments}</span>
                            </Link>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Eye className="h-4 w-4" />
                              <span>{post.views}</span>
                            </div>
                            <button
                              onClick={() => savePost(post)}
                              className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
                            >
                              <Bookmark className="h-4 w-4" />
                              <span>บันทึก</span>
                            </button>
                            <button
                              onClick={() => reportPost(post.id)}
                              className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-destructive"
                            >
                              <Flag className="h-4 w-4" />
                              <span>รายงาน</span>
                            </button>
                          </div>

                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {post.timeAgo}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {!isLoading && posts.length === 0 && (
                <Card className="border-dashed border-2 border-border/50">
                  <CardContent className="py-16 text-center">
                    <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
                    <h3 className="mb-2 text-lg font-semibold text-muted-foreground">ยังไม่พบกระทู้</h3>
                    <p className="mb-4 text-sm text-muted-foreground">ลองเปลี่ยนหมวดหรือสร้างโพสต์ใหม่</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">เริ่มใช้งานชุมชน</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>โพสต์วิเคราะห์แมตช์ ข่าวย้ายทีม หรือแลกเปลี่ยนความคิดเห็นกับแฟนบอลคนอื่น</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4 text-primary" />
                    <span>กดไลก์โพสต์ที่ชอบ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-primary" />
                    <span>คอมเมนต์ในโพสต์ได้</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pin className="h-4 w-4 text-primary" />
                    <span>แอดมินปักหมุดโพสต์เด่นได้</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
