"use client"

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import useSWR from "swr"
import {
  Bell,
  Bookmark,
  Clock,
  Eye,
  Flag,
  ImagePlus,
  Loader2,
  MessageCircle,
  MessageSquare,
  Palette,
  Play,
  Plus,
  Repeat2,
  Search,
  Send,
  Sparkles,
  Type,
  Share2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  videos?: string[]
  visibility?: "public" | "friends"
  visibilityLabel?: string
  poll?: {
    question: string
    totalVotes: number
    options: Array<{
      id: string
      text: string
      votes: number
    }>
  } | null
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

type ComposerTool = "general" | "image" | "video" | "poll"
type StoryEditorTab = "theme" | "text" | "sticker"

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
  style?: {
    theme: "neon" | "midnight" | "sunset" | "glass"
    captionAlign: "top" | "center" | "bottom"
    captionSize: "sm" | "md" | "lg"
    sticker: "" | "Matchday" | "Breaking" | "Hot Take" | "Fan Cam"
  }
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

const storyThemes = [
  {
    id: "neon",
    label: "Neon",
    overlay: "linear-gradient(180deg,rgba(8,10,12,0.1)_0%,rgba(8,10,12,0.18)_40%,rgba(8,10,12,0.78)_100%), radial-gradient(circle_at_top, rgba(184,255,0,0.28), transparent 42%)",
    chip: "bg-[linear-gradient(135deg,#b8ff00,#7dff4c)]",
  },
  {
    id: "midnight",
    label: "Midnight",
    overlay: "linear-gradient(180deg,rgba(2,6,18,0.22)_0%,rgba(4,8,26,0.34)_44%,rgba(3,4,12,0.86)_100%), radial-gradient(circle_at_top_right, rgba(75,120,255,0.24), transparent 34%)",
    chip: "bg-[linear-gradient(135deg,#304ffe,#0f172a)]",
  },
  {
    id: "sunset",
    label: "Sunset",
    overlay: "linear-gradient(180deg,rgba(42,12,4,0.08)_0%,rgba(72,22,12,0.24)_42%,rgba(20,6,3,0.82)_100%), radial-gradient(circle_at_top, rgba(255,134,76,0.32), transparent 42%)",
    chip: "bg-[linear-gradient(135deg,#ff8a65,#ffca28)]",
  },
  {
    id: "glass",
    label: "Glass",
    overlay: "linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.08)_36%,rgba(8,10,12,0.72)_100%), radial-gradient(circle_at_top_left, rgba(255,255,255,0.16), transparent 36%)",
    chip: "bg-[linear-gradient(135deg,#d1d5db,#64748b)]",
  },
] as const

const storyStickers = ["", "Matchday", "Breaking", "Hot Take", "Fan Cam"] as const

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

type CommunityNotificationItem = {
  id: string
  type: "post_like" | "post_comment" | "post_repost"
  isRead: boolean
  timeAgo: string
  createdAt: string
  text: string
  actor: {
    id: string
    name: string
    avatar: string
  }
  post: {
    id: string
    title: string
  }
  commentPreview?: string
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

const communityShortcuts = [
  { label: "วิเคราะห์แมตช์", value: "match-discussion" },
  { label: "ข่าวย้ายทีม", value: "transfer-rumors" },
  { label: "พูดคุยนักเตะ", value: "player-discussion" },
  { label: "ทายผล", value: "predictions" },
]

function socialFetcher<T>(path: string, token: string) {
  return fetchJson<T>(path, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

function actionButtonClass(active = false, tone: "primary" | "danger" = "primary") {
  if (tone === "danger") {
    return cn(
      "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-all disabled:pointer-events-none disabled:opacity-60 sm:px-3 sm:py-1.5 sm:text-xs",
      active
        ? "border-destructive/40 bg-destructive/10 text-destructive"
        : "hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive",
    )
  }

  return cn(
    "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-all disabled:pointer-events-none disabled:opacity-60 sm:px-3 sm:py-1.5 sm:text-xs",
    active
      ? "border-primary/40 bg-primary/10 text-primary"
      : "hover:border-primary/40 hover:bg-primary/10 hover:text-primary",
  )
}

function getStoryThemeStyle(themeId: string) {
  return storyThemes.find((theme) => theme.id === themeId) || storyThemes[0]
}

function getStoryCaptionPlacement(position: "top" | "center" | "bottom") {
  if (position === "top") return "items-start pt-6"
  if (position === "center") return "items-center justify-center"
  return "items-end pb-6"
}

function getStoryCaptionSize(size: "sm" | "md" | "lg") {
  if (size === "sm") return "text-base leading-6"
  if (size === "lg") return "text-2xl leading-8 sm:text-[30px] sm:leading-10"
  return "text-lg leading-7 sm:text-2xl sm:leading-8"
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
  const [composerTool, setComposerTool] = useState<ComposerTool>("general")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [category, setCategory] = useState("general")
  const [uploading, setUploading] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadedVideos, setUploadedVideos] = useState<string[]>([])
  const [visibility, setVisibility] = useState<"public" | "friends">("public")
  const [pollQuestion, setPollQuestion] = useState("")
  const [pollOptions, setPollOptions] = useState(["", ""])
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
  const [storyTheme, setStoryTheme] = useState<(typeof storyThemes)[number]["id"]>("neon")
  const [storyCaptionAlign, setStoryCaptionAlign] = useState<"top" | "center" | "bottom">("bottom")
  const [storyCaptionSize, setStoryCaptionSize] = useState<"sm" | "md" | "lg">("md")
  const [storySticker, setStorySticker] = useState<(typeof storyStickers)[number]>("")
  const [showStoryEditor, setShowStoryEditor] = useState(false)
  const [storyEditorTab, setStoryEditorTab] = useState<StoryEditorTab>("theme")
  const [storyUploading, setStoryUploading] = useState(false)
  const [storySubmitting, setStorySubmitting] = useState(false)
  const [activeStory, setActiveStory] = useState<CommunityStory | null>(null)
  const [activeStoryGroupIndex, setActiveStoryGroupIndex] = useState(0)
  const [activeStoryIndex, setActiveStoryIndex] = useState(0)
  const [storyProgress, setStoryProgress] = useState(0)
  const previousUnreadMessagesRef = useRef(0)
  const previousUnreadActivityRef = useRef(0)
  const viewedStoryIdsRef = useRef<Set<string>>(new Set())
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const videoInputRef = useRef<HTMLInputElement | null>(null)

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
  const { data: notifications, mutate: mutateNotifications } = useSWR(
    token ? ["/community/notifications", token] : null,
    ([url, authToken]) =>
      socialFetcher<{
        pendingFriendRequests: number
        unreadMessages: number
        unreadActivity: number
        total: number
        activity: CommunityNotificationItem[]
      }>(url, authToken),
    { refreshInterval: 4000 },
  )
  const { data: storiesData, mutate: mutateStories } = useSWR(
    token ? ["/community/stories", token] : "/community/stories",
    (key: string | [string, string]) => {
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
  const unreadActivityCount = notifications?.unreadActivity || 0
  const activityNotifications = notifications?.activity || []
  const friendCount = socialData?.friends?.length || 0
  const incomingRequests = socialData?.requests?.incoming || []
  const suggestedPeople = socialData?.suggestions || []
  const topConversations = socialData?.conversations?.slice(0, 4) || []
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
    const nextUnreadActivity = notifications?.unreadActivity || 0
    if (previousUnreadActivityRef.current > 0 && nextUnreadActivity > previousUnreadActivityRef.current) {
      const latest = activityNotifications[0]
      toast({
        title: "มีการแจ้งเตือนใหม่",
        description: latest ? `${latest.actor.name} ${latest.text}` : "มีคนโต้ตอบกับโพสต์ของคุณ",
      })
    }
    previousUnreadActivityRef.current = nextUnreadActivity
  }, [activityNotifications, notifications?.unreadActivity, toast])

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

  async function handleVideoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!requireLogin("กรุณาเข้าสู่ระบบเพื่ออัปโหลดวิดีโอ")) return

    try {
      setUploadingVideo(true)
      const formData = new FormData()
      formData.append("files", file)
      const response = await fetch("/api/community/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || "Upload failed")
      setUploadedVideos((result?.urls || []).slice(0, 1))
      setComposerTool("video")
      toast({ title: "อัปโหลดวิดีโอแล้ว", description: "วิดีโอพร้อมแนบในโพสต์นี้" })
    } catch (error) {
      toast({
        title: "อัปโหลดวิดีโอไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setUploadingVideo(false)
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
      setShowStoryEditor(true)
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
        body: JSON.stringify({
          image: storyImage,
          caption: storyCaption,
          style: {
            theme: storyTheme,
            captionAlign: storyCaptionAlign,
            captionSize: storyCaptionSize,
            sticker: storySticker,
          },
        }),
      })
      setShowStoryComposer(false)
      setStoryImage("")
      setStoryCaption("")
      setStoryTheme("neon")
      setStoryCaptionAlign("bottom")
      setStoryCaptionSize("md")
      setStorySticker("")
      setShowStoryEditor(false)
      setStoryEditorTab("theme")
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

    const normalizedPollOptions = pollOptions.map((item) => item.trim()).filter(Boolean)
    const shouldSendPoll = pollQuestion.trim().length > 0 || normalizedPollOptions.length > 0
    if (shouldSendPoll && (pollQuestion.trim().length < 4 || normalizedPollOptions.length < 2)) {
      toast({ title: "โพลยังไม่ครบ", description: "กรุณาใส่คำถามและอย่างน้อย 2 ตัวเลือก", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      await fetchJson("/community/posts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          content,
          category,
          images: uploadedImages,
          videos: uploadedVideos,
          visibility,
          poll: shouldSendPoll
            ? {
                question: pollQuestion.trim(),
                options: normalizedPollOptions.map((option, index) => ({ id: `option-${index + 1}`, text: option })),
              }
            : null,
        }),
      })
      setTitle("")
      setContent("")
      setCategory("general")
      setUploadedImages([])
      setUploadedVideos([])
      setVisibility("public")
      setPollQuestion("")
      setPollOptions(["", ""])
      setComposerTool("general")
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

  function openComposer(tool: ComposerTool) {
    setShowCreatePost(true)
    setComposerTool(tool)
    window.setTimeout(() => {
      if (tool === "image") {
        imageInputRef.current?.click()
      } else if (tool === "video") {
        videoInputRef.current?.click()
      }
    }, 0)
  }

  function updatePollOption(index: number, value: string) {
    setPollOptions((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)))
  }

  function addPollOption() {
    setPollOptions((current) => (current.length >= 4 ? current : [...current, ""]))
  }

  function removePollOption(index: number) {
    setPollOptions((current) => (current.length <= 2 ? current : current.filter((_, itemIndex) => itemIndex !== index)))
  }

  function resetComposer() {
    setShowCreatePost(false)
    setComposerTool("general")
    setTitle("")
    setContent("")
    setCategory("general")
    setUploadedImages([])
    setUploadedVideos([])
    setPollQuestion("")
    setPollOptions(["", ""])
    setVisibility("public")
  }

  function renderComposerImageSection() {
    return (
      <div className="rounded-[22px] border border-dashed border-primary/30 bg-background/40 p-4 transition-colors">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">อัปโหลดรูปจากเครื่อง</p>
            <p className="text-xs text-muted-foreground">สูงสุด 4 รูป</p>
          </div>
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-background/70 px-4 py-2 text-sm text-foreground"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            เลือกรูป
          </button>
        </div>
        {uploadedImages.length ? (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {uploadedImages.map((image) => (
              <div key={image} className="relative overflow-hidden rounded-2xl border border-white/10">
                <div className="relative h-28">
                  <Image src={image} alt="upload" fill className="object-cover" unoptimized />
                </div>
                <button onClick={() => setUploadedImages((current) => current.filter((item) => item !== image))} className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[11px] text-white">ลบ</button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  function renderComposerVideoSection() {
    return (
      <div className="rounded-[22px] border border-dashed border-primary/30 bg-background/40 p-4 transition-colors">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">อัปโหลดวิดีโอ</p>
            <p className="text-xs text-muted-foreground">สูงสุด 1 วิดีโอ ขนาดไม่เกิน 30MB</p>
          </div>
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-background/70 px-4 py-2 text-sm text-foreground"
          >
            {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            เลือกวิดีโอ
          </button>
        </div>
        {uploadedVideos.length ? (
          <div className="mt-4 space-y-3">
            {uploadedVideos.map((video) => (
              <div key={video} className="overflow-hidden rounded-2xl border border-white/10 bg-background/70">
                <video src={video} controls className="h-64 w-full bg-black object-cover" />
                <div className="flex justify-end p-3">
                  <button
                    type="button"
                    onClick={() => setUploadedVideos((current) => current.filter((item) => item !== video))}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs text-muted-foreground transition hover:bg-white/15 hover:text-foreground"
                  >
                    ลบวิดีโอ
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  function renderComposerPollSection() {
    return (
      <div className="rounded-[22px] border border-primary/30 bg-background/40 p-4 transition-colors">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">สร้างโพล</p>
            <p className="text-xs text-muted-foreground">ใส่คำถามและตัวเลือกอย่างน้อย 2 ข้อ</p>
          </div>
          <Badge variant="outline" className="rounded-full border-white/10 px-3 py-1 text-xs text-muted-foreground">
            {pollOptions.filter((item) => item.trim()).length}/4 options
          </Badge>
        </div>
        <div className="mt-4 space-y-3">
          <Input
            placeholder="คำถามของโพล"
            value={pollQuestion}
            onChange={(event) => setPollQuestion(event.target.value)}
            className="rounded-2xl border-white/10 bg-background/70 shadow-none"
          />
          {pollOptions.map((option, index) => (
            <div key={`poll-option-${index}`} className="flex items-center gap-2">
              <Input
                placeholder={`ตัวเลือก ${index + 1}`}
                value={option}
                onChange={(event) => updatePollOption(index, event.target.value)}
                className="rounded-2xl border-white/10 bg-background/70 shadow-none"
              />
              {pollOptions.length > 2 ? (
                <Button type="button" variant="outline" size="sm" onClick={() => removePollOption(index)} className="rounded-full border-white/10">
                  ลบ
                </Button>
              ) : null}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addPollOption} disabled={pollOptions.length >= 4} className="rounded-full border-white/10">
            เพิ่มตัวเลือก
          </Button>
        </div>
      </div>
    )
  }

  function renderActiveComposerSection() {
    if (composerTool === "image") return renderComposerImageSection()
    if (composerTool === "video") return renderComposerVideoSection()
    if (composerTool === "poll") return renderComposerPollSection()
    return null
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

  function scrollToSection(sectionId: string) {
    if (typeof window === "undefined") return
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  async function markNotificationsAsRead() {
    if (!token || unreadActivityCount === 0) return
    try {
      await fetchJson("/community/notifications", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })
      await mutateNotifications()
    } catch {}
  }

  async function handleOpenActivity() {
    await markNotificationsAsRead()
    scrollToSection("community-activity")
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="px-3 pb-8 pt-4 sm:px-4 sm:pt-5 lg:px-6">
        <div className="mx-auto max-w-[1440px] overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,#1e1e20_0%,#151517_100%)] shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
          <div className="flex flex-wrap items-center gap-4 border-b border-white/10 px-5 py-4 lg:px-7">
            <Link href="/" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-background/60 px-4 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary">
              <span aria-hidden="true">←</span>
              กลับหน้าแรก
            </Link>

            <div className="text-[30px] font-display font-semibold tracking-tight text-foreground">FootballAI</div>

            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search community..."
                className="h-11 rounded-full border-white/10 bg-background/70 pl-11 text-sm shadow-none placeholder:text-muted-foreground focus-visible:ring-primary/40"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <div className="hidden items-center gap-2 lg:flex">
              <Link href="/" className="inline-flex h-10 items-center gap-2 rounded-full bg-primary/15 px-4 text-sm font-medium text-primary">
                <Users className="h-4 w-4" />
                Home
              </Link>
              <Link href="/community/messages" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary">
                <MessageSquare className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => void handleOpenActivity()}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
              >
                <Bell className="h-4 w-4" />
                {notifications?.total ? (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
                ) : null}
              </button>
            </div>
          </div>

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
                  <button
                    type="button"
                    onClick={() => setShowStoryEditor(true)}
                    className="group relative block h-80 w-full overflow-hidden rounded-[24px] border border-border/60 text-left transition hover:border-primary/40"
                  >
                    <Image src={storyImage} alt="Story preview" fill className="object-cover transition duration-300 group-hover:scale-[1.015]" unoptimized />
                    <div className="absolute inset-0" style={{ backgroundImage: getStoryThemeStyle(storyTheme).overlay.replaceAll("_", " ") }} />
                    <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                      <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur">
                        แตะรูปเพื่อแต่งสตอรี่
                      </span>
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur">
                        <Sparkles className="h-4 w-4" />
                      </span>
                    </div>
                    <div className={cn("absolute inset-0 flex p-5", getStoryCaptionPlacement(storyCaptionAlign))}>
                      <div className={cn("max-w-[82%] space-y-3", storyCaptionAlign === "center" ? "text-center" : "text-left")}>
                        {storySticker ? (
                          <span className="inline-flex rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary backdrop-blur">
                            {storySticker}
                          </span>
                        ) : null}
                        {storyCaption ? (
                          <p className={cn("font-semibold text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.42)]", getStoryCaptionSize(storyCaptionSize))}>
                            {storyCaption}
                          </p>
                        ) : (
                          <p className={cn("font-semibold text-white/55 drop-shadow-[0_8px_24px_rgba(0,0,0,0.28)]", getStoryCaptionSize(storyCaptionSize))}>
                            ตัวอย่างข้อความสตอรี่
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
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

          <Dialog open={showStoryEditor} onOpenChange={setShowStoryEditor}>
            <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden rounded-[32px] border-border/60 bg-[#0f1113] p-0 text-foreground">
              <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle>แต่งสตอรี่</DialogTitle>
                    <DialogDescription>จัดการลูกเล่นเป็นหมวดแบบเรียบร้อย ไม่ล้น ไม่ทับกัน</DialogDescription>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full text-muted-foreground hover:bg-white/5 hover:text-white"
                    onClick={() => setShowStoryEditor(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="space-y-5">
                <div className="space-y-4">
                  <div className="relative mx-auto h-[42vh] min-h-[320px] max-h-[540px] w-auto max-w-full aspect-[9/16] overflow-hidden rounded-[30px] border border-white/10 bg-black shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
                    {storyImage ? (
                      <>
                        <Image src={storyImage} alt="Story editor preview" fill className="object-cover" unoptimized />
                        <div className="absolute inset-0" style={{ backgroundImage: getStoryThemeStyle(storyTheme).overlay.replaceAll("_", " ") }} />
                        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 via-black/10 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                          <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur">
                            Story Preview
                          </span>
                          {storySticker ? (
                            <span className="inline-flex rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary backdrop-blur">
                              {storySticker}
                            </span>
                          ) : null}
                        </div>
                        <div className={cn("absolute inset-0 flex p-5", getStoryCaptionPlacement(storyCaptionAlign))}>
                          <div className={cn("max-w-[82%] space-y-3", storyCaptionAlign === "center" ? "mx-auto text-center" : "text-left")}>
                            {storyCaption ? (
                              <p className={cn("font-semibold text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.42)]", getStoryCaptionSize(storyCaptionSize))}>
                                {storyCaption}
                              </p>
                            ) : (
                              <p className={cn("font-semibold text-white/55 drop-shadow-[0_8px_24px_rgba(0,0,0,0.28)]", getStoryCaptionSize(storyCaptionSize))}>
                                แตะ "ข้อความ" บนรูปเพื่อพิมพ์แคปชัน
                              </p>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">อัปโหลดรูปก่อนเพื่อเริ่มแต่งสตอรี่</div>
                    )}
                  </div>

                  <div className="mx-auto max-w-[430px]">
                    <div className="inline-flex w-full rounded-full border border-white/10 bg-background/50 p-1">
                      <button
                        type="button"
                        onClick={() => setStoryEditorTab("theme")}
                        className={cn(
                          "flex-1 rounded-full px-4 py-2.5 text-sm transition",
                          storyEditorTab === "theme" ? "bg-primary/15 font-medium text-primary" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          ธีม
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStoryEditorTab("text")}
                        className={cn(
                          "flex-1 rounded-full px-4 py-2.5 text-sm transition",
                          storyEditorTab === "text" ? "bg-primary/15 font-medium text-primary" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Type className="h-4 w-4" />
                          ข้อความ
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStoryEditorTab("sticker")}
                        className={cn(
                          "flex-1 rounded-full px-4 py-2.5 text-sm transition",
                          storyEditorTab === "sticker" ? "bg-primary/15 font-medium text-primary" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          สติกเกอร์
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  {storyEditorTab === "theme" ? (
                    <div>
                      <p className="text-base font-semibold text-foreground">เลือกธีม</p>
                      <p className="mt-1 text-sm text-muted-foreground">เก็บธีมไว้ในหมวดเดียว เลือกแล้วเห็นผลบนภาพทันที</p>
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        {storyThemes.map((theme) => (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => setStoryTheme(theme.id)}
                            className={cn(
                              "rounded-2xl border p-3 text-left transition",
                              storyTheme === theme.id
                                ? "border-primary/50 bg-primary/10"
                                : "border-white/10 bg-background/40 hover:border-primary/30 hover:bg-primary/5",
                            )}
                          >
                            <div className={cn("h-24 rounded-xl", theme.chip)} />
                            <p className="mt-3 text-base font-medium">{theme.label}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {storyEditorTab === "text" ? (
                    <div className="space-y-5">
                      <div>
                        <p className="text-base font-semibold text-foreground">ข้อความสตอรี่</p>
                        <p className="mt-1 text-sm text-muted-foreground">พิมพ์ข้อความ แล้วค่อยปรับตำแหน่งกับขนาดในบล็อกเดียว</p>
                      </div>
                      <Textarea
                        value={storyCaption}
                        onChange={(event) => setStoryCaption(event.target.value)}
                        placeholder="อยากเขียนอะไรเกี่ยวกับสตอรี่นี้..."
                        className="min-h-32 resize-none rounded-2xl border-border/60 bg-background/70"
                      />
                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">ตำแหน่งข้อความ</p>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { value: "top", label: "ด้านบน" },
                              { value: "center", label: "กึ่งกลาง" },
                              { value: "bottom", label: "ด้านล่าง" },
                            ].map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setStoryCaptionAlign(option.value as "top" | "center" | "bottom")}
                                className={cn(
                                  "rounded-full border px-4 py-2 text-sm transition",
                                  storyCaptionAlign === option.value
                                    ? "border-primary/50 bg-primary/15 text-primary"
                                    : "border-white/10 bg-background/40 text-muted-foreground hover:border-primary/30 hover:text-primary",
                                )}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">ขนาดข้อความ</p>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { value: "sm", label: "เล็ก" },
                              { value: "md", label: "กลาง" },
                              { value: "lg", label: "ใหญ่" },
                            ].map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setStoryCaptionSize(option.value as "sm" | "md" | "lg")}
                                className={cn(
                                  "rounded-full border px-4 py-2 text-sm transition",
                                  storyCaptionSize === option.value
                                    ? "border-primary/50 bg-primary/15 text-primary"
                                    : "border-white/10 bg-background/40 text-muted-foreground hover:border-primary/30 hover:text-primary",
                                )}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {storyEditorTab === "sticker" ? (
                    <div>
                      <p className="text-base font-semibold text-foreground">สติกเกอร์ด่วน</p>
                      <p className="mt-1 text-sm text-muted-foreground">เลือกทีละแบบเพื่อคุมความเรียบร้อยของภาพ ไม่ให้เละเหมือนมีหลายชั้นเกินไป</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {storyStickers.map((sticker) => (
                          <button
                            key={sticker || "none"}
                            type="button"
                            onClick={() => setStorySticker(sticker)}
                            className={cn(
                              "rounded-full border px-4 py-2 text-sm transition",
                              storySticker === sticker
                                ? "border-primary/50 bg-primary/15 text-primary"
                                : "border-white/10 bg-background/40 text-muted-foreground hover:border-primary/30 hover:text-primary",
                            )}
                          >
                            {sticker || "ไม่ใช้"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                </div>
              </div>

              <DialogFooter className="shrink-0 border-t border-border/60 bg-[#0f1113] px-6 py-5 sm:justify-between">
                <Button variant="outline" onClick={() => setShowStoryEditor(false)} className="rounded-full">
                  เสร็จแล้ว
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
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: getStoryThemeStyle(activeStory.style?.theme || "neon").overlay.replaceAll("_", " "),
                      }}
                    />
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
                    <div className={cn("absolute inset-0 flex p-5", getStoryCaptionPlacement(activeStory.style?.captionAlign || "bottom"))}>
                      <div className={cn("max-w-[84%] space-y-3", activeStory.style?.captionAlign === "center" ? "mx-auto text-center" : "text-left")}>
                        {activeStory.style?.sticker ? (
                          <span className="inline-flex rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary backdrop-blur">
                            {activeStory.style.sticker}
                          </span>
                        ) : null}
                        {activeStory.caption ? (
                          <p className={cn("font-semibold text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.42)]", getStoryCaptionSize(activeStory.style?.captionSize || "md"))}>
                            {activeStory.caption}
                          </p>
                        ) : null}
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

          <div className="grid gap-6 bg-[radial-gradient(circle_at_top_left,rgba(184,255,0,0.08),transparent_30%),linear-gradient(180deg,#1b1b1d_0%,#151517_100%)] p-4 lg:p-5 xl:grid-cols-[270px_minmax(0,1fr)_320px]">
          <aside className="hidden space-y-5 xl:block">
            <Card className="overflow-hidden rounded-[28px] border-white/10 bg-card/90 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
              <div className="relative h-24 bg-[linear-gradient(135deg,rgba(184,255,0,0.22)_0%,rgba(184,255,0,0.08)_45%,rgba(255,255,255,0.06)_100%)]" />
              <CardContent className="px-5 pb-5">
                <div className="-mt-10 flex flex-col items-center text-center">
                  <Avatar className="h-20 w-20 border-4 border-card shadow-md">
                    <AvatarImage src={user?.avatar || "/placeholder-user.jpg"} />
                    <AvatarFallback>{user?.name?.charAt(0) || "F"}</AvatarFallback>
                  </Avatar>
                  <p className="mt-3 text-lg font-semibold text-foreground">{user?.name || "Football Fan"}</p>
                  <p className="text-sm text-muted-foreground">@{(user?.name || "footballfan").replace(/\s+/g, "_").toLowerCase()}</p>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 rounded-3xl bg-background/70 p-3 text-center">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{stats.total || 0}</p>
                    <p className="text-xs text-muted-foreground">Posts</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">{friendCount}</p>
                    <p className="text-xs text-muted-foreground">Friends</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">{notifications?.pendingFriendRequests || 0}</p>
                    <p className="text-xs text-muted-foreground">Requests</p>
                  </div>
                </div>

                <Link href="/profile" className="mt-5 block">
                  <Button className="h-11 w-full rounded-full">My Profile</Button>
                </Link>
              </CardContent>
            </Card>

            <Card id="community-activity" className="rounded-[28px] border-white/10 bg-card/90 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-foreground">Your shortcuts</CardTitle>
                  <button type="button" className="text-xs font-medium text-muted-foreground">See all</button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {communityShortcuts.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setSelectedCategory(item.value)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition",
                      selectedCategory === item.value ? "bg-primary/15 text-primary" : "hover:bg-background/70 text-foreground",
                    )}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-background/70 text-sm font-semibold text-muted-foreground">
                      {item.label.slice(0, 1)}
                    </span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </aside>

          <main className="space-y-5">
            <Card className="rounded-[28px] border-white/10 bg-card/90 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
              <CardContent className="space-y-5 p-4 sm:p-5">
                <div className="flex gap-3 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setShowStoryComposer(true)}
                    className="flex min-w-[76px] flex-col items-center gap-2"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-primary/50 bg-primary/10 text-primary">
                      <Plus className="h-5 w-5" />
                    </div>
                    <span className="max-w-[76px] truncate text-[11px] font-medium text-muted-foreground">สตอรี่ของคุณ</span>
                  </button>

                  {storyGroups.map((group, index) => (
                    <button key={group.id} type="button" onClick={() => openStoryViewer(index)} className="flex min-w-[76px] flex-col items-center gap-2">
                      <div
                        className={cn(
                          "relative h-16 w-16 overflow-hidden rounded-full border-2 p-0.5 transition-colors",
                          group.hasUnviewed ? "border-primary" : "border-white/10",
                        )}
                      >
                        <div className="relative h-full w-full overflow-hidden rounded-full">
                          <Image src={group.latestImage} alt={group.author.name} fill className="object-cover" unoptimized />
                        </div>
                      </div>
                      <span className={cn("max-w-[76px] truncate text-[11px] font-medium", group.hasUnviewed ? "text-foreground" : "text-muted-foreground")}>
                        {group.isOwn ? "ฉันเอง" : group.author.name}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="rounded-[26px] border border-white/10 bg-background/40 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 border border-white/10">
                      <AvatarImage src={user?.avatar || "/placeholder-user.jpg"} />
                      <AvatarFallback>{user?.name?.charAt(0) || "F"}</AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreatePost((value) => !value)
                        setComposerTool("general")
                      }}
                      className="flex h-11 flex-1 items-center rounded-full bg-background/70 px-4 text-left text-sm text-muted-foreground transition hover:bg-background"
                    >
                      Share something...
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 text-sm text-muted-foreground">
                    <button type="button" onClick={() => openComposer("image")} className="inline-flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-background/70">
                      <ImagePlus className="h-4 w-4 text-primary" />
                      Image
                    </button>
                    <button type="button" onClick={() => openComposer("video")} className="inline-flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-background/70">
                      <Upload className="h-4 w-4 text-primary" />
                      Video
                    </button>
                    <button type="button" onClick={() => openComposer("poll")} className="inline-flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-background/70">
                      <Bell className="h-4 w-4 text-primary" />
                      Poll
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="ml-auto inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm text-muted-foreground transition hover:bg-background/70">
                          <Users className="h-4 w-4" />
                          {visibility === "friends" ? "Friends" : "Public"}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuRadioGroup value={visibility} onValueChange={(value) => setVisibility(value === "friends" ? "friends" : "public")}>
                          <DropdownMenuRadioItem value="public">Public</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="friends">Friends</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>

            {showCreatePost ? (
              <Card className="rounded-[28px] border-white/10 bg-card/90 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-foreground">สร้างโพสต์ใหม่</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setComposerTool("image")}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
                        composerTool === "image" ? "border-primary/40 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:bg-background/70",
                      )}
                    >
                      <ImagePlus className="h-4 w-4" />
                      Image
                    </button>
                    <button
                      type="button"
                      onClick={() => setComposerTool("video")}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
                        composerTool === "video" ? "border-primary/40 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:bg-background/70",
                      )}
                    >
                      <Upload className="h-4 w-4" />
                      Video
                    </button>
                    <button
                      type="button"
                      onClick={() => setComposerTool("poll")}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
                        composerTool === "poll" ? "border-primary/40 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:bg-background/70",
                      )}
                    >
                      <Bell className="h-4 w-4" />
                      Poll
                    </button>
                    <div className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-background/40 px-3 py-1.5 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {visibility === "friends" ? "Friends" : "Public"}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.slice(1).map((item) => (
                      <Button
                        key={item.id}
                        variant="outline"
                        size="sm"
                        className={cn(
                          "rounded-full border-white/10",
                          category === item.id ? "border-primary/40 bg-primary/15 text-primary" : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
                        )}
                        onClick={() => setCategory(item.id)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                  <Input placeholder="หัวข้อโพสต์" value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-2xl border-white/10 bg-background/70 shadow-none" />
                  <Textarea
                    placeholder="อยากชวนคุยเรื่องอะไร..."
                    className="min-h-32 resize-none rounded-2xl border-white/10 bg-background/70 shadow-none"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                  />

                  <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleImageUpload} />
                  <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" className="hidden" onChange={handleVideoUpload} />

                  {renderActiveComposerSection()}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={resetComposer} className="rounded-full border-white/10 text-muted-foreground">ยกเลิก</Button>
                    <Button onClick={handleCreatePost} disabled={submitting} className="rounded-full">
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      โพสต์
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-1 pb-3">
              <div className="flex flex-wrap gap-2">
                {categories.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedCategory(item.id)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm transition",
                      selectedCategory === item.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="ml-auto text-sm text-muted-foreground">Sort by : <span className="font-medium text-foreground">Recent</span></div>
            </div>

            <div className="space-y-5">
              {posts.map((post) => {
                const isSaved = savedPostIds.has(post.id)
                const cover = post.images?.[0] || ""
                const video = post.videos?.[0] || ""
                const referenceId = getRepostReference(post)
                const isReposted = repostedReferenceIds.has(referenceId)
                return (
                  <Card key={post.id} className="overflow-hidden rounded-[28px] border-white/10 bg-card/90 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <Link href={`/community/friends/${post.author.id}`}>
                          <Avatar className="h-11 w-11 border border-white/10">
                            <AvatarImage src={post.author.avatar || "/placeholder-user.jpg"} />
                            <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        </Link>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link href={`/community/friends/${post.author.id}`} className="text-sm font-semibold text-foreground">{post.author.name}</Link>
                                <span className="text-xs text-muted-foreground">{post.timeAgo}</span>
                                <Badge variant="outline" className="rounded-full border-white/10 px-2 py-0.5 text-[10px] text-muted-foreground">{post.categoryLabel}</Badge>
                              </div>
                              {post.sharedItem?.type === "post" ? (
                                <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-primary">reposted by {post.author.name}</p>
                              ) : null}
                            </div>
                            <button type="button" className="rounded-full p-1.5 text-muted-foreground transition hover:bg-background/70 hover:text-foreground">•••</button>
                          </div>

                          <Link href={`/community/${post.id}`} className="mt-3 block">
                            <h3 className="text-lg font-semibold leading-snug text-foreground transition-colors hover:text-primary sm:text-[19px]">{post.title}</h3>
                          </Link>
                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{post.excerpt}</p>

                          {post.sharedItem?.title ? (
                            <a href={post.sharedItem.url} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-3 rounded-[22px] border border-white/10 bg-background/40 p-3 transition hover:bg-background/70">
                              {post.sharedItem.image ? (
                                <div className="relative h-14 w-20 overflow-hidden rounded-xl sm:h-16 sm:w-24">
                                  <Image src={post.sharedItem.image} alt={post.sharedItem.title} fill className="object-cover" unoptimized />
                                </div>
                              ) : null}
                              <div className="min-w-0">
                                <p className="text-[11px] text-muted-foreground">
                                  {post.sharedItem.type === "post" ? `Reposted from ${post.sharedItem.source || "community"}` : post.sharedItem.source || "Shared article"}
                                </p>
                                <p className="line-clamp-2 text-sm font-medium text-foreground">{post.sharedItem.title}</p>
                                <p className="mt-1 truncate text-[11px] text-muted-foreground">{post.sharedItem.url}</p>
                              </div>
                            </a>
                          ) : null}

                          {cover ? (
                            <div className="relative mt-4 h-64 overflow-hidden rounded-[24px] bg-background/70 sm:h-[360px]">
                              <Image src={cover} alt={post.title} fill className="object-cover" unoptimized />
                              <div className="absolute left-3 top-3">
                                <Badge className="rounded-full bg-background/90 px-2 py-1 text-[11px] text-foreground shadow-sm hover:bg-background/90">
                                  <ImagePlus className="mr-1 h-3 w-3" />
                                  {post.images?.length || 1} รูป
                                </Badge>
                              </div>
                            </div>
                          ) : null}

                          {video ? (
                            <div className="mt-4 overflow-hidden rounded-[24px] border border-white/10 bg-background/70">
                              <video src={video} controls className="h-64 w-full bg-black object-cover sm:h-[360px]" />
                              <div className="border-t border-white/10 px-4 py-3">
                                <Badge className="rounded-full bg-background/90 px-2 py-1 text-[11px] text-foreground shadow-sm hover:bg-background/90">
                                  <Play className="mr-1 h-3 w-3" />
                                  วิดีโอ
                                </Badge>
                              </div>
                            </div>
                          ) : null}

                          {post.poll?.question && post.poll.options.length ? (
                            <div className="mt-4 rounded-[24px] border border-white/10 bg-background/50 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <h4 className="text-sm font-semibold text-foreground">{post.poll.question}</h4>
                                <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                                  Poll
                                </Badge>
                              </div>
                              <div className="mt-3 space-y-2">
                                {post.poll.options.map((option) => {
                                  const percent = post.poll?.totalVotes ? Math.round((option.votes / post.poll.totalVotes) * 100) : 0
                                  return (
                                    <div key={option.id} className="overflow-hidden rounded-2xl border border-white/10 bg-background/70">
                                      <div className="flex items-center justify-between px-3 py-2 text-sm text-foreground">
                                        <span>{option.text}</span>
                                        <span className="text-xs text-muted-foreground">{percent}%</span>
                                      </div>
                                      <div className="h-1.5 bg-white/5">
                                        <div className="h-full bg-primary/70 transition-all" style={{ width: `${percent}%` }} />
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                              <p className="mt-3 text-xs text-muted-foreground">{post.poll.totalVotes} votes • {post.visibilityLabel || "Public"}</p>
                            </div>
                          ) : null}

                          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <button onClick={() => handleLike(post.id)} disabled={likingPostId === post.id} className={actionButtonClass(post.isLiked)}>
                              {likingPostId === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "♥"}
                              <span>{post.likes}</span>
                            </button>
                            <Link href={`/community/${post.id}`} className={actionButtonClass(false)}>
                              <MessageCircle className="h-4 w-4" />
                              <span>{post.comments}</span>
                            </Link>
                            <button
                              onClick={() => openRepostComposer(post)}
                              disabled={sharingFeedPostId === post.id || isReposted}
                              className={actionButtonClass(isReposted)}
                            >
                              {sharingFeedPostId === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat2 className="h-4 w-4" />}
                              <span>{post.reposts}</span>
                            </button>
                            <div className={actionButtonClass(false)}>
                              <Eye className="h-4 w-4" />
                              <span>{post.views}</span>
                            </div>
                            <button onClick={() => savePost(post)} disabled={savingPostId === post.id} className={actionButtonClass(isSaved)}>
                              {savingPostId === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />}
                              <span>{isSaved ? "Saved" : "Save"}</span>
                            </button>
                            <button onClick={() => shareLink(post)} className={actionButtonClass(false)}>
                              <Share2 className="h-4 w-4" />
                              <span>Share</span>
                            </button>
                            <Link href={buildChatShareHref(post)} className={actionButtonClass(false)}>
                              <MessageSquare className="h-4 w-4" />
                              <span>Chat</span>
                            </Link>
                            <button onClick={() => reportPost(post.id)} disabled={reportingPostId === post.id} className={actionButtonClass(false, "danger")}>
                              {reportingPostId === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                              <span>Report</span>
                            </button>
                          </div>

                          <div className="mt-4 flex items-center gap-3 rounded-full bg-background/70 px-3 py-2">
                            <Avatar className="h-8 w-8 border border-white/10">
                              <AvatarImage src={user?.avatar || "/placeholder-user.jpg"} />
                              <AvatarFallback>{user?.name?.charAt(0) || "F"}</AvatarFallback>
                            </Avatar>
                            <Link href={`/community/${post.id}`} className="text-sm text-muted-foreground transition hover:text-foreground">
                              Write your comment
                            </Link>
                            <Link href={`/community/${post.id}`} className="ml-auto text-xs font-medium text-primary hover:text-primary">
                              อ่านต่อ
                            </Link>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {!isLoading && posts.length === 0 ? (
                <Card className="rounded-[28px] border-2 border-dashed border-white/10 bg-card/90">
                  <CardContent className="py-16 text-center">
                    <MessageSquare className="mx-auto mb-4 h-14 w-14 text-muted-foreground/40" />
                    <h3 className="text-xl font-semibold text-foreground">ยังไม่พบโพสต์</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">ลองเปลี่ยนหมวดหรือสร้างโพสต์ใหม่เพื่อเริ่มต้นบทสนทนา</p>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </main>

          <aside className="space-y-5">
            <Card className="rounded-[28px] border-white/10 bg-card/90 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-foreground">Activity</CardTitle>
                  <button type="button" className="text-xs font-medium text-muted-foreground">See all</button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {activityNotifications.length ? (
                  activityNotifications.slice(0, 5).map((item) => (
                    <Link key={item.id} href={item.post.id ? `/community/${item.post.id}` : "/community"} className="flex items-start gap-3 rounded-2xl px-1 py-1 transition hover:bg-background/40">
                      <Avatar className="h-11 w-11 border border-white/10">
                        <AvatarImage src={item.actor.avatar || "/placeholder-user.jpg"} />
                        <AvatarFallback>{item.actor.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">{item.actor.name}</span> {item.text}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{item.post.title}</p>
                        {item.commentPreview ? <p className="truncate text-xs text-primary/80">"{item.commentPreview}"</p> : null}
                        <p className="mt-1 text-[11px] text-muted-foreground">{item.timeAgo}</p>
                      </div>
                      {!item.isRead ? <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary" /> : null}
                    </Link>
                  ))
                ) : incomingRequests.length ? (
                  incomingRequests.slice(0, 4).map((request) => (
                    <div key={request.id} className="flex items-center gap-3 rounded-2xl px-1 py-1">
                      <Avatar className="h-11 w-11 border border-white/10">
                        <AvatarImage src={request.user.avatar || "/placeholder-user.jpg"} />
                        <AvatarFallback>{request.user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">{request.user.name}</span> ส่งคำขอเป็นเพื่อน
                        </p>
                        <p className="text-xs text-muted-foreground">{request.timeAgo}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleFriendRequest(request.id, "accept")} disabled={handlingRequestId === request.id} className="h-8 rounded-full px-3">
                          รับ
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">วันนี้ยังไม่มี activity ใหม่</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-white/10 bg-card/90 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-foreground">Suggested For You</CardTitle>
                  <button type="button" className="text-xs font-medium text-muted-foreground">See all</button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {suggestedPeople.length ? (
                  suggestedPeople.slice(0, 4).map((person) => (
                    <div key={person.id} className="flex items-center gap-3">
                      <Link href={`/community/friends/${person.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                        <Avatar className="h-11 w-11 border border-white/10">
                          <AvatarImage src={person.avatar || "/placeholder-user.jpg"} />
                          <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{person.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{person.favoriteTeam || person.bio || "Suggested for you"}</p>
                        </div>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => sendFriendRequest(person.id)}
                        disabled={sendingFriendId === person.id}
                        className="rounded-full px-3 text-primary hover:bg-primary/10 hover:text-primary"
                      >
                        {sendingFriendId === person.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Follow"}
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">ยังไม่มีคนแนะนำเพิ่ม</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-white/10 bg-card/90 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base text-foreground">Messages</CardTitle>
                  {totalUnreadMessages ? (
                    <Badge className="rounded-full bg-primary/15 px-3 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15">
                      {totalUnreadMessages > 99 ? "99+" : totalUnreadMessages} new
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!token ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-background/40 p-4 text-sm text-muted-foreground">
                    เข้าสู่ระบบก่อนเพื่อดูห้องแชตและข้อความใหม่
                  </div>
                ) : null}

                {token && socialData === undefined ? (
                  <div className="rounded-2xl border border-white/10 bg-background/40 p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      กำลังโหลดห้องแชต...
                    </div>
                  </div>
                ) : null}

                {topConversations.map((conversation) => (
                  <Link key={conversation.id} href={`/community/messages?conversation=${conversation.id}`} className="flex items-start gap-3 rounded-2xl p-3 transition hover:bg-background/70">
                    <Avatar className="h-10 w-10 border border-white/10">
                      <AvatarImage src={conversation.user.avatar || "/placeholder-user.jpg"} />
                      <AvatarFallback>{conversation.user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{conversation.user.name}</p>
                        <span className="text-[11px] text-muted-foreground">{conversation.timeAgo}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{conversation.preview?.content || conversation.lastMessageText}</p>
                    </div>
                  </Link>
                ))}

                {token && socialData && !socialData.conversations.length ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-background/40 p-4 text-sm text-muted-foreground">
                    ยังไม่มีห้องแชตตอนนี้
                  </div>
                ) : null}

                <Link href="/community/messages">
                  <Button variant="outline" className="h-11 w-full rounded-full border-white/10 text-foreground hover:bg-background/70">Open Messages</Button>
                </Link>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
      </div>
    </div>
  )
}
