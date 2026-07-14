"use client"

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import useSWR from "swr"
import {
  Bell,
  Bookmark,
  Clock,
  Edit3,
  Eye,
  Flag,
  ImagePlus,
  Loader2,
  MessageCircle,
  MessageSquare,
  Plus,
  Repeat2,
  Search,
  Send,
  Share2,
  Upload,
  UserPlus,
  Users,
} from "lucide-react"

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

type CommunityPost = {
  id: string
  title: string
  excerpt: string
  categoryLabel: string
  likes: number
  reposts: number
  comments: number
  views: number
  timeAgo: string
  isPinned: boolean
  isHot: boolean
  isLiked: boolean
  images?: string[]
  sharedItem?: {
    type: string
    title: string
    url: string
    image: string
    source: string
    postId?: string
  } | null
  author: {
    id: string
    name: string
    avatar: string
  }
}

type FavoriteItem = {
  itemId: string
  itemType: string
}

type SocialUser = {
  id: string
  name: string
  avatar: string
  favoriteTeam: string
  bio: string
}

type FriendRequest = {
  id: string
  timeAgo: string
  user: SocialUser
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

type CommunityStory = {
  id: string
  image: string
  caption: string
  timeAgo: string
  createdAt?: string
  views?: number
  isViewed?: boolean
  isOwn: boolean
  author: {
    id: string
    name: string
    avatar: string
  }
}

type CommunityStoryGroup = {
  id: string
  isOwn: boolean
  latestCreatedAt: string
  latestTimeAgo: string
  latestImage: string
  hasUnviewed: boolean
  author: {
    id: string
    name: string
    avatar: string
  }
  stories: CommunityStory[]
}

function getRepostReference(post: CommunityPost) {
  if (post.sharedItem?.type === "post" && post.sharedItem.postId) {
    return post.sharedItem.postId
  }

  return post.id
}

const categories = [
  { id: "all", label: "ทั้งหมด" },
  { id: "match-discussion", label: "วิเคราะห์แมตช์" },
  { id: "transfer-rumors", label: "ข่าวย้ายทีม" },
  { id: "player-discussion", label: "พูดคุยนักเตะ" },
  { id: "predictions", label: "ทายผล" },
  { id: "general", label: "ทั่วไป" },
]

function socialFetcher<T>(path: string, token: string) {
  return fetchJson<T>(path, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

function actionButtonClass(active = false, tone: "primary" | "danger" = "primary") {
  if (tone === "danger") {
    return cn(
      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all disabled:pointer-events-none disabled:opacity-60",
      active
        ? "border-destructive/40 bg-destructive/10 text-destructive"
        : "border-border/60 bg-background/70 text-muted-foreground hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive",
    )
  }

  return cn(
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all disabled:pointer-events-none disabled:opacity-60",
    active
      ? "border-primary/40 bg-primary/10 text-primary"
      : "border-border/60 bg-background/70 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
  )
}

async function shareByDevice(url: string, title: string, text: string, onCopied: () => void) {
  if (navigator.share) {
    await navigator.share({ title, text, url })
    return
  }
  await navigator.clipboard.writeText(url)
  onCopied()
}

function buildChatShareHref(post: CommunityPost) {
  const params = new URLSearchParams({
    shareType: "post",
    shareTitle: post.title,
    shareUrl: `/community/${post.id}`,
    shareImage: post.images?.[0] || post.sharedItem?.image || "",
    shareSource: "community",
    sharePostId: post.id,
  })

  return `/community/messages?${params.toString()}`
}

export default function CommunityPage() {
  const { token, user } = useAuthSession()
  const { toast } = useToast()

  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [category, setCategory] = useState("general")
  const [uploading, setUploading] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [likingPostId, setLikingPostId] = useState<string | null>(null)
  const [savingPostId, setSavingPostId] = useState<string | null>(null)
  const [reportingPostId, setReportingPostId] = useState<string | null>(null)
  const [sendingFriendId, setSendingFriendId] = useState<string | null>(null)
  const [handlingRequestId, setHandlingRequestId] = useState<string | null>(null)
  const [sharingFeedPostId, setSharingFeedPostId] = useState<string | null>(null)
  const [repostDraft, setRepostDraft] = useState("")
  const [repostTarget, setRepostTarget] = useState<CommunityPost | null>(null)
  const [showStoryComposer, setShowStoryComposer] = useState(false)
  const [storyCaption, setStoryCaption] = useState("")
  const [storyImage, setStoryImage] = useState("")
  const [storyUploading, setStoryUploading] = useState(false)
  const [storySubmitting, setStorySubmitting] = useState(false)
  const [activeStory, setActiveStory] = useState<CommunityStory | null>(null)
  const [activeStoryGroupIndex, setActiveStoryGroupIndex] = useState(0)
  const [activeStoryIndex, setActiveStoryIndex] = useState(0)
  const [storyProgress, setStoryProgress] = useState(0)
  const previousUnreadMessagesRef = useRef(0)
  const viewedStoryIdsRef = useRef<Set<string>>(new Set())

  const query = useMemo(() => {
    const params = new URLSearchParams()
    params.set("limit", "20")
    if (selectedCategory !== "all") params.set("category", selectedCategory)
    if (searchQuery.trim()) params.set("q", searchQuery.trim())
    return `/community/posts?${params.toString()}`
  }, [searchQuery, selectedCategory])

  const { data, isLoading, mutate } = useSWR<{ items: CommunityPost[]; stats: Record<string, number> }>(query, fetchJson)
  const { data: favoritesData, mutate: mutateFavorites } = useSWR(
    token ? ["/favorites", token] : null,
    ([url, authToken]) => socialFetcher<{ items: FavoriteItem[] }>(url, authToken),
  )
  const { data: socialData, mutate: mutateSocial } = useSWR(
    token ? ["/community/social", token] : null,
    ([url, authToken]) =>
      socialFetcher<{
        friends: { id: string; user: SocialUser }[]
        requests: { incoming: FriendRequest[] }
        suggestions: SocialUser[]
        conversations: Conversation[]
      }>(url, authToken),
    { refreshInterval: 5000 },
  )
  const { data: notifications } = useSWR(
    token ? ["/community/notifications", token] : null,
    ([url, authToken]) => socialFetcher<{ pendingFriendRequests: number; unreadMessages: number; total: number }>(url, authToken),
    { refreshInterval: 4000 },
  )
  const { data: storiesData, mutate: mutateStories } = useSWR(
    token ? ["/community/stories", token] : "/community/stories",
    (key) => {
      if (Array.isArray(key)) {
        const [url, authToken] = key
        return socialFetcher<{ items: CommunityStoryGroup[] }>(url, authToken)
      }
      return fetchJson<{ items: CommunityStoryGroup[] }>(key)
    },
  )

  const posts = data?.items || []
  const storyGroups = storiesData?.items || []
  const activeStoryGroup = storyGroups[activeStoryGroupIndex] || null
  const stats = data?.stats || { total: 0 }
  const totalUnreadMessages = notifications?.unreadMessages || 0
  const repostedReferenceIds = useMemo(
    () =>
      new Set(
        posts
          .filter((item) => item.author.id === user?.id && item.sharedItem?.type === "post" && item.sharedItem.postId)
          .map((item) => item.sharedItem?.postId || ""),
      ),
    [posts, user?.id],
  )
  const savedPostIds = useMemo(
    () => new Set((favoritesData?.items || []).filter((item) => item.itemType === "post").map((item) => String(item.itemId))),
    [favoritesData?.items],
  )

  useEffect(() => {
    const unreadMessages = notifications?.unreadMessages || 0
    if (previousUnreadMessagesRef.current > 0 && unreadMessages > previousUnreadMessagesRef.current) {
      toast({
        title: "มีข้อความใหม่เข้า",
        description: "มีเพื่อนส่งข้อความใหม่มาแล้ว เปิดแชตไปดูได้เลย",
      })
    }
    previousUnreadMessagesRef.current = unreadMessages
  }, [notifications?.unreadMessages, toast])

  useEffect(() => {
    if (!storyGroups.length) {
      if (activeStory) {
        setActiveStory(null)
      }
      setActiveStoryGroupIndex(0)
      setActiveStoryIndex(0)
      return
    }

    if (!activeStory) return

    const currentGroup = storyGroups[activeStoryGroupIndex]
    const nextStory = currentGroup?.stories?.[activeStoryIndex]
    if (!currentGroup || !nextStory) {
      closeStoryViewer()
      return
    }

    if (nextStory.id !== activeStory.id) {
      setActiveStory(nextStory)
    }
  }, [activeStory, activeStoryGroupIndex, activeStoryIndex, storyGroups])

  useEffect(() => {
    if (!activeStory) {
      setStoryProgress(0)
      return
    }

    setStoryProgress(0)

    const duration = 5000
    const startedAt = Date.now()
    const interval = window.setInterval(() => {
      const nextProgress = Math.min(((Date.now() - startedAt) / duration) * 100, 100)
      setStoryProgress(nextProgress)
    }, 60)

    const timer = window.setTimeout(() => {
      setStoryProgress(100)
      setActiveStoryIndex((current) => {
        const currentGroup = storyGroups[activeStoryGroupIndex]
        const lastStoryIndex = Math.max((currentGroup?.stories?.length || 1) - 1, 0)

        if (current < lastStoryIndex) {
          return current + 1
        }

        if (activeStoryGroupIndex < storyGroups.length - 1) {
          setActiveStoryGroupIndex((groupIndex) => groupIndex + 1)
          return 0
        }

        closeStoryViewer()
        return 0
      })
    }, duration)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timer)
    }
  }, [activeStory, activeStoryGroupIndex, storyGroups])

  useEffect(() => {
    if (!activeStory?.id || viewedStoryIdsRef.current.has(activeStory.id)) return

    viewedStoryIdsRef.current.add(activeStory.id)

    if (!token) return

    void fetchJson<{ item: { id: string; views: number; counted: boolean } }>("/community/stories", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ storyId: activeStory.id }),
    })
      .then((result) => {
        void mutateStories((current) => {
          if (!current?.items) return current
          return {
            ...current,
            items: current.items.map((group) => {
              const nextStories = group.stories.map((story) =>
                story.id === result.item.id ? { ...story, views: result.item.views, isViewed: true } : story,
              )

              return {
                ...group,
                hasUnviewed: nextStories.some((story) => !story.isViewed),
                stories: nextStories,
              }
            }),
          }
        }, false)
      })
      .catch(() => undefined)
  }, [activeStory?.id, mutateStories, token])

  function requireLogin(description: string) {
    if (token) return true
    toast({ title: "ต้องเข้าสู่ระบบก่อน", description, variant: "destructive" })
    return false
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    if (!requireLogin("กรุณาเข้าสู่ระบบเพื่ออัปโหลดรูป")) return

    try {
      setUploading(true)
      const formData = new FormData()
      files.slice(0, Math.max(0, 4 - uploadedImages.length)).forEach((file) => formData.append("files", file))
      const response = await fetch("/api/community/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || "Upload failed")
      setUploadedImages((current) => [...current, ...(result?.urls || [])].slice(0, 4))
      toast({ title: "อัปโหลดรูปแล้ว", description: "รูปพร้อมแนบในโพสต์นี้" })
    } catch (error) {
      toast({
        title: "อัปโหลดรูปไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      event.target.value = ""
    }
  }

  async function handleStoryImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!requireLogin("กรุณาเข้าสู่ระบบเพื่อเพิ่มสตอรี่")) return

    try {
      setStoryUploading(true)
      const formData = new FormData()
      formData.append("files", file)
      const response = await fetch("/api/community/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || "Upload failed")
      setStoryImage(result?.urls?.[0] || "")
      toast({ title: "Story image ready", description: "Your story cover has been uploaded." })
    } catch (error) {
      toast({
        title: "Story upload failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setStoryUploading(false)
      event.target.value = ""
    }
  }

  async function handleCreateStory() {
    if (!requireLogin("กรุณาเข้าสู่ระบบเพื่อเพิ่มสตอรี่")) return
    if (!storyImage) {
      toast({ title: "Story image required", description: "Please upload an image before posting your story.", variant: "destructive" })
      return
    }

    try {
      setStorySubmitting(true)
      await fetchJson("/community/stories", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ image: storyImage, caption: storyCaption }),
      })
      setShowStoryComposer(false)
      setStoryImage("")
      setStoryCaption("")
      void mutateStories()
      toast({ title: "Story posted", description: "Your story is now live for 24 hours." })
    } catch (error) {
      toast({
        title: "Story post failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setStorySubmitting(false)
    }
  }

  function closeStoryViewer() {
    setActiveStory(null)
    setActiveStoryGroupIndex(0)
    setActiveStoryIndex(0)
    setStoryProgress(0)
  }

  function openStoryViewer(groupIndex: number) {
    const story = storyGroups[groupIndex]?.stories?.[0]
    if (!story) return
    setActiveStoryGroupIndex(groupIndex)
    setActiveStoryIndex(0)
    setActiveStory(story)
    setStoryProgress(0)
  }

  function goToPreviousStory() {
    const currentGroup = storyGroups[activeStoryGroupIndex]
    if (!currentGroup) return

    if (activeStoryIndex > 0) {
      setActiveStoryIndex((current) => {
        setStoryProgress(0)
        return Math.max(current - 1, 0)
      })
      return
    }

    if (activeStoryGroupIndex > 0) {
      const previousGroupIndex = activeStoryGroupIndex - 1
      const previousGroup = storyGroups[previousGroupIndex]
      setActiveStoryGroupIndex(previousGroupIndex)
      setActiveStoryIndex(Math.max((previousGroup?.stories?.length || 1) - 1, 0))
      setStoryProgress(0)
    }
  }

  function goToNextStory() {
    const currentGroup = storyGroups[activeStoryGroupIndex]
    if (!currentGroup) return

    if (activeStoryIndex < currentGroup.stories.length - 1) {
      setActiveStoryIndex((current) => {
        setStoryProgress(0)
        return current + 1
      })
      return
    }

    if (activeStoryGroupIndex < storyGroups.length - 1) {
      setActiveStoryGroupIndex((current) => current + 1)
      setActiveStoryIndex(0)
      setStoryProgress(0)
      return
    }

    closeStoryViewer()
  }

  async function handleCreatePost() {
    if (!requireLogin("กรุณาเข้าสู่ระบบเพื่อสร้างโพสต์")) return
    if (!title.trim() || !content.trim()) {
      toast({ title: "ข้อมูลยังไม่ครบ", description: "กรุณากรอกหัวข้อและเนื้อหา", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      await fetchJson("/community/posts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, content, category, images: uploadedImages }),
      })
      setTitle("")
      setContent("")
      setCategory("general")
      setUploadedImages([])
      setShowCreatePost(false)
      await mutate()
      toast({ title: "โพสต์สำเร็จ", description: "เพิ่มโพสต์ใหม่เข้า feed แล้ว" })
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
    if (!requireLogin("กรุณาเข้าสู่ระบบเพื่อกดถูกใจ")) return
    try {
      setLikingPostId(postId)
      const result = await fetchJson<{ liked: boolean; likes: number }>(`/community/posts/${postId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      await mutate(
        (current) =>
          current
            ? {
                ...current,
                items: current.items.map((item) => (item.id === postId ? { ...item, isLiked: result.liked, likes: result.likes } : item)),
              }
            : current,
        false,
      )
    } catch (error) {
      toast({ title: "กดถูกใจไม่สำเร็จ", description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด", variant: "destructive" })
    } finally {
      setLikingPostId(null)
    }
  }

  async function savePost(post: CommunityPost) {
    if (!requireLogin("กรุณาเข้าสู่ระบบเพื่อบันทึกโพสต์")) return
    try {
      setSavingPostId(post.id)
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
    } catch (error) {
      toast({ title: "บันทึกโพสต์ไม่สำเร็จ", description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด", variant: "destructive" })
    } finally {
      setSavingPostId(null)
    }
  }

  async function reportPost(postId: string) {
    if (!requireLogin("กรุณาเข้าสู่ระบบเพื่อรายงานโพสต์")) return
    try {
      setReportingPostId(postId)
      await fetchJson(`/community/posts/${postId}/report`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: "off-topic", description: "รายงานจากหน้า feed" }),
      })
      toast({ title: "รายงานแล้ว", description: "ระบบได้รับรายงานของคุณแล้ว" })
    } catch (error) {
      toast({ title: "รายงานไม่สำเร็จ", description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด", variant: "destructive" })
    } finally {
      setReportingPostId(null)
    }
  }

  async function shareLink(post: CommunityPost) {
    const url = `${window.location.origin}/community/${post.id}`
    try {
      await shareByDevice(url, post.title, post.excerpt, () => {
        toast({ title: "คัดลอกลิงก์แล้ว", description: "พร้อมแชร์โพสต์นี้ต่อได้เลย" })
      })
    } catch {}
  }

  function openRepostComposer(post: CommunityPost) {
    if (!requireLogin("กรุณาเข้าสู่ระบบก่อน repost")) return
    setRepostTarget(post)
    setRepostDraft("")
  }

  function closeRepostComposer() {
    if (sharingFeedPostId) return
    setRepostTarget(null)
    setRepostDraft("")
  }

  async function sharePostToFeed(post: CommunityPost, caption?: string) {
    if (!requireLogin("กรุณาเข้าสู่ระบบเพื่อแชร์โพสต์ลงฟีด")) return
    try {
      setSharingFeedPostId(post.id)
      await fetchJson("/community/posts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: `แชร์ต่อ: ${post.title}`,
          content: "ขอยกโพสต์นี้มาชวนคุยต่อในมุมของทุกคน",
          category: "general",
          sharedItem: {
            type: "post",
            title: post.title,
            url: `${window.location.origin}/community/${post.id}`,
            image: post.images?.[0] || "",
            source: post.author.name,
            postId: post.id,
          },
        }),
      })
      await mutate()
      toast({ title: "Repost สำเร็จ", description: "โพสต์นี้ถูก repost ลงฟีดของคุณแล้ว" })
    } catch (error) {
      toast({
        title: "แชร์ลงฟีดไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setSharingFeedPostId(null)
    }
  }

  async function submitRepost(post: CommunityPost, caption?: string) {
    if (!requireLogin("กรุณาเข้าสู่ระบบก่อน repost")) return
    try {
      const referenceId = getRepostReference(post)
      setSharingFeedPostId(post.id)
      await fetchJson("/community/posts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: `แชร์ต่อ: ${post.title}`,
          content: caption?.trim() || "แชร์ลงฟีดของคุณ",
          category: "general",
          sharedItem: {
            type: "post",
            title: post.title,
            url: `${window.location.origin}/community/${post.id}`,
            image: post.images?.[0] || "",
            source: post.author.name,
            postId: referenceId,
          },
        }),
      })
      await mutate(
        (current) =>
          current
            ? {
                ...current,
                items: current.items.map((item) =>
                  item.id === post.id || item.id === referenceId || item.sharedItem?.postId === referenceId
                    ? { ...item, reposts: item.reposts + 1 }
                    : item,
                ),
              }
            : current,
        false,
      )
      void mutate()
      closeRepostComposer()
      toast({ title: "Repost successful", description: "This post is now on your profile feed." })
    } catch (error) {
      toast({
        title: "Repost failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setSharingFeedPostId(null)
    }
  }

  function handleRepostNow() {
    if (!repostTarget) return
    const target = repostTarget
    const caption = repostDraft
    setRepostTarget(null)
    setRepostDraft("")
    void submitRepost(target, caption)
  }

  async function sendFriendRequest(targetUserId: string) {
    if (!requireLogin("กรุณาเข้าสู่ระบบเพื่อเพิ่มเพื่อน")) return
    try {
      setSendingFriendId(targetUserId)
      await fetchJson("/community/friends", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "request", targetUserId }),
      })
      await mutateSocial()
    } catch (error) {
      toast({ title: "ส่งคำขอไม่สำเร็จ", description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด", variant: "destructive" })
    } finally {
      setSendingFriendId(null)
    }
  }

  async function handleFriendRequest(requestId: string, action: "accept" | "decline") {
    if (!requireLogin("กรุณาเข้าสู่ระบบก่อน")) return
    try {
      setHandlingRequestId(requestId)
      await fetchJson("/community/friends", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, requestId }),
      })
      await mutateSocial()
    } catch (error) {
      toast({ title: "อัปเดตคำขอไม่สำเร็จ", description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด", variant: "destructive" })
    } finally {
      setHandlingRequestId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="border-b border-border/60 pt-20">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[28px] border border-primary/20 bg-card/70 p-6 md:p-8">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Badge className="rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/15">
                  <Users className="mr-1.5 h-3.5 w-3.5" />
                  Community
                </Badge>
                {notifications?.total ? (
                  <Badge className="rounded-full bg-orange-500/15 px-3 py-1 text-orange-300 hover:bg-orange-500/15">
                    <Bell className="mr-1.5 h-3.5 w-3.5" />
                    แจ้งเตือน {notifications.total}
                  </Badge>
                ) : null}
              </div>

              <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
                โพสต์รูป คุยข่าว
                <span className="block text-primary">และพูดคุยกัน</span>
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
                โพสต์จากเครื่องได้ แชร์ลิงก์ได้ แชร์โพสต์ลงฟีดต่อได้ และรองรับข่าวจากหน้า news
                ที่แนบลิงก์อ้างอิงจริงเข้ามาคุยต่อ
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาโพสต์หรือประเด็นที่สนใจ..."
                    className="h-12 rounded-2xl pl-11"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
                <Button onClick={() => setShowCreatePost((value) => !value)} className="h-12 rounded-2xl px-5">
                  <Plus className="mr-2 h-4 w-4" />
                  สร้างโพสต์
                </Button>
                <Link href="/community/messages">
                  <Button variant="outline" className="h-12 rounded-2xl px-5">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    แชต
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="rounded-[24px]"><CardContent className="p-5"><p className="text-sm text-muted-foreground">โพสต์ทั้งหมด</p><p className="mt-2 text-3xl font-bold">{stats.total || 0}</p></CardContent></Card>
              <Card className="rounded-[24px]"><CardContent className="p-5"><p className="text-sm text-muted-foreground">เพื่อน</p><p className="mt-2 text-3xl font-bold">{socialData?.friends?.length || 0}</p></CardContent></Card>
              <Card className="rounded-[24px]"><CardContent className="p-5"><p className="text-sm text-muted-foreground">คำขอเพื่อน</p><p className="mt-2 text-3xl font-bold">{notifications?.pendingFriendRequests || 0}</p></CardContent></Card>
              <Card className="rounded-[24px]"><CardContent className="p-5"><p className="text-sm text-muted-foreground">ข้อความใหม่</p><p className="mt-2 text-3xl font-bold">{notifications?.unreadMessages || 0}</p></CardContent></Card>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Dialog open={showStoryComposer} onOpenChange={setShowStoryComposer}>
          <DialogContent className="max-w-lg rounded-[28px] border-border/60 bg-[#101214] p-0 text-foreground">
            <DialogHeader className="border-b border-border/60 px-6 py-5">
              <DialogTitle>สร้างสตอรี่</DialogTitle>
              <DialogDescription>แชร์อัปเดตรูปภาพที่จะอยู่บนหน้าโปรไฟล์ 24 ชั่วโมง</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 px-6 py-5">
              <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4">
                <div>
                  <p className="text-sm font-medium">อัปโหลดรูปสตอรี่</p>
                  <p className="text-xs text-muted-foreground">1 รูป ขนาดไม่เกิน 5MB</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-sm">
                  {storyUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  เลือกรูป
                </div>
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleStoryImageUpload} />
              </label>

              {storyImage ? (
                <div className="relative h-80 overflow-hidden rounded-[24px] border border-border/60">
                  <Image src={storyImage} alt="Story preview" fill className="object-cover" unoptimized />
                </div>
              ) : null}

              <Textarea
                value={storyCaption}
                onChange={(event) => setStoryCaption(event.target.value)}
                placeholder="อยากเขียนอะไรเกี่ยวกับสตอรี่นี้..."
                className="min-h-24 resize-none rounded-2xl border-border/60 bg-background/70"
              />
            </div>
            <DialogFooter className="border-t border-border/60 px-6 py-5 sm:justify-between">
              <Button variant="outline" onClick={() => setShowStoryComposer(false)} disabled={storySubmitting} className="rounded-full">
                ยกเลิก
              </Button>
              <Button onClick={handleCreateStory} disabled={storySubmitting || !storyImage} className="rounded-full px-6">
                {storySubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                โพสต์สตอรี่
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(activeStory)} onOpenChange={(open) => (!open ? closeStoryViewer() : undefined)}>
          <DialogContent className="max-w-md rounded-[28px] border-border/60 bg-[#101214] p-0 text-foreground">
            {activeStory ? (
              <div className="overflow-hidden rounded-[28px]">
                <div className="relative h-[560px]">
                  <Image src={activeStory.image} alt={activeStory.author.name} fill className="object-cover" unoptimized />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/10 to-black/80" />
                  <div className="absolute left-0 right-0 top-0 space-y-4 p-5">
                    <div className="flex gap-1.5">
                      {(activeStoryGroup?.stories || []).map((story, index) => (
                        <div key={story.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
                          <div
                            className="h-full rounded-full bg-white transition-[width] duration-75"
                            style={{
                              width:
                                index < activeStoryIndex
                                  ? "100%"
                                  : index === activeStoryIndex
                                    ? `${storyProgress}%`
                                    : "0%",
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 border border-white/30">
                      <AvatarImage src={activeStory.author.avatar || "/placeholder-user.jpg"} />
                      <AvatarFallback>{activeStory.author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {activeStoryGroup?.isOwn ? "สตอรี่ของคุณ" : activeStory.author.name}
                      </p>
                      <p className="truncate text-xs text-white/70">
                        {activeStory.timeAgo} • {activeStoryIndex + 1}/{activeStoryGroup?.stories.length || 1} • {activeStory.views || 0} การดู
                      </p>
                    </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={goToPreviousStory}
                    disabled={activeStoryGroupIndex === 0 && activeStoryIndex === 0}
                    className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white transition hover:bg-black/55 disabled:opacity-35"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={goToNextStory}
                    className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white transition hover:bg-black/55"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onClick={closeStoryViewer}
                    className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white transition hover:bg-black/55"
                  >
                    ×
                  </button>
                  {activeStory.caption ? <p className="absolute bottom-0 left-0 right-0 p-5 text-sm leading-6 text-white">{activeStory.caption}</p> : null}
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(repostTarget)} onOpenChange={(open) => (!open ? closeRepostComposer() : undefined)}>
          <DialogContent className="max-w-xl rounded-[28px] border-border/60 bg-[#101214] p-0 text-foreground">
            <DialogHeader className="border-b border-border/60 px-6 py-5">
              <DialogTitle>Repost ลงฟีดของคุณ</DialogTitle>
              <DialogDescription>เพิ่มความเห็นของคุณก่อนแชร์โพสต์นี้</DialogDescription>
            </DialogHeader>

            {repostTarget ? (
              <div className="space-y-4 px-6 py-5">
                <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={repostTarget.author.avatar || "/placeholder-user.jpg"} />
                    <AvatarFallback>{repostTarget.author.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{repostTarget.author.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{repostTarget.categoryLabel}</p>
                  </div>
                </div>

                <Textarea
                  value={repostDraft}
                  onChange={(event) => setRepostDraft(event.target.value)}
                  placeholder="อยากบอกอะไรเกี่ยวกับโพสต์นี้..."
                  className="min-h-28 resize-none rounded-2xl border-border/60 bg-background/70"
                />

                <div className="overflow-hidden rounded-[24px] border border-border/60 bg-muted/20">
                  {repostTarget.images?.[0] ? (
                    <div className="relative h-52 border-b border-border/60">
                      <Image src={repostTarget.images[0]} alt={repostTarget.title} fill className="object-cover" unoptimized />
                    </div>
                  ) : null}

                  <div className="space-y-3 p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={repostTarget.author.avatar || "/placeholder-user.jpg"} />
                        <AvatarFallback>{repostTarget.author.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{repostTarget.author.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{repostTarget.timeAgo}</p>
                      </div>
                    </div>
                    <div>
                      <p className="line-clamp-2 text-base font-semibold">{repostTarget.title}</p>
                      <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted-foreground">{repostTarget.excerpt}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <DialogFooter className="border-t border-border/60 px-6 py-5 sm:justify-between">
              <Button variant="outline" onClick={closeRepostComposer} disabled={Boolean(sharingFeedPostId)} className="rounded-full">
                ยกเลิก
              </Button>
              <Button
                onClick={handleRepostNow}
                disabled={!repostTarget || sharingFeedPostId === repostTarget.id}
                className="rounded-full px-6"
              >
                {repostTarget && sharingFeedPostId === repostTarget.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Repeat2 className="mr-2 h-4 w-4" />}
                Repost ตอนนี้
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Card className="rounded-[28px] border-border/60 bg-card/70">
              <CardContent className="p-5">
                <div className="flex gap-4 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setShowStoryComposer(true)}
                    className="flex min-w-[84px] flex-col items-center gap-2"
                  >
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-primary/60 bg-primary/10 text-primary">
                      <Plus className="h-7 w-7" />
                    </div>
                    <span className="text-xs font-medium">สตอรี่ของคุณ</span>
                  </button>

                  {storyGroups.map((group, index) => (
                    <button key={group.id} type="button" onClick={() => openStoryViewer(index)} className="flex min-w-[84px] flex-col items-center gap-2">
                      <div
                        className={cn(
                          "relative h-20 w-20 overflow-hidden rounded-full border-2 p-0.5 transition-colors",
                          group.hasUnviewed
                            ? "border-primary/70"
                            : "border-white/25 bg-white/[0.03]",
                        )}
                      >
                        <div className="relative h-full w-full overflow-hidden rounded-full">
                          <Image src={group.latestImage} alt={group.author.name} fill className="object-cover" unoptimized />
                        </div>
                        {group.stories.length > 1 ? (
                          <div
                            className={cn(
                              "absolute bottom-0 right-0 flex h-6 min-w-6 items-center justify-center rounded-full border px-1 text-[10px] font-semibold",
                              group.hasUnviewed
                                ? "border-background bg-primary text-primary-foreground"
                                : "border-border/70 bg-muted text-foreground",
                            )}
                          >
                            {group.stories.length}
                          </div>
                        ) : null}
                      </div>
                      <span className={cn("max-w-[84px] truncate text-xs font-medium", group.hasUnviewed ? "text-foreground" : "text-muted-foreground")}>
                        {group.isOwn ? "ฉันเอง" : group.author.name}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {showCreatePost ? (
              <Card className="rounded-[24px] border-primary/25">
                <CardHeader><CardTitle>สร้างโพสต์ใหม่</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {categories.slice(1).map((item) => (
                      <Button key={item.id} variant={category === item.id ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => setCategory(item.id)}>
                        {item.label}
                      </Button>
                    ))}
                  </div>
                  <Input placeholder="หัวข้อโพสต์" value={title} onChange={(event) => setTitle(event.target.value)} />
                  <Textarea placeholder="อยากชวนคุยเรื่องอะไร..." className="min-h-32 resize-none" value={content} onChange={(event) => setContent(event.target.value)} />

                  <div className="rounded-2xl border border-dashed border-border/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">อัปโหลดรูปจากเครื่อง</p>
                        <p className="text-xs text-muted-foreground">สูงสุด 4 รูป</p>
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm">
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        เลือกรูป
                        <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleImageUpload} />
                      </label>
                    </div>
                    {uploadedImages.length ? (
                      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                        {uploadedImages.map((image) => (
                          <div key={image} className="relative overflow-hidden rounded-2xl border border-border/60">
                            <div className="relative h-28">
                              <Image src={image} alt="upload" fill className="object-cover" unoptimized />
                            </div>
                            <button onClick={() => setUploadedImages((current) => current.filter((item) => item !== image))} className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[11px] text-white">ลบ</button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreatePost(false)}>ยกเลิก</Button>
                    <Button onClick={handleCreatePost} disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}โพสต์</Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <Button key={item.id} variant={selectedCategory === item.id ? "default" : "outline"} onClick={() => setSelectedCategory(item.id)} className="rounded-full" size="sm">
                  {item.label}
                </Button>
              ))}
            </div>

            <div className="space-y-4">
              {posts.map((post) => {
                const isSaved = savedPostIds.has(post.id)
                const cover = post.images?.[0] || ""
                const referenceId = getRepostReference(post)
                const isReposted = repostedReferenceIds.has(referenceId)
                return (
                  <Card key={post.id} className="overflow-hidden rounded-[24px]">
                    {cover ? (
                      <div className="relative h-72 overflow-hidden border-b border-border/60">
                        <Image src={cover} alt={post.title} fill className="object-cover" unoptimized />
                        <div className="absolute left-4 top-4">
                          <Badge className="rounded-full bg-black/60 text-white hover:bg-black/60">
                            <ImagePlus className="mr-1 h-3.5 w-3.5" />
                            {post.images?.length || 1} รูป
                          </Badge>
                        </div>
                      </div>
                    ) : null}

                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <Link href={`/community/friends/${post.author.id}`}>
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={post.author.avatar || "/placeholder-user.jpg"} />
                            <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        </Link>

                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <Link href={`/community/friends/${post.author.id}`} className="text-sm font-medium hover:text-primary">{post.author.name}</Link>
                            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">{post.categoryLabel}</Badge>
                            {post.isPinned ? <Badge className="rounded-full bg-primary/15 text-primary hover:bg-primary/15">ปักหมุด</Badge> : null}
                            {post.isHot ? <Badge className="rounded-full bg-orange-500/15 text-orange-300 hover:bg-orange-500/15">กำลังมาแรง</Badge> : null}
                          </div>

                          {post.sharedItem?.type === "post" ? (
                            <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-primary/80">reposted by {post.author.name}</p>
                          ) : null}

                          <Link href={`/community/${post.id}`} className="block">
                            <h3 className="text-xl font-semibold transition-colors hover:text-primary">{post.title}</h3>
                          </Link>
                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{post.excerpt}</p>

                          {post.sharedItem?.title ? (
                            <a href={post.sharedItem.url} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3 transition hover:bg-muted/50">
                              {post.sharedItem.image ? (
                                <div className="relative h-16 w-24 overflow-hidden rounded-xl">
                                  <Image src={post.sharedItem.image} alt={post.sharedItem.title} fill className="object-cover" unoptimized />
                                </div>
                              ) : null}
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">
                                  {post.sharedItem.type === "post" ? `Reposted from ${post.sharedItem.source || "community"}` : post.sharedItem.source || "Shared article"}
                                </p>
                                <p className="line-clamp-2 text-sm font-medium">{post.sharedItem.title}</p>
                                <p className="mt-1 truncate text-[11px] text-muted-foreground">{post.sharedItem.url}</p>
                              </div>
                            </a>
                          ) : null}

                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <button onClick={() => handleLike(post.id)} disabled={likingPostId === post.id} className={actionButtonClass(post.isLiked)}>
                              {likingPostId === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "ðŸ‘"}
                              <span>{post.likes}</span>
                            </button>
                            <button
                              onClick={() => openRepostComposer(post)}
                              disabled={sharingFeedPostId === post.id || isReposted}
                              className={actionButtonClass(isReposted)}
                            >
                              {sharingFeedPostId === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat2 className="h-4 w-4" />}
                              <span>{post.reposts}</span>
                              <span>{isReposted ? "Reposted" : "Repost"}</span>
                            </button>
                            <Link href={`/community/${post.id}`} className={actionButtonClass(false)}>
                              <MessageCircle className="h-4 w-4" />
                              <span>{post.comments}</span>
                            </Link>
                            <div className={actionButtonClass(false)}>
                              <Eye className="h-4 w-4" />
                              <span>{post.views}</span>
                            </div>
                            <button onClick={() => savePost(post)} disabled={savingPostId === post.id} className={actionButtonClass(isSaved)}>
                              {savingPostId === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />}
                              <span>{isSaved ? "บันทึกแล้ว" : "บันทึก"}</span>
                            </button>
                            <button onClick={() => shareLink(post)} className={actionButtonClass(false)}>
                              <Share2 className="h-4 w-4" />
                              <span>แชร์ลิงก์</span>
                            </button>
                            <Link href={buildChatShareHref(post)} className={actionButtonClass(false)}>
                              <MessageSquare className="h-4 w-4" />
                              <span>ส่งเข้าแชต</span>
                            </Link>
                            <button onClick={() => reportPost(post.id)} disabled={reportingPostId === post.id} className={actionButtonClass(false, "danger")}>
                              {reportingPostId === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                              <span>รายงาน</span>
                            </button>
                          </div>

                          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{post.timeAgo}</span>
                            <Link href={`/community/${post.id}`} className="font-medium text-primary hover:underline">อ่านต่อ</Link>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {!isLoading && posts.length === 0 ? (
                <Card className="rounded-[24px] border-2 border-dashed border-border/60 bg-card/40">
                  <CardContent className="py-16 text-center">
                    <MessageSquare className="mx-auto mb-4 h-14 w-14 text-muted-foreground/30" />
                    <h3 className="text-xl font-semibold">ยังไม่พบโพสต์</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">ลองเปลี่ยนหมวดหรือสร้างโพสต์ใหม่เพื่อเริ่มต้นบทสนทนา</p>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>

          <aside className="space-y-4">
            <Card className="rounded-[24px]">
              <CardHeader><CardTitle className="text-base">แนะนำเพื่อน</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {socialData?.suggestions?.length ? (
                  socialData.suggestions.map((person) => (
                    <div key={person.id} className="flex items-center justify-between gap-3 rounded-2xl bg-background/60 p-3">
                      <Link href={`/community/friends/${person.id}`} className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={person.avatar || "/placeholder-user.jpg"} />
                          <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{person.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{person.favoriteTeam || person.bio || "แฟนบอลในคอมมูนิตี้"}</p>
                        </div>
                      </Link>
                      <Button size="sm" onClick={() => sendFriendRequest(person.id)} disabled={sendingFriendId === person.id}>
                        {sendingFriendId === person.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">ยังไม่มีคนแนะนำเพิ่ม</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[24px]">
              <CardHeader><CardTitle className="text-base">คำขอเป็นเพื่อน</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {socialData?.requests?.incoming?.length ? (
                  socialData.requests.incoming.map((request) => (
                    <div key={request.id} className="rounded-2xl bg-background/60 p-3">
                      <Link href={`/community/friends/${request.user.id}`} className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={request.user.avatar || "/placeholder-user.jpg"} />
                          <AvatarFallback>{request.user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{request.user.name}</p>
                          <p className="text-xs text-muted-foreground">{request.timeAgo}</p>
                        </div>
                      </Link>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" onClick={() => handleFriendRequest(request.id, "accept")} disabled={handlingRequestId === request.id}>รับ</Button>
                        <Button size="sm" variant="outline" onClick={() => handleFriendRequest(request.id, "decline")} disabled={handlingRequestId === request.id}>ปฏิเสธ</Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">ยังไม่มีคำขอเข้ามา</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[24px]">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">คุยต่อในแชต</CardTitle>
                  {notifications?.unreadMessages ? (
                    <Badge className="rounded-full bg-primary/15 px-3 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15">
                      ข้อความใหม่ {notifications.unreadMessages > 99 ? "99+" : notifications.unreadMessages}
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!token ? (
                  <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
                    เข้าสู่ระบบก่อนเพื่อดูห้องแชตและข้อความใหม่
                  </div>
                ) : null}

                {token && socialData === undefined ? (
                  <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      กำลังโหลดห้องแชต...
                    </div>
                  </div>
                ) : null}

                {socialData?.conversations?.length ? (
                  <div className="flex items-center gap-3 overflow-x-auto pb-1">
                    {socialData.conversations.slice(0, 8).map((conversation) => (
                      <Link
                        key={`chat-bubble-${conversation.id}`}
                        href={`/community/messages?conversation=${conversation.id}`}
                        className="flex shrink-0 flex-col items-center gap-2"
                      >
                        <div className={cn("relative rounded-full border bg-background/70 p-1 transition hover:border-primary/40 hover:bg-primary/5", conversation.hasUnread ? "border-primary/60 shadow-[0_0_0_4px_rgba(184,255,0,0.12)]" : "border-border/60")}>
                          <Avatar className="h-14 w-14">
                            <AvatarImage src={conversation.user.avatar || "/placeholder-user.jpg"} />
                            <AvatarFallback>{conversation.user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          {conversation.unreadCount ? (
                            <span className="absolute -right-1 -top-1 inline-flex min-w-[22px] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-[0_0_20px_rgba(184,255,0,0.45)]">
                              {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                            </span>
                          ) : null}
                        </div>
                        <span className={cn("max-w-[68px] truncate text-[11px]", conversation.hasUnread ? "font-medium text-foreground" : "text-muted-foreground")}>
                          {conversation.user.name}
                        </span>
                      </Link>
                    ))}
                    <Link href="/community/messages" className="flex shrink-0 flex-col items-center gap-2">
                      <div className="rounded-full border border-border/60 bg-background/70 p-4 transition hover:border-primary/40 hover:bg-primary/5">
                        <Edit3 className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <span className="text-[11px] text-muted-foreground">ใหม่</span>
                    </Link>
                  </div>
                ) : null}

                {socialData?.conversations?.slice(0, 4).map((conversation) => (
                  <Link key={conversation.id} href={`/community/messages?conversation=${conversation.id}`} className={cn("flex items-start gap-3 rounded-2xl p-3 transition hover:bg-background", conversation.hasUnread ? "border border-primary/30 bg-primary/5 shadow-[0_8px_24px_rgba(184,255,0,0.06)]" : "bg-background/60")}>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conversation.user.avatar || "/placeholder-user.jpg"} />
                      <AvatarFallback>{conversation.user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          {conversation.hasUnread ? <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary shadow-[0_0_14px_rgba(184,255,0,0.75)]" /> : null}
                          <p className={cn("truncate text-sm", conversation.hasUnread ? "font-semibold text-foreground" : "font-medium")}>{conversation.user.name}</p>
                        </div>
                        <span className={cn("text-[11px]", conversation.hasUnread ? "font-medium text-primary" : "text-muted-foreground")}>{conversation.timeAgo}</span>
                      </div>
                      <div className="mt-1 flex items-start justify-between gap-3">
                        <p className={cn("line-clamp-2 text-xs", conversation.hasUnread ? "font-medium text-foreground" : "text-muted-foreground")}>{conversation.preview?.content || conversation.lastMessageText}</p>
                        {conversation.unreadCount ? (
                          <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-[0_0_18px_rgba(184,255,0,0.45)]">
                            {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ))}

                {token && socialData && !socialData.conversations.length ? (
                  <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
                    ยังไม่มีห้องแชตตอนนี้
                    <div className="mt-2 text-xs text-muted-foreground/80">
                      เพิ่มเพื่อนหรือเริ่มคุยจากหน้าโปรไฟล์เพื่อน แล้วห้องแชตจะขึ้นตรงนี้อัตโนมัติ
                    </div>
                  </div>
                ) : null}

                <Link href="/community/messages">
                  <Button variant="outline" className="w-full rounded-2xl">เปิดหน้าแชตเต็ม</Button>
                </Link>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
}


