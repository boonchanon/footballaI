"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import useSWR from "swr"
import { ArrowLeft, Bookmark, Clock, Eye, Flag, Loader2, MessageCircle, Send, ThumbsUp } from "lucide-react"

import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { backendFetcher, fetchJson } from "@/lib/api-client"
import { getAuthToken } from "@/lib/auth-client"

export default function CommunityPostDetailPage() {
  const params = useParams()
  const postId = params.id as string
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const { data, isLoading, mutate } = useSWR(`/community/posts/${postId}`, backendFetcher)
  const post = data?.item
  const comments = data?.comments || []

  async function handleLike() {
    const token = getAuthToken()
    if (!token) {
      toast({ title: "ต้องเข้าสู่ระบบก่อน", description: "กรุณาเข้าสู่ระบบเพื่อกดไลก์", variant: "destructive" })
      return
    }
    await fetchJson(`/community/posts/${postId}/like`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
    await mutate()
  }

  async function handleComment() {
    const token = getAuthToken()
    if (!token) {
      toast({ title: "ต้องเข้าสู่ระบบก่อน", description: "กรุณาเข้าสู่ระบบเพื่อคอมเมนต์", variant: "destructive" })
      return
    }
    if (!comment.trim()) return

    setSubmitting(true)
    try {
      await fetchJson(`/community/posts/${postId}/comments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: comment }),
      })
      setComment("")
      await mutate()
    } catch (error) {
      toast({
        title: "คอมเมนต์ไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSavePost() {
    const token = getAuthToken()
    if (!token || !post) {
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
      toast({ title: "บันทึกโพสต์แล้ว", description: "เพิ่มโพสต์นี้ในรายการที่บันทึกแล้ว" })
    } catch (error) {
      toast({
        title: "บันทึกโพสต์ไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    }
  }

  async function handleReportPost() {
    const token = getAuthToken()
    if (!token) {
      toast({ title: "ต้องเข้าสู่ระบบก่อน", description: "กรุณาเข้าสู่ระบบเพื่อรายงานโพสต์", variant: "destructive" })
      return
    }

    try {
      await fetchJson(`/community/posts/${postId}/report`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: "off-topic", description: "รายงานจากหน้ารายละเอียดโพสต์" }),
      })
      toast({ title: "รายงานโพสต์แล้ว", description: "ระบบได้รับรายงานของคุณเรียบร้อย" })
    } catch (error) {
      toast({
        title: "รายงานโพสต์ไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto max-w-4xl px-4 py-20">
        <Link href="/community" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          กลับไปหน้าชุมชน
        </Link>

        {isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : post ? (
          <div className="space-y-6">
            <Card className="border-border/50">
              <CardHeader className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{post.categoryLabel}</Badge>
                  {post.isPinned && <Badge variant="secondary">ปักหมุด</Badge>}
                </div>
                <CardTitle className="text-2xl">{post.title}</CardTitle>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={post.author.avatar || "/placeholder-user.jpg"} />
                      <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>{post.author.name}</span>
                  </div>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {post.timeAgo}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {post.views}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="whitespace-pre-wrap leading-7">{post.content}</p>
                <div className="flex flex-wrap items-center gap-3 border-t border-border/50 pt-4">
                  <Button variant={post.isLiked ? "default" : "outline"} onClick={handleLike} className="gap-2">
                    <ThumbsUp className="h-4 w-4" />
                    {post.likes}
                  </Button>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MessageCircle className="h-4 w-4" />
                    {post.comments} ความคิดเห็น
                  </div>
                  <Button variant="outline" onClick={handleSavePost} className="gap-2">
                    <Bookmark className="h-4 w-4" />
                    บันทึก
                  </Button>
                  <Button variant="outline" onClick={handleReportPost} className="gap-2">
                    <Flag className="h-4 w-4" />
                    รายงาน
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">แสดงความคิดเห็น</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="พิมพ์ความคิดเห็นของคุณ..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-24"
                />
                <div className="flex justify-end">
                  <Button onClick={handleComment} disabled={submitting} className="gap-2">
                    <Send className="h-4 w-4" />
                    {submitting ? "กำลังส่ง..." : "ส่งความคิดเห็น"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">ความคิดเห็นทั้งหมด</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {comments.length > 0 ? (
                  comments.map((item: any) => (
                    <div key={item.id} className="flex gap-3 border-b border-border/30 pb-4 last:border-b-0">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={item.user.avatar || "/placeholder-user.jpg"} />
                        <AvatarFallback>{item.user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-medium">{item.user.name}</span>
                          <span className="text-xs text-muted-foreground">{item.timeAgo}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.content}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">ยังไม่มีความคิดเห็น</p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center text-muted-foreground">ไม่พบโพสต์นี้</CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
