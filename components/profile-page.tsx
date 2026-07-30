"use client"

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import useSWR from "swr"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  Bell,
  Bookmark,
  CalendarDays,
  Camera,
  Edit,
  Eye,
  Globe,
  Heart,
  Images,
  KeyRound,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Save,
  Search,
  Settings,
  Shield,
  Trash2,
  Trophy,
  Users,
} from "lucide-react"

import { apiUrl, fetchJson } from "@/lib/api-client"
import { saveAuthSession } from "@/lib/auth-client"
import { useAuthSession } from "@/hooks/use-auth-session"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

const COVER_STORAGE_PREFIX = "footballai_profile_cover_"

type CoverTheme = {
  accent: string
  overlay: string
  glow: string
}

const DEFAULT_COVER_THEME: CoverTheme = {
  accent: "#c7ff3b",
  overlay: "linear-gradient(90deg, rgba(7,9,11,0.52) 0%, rgba(7,9,11,0.24) 42%, rgba(7,9,11,0.58) 100%)",
  glow: "0 24px 60px rgba(0,0,0,0.32)",
}

type ProfileStory = {
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

type ProfileStoryGroup = {
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
  stories: ProfileStory[]
}

function authorizedFetcher<T>(url: string, token: string) {
  return fetch(apiUrl(url), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((res) => res.json())
}

function normalizeCoverUrl(url: string) {
  const value = (url || "").trim()
  if (!value) return ""
  if (!value.startsWith("/uploads/community/")) return value
  return value.includes("?") ? value : `${value}?v=${encodeURIComponent(value)}`
}

function getCoverStorageKey(userId: string) {
  return `${COVER_STORAGE_PREFIX}${userId}`
}

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((channel) => clampChannel(channel).toString(16).padStart(2, "0")).join("")}`
}

function buildCoverTheme(r: number, g: number, b: number): CoverTheme {
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const isLightImage = luminance > 0.62
  const accent = rgbToHex(r * 0.82 + 46, g * 0.9 + 32, b * 0.72 + 18)

  return {
    accent,
    overlay: isLightImage
      ? "linear-gradient(90deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 38%, rgba(8,10,12,0.28) 100%)"
      : "linear-gradient(90deg, rgba(7,9,11,0.58) 0%, rgba(7,9,11,0.18) 42%, rgba(7,9,11,0.64) 100%)",
    glow: isLightImage ? "0 24px 60px rgba(255,255,255,0.22)" : "0 24px 60px rgba(0,0,0,0.34)",
  }
}

export function ProfilePage() {
  const { token, user, logout } = useAuthSession()
  const { toast } = useToast()
  const viewedStoryIdsRef = useRef<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false)
  const [activeProfileStory, setActiveProfileStory] = useState<ProfileStory | null>(null)
  const [activeProfileStoryIndex, setActiveProfileStoryIndex] = useState(0)
  const [profileStoryProgress, setProfileStoryProgress] = useState(0)
  const [editOpen, setEditOpen] = useState(false)
  const [coverEditorOpen, setCoverEditorOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [postTab, setPostTab] = useState<"posts" | "reposts" | "media">("posts")
  const [coverImagePreview, setCoverImagePreview] = useState("")
  const [coverTheme, setCoverTheme] = useState<CoverTheme>(DEFAULT_COVER_THEME)
  const [avatarDraftUrl, setAvatarDraftUrl] = useState("")
  const [avatarDraftFile, setAvatarDraftFile] = useState<File | null>(null)
  const [coverDraftUrl, setCoverDraftUrl] = useState("")
  const [coverDraftFile, setCoverDraftFile] = useState<File | null>(null)
  const [coverPositionX, setCoverPositionX] = useState(0)
  const [coverPositionY, setCoverPositionY] = useState(0)
  const [coverScale, setCoverScale] = useState(1)
  const [profileForm, setProfileForm] = useState({
    name: "",
    avatar: "",
    coverImage: "",
    coverPositionX: 0,
    coverPositionY: 0,
    coverScale: 1,
    favoriteTeam: "",
    bio: "",
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  })
  const [deleteForm, setDeleteForm] = useState({
    currentPassword: "",
  })
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const coverInputRef = useRef<HTMLInputElement | null>(null)

  const { data: profileData, mutate: mutateProfile } = useSWR(
    token ? ["/auth/me", token] : null,
    ([url, authToken]) => authorizedFetcher<{ user: any }>(url, authToken),
  )
  const { data: favoritesData, mutate: mutateFavorites } = useSWR(
    token ? ["/favorites", token] : null,
    ([url, authToken]) => authorizedFetcher<{ items: any[] }>(url, authToken),
  )
  const { data: predictionsData, mutate: mutatePredictions } = useSWR(
    token ? ["/predictions", token] : null,
    ([url, authToken]) => authorizedFetcher<{ items: any[] }>(url, authToken),
  )
  const { data: postsData } = useSWR(
    token ? ["/community/posts?mine=true&limit=12", token] : null,
    ([url, authToken]) => authorizedFetcher<{ items: any[] }>(url, authToken),
  )
  const { data: storiesData, mutate: mutateStories } = useSWR(
    token ? ["/community/stories", token] : null,
    ([url, authToken]) => authorizedFetcher<{ items: ProfileStoryGroup[] }>(url, authToken),
  )
  const { data: activityData, mutate: mutateActivity } = useSWR(
    token ? ["/users/me/activity", token] : null,
    ([url, authToken]) => authorizedFetcher<any>(url, authToken),
  )

  const stableUserId = user?.id || profileData?.user?.id || ""
  const currentUser = mounted ? profileData?.user || user : null
  const displayName = currentUser?.name || "ผู้ใช้งาน"
  const displayEmail = currentUser?.email || "-"
  const displayAvatar = avatarDraftUrl || currentUser?.avatar || "/placeholder-user.jpg"
  const displayCoverImage = normalizeCoverUrl(coverImagePreview || currentUser?.coverImage || "")

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!currentUser) return
    setProfileForm({
      name: currentUser.name || "",
      avatar: currentUser.avatar || "",
      coverImage: currentUser.coverImage || "",
      coverPositionX: typeof currentUser.coverPositionX === "number" ? currentUser.coverPositionX : 0,
      coverPositionY: typeof currentUser.coverPositionY === "number" ? currentUser.coverPositionY : 0,
      coverScale: typeof currentUser.coverScale === "number" ? currentUser.coverScale : 1,
      favoriteTeam: currentUser.favoriteTeam || "",
      bio: currentUser.bio || "",
    })
    setCoverPositionX(typeof currentUser.coverPositionX === "number" ? currentUser.coverPositionX : 0)
    setCoverPositionY(typeof currentUser.coverPositionY === "number" ? currentUser.coverPositionY : 0)
    setCoverScale(typeof currentUser.coverScale === "number" ? currentUser.coverScale : 1)
    if (currentUser.coverImage) {
      setCoverImagePreview(currentUser.coverImage || "")
      return
    }

    if (typeof window !== "undefined" && currentUser.id) {
      const savedCover = window.localStorage.getItem(getCoverStorageKey(currentUser.id)) || ""
      if (savedCover) {
        setCoverImagePreview(savedCover)
      }
    }
  }, [currentUser])

  useEffect(() => {
    return () => {
      if (avatarDraftUrl && avatarDraftUrl.startsWith("blob:")) {
        URL.revokeObjectURL(avatarDraftUrl)
      }
      if (coverDraftUrl && coverDraftUrl.startsWith("blob:")) {
        URL.revokeObjectURL(coverDraftUrl)
      }
    }
  }, [avatarDraftUrl, coverDraftUrl])

  useEffect(() => {
    if (typeof window === "undefined" || !stableUserId) return

    if (displayCoverImage) {
      window.localStorage.setItem(getCoverStorageKey(stableUserId), displayCoverImage)
      return
    }

    window.localStorage.removeItem(getCoverStorageKey(stableUserId))
  }, [displayCoverImage, stableUserId])

  useEffect(() => {
    if (!displayCoverImage || typeof window === "undefined") {
      setCoverTheme(DEFAULT_COVER_THEME)
      return
    }

    let cancelled = false
    const image = window.document.createElement("img")
    image.crossOrigin = "anonymous"
    image.decoding = "async"
    image.src = displayCoverImage

    image.onload = () => {
      if (cancelled) return

      try {
        const canvas = window.document.createElement("canvas")
        const context = canvas.getContext("2d", { willReadFrequently: true })
        if (!context) {
          setCoverTheme(DEFAULT_COVER_THEME)
          return
        }

        const sampleWidth = 48
        const sampleHeight = 48
        canvas.width = sampleWidth
        canvas.height = sampleHeight
        context.drawImage(image, 0, 0, sampleWidth, sampleHeight)
        const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data

        let red = 0
        let green = 0
        let blue = 0
        let total = 0

        for (let index = 0; index < pixels.length; index += 4) {
          const alpha = pixels[index + 3] / 255
          if (alpha <= 0.05) continue
          red += pixels[index] * alpha
          green += pixels[index + 1] * alpha
          blue += pixels[index + 2] * alpha
          total += alpha
        }

        if (!total) {
          setCoverTheme(DEFAULT_COVER_THEME)
          return
        }

        setCoverTheme(buildCoverTheme(red / total, green / total, blue / total))
      } catch {
        setCoverTheme(DEFAULT_COVER_THEME)
      }
    }

    image.onerror = () => {
      if (!cancelled) setCoverTheme(DEFAULT_COVER_THEME)
    }

    return () => {
      cancelled = true
    }
  }, [displayCoverImage])

  const favoriteTeams = useMemo(
    () => ((favoritesData?.items || []) as any[]).filter((item) => item.itemType === "team").map((item) => item.title).slice(0, 5),
    [favoritesData?.items],
  )
  const favoritePlayers = useMemo(
    () => ((favoritesData?.items || []) as any[]).filter((item) => item.itemType === "player").map((item) => item.title).slice(0, 5),
    [favoritesData?.items],
  )
  const fanProfile = currentUser?.fanProfile
  const fanStats = fanProfile?.stats || { postsCount: 0, matchRoomPostsCount: 0, pollVotesCount: 0 }
  const fanBadges = (fanProfile?.badges || []).filter(Boolean) as Array<{ id: string; label: string; description: string }>
  const ownPosts = useMemo(
    () => (postsData?.items || []).filter((item) => item.sharedItem?.type !== "post"),
    [postsData?.items],
  )
  const ownReposts = useMemo(
    () => (postsData?.items || []).filter((item) => item.sharedItem?.type === "post"),
    [postsData?.items],
  )
  const ownStoryGroup = useMemo(
    () => (storiesData?.items || []).find((group) => group.author.id === currentUser?.id) || null,
    [currentUser?.id, storiesData?.items],
  )
  const ownStoryHasUnviewed = Boolean(ownStoryGroup?.stories?.length && ownStoryGroup?.hasUnviewed)
  const mediaPosts = useMemo(
    () => (postsData?.items || []).filter((item) => (Array.isArray(item.images) && item.images.length > 0) || (Array.isArray(item.videos) && item.videos.length > 0)),
    [postsData?.items],
  )
  const profileFeed = postTab === "posts" ? ownPosts : ownReposts
  const panelClass = "rounded-[28px] border border-white/10 bg-card/90 shadow-[0_12px_40px_rgba(0,0,0,0.22)]"
  const itemCardClass = "rounded-[22px] border border-white/10 bg-background/40 p-4"
  const username = displayName.replace(/\s+/g, "").toLowerCase()
  const coverTransform = `translate(${coverPositionX}%, ${coverPositionY}%) scale(${coverScale})`
  const memberSince = currentUser?.createdAt
    ? new Intl.DateTimeFormat("th-TH", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(currentUser.createdAt))
    : "-"

  useEffect(() => {
    if (!ownStoryGroup?.stories?.length) {
      setActiveProfileStory(null)
      setActiveProfileStoryIndex(0)
      setProfileStoryProgress(0)
      return
    }

    if (!activeProfileStory) return

    const nextStory = ownStoryGroup.stories[activeProfileStoryIndex]
    if (!nextStory) {
      setActiveProfileStory(null)
      setActiveProfileStoryIndex(0)
      setProfileStoryProgress(0)
      return
    }

    if (nextStory.id !== activeProfileStory.id) {
      setActiveProfileStory(nextStory)
    }
  }, [activeProfileStory, activeProfileStoryIndex, ownStoryGroup])

  useEffect(() => {
    if (!activeProfileStory) {
      setProfileStoryProgress(0)
      return
    }

    setProfileStoryProgress(0)
    const duration = 5000
    const startedAt = Date.now()
    const interval = window.setInterval(() => {
      const nextProgress = Math.min(((Date.now() - startedAt) / duration) * 100, 100)
      setProfileStoryProgress(nextProgress)
    }, 60)

    const timer = window.setTimeout(() => {
      setProfileStoryProgress(100)
      setActiveProfileStoryIndex((current) => {
        const total = ownStoryGroup?.stories?.length || 0
        if (current < total - 1) return current + 1
        setActiveProfileStory(null)
        return 0
      })
    }, duration)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timer)
    }
  }, [activeProfileStory, ownStoryGroup?.stories?.length])

  useEffect(() => {
    if (!activeProfileStory?.id || activeProfileStory.isOwn || viewedStoryIdsRef.current.has(activeProfileStory.id)) return
    if (!token) return

    viewedStoryIdsRef.current.add(activeProfileStory.id)
    void fetchJson("/community/stories", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ storyId: activeProfileStory.id }),
    }).then(() => mutateStories()).catch(() => undefined)
  }, [activeProfileStory?.id, activeProfileStory?.isOwn, mutateStories, token])

  async function updateProfileFields(payload: Record<string, unknown>) {
    if (!token) return null

    const data = await fetchJson<{ user: any }>("/auth/me", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    saveAuthSession({ token, user: data.user })
    await mutateProfile({ user: data.user }, false)
    return data.user
  }

  async function handleSaveProfile() {
    if (!token) return
    setSavingProfile(true)
    try {
      await updateProfileFields(profileForm)
      if (profileForm.coverImage) {
        setCoverImagePreview(profileForm.coverImage)
      }
      setEditOpen(false)
      toast({ title: "บันทึกโปรไฟล์แล้ว", description: "ข้อมูลของคุณถูกอัปเดตเรียบร้อย" })
    } catch (error) {
      toast({
        title: "บันทึกโปรไฟล์ไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleCoverImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !token) return

    if (coverDraftUrl && coverDraftUrl.startsWith("blob:")) {
      URL.revokeObjectURL(coverDraftUrl)
    }

    setCoverDraftFile(file)
    setCoverDraftUrl(URL.createObjectURL(file))
    setCoverPositionX(typeof currentUser?.coverPositionX === "number" ? currentUser.coverPositionX : 0)
    setCoverPositionY(typeof currentUser?.coverPositionY === "number" ? currentUser.coverPositionY : 0)
    setCoverScale(typeof currentUser?.coverScale === "number" ? currentUser.coverScale : 1)
    setCoverEditorOpen(true)
    event.target.value = ""
  }

  async function handleSaveCoverImage() {
    if (!token || !coverDraftFile) return

    try {
      setUploadingCover(true)
      const formData = new FormData()
      formData.append("files", coverDraftFile)
      formData.append("purpose", "cover")
      const response = await fetch("/api/community/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || "Upload failed")

      const coverImage = result?.urls?.[0] || ""
      if (!coverImage) {
        const pendingImage = [...(Array.isArray(result?.items) ? result.items : []), ...(Array.isArray(result?.pendingItems) ? result.pendingItems : [])].find(
          (item: any) => item?.mediaType === "image" && item?.status === "pending_review",
        )
        if (pendingImage) {
          await updateProfileFields({ pendingCoverMediaId: pendingImage.id })
          setCoverEditorOpen(false)
          setCoverDraftFile(null)
          if (coverDraftUrl && coverDraftUrl.startsWith("blob:")) URL.revokeObjectURL(coverDraftUrl)
          setCoverDraftUrl("")
          toast({
            title: "อัปโหลดภาพพื้นหลังแล้ว",
            description: "รูปกำลังรอการตรวจสอบก่อนจึงจะใช้เป็นภาพพื้นหลังได้",
          })
          return
        }
        throw new Error("Upload failed")
      }

      setCoverImagePreview(coverImage)
      const updatedUser = await updateProfileFields({
        coverImage,
        coverPositionX,
        coverPositionY,
        coverScale,
      })
      const persistedCover = updatedUser?.coverImage || coverImage
      const persistedPositionX = typeof updatedUser?.coverPositionX === "number" ? updatedUser.coverPositionX : coverPositionX
      const persistedPositionY = typeof updatedUser?.coverPositionY === "number" ? updatedUser.coverPositionY : coverPositionY
      const persistedScale = typeof updatedUser?.coverScale === "number" ? updatedUser.coverScale : coverScale

      setCoverImagePreview(persistedCover)
      setCoverPositionX(persistedPositionX)
      setCoverPositionY(persistedPositionY)
      setCoverScale(persistedScale)
      setProfileForm((current) => ({
        ...current,
        coverImage: persistedCover,
        coverPositionX: persistedPositionX,
        coverPositionY: persistedPositionY,
        coverScale: persistedScale,
      }))
      setCoverEditorOpen(false)
      setCoverDraftFile(null)
      if (coverDraftUrl && coverDraftUrl.startsWith("blob:")) {
        URL.revokeObjectURL(coverDraftUrl)
      }
      setCoverDraftUrl("")
      toast({ title: "อัปเดตภาพพื้นหลังแล้ว", description: "ภาพพื้นหลังโปรไฟล์ถูกบันทึกเรียบร้อย" })
    } catch (error) {
      setCoverImagePreview(currentUser?.coverImage || "")
      toast({
        title: "อัปโหลดภาพพื้นหลังไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setUploadingCover(false)
    }
  }

  function handleCloseCoverEditor(open: boolean) {
    setCoverEditorOpen(open)
    if (open) return

    setCoverDraftFile(null)
    if (coverDraftUrl && coverDraftUrl.startsWith("blob:")) {
      URL.revokeObjectURL(coverDraftUrl)
    }
    setCoverDraftUrl("")
    setCoverPositionX(typeof currentUser?.coverPositionX === "number" ? currentUser.coverPositionX : 0)
    setCoverPositionY(typeof currentUser?.coverPositionY === "number" ? currentUser.coverPositionY : 0)
    setCoverScale(typeof currentUser?.coverScale === "number" ? currentUser.coverScale : 1)
  }

  function handleAvatarDialogChange(open: boolean) {
    setAvatarViewerOpen(open)
    if (open) return

    setAvatarDraftFile(null)
    if (avatarDraftUrl && avatarDraftUrl.startsWith("blob:")) {
      URL.revokeObjectURL(avatarDraftUrl)
    }
    setAvatarDraftUrl("")
  }

  function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (avatarDraftUrl && avatarDraftUrl.startsWith("blob:")) {
      URL.revokeObjectURL(avatarDraftUrl)
    }

    setAvatarDraftFile(file)
    setAvatarDraftUrl(URL.createObjectURL(file))
    setAvatarViewerOpen(true)
    event.target.value = ""
  }

  async function handleSaveAvatar() {
    if (!token || !avatarDraftFile) return

    try {
      setUploadingAvatar(true)
      const formData = new FormData()
      formData.append("files", avatarDraftFile)
      formData.append("purpose", "profile")
      const response = await fetch("/api/community/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || "Upload failed")

      const avatar = result?.urls?.[0] || ""
      if (!avatar) {
        const pendingImage = [...(Array.isArray(result?.items) ? result.items : []), ...(Array.isArray(result?.pendingItems) ? result.pendingItems : [])].find(
          (item: any) => item?.mediaType === "image" && item?.status === "pending_review",
        )
        if (pendingImage) {
          await updateProfileFields({ pendingAvatarMediaId: pendingImage.id })
          setAvatarDraftFile(null)
          if (avatarDraftUrl && avatarDraftUrl.startsWith("blob:")) URL.revokeObjectURL(avatarDraftUrl)
          setAvatarDraftUrl("")
          setAvatarViewerOpen(false)
          toast({
            title: "อัปโหลดรูปโปรไฟล์แล้ว",
            description: "รูปกำลังรอการตรวจสอบก่อนจึงจะใช้เป็นรูปโปรไฟล์ได้",
          })
          return
        }
        throw new Error("Upload failed")
      }

      const updatedUser = await updateProfileFields({ avatar })
      const persistedAvatar = updatedUser?.avatar || avatar
      setProfileForm((current) => ({ ...current, avatar: persistedAvatar }))
      setAvatarDraftFile(null)
      if (avatarDraftUrl && avatarDraftUrl.startsWith("blob:")) {
        URL.revokeObjectURL(avatarDraftUrl)
      }
      setAvatarDraftUrl("")
      setAvatarViewerOpen(false)
      toast({ title: "อัปเดตรูปโปรไฟล์แล้ว", description: "รูปโปรไฟล์ใหม่ถูกบันทึกเรียบร้อย" })
    } catch (error) {
      toast({
        title: "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setUploadingAvatar(false)
    }
  }

  function openOwnStoryViewer() {
    const firstStory = ownStoryGroup?.stories?.[0]
    if (!firstStory) return

    void mutateStories((current) => {
      if (!current?.items) return current
      return {
        ...current,
        items: current.items.map((group) =>
          group.author.id === currentUser?.id
            ? {
                ...group,
                hasUnviewed: false,
                stories: group.stories.map((story) => ({ ...story, isViewed: true })),
              }
            : group,
        ),
      }
    }, false)

    setActiveProfileStoryIndex(0)
    setActiveProfileStory(firstStory)
    setProfileStoryProgress(0)
  }

  function closeOwnStoryViewer() {
    setActiveProfileStory(null)
    setActiveProfileStoryIndex(0)
    setProfileStoryProgress(0)
  }

  function goToPreviousOwnStory() {
    if (!ownStoryGroup?.stories?.length) return
    if (activeProfileStoryIndex > 0) {
      setActiveProfileStoryIndex((current) => current - 1)
      setProfileStoryProgress(0)
      return
    }
    closeOwnStoryViewer()
  }

  function goToNextOwnStory() {
    const total = ownStoryGroup?.stories?.length || 0
    if (!total) return
    if (activeProfileStoryIndex < total - 1) {
      setActiveProfileStoryIndex((current) => current + 1)
      setProfileStoryProgress(0)
      return
    }
    closeOwnStoryViewer()
  }

  async function handleChangePassword() {
    if (!token) return
    setSavingPassword(true)
    try {
      await fetchJson("/auth/change-password", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(passwordForm),
      })
      setPasswordForm({ currentPassword: "", newPassword: "" })
      setPasswordOpen(false)
      toast({ title: "เปลี่ยนรหัสผ่านแล้ว", description: "รหัสผ่านใหม่ถูกบันทึกเรียบร้อย" })
    } catch (error) {
      toast({
        title: "เปลี่ยนรหัสผ่านไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleDeleteAccount() {
    if (!token) return
    setDeletingAccount(true)
    try {
      await fetchJson("/auth/me", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(deleteForm),
      })
      logout()
      setDeleteOpen(false)
      toast({
        title: "ลบบัญชีเรียบร้อย",
        description: "บัญชีและข้อมูลที่เกี่ยวข้องถูกลบออกจากระบบแล้ว",
      })
      window.location.href = "/"
    } catch (error) {
      toast({
        title: "ลบบัญชีไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setDeletingAccount(false)
    }
  }

  async function handleRemoveFavorite(favoriteId: string) {
    if (!token) return

    try {
      await fetchJson(`/favorites/${favoriteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      await Promise.all([mutateFavorites(), mutateActivity()])
      toast({ title: "ลบรายการโปรดแล้ว", description: "รายการที่บันทึกถูกลบเรียบร้อย" })
    } catch (error) {
      toast({
        title: "ลบรายการโปรดไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    }
  }

  async function handleDeletePrediction(predictionId: string) {
    if (!token) return

    try {
      await fetchJson(`/predictions/${predictionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      await Promise.all([mutatePredictions(), mutateActivity()])
      toast({ title: "ลบประวัติการทายผลแล้ว", description: "รายการนี้ถูกลบเรียบร้อย" })
    } catch (error) {
      toast({
        title: "ลบประวัติการทายผลไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!token) return

    try {
      await fetchJson(`/community/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      await mutateActivity()
      toast({ title: "ลบคอมเมนต์แล้ว", description: "ความคิดเห็นถูกลบเรียบร้อย" })
    } catch (error) {
      toast({
        title: "ลบคอมเมนต์ไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    }
  }

  if (!currentUser) {
    return (
      <div className="px-3 pb-8 pt-4 sm:px-4 sm:pt-5 lg:px-6">
        <div className="mx-auto max-w-[1440px]">
          <Card className={panelClass}>
            <CardContent className="space-y-4 py-10 text-center">
              <p className="text-lg font-medium">ยังไม่ได้เข้าสู่ระบบ</p>
              <p className="text-muted-foreground">กรุณาเข้าสู่ระบบก่อนใช้งานหน้าโปรไฟล์</p>
              <Button asChild>
                <a href="/login">เข้าสู่ระบบ</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="px-3 pb-8 pt-4 sm:px-4 sm:pt-5 lg:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-[1440px] overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,#1e1e20_0%,#151517_100%)] shadow-[0_24px_70px_rgba(0,0,0,0.28)]"
        >
          <div className="bg-[radial-gradient(circle_at_top_left,rgba(184,255,0,0.08),transparent_30%),linear-gradient(180deg,#1b1b1d_0%,#151517_100%)]">
            <div className="flex flex-wrap items-center gap-4 border-b border-white/10 px-5 py-4 lg:px-7">
              <Link href="/community" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-background/60 px-4 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary">
                <ArrowLeft className="h-4 w-4" />
                กลับคอมมูนิตี้
              </Link>

              <div className="text-[30px] font-display font-semibold tracking-tight text-foreground">FootballAI</div>

              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search profile..."
                  className="h-11 rounded-full border-white/10 bg-background/70 pl-11 text-sm shadow-none placeholder:text-muted-foreground focus-visible:ring-primary/40"
                />
              </div>

              <div className="hidden items-center gap-2 lg:flex">
                <Link href="/community" className="inline-flex h-10 items-center gap-2 rounded-full bg-primary/15 px-4 text-sm font-medium text-primary">
                  <Users className="h-4 w-4" />
                  Home
                </Link>
                <Link href="/community/messages" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary">
                  <MessageSquare className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                >
                  <Bell className="h-4 w-4" />
                </button>
              </div>
            </div>

            <section className="relative border-b border-white/10">
              <div className="relative h-[250px] overflow-hidden bg-[linear-gradient(120deg,rgba(184,255,0,0.2)_0%,rgba(184,255,0,0.08)_24%,rgba(15,18,20,0.18)_48%,rgba(7,9,11,0.58)_100%)] sm:h-[300px]">
                {displayCoverImage ? (
                  <Image
                    key={displayCoverImage}
                    src={displayCoverImage}
                    alt={`${displayName} cover`}
                    fill
                    className="object-cover"
                    style={{
                      transform: coverTransform,
                      transformOrigin: "center center",
                    }}
                    unoptimized
                    priority
                  />
                ) : null}
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: [
                      "radial-gradient(circle_at_20%_24%,rgba(255,255,255,0.1),transparent 20%)",
                      "radial-gradient(circle_at_76%_26%,rgba(255,255,255,0.08),transparent 18%)",
                      coverTheme.overlay,
                      "linear-gradient(180deg, rgba(4,8,12,0.04) 0%, rgba(4,8,12,0.18) 48%, rgba(4,8,12,0.72) 100%)",
                    ].join(", "),
                  }}
                />
                <div className="relative z-10 flex h-full items-end justify-between gap-4 px-5 py-6 lg:px-7">
                  <div className="max-w-3xl">
                    <div className="inline-flex text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: coverTheme.accent }}>
                      Community Profile
                    </div>
                    <h2
                      className="mt-3 text-4xl font-display font-semibold leading-[0.94] tracking-tight text-white sm:text-[60px]"
                      style={{ textShadow: "0 10px 30px rgba(0,0,0,0.45), 0 2px 10px rgba(0,0,0,0.35)" }}
                    >
                      {displayName}
                    </h2>
                    <div className="mt-4 h-[3px] w-24 rounded-full" style={{ background: `linear-gradient(90deg, ${coverTheme.accent}, rgba(255,255,255,0.0))`, boxShadow: coverTheme.glow }} />
                  </div>
                  <div className="hidden sm:block">
                    <input ref={coverInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleCoverImageUpload} />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => coverInputRef.current?.click()}
                      className="h-11 rounded-full border-white/15 bg-black/25 px-5 text-white backdrop-blur hover:bg-black/35"
                      style={{ boxShadow: coverTheme.glow }}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      {uploadingCover ? "กำลังอัปโหลด..." : displayCoverImage ? "แก้ไขภาพพื้นหลัง" : "เพิ่มภาพพื้นหลัง"}
                    </Button>
                  </div>
                </div>
              </div>

              <Dialog open={coverEditorOpen} onOpenChange={handleCloseCoverEditor}>
                <DialogContent className="max-w-4xl border-white/10 bg-[#111214] text-foreground">
                  <DialogHeader>
                    <DialogTitle>จัดวางภาพพื้นหลัง</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-6">
                    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black">
                      <div className="relative aspect-[5/1.5] min-h-[220px] w-full">
                        {coverDraftUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={coverDraftUrl}
                            alt="Cover preview"
                            className="absolute inset-0 h-full w-full object-cover"
                            style={{
                              transform: `translate(${coverPositionX}%, ${coverPositionY}%) scale(${coverScale})`,
                              transformOrigin: "center center",
                            }}
                          />
                        ) : null}
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,12,0.06)_0%,rgba(4,8,12,0.18)_48%,rgba(4,8,12,0.7)_100%)]" />
                        <div className="absolute inset-x-0 bottom-0 p-6">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: coverTheme.accent }}>
                            Community Profile
                          </p>
                          <h3 className="mt-3 text-4xl font-display font-semibold leading-[0.94] tracking-tight text-white sm:text-[52px]">
                            {displayName}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">เลื่อนซ้าย/ขวา</span>
                          <span className="font-medium text-foreground">{coverPositionX}%</span>
                        </div>
                        <Slider value={[coverPositionX]} min={-40} max={40} step={1} onValueChange={(value) => setCoverPositionX(value[0] ?? 0)} />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">เลื่อนขึ้น/ลง</span>
                          <span className="font-medium text-foreground">{coverPositionY}%</span>
                        </div>
                        <Slider value={[coverPositionY]} min={-40} max={40} step={1} onValueChange={(value) => setCoverPositionY(value[0] ?? 0)} />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">ซูมภาพ</span>
                          <span className="font-medium text-foreground">{coverScale.toFixed(2)}x</span>
                        </div>
                        <Slider value={[coverScale]} min={1} max={1.8} step={0.01} onValueChange={(value) => setCoverScale(value[0] ?? 1)} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-white/10 bg-background/40"
                        onClick={() => {
                          setCoverPositionX(0)
                          setCoverPositionY(0)
                          setCoverScale(1)
                        }}
                      >
                        รีเซ็ตตำแหน่ง
                      </Button>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" className="border-white/10 bg-background/40" onClick={() => handleCloseCoverEditor(false)}>
                      ยกเลิก
                    </Button>
                    <Button onClick={handleSaveCoverImage} disabled={uploadingCover || !coverDraftFile}>
                      {uploadingCover ? "กำลังบันทึก..." : "บันทึกภาพพื้นหลัง"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <div className="border-t border-white/10 bg-card/95 px-5 py-4 lg:px-7">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => setPostTab("posts")}
                    className={`rounded-full px-4 py-2 transition ${postTab === "posts" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"}`}
                  >
                    โพสต์ทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostTab("reposts")}
                    className={`rounded-full px-4 py-2 transition ${postTab === "reposts" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"}`}
                  >
                    Reposts
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostTab("media")}
                    className={`rounded-full px-4 py-2 transition ${postTab === "media" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"}`}
                  >
                    Media
                  </button>
                  <div className="ml-auto">
                    <Button variant="outline" className="h-10 rounded-full border-white/10 bg-background/40 px-5 text-muted-foreground">
                      ดูข้อมูลส่วนตัว
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-6 p-4 lg:p-5 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
              <aside className="space-y-6 xl:pt-2">
                <Card className={`overflow-hidden ${panelClass}`}>
                  <CardContent className="p-5 sm:p-6">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleAvatarFileChange}
                    />

                    <Dialog open={avatarViewerOpen} onOpenChange={handleAvatarDialogChange}>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className="group relative block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                          onClick={(event) => {
                            if (!ownStoryGroup?.stories?.length) return
                            event.preventDefault()
                            openOwnStoryViewer()
                          }}
                        >
                          <div
                            className={`rounded-full p-[4px] transition duration-300 ${
                              ownStoryGroup?.stories?.length
                                ? ownStoryHasUnviewed
                                  ? "bg-[linear-gradient(135deg,rgba(184,255,0,0.95),rgba(130,255,0,0.55),rgba(184,255,0,0.95))] shadow-[0_14px_34px_rgba(184,255,0,0.24)] group-hover:scale-[1.03]"
                                  : "bg-[linear-gradient(135deg,rgba(120,130,110,0.78),rgba(80,88,74,0.72),rgba(120,130,110,0.78))]"
                                : ""
                            }`}
                          >
                            <Avatar className="h-24 w-24 border-4 border-card bg-background shadow-[0_18px_40px_rgba(0,0,0,0.35)] sm:h-28 sm:w-28">
                              <AvatarImage src={displayAvatar} alt={displayName} />
                              <AvatarFallback className="bg-primary text-3xl font-display text-primary-foreground">
                                {displayName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition duration-300 group-hover:bg-black/45">
                            <div className="flex translate-y-2 items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-xs font-medium text-white opacity-0 backdrop-blur transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                              <Eye className="h-3.5 w-3.5" />
                              {ownStoryGroup?.stories?.length ? (ownStoryHasUnviewed ? "ดูสตอรี่" : "ดูสตอรี่อีกครั้ง") : "ดูรูปโปรไฟล์"}
                            </div>
                          </div>
                        </button>
                      </DialogTrigger>

                      <DialogContent className="max-w-2xl border-white/10 bg-[#111214] text-foreground">
                        <DialogHeader>
                          <DialogTitle>รูปโปรไฟล์</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-5">
                          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(184,255,0,0.12),transparent_45%),linear-gradient(180deg,#16171a_0%,#101114_100%)] p-6">
                            <div className="mx-auto flex max-w-md flex-col items-center text-center">
                              <div className="relative rounded-full p-2 shadow-[0_30px_70px_rgba(0,0,0,0.35)]">
                                <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_180deg,rgba(184,255,0,0.55),rgba(184,255,0,0.08),rgba(255,255,255,0.04),rgba(184,255,0,0.4))] blur-md" />
                                <Avatar className="relative h-48 w-48 border-4 border-white/10 bg-background sm:h-56 sm:w-56">
                                  <AvatarImage src={displayAvatar} alt={displayName} />
                                  <AvatarFallback className="bg-primary text-6xl font-display text-primary-foreground">
                                    {displayName.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              <p className="mt-5 text-lg font-medium text-foreground">{displayName}</p>
                              <p className="mt-1 text-sm text-muted-foreground">@{username}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <Button
                              type="button"
                              className="rounded-full gap-2"
                              onClick={() => avatarInputRef.current?.click()}
                            >
                              <Camera className="h-4 w-4" />
                              {avatarDraftFile ? "เลือกรูปใหม่อีกครั้ง" : "เปลี่ยนรูปโปรไฟล์"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-full border-white/10 bg-background/40"
                              onClick={() => {
                                handleAvatarDialogChange(false)
                                setEditOpen(true)
                              }}
                            >
                              เปิดแก้ไขโปรไฟล์
                            </Button>
                            {avatarDraftFile ? (
                              <p className="text-sm text-muted-foreground">มีรูปใหม่พร้อมบันทึกแล้ว</p>
                            ) : (
                              <p className="text-sm text-muted-foreground">คลิกรูปเพื่อดู จากนั้นกดเปลี่ยนรูปได้ทันที</p>
                            )}
                          </div>
                        </div>

                        <DialogFooter>
                          <Button
                            variant="outline"
                            className="border-white/10 bg-background/40"
                            onClick={() => handleAvatarDialogChange(false)}
                          >
                            ปิด
                          </Button>
                          <Button onClick={handleSaveAvatar} disabled={uploadingAvatar || !avatarDraftFile}>
                            {uploadingAvatar ? "กำลังบันทึก..." : "บันทึกรูปโปรไฟล์"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={Boolean(activeProfileStory)} onOpenChange={(open) => (!open ? closeOwnStoryViewer() : undefined)}>
                      <DialogContent className="max-w-md rounded-[28px] border-white/10 bg-[#101214] p-0 text-foreground">
                        {activeProfileStory ? (
                          <div className="overflow-hidden rounded-[28px]">
                            <div className="relative h-[560px]">
                              <Image src={activeProfileStory.image} alt={activeProfileStory.author.name} fill className="object-cover" unoptimized />
                              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/10 to-black/80" />
                              <div className="absolute left-0 right-0 top-0 space-y-4 p-5">
                                <div className="flex gap-1.5">
                                  {(ownStoryGroup?.stories || []).map((story, index) => (
                                    <div key={story.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
                                      <div
                                        className="h-full rounded-full bg-primary transition-[width] duration-75"
                                        style={{
                                          width:
                                            index < activeProfileStoryIndex
                                              ? "100%"
                                              : index === activeProfileStoryIndex
                                                ? `${profileStoryProgress}%`
                                                : "0%",
                                        }}
                                      />
                                    </div>
                                  ))}
                                </div>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-11 w-11 border border-primary/50">
                                    <AvatarImage src={displayAvatar} />
                                    <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-white">สตอรี่ของคุณ</p>
                                    <p className="truncate text-xs text-white/70">
                                      {activeProfileStory.timeAgo} • {activeProfileStoryIndex + 1}/{ownStoryGroup?.stories.length || 1} • {activeProfileStory.views || 0} การดู
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={goToPreviousOwnStory}
                                disabled={activeProfileStoryIndex === 0}
                                className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white transition hover:bg-black/55 disabled:opacity-35"
                              >
                                ←
                              </button>
                              <button
                                type="button"
                                onClick={goToNextOwnStory}
                                className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white transition hover:bg-black/55"
                              >
                                →
                              </button>
                              <button
                                type="button"
                                onClick={closeOwnStoryViewer}
                                className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white transition hover:bg-black/55"
                              >
                                ×
                              </button>
                              {activeProfileStory.caption ? <p className="absolute bottom-0 left-0 right-0 p-5 text-sm leading-6 text-white">{activeProfileStory.caption}</p> : null}
                            </div>
                          </div>
                        ) : null}
                      </DialogContent>
                    </Dialog>

                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-3 h-auto px-0 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground"
                      onClick={() => setAvatarViewerOpen(true)}
                    >
                      ดูและเปลี่ยนรูปโปรไฟล์
                    </Button>

                    <h1 className="mt-4 max-w-full break-words text-[28px] font-display leading-[1.02] tracking-tight text-foreground sm:text-[34px]">
                      {displayName}
                    </h1>
                    <p className="mt-2 text-sm text-primary">@{username}</p>
                    {currentUser.bio ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{currentUser.bio}</p> : null}

                    <div className="mt-5 space-y-3 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Bangkok</p>
                      <p className="flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> footballai.local/profile</p>
                      <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> สมาชิกตั้งแต่ {memberSince}</p>
                      <p className="flex items-center gap-2"><Images className="h-4 w-4 text-primary" /> {postsData?.items?.length || 0} posts and media</p>
                    </div>

                    <div className="mt-6 w-full space-y-3">
                      <Dialog open={editOpen} onOpenChange={setEditOpen}>
                        <DialogTrigger asChild>
                          <Button className="h-11 w-full rounded-full gap-2">
                            <Edit className="h-4 w-4" />
                            แก้ไขโปรไฟล์
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>แก้ไขโปรไฟล์</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="name">ชื่อ</Label>
                              <Input id="name" value={profileForm.name} onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="avatar">ลิงก์รูปโปรไฟล์</Label>
                              <Input id="avatar" value={profileForm.avatar} onChange={(e) => setProfileForm((prev) => ({ ...prev, avatar: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="coverImage">ลิงก์ภาพพื้นหลัง</Label>
                              <Input
                                id="coverImage"
                                value={profileForm.coverImage}
                                onChange={(e) => setProfileForm((prev) => ({ ...prev, coverImage: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="favoriteTeam">ทีมโปรดหลัก</Label>
                              <Input
                                id="favoriteTeam"
                                value={profileForm.favoriteTeam}
                                onChange={(e) => setProfileForm((prev) => ({ ...prev, favoriteTeam: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="bio">Bio</Label>
                              <Textarea id="bio" value={profileForm.bio} onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))} />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setEditOpen(false)}>
                                ยกเลิก
                              </Button>
                              <Button onClick={handleSaveProfile} disabled={savingProfile} className="gap-2">
                                <Save className="h-4 w-4" />
                                {savingProfile ? "กำลังบันทึก..." : "บันทึก"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="h-11 w-full rounded-full gap-2 border-white/10 bg-background/40 text-foreground">
                            <KeyRound className="h-4 w-4" />
                            เปลี่ยนรหัสผ่าน
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>เปลี่ยนรหัสผ่าน</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="currentPassword">รหัสผ่านปัจจุบัน</Label>
                              <Input
                                id="currentPassword"
                                type="password"
                                value={passwordForm.currentPassword}
                                onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="newPassword">รหัสผ่านใหม่</Label>
                              <Input
                                id="newPassword"
                                type="password"
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setPasswordOpen(false)}>
                                ยกเลิก
                              </Button>
                              <Button onClick={handleChangePassword} disabled={savingPassword}>
                                {savingPassword ? "กำลังบันทึก..." : "บันทึก"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                        <DialogTrigger asChild>
                          <Button variant="destructive" className="h-11 w-full rounded-full gap-2">
                            <Trash2 className="h-4 w-4" />
                            ลบบัญชี
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>ยืนยันการลบบัญชี</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                              การลบบัญชีจะลบโปรไฟล์ รายการโปรด ประวัติการทำนาย และข้อมูลชุมชนที่เกี่ยวข้องออกจากระบบถาวร
                            </p>
                            <div className="space-y-2">
                              <Label htmlFor="deletePassword">รหัสผ่านปัจจุบัน</Label>
                              <Input
                                id="deletePassword"
                                type="password"
                                value={deleteForm.currentPassword}
                                onChange={(e) => setDeleteForm({ currentPassword: e.target.value })}
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                                ยกเลิก
                              </Button>
                              <Button variant="destructive" onClick={handleDeleteAccount} disabled={deletingAccount}>
                                {deletingAccount ? "กำลังลบบัญชี..." : "ยืนยันการลบ"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              </aside>

              <main className="space-y-6">
                <Card className={panelClass}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl text-foreground">Profile Feed</CardTitle>
                    <CardDescription>
                      {postTab === "media" ? "รูปภาพและวิดีโอจากโพสต์ที่เจ้าของโปรไฟล์แชร์ในคอมมูนิตี้" : "โพสต์, repost และ activity หลักของโปรไฟล์นี้"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {postTab === "media" ? (
                      mediaPosts.length > 0 ? (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          {mediaPosts.map((post: any) => {
                            const image = Array.isArray(post.images) ? post.images[0] : ""
                            const video = Array.isArray(post.videos) ? post.videos[0] : ""
                            return (
                              <Link key={`media-${post.id}`} href={`/community/${post.id}`} className="group overflow-hidden rounded-[22px] border border-white/10 bg-background/40 transition hover:border-primary/30 hover:bg-background/60">
                                <div className="relative aspect-[4/3] overflow-hidden bg-black">
                                  {image ? <Image src={image} alt={post.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" unoptimized /> : null}
                                  {!image && video ? <video src={video} className="h-full w-full object-cover" muted playsInline /> : null}
                                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent p-3">
                                    <Badge variant="outline" className="border-white/15 bg-black/35 text-white">
                                      {video ? "Video" : "Image"}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="p-4">
                                  <p className="line-clamp-2 font-medium text-foreground">{post.title}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">{post.timeAgo}</p>
                                </div>
                              </Link>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">ยังไม่มีโพสต์ที่มีรูปภาพหรือวิดีโอในโปรไฟล์นี้</p>
                      )
                    ) : profileFeed.length > 0 ? (
                      profileFeed.map((post: any) => (
                        <div key={`profile-feed-${post.id}`} className={`${itemCardClass} shadow-[0_10px_30px_rgba(0,0,0,0.12)]`}>
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12 border border-white/10">
                                <AvatarImage src={displayAvatar} alt={displayName} />
                                <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">{displayName}</p>
                                <p className="text-xs text-muted-foreground">@{username}</p>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">{post.timeAgo}</span>
                          </div>
                          <div className="mb-2 flex items-center gap-2">
                            <Badge variant="outline" className="border-white/10">{post.categoryLabel}</Badge>
                            {post.sharedItem?.type === "post" ? <Badge className="bg-primary/15 text-primary hover:bg-primary/15">Reposted</Badge> : null}
                          </div>
                          <p className="font-medium text-foreground">{post.title}</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">{post.excerpt}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">{postTab === "posts" ? "No profile posts yet." : "No reposts on this profile yet."}</p>
                    )}
                  </CardContent>
                </Card>

                <Card className={panelClass}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      ความคิดเห็นล่าสุด
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(activityData?.comments || []).length > 0 ? (
                      activityData.comments.map((item: any) => (
                        <div key={item.id} className={itemCardClass}>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <Badge variant="outline" className="border-white/10">{item.targetType}</Badge>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{item.timeAgo}</span>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeleteComment(item.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{item.content}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">ยังไม่มีประวัติการคอมเมนต์</p>
                    )}
                  </CardContent>
                </Card>

                <Card className={panelClass}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Trophy className="h-5 w-5 text-primary" />
                      สถิติการใช้งาน
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-[22px] bg-background/50 p-4 text-center">
                        <p className="text-3xl font-display text-primary">{predictionsData?.items?.length || 0}</p>
                        <p className="text-xs text-muted-foreground">การทำนาย</p>
                      </div>
                      <div className="rounded-[22px] bg-background/50 p-4 text-center">
                        <p className="text-3xl font-display text-primary">{favoritesData?.items?.length || 0}</p>
                        <p className="text-xs text-muted-foreground">รายการโปรด</p>
                      </div>
                      <div className="rounded-[22px] bg-background/50 p-4 text-center">
                        <p className="text-3xl font-display text-primary">{postsData?.items?.length || 0}</p>
                        <p className="text-xs text-muted-foreground">โพสต์ชุมชน</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </main>

              <aside className="space-y-6">
                <Card className={panelClass}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Trophy className="h-5 w-5 text-primary" />
                      Fan Profile
                    </CardTitle>
                    <CardDescription>ข้อมูลสาธารณะในคอมมูนิตี้</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-2xl bg-background/50 p-3 text-center">
                        <p className="text-xl font-display text-primary">{fanStats.postsCount}</p>
                        <p className="text-[11px] text-muted-foreground">Posts</p>
                      </div>
                      <div className="rounded-2xl bg-background/50 p-3 text-center">
                        <p className="text-xl font-display text-primary">{fanStats.matchRoomPostsCount}</p>
                        <p className="text-[11px] text-muted-foreground">Rooms</p>
                      </div>
                      <div className="rounded-2xl bg-background/50 p-3 text-center">
                        <p className="text-xl font-display text-primary">{fanStats.pollVotesCount}</p>
                        <p className="text-[11px] text-muted-foreground">Polls</p>
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs text-muted-foreground">Badge</p>
                      <div className="flex flex-wrap gap-2">
                        {fanBadges.length ? (
                          fanBadges.map((badge) => (
                            <Badge key={badge.id} className="rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/15" title={badge.description}>
                              {badge.label}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">ยังไม่มี badge</p>
                        )}
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <div>
                        <p className="mb-2 text-xs text-muted-foreground">ทีมโปรด</p>
                        <p className="text-sm font-medium">{favoriteTeams[0] || currentUser.favoriteTeam || "-"}</p>
                      </div>
                      <div>
                        <p className="mb-2 text-xs text-muted-foreground">นักเตะโปรด</p>
                        <p className="text-sm font-medium">{favoritePlayers.length ? favoritePlayers.join(", ") : "-"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={panelClass}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Shield className="h-5 w-5 text-primary" />
                      ข้อมูลบัญชี
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground">สถานะ</p>
                      <p className="font-medium">{currentUser.role === "admin" ? "ผู้ดูแลระบบ" : "สมาชิกปกติ"}</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground">ทีมโปรดหลัก</p>
                      <p className="font-medium">{currentUser.favoriteTeam || "-"}</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground">สมาชิกตั้งแต่</p>
                      <p className="font-medium">{memberSince}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className={panelClass}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Heart className="h-5 w-5 text-primary" />
                      ทีมโปรด
                    </CardTitle>
                    <CardDescription>ทีมฟุตบอลที่คุณติดตาม</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {favoriteTeams.length > 0 ? (
                        favoriteTeams.map((team) => (
                          <Badge key={team} variant="secondary" className="rounded-full border border-white/10 bg-background/60 px-3 py-1.5 text-foreground">
                            {team}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">ยังไม่มีรายการทีมโปรด</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className={panelClass}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Bookmark className="h-5 w-5 text-primary" />
                      รายการที่บันทึกไว้
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="mb-2 text-xs text-muted-foreground">ข่าวที่บันทึกไว้</p>
                      <div className="space-y-2">
                        {(activityData?.saved?.articles || []).slice(0, 3).map((item: any) => (
                          <div key={item.id} className={itemCardClass}>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium">{item.title}</p>
                                <p className="text-xs text-muted-foreground">{item.timeAgo}</p>
                              </div>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRemoveFavorite(item.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {(activityData?.saved?.articles || []).length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีข่าวที่บันทึกไว้</p>}
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <p className="mb-2 text-xs text-muted-foreground">โพสต์ที่บันทึกไว้</p>
                      <div className="space-y-2">
                        {(activityData?.saved?.posts || []).slice(0, 3).map((item: any) => (
                          <div key={item.id} className={itemCardClass}>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium">{item.title}</p>
                                <p className="text-xs text-muted-foreground">{item.subtitle || item.timeAgo}</p>
                              </div>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRemoveFavorite(item.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {(activityData?.saved?.posts || []).length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีโพสต์ที่บันทึกไว้</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={panelClass}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">ประวัติการทายผล</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(activityData?.predictions || []).length > 0 ? (
                      activityData.predictions.map((item: any) => (
                        <div key={item.id} className={itemCardClass}>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">
                              {item.homeTeam} vs {item.awayTeam}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{item.timeAgo}</span>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeletePrediction(item.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            ทายสกอร์ {item.predictedScore?.home ?? 0} - {item.predictedScore?.away ?? 0} · ความมั่นใจ {item.confidence ?? 0}%
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">ยังไม่มีประวัติการทำนาย</p>
                    )}
                  </CardContent>
                </Card>

                <Card className={panelClass}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">การตั้งค่า</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="ghost" className="h-10 w-full justify-start gap-2" disabled>
                      <Settings className="h-4 w-4" />
                      ตั้งค่าบัญชี
                    </Button>
                    <Button variant="ghost" className="h-10 w-full justify-start gap-2" disabled>
                      <Bell className="h-4 w-4" />
                      การแจ้งเตือน
                    </Button>
                    <Separator />
                    <Button variant="ghost" className="h-10 w-full justify-start gap-2 text-destructive hover:text-destructive" onClick={logout}>
                      <LogOut className="h-4 w-4" />
                      ออกจากระบบ
                    </Button>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
