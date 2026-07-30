"use client"

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import useSWR from "swr"
import {
  Bell,
  Bookmark,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  Flag,
  ImagePlus,
  Loader2,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Palette,
  Play,
  Plus,
  RefreshCw,
  Repeat2,
  Search,
  Send,
  Sparkles,
  Trash2,
  Trophy,
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
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { fetchJson } from "@/lib/api-client"
import { useAuthSession } from "@/hooks/use-auth-session"
import { cn } from "@/lib/utils"
import { CommunityMatchCardsSection } from "@/components/community-match-rooms"

type CommunityPostMedia = {
  id: string
  mediaId?: string
  type?: "image" | "video"
  mediaType: "image" | "video"
  status: "approved" | "pending_review" | "processing" | "rejected" | "failed" | string
  url?: string | null
  publicUrl?: string | null
  ownerPreviewUrl?: string | null
  mimeType?: string
  width?: number | null
  height?: number | null
  order?: number
  isLegacy?: boolean
}

type CommunityPost = {
  id: string
  title: string
  excerpt: string
  content?: string
  category?: string
  categoryLabel: string
  status?: string
  moderationStatus?: "approved" | "pending_review" | "rejected"
  likes: number
  reposts: number
  comments: number
  views: number
  timeAgo: string
  updatedAt?: string
  lastEditedAt?: string | null
  editVersion?: number
  hasPendingRevision?: boolean
  isEdited?: boolean
  isPinned: boolean
  isHot: boolean
  isLiked: boolean
  tags?: string[]
  teamIds?: string[]
  playerIds?: string[]
  matchId?: string
  matchContext?: {
    homeTeam: string
    awayTeam: string
    homeLogo: string
    awayLogo: string
    homeScore: number | null
    awayScore: number | null
    status: string
    kickoff: string
  } | null
  images?: string[]
  pendingImagePreviewUrls?: string[]
  videos?: string[]
  media?: CommunityPostMedia[]
  imageMedia?: CommunityPostMedia[]
  videoMedia?: CommunityPostMedia[]
  pendingRevisionPreview?: {
    content?: string
    category?: string
    tags?: string[]
    imageMediaIds?: string[] | null
    videoMediaIds?: string[] | null
    status?: string
    submittedAt?: string | null
    baseEditVersion?: number
  } | null
  visibility?: "public" | "friends"
  visibilityLabel?: string
  poll?: {
    question: string
    totalVotes: number
    viewerVote?: string
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
    fanProfile?: {
      badges: Array<{ id: string; label: string; description: string } | undefined>
      stats?: Record<string, unknown>
    }
  }
}

type UploadedMedia = {
  id: string
  mediaType: "image" | "video"
  status: "approved" | "pending_review" | "processing" | "rejected" | "failed"
  url: string | null
  publicUrl?: string | null
  ownerPreviewUrl?: string | null
  previewUrl?: string | null
  userMessage?: string
}

type CommunityUploadResponse = {
  success?: boolean
  message?: string
  error?: string
  media?: UploadedMedia | null
  items?: UploadedMedia[]
  pendingItems?: UploadedMedia[]
  urls?: string[]
}

type PreferenceTeam = {
  id: string
  name: string
  nameEn: string
  logo: string
}

type PreferencePlayer = {
  id: string
  name: string
  photo: string
  team: string
  teamLogo: string
}

type CommunityPreferencesResponse = {
  preferences: {
    favoriteTeamIds: string[]
    favoritePlayerIds: string[]
    preferredContentTypes: string[]
    favoriteTeams: PreferenceTeam[]
    favoritePlayers: PreferencePlayer[]
  }
  options: {
    teams: PreferenceTeam[]
    players: PreferencePlayer[]
    contentTypes: Array<{ id: string; label: string }>
  }
  limits?: {
    favoriteTeams: number
    favoritePlayers: number
  }
}

type MatchRoomFixture = {
  id: string
  homeTeam: string
  awayTeam: string
  homeLogo: string
  awayLogo: string
  homeScore: number | null
  awayScore: number | null
  status: string
  kickoff: string
  dateThai: string
  venue: string
  isFinished: boolean
}

type MatchRoomResponse = {
  fixtures: MatchRoomFixture[]
  fixture: MatchRoomFixture | null
  roomStats?: Record<string, { discussions: number; polls: number }>
  summary: { source: string; text: string }
  pollTemplate: {
    question: string
    options: Array<{ id: string; text: string }>
  }
  prompts: string[]
  posts: CommunityPost[]
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
  ownerPreviewUrl?: string
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
  type:
    | "post_like"
    | "post_comment"
    | "post_repost"
    | "community_friend_posted"
    | "community_content_pending"
    | "community_content_approved"
    | "community_content_rejected"
    | "community_content_hidden"
    | "community_user_warned"
    | "community_user_restricted"
    | "community_user_suspended"
    | "community_user_banned"
    | "community_moderation_strike_alert"
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
  story?: {
    id: string
    caption: string
  } | null
  media?: {
    id: string
    mediaType: string
    originalName: string
    status: string
  } | null
}

function getRepostReference(post: CommunityPost) {
  if (post.sharedItem?.type === "post" && post.sharedItem.postId) {
    return post.sharedItem.postId
  }

  return post.id
}

const categories = [
  { id: "all", label: "ทั้งหมด", description: "ดูทุกหัวข้อในคอมมูนิตี้" },
  { id: "match-discussion", label: "วิเคราะห์แมตช์", description: "แท็กติก ฟอร์มทีม และจุดเปลี่ยนของเกม" },
  { id: "predictions", label: "ทายผล", description: "คาดการณ์สกอร์ ผลการแข่งขัน และโพลก่อนเกม" },
  { id: "transfer-rumors", label: "ข่าวย้ายทีม", description: "ตลาดซื้อขาย ข่าวลือ และดีลที่น่าจับตา" },
  { id: "player-discussion", label: "พูดคุยนักเตะ", description: "ฟอร์มรายคน ดาวรุ่ง ตัวจริง และตัวสำรอง" },
  { id: "general", label: "ทั่วไป", description: "เรื่องคุยสบาย ๆ ของแฟนบอล" },
]

const categoryGroups = [
  {
    title: "Matchday",
    description: "คุยเรื่องเกม ฟอร์ม และผลการแข่งขัน",
    ids: ["match-discussion", "predictions"],
  },
  {
    title: "Squad & Market",
    description: "ติดตามนักเตะ ทีม และตลาดซื้อขาย",
    ids: ["transfer-rumors", "player-discussion"],
  },
  {
    title: "Community",
    description: "พื้นที่พูดคุยทั่วไปของแฟนบอล",
    ids: ["general"],
  },
]

const feedTabs = [
  { id: "for-you", label: "สำหรับคุณ", description: "จัดเรียงจากทีม นักเตะ และประเภทโพสต์ที่คุณชอบ" },
  { id: "latest", label: "ล่าสุด", description: "โพสต์ใหม่ล่าสุดในคอมมูนิตี้" },
  { id: "favorites", label: "ทีมโปรด", description: "โพสต์ที่เกี่ยวข้องกับทีมโปรดของคุณ" },
  { id: "trending", label: "กำลังเป็นที่นิยม", description: "โพสต์ที่มี engagement สูงในช่วงนี้" },
] as const

type FeedTab = (typeof feedTabs)[number]["id"]

const communityShortcuts = [
  { label: "วิเคราะห์แมตช์", value: "match-discussion" },
  { label: "ข่าวย้ายทีม", value: "transfer-rumors" },
  { label: "พูดคุยนักเตะ", value: "player-discussion" },
  { label: "ทายผล", value: "predictions" },
]

function socialFetcher<T>(path: string, token: string) {
  return fetchJson<T>(path, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
}

function liveFetcher<T>(path: string) {
  return fetchJson<T>(path, { cache: "no-store" })
}

function isAuthenticationError(error: unknown) {
  return error instanceof Error && /authentication required|unauthorized|ต้องเข้าสู่ระบบ/i.test(error.message)
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
  const { token, user, logout } = useAuthSession()
  const { toast } = useToast()

  const [selectedCategory, setSelectedCategory] = useState("all")
  const [feedTab, setFeedTab] = useState<FeedTab>("latest")
  const [selectedMatchId, setSelectedMatchId] = useState("")
  const [pollVotingPostId, setPollVotingPostId] = useState("")
  const [showPreferenceDialog, setShowPreferenceDialog] = useState(false)
  const [preferenceDismissed, setPreferenceDismissed] = useState(false)
  const [favoriteTeamIds, setFavoriteTeamIds] = useState<string[]>([])
  const [favoritePlayerIds, setFavoritePlayerIds] = useState<string[]>([])
  const [preferredContentTypes, setPreferredContentTypes] = useState<string[]>([])
  const [teamSearch, setTeamSearch] = useState("")
  const [playerSearch, setPlayerSearch] = useState("")
  const [preferenceSaving, setPreferenceSaving] = useState(false)
  const [selectedPostTeamIds, setSelectedPostTeamIds] = useState<string[]>([])
  const [selectedPostPlayerIds, setSelectedPostPlayerIds] = useState<string[]>([])
  const [editTeamIds, setEditTeamIds] = useState<string[]>([])
  const [editPlayerIds, setEditPlayerIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [composerTool, setComposerTool] = useState<ComposerTool>("general")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [category, setCategory] = useState("general")
  const [uploading, setUploading] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<UploadedMedia[]>([])
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadedVideos, setUploadedVideos] = useState<UploadedMedia[]>([])
  const [visibility, setVisibility] = useState<"public" | "friends">("public")
  const [pollQuestion, setPollQuestion] = useState("")
  const [pollOptions, setPollOptions] = useState(["", ""])
  const [showAdvancedContext, setShowAdvancedContext] = useState(false)
  const [showPollBuilder, setShowPollBuilder] = useState(false)
  const [pollBuilderError, setPollBuilderError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [likingPostId, setLikingPostId] = useState<string | null>(null)
  const [savingPostId, setSavingPostId] = useState<string | null>(null)
  const [reportingPostId, setReportingPostId] = useState<string | null>(null)
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null)
  const [editContent, setEditContent] = useState("")
  const [editCategory, setEditCategory] = useState("general")
  const [editTags, setEditTags] = useState("")
  const [editVersion, setEditVersion] = useState(1)
  const [editKeepImages, setEditKeepImages] = useState<CommunityPostMedia[]>([])
  const [editKeepVideos, setEditKeepVideos] = useState<CommunityPostMedia[]>([])
  const [editImages, setEditImages] = useState<UploadedMedia[]>([])
  const [editVideos, setEditVideos] = useState<UploadedMedia[]>([])
  const [loadingEditPostId, setLoadingEditPostId] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editUploadingImages, setEditUploadingImages] = useState(false)
  const [editUploadingVideo, setEditUploadingVideo] = useState(false)
  const [editConflict, setEditConflict] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CommunityPost | null>(null)
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null)
  const [sendingFriendId, setSendingFriendId] = useState<string | null>(null)
  const [handlingRequestId, setHandlingRequestId] = useState<string | null>(null)
  const [showNotificationsDialog, setShowNotificationsDialog] = useState(false)
  const [sharingFeedPostId, setSharingFeedPostId] = useState<string | null>(null)
  const [repostDraft, setRepostDraft] = useState("")
  const [repostTarget, setRepostTarget] = useState<CommunityPost | null>(null)
  const [showStoryComposer, setShowStoryComposer] = useState(false)
  const [storyCaption, setStoryCaption] = useState("")
  const [storyImage, setStoryImage] = useState<UploadedMedia | null>(null)
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
  const [storyPreviewUrls, setStoryPreviewUrls] = useState<Record<string, string>>({})
  const [postPreviewUrls, setPostPreviewUrls] = useState<Record<string, string>>({})
  const previousUnreadMessagesRef = useRef(0)
  const previousUnreadActivityRef = useRef(0)
  const authErrorNotifiedRef = useRef(false)
  const viewedStoryIdsRef = useRef<Set<string>>(new Set())
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const videoInputRef = useRef<HTMLInputElement | null>(null)
  const editImageInputRef = useRef<HTMLInputElement | null>(null)
  const editVideoInputRef = useRef<HTMLInputElement | null>(null)

  function logCommunityDebug(step: string, payload: Record<string, unknown>) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[community-debug] ${step}`, payload)
    }
  }

  function normalizeUploadItems(result: CommunityUploadResponse | null) {
    const items = Array.isArray(result?.items) ? result?.items : []
    const pendingItems = Array.isArray(result?.pendingItems) ? result?.pendingItems : []
    return [...items, ...pendingItems]
      .filter((item): item is UploadedMedia => Boolean(item?.id && item?.mediaType && item?.status))
      .map((item) => ({
        id: item.id,
        mediaType: item.mediaType,
        status: item.status,
        url: item.url || null,
        publicUrl: item.publicUrl || item.url || null,
        ownerPreviewUrl: item.ownerPreviewUrl || null,
        previewUrl: null,
        userMessage: item.userMessage,
      }))
  }

  function handleAuthError(error: unknown, description = "กรุณาเข้าสู่ระบบใหม่ก่อนใช้งานคอมมูนิตี้") {
    if (!isAuthenticationError(error)) return false
    logout()
    if (!authErrorNotifiedRef.current) {
      authErrorNotifiedRef.current = true
      toast({
        title: "เซสชันหมดอายุหรือยังไม่ได้เข้าสู่ระบบ",
        description,
        variant: "destructive",
      })
    }
    return true
  }

  const query = useMemo(() => {
    const params = new URLSearchParams()
    params.set("limit", "20")
    params.set("feed", feedTab)
    if (selectedCategory !== "all") params.set("category", selectedCategory)
    if (searchQuery.trim()) params.set("q", searchQuery.trim())
    return `/community/posts?${params.toString()}`
  }, [feedTab, searchQuery, selectedCategory])

  const { data, isLoading, mutate } = useSWR<{ items: CommunityPost[]; stats: Record<string, number> }>(
    token ? [query, token] : query,
    (key: string | [string, string]) => {
      if (Array.isArray(key)) {
        const [url, authToken] = key
        return socialFetcher<{ items: CommunityPost[]; stats: Record<string, number> }>(url, authToken)
      }
      return liveFetcher<{ items: CommunityPost[]; stats: Record<string, number> }>(key)
    },
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
      dedupingInterval: 1000,
    },
  )
  const { data: preferencesData, error: preferencesError, mutate: mutatePreferences } = useSWR(
    token ? ["/community/preferences", token] : null,
    ([url, authToken]) =>
      socialFetcher<CommunityPreferencesResponse>(url, authToken).catch((error) => {
        handleAuthError(error)
        throw error
      }),
    { shouldRetryOnError: false },
  )
  const matchRoomQuery = selectedMatchId ? `/community/match-room?matchId=${encodeURIComponent(selectedMatchId)}` : "/community/match-room"
  const { data: matchRoomData, mutate: mutateMatchRoom } = useSWR<MatchRoomResponse>(
    token ? [matchRoomQuery, token] : matchRoomQuery,
    (key: string | [string, string]) => {
      if (Array.isArray(key)) {
        const [url, authToken] = key
        return socialFetcher<MatchRoomResponse>(url, authToken).catch((error) => {
          handleAuthError(error)
          throw error
        })
      }
      return liveFetcher<MatchRoomResponse>(key)
    },
    { refreshInterval: 10000, shouldRetryOnError: false },
  )
  const { data: favoritesData, mutate: mutateFavorites } = useSWR(
    token ? ["/favorites", token] : null,
    ([url, authToken]) =>
      socialFetcher<{ items: FavoriteItem[] }>(url, authToken).catch((error) => {
        handleAuthError(error)
        throw error
      }),
    { shouldRetryOnError: false },
  )
  const { data: socialData, mutate: mutateSocial } = useSWR(
    token ? ["/community/social", token] : null,
    ([url, authToken]) =>
      socialFetcher<{
        friends: { id: string; user: SocialUser }[]
        requests: { incoming: FriendRequest[] }
        suggestions: SocialUser[]
        conversations: Conversation[]
      }>(url, authToken).catch((error) => {
        handleAuthError(error)
        throw error
      }),
    { refreshInterval: 5000, shouldRetryOnError: false },
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
      }>(url, authToken).catch((error) => {
        handleAuthError(error)
        throw error
      }),
    { refreshInterval: 4000, shouldRetryOnError: false },
  )
  const { data: storiesData, mutate: mutateStories } = useSWR(
    token ? ["/community/stories", token] : "/community/stories",
    (key: string | [string, string]) => {
      if (Array.isArray(key)) {
        const [url, authToken] = key
        return socialFetcher<{ items: CommunityStoryGroup[] }>(url, authToken).catch((error) => {
          handleAuthError(error)
          throw error
        })
      }
      return liveFetcher<{ items: CommunityStoryGroup[] }>(key)
    },
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
      dedupingInterval: 1000,
      shouldRetryOnError: false,
    },
  )

  const posts = data?.items || []
  const matchRoomFixture = matchRoomData?.fixture || null
  const matchRoomFixtures = matchRoomData?.fixtures || []
  const matchRoomPosts = matchRoomData?.posts || []
  const canCreateMatchRoomPoll = Boolean(matchRoomFixture?.isFinished)
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
  const preferenceOptions = preferencesData?.options
  const hasPreferences = Boolean(
    preferencesData?.preferences.favoriteTeamIds.length ||
      preferencesData?.preferences.favoritePlayerIds.length ||
      preferencesData?.preferences.preferredContentTypes.length,
  )
  const filteredTeams = useMemo(() => {
    const q = teamSearch.trim().toLowerCase()
    return (preferenceOptions?.teams || [])
      .filter((team) => [team.name, team.nameEn].some((value) => value.toLowerCase().includes(q)))
      .slice(0, 12)
  }, [preferenceOptions?.teams, teamSearch])
  const filteredPlayers = useMemo(() => {
    const q = playerSearch.trim().toLowerCase()
    return (preferenceOptions?.players || [])
      .filter((player) => [player.name, player.team].some((value) => value.toLowerCase().includes(q)))
      .slice(0, 12)
  }, [playerSearch, preferenceOptions?.players])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const currentFeed = params.get("feed")
    const queryMatchId = params.get("matchId")
    const composeMode = params.get("compose")
    if (currentFeed && feedTabs.some((tab) => tab.id === currentFeed)) {
      setFeedTab(currentFeed as FeedTab)
    }
    if (queryMatchId) {
      setSelectedMatchId(queryMatchId)
      if (composeMode) {
        setShowCreatePost(true)
        setCategory("match-discussion")
        setComposerTool(composeMode === "poll" ? "poll" : "general")
        if (composeMode === "poll") {
          setTitle("โหวตหลังเกม")
          setContent("ชวนแฟนบอลมาโหวตและคุยหลังเกมกันครับ")
          setShowPollBuilder(true)
        }
      }
    }
    setPreferenceDismissed(window.localStorage.getItem("footballai-community-preferences-dismissed") === "1")

    const handlePopState = () => {
      const nextParams = new URLSearchParams(window.location.search)
      const nextFeed = nextParams.get("feed")
      setFeedTab(feedTabs.some((tab) => tab.id === nextFeed) ? (nextFeed as FeedTab) : "latest")
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    if (!preferencesData?.preferences) return
    setFavoriteTeamIds(preferencesData.preferences.favoriteTeamIds || [])
    setFavoritePlayerIds(preferencesData.preferences.favoritePlayerIds || [])
    setPreferredContentTypes(preferencesData.preferences.preferredContentTypes || [])
  }, [preferencesData?.preferences])

  useEffect(() => {
    authErrorNotifiedRef.current = false
  }, [token])

  useEffect(() => {
    if (!token || !storyGroups.length) return
    let cancelled = false
    const pendingStories = storyGroups.flatMap((group) => group.stories).filter((story) => story.ownerPreviewUrl && !storyPreviewUrls[story.id])
    if (!pendingStories.length) return

    Promise.all(
      pendingStories.map(async (story) => {
        const response = await fetch(story.ownerPreviewUrl as string, { headers: { Authorization: `Bearer ${token}` } })
        if (!response.ok) return null
        const blob = await response.blob()
        return [story.id, URL.createObjectURL(blob)] as const
      }),
    )
      .then((entries) => {
        if (cancelled) return
        setStoryPreviewUrls((current) => ({ ...current, ...Object.fromEntries(entries.filter(Boolean) as Array<readonly [string, string]>) }))
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [storyGroups, storyPreviewUrls, token])

  function getStoryImage(story: CommunityStory) {
    return storyPreviewUrls[story.id] || story.image
  }

  function getStoryGroupImage(group: CommunityStoryGroup) {
    const latest = group.stories[group.stories.length - 1]
    return latest ? getStoryImage(latest) : group.latestImage
  }

  function getPostImages(post: CommunityPost) {
    const approved = post.images || []
    const pending = (post.pendingImagePreviewUrls || []).map((url, index) => postPreviewUrls[`${post.id}:${index}`] || url)
    return [...approved, ...pending]
  }

  function getMediaUrl(media: CommunityPostMedia | UploadedMedia) {
    return media.publicUrl || media.url || media.ownerPreviewUrl || ("previewUrl" in media ? media.previewUrl : null) || ""
  }

  function buildLegacyPostMedia(urls: string[] | undefined, mediaType: "image" | "video") {
    return (urls || []).map((url, index) => ({
      id: `legacy-${mediaType}-${index}`,
      mediaId: "",
      type: mediaType,
      mediaType,
      status: "approved",
      url,
      publicUrl: url,
      ownerPreviewUrl: null,
      order: index,
      isLegacy: true,
    }))
  }

  function getEditableImageMedia(post: CommunityPost) {
    return post.imageMedia?.length ? post.imageMedia : buildLegacyPostMedia(post.images, "image")
  }

  function getEditableVideoMedia(post: CommunityPost) {
    return post.videoMedia?.length ? post.videoMedia : buildLegacyPostMedia(post.videos, "video")
  }

  function moveMediaItem<T>(items: T[], index: number, direction: -1 | 1) {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= items.length) return items
    const next = [...items]
    const current = next[index]
    next[index] = next[nextIndex]
    next[nextIndex] = current
    return next
  }

  function getStableMediaId(media: CommunityPostMedia | UploadedMedia) {
    return "mediaId" in media && media.mediaId ? media.mediaId : media.id
  }

  useEffect(() => {
    if (!token || !data?.items?.length) return
    let cancelled = false
    const pending = data.items.flatMap((post) =>
      (post.pendingImagePreviewUrls || []).map((url, index) => ({ key: `${post.id}:${index}`, url })),
    ).filter((item) => !postPreviewUrls[item.key])
    if (!pending.length) return

    Promise.all(
      pending.map(async ({ key, url }) => {
        const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        if (!response.ok) return null
        return [key, URL.createObjectURL(await response.blob())] as const
      }),
    )
      .then((entries) => {
        if (cancelled) return
        setPostPreviewUrls((current) => ({ ...current, ...Object.fromEntries(entries.filter(Boolean) as Array<readonly [string, string]>) }))
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [data?.items, postPreviewUrls, token])
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

  function changeFeedTab(nextFeed: FeedTab) {
    setFeedTab(nextFeed)
    const params = new URLSearchParams(window.location.search)
    params.set("feed", nextFeed)
    window.history.pushState({}, "", `${window.location.pathname}?${params.toString()}`)
  }

  function dismissPreferenceBanner() {
    setPreferenceDismissed(true)
    window.localStorage.setItem("footballai-community-preferences-dismissed", "1")
  }

  function toggleStringSelection(value: string, current: string[], setValue: (items: string[]) => void, limit = 99) {
    if (current.includes(value)) {
      setValue(current.filter((item) => item !== value))
      return
    }
    if (current.length >= limit) return
    setValue([...current, value])
  }

  async function handleSavePreferences() {
    if (!requireLogin("กรุณาเข้าสู่ระบบเพื่อบันทึกความสนใจ")) return

    try {
      setPreferenceSaving(true)
      await fetchJson<CommunityPreferencesResponse>("/community/preferences", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          favoriteTeamIds,
          favoritePlayerIds,
          preferredContentTypes,
        }),
      })
      await mutatePreferences()
      void mutate()
      setShowPreferenceDialog(false)
      dismissPreferenceBanner()
      toast({ title: "บันทึกความสนใจแล้ว", description: "Feed สำหรับคุณและทีมโปรดจะอัปเดตตามข้อมูลล่าสุด" })
    } catch (error) {
      if (handleAuthError(error, "กรุณาเข้าสู่ระบบบนหน้านี้ก่อนบันทึกความสนใจ")) return
      toast({
        title: "บันทึกความสนใจไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setPreferenceSaving(false)
    }
  }

  function startMatchRoomPost(prompt?: string) {
    if (!matchRoomFixture) return
    setShowCreatePost(true)
    setComposerTool("general")
    setCategory("match-discussion")
    setSelectedMatchId(matchRoomFixture.id)
    setTitle(`${matchRoomFixture.homeTeam} vs ${matchRoomFixture.awayTeam}`)
    setContent(prompt || "")
  }

  function applyPostMatchPollTemplate() {
    if (!matchRoomData?.pollTemplate) return
    if (!canCreateMatchRoomPoll) {
      toast({ title: "Poll หลังเกมยังไม่เปิด", description: "ระบบจะเปิดให้สร้าง Poll เมื่อแมตช์จบแล้ว" })
      return
    }
    setShowCreatePost(true)
    setComposerTool("poll")
    setCategory("match-discussion")
    if (matchRoomFixture?.id) setSelectedMatchId(matchRoomFixture.id)
    setTitle(matchRoomFixture ? `โหวตหลังเกม: ${matchRoomFixture.homeTeam} vs ${matchRoomFixture.awayTeam}` : "โหวตหลังเกม")
    setContent("ชวนแฟนบอลมาโหวตและคุยหลังเกมกันครับ")
    setPollQuestion(matchRoomData.pollTemplate.question)
    setPollOptions(matchRoomData.pollTemplate.options.map((option) => option.text).slice(0, 4))
  }

  async function votePoll(post: CommunityPost, optionId: string) {
    if (!requireLogin("กรุณาเข้าสู่ระบบเพื่อโหวตโพล")) return
    if (post.poll?.viewerVote) {
      toast({ title: "คุณโหวตแล้ว", description: "หนึ่งบัญชีโหวตได้หนึ่งครั้งต่อโพล" })
      return
    }

    try {
      setPollVotingPostId(post.id)
      const response = await fetchJson<{ poll: NonNullable<CommunityPost["poll"]> }>(`/community/posts/${post.id}/poll`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ optionId }),
      })
      await mutate(
        (current) =>
          current
            ? {
                ...current,
                items: current.items.map((item) => (item.id === post.id ? { ...item, poll: response.poll } : item)),
              }
            : current,
        false,
      )
      void mutateMatchRoom()
      toast({ title: "โหวตสำเร็จ", description: "บันทึกคำตอบในโพลแล้ว" })
    } catch (error) {
      if (handleAuthError(error, "กรุณาเข้าสู่ระบบบนหน้านี้ก่อนโหวต")) return
      toast({
        title: "โหวตไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setPollVotingPostId("")
    }
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
      const result = (await response.json().catch(() => null)) as CommunityUploadResponse | null
      logCommunityDebug("image-upload:response", {
        ok: response.ok,
        status: response.status,
        result,
      })
      if (!response.ok) throw new Error(result?.error || "Upload failed")
      const nextItems = normalizeUploadItems(result).filter((item) => item.mediaType === "image").map((item, index) => ({
        ...item,
        previewUrl: item.status === "pending_review" && files[index] ? URL.createObjectURL(files[index]) : null,
      }))
      setUploadedImages((current) => [...current, ...nextItems].slice(0, 4))
      const hasPending = nextItems.some((item) => item.status === "pending_review")
      toast(
        hasPending
          ? { title: "อัปโหลดรูปแล้ว", description: "บางรูปกำลังรอตรวจสอบก่อนแนบขึ้นโพสต์" }
          : { title: "อัปโหลดรูปแล้ว", description: "รูปพร้อมแนบในโพสต์นี้" },
      )
    } catch (error) {
      if (handleAuthError(error, "กรุณาเข้าสู่ระบบบนหน้านี้ก่อนอัปโหลดรูป")) return
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
      const result = (await response.json().catch(() => null)) as CommunityUploadResponse | null
      logCommunityDebug("video-upload:response", {
        ok: response.ok,
        status: response.status,
        result,
      })
      if (!response.ok) throw new Error(result?.error || "Upload failed")
      const nextVideo = normalizeUploadItems(result).find((item) => item.mediaType === "video") || null
      setUploadedVideos(nextVideo ? [nextVideo] : [])
      setComposerTool("video")
      toast({
        title: "อัปโหลดวิดีโอแล้ว",
        description: nextVideo?.status === "processing" ? "วิดีโอกำลังเข้าสู่ขั้นตอนตรวจสอบ" : "วิดีโอพร้อมแนบในโพสต์นี้",
      })
    } catch (error) {
      if (handleAuthError(error, "กรุณาเข้าสู่ระบบบนหน้านี้ก่อนอัปโหลดวิดีโอ")) return
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

  function populateEditForm(post: CommunityPost) {
    setEditingPost(post)
    setEditContent(post.content || post.excerpt || "")
    setEditCategory(post.category || "general")
    setEditTags((post.tags || []).join(", "))
    setEditVersion(Number(post.editVersion || 1))
    setEditKeepImages(getEditableImageMedia(post))
    setEditKeepVideos(getEditableVideoMedia(post))
    setEditTeamIds(post.teamIds || [])
    setEditPlayerIds(post.playerIds || [])
    setEditImages([])
    setEditVideos([])
    setEditConflict(false)
  }

  async function openEditPost(post: CommunityPost) {
    if (!requireLogin("กรุณาเข้าสู่ระบบเพื่อแก้ไขโพสต์")) return
    populateEditForm(post)
    setLoadingEditPostId(post.id)
    try {
      const latest = await fetchJson<{ item: CommunityPost }>(`/community/posts/${post.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      populateEditForm(latest.item)
    } catch (error) {
      if (!handleAuthError(error, "กรุณาเข้าสู่ระบบบนหน้านี้ก่อนแก้ไขโพสต์")) {
        toast({
          title: "โหลดโพสต์ล่าสุดไม่ได้",
          description: "เปิดข้อมูลจากฟีดให้แก้ก่อน หากบันทึกแล้วข้อมูลเก่าระบบจะแจ้งเตือนอีกครั้ง",
        })
      }
    } finally {
      setLoadingEditPostId(null)
    }
  }

  function closeEditPost() {
    if (savingEdit || editUploadingImages || editUploadingVideo) return
    setEditingPost(null)
    setEditConflict(false)
    setEditImages([])
    setEditVideos([])
  }

  async function handleEditImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    if (!requireLogin("กรุณาเข้าสู่ระบบเพื่ออัปโหลดรูป")) return

    try {
      setEditUploadingImages(true)
      const formData = new FormData()
      files.slice(0, Math.max(0, 4 - editKeepImages.length - editImages.length)).forEach((file) => formData.append("files", file))
      const response = await fetch("/api/community/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const result = (await response.json().catch(() => null)) as CommunityUploadResponse | null
      if (!response.ok) throw new Error(result?.error || "Upload failed")
      const nextItems = normalizeUploadItems(result)
        .filter((item) => item.mediaType === "image")
        .map((item, index) => ({
          ...item,
          previewUrl: item.status === "pending_review" && files[index] ? URL.createObjectURL(files[index]) : item.previewUrl || null,
        }))
      setEditImages((current) => [...current, ...nextItems].slice(0, 4))
      toast({
        title: "เพิ่มรูปในฉบับแก้ไขแล้ว",
        description: nextItems.some((item) => item.status === "pending_review") ? "รูปบางส่วนจะทำให้ฉบับแก้ไขเข้าคิวตรวจ" : "รูปพร้อมใช้กับฉบับแก้ไข",
      })
    } catch (error) {
      if (handleAuthError(error, "กรุณาเข้าสู่ระบบบนหน้านี้ก่อนอัปโหลดรูป")) return
      toast({
        title: "อัปโหลดรูปไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setEditUploadingImages(false)
      event.target.value = ""
    }
  }

  async function handleEditVideoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!requireLogin("กรุณาเข้าสู่ระบบเพื่ออัปโหลดวิดีโอ")) return

    try {
      setEditUploadingVideo(true)
      const formData = new FormData()
      formData.append("files", file)
      const response = await fetch("/api/community/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const result = (await response.json().catch(() => null)) as CommunityUploadResponse | null
      if (!response.ok) throw new Error(result?.error || "Upload failed")
      const nextVideo = normalizeUploadItems(result).find((item) => item.mediaType === "video") || null
      setEditVideos(nextVideo ? [nextVideo] : [])
      toast({
        title: "เพิ่มวิดีโอในฉบับแก้ไขแล้ว",
        description: nextVideo?.status === "processing" ? "วิดีโอกำลังตรวจสอบและจะทำให้ฉบับแก้ไขรอตรวจ" : "วิดีโอพร้อมใช้กับฉบับแก้ไข",
      })
    } catch (error) {
      if (handleAuthError(error, "กรุณาเข้าสู่ระบบบนหน้านี้ก่อนอัปโหลดวิดีโอ")) return
      toast({
        title: "อัปโหลดวิดีโอไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setEditUploadingVideo(false)
      event.target.value = ""
    }
  }

  async function handleSavePostEdit() {
    if (!editingPost || !requireLogin("กรุณาเข้าสู่ระบบเพื่อบันทึกการแก้ไข")) return
    if (editContent.trim().length < 8) {
      toast({ title: "เนื้อหาสั้นเกินไป", description: "กรุณาเขียนอย่างน้อย 8 ตัวอักษร", variant: "destructive" })
      return
    }

    setSavingEdit(true)
    setEditConflict(false)
    try {
      const body: Record<string, unknown> = {
        content: editContent.trim(),
        category: editCategory,
        tags: editTags
          .split(",")
          .map((item) => item.trim().replace(/^#/, ""))
          .filter(Boolean),
        teamIds: editTeamIds,
        playerIds: editPlayerIds,
        editVersion,
      }

      const initialImageIds = getEditableImageMedia(editingPost).map(getStableMediaId).join("|")
      const initialVideoIds = getEditableVideoMedia(editingPost).map(getStableMediaId).join("|")
      const nextImageIds = [...editKeepImages.map(getStableMediaId), ...editImages.map((item) => item.id)]
      const nextVideoIds = [...editKeepVideos.map(getStableMediaId), ...editVideos.map((item) => item.id)]
      const imageChanged = editImages.length > 0 || nextImageIds.join("|") !== initialImageIds
      const videoChanged = editVideos.length > 0 || nextVideoIds.join("|") !== initialVideoIds

      if (imageChanged && editKeepImages.some((item) => item.isLegacy || !getStableMediaId(item))) {
        toast({
          title: "รูปเดิมยังไม่มี mediaId",
          description: "กรุณาโหลดโพสต์ล่าสุดอีกครั้งก่อนลบหรือจัดเรียงรูปเดิม",
          variant: "destructive",
        })
        return
      }
      if (videoChanged && editKeepVideos.some((item) => item.isLegacy || !getStableMediaId(item))) {
        toast({
          title: "วิดีโอเดิมยังไม่มี mediaId",
          description: "กรุณาโหลดโพสต์ล่าสุดอีกครั้งก่อนลบหรือจัดเรียงวิดีโอเดิม",
          variant: "destructive",
        })
        return
      }

      if (imageChanged) body.imageMediaIds = nextImageIds
      if (videoChanged) body.videoMediaIds = nextVideoIds

      const response = await fetchJson<{ item: CommunityPost; moderationStatus: "approved" | "pending_review" | "rejected"; revisionStatus?: string }>(
        `/community/posts/${editingPost.id}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        },
      )

      await mutate(
        (current) =>
          current?.items
            ? {
                ...current,
                items: current.items.map((item) => (item.id === response.item.id ? { ...item, ...response.item } : item)),
              }
            : current,
        false,
      )
      void mutate()
      setEditingPost(null)
      toast(
        response.revisionStatus === "pending_review" || response.moderationStatus === "pending_review"
          ? {
              title: "ส่งการแก้ไขให้ผู้ดูแลตรวจสอบแล้ว",
              description: "โพสต์เวอร์ชันเดิมจะยังแสดงอยู่จนกว่าจะได้รับอนุมัติ",
            }
          : { title: "แก้ไขโพสต์สำเร็จ", description: "อัปเดตโพสต์บน community แล้ว" },
      )
    } catch (error) {
      if (handleAuthError(error, "กรุณาเข้าสู่ระบบบนหน้านี้ก่อนบันทึกการแก้ไข")) return
      const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาด"
      if (/edited elsewhere|refresh|409|Conflict/i.test(message)) {
        setEditConflict(true)
        toast({
          title: "โพสต์ถูกแก้จากที่อื่น",
          description: "กรุณาโหลดข้อมูลล่าสุดก่อนบันทึกอีกครั้ง",
          variant: "destructive",
        })
        return
      }
      toast({
        title: "บันทึกการแก้ไขไม่สำเร็จ",
        description: message,
        variant: "destructive",
      })
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDeletePost() {
    if (!deleteTarget || !requireLogin("กรุณาเข้าสู่ระบบเพื่อลบโพสต์")) return
    setDeletingPostId(deleteTarget.id)
    try {
      await fetchJson(`/community/posts/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      await mutate(
        (current) =>
          current?.items
            ? {
                ...current,
                items: current.items.filter((item) => item.id !== deleteTarget.id),
              }
            : current,
        false,
      )
      setDeleteTarget(null)
      toast({ title: "ลบโพสต์แล้ว", description: "โพสต์ถูกนำออกจากฟีดเรียบร้อย" })
    } catch (error) {
      if (handleAuthError(error, "กรุณาเข้าสู่ระบบบนหน้านี้ก่อนลบโพสต์")) return
      toast({
        title: "ลบโพสต์ไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setDeletingPostId(null)
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
      formData.append("purpose", "story")
      const response = await fetch("/api/community/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const result = (await response.json().catch(() => null)) as CommunityUploadResponse | null
      logCommunityDebug("story-upload:response", {
        ok: response.ok,
        status: response.status,
        result,
      })
      if (!response.ok) throw new Error(result?.error || "Upload failed")
      const nextStoryImage = normalizeUploadItems(result).find((item) => item.mediaType === "image") || null
      setStoryImage(nextStoryImage ? { ...nextStoryImage, previewUrl: nextStoryImage.status === "pending_review" ? URL.createObjectURL(file) : null } : null)
      setShowStoryEditor(Boolean(nextStoryImage))
      toast({
        title: "Story image ready",
        description:
          nextStoryImage?.status === "pending_review"
            ? "รูปสตอรี่นี้กำลังรอการตรวจสอบจากผู้ดูแลระบบ"
            : "Your story cover has been uploaded.",
      })
    } catch (error) {
      if (handleAuthError(error, "กรุณาเข้าสู่ระบบบนหน้านี้ก่อนเพิ่มสตอรี่")) return
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
    if (!storyImage?.id || (!storyImage.url && !storyImage.previewUrl && !storyImage.ownerPreviewUrl)) {
      toast({ title: "Story image required", description: "Please upload an image before posting your story.", variant: "destructive" })
      return
    }

    try {
      setStorySubmitting(true)
      await fetchJson("/community/stories", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          image: storyImage.url || "",
          imageMediaId: storyImage.id,
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
      setStoryImage(null)
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
      if (handleAuthError(error, "กรุณาเข้าสู่ระบบบนหน้านี้ก่อนโพสต์สตอรี่")) return
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
    if (shouldSendPoll) {
      const pollValidation = getPollDraftValidation()
      if (pollValidation) {
        toast({ title: "Poll ยังไม่พร้อม", description: pollValidation, variant: "destructive" })
        setShowPollBuilder(true)
        return
      }
    }

    setSubmitting(true)
    try {
      const imageMediaIds = uploadedImages.map((item) => item.id)
      const videoMediaIds = uploadedVideos.map((item) => item.id)
      logCommunityDebug("post-create:payload", {
        title,
        category,
        imageMediaIds,
        videoMediaIds,
        teamIds: selectedPostTeamIds,
        playerIds: selectedPostPlayerIds,
        imageStatuses: uploadedImages.map((item) => item.status),
        videoStatuses: uploadedVideos.map((item) => item.status),
      })
      const response = await fetchJson<{ item: CommunityPost; moderationStatus: "approved" | "pending_review" | "rejected" }>("/community/posts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          content,
          category,
          matchId: selectedMatchId,
          imageMediaIds,
          videoMediaIds,
          teamIds: selectedPostTeamIds,
          playerIds: selectedPostPlayerIds,
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
      setSelectedPostTeamIds([])
      setSelectedPostPlayerIds([])
      setSelectedMatchId("")
      setVisibility("public")
      setPollQuestion("")
      setPollOptions(["", ""])
      setComposerTool("general")
      setShowCreatePost(false)
      await mutate()
      void mutateMatchRoom()
      toast(
        response.moderationStatus === "approved"
          ? { title: "โพสต์สำเร็จ", description: "เพิ่มโพสต์ใหม่เข้า community แล้ว" }
          : { title: "ส่งโพสต์สำเร็จ", description: "โพสต์นี้กำลังรอตรวจสอบ คุณจะเห็นได้จากบัญชีของคุณก่อน" },
      )
    } catch (error) {
      if (handleAuthError(error, "กรุณาเข้าสู่ระบบบนหน้านี้ก่อนสร้างโพสต์")) return
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
    setPollOptions((current) => (current.length >= 6 ? current : [...current, ""]))
  }

  function removePollOption(index: number) {
    setPollOptions((current) => (current.length <= 2 ? current : current.filter((_, itemIndex) => itemIndex !== index)))
  }

  function movePollOption(index: number, direction: -1 | 1) {
    setPollOptions((current) => moveMediaItem(current, index, direction))
  }

  function getPollDraftValidation() {
    const question = pollQuestion.trim()
    const options = pollOptions.map((item) => item.trim())
    const filledOptions = options.filter(Boolean)
    const uniqueOptions = new Set(filledOptions.map((item) => item.toLowerCase()))
    if (question.length < 4) return "กรุณาใส่คำถามโพลอย่างน้อย 4 ตัวอักษร"
    if (question.length > 180) return "คำถามโพลต้องไม่เกิน 180 ตัวอักษร"
    if (options.some((item) => !item)) return "ตัวเลือกต้องไม่มีช่องว่าง"
    if (filledOptions.length < 2) return "Poll ต้องมีอย่างน้อย 2 ตัวเลือก"
    if (filledOptions.length > 6) return "Poll มีได้สูงสุด 6 ตัวเลือก"
    if (filledOptions.some((item) => item.length > 120)) return "ตัวเลือกแต่ละข้อยาวได้ไม่เกิน 120 ตัวอักษร"
    if (uniqueOptions.size !== filledOptions.length) return "ตัวเลือก Poll ห้ามซ้ำกัน"
    return ""
  }

  function openPollBuilder() {
    setComposerTool("poll")
    setPollBuilderError("")
    setShowPollBuilder(true)
  }

  function savePollBuilder() {
    const error = getPollDraftValidation()
    if (error) {
      setPollBuilderError(error)
      return
    }
    setPollOptions((current) => current.map((item) => item.trim()).filter(Boolean))
    setPollQuestion((current) => current.trim())
    setPollBuilderError("")
    setComposerTool("poll")
    setShowPollBuilder(false)
  }

  function clearPollDraft() {
    setPollQuestion("")
    setPollOptions(["", ""])
    setPollBuilderError("")
    if (composerTool === "poll") setComposerTool("general")
  }

  function resetComposer() {
    setShowCreatePost(false)
    setComposerTool("general")
    setTitle("")
    setContent("")
    setCategory("general")
    setUploadedImages([])
    setUploadedVideos([])
    setSelectedPostTeamIds([])
    setSelectedPostPlayerIds([])
    setSelectedMatchId("")
    setPollQuestion("")
    setPollOptions(["", ""])
    setShowAdvancedContext(false)
    setShowPollBuilder(false)
    setPollBuilderError("")
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
              <div key={image.id} className="relative overflow-hidden rounded-2xl border border-white/10">
                <div className="relative h-28">
                  {image.url ? (
                    <Image src={image.url} alt="upload" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-background/80 text-center text-xs text-muted-foreground">
                      รูปกำลังรอตรวจสอบ
                    </div>
                  )}
                </div>
                <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[11px] text-white">
                  {image.status === "approved" ? "พร้อมโพสต์" : "รอตรวจสอบ"}
                </div>
                <button
                  onClick={() => setUploadedImages((current) => current.filter((item) => item.id !== image.id))}
                  className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[11px] text-white"
                >
                  ลบ
                </button>
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
              <div key={video.id} className="overflow-hidden rounded-2xl border border-white/10 bg-background/70">
                {video.url ? (
                  <video src={video.url} controls className="h-64 w-full bg-black object-cover" />
                ) : (
                  <div className="flex h-64 items-center justify-center bg-black/70 px-6 text-center text-sm text-muted-foreground">
                    วิดีโอนี้กำลังเข้าสู่ขั้นตอนตรวจสอบและประมวลผล
                  </div>
                )}
                <div className="flex justify-end p-3">
                  <button
                    type="button"
                    onClick={() => setUploadedVideos((current) => current.filter((item) => item.id !== video.id))}
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
    const savedOptions = pollOptions.map((item) => item.trim()).filter(Boolean)
    return (
      <div className="rounded-[22px] border border-primary/30 bg-primary/8 p-4 transition-colors">
        {pollQuestion.trim() && savedOptions.length >= 2 ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <Badge className="mb-2 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] text-primary hover:bg-primary/15">
                Poll จาก Community
              </Badge>
              <p className="line-clamp-2 text-sm font-semibold text-foreground">{pollQuestion}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {savedOptions.length} ตัวเลือก{selectedMatchId && matchRoomFixture ? ` • ${matchRoomFixture.homeTeam} vs ${matchRoomFixture.awayTeam}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="outline" size="sm" onClick={openPollBuilder} className="rounded-full border-white/10">
                แก้ไข
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={clearPollDraft} className="rounded-full border-white/10 text-muted-foreground">
                ลบ
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Poll จาก Community</p>
              <p className="text-xs text-muted-foreground">สร้างคำถามและตัวเลือกในหน้าต่างแยก ไม่กินพื้นที่ composer</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={openPollBuilder} className="rounded-full border-white/10">
              เปิด Poll Builder
            </Button>
          </div>
        )}
      </div>
    )
  }

  function renderPollBuilderDialog() {
    const filledOptions = pollOptions.filter((item) => item.trim()).length
    return (
      <Dialog open={showPollBuilder} onOpenChange={setShowPollBuilder}>
        <DialogContent className="flex h-[min(92vh,760px)] max-w-3xl flex-col overflow-hidden rounded-[28px] border-border/60 bg-[#101214] p-0 text-foreground sm:h-auto">
          <DialogHeader className="border-b border-border/60 px-5 py-4 sm:px-6">
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Poll Builder
            </DialogTitle>
            <DialogDescription>สร้าง Poll แยกจาก Composer หลัก รองรับ 2-6 ตัวเลือกและตรวจความถูกต้องก่อนบันทึก</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-4">
                {selectedMatchId && matchRoomFixture ? (
                  <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                    Match context: {matchRoomFixture.homeTeam} vs {matchRoomFixture.awayTeam}
                  </div>
                ) : null}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">คำถาม</label>
                  <Input
                    placeholder="เช่น หลังเกมนี้ใครคือ Man of the Match?"
                    value={pollQuestion}
                    onChange={(event) => {
                      setPollQuestion(event.target.value)
                      setPollBuilderError("")
                    }}
                    className="rounded-2xl border-white/10 bg-background/70 shadow-none"
                    maxLength={180}
                  />
                  <p className="text-xs text-muted-foreground">{pollQuestion.trim().length}/180 ตัวอักษร</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-semibold text-foreground">ตัวเลือก</label>
                    <Badge variant="outline" className="rounded-full border-white/10 px-3 py-1 text-xs text-muted-foreground">
                      {filledOptions}/6 options
                    </Badge>
                  </div>
                  {pollOptions.map((option, index) => (
                    <div key={`poll-builder-option-${index}`} className="grid grid-cols-[1fr_auto] gap-2">
                      <Input
                        placeholder={`ตัวเลือก ${index + 1}`}
                        value={option}
                        onChange={(event) => {
                          updatePollOption(index, event.target.value)
                          setPollBuilderError("")
                        }}
                        className="rounded-2xl border-white/10 bg-background/70 shadow-none"
                        maxLength={120}
                      />
                      <div className="flex gap-1">
                        <Button type="button" variant="outline" size="sm" onClick={() => movePollOption(index, -1)} disabled={index === 0} className="rounded-full border-white/10 px-2">
                          ↑
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => movePollOption(index, 1)} disabled={index === pollOptions.length - 1} className="rounded-full border-white/10 px-2">
                          ↓
                        </Button>
                        {pollOptions.length > 2 ? (
                          <Button type="button" variant="outline" size="sm" onClick={() => removePollOption(index)} className="rounded-full border-white/10 px-3">
                            ลบ
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addPollOption} disabled={pollOptions.length >= 6} className="rounded-full border-white/10">
                    เพิ่มตัวเลือก
                  </Button>
                </div>
              </div>

              <aside className="rounded-[24px] border border-white/10 bg-background/35 p-4">
                <Badge className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] text-primary hover:bg-primary/15">Preview</Badge>
                <p className="mt-3 text-sm font-semibold text-foreground">{pollQuestion.trim() || "คำถาม Poll จะแสดงตรงนี้"}</p>
                <div className="mt-3 space-y-2">
                  {pollOptions.map((option, index) => (
                    <div key={`poll-preview-${index}`} className="rounded-2xl border border-white/10 bg-background/70 px-3 py-2 text-sm text-muted-foreground">
                      {option.trim() || `ตัวเลือก ${index + 1}`}
                    </div>
                  ))}
                </div>
                {selectedMatchId && matchRoomFixture ? (
                  <p className="mt-3 text-xs text-muted-foreground">จะผูกกับ Match Room นี้อัตโนมัติ และ server จะตรวจ matchId อีกครั้งก่อนสร้างโพสต์</p>
                ) : null}
              </aside>
            </div>
            {pollBuilderError ? (
              <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {pollBuilderError}
              </div>
            ) : null}
          </div>

          <DialogFooter className="sticky bottom-0 border-t border-border/60 bg-[#101214] px-5 py-4 sm:px-6 sm:justify-between">
            <Button variant="outline" onClick={() => setShowPollBuilder(false)} className="rounded-full border-white/10">
              ยกเลิก
            </Button>
            <Button onClick={savePollBuilder} className="rounded-full px-6">
              บันทึก Poll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  function renderActiveComposerSection() {
    if (composerTool === "image") return renderComposerImageSection()
    if (composerTool === "video") return renderComposerVideoSection()
    if (composerTool === "poll") return renderComposerPollSection()
    return null
  }

  function renderTeamPlayerPicker(params: {
    teamIds: string[]
    playerIds: string[]
    setTeamIds: (items: string[]) => void
    setPlayerIds: (items: string[]) => void
    compact?: boolean
  }) {
    const teamLimit = params.compact ? 4 : 5
    const playerLimit = params.compact ? 8 : 20
    return (
      <div className="rounded-[24px] border border-white/10 bg-background/35 p-4">
        <div className="mb-3">
          <p className="text-sm font-semibold text-foreground">ทีม / นักเตะที่เกี่ยวข้อง</p>
          <p className="text-xs text-muted-foreground">ไม่บังคับ แต่ช่วยให้ Feed สำหรับคุณและทีมโปรดแนะนำโพสต์ได้แม่นขึ้น</p>
        </div>
        {preferencesError ? (
          <div className="rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            โหลดตัวเลือกทีมและนักเตะไม่สำเร็จ
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">ทีม</label>
              <span className="text-xs text-muted-foreground">{params.teamIds.length}/{teamLimit}</span>
            </div>
            <Input
              value={teamSearch}
              onChange={(event) => setTeamSearch(event.target.value)}
              placeholder="ค้นหาทีม..."
              className="h-9 rounded-full border-white/10 bg-background/70"
              aria-label="ค้นหาทีม"
            />
            <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
              {filteredTeams.map((team) => {
                const active = params.teamIds.includes(team.id)
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => toggleStringSelection(team.id, params.teamIds, params.setTeamIds, teamLimit)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm transition",
                      active ? "border-primary/35 bg-primary/15 text-primary" : "border-white/10 bg-background/35 text-muted-foreground hover:text-foreground",
                    )}
                    aria-pressed={active}
                  >
                    {team.logo ? <Image src={team.logo} alt="" width={24} height={24} className="h-6 w-6 rounded-full" unoptimized /> : <span className="h-6 w-6 rounded-full bg-primary/15" />}
                    <span className="min-w-0 flex-1 truncate">{team.name}</span>
                  </button>
                )
              })}
              {!filteredTeams.length ? <p className="rounded-2xl border border-dashed border-white/10 px-3 py-5 text-center text-xs text-muted-foreground">ยังไม่พบทีม</p> : null}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">นักเตะ</label>
              <span className="text-xs text-muted-foreground">{params.playerIds.length}/{playerLimit}</span>
            </div>
            <Input
              value={playerSearch}
              onChange={(event) => setPlayerSearch(event.target.value)}
              placeholder="ค้นหานักเตะ..."
              className="h-9 rounded-full border-white/10 bg-background/70"
              aria-label="ค้นหานักเตะ"
            />
            <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
              {filteredPlayers.map((player) => {
                const active = params.playerIds.includes(player.id)
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => toggleStringSelection(player.id, params.playerIds, params.setPlayerIds, playerLimit)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm transition",
                      active ? "border-primary/35 bg-primary/15 text-primary" : "border-white/10 bg-background/35 text-muted-foreground hover:text-foreground",
                    )}
                    aria-pressed={active}
                  >
                    {player.photo ? <Image src={player.photo} alt="" width={24} height={24} className="h-6 w-6 rounded-full object-cover" unoptimized /> : <span className="h-6 w-6 rounded-full bg-primary/15" />}
                    <span className="min-w-0 flex-1 truncate">{player.name}</span>
                    <span className="max-w-[88px] truncate text-[11px] text-muted-foreground">{player.team}</span>
                  </button>
                )
              })}
              {!filteredPlayers.length ? <p className="rounded-2xl border border-dashed border-white/10 px-3 py-5 text-center text-xs text-muted-foreground">ยังไม่พบนักเตะ</p> : null}
            </div>
          </div>
        </div>
      </div>
    )
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

  function getNotificationHref(item: CommunityNotificationItem) {
    if (item.post?.id) return `/community/${item.post.id}`
    if (item.story?.id) return "/community"
    if (item.type === "community_user_warned" || item.type === "community_user_restricted" || item.type === "community_user_suspended" || item.type === "community_user_banned" || item.type === "community_moderation_strike_alert") {
      return "/profile"
    }
    return "/community"
  }

  async function handleOpenNotificationsDialog() {
    setShowNotificationsDialog(true)
    await markNotificationsAsRead()
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
              <Link href="/community" className="inline-flex h-10 items-center gap-2 rounded-full bg-primary/15 px-4 text-sm font-medium text-primary">
                <Users className="h-4 w-4" />
                Feed
              </Link>
              <Link href="/community/matches" className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-muted-foreground transition hover:bg-primary/10 hover:text-primary">
                <Trophy className="h-4 w-4" />
                Match Rooms
              </Link>
              <Link href="/community/messages" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary">
                <MessageSquare className="h-4 w-4" />
              </Link>
              <Link href="/community/my-posts" className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-muted-foreground transition hover:bg-primary/10 hover:text-primary">
                <Clock className="h-4 w-4" />
                โพสต์ของฉัน
              </Link>
              <button
                type="button"
                onClick={() => void handleOpenNotificationsDialog()}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                aria-label="Open notifications"
              >
                <Bell className="h-4 w-4" />
                {notifications?.total ? (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
                ) : null}
              </button>
            </div>
          </div>

          <Dialog open={showNotificationsDialog} onOpenChange={setShowNotificationsDialog}>
            <DialogContent className="max-w-xl rounded-[28px] border-border/60 bg-[#101214] p-0 text-foreground">
              <DialogHeader className="border-b border-border/60 px-6 py-5">
                <DialogTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notifications
                </DialogTitle>
                <DialogDescription>อัปเดตล่าสุดจากเพื่อน การมีส่วนร่วม และสถานะ moderation ของคุณ</DialogDescription>
              </DialogHeader>
              <div className="max-h-[70vh] space-y-3 overflow-y-auto px-6 py-5">
                {incomingRequests.length ? (
                  <div className="rounded-2xl border border-white/10 bg-background/40 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">คำขอเป็นเพื่อนที่รอดำเนินการ</p>
                      <Badge className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15">
                        {incomingRequests.length}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {incomingRequests.slice(0, 3).map((request) => (
                        <div key={request.id} className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-white/10">
                            <AvatarImage src={request.user.avatar || "/placeholder-user.jpg"} />
                            <AvatarFallback>{request.user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{request.user.name}</p>
                            <p className="text-xs text-muted-foreground">{request.timeAgo}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => void handleFriendRequest(request.id, "accept")}
                            disabled={handlingRequestId === request.id}
                            className="rounded-full px-3"
                          >
                            รับ
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {activityNotifications.length ? (
                  activityNotifications.map((item) => (
                    <Link
                      key={item.id}
                      href={getNotificationHref(item)}
                      onClick={() => setShowNotificationsDialog(false)}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-background/35 p-4 transition hover:border-primary/25 hover:bg-background/55"
                    >
                      <Avatar className="h-11 w-11 border border-white/10">
                        <AvatarImage src={item.actor.avatar || "/placeholder-user.jpg"} />
                        <AvatarFallback>{item.actor.name.charAt(0) || "F"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">{item.actor.name || "FootballAI"}</span> {item.text}
                        </p>
                        {item.post?.title ? <p className="truncate text-xs text-muted-foreground">{item.post.title}</p> : null}
                        {item.commentPreview ? <p className="truncate text-xs text-primary/80">"{item.commentPreview}"</p> : null}
                        {item.story?.caption ? <p className="truncate text-xs text-primary/80">{item.story.caption}</p> : null}
                        {item.media?.originalName ? <p className="truncate text-xs text-primary/80">{item.media.originalName}</p> : null}
                        <p className="mt-1 text-[11px] text-muted-foreground">{item.timeAgo}</p>
                      </div>
                      {!item.isRead ? <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary" /> : null}
                    </Link>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-background/25 px-4 py-10 text-center">
                    <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-foreground">ยังไม่มีการแจ้งเตือนใหม่</p>
                    <p className="mt-1 text-xs text-muted-foreground">เมื่อมีคนกดไลก์ คอมเมนต์ รีโพสต์ หรือมีอัปเดต moderation จะขึ้นที่นี่</p>
                  </div>
                )}
              </div>
              <DialogFooter className="border-t border-border/60 px-6 py-5 sm:justify-between">
                <Button type="button" variant="outline" onClick={() => setShowNotificationsDialog(false)} className="rounded-full border-white/10">
                  ปิด
                </Button>
                <Button type="button" variant="ghost" onClick={() => void handleOpenActivity()} className="rounded-full text-primary hover:bg-primary/10 hover:text-primary">
                  ไปที่ Activity ด้านขวา
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {renderPollBuilderDialog()}

          <Dialog open={Boolean(editingPost)} onOpenChange={(open) => (!open ? closeEditPost() : undefined)}>
            <DialogContent className="max-h-[88vh] max-w-2xl overflow-hidden rounded-[28px] border-border/60 bg-[#101214] p-0 text-foreground">
              <DialogHeader className="border-b border-border/60 px-6 py-5">
                <DialogTitle className="flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-primary" />
                  แก้ไขโพสต์
                </DialogTitle>
                <DialogDescription>
                  ระบบจะตรวจข้อความและไฟล์แนบอีกครั้ง ถ้าก้ำกึ่งจะส่งเป็นฉบับแก้ไขรอตรวจโดยโพสต์เดิมยังอยู่
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-[62vh] space-y-5 overflow-y-auto px-6 py-5">
                {loadingEditPostId ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    กำลังโหลดข้อมูลล่าสุด...
                  </div>
                ) : null}

                {editConflict ? (
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
                    <p className="text-sm font-semibold text-destructive">โพสต์ถูกแก้จากอุปกรณ์หรือหน้าต่างอื่น</p>
                    <p className="mt-1 text-xs text-muted-foreground">โหลดข้อมูลล่าสุดก่อนบันทึก เพื่อป้องกันการเขียนทับข้อมูลใหม่</p>
                    {editingPost ? (
                      <Button size="sm" variant="outline" className="mt-3 rounded-full border-white/10" onClick={() => void openEditPost(editingPost)}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        โหลดข้อมูลล่าสุด
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium text-foreground">เนื้อหาโพสต์</label>
                    <span className="text-xs text-muted-foreground">{editContent.length}/5000</span>
                  </div>
                  <Textarea
                    value={editContent}
                    onChange={(event) => setEditContent(event.target.value)}
                    className="min-h-36 resize-none rounded-2xl border-white/10 bg-background/70 shadow-none"
                    placeholder="แก้ไขข้อความโพสต์..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">หมวดหมู่</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.slice(1).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setEditCategory(item.id)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm transition",
                          editCategory === item.id ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 text-muted-foreground hover:bg-background/70 hover:text-foreground",
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Tags</label>
                  <Input
                    value={editTags}
                    onChange={(event) => setEditTags(event.target.value)}
                    placeholder="เช่น arsenal, transfer, matchday"
                    className="rounded-2xl border-white/10 bg-background/70 shadow-none"
                  />
                  <p className="text-xs text-muted-foreground">คั่นแต่ละ tag ด้วยเครื่องหมาย comma</p>
                </div>

                {renderTeamPlayerPicker({
                  teamIds: editTeamIds,
                  playerIds: editPlayerIds,
                  setTeamIds: setEditTeamIds,
                  setPlayerIds: setEditPlayerIds,
                  compact: true,
                })}

                <div className="rounded-[24px] border border-white/10 bg-background/35 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">รูปภาพในฉบับแก้ไข</p>
                      <p className="text-xs text-muted-foreground">ถ้าไม่เปลี่ยน ระบบจะคงรูปเดิมไว้ ไม่ส่ง URL จาก client</p>
                    </div>
                    <Button type="button" variant="outline" className="rounded-full border-white/10" onClick={() => editImageInputRef.current?.click()} disabled={editUploadingImages}>
                      {editUploadingImages ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                      เพิ่มรูป
                    </Button>
                    <input ref={editImageInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleEditImageUpload} />
                  </div>

                  {editKeepImages.length ? (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {editKeepImages.map((image, index) => (
                        <div key={getStableMediaId(image) || image.url || index} className="group relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-background/70">
                          <Image src={getMediaUrl(image) || "/placeholder.jpg"} alt="Existing post image" fill className="object-cover" unoptimized />
                          <Badge className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white hover:bg-black/70">
                            เดิม • {image.status === "approved" ? "พร้อมใช้" : "รอตรวจ"}
                          </Badge>
                          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1 opacity-0 transition group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => setEditKeepImages((current) => moveMediaItem(current, index, -1))}
                              disabled={index === 0}
                              className="rounded-full bg-black/70 px-2 py-1 text-[11px] text-white disabled:opacity-40"
                            >
                              ←
                            </button>
                            <span className="rounded-full bg-black/70 px-2 py-1 text-[11px] text-white">{index + 1}</span>
                            <button
                              type="button"
                              onClick={() => setEditKeepImages((current) => moveMediaItem(current, index, 1))}
                              disabled={index === editKeepImages.length - 1}
                              className="rounded-full bg-black/70 px-2 py-1 text-[11px] text-white disabled:opacity-40"
                            >
                              →
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditKeepImages((current) => current.filter((item) => getStableMediaId(item) !== getStableMediaId(image)))}
                            className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100"
                            aria-label="ลบรูปนี้จากฉบับแก้ไข"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {editImages.length ? (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {editImages.map((image, index) => (
                        <div key={image.id} className="group relative aspect-square overflow-hidden rounded-2xl border border-primary/20 bg-background/70">
                          <Image src={getMediaUrl(image) || "/placeholder.jpg"} alt="New post image" fill className="object-cover" unoptimized />
                          <Badge className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white hover:bg-black/70">
                            {image.status === "approved" ? "พร้อมใช้" : "รอตรวจ"}
                          </Badge>
                          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1 opacity-0 transition group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => setEditImages((current) => moveMediaItem(current, index, -1))}
                              disabled={index === 0}
                              className="rounded-full bg-black/70 px-2 py-1 text-[11px] text-white disabled:opacity-40"
                            >
                              ←
                            </button>
                            <span className="rounded-full bg-black/70 px-2 py-1 text-[11px] text-white">{editKeepImages.length + index + 1}</span>
                            <button
                              type="button"
                              onClick={() => setEditImages((current) => moveMediaItem(current, index, 1))}
                              disabled={index === editImages.length - 1}
                              className="rounded-full bg-black/70 px-2 py-1 text-[11px] text-white disabled:opacity-40"
                            >
                              →
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditImages((current) => current.filter((item) => item.id !== image.id))}
                            className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100"
                            aria-label="ลบรูปใหม่"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[24px] border border-white/10 bg-background/35 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">วิดีโอ</p>
                      <p className="text-xs text-muted-foreground">รองรับ 1 วิดีโอ และจะตรวจผ่าน upload flow เดิม</p>
                    </div>
                    <Button type="button" variant="outline" className="rounded-full border-white/10" onClick={() => editVideoInputRef.current?.click()} disabled={editUploadingVideo}>
                      {editUploadingVideo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      เลือกวิดีโอ
                    </Button>
                    <input ref={editVideoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" className="hidden" onChange={handleEditVideoUpload} />
                  </div>

                  {editKeepVideos.length || editVideos.length ? (
                    <div className="mt-4 space-y-2">
                      {editKeepVideos.map((video, index) => (
                        <div key={getStableMediaId(video) || video.url || index} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-background/60 px-3 py-2 text-sm">
                          <span className="truncate text-muted-foreground">วิดีโอเดิม • {video.status === "approved" ? "พร้อมใช้" : "รอตรวจ"}</span>
                          <Button size="sm" variant="ghost" className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setEditKeepVideos((current) => current.filter((item) => getStableMediaId(item) !== getStableMediaId(video)))}>
                            ลบออก
                          </Button>
                        </div>
                      ))}
                      {editVideos.map((video) => (
                        <div key={video.id} className="flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 text-sm">
                          <span className="truncate text-primary">วิดีโอใหม่ • {video.status === "approved" ? "พร้อมใช้" : "กำลังตรวจสอบ"}</span>
                          <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setEditVideos([])}>
                            ลบออก
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <DialogFooter className="border-t border-border/60 px-6 py-5 sm:justify-between">
                <Button variant="outline" onClick={closeEditPost} disabled={savingEdit || editUploadingImages || editUploadingVideo} className="rounded-full border-white/10">
                  ยกเลิก
                </Button>
                <Button onClick={handleSavePostEdit} disabled={savingEdit || editUploadingImages || editUploadingVideo || !editContent.trim()} className="rounded-full px-6">
                  {savingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  บันทึกการแก้ไข
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => (!open ? setDeleteTarget(null) : undefined)}>
            <DialogContent className="max-w-md rounded-[28px] border-border/60 bg-[#101214] text-foreground">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  ลบโพสต์นี้ใช่ไหม
                </DialogTitle>
                <DialogDescription>
                  การลบจะนำโพสต์ออกจากฟีดตาม policy เดิมของระบบ และไม่สามารถกู้คืนจากหน้านี้ได้
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-2xl border border-white/10 bg-background/50 p-4 text-sm text-muted-foreground">
                {deleteTarget?.excerpt || deleteTarget?.content || deleteTarget?.title}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={Boolean(deletingPostId)} className="rounded-full border-white/10">
                  ยกเลิก
                </Button>
                <Button variant="destructive" onClick={handleDeletePost} disabled={Boolean(deletingPostId)} className="rounded-full">
                  {deletingPostId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  ยืนยันลบ
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showPreferenceDialog} onOpenChange={setShowPreferenceDialog}>
            <DialogContent className="max-h-[88vh] max-w-3xl overflow-hidden rounded-[28px] border-border/60 bg-[#101214] p-0 text-foreground">
              <DialogHeader className="border-b border-border/60 px-6 py-5">
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  ปรับแต่ง Community ของคุณ
                </DialogTitle>
                <DialogDescription>
                  ทีมโปรดและประเภทคอนเทนต์มีผลต่อ Feed เท่านั้น หากต้องการตั้งค่าแจ้งเตือนให้เปิดแยกในเมนู Notification
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[62vh] space-y-5 overflow-y-auto px-6 py-5">
                {renderTeamPlayerPicker({
                  teamIds: favoriteTeamIds,
                  playerIds: favoritePlayerIds,
                  setTeamIds: setFavoriteTeamIds,
                  setPlayerIds: setFavoritePlayerIds,
                })}
                <div className="rounded-[24px] border border-white/10 bg-background/35 p-4">
                  <p className="text-sm font-semibold text-foreground">ประเภทคอนเทนต์ที่สนใจ</p>
                  <p className="mt-1 text-xs text-muted-foreground">เลือกจากหมวดหมู่จริงของโพสต์ใน community</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(preferenceOptions?.contentTypes || categories.slice(1)).map((item) => {
                      const active = preferredContentTypes.includes(item.id)
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleStringSelection(item.id, preferredContentTypes, setPreferredContentTypes, 5)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-sm transition",
                            active ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 text-muted-foreground hover:bg-background/70 hover:text-foreground",
                          )}
                          aria-pressed={active}
                        >
                          {item.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
              <DialogFooter className="border-t border-border/60 px-6 py-5 sm:justify-between">
                <Button variant="outline" onClick={() => setShowPreferenceDialog(false)} disabled={preferenceSaving} className="rounded-full border-white/10">
                  ยกเลิก
                </Button>
                <Button onClick={handleSavePreferences} disabled={preferenceSaving} className="rounded-full px-6">
                  {preferenceSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  บันทึกความสนใจ
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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

                {storyImage?.url || storyImage?.previewUrl || storyImage?.ownerPreviewUrl ? (
                  <button
                    type="button"
                    onClick={() => setShowStoryEditor(true)}
                    className="group relative block h-80 w-full overflow-hidden rounded-[24px] border border-border/60 text-left transition hover:border-primary/40"
                  >
                    <Image src={storyImage.url || storyImage.previewUrl || storyImage.ownerPreviewUrl || ""} alt="Story preview" fill className="object-cover transition duration-300 group-hover:scale-[1.015]" unoptimized />
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
                <Button onClick={handleCreateStory} disabled={storySubmitting || !storyImage?.id} className="rounded-full px-6">
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
                    {storyImage?.url || storyImage?.previewUrl || storyImage?.ownerPreviewUrl ? (
                      <>
                        <Image src={storyImage.url || storyImage.previewUrl || storyImage.ownerPreviewUrl || ""} alt="Story editor preview" fill className="object-cover" unoptimized />
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
                <Button onClick={handleCreateStory} disabled={storySubmitting || !storyImage?.id} className="rounded-full px-6">
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
                    <Image src={getStoryImage(activeStory)} alt={activeStory.author.name} fill className="object-cover" unoptimized />
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
                  {user?.fanProfile?.badges?.length ? (
                    <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                      {user.fanProfile.badges.slice(0, 3).map((badge) =>
                        badge ? (
                          <Badge key={badge.id} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary hover:bg-primary/10">
                            {badge.label}
                          </Badge>
                        ) : null,
                      )}
                    </div>
                  ) : null}
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
                          <Image src={getStoryGroupImage(group)} alt={group.author.name} fill className="object-cover" unoptimized />
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
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreatePost(true)
                        openPollBuilder()
                      }}
                      className="inline-flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-background/70"
                    >
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

            <CommunityMatchCardsSection data={matchRoomData} isLoading={!matchRoomData} />

            {token && !hasPreferences && !preferenceDismissed ? (
              <Card className="rounded-[28px] border-primary/20 bg-primary/10 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-semibold text-foreground">เลือกทีมและนักเตะที่คุณชอบ</p>
                    <p className="mt-1 text-sm text-muted-foreground">เพื่อให้เราแนะนำโพสต์ที่ตรงกับความสนใจของคุณมากขึ้น</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => setShowPreferenceDialog(true)} className="rounded-full">
                      เลือกทีมโปรด
                    </Button>
                    <Button type="button" variant="outline" onClick={dismissPreferenceBanner} className="rounded-full border-white/10">
                      ไว้ภายหลัง
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

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
                      onClick={openPollBuilder}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
                        pollQuestion.trim() ? "border-primary/40 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:bg-background/70",
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
                  {selectedMatchId && matchRoomFixture ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                      <span>ผูกกับ Match Room: {matchRoomFixture.homeTeam} vs {matchRoomFixture.awayTeam}</span>
                      <Link href={`/community/matches/${selectedMatchId}`} className="rounded-full border border-primary/30 px-3 py-1 text-xs transition hover:bg-primary/15">
                        เปิดห้อง
                      </Link>
                    </div>
                  ) : null}
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

                  <div className="rounded-[22px] border border-white/10 bg-background/35">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedContext((value) => !value)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-foreground"
                      aria-expanded={showAdvancedContext}
                    >
                      <span>เพิ่มทีม นักเตะ หรือรายละเอียดที่เกี่ยวข้อง</span>
                      <span className="text-xs text-muted-foreground">{showAdvancedContext ? "ซ่อน" : "เพิ่มรายละเอียด"}</span>
                    </button>
                    {showAdvancedContext ? (
                      <div className="space-y-4 border-t border-white/10 p-4">
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Category</p>
                          <div className="flex flex-wrap gap-2">
                            {categories.slice(1).map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                className={cn(
                                  "rounded-full border px-3 py-1.5 text-sm transition",
                                  category === item.id ? "border-primary/40 bg-primary/15 text-primary" : "border-white/10 bg-background/35 text-muted-foreground hover:text-foreground",
                                )}
                                onClick={() => setCategory(item.id)}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {renderTeamPlayerPicker({
                          teamIds: selectedPostTeamIds,
                          playerIds: selectedPostPlayerIds,
                          setTeamIds: setSelectedPostTeamIds,
                          setPlayerIds: setSelectedPostPlayerIds,
                          compact: true,
                        })}
                      </div>
                    ) : null}
                  </div>

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

            <div className="rounded-[24px] border border-white/10 bg-card/80 p-3 shadow-[0_10px_28px_rgba(0,0,0,0.14)]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Feed</span>
                {feedTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => changeFeedTab(tab.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition",
                      feedTab === tab.id
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-white/10 bg-background/35 text-muted-foreground hover:bg-background/70 hover:text-foreground",
                    )}
                    aria-pressed={feedTab === tab.id}
                  >
                    {tab.label}
                  </button>
                ))}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-background/35 px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-background/70 hover:text-foreground"
                    >
                      หมวด: {categories.find((item) => item.id === selectedCategory)?.label || "ทั้งหมด"}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 rounded-2xl border-white/10 bg-[#121416] p-2 text-foreground shadow-2xl">
                    <DropdownMenuItem onSelect={() => setSelectedCategory("all")} className="rounded-xl">
                      ทั้งหมด
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    {categoryGroups.map((group) => (
                      <div key={group.title} className="py-1">
                        <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{group.title}</p>
                        {group.ids.map((categoryId) => {
                          const item = categories.find((categoryItem) => categoryItem.id === categoryId)
                          if (!item) return null
                          return (
                            <DropdownMenuItem key={item.id} onSelect={() => setSelectedCategory(item.id)} className="rounded-xl">
                              {item.label}
                            </DropdownMenuItem>
                          )
                        })}
                      </div>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {token ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowPreferenceDialog(true)} className="ml-auto rounded-full text-muted-foreground hover:text-foreground">
                    <Sparkles className="mr-2 h-4 w-4" />
                    ตั้งค่า
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="space-y-5">
              {isLoading ? (
                <Card className="rounded-[28px] border-white/10 bg-card/80 p-8 text-center text-sm text-muted-foreground">
                  <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
                  กำลังโหลด Feed...
                </Card>
              ) : !posts.length ? (
                <Card className="rounded-[28px] border-dashed border-white/10 bg-card/80 p-8 text-center">
                  <p className="font-semibold text-foreground">
                    {feedTab === "favorites"
                      ? "เลือกทีมโปรดเพื่อดูโพสต์จากทีมที่คุณสนใจ"
                      : feedTab === "trending"
                        ? "ยังไม่มีโพสต์ที่กำลังเป็นที่นิยมในตอนนี้"
                        : feedTab === "for-you"
                          ? "เรายังมีข้อมูลไม่พอสำหรับจัด Feed เฉพาะคุณ ตอนนี้จะแสดงโพสต์ล่าสุดให้ก่อน"
                          : "ยังไม่มีโพสต์ใน Feed นี้"}
                  </p>
                  <Button type="button" variant="outline" onClick={() => void mutate()} className="mt-4 rounded-full border-white/10">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                </Card>
              ) : posts.map((post) => {
                const isSaved = savedPostIds.has(post.id)
                const postImages = getPostImages(post)
                const cover = postImages[0] || ""
                const video = post.videos?.[0] || ""
                const referenceId = getRepostReference(post)
                const isReposted = repostedReferenceIds.has(referenceId)
                const isOwner = Boolean(user?.id && post.author.id === user.id)
                const canUseAdminActions = user?.role === "admin"
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
                                {(post.author.fanProfile?.badges || []).slice(0, 2).map((badge) =>
                                  badge ? (
                                    <Badge key={badge.id} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary hover:bg-primary/10">
                                      {badge.label}
                                    </Badge>
                                  ) : null,
                                )}
                                <span className="text-xs text-muted-foreground">{post.timeAgo}</span>
                                <Badge variant="outline" className="rounded-full border-white/10 px-2 py-0.5 text-[10px] text-muted-foreground">{post.categoryLabel}</Badge>
                              </div>
                              {post.sharedItem?.type === "post" ? (
                                <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-primary">reposted by {post.author.name}</p>
                              ) : null}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-background/70 hover:text-foreground"
                                  aria-label="เมนูโพสต์"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-5 w-5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 rounded-2xl border-white/10 bg-[#121416] p-2 text-foreground shadow-2xl">
                                {isOwner ? (
                                  <>
                                    <DropdownMenuItem onSelect={() => void openEditPost(post)} className="rounded-xl">
                                      <Edit3 className="h-4 w-4" />
                                      แก้ไขโพสต์
                                    </DropdownMenuItem>
                                    {post.hasPendingRevision ? (
                                      <DropdownMenuItem onSelect={() => toast({ title: "การแก้ไขกำลังรอตรวจสอบ", description: "ผู้ดูแลจะอนุมัติหรือปฏิเสธจาก Moderation Queue" })} className="rounded-xl">
                                        <Clock className="h-4 w-4" />
                                        ดูสถานะการตรวจสอบ
                                      </DropdownMenuItem>
                                    ) : null}
                                    <DropdownMenuSeparator className="bg-white/10" />
                                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(post)} className="rounded-xl">
                                      <Trash2 className="h-4 w-4" />
                                      ลบโพสต์
                                    </DropdownMenuItem>
                                  </>
                                ) : (
                                  <>
                                    <DropdownMenuItem onSelect={() => void savePost(post)} className="rounded-xl">
                                      <Bookmark className="h-4 w-4" />
                                      บันทึกโพสต์
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => void shareLink(post)} className="rounded-xl">
                                      <Copy className="h-4 w-4" />
                                      คัดลอกลิงก์
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => void reportPost(post.id)} className="rounded-xl">
                                      <Flag className="h-4 w-4" />
                                      รายงานโพสต์
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {canUseAdminActions ? (
                                  <>
                                    <DropdownMenuSeparator className="bg-white/10" />
                                    <DropdownMenuItem asChild className="rounded-xl">
                                      <Link href={`/admin/community/moderation?type=post&q=${encodeURIComponent(post.title || post.id)}`}>
                                        <ExternalLink className="h-4 w-4" />
                                        เปิดใน Moderation
                                      </Link>
                                    </DropdownMenuItem>
                                  </>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <Link href={`/community/${post.id}`} className="mt-3 block">
                            <h3 className="text-lg font-semibold leading-snug text-foreground transition-colors hover:text-primary sm:text-[19px]">{post.title}</h3>
                          </Link>
                          {(post.isEdited || post.hasPendingRevision) ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {post.isEdited ? (
                                <Badge variant="outline" className="rounded-full border-white/10 bg-background/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                                  แก้ไขแล้ว
                                </Badge>
                              ) : null}
                              {isOwner && post.hasPendingRevision ? (
                                <Badge className="rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/15">
                                  การแก้ไขกำลังรอตรวจสอบ
                                </Badge>
                              ) : null}
                            </div>
                          ) : null}
                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{post.excerpt}</p>

                          {post.matchId && post.matchContext ? (
                            <Link
                              href={`/community/matches/${post.matchId}`}
                              className="mt-4 flex items-center justify-between gap-3 rounded-[22px] border border-primary/20 bg-primary/8 p-3 transition hover:border-primary/40 hover:bg-primary/12"
                            >
                              <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Match Room</p>
                                <p className="mt-1 truncate text-sm font-semibold text-foreground">
                                  {post.matchContext.homeTeam} vs {post.matchContext.awayTeam}
                                </p>
                              </div>
                              <span className="shrink-0 rounded-full border border-white/10 bg-background/50 px-3 py-1 text-xs text-muted-foreground">
                                เปิดห้อง
                              </span>
                            </Link>
                          ) : null}

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
                                  {postImages.length || 1} รูป
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
                                  {post.matchId ? "Poll จาก Community" : "Poll"}
                                </Badge>
                              </div>
                              <div className="mt-3 space-y-2">
                                {post.poll.options.map((option) => {
                                  const percent = post.poll?.totalVotes ? Math.round((option.votes / post.poll.totalVotes) * 100) : 0
                                  const isViewerVote = post.poll?.viewerVote === option.id
                                  return (
                                    <button
                                      key={option.id}
                                      type="button"
                                      onClick={() => void votePoll(post, option.id)}
                                      disabled={pollVotingPostId === post.id || Boolean(post.poll?.viewerVote)}
                                      className={cn(
                                        "w-full overflow-hidden rounded-2xl border bg-background/70 text-left transition hover:border-primary/40 disabled:cursor-default",
                                        isViewerVote ? "border-primary/50 bg-primary/10" : "border-white/10",
                                      )}
                                    >
                                      <div className="flex items-center justify-between px-3 py-2 text-sm text-foreground">
                                        <span>{option.text}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {pollVotingPostId === post.id ? "..." : `${percent}%`}
                                        </span>
                                      </div>
                                      <div className="h-1.5 bg-white/5">
                                        <div className="h-full bg-primary/70 transition-all" style={{ width: `${percent}%` }} />
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                              <p className="mt-3 text-xs text-muted-foreground">
                                {post.poll.totalVotes} votes • {post.poll.viewerVote ? "คุณโหวตแล้ว" : "แตะตัวเลือกเพื่อโหวต"} • {post.visibilityLabel || "Public"}
                              </p>
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
