"use client"

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import { ArrowLeft, Bell, Home, ImagePlus, Loader2, MessageSquare, Newspaper, Search, Send, X } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { fetchJson } from "@/lib/api-client"
import { useAuthSession } from "@/hooks/use-auth-session"
import { cn } from "@/lib/utils"

type SocialUser = {
  id: string
  name: string
  avatar: string
  favoriteTeam: string
  bio: string
}

type Conversation = {
  id: string
  user: SocialUser
  lastMessageText: string
  timeAgo: string
  unreadCount?: number
  hasUnread?: boolean
  preview?: {
    id: string
    content: string
    sender: SocialUser
  } | null
}

type Message = {
  id: string
  content: string
  images?: string[]
  sharedItem?: {
    type: string
    title: string
    description?: string
    url: string
    image: string
    source: string
    postId?: string
  } | null
  timeAgo: string
  readByCount?: number
  seenByRecipient?: boolean
  seenAt?: string | null
  seenTimeAgo?: string
  sender: SocialUser
}

function socialFetcher<T>(path: string, token: string) {
  return fetchJson<T>(path, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export default function CommunityMessagesPage() {
  const searchParams = useSearchParams()
  const preferredConversation = searchParams.get("conversation")
  const { token, user } = useAuthSession()
  const { toast } = useToast()

  const [activeConversationId, setActiveConversationId] = useState<string | null>(preferredConversation)
  const [messageDraft, setMessageDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [attachedImages, setAttachedImages] = useState<string[]>([])
  const [conversationQuery, setConversationQuery] = useState("")
  const unreadSnapshotRef = useRef("")

  const pendingSharedItem = useMemo(() => {
    const shareType = searchParams.get("shareType")
    const shareTitle = searchParams.get("shareTitle")
    const shareUrl = searchParams.get("shareUrl")

    if (!shareType || !shareTitle || !shareUrl) return null

    return {
      type: shareType,
      title: shareTitle,
      description: searchParams.get("shareDescription") || "",
      url: shareUrl,
      image: searchParams.get("shareImage") || "",
      source: searchParams.get("shareSource") || "",
      postId: searchParams.get("sharePostId") || "",
    }
  }, [searchParams])

  const { data: conversationsData, mutate: mutateConversations } = useSWR(
    token ? ["/community/messages", token] : null,
    ([url, authToken]) => socialFetcher<{ items: Conversation[] }>(url, authToken),
    { refreshInterval: 5000 },
  )

  useEffect(() => {
    if (preferredConversation) setActiveConversationId(preferredConversation)
  }, [preferredConversation])

  useEffect(() => {
    if (!activeConversationId && conversationsData?.items?.length) {
      setActiveConversationId(conversationsData.items[0].id)
    }
  }, [activeConversationId, conversationsData?.items])

  const activeConversation = useMemo(
    () => conversationsData?.items?.find((item) => item.id === activeConversationId) || null,
    [activeConversationId, conversationsData?.items],
  )

  const filteredConversations = useMemo(() => {
    const query = conversationQuery.trim().toLowerCase()
    if (!query) return conversationsData?.items || []
    return (conversationsData?.items || []).filter((conversation) => {
      const content = [conversation.user.name, conversation.user.favoriteTeam, conversation.lastMessageText, conversation.preview?.content]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return content.includes(query)
    })
  }, [conversationQuery, conversationsData?.items])

  const totalUnreadMessages = useMemo(
    () => (conversationsData?.items || []).reduce((total, conversation) => total + (conversation.unreadCount || 0), 0),
    [conversationsData?.items],
  )

  useEffect(() => {
    const unreadEntries = (conversationsData?.items || [])
      .filter((conversation) => conversation.hasUnread)
      .map((conversation) => `${conversation.id}:${conversation.unreadCount || 0}`)
      .join("|")

    if (!unreadEntries) {
      unreadSnapshotRef.current = ""
      return
    }

    if (unreadSnapshotRef.current && unreadSnapshotRef.current !== unreadEntries) {
      const latestUnread = (conversationsData?.items || []).find((conversation) => conversation.hasUnread)
      toast({
        title: "มีข้อความใหม่เข้า",
        description: latestUnread ? `${latestUnread.user.name} ส่งข้อความใหม่มาแล้ว` : "มีข้อความใหม่เข้ามาในแชต",
      })
    }

    unreadSnapshotRef.current = unreadEntries
  }, [conversationsData?.items, toast])

  const {
    data: detailData,
    error: detailError,
    isLoading: detailLoading,
    mutate: mutateDetail,
  } = useSWR(
    token && activeConversationId ? [`/community/messages?conversationId=${activeConversationId}`, token] : null,
    ([url, authToken]) => socialFetcher<{ conversation: Conversation; messages: Message[] }>(url, authToken),
    { refreshInterval: 3000 },
  )

  const currentConversation = detailData?.conversation || activeConversation
  const conversationMedia = useMemo(() => {
    return (detailData?.messages || [])
      .flatMap((message) => {
        const imageEntries = (message.images || []).map((image) => ({
          id: `${message.id}-${image}`,
          image,
          href: image,
        }))
        const sharedEntry =
          message.sharedItem?.image
            ? [
                {
                  id: `${message.id}-shared`,
                  image: message.sharedItem.image,
                  href: message.sharedItem.url,
                },
              ]
            : []

        return [...imageEntries, ...sharedEntry]
      })
      .slice(0, 6)
  }, [detailData?.messages])

  const pendingSharedFallbackContent = useMemo(() => {
    if (!pendingSharedItem) return ""

    return [pendingSharedItem.title, pendingSharedItem.description, pendingSharedItem.url]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join("\n")
  }, [pendingSharedItem])

  async function handleChatImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    if (!token || files.length === 0) return

    try {
      setUploadingImages(true)
      const formData = new FormData()
      files.slice(0, Math.max(0, 4 - attachedImages.length)).forEach((file) => formData.append("files", file))
      const response = await fetch("/api/community/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || "Upload failed")
      setAttachedImages((current) => [...current, ...(result?.urls || [])].slice(0, 4))
    } catch (error) {
      toast({
        title: "อัปโหลดรูปไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setUploadingImages(false)
      event.target.value = ""
    }
  }

  async function sendMessage() {
    if (!token || !currentConversation) return
    if (!messageDraft.trim() && attachedImages.length === 0 && !pendingSharedItem) return

    try {
      setSending(true)
      await fetchJson("/community/messages", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          targetUserId: currentConversation.user.id,
          content: messageDraft.trim() || pendingSharedFallbackContent,
          images: attachedImages,
          sharedItem: pendingSharedItem,
        }),
      })
      setMessageDraft("")
      setAttachedImages([])
      if (pendingSharedItem) {
        const params = new URLSearchParams(searchParams.toString())
        ;["shareType", "shareTitle", "shareUrl", "shareImage", "shareSource", "sharePostId"].forEach((key) => params.delete(key))
        window.history.replaceState({}, "", params.toString() ? `/community/messages?${params.toString()}` : "/community/messages")
      }
      await Promise.all([mutateConversations(), mutateDetail()])
    } catch (error) {
      toast({
        title: "ส่งข้อความไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="px-3 pb-8 pt-4 sm:px-4 sm:pt-5 lg:px-6">
        <div className="mx-auto max-w-[1500px] overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(184,255,0,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(184,255,0,0.08),transparent_20%),linear-gradient(180deg,#1a1a1d_0%,#111214_100%)] shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
          <div className="flex flex-wrap items-center gap-4 border-b border-white/10 px-5 py-4 lg:px-7">
            <Link href="/community" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-background/60 px-4 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              กลับคอมมูนิตี้
            </Link>

            <div className="text-[28px] font-display font-semibold tracking-tight text-foreground">Messages</div>

            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={conversationQuery}
                onChange={(event) => setConversationQuery(event.target.value)}
                placeholder="Search in your inbox..."
                className="h-11 rounded-full border-white/10 bg-background/70 pl-11 text-sm shadow-none placeholder:text-muted-foreground focus-visible:ring-primary/40"
              />
            </div>

            <div className="hidden items-center gap-2 lg:flex">
              <Link href="/community" className="inline-flex h-10 items-center gap-2 rounded-full bg-primary/15 px-4 text-sm font-medium text-primary">
                <Home className="h-4 w-4" />
                Home
              </Link>
              <Link href="/community/messages" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-primary transition hover:bg-primary/10">
                <MessageSquare className="h-4 w-4" />
              </Link>
              <div className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground">
                <Bell className="h-4 w-4" />
                {totalUnreadMessages ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" /> : null}
              </div>
            </div>
          </div>

          {!token ? (
            <div className="p-5 lg:p-6">
              <Card className="rounded-[28px] border-white/10 bg-card/90">
                <CardContent className="py-16 text-center">
                  <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
                  <h2 className="text-2xl font-semibold">ต้องเข้าสู่ระบบก่อน</h2>
                  <p className="mt-2 text-sm text-muted-foreground">ล็อกอินก่อนเพื่อใช้งานแชตกับเพื่อนในคอมมูนิตี้</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid min-h-[78vh] gap-0 lg:grid-cols-[68px_340px_minmax(0,1fr)] xl:grid-cols-[68px_340px_minmax(0,1fr)_280px]">
              <aside className="hidden border-r border-white/10 bg-black/18 lg:flex lg:flex-col lg:items-center lg:justify-between lg:py-5">
                <div className="flex flex-col items-center gap-5">
                  <Avatar className="h-12 w-12 border-2 border-primary/40">
                    <AvatarImage src={user?.avatar || "/placeholder-user.jpg"} />
                    <AvatarFallback>{user?.name?.charAt(0) || "F"}</AvatarFallback>
                  </Avatar>
                  <Link href="/community/messages" className="rounded-2xl bg-primary/12 p-3 text-primary transition hover:bg-primary/20">
                    <MessageSquare className="h-5 w-5" />
                  </Link>
                  <Link href="/community" className="rounded-2xl p-3 text-muted-foreground transition hover:bg-background/70 hover:text-primary">
                    <Home className="h-5 w-5" />
                  </Link>
                </div>
                <div className="rounded-2xl p-3 text-muted-foreground transition hover:bg-background/70 hover:text-foreground">
                  <Bell className="h-5 w-5" />
                </div>
              </aside>

              <Card className="overflow-hidden rounded-none border-0 border-r border-white/10 bg-black/10 shadow-none">
                <CardContent className="flex h-full flex-col p-0">
                  <div className="border-b border-white/10 px-5 py-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h1 className="text-2xl font-semibold">ข้อความ</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Inbox และบทสนทนาล่าสุด</p>
                      </div>
                      {totalUnreadMessages ? (
                        <Badge className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/15">
                          {totalUnreadMessages > 99 ? "99+" : totalUnreadMessages}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="max-h-[calc(78vh-92px)] space-y-3 overflow-y-auto px-4 py-4">
                    {filteredConversations.length ? (
                      filteredConversations.map((conversation) => (
                        <button
                          key={conversation.id}
                          onClick={() => setActiveConversationId(conversation.id)}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-[22px] border p-3 text-left transition duration-200",
                            activeConversationId === conversation.id
                              ? "border-primary/35 bg-[linear-gradient(135deg,rgba(184,255,0,0.16),rgba(184,255,0,0.05))] shadow-[0_14px_40px_rgba(0,0,0,0.22)]"
                              : "border-white/10 bg-background/30 hover:border-primary/20 hover:bg-background/50",
                          )}
                        >
                          <Avatar className="h-12 w-12 border border-white/10">
                            <AvatarImage src={conversation.user.avatar || "/placeholder-user.jpg"} />
                            <AvatarFallback>{conversation.user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <p className={cn("truncate text-sm", conversation.hasUnread ? "font-semibold text-white" : "font-medium text-foreground")}>
                                  {conversation.user.name}
                                </p>
                                {conversation.hasUnread ? <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_rgba(184,255,0,0.7)]" /> : null}
                              </div>
                              <span className={cn("text-[11px]", conversation.hasUnread ? "font-medium text-primary" : "text-muted-foreground")}>{conversation.timeAgo}</span>
                            </div>
                            <p className="mt-1 truncate text-xs text-muted-foreground">{conversation.user.favoriteTeam || "เพื่อนในคอมมูนิตี้"}</p>
                            <div className="mt-2 flex items-start justify-between gap-3">
                              <p className="line-clamp-2 text-xs text-foreground/80">
                                {conversation.preview?.content || conversation.lastMessageText || "เริ่มต้นบทสนทนาใหม่"}
                              </p>
                              {conversation.unreadCount ? (
                                <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-[0_0_18px_rgba(184,255,0,0.45)]">
                                  {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground">ยังไม่มีบทสนทนา เริ่มจากรับเพื่อนก่อน</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden rounded-none border-0 border-t border-white/10 bg-card/75 shadow-none lg:border-t-0">
                <CardContent className="flex h-full flex-col p-0">
                  {currentConversation ? (
                    <>
                      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[#171a24]/92 px-5 py-4 backdrop-blur">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 border border-white/10">
                            <AvatarImage src={currentConversation.user.avatar || "/placeholder-user.jpg"} />
                            <AvatarFallback>{currentConversation.user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <Link href={`/community/friends/${currentConversation.user.id}`} className="font-medium hover:text-primary">
                              {currentConversation.user.name}
                            </Link>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{currentConversation.user.favoriteTeam || currentConversation.user.bio || "เพื่อนในคอมมูนิตี้"}</span>
                              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_rgba(184,255,0,0.65)]" />
                              <span>Active now</span>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-full border border-white/10 bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                          {detailData?.messages?.length || 0} ข้อความ
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(184,255,0,0.08),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(184,255,0,0.05),transparent_18%),linear-gradient(180deg,#1b1c20_0%,#17181c_100%)] px-4 py-5">
                        {detailLoading && !detailData ? (
                          <div className="flex h-full min-h-[320px] items-center justify-center">
                            <div className="text-center">
                              <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
                              <p className="text-sm text-muted-foreground">กำลังโหลดข้อความ...</p>
                            </div>
                          </div>
                        ) : detailError ? (
                          <div className="flex h-full min-h-[320px] items-center justify-center">
                            <div className="max-w-md text-center">
                              <MessageSquare className="mx-auto mb-4 h-10 w-10 text-destructive/70" />
                              <h3 className="text-lg font-semibold">เปิดห้องแชตไม่สำเร็จ</h3>
                              <p className="mt-2 text-sm text-muted-foreground">
                                {detailError instanceof Error ? detailError.message : "เกิดข้อผิดพลาดขณะโหลดบทสนทนา"}
                              </p>
                              <Button className="mt-4 rounded-2xl" variant="outline" onClick={() => void mutateDetail()}>
                                ลองใหม่
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mx-auto flex max-w-4xl flex-col gap-4">
                            {(detailData?.messages || []).map((message) => {
                              const isMine = message.sender.id === user?.id
                              const normalizedContent = message.content.trim()
                              const normalizedSharedFallback = message.sharedItem
                                ? [message.sharedItem.title, message.sharedItem.description, message.sharedItem.url]
                                    .map((value) => value?.trim())
                                    .filter(Boolean)
                                    .join("\n")
                                : ""
                              const shouldHidePlainContent =
                                !!message.sharedItem &&
                                (!normalizedContent ||
                                  normalizedContent === message.sharedItem.title ||
                                  normalizedContent === normalizedSharedFallback)
                              return (
                                <div key={message.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                                  <div className={cn("flex max-w-[82%] items-end gap-3", isMine ? "flex-row-reverse" : "flex-row")}>
                                    <Avatar className="h-9 w-9 shrink-0 border border-white/10">
                                      <AvatarImage src={message.sender.avatar || "/placeholder-user.jpg"} />
                                      <AvatarFallback>{message.sender.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div
                                      className={cn(
                                        "rounded-[24px] px-4 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.18)]",
                                        isMine
                                          ? "rounded-br-md bg-primary text-primary-foreground"
                                          : "rounded-bl-md border border-white/10 bg-[#20242b] text-foreground",
                                      )}
                                    >
                                      {!isMine ? <p className="mb-1 text-xs font-medium text-primary">{message.sender.name}</p> : null}
                                      {message.sharedItem?.title ? (
                                        <a
                                          href={message.sharedItem.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={cn(
                                            "mb-3 block overflow-hidden rounded-2xl border p-3 transition hover:border-primary/40",
                                            isMine ? "border-white/15 bg-black/10" : "border-white/10 bg-black/10",
                                          )}
                                        >
                                          <div className="flex items-center gap-3">
                                            {message.sharedItem.image ? (
                                              <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl">
                                                <Image src={message.sharedItem.image} alt={message.sharedItem.title} fill className="object-cover" unoptimized />
                                              </div>
                                            ) : (
                                              <div className={cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-xl", isMine ? "bg-white/10" : "bg-background/70")}>
                                                <Newspaper className="h-5 w-5 text-primary" />
                                              </div>
                                            )}
                                            <div className="min-w-0">
                                              <p className={cn("text-[11px]", isMine ? "text-white/70" : "text-muted-foreground")}>
                                                {message.sharedItem.type === "post" ? "โพสต์จากคอมมูนิตี้" : message.sharedItem.source || "ข่าวฟุตบอล"}
                                              </p>
                                              <p className="line-clamp-2 text-sm font-medium">{message.sharedItem.title}</p>
                                              {message.sharedItem.description ? (
                                                <p className={cn("mt-1 line-clamp-3 text-xs leading-5", isMine ? "text-white/80" : "text-muted-foreground")}>
                                                  {message.sharedItem.description}
                                                </p>
                                              ) : null}
                                              <p className={cn("mt-1 truncate text-[11px]", isMine ? "text-white/70" : "text-muted-foreground")}>
                                                {message.sharedItem.url}
                                              </p>
                                            </div>
                                          </div>
                                        </a>
                                      ) : null}
                                      {message.images?.length ? (
                                        <div className={cn("mb-3 grid gap-2", message.images.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                                          {message.images.map((imageUrl) => (
                                            <a key={imageUrl} href={imageUrl} target="_blank" rel="noopener noreferrer" className="relative block overflow-hidden rounded-2xl border border-white/10">
                                              <div className="relative h-40 w-full">
                                                <Image src={imageUrl} alt="Chat image" fill className="object-cover" unoptimized />
                                              </div>
                                            </a>
                                          ))}
                                        </div>
                                      ) : null}
                                      {!shouldHidePlainContent ? <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p> : null}
                                      <div className={cn("mt-1 flex items-center gap-2 text-[11px]", isMine ? "justify-end text-white/70" : "text-muted-foreground")}>
                                        <span>{message.timeAgo}</span>
                                        {isMine ? <span>{message.seenByRecipient ? "อ่านแล้ว" : "ส่งแล้ว"}</span> : null}
                                      </div>
                                      {isMine && message.seenByRecipient && message.seenTimeAgo ? (
                                        <p className="mt-1 text-right text-[11px] text-white/70">อ่านข้อความแล้วเมื่อ {message.seenTimeAgo}</p>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}

                            {!detailLoading && !detailError && !(detailData?.messages?.length) ? (
                              <div className="flex min-h-[260px] items-center justify-center">
                                <div className="text-center">
                                  <MessageSquare className="mx-auto mb-4 h-10 w-10 text-muted-foreground/30" />
                                  <h3 className="text-lg font-semibold">ยังไม่มีข้อความในห้องนี้</h3>
                                  <p className="mt-2 text-sm text-muted-foreground">พิมพ์ข้อความแรกเพื่อเริ่มคุยได้เลย</p>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>

                      <div className="border-t border-white/10 bg-[#171a24]/92 px-4 py-4 backdrop-blur">
                        <div className="mx-auto max-w-4xl space-y-3">
                          {pendingSharedItem ? (
                            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold">พร้อมส่งเข้าแชต</p>
                                  <p className="text-xs text-muted-foreground">
                                    {pendingSharedItem.type === "post" ? "โพสต์จากคอมมูนิตี้" : pendingSharedItem.source || "ข่าวฟุตบอล"}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const params = new URLSearchParams(searchParams.toString())
                                    ;["shareType", "shareTitle", "shareUrl", "shareImage", "shareSource", "sharePostId"].forEach((key) => params.delete(key))
                                    window.history.replaceState({}, "", params.toString() ? `/community/messages?${params.toString()}` : "/community/messages")
                                  }}
                                  className="rounded-full border border-white/10 p-1 text-muted-foreground transition hover:text-foreground"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              <a href={pendingSharedItem.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-white/10 bg-background/60 p-3">
                                {pendingSharedItem.image ? (
                                  <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl">
                                    <Image src={pendingSharedItem.image} alt={pendingSharedItem.title} fill className="object-cover" unoptimized />
                                  </div>
                                ) : null}
                                <div className="min-w-0">
                                  <p className="line-clamp-2 text-sm font-medium">{pendingSharedItem.title}</p>
                                  {pendingSharedItem.description ? (
                                    <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">{pendingSharedItem.description}</p>
                                  ) : null}
                                  <p className="mt-1 truncate text-[11px] text-muted-foreground">{pendingSharedItem.url}</p>
                                </div>
                              </a>
                            </div>
                          ) : null}

                          {attachedImages.length ? (
                            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-background/40 p-3">
                              {attachedImages.map((imageUrl) => (
                                <div key={imageUrl} className="relative overflow-hidden rounded-2xl border border-white/10">
                                  <div className="relative h-28 w-full">
                                    <Image src={imageUrl} alt="Upload preview" fill className="object-cover" unoptimized />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setAttachedImages((current) => current.filter((item) => item !== imageUrl))}
                                    className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          <div className="flex items-end gap-3">
                            <label className="inline-flex h-[56px] cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-background/70 px-4 text-muted-foreground transition hover:border-primary/40 hover:text-primary">
                              {uploadingImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                              <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleChatImageUpload} />
                            </label>
                            <Textarea
                              value={messageDraft}
                              onChange={(event) => setMessageDraft(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" && !event.shiftKey) {
                                  event.preventDefault()
                                  void sendMessage()
                                }
                              }}
                              placeholder={pendingSharedItem ? "พิมพ์ความเห็นเพิ่มก่อนส่ง..." : "Type a message..."}
                              className="min-h-[56px] rounded-2xl border-white/10 bg-background/70"
                            />
                            <Button
                              onClick={sendMessage}
                              disabled={sending || (!messageDraft.trim() && attachedImages.length === 0 && !pendingSharedItem)}
                              className="h-[56px] rounded-2xl px-5"
                            >
                              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full min-h-[60vh] items-center justify-center">
                      <div className="text-center">
                        <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
                        <h2 className="text-xl font-semibold">เลือกบทสนทนา</h2>
                        <p className="mt-2 text-sm text-muted-foreground">เลือกวงแชตด้านซ้ายเพื่อเปิดห้องคุย</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <aside className="hidden border-l border-white/10 bg-black/12 xl:block">
                <div className="flex h-full flex-col p-5">
                  {currentConversation ? (
                    <>
                      <p className="text-sm font-semibold text-foreground">Profile Info</p>
                      <div className="mt-8 text-center">
                        <Avatar className="mx-auto h-28 w-28 border-2 border-primary/30">
                          <AvatarImage src={currentConversation.user.avatar || "/placeholder-user.jpg"} />
                          <AvatarFallback>{currentConversation.user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <p className="mt-5 text-2xl font-semibold text-foreground">{currentConversation.user.name}</p>
                        <p className="mt-2 text-sm text-primary">Active now</p>
                        <p className="mt-3 text-sm text-muted-foreground">{currentConversation.user.favoriteTeam || currentConversation.user.bio || "เพื่อนในคอมมูนิตี้"}</p>
                      </div>

                      <div className="mt-10 flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">Attachment</p>
                        {conversationMedia.length ? (
                          <Badge className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15">
                            {conversationMedia.length}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-3">
                        {conversationMedia.length ? (
                          conversationMedia.map((item) => (
                            <a
                              key={item.id}
                              href={item.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative overflow-hidden rounded-2xl border border-white/10 bg-background/50"
                            >
                              <div className="relative aspect-square">
                                <Image src={item.image} alt="Attachment" fill className="object-cover" unoptimized />
                              </div>
                            </a>
                          ))
                        ) : (
                          <div className="col-span-3 rounded-2xl border border-dashed border-white/10 bg-background/40 p-4 text-sm text-muted-foreground">
                            ยังไม่มีไฟล์แนบในบทสนทนานี้
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">เลือกบทสนทนาเพื่อดูข้อมูลเพิ่มเติม</div>
                  )}
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
