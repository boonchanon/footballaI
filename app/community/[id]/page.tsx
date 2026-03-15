"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import useSWR from "swr"
import { ArrowLeft, Bookmark, Clock, Eye, Flag, Loader2, MessageCircle, Pencil, Send, ThumbsUp, Trash2 } from "lucide-react"

import { Navigation } from "@/components/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { backendFetcher, fetchJson } from "@/lib/api-client"
import { useAuthSession } from "@/hooks/use-auth-session"
import { cn } from "@/lib/utils"

const categories = [
  { id: "match-discussion", label: "วิเคราะห์แมตช์" },
  { id: "transfer-rumors", label: "ข่าวย้ายทีม" },
  { id: "player-discussion", label: "พูดคุยนักเตะ" },
  { id: "predictions", label: "ทายผล" },
  { id: "general", label: "ทั่วไป" },
]

type FavoriteItem = {
  itemId: string
  itemType: string
}

function actionButtonClass(active = false, tone: "primary" | "danger" = "primary") {
  if (tone === "danger") {
    return cn(
      "gap-2 rounded-full border px-4 transition-all disabled:pointer-events-none disabled:opacity-60",
      active
        ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15"
        : "border-border/60 bg-background text-muted-foreground hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive",
    )
  }

  return cn(
    "gap-2 rounded-full border px-4 transition-all disabled:pointer-events-none disabled:opacity-60",
    active
      ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
      : "border-border/60 bg-background text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
  )
}

export default function CommunityPostDetailPage() {
  const params = useParams()
  const postId = params.id as string
  const { toast } = useToast()
  const { token, user } = useAuthSession()

  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [editingPost, setEditingPost] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [postForm, setPostForm] = useState({ title: "", content: "", category: "general" })
  const [commentForm, setCommentForm] = useState("")
  const [liking, setLiking] = useState(false)
  const [savingPost, setSavingPost] = useState(false)
  const [reportingPost, setReportingPost] = useState(false)

  const { data, isLoading, mutate } = useSWR(`/community/posts/${postId}`, backendFetcher)
  const { data: favoritesData, mutate: mutateFavorites } = useSWR(
    token ? ["/favorites", token] : null,
    ([url, authToken]) =>
      fetchJson<{ items: FavoriteItem[] }>(url, {
        headers: { Authorization: `Bearer ${authToken}` },
      }),
  )

  const post = data?.item
  const comments = data?.comments || []
  const isPostOwner = Boolean(user && post?.author?.id === user.id)
  const isSaved = useMemo(
    () => (favoritesData?.items || []).some((item) => item.itemType === "post" && item.itemId === post?.id),
    [favoritesData?.items, post?.id],
  )

  function requireLogin(message: string) {
    if (token) return true
    toast({
      title: "ต้องเข้าสู่ระบบก่อน",
      description: message,
      variant: "destructive",
    })
    return false
  }

  function startEditPost() {
    if (!post) return
    setPostForm({
      title: post.title || "",
      content: post.content || "",
      category: post.category || "general",
    })
    setEditingPost(true)
  }

  async function handleLike() {
    if (!requireLogin("กรุณาเข้าสู่ระบบเพื่อกดไลก์")) return

    try {
      setLiking(true)
      const result = await fetchJson<{ liked: boolean; likes: number }>(`/community/posts/${postId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })

      await mutate(
        (current: any) =>
          current
            ? {
                ...current,
                item: {
                  ...current.item,
                  isLiked: result.liked,
                  likes: result.likes,
                },
              }
            : current,
        false,
      )
    } catch (error) {
      toast({
        title: "ไม่สามารถกดไลก์ได้",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setLiking(false)
    }
  }

  async function handleComment() {
    if (!requireLogin("กรุณาเข้าสู่ระบบเพื่อคอมเมนต์")) return
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
    if (!requireLogin("กรุณาเข้าสู่ระบบเพื่อบันทึกโพสต์")) return
    if (!post) return

    try {
      setSavingPost(true)
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
      await mutateFavorites()
      toast({
        title: "บันทึกโพสต์แล้ว",
        description: "เพิ่มโพสต์นี้ในรายการที่บันทึกแล้ว",
      })
    } catch (error) {
      toast({
        title: "บันทึกโพสต์ไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setSavingPost(false)
    }
  }

  async function handleReportPost() {
    if (!requireLogin("กรุณาเข้าสู่ระบบเพื่อรายงานโพสต์")) return

    try {
      setReportingPost(true)
      await fetchJson(`/community/posts/${postId}/report`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          reason: "off-topic",
          description: "รายงานจากหน้ารายละเอียดโพสต์",
        }),
      })
      toast({
        title: "รายงานโพสต์แล้ว",
        description: "ระบบได้รับรายงานของคุณเรียบร้อย",
      })
    } catch (error) {
      toast({
        title: "รายงานโพสต์ไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setReportingPost(false)
    }
  }

  async function handleUpdatePost() {
    if (!token) return

    try {
      await fetchJson(`/community/posts/${postId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(postForm),
      })
      setEditingPost(false)
      await mutate()
      toast({
        title: "อัปเดตโพสต์แล้ว",
        description: "แก้ไขโพสต์เรียบร้อย",
      })
    } catch (error) {
      toast({
        title: "อัปเดตโพสต์ไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    }
  }

  async function handleDeletePost() {
    if (!token) return
    if (!window.confirm("ลบโพสต์นี้ใช่หรือไม่")) return

    try {
      await fetchJson(`/community/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      toast({
        title: "ลบโพสต์แล้ว",
        description: "โพสต์ถูกลบเรียบร้อย",
      })
      window.location.href = "/community"
    } catch (error) {
      toast({
        title: "ลบโพสต์ไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    }
  }

  function startEditComment(item: any) {
    setEditingCommentId(item.id)
    setCommentForm(item.content)
  }

  async function handleUpdateComment(commentId: string) {
    if (!token) return

    try {
      await fetchJson(`/community/comments/${commentId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: commentForm }),
      })
      setEditingCommentId(null)
      setCommentForm("")
      await mutate()
      toast({
        title: "อัปเดตคอมเมนต์แล้ว",
        description: "แก้ไขความคิดเห็นเรียบร้อย",
      })
    } catch (error) {
      toast({
        title: "อัปเดตคอมเมนต์ไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!token) return
    if (!window.confirm("ลบคอมเมนต์นี้ใช่หรือไม่")) return

    try {
      await fetchJson(`/community/comments/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      await mutate()
      toast({
        title: "ลบคอมเมนต์แล้ว",
        description: "ความคิดเห็นถูกลบเรียบร้อย",
      })
    } catch (error) {
      toast({
        title: "ลบคอมเมนต์ไม่สำเร็จ",
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
                  {isPostOwner && <Badge variant="secondary">โพสต์ของคุณ</Badge>}
                </div>

                {editingPost ? (
                  <div className="space-y-3">
                    <Input value={postForm.title} onChange={(event) => setPostForm((prev) => ({ ...prev, title: event.target.value }))} />
                    <div className="flex flex-wrap gap-2">
                      {categories.map((item) => (
                        <Button
                          key={item.id}
                          type="button"
                          size="sm"
                          variant={postForm.category === item.id ? "default" : "outline"}
                          onClick={() => setPostForm((prev) => ({ ...prev, category: item.id }))}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>
                    <Textarea
                      value={postForm.content}
                      onChange={(event) => setPostForm((prev) => ({ ...prev, content: event.target.value }))}
                      className="min-h-32"
                    />
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" onClick={() => setEditingPost(false)}>
                        ยกเลิก
                      </Button>
                      <Button onClick={handleUpdatePost}>บันทึกการแก้ไข</Button>
                    </div>
                  </div>
                ) : (
                  <CardTitle className="text-2xl">{post.title}</CardTitle>
                )}

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
                {!editingPost && <p className="whitespace-pre-wrap leading-7">{post.content}</p>}
                <div className="flex flex-wrap items-center gap-3 border-t border-border/50 pt-4">
                  <Button variant="outline" onClick={handleLike} disabled={liking} className={actionButtonClass(post.isLiked)}>
                    {liking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className={cn("h-4 w-4", post.isLiked && "fill-current")} />}
                    {post.likes}
                  </Button>

                  <div className={actionButtonClass(false)}>
                    <MessageCircle className="h-4 w-4" />
                    {post.comments} ความคิดเห็น
                  </div>

                  <Button variant="outline" onClick={handleSavePost} disabled={savingPost} className={actionButtonClass(isSaved)}>
                    {savingPost ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />}
                    {isSaved ? "บันทึกแล้ว" : "บันทึก"}
                  </Button>

                  <Button variant="outline" onClick={handleReportPost} disabled={reportingPost} className={actionButtonClass(false, "danger")}>
                    {reportingPost ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                    รายงาน
                  </Button>

                  {isPostOwner && !editingPost && (
                    <>
                      <Button variant="outline" onClick={startEditPost} className="gap-2">
                        <Pencil className="h-4 w-4" />
                        แก้ไข
                      </Button>
                      <Button variant="destructive" onClick={handleDeletePost} className="gap-2">
                        <Trash2 className="h-4 w-4" />
                        ลบโพสต์
                      </Button>
                    </>
                  )}
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
                  onChange={(event) => setComment(event.target.value)}
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

                        {editingCommentId === item.id ? (
                          <div className="space-y-2">
                            <Textarea value={commentForm} onChange={(event) => setCommentForm(event.target.value)} className="min-h-20" />
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" onClick={() => setEditingCommentId(null)}>
                                ยกเลิก
                              </Button>
                              <Button size="sm" onClick={() => handleUpdateComment(item.id)}>
                                บันทึก
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-muted-foreground">{item.content}</p>
                            {user?.id === item.user.id && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Button size="sm" variant="outline" onClick={() => startEditComment(item)} className="gap-2">
                                  <Pencil className="h-3.5 w-3.5" />
                                  แก้ไข
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteComment(item.id)} className="gap-2">
                                  <Trash2 className="h-3.5 w-3.5" />
                                  ลบ
                                </Button>
                              </div>
                            )}
                          </>
                        )}
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
