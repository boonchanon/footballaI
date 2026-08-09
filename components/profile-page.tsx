"use client"

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import useSWR from "swr"
import { motion } from "framer-motion"
import {
  Bell,
  Bookmark,
  CalendarDays,
  Camera,
  Edit,
  Heart,
  Images,
  KeyRound,
  LogOut,
  MapPin,
  MessageSquare,
  Save,
  Search,
  Shield,
  Plus,
  Trash2,
  Trophy,
  Users,
} from "lucide-react"

import { apiUrl, fetchJson } from "@/lib/api-client"
import { saveAuthSession } from "@/lib/auth-client"
import { useAuthSession } from "@/hooks/use-auth-session"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  const { mutate: mutatePredictions } = useSWR(
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
  const favoriteTeamItems = useMemo(
    () => ((favoritesData?.items || []) as any[]).filter((item) => item.itemType === "team").slice(0, 5),
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
  const panelClass = "rounded-[12px] border border-white/[0.07] bg-[#0b1012]/92 shadow-[0_10px_28px_rgba(0,0,0,0.22)]"
  const itemCardClass = "rounded-[12px] border border-white/[0.07] bg-[#0b1012]/88 p-4"
  const username = displayName.replace(/\s+/g, "").toLowerCase()
  const coverTransform = `translate(${coverPositionX}%, ${coverPositionY}%) scale(${coverScale})`
  const heroCoverImage = displayCoverImage || "/premier-league-stadium-night.jpg"
  const memberSince = currentUser?.createdAt
    ? new Intl.DateTimeFormat("th-TH", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(currentUser.createdAt))
    : ""
  const profileStats = [
    { label: "Posts", value: fanStats.postsCount || postsData?.items?.length || 0 },
    { label: "Rooms", value: fanStats.matchRoomPostsCount || 0 },
    { label: "Polls", value: fanStats.pollVotesCount || 0 },
    { label: "Saved", value: (activityData?.saved?.articles?.length || 0) + (activityData?.saved?.posts?.length || 0) },
  ]

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
    <div className="min-h-screen bg-[#050708] text-foreground">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} className="mx-auto min-h-screen max-w-[1520px] bg-[#050708]">
        <header className="sticky top-0 z-30 flex min-h-[68px] items-center gap-4 border-b border-white/[0.06] bg-[#050708]/95 px-5 backdrop-blur lg:px-7">
          <Link href="/" className="shrink-0 text-2xl font-display font-bold tracking-tight text-white" aria-label="FootballAI home">
            FOOTBALL<span className="text-primary">AI</span>
          </Link>
          <div className="relative ml-2 hidden flex-1 md:block lg:mx-10 lg:max-w-[590px]">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search players, teams, matches..." className="h-11 rounded-[12px] border-white/[0.06] bg-white/[0.045] pl-11 text-sm shadow-none focus-visible:ring-primary/40" />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link href="/community" className="hidden h-11 items-center gap-2 rounded-[12px] bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_8px_22px_rgba(184,255,0,0.18)] transition hover:bg-primary/90 sm:inline-flex">
              <Plus className="h-4 w-4" />
              Create Post
            </Link>
            <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </button>
            <Link href="/community/messages" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary" aria-label="Messages">
              <MessageSquare className="h-5 w-5" />
            </Link>
            <Avatar className="h-11 w-11 border border-white/10">
              <AvatarImage src={displayAvatar} alt={displayName} />
              <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <div className="grid gap-4 p-3 lg:grid-cols-[88px_minmax(0,1fr)] lg:p-4 xl:grid-cols-[232px_minmax(0,820px)_300px]">
          <aside className="hidden xl:block">
            <div className="sticky top-[88px] rounded-[14px] border border-white/[0.06] bg-[#0b1012]/90 p-3">
              <nav className="space-y-1" aria-label="Profile navigation">
                {[
                  { label: "Community Feed", href: "/community", icon: Users },
                  { label: "Match Hub", href: "/community/matches", icon: Trophy },
                  { label: "Threads", href: "/community/matches", icon: MessageSquare },
                  { label: "Polls", href: "/community", icon: BarChartIcon },
                  { label: "Stories", href: "/community", icon: Images },
                  { label: "Notifications", href: "/community", icon: Bell },
                  { label: "Profile", href: "/profile", icon: Users, active: true },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <Link key={item.label} href={item.href} className={`flex h-11 items-center gap-3 rounded-[10px] px-3 text-sm transition ${item.active ? "bg-primary/14 text-primary" : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"}`}>
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  )
                })}
              </nav>
              <div className="mt-6 border-t border-white/[0.07] pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Favorite Teams</p>
                  <Link href="/community" className="text-xs font-medium text-primary">Edit</Link>
                </div>
                <div className="space-y-3">
                  {favoriteTeamItems.length ? (
                    favoriteTeamItems.map((team: any) => (
                      <div key={team.id || team.itemId || team.title} className="flex items-center gap-3 text-sm">
                        {team.image ? <Image src={team.image} alt={team.title} width={24} height={24} className="h-6 w-6 rounded-full object-contain" unoptimized /> : <span className="h-6 w-6 rounded-full bg-primary/15" />}
                        <span className="min-w-0 truncate">{team.title}</span>
                      </div>
                    ))
                  ) : currentUser.favoriteTeam ? (
                    <div className="flex items-center gap-3 text-sm"><span className="h-6 w-6 rounded-full bg-primary/15" /><span>{currentUser.favoriteTeam}</span></div>
                  ) : (
                    <p className="text-sm text-muted-foreground">ยังไม่มีทีมโปรด</p>
                  )}
                  <Link href="/community" className="inline-flex items-center gap-2 pt-2 text-sm text-primary"><Plus className="h-4 w-4" /> Add Team</Link>
                </div>
              </div>
            </div>
          </aside>

          <main className="min-w-0 space-y-4 xl:col-span-2">
            <section className="relative overflow-hidden rounded-[12px] border border-white/[0.07] bg-[#0b1012]" style={{ boxShadow: coverTheme.glow }}>
              <div className="relative min-h-[270px] sm:min-h-[292px]">
                <Image
                  key={heroCoverImage}
                  src={heroCoverImage}
                  alt=""
                  fill
                  className="object-cover object-center opacity-52"
                  style={{ transform: displayCoverImage ? coverTransform : undefined, transformOrigin: "center center" }}
                  unoptimized
                  priority
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,8,0.90)_0%,rgba(5,7,8,0.55)_48%,rgba(5,7,8,0.82)_100%),linear-gradient(180deg,rgba(5,7,8,0.04)_0%,rgba(5,7,8,0.68)_100%)]" />
                <div className="relative flex min-h-[270px] flex-col justify-end px-5 py-5 sm:min-h-[292px] lg:px-7">
                  <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarFileChange} />
                  <input ref={coverInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleCoverImageUpload} />
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
                      <button type="button" className="group relative w-fit rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60" onClick={() => (ownStoryGroup?.stories?.length ? openOwnStoryViewer() : setAvatarViewerOpen(true))}>
                        <div className={`rounded-full p-[3px] ${ownStoryHasUnviewed ? "bg-primary" : "bg-primary/70"}`}>
                          <Avatar className="h-32 w-32 border-4 border-[#050708] bg-background shadow-[0_18px_42px_rgba(0,0,0,0.40)] sm:h-36 sm:w-36">
                            <AvatarImage src={displayAvatar} alt={displayName} />
                            <AvatarFallback className="bg-primary text-5xl font-display text-primary-foreground">{displayName.charAt(0)}</AvatarFallback>
                          </Avatar>
                        </div>
                        <span className="absolute bottom-3 right-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#050708] bg-primary text-primary-foreground shadow-lg">
                          <Camera className="h-4 w-4" />
                        </span>
                      </button>
                      <div className="min-w-0 pb-1">
                        {fanBadges[0] ? <Badge className="mb-3 rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/15">{fanBadges[0].label}</Badge> : null}
                        <h1 className="break-words text-[30px] font-bold leading-tight tracking-tight text-white sm:text-[34px]">{displayName}</h1>
                        <p className="mt-1 text-sm text-white/85">@{username}</p>
                        {currentUser.bio ? <p className="mt-2 max-w-2xl text-[15px] leading-6 text-white/76">{currentUser.bio}</p> : null}
                        <div className="mt-2.5 flex flex-wrap gap-4 text-xs text-white/65">
                          {currentUser.favoriteTeam ? <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> {currentUser.favoriteTeam}</span> : null}
                          {memberSince ? <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-primary" /> Joined {memberSince}</span> : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => coverInputRef.current?.click()} className="h-10 rounded-[10px] border-white/15 bg-black/25 text-white hover:bg-black/40">
                        <Camera className="mr-2 h-4 w-4" />
                        Cover
                      </Button>
                      <Button onClick={() => setEditOpen(true)} className="h-10 rounded-[10px]">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Profile
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 divide-x divide-y divide-white/[0.06] overflow-hidden rounded-[12px] border border-white/[0.07] bg-[#0b1012]/90 sm:grid-cols-4 sm:divide-y-0">
              {profileStats.map((stat) => (
                <div key={stat.label} className="px-5 py-3.5">
                  <p className="text-[22px] font-bold leading-none text-primary">{stat.value.toLocaleString()}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </section>

            <div className="flex gap-8 overflow-x-auto border-b border-white/[0.08] px-1 text-[15px]">
              {[
                { key: "posts", label: "Overview" },
                { key: "reposts", label: "Reposts" },
                { key: "media", label: "Media" },
              ].map((tab, index) => (
                <button key={`${tab.label}-${index}`} type="button" onClick={() => setPostTab(tab.key as "posts" | "reposts" | "media")} className={`shrink-0 border-b-2 px-2 py-3 transition ${postTab === tab.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,820px)_300px]">
            <section className="space-y-4">
              {postTab === "media" ? (
                mediaPosts.length ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {mediaPosts.map((post: any) => {
                      const image = Array.isArray(post.images) ? post.images[0] : ""
                      const video = Array.isArray(post.videos) ? post.videos[0] : ""
                      return (
                        <Link key={`media-${post.id}`} href={`/community/${post.id}`} className={`${panelClass} group overflow-hidden`}>
                          <div className="relative aspect-[4/3] bg-black">
                            {image ? <Image src={image} alt={post.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" unoptimized /> : null}
                            {!image && video ? <video src={video} className="h-full w-full object-cover" muted playsInline /> : null}
                          </div>
                          <div className="p-4">
                            <p className="line-clamp-2 font-semibold">{post.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{post.timeAgo}</p>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <div className={itemCardClass}><p className="text-sm text-muted-foreground">ยังไม่มีโพสต์ที่มีรูปภาพหรือวิดีโอในโปรไฟล์นี้</p></div>
                )
              ) : profileFeed.length ? (
                profileFeed.map((post: any) => (
                  <article key={`profile-feed-${post.id}`} className={`${panelClass} p-4`}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11 border border-white/10">
                          <AvatarImage src={displayAvatar} alt={displayName} />
                          <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold">{displayName}</p>
                          <p className="text-xs text-muted-foreground">@{username} · {post.timeAgo}</p>
                        </div>
                      </div>
                      <span className="text-muted-foreground">•••</span>
                    </div>
                    <div className="mb-2.5 flex flex-wrap gap-2">
                      {post.categoryLabel ? <Badge variant="outline" className="border-white/10">{post.categoryLabel}</Badge> : null}
                      {post.sharedItem?.type === "post" ? <Badge className="bg-primary/15 text-primary hover:bg-primary/15">Reposted</Badge> : null}
                    </div>
                    <p className="text-[15px] font-semibold text-foreground">{post.title}</p>
                    {post.excerpt ? <p className="mt-2 text-[15px] leading-6 text-muted-foreground">{post.excerpt}</p> : null}
                    {Array.isArray(post.images) && post.images[0] ? (
                      <div className="relative mt-4 aspect-[16/7] overflow-hidden rounded-[12px] bg-black">
                        <Image src={post.images[0]} alt={post.title} fill className="object-cover" unoptimized />
                      </div>
                    ) : null}
                    <div className="mt-3.5 flex items-center justify-between border-t border-white/[0.06] pt-3 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2"><Heart className="h-4 w-4 text-primary" /> {post.likes || post.likesCount || 0}</span>
                      <span className="inline-flex items-center gap-2"><MessageSquare className="h-4 w-4" /> {post.comments || post.commentsCount || 0}</span>
                      <span className="inline-flex items-center gap-2"><Bookmark className="h-4 w-4" /> Save</span>
                    </div>
                  </article>
                ))
              ) : (
                <div className={itemCardClass}>
                  <p className="font-medium">{postTab === "posts" ? "ยังไม่มีโพสต์ในโปรไฟล์นี้" : "ยังไม่มี reposts ในโปรไฟล์นี้"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">เมื่อมี activity จริง ระบบจะแสดงที่นี่โดยไม่สร้างข้อมูลตัวอย่าง</p>
                </div>
              )}
            </section>
            <aside className="space-y-3">
              <section className={`${panelClass} p-4`}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" /> Fan Stats</h2>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><p className="text-[22px] font-bold leading-none text-primary">{fanStats.postsCount}</p><p className="mt-1 text-xs text-muted-foreground">Posts</p></div>
                  <div><p className="text-[22px] font-bold leading-none text-primary">{fanStats.matchRoomPostsCount}</p><p className="mt-1 text-xs text-muted-foreground">Rooms</p></div>
                  <div><p className="text-[22px] font-bold leading-none text-primary">{fanStats.pollVotesCount}</p><p className="mt-1 text-xs text-muted-foreground">Polls</p></div>
                </div>
                {fanBadges.length ? <div className="mt-4 flex flex-wrap gap-2">{fanBadges.map((badge) => <Badge key={badge.id} className="rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/15" title={badge.description}>{badge.label}</Badge>)}</div> : null}
              </section>
              {(currentUser.bio || memberSince || currentUser.role) ? (
                <section className={`${panelClass} p-4`}>
                  <h2 className="text-sm font-semibold">About Me</h2>
                  {currentUser.bio ? <p className="mt-2.5 text-sm leading-6 text-muted-foreground">{currentUser.bio}</p> : null}
                  <div className="mt-3 grid gap-2.5 text-sm">
                    {memberSince ? <div><p className="text-xs text-muted-foreground">Member Since</p><p>{memberSince}</p></div> : null}
                    {currentUser.role ? <div><p className="text-xs text-muted-foreground">Account</p><p>{currentUser.role === "admin" ? "ผู้ดูแลระบบ" : "สมาชิกปกติ"}</p></div> : null}
                  </div>
                </section>
              ) : null}
              <section className={`${panelClass} p-4`}>
                <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-semibold"><Heart className="h-4 w-4 text-primary" /> Favorite Teams</h2><Link href="/community" className="text-xs text-primary">Edit</Link></div>
                <div className="space-y-2.5">
                  {favoriteTeamItems.length ? favoriteTeamItems.map((team: any) => (
                    <div key={`right-${team.id || team.itemId || team.title}`} className="flex items-center gap-3">
                      {team.image ? <Image src={team.image} alt={team.title} width={28} height={28} className="h-7 w-7 rounded-full object-contain" unoptimized /> : <span className="h-7 w-7 rounded-full bg-primary/15" />}
                      <span className="min-w-0 truncate text-sm">{team.title}</span>
                    </div>
                  )) : currentUser.favoriteTeam ? <p className="text-sm">{currentUser.favoriteTeam}</p> : <p className="text-sm text-muted-foreground">ยังไม่มีทีมโปรด</p>}
                </div>
              </section>
              <section className={`${panelClass} p-4`}>
                <h2 className="mb-2.5 flex items-center gap-2 text-sm font-semibold"><Shield className="h-4 w-4 text-primary" /> Account Actions</h2>
                <div className="space-y-1.5">
                  <Button variant="outline" className="h-9 w-full justify-start gap-2 rounded-[10px] border-white/10 bg-white/[0.03]" onClick={() => setPasswordOpen(true)}><KeyRound className="h-4 w-4" />เปลี่ยนรหัสผ่าน</Button>
                  <Button variant="ghost" className="h-9 w-full justify-start gap-2" onClick={logout}><LogOut className="h-4 w-4" />ออกจากระบบ</Button>
                  <Button variant="ghost" className="h-9 w-full justify-start gap-2 text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4" />ลบบัญชี</Button>
                </div>
              </section>
            </aside>
            </div>
          </main>

        </div>
      </motion.div>

      <Dialog open={coverEditorOpen} onOpenChange={handleCloseCoverEditor}>
        <DialogContent className="max-w-4xl border-white/10 bg-[#111214] text-foreground">
          <DialogHeader><DialogTitle>จัดวางภาพพื้นหลัง</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <div className="overflow-hidden rounded-[18px] border border-white/10 bg-black">
              <div className="relative aspect-[5/1.5] min-h-[220px] w-full">
                {coverDraftUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverDraftUrl} alt="Cover preview" className="absolute inset-0 h-full w-full object-cover" style={{ transform: `translate(${coverPositionX}%, ${coverPositionY}%) scale(${coverScale})`, transformOrigin: "center center" }} />
                ) : null}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,12,0.06)_0%,rgba(4,8,12,0.18)_48%,rgba(4,8,12,0.7)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 p-6"><h3 className="text-4xl font-display font-semibold text-white">{displayName}</h3></div>
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <div className="space-y-3"><div className="flex justify-between text-sm"><span className="text-muted-foreground">เลื่อนซ้าย/ขวา</span><span>{coverPositionX}%</span></div><Slider value={[coverPositionX]} min={-40} max={40} step={1} onValueChange={(value) => setCoverPositionX(value[0] ?? 0)} /></div>
              <div className="space-y-3"><div className="flex justify-between text-sm"><span className="text-muted-foreground">เลื่อนขึ้น/ลง</span><span>{coverPositionY}%</span></div><Slider value={[coverPositionY]} min={-40} max={40} step={1} onValueChange={(value) => setCoverPositionY(value[0] ?? 0)} /></div>
              <div className="space-y-3"><div className="flex justify-between text-sm"><span className="text-muted-foreground">ซูมภาพ</span><span>{coverScale.toFixed(2)}x</span></div><Slider value={[coverScale]} min={1} max={1.8} step={0.01} onValueChange={(value) => setCoverScale(value[0] ?? 1)} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" className="border-white/10 bg-background/40" onClick={() => handleCloseCoverEditor(false)}>ยกเลิก</Button><Button onClick={handleSaveCoverImage} disabled={uploadingCover || !coverDraftFile}>{uploadingCover ? "กำลังบันทึก..." : "บันทึกภาพพื้นหลัง"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={avatarViewerOpen} onOpenChange={handleAvatarDialogChange}>
        <DialogContent className="max-w-xl border-white/10 bg-[#111214] text-foreground">
          <DialogHeader><DialogTitle>รูปโปรไฟล์</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center rounded-[18px] border border-white/10 bg-[#0b1012] p-6 text-center">
            <Avatar className="h-52 w-52 border-4 border-primary/40"><AvatarImage src={displayAvatar} alt={displayName} /><AvatarFallback className="bg-primary text-6xl">{displayName.charAt(0)}</AvatarFallback></Avatar>
            <p className="mt-5 font-semibold">{displayName}</p><p className="text-sm text-muted-foreground">@{username}</p>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => avatarInputRef.current?.click()}><Camera className="mr-2 h-4 w-4" />เปลี่ยนรูป</Button><Button onClick={handleSaveAvatar} disabled={uploadingAvatar || !avatarDraftFile}>{uploadingAvatar ? "กำลังบันทึก..." : "บันทึกรูปโปรไฟล์"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>แก้ไขโปรไฟล์</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="name">ชื่อ</Label><Input id="name" value={profileForm.name} onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="avatar">ลิงก์รูปโปรไฟล์</Label><Input id="avatar" value={profileForm.avatar} onChange={(e) => setProfileForm((prev) => ({ ...prev, avatar: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="coverImage">ลิงก์ภาพพื้นหลัง</Label><Input id="coverImage" value={profileForm.coverImage} onChange={(e) => setProfileForm((prev) => ({ ...prev, coverImage: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="favoriteTeam">ทีมโปรดหลัก</Label><Input id="favoriteTeam" value={profileForm.favoriteTeam} onChange={(e) => setProfileForm((prev) => ({ ...prev, favoriteTeam: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="bio">Bio</Label><Textarea id="bio" value={profileForm.bio} onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditOpen(false)}>ยกเลิก</Button><Button onClick={handleSaveProfile} disabled={savingProfile} className="gap-2"><Save className="h-4 w-4" />{savingProfile ? "กำลังบันทึก..." : "บันทึก"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>เปลี่ยนรหัสผ่าน</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="currentPassword">รหัสผ่านปัจจุบัน</Label><Input id="currentPassword" type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="newPassword">รหัสผ่านใหม่</Label><Input id="newPassword" type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setPasswordOpen(false)}>ยกเลิก</Button><Button onClick={handleChangePassword} disabled={savingPassword}>{savingPassword ? "กำลังบันทึก..." : "บันทึก"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>ยืนยันการลบบัญชี</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">การลบบัญชีจะลบโปรไฟล์ รายการโปรด ประวัติการทำนาย และข้อมูลชุมชนที่เกี่ยวข้องออกจากระบบถาวร</p>
            <div className="space-y-2"><Label htmlFor="deletePassword">รหัสผ่านปัจจุบัน</Label><Input id="deletePassword" type="password" value={deleteForm.currentPassword} onChange={(e) => setDeleteForm({ currentPassword: e.target.value })} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDeleteOpen(false)}>ยกเลิก</Button><Button variant="destructive" onClick={handleDeleteAccount} disabled={deletingAccount}>{deletingAccount ? "กำลังลบบัญชี..." : "ยืนยันการลบ"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )

}

function BarChartIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 20V10" />
      <path d="M12 20V4" />
      <path d="M20 20v-7" />
    </svg>
  )
}
