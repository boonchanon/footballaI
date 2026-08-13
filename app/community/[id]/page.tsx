"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import useSWR from "swr"
import { ArrowLeft, Bookmark, Clock, Eye, Flag, Loader2, MessageCircle, Pencil, Repeat2, Send, Share2, ThumbsUp, Trash2 } from "lucide-react"

import { Navigation } from "@/components/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { fetchJson } from "@/lib/api-client"
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
      "gap-2 rounded-[12px] border px-4 transition-all disabled:pointer-events-none disabled:opacity-60",
      active
        ? "border-destructive/40 bg-destructive/10 text-destructive"
        : "border-border bg-muted text-muted-foreground hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive",
    )
  }

  return cn(
    "gap-2 rounded-[12px] border px-4 transition-all disabled:pointer-events-none disabled:opacity-60",
    active
      ? "border-primary/40 bg-primary/10 text-primary"
      : "border-border bg-muted text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
  )
}

function getRepostReference(post: any) {
  if (post?.sharedItem?.type === "post" && typeof post.sharedItem.postId === "string" && post.sharedItem.postId) {
    return post.sharedItem.postId
  }

  return post?.id || ""
}

async function shareByDevice(url: string, title: string, text: string, onCopied: () => void) {
  if (navigator.share) {
    await navigator.share({ title, text, url })
    return
  }
  await navigator.clipboard.writeText(url)
  onCopied()
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
  const [sharingPost, setSharingPost] = useState(false)
  const [repostCountOffset, setRepostCountOffset] = useState(0)
  const [repostDraft, setRepostDraft] = useState("")
  const [repostComposerOpen, setRepostComposerOpen] = useState(false)

  const { data, isLoading, mutate } = useSWR(`/community/posts/${postId}`, fetchJson)
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
  const panelClass = "rounded-[12px] border border-border bg-card shadow-[0_10px_28px_rgba(0,0,0,0.10)]"
  const softPanelClass = "rounded-[12px] border border-border bg-card shadow-[0_10px_28px_rgba(0,0,0,0.08)]"

  function requireLogin(message: string) {
    if (token) return true
    toast({ title: "ต้องเข้าสู่ระบบก่อน", description: message, variant: "destructive" })
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
    if (!requireLogin("กรุณาเข้าสู่ระบบเพื่อกดถูกใจ")) return

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
      setRepostCountOffset((current) => current + 1)
      closeRepostComposer()
      setRepostCountOffset((current) => current + 1)
      closeRepostComposer()
      setRepostCountOffset((current) => current + 1)
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
        body: JSON.stringify({ reason: "off-topic", description: "รายงานจากหน้าโพสต์" }),
      })
      toast({ title: "รายงานแล้ว", description: "ระบบได้รับรายงานของคุณเรียบร้อย" })
    } finally {
      setReportingPost(false)
    }
  }

  async function handleShareLink() {
    if (!post) return
    const url = `${window.location.origin}/community/${post.id}`
    try {
      await shareByDevice(url, post.title, post.content || "", () => {
        toast({ title: "คัดลอกลิงก์แล้ว", description: "พร้อมแชร์โพสต์นี้ต่อได้เลย" })
      })
    } catch {}
  }

  function openRepostComposer() {
    if (!requireLogin("Please sign in before reposting")) return
    setRepostDraft("")
    setRepostComposerOpen(true)
  }

  function closeRepostComposer() {
    if (sharingPost) return
    setRepostComposerOpen(false)
    setRepostDraft("")
  }

  async function handleSharePostToFeed() {
    if (!requireLogin("กรุณาเข้าสู่ระบบเพื่อแชร์โพสต์ลงฟีด")) return
    if (!post) return

    try {
      const referenceId = getRepostReference(post)
      setSharingPost(true)
      await fetchJson("/community/posts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: `แชร์ต่อ: ${post.title}`,
          content: `ยกโพสต์นี้มาคุยต่อในฟีด\n\nลิงก์โพสต์: ${window.location.origin}/community/${referenceId}`,
          category: "general",
          sharedItem: {
            type: "post",
            title: post.title,
            description: post.excerpt || String(post.content || "").slice(0, 120),
            url: `${window.location.origin}/community/${referenceId}`,
            image: Array.isArray(post.images) ? post.images[0] || "" : "",
            source: post.author?.name || "",
            postId: referenceId,
          },
        }),
      })
      toast({ title: "แชร์ลงฟีดแล้ว", description: "โพสต์นี้ถูกแชร์กลับไปที่หน้าคอมมูนิตี้แล้ว" })
    } catch (error) {
      toast({
        title: "แชร์โพสต์ไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setSharingPost(false)
    }
  }

  function handleRepostNow() {
    closeRepostComposer()
    void handleSharePostToFeed()
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
    } catch (error) {
      toast({
        title: "อัปเดตโพสต์ไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    }
  }

  async function handleDeletePost() {
    if (!token || !window.confirm("ลบโพสต์นี้ใช่หรือไม่")) return

    try {
      await fetchJson(`/community/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
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
    } catch (error) {
      toast({
        title: "แก้ไขคอมเมนต์ไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!token || !window.confirm("ลบคอมเมนต์นี้ใช่หรือไม่")) return

    try {
      await fetchJson(`/community/comments/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      await mutate()
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
      <main className="container mx-auto max-w-5xl px-4 py-20">
        <Dialog open={repostComposerOpen} onOpenChange={(open) => (!open ? closeRepostComposer() : undefined)}>
          <DialogContent className="max-w-xl rounded-[18px] border-border bg-popover p-0 text-popover-foreground">
            <DialogHeader className="border-b border-border px-6 py-5">
              <DialogTitle>Repost to your feed</DialogTitle>
              <DialogDescription>Add your take before sharing this post.</DialogDescription>
            </DialogHeader>

            {post ? (
              <div className="space-y-4 px-6 py-5">
                <div className="flex items-center gap-3 rounded-[12px] border border-border bg-muted p-3">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={post.author.avatar || "/placeholder-user.jpg"} />
                    <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{post.author.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{post.categoryLabel}</p>
                  </div>
                </div>

                <Textarea
                  value={repostDraft}
                  onChange={(event) => setRepostDraft(event.target.value)}
                  placeholder="Add your thoughts about this post..."
                  className="min-h-28 resize-none rounded-[12px] border-border bg-input-background"
                />

                <div className="overflow-hidden rounded-[12px] border border-border bg-muted">
                  {Array.isArray(post.images) && post.images[0] ? (
                    <div className="relative h-52 border-b border-border">
                      <Image src={post.images[0]} alt={post.title} fill className="object-cover" unoptimized />
                    </div>
                  ) : null}
                  <div className="space-y-3 p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={post.author.avatar || "/placeholder-user.jpg"} />
                        <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{post.author.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{post.timeAgo}</p>
                      </div>
                    </div>
                    <div>
                      <p className="line-clamp-2 text-base font-semibold">{post.title}</p>
                      <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted-foreground">{post.content}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <DialogFooter className="border-t border-border px-6 py-5 sm:justify-between">
              <Button variant="outline" onClick={closeRepostComposer} disabled={sharingPost} className="rounded-[12px]">
                Cancel
              </Button>
              <Button onClick={handleRepostNow} disabled={sharingPost || !post} className="rounded-[12px] px-6">
                {sharingPost ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Repeat2 className="mr-2 h-4 w-4" />}
                Repost now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Link href="/community" className="mb-6 inline-flex h-10 items-center gap-2 rounded-[12px] border border-border bg-card px-4 text-sm text-muted-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          กลับไปหน้าคอมมูนิตี้
        </Link>

        {isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : post ? (
          <div className="space-y-6">
            <Card className={cn("overflow-hidden", panelClass)}>
              {Array.isArray(post.images) && post.images.length > 0 ? (
                <div className={cn("grid gap-2 border-b border-border p-2", post.images.length > 1 ? "md:grid-cols-2" : "grid-cols-1")}>
                  {post.images.map((image: string, index: number) => (
                    <div key={`${image}-${index}`} className="relative h-72 overflow-hidden rounded-[12px]">
                      <Image src={image} alt={`${post.title}-${index + 1}`} fill className="object-cover" unoptimized />
                    </div>
                  ))}
                </div>
              ) : null}

              <CardHeader className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{post.categoryLabel}</Badge>
                  {post.isPinned ? <Badge variant="secondary">ปักหมุด</Badge> : null}
                  {isPostOwner ? <Badge variant="secondary">โพสต์ของคุณ</Badge> : null}
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
                    <Textarea value={postForm.content} onChange={(event) => setPostForm((prev) => ({ ...prev, content: event.target.value }))} className="min-h-32" />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setEditingPost(false)}>
                        ยกเลิก
                      </Button>
                      <Button onClick={handleUpdatePost}>บันทึกการแก้ไข</Button>
                    </div>
                  </div>
                ) : (
                  <CardTitle className="text-3xl">{post.title}</CardTitle>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <Link href={`/community/friends/${post.author.id}`} className="flex items-center gap-2 hover:text-foreground">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={post.author.avatar || "/placeholder-user.jpg"} />
                      <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>{post.author.name}</span>
                  </Link>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {post.timeAgo}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {post.views}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {!editingPost ? <p className="whitespace-pre-wrap leading-8">{post.content}</p> : null}

                {post.sharedItem?.type === "post" ? (
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary/80">reposted by {post.author.name}</p>
                ) : null}

                {post.sharedItem?.title ? (
                  <a
                    href={post.sharedItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-[12px] border border-border bg-muted p-3 transition hover:bg-accent-soft"
                  >
                    {post.sharedItem.image ? (
                      <div className="relative h-20 w-28 overflow-hidden rounded-[12px]">
                        <Image src={post.sharedItem.image} alt={post.sharedItem.title} fill className="object-cover" unoptimized />
                      </div>
                    ) : null}
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {post.sharedItem.type === "post" ? `Reposted from ${post.sharedItem.source || "community"}` : post.sharedItem.source || "Shared item"}
                      </p>
                      <p className="line-clamp-2 text-sm font-medium">{post.sharedItem.title}</p>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">{post.sharedItem.url}</p>
                    </div>
                  </a>
                ) : null}

                <div className="flex flex-wrap gap-3 border-t border-border pt-4">
                  <Button variant="outline" onClick={handleLike} disabled={liking} className={actionButtonClass(post.isLiked)}>
                    {liking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className={cn("h-4 w-4", post.isLiked && "fill-current")} />}
                    {post.likes}
                  </Button>

                  <div className={actionButtonClass(false)}>
                    <Repeat2 className="h-4 w-4" />
                    {(post.reposts ?? 0) + repostCountOffset} Reposts
                  </div>

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

                  <Button variant="outline" onClick={handleShareLink} className={actionButtonClass(false)}>
                    <Share2 className="h-4 w-4" />
                    Share link
                  </Button>

                  <Button variant="outline" onClick={openRepostComposer} disabled={sharingPost} className={actionButtonClass(false)}>
                    {sharingPost ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat2 className="h-4 w-4" />}
                    แชร์ลงฟีด
                  </Button>

                  {isPostOwner && !editingPost ? (
                    <>
                      <Button variant="outline" onClick={startEditPost} className="gap-2 rounded-[12px]">
                        <Pencil className="h-4 w-4" />
                        แก้ไข
                      </Button>
                      <Button variant="destructive" onClick={handleDeletePost} className="gap-2 rounded-[12px]">
                        <Trash2 className="h-4 w-4" />
                        ลบโพสต์
                      </Button>
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card className={softPanelClass}>
              <CardHeader>
                <CardTitle className="text-lg">แสดงความคิดเห็น</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea placeholder="พิมพ์ความคิดเห็นของคุณ..." value={comment} onChange={(event) => setComment(event.target.value)} className="min-h-24" />
                <div className="flex justify-end">
                  <Button onClick={handleComment} disabled={submitting} className="gap-2">
                    <Send className="h-4 w-4" />
                    {submitting ? "กำลังส่ง..." : "ส่งความคิดเห็น"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className={softPanelClass}>
              <CardHeader>
                <CardTitle className="text-lg">ความคิดเห็นทั้งหมด</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {comments.length > 0 ? (
                  comments.map((item: any) => (
                    <div key={item.id} className="flex gap-3 rounded-[12px] border border-border bg-muted p-4">
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
                              <Button size="sm" variant="outline" className="rounded-[12px]" onClick={() => setEditingCommentId(null)}>
                                ยกเลิก
                              </Button>
                              <Button size="sm" className="rounded-[12px]" onClick={() => handleUpdateComment(item.id)}>
                                บันทึก
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm leading-6 text-muted-foreground">{item.content}</p>
                            {user?.id === item.user.id ? (
                              <div className="mt-2 flex gap-2">
                                <Button size="sm" variant="outline" className="rounded-[12px]" onClick={() => startEditComment(item)}>
                                  แก้ไข
                                </Button>
                                <Button size="sm" variant="destructive" className="rounded-[12px]" onClick={() => handleDeleteComment(item.id)}>
                                  ลบ
                                </Button>
                              </div>
                            ) : null}
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
          <Card className={softPanelClass}>
            <CardContent className="py-12 text-center text-muted-foreground">ไม่พบโพสต์นี้</CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
