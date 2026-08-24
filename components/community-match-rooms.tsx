"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode, type RefObject } from "react"
import { th } from "date-fns/locale"
import useSWR from "swr"
import {
  Bell,
  BarChart3,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Copy,
  Edit3,
  Flag,
  Hash,
  Home,
  ImageIcon,
  Info,
  Loader2,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Pin,
  Plus,
  RefreshCw,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useAuthSession } from "@/hooks/use-auth-session"
import { fetchJson } from "@/lib/api-client"
import { MAIN_ROOM_COPY, getMainRoomDateDividerLabel, getRoomMessageBubbleLayout, getSystemMessageLayout, mergeMainRoomMessages, shouldGroupMainRoomMessage, shouldShowMainRoomDateDivider } from "@/lib/match-main-room-ui"
import { getMatchDemoOverrideNotice, type MatchDemoOverrideState } from "@/lib/match-demo-override"
import {
  MATCH_HUB_EMPTY_STATES,
  buildMatchHubCommunityPulse,
  getFavoriteTeamRecommendedRoom,
  getMatchHubFanMomentumLabel,
  getMatchHubMilestones,
  getMatchHubDisplayState,
  getMatchHubErrorView,
  getMatchHubRoomBadge,
  getMatchHubScoreLabel,
  getMatchHubStatusLabel,
  normalizeMatchHubRoomQuery,
  type MatchHubConversationRoomId,
} from "@/lib/match-hub-ui"
import {
  MATCH_TIMELINE_COPY,
  getMatchTimelinePhase,
  getTimelineActivityLabels,
  getTimelineHighlightRooms,
  getTimelineNavigationPriority,
  getTimelineRecommendedRoom,
  normalizeTimelineMatchEvents,
  type MatchTimelinePhase,
  type MatchTimelineRoomId,
  type TimelineMatchEvent,
} from "@/lib/match-timeline-ui"
import {
  TACTICAL_QUICK_TOPICS,
  TACTICAL_ROOM_COPY,
  getTacticalFixtureContext,
  getTacticalPhaseFocus,
  getTacticalQuickTopicLabel,
  type TacticalQuickTopic,
} from "@/lib/match-tactical-room-ui"
import {
  getFavoriteTeamPreviewLounge,
  getFavoriteTeamReactionLounge,
  getTeamPreviewLounges,
  getTeamReactionLounges,
  type TeamPreviewLounge,
  type TeamPreviewLoungeSide,
  type TeamReactionLounge,
  type TeamReactionLoungeSide,
} from "@/lib/match-preview-lounges"
import { COMMUNITY_THREAD_CATEGORY_LABELS } from "@/lib/server/community-threads"
import { cn } from "@/lib/utils"

export type CommunityMatchRoomFixture = {
  id: string
  weekNumber?: number | null
  isFeatured?: boolean
  leagueId?: string
  leagueName?: string
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
  events?: TimelineMatchEvent[]
  lineups?: unknown[]
}

export type CommunityMatchRoomPost = {
  id: string
  title: string
  excerpt?: string
  content?: string
  categoryLabel?: string
  threadCategoryLabel?: string
  threadCategory?: string
  timeAgo?: string
  latestActivityTimeAgo?: string
  comments?: number
  likes?: number
  moderationStatus?: string
  isPinned?: boolean
  isOfficialThread?: boolean
  canModerate?: boolean
  media?: Array<{ id: string; url?: string | null; ownerPreviewUrl?: string | null; mediaType?: string }>
  poll?: { question: string; totalVotes: number; options: Array<{ id: string; text: string; votes: number }> } | null
  author?: { id?: string; name: string; avatar?: string }
  isOwner?: boolean
}

type MatchHubNotificationItem = {
  id: string
  type: string
  isRead?: boolean
  timeAgo?: string
  text?: string
  actor?: { name?: string; avatar?: string }
  post?: { id?: string; title?: string }
  commentPreview?: string
  story?: { id?: string; caption?: string } | null
  media?: { originalName?: string } | null
}

type MatchHubNotificationsResponse = {
  total?: number
  unreadActivity?: number
  unreadMessages?: number
  pendingFriendRequests?: number
  activity?: MatchHubNotificationItem[]
}

export type CommunityMatchRoomResponse = {
  fixtures: CommunityMatchRoomFixture[]
  fixture: CommunityMatchRoomFixture | null
  demoOverride?: MatchDemoOverrideState | null
  channels?: MatchRoomChannel[]
  roomStats?: Record<
    string,
    {
      discussions: number
      polls: number
      followers?: number
      latestActivityAt?: string | null
      latestPollAt?: string | null
      newRoomMessageCount?: number
      latestRoomActivityAt?: string | null
      latestRoomType?: string
      summaryStatus?: string
      summaryVersion?: string
      isFollowing?: boolean
      isRecent?: boolean
      isFavoriteTeam?: boolean
      favoriteTeamName?: string
      previewLounges?: {
        home?: { messages?: number; latestActivityAt?: string | null }
        away?: { messages?: number; latestActivityAt?: string | null }
      }
      postMatchLounges?: {
        home?: { messages?: number; messageCount?: number; latestActivityAt?: string | null; status?: string; recommended?: boolean; archived?: boolean }
        away?: { messages?: number; messageCount?: number; latestActivityAt?: string | null; status?: string; recommended?: boolean; archived?: boolean }
      }
      lastVisitedAt?: string | null
      activity?: { hasNewActivity?: boolean; hasNewPoll?: boolean; hasSummaryReady?: boolean; statusChanged?: boolean; temporaryRoom?: string }
    }
  >
  matchRoomState?: { isFollowing: boolean; followedMatchIds: string[]; recentMatchIds: string[] }
  summary: {
    source: string
    status?: string
    text: string
    overallSummary?: {
      headline: string
      shortSummary: string
      matchStory: string
      keyMoments: string[]
      turningPoint: string
      statisticsHighlights: string[]
      topPlayers: string[]
      tacticalSummary: string
      limitations: string[]
      disclaimer: string
    }
    headline?: string
    shortSummary?: string
    matchStory?: string
    keyMoments?: string[]
    turningPoint?: string
    statisticsHighlights?: string[]
    topPlayers?: string[]
    tacticalSummary?: string
    limitations?: string[]
    disclaimer?: string
    generatedAt?: string | null
    providerStatus?: string
    failureCategory?: string
    sourceDataVersion?: string
    summaryVersion?: string
    model?: string
    isStale?: boolean
    homeTeamSummary?: MatchRoomTeamSummary
    awayTeamSummary?: MatchRoomTeamSummary
    fanReaction?: MatchRoomFanReaction
  }
  fanReaction?: MatchRoomFanReaction
  summaryPermissions?: { canRegenerate: boolean }
  pollTemplate: { question: string; options: Array<{ id: string; text: string }> }
  prompts: string[]
  posts: CommunityMatchRoomPost[]
  threads?: CommunityMatchRoomPost[]
}

type MatchRoomType = "main" | "tactics" | "preview" | "post_match"
type ConversationRoomId = MatchHubConversationRoomId

type MatchRoomChannel = {
  roomType: MatchRoomType
  state: "unavailable" | "upcoming" | "open" | "closing" | "closed" | "archived"
  opensAt?: string | null
  closesAt?: string | null
  archiveAt?: string | null
  expiresAt?: string | null
  remainingSeconds?: number | null
  canRead: boolean
  canPost: boolean
  isTemporary: boolean
  isArchived: boolean
}

type MatchRoomMessage = {
  id: string
  matchId: string
  roomType: MatchRoomType
  previewTeam?: TeamPreviewLoungeSide | ""
  reactionTeam?: TeamReactionLoungeSide | ""
  tacticalTopic?: TacticalQuickTopic | ""
  content: string
  replyToId?: string
  moderationStatus?: string
  status?: string
  createdAt?: string
  timeAgo?: string
  images?: string[]
  videos?: string[]
  isEdited?: boolean
  isOwner?: boolean
  canModerate?: boolean
  author?: { id?: string; name?: string; avatar?: string; role?: string }
}

type MatchRoomMessagesResponse = {
  items: MatchRoomMessage[]
  room: MatchRoomChannel
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

type MatchRoomStats = NonNullable<CommunityMatchRoomResponse["roomStats"]>[string]
type ApiClientError = Error & { status?: number; code?: string; details?: { code?: string; requestId?: string } }

type MatchRoomSummaryHistoryResponse = {
  current: {
    matchId: string
    status: string
    mode: string
    summaryVersion: number
    sourceDataVersion: string
    previousSourceDataVersion: string
    generatedAt: string | null
    generatedBy: { name: string; avatar?: string } | null
    providerStatus: string
    failureCategory: string
    staleAt: string | null
  } | null
  history: Array<{
    id: string
    action: string
    requestedAt: string
    requestedBy: { name: string; avatar?: string } | null
    previousSummaryVersion: number
    newSummaryVersion: number
    previousSourceDataVersion: string
    newSourceDataVersion: string
    result: string
    mode: string
    providerStatus: string
    failureCategory: string
    durationMs: number
    reason: string
  }>
}

type MatchRoomFanReaction = {
  hasEnoughData: boolean
  participation: number
  topPollOption: { label: string; votes: number; percent: number; question: string } | null
  topTopics: Array<{ label: string; count: number }>
  mentionedPlayers: Array<{ label: string; count: number }>
  overallReaction: "พอใจ" | "กลาง ๆ" | "ไม่พอใจ" | null
  limitation: string
}

type MatchRoomTeamSummary = {
  teamName: string
  side: "home" | "away"
  headline: string
  shortSummary: string
  keyPositive: string
  keyProblem: string
  turningPoint: string
  notablePlayers: string[]
  tacticalNote: string
  limitations: string[]
}

export type CommunityMatchRoomThreadResponse = {
  items: CommunityMatchRoomPost[]
  sort: string
  category: string
  officialOnly: boolean
}

export type CommunityMatchThreadDetailResponse = {
  fixture: CommunityMatchRoomFixture
  item: CommunityMatchRoomPost & {
    content?: string
    createdAt?: string
    updatedAt?: string
    isEdited?: boolean
    isPinned?: boolean
    isOfficialThread?: boolean
    threadCategory?: string
    threadCategoryLabel?: string
    latestActivityAt?: string
    media?: Array<{ id: string; url?: string | null; ownerPreviewUrl?: string | null; mediaType?: string }>
    author?: { id?: string; name?: string; avatar?: string; role?: string }
  }
  comments: Array<{
    id: string
    parentCommentId?: string
    content: string
    moderationStatus: string
    timeAgo: string
    isEdited?: boolean
    isDeleted?: boolean
    isHidden?: boolean
    isOwner?: boolean
    canModerate?: boolean
    permalink?: string
    user: { id: string; name: string; avatar?: string }
    replies: Array<{
      id: string
      parentCommentId?: string
      content: string
      moderationStatus: string
      timeAgo: string
      isEdited?: boolean
      isDeleted?: boolean
      isHidden?: boolean
      isOwner?: boolean
      canModerate?: boolean
      permalink?: string
      user: { id: string; name: string; avatar?: string }
    }>
  }>
  relatedThreads: CommunityMatchRoomPost[]
  permissions: { canPin: boolean; canComment: boolean }
  commentsPagination?: { limit: number; total: number; hasMore: boolean }
}

const roomTabs = [
  { id: "overview", label: "ภาพรวม" },
  { id: "discussion", label: "ห้องคุย" },
  { id: "threads", label: "หัวข้อ" },
  { id: "polls", label: "โหวต" },
  { id: "summary", label: "AI สรุป" },
] as const

type RoomTab = (typeof roomTabs)[number]["id"]

const conversationRooms: Array<{ id: MatchRoomType; query: string; label: string; description: string; group: "rooms" | "temporary" }> = [
  { id: "main", query: "main", label: "Main Room", description: "General match community discussion", group: "rooms" },
  { id: "tactics", query: "tactics", label: "Tactical Room", description: "Shape, pressing, substitutions and analysis", group: "rooms" },
  { id: "preview", query: "preview", label: "Preview", description: "Team supporter lounges before kickoff", group: "temporary" },
  { id: "post_match", query: "post-match", label: "Reaction Room", description: "Post-match reactions after full-time", group: "temporary" },
]

function normalizeRoomQuery(value: string | null): ConversationRoomId {
  return normalizeMatchHubRoomQuery(value).roomId
}

function roomToQuery(value: ConversationRoomId) {
  if (value === "preview_home") return "preview-home"
  if (value === "preview_away") return "preview-away"
  if (value === "post_match_home") return "post-match-home"
  if (value === "post_match_away") return "post-match-away"
  return value === "post_match" ? "post-match" : value
}

function conversationRoomToRoomType(value: ConversationRoomId): MatchRoomType {
  if (value === "preview_home" || value === "preview_away") return "preview"
  if (value === "post_match_home" || value === "post_match_away") return "post_match"
  return value
}

function getPreviewSideFromConversationRoom(value: ConversationRoomId): TeamPreviewLoungeSide | null {
  if (value === "preview_home") return "home"
  if (value === "preview_away") return "away"
  return null
}

function getReactionSideFromConversationRoom(value: ConversationRoomId): TeamReactionLoungeSide | null {
  if (value === "post_match_home") return "home"
  if (value === "post_match_away") return "away"
  return null
}

function getRoomLabel(roomType: ConversationRoomId, fixture?: CommunityMatchRoomFixture | null) {
  if (fixture && (roomType === "preview_home" || roomType === "preview_away")) {
    const side = getPreviewSideFromConversationRoom(roomType)
    return getTeamPreviewLounges(fixture).find((lounge) => lounge.side === side)?.label || "Fans Preview"
  }
  if (fixture && (roomType === "post_match_home" || roomType === "post_match_away")) {
    const side = getReactionSideFromConversationRoom(roomType)
    return getTeamReactionLounges(fixture).find((lounge) => lounge.side === side)?.label || "Team Reactions"
  }
  return conversationRooms.find((room) => room.id === roomType)?.label || "ห้องหลัก"
}

function getTemporaryRoomDisplayName(roomType: MatchRoomType) {
  if (roomType === "preview") return "ห้องพรีวิวก่อนแข่ง"
  if (roomType === "post_match") return "ห้องคุยหลังเกม"
  return getRoomLabel(roomType)
}

function getRoomStateLabel(state?: MatchRoomChannel["state"]) {
  if (state === "upcoming") return "ยังไม่เปิด"
  if (state === "open") return "เปิดอยู่"
  if (state === "closing") return "ใกล้ปิด"
  if (state === "closed") return "ปิดรับข้อความ"
  if (state === "archived") return "เก็บถาวร"
  return "ไม่พร้อมใช้งาน"
}

function getHubMatchStatusLabel(fixture: CommunityMatchRoomFixture) {
  return getMatchHubStatusLabel({ status: fixture.status, isFinished: fixture.isFinished })
}

function getRoomHubBadge(channel?: MatchRoomChannel) {
  return getMatchHubRoomBadge(channel)
}

function getRoomAvailabilityText(channel?: MatchRoomChannel, nowMs: number = Date.now()) {
  if (!channel) return "Opening soon"
  const target = getRoomTargetTime(channel)
  const remainingLabel = target ? formatDuration(target - nowMs) : ""
  if (channel.state === "upcoming") {
    if (remainingLabel) return `เปิดใน ${remainingLabel}`
    if (channel.remainingSeconds !== null && typeof channel.remainingSeconds === "number") return `เปิดใน ${formatDuration(channel.remainingSeconds * 1000)}`
  }
  if (channel.state === "unavailable" && channel.opensAt) {
    const opensAt = parseRoomTime(channel.opensAt)
    if (opensAt) return `เปิดใน ${formatDuration(opensAt - nowMs)}`
  }
  if ((channel.state === "open" || channel.state === "closing") && remainingLabel && channel.isTemporary) {
    return `ปิดใน ${remainingLabel}`
  }
  return getRoomStateLabel(channel.state)
}

function getRecommendedRoom(fixture: CommunityMatchRoomFixture, stats?: MatchRoomStats, channels: MatchRoomChannel[] = [], effectivePhase?: MatchTimelinePhase) {
  const preview = channels.find((channel) => channel.roomType === "preview")
  const postMatch = channels.find((channel) => channel.roomType === "post_match")
  const timelinePhase = effectivePhase || getMatchTimelinePhase(fixture)
  const timelineRoom = getTimelineRecommendedRoom(timelinePhase)
  const favoritePreviewLounge = getFavoriteTeamPreviewLounge({
    favoriteTeamName: stats?.favoriteTeamName,
    isFavoriteTeam: stats?.isFavoriteTeam,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
  })
  const favoriteReactionLounge = getFavoriteTeamReactionLounge({
    favoriteTeamName: stats?.favoriteTeamName,
    isFavoriteTeam: stats?.isFavoriteTeam,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
  })
  const favoriteRoom = getFavoriteTeamRecommendedRoom({
    isFavoriteTeam: stats?.isFavoriteTeam,
    isFinished: fixture.isFinished,
    previewCanRead: preview?.canRead,
    previewState: preview?.state,
    postMatchCanRead: postMatch?.canRead,
  })
  const recommendedRoom = timelineRoom === "preview" || timelineRoom === "post_match" ? timelineRoom : favoriteRoom || timelineRoom
  if (!recommendedRoom) return null
  if (recommendedRoom === "post_match" && favoriteReactionLounge) {
    return {
      roomType: favoriteReactionLounge.id,
      title: `Recommended Room: ${favoriteReactionLounge.label}`,
    }
  }
  if (recommendedRoom === "preview" && favoritePreviewLounge) {
    return {
      roomType: favoritePreviewLounge.id,
      title: `Recommended Room: ${favoritePreviewLounge.label} Preview`,
    }
  }
  return {
    roomType: recommendedRoom,
    title:
      timelinePhase === "live"
        ? "Recommended Room: Main Room"
        : timelinePhase === "full_time"
          ? "Recommended Room: Reactions"
          : "Recommended Room: Fans Preview",
  }
}

function getTimelineRoomLabel(phase: MatchTimelinePhase) {
  if (phase === "live") return MATCH_TIMELINE_COPY.live
  if (phase === "full_time") return MATCH_TIMELINE_COPY.fullTime
  return MATCH_TIMELINE_COPY.preMatch
}

function getInitials(name?: string) {
  return (name || "U").trim().slice(0, 2).toUpperCase()
}

function matchRoomFetcher<T>(path: string) {
  return fetchJson<T>(path, { cache: "no-store" })
}

function matchHubNotificationsFetcher([path, token]: [string, string]) {
  return fetchJson<MatchHubNotificationsResponse>(path, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  })
}

function getMatchHubNotificationHref(item: MatchHubNotificationItem) {
  if (item.post?.id) return `/community/${item.post.id}`
  if (item.type === "community_user_warned" || item.type === "community_user_restricted" || item.type === "community_user_suspended" || item.type === "community_user_banned" || item.type === "community_moderation_strike_alert") {
    return "/profile"
  }
  return "/community"
}

function getApiErrorCode(error: unknown) {
  const apiError = error as ApiClientError | null
  return apiError?.code || apiError?.details?.code || ""
}

function getApiRequestId(error: unknown) {
  const apiError = error as ApiClientError | null
  return apiError?.details?.requestId || ""
}

function getMatchTitle(fixture: CommunityMatchRoomFixture) {
  return `${fixture.homeTeam} vs ${fixture.awayTeam}`
}

function getScoreLabel(fixture: CommunityMatchRoomFixture) {
  return getMatchHubScoreLabel({
    status: fixture.status,
    isFinished: fixture.isFinished,
    homeScore: fixture.homeScore,
    awayScore: fixture.awayScore,
  })
}

function parseRoomTime(value?: string | null) {
  const time = value ? new Date(value).getTime() : Number.NaN
  return Number.isFinite(time) ? time : null
}

function getRoomTargetTime(room: MatchRoomChannel) {
  if (room.state === "upcoming") return parseRoomTime(room.opensAt)
  if (room.state === "open" || room.state === "closing") return parseRoomTime(room.closesAt)
  return null
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours} ชม. ${minutes} นาที`
  if (minutes > 0) return `${minutes} นาที ${seconds.toString().padStart(2, "0")} วิ`
  return `${seconds} วิ`
}

function getKickoffCountdownLabel(fixture: CommunityMatchRoomFixture) {
  const kickoff = parseRoomTime(fixture.kickoff)
  if (!kickoff) return ""
  const remaining = kickoff - Date.now()
  if (remaining <= 0) return ""
  return `Kickoff in ${formatDuration(remaining)}`
}

function getTemporaryRoomNotice(room: MatchRoomChannel, nowMs: number) {
  if (!room.isTemporary) return null
  const target = getRoomTargetTime(room)
  const remainingMs = target ? Math.max(0, target - nowMs) : null
  const remainingLabel = remainingMs === null ? "" : formatDuration(remainingMs)
  const urgent = remainingMs !== null && remainingMs <= 60_000
  const warning = remainingMs !== null && remainingMs <= 10 * 60_000

  if (room.state === "upcoming") {
    return {
      tone: "muted" as const,
      title: room.roomType === "preview" && remainingLabel ? `เปิดใน ${remainingLabel}` : room.roomType === "preview" ? "เปิดก่อนแข่ง 60 นาที" : "ยังไม่เปิดห้องหลังเกม",
      detail: room.roomType === "preview" ? "ห้องพรีวิวเปิดก่อนแข่ง และปิดเมื่อเริ่มการแข่งขัน" : "ห้องหลังเกมเปิดเมื่อสถานะเป็นจบการแข่งขัน",
    }
  }

  if (room.state === "open" || room.state === "closing") {
    const title =
      room.roomType === "preview"
        ? remainingLabel
          ? `ปิดใน ${remainingLabel}`
          : "ปิดเมื่อการแข่งขันเริ่ม"
        : remainingLabel
          ? `เหลือเวลา ${remainingLabel}`
          : "ห้องหลังเกมเปิดอยู่"
    return {
      tone: urgent ? ("danger" as const) : warning ? ("warning" as const) : ("active" as const),
      title,
      detail: urgent ? "เหลือไม่ถึง 1 นาที ระบบจะรีเฟรชสถานะจาก server เมื่อหมดเวลา" : warning ? "เหลือไม่ถึง 10 นาที ก่อนปิดห้องนี้" : getTemporaryRoomDisplayName(room.roomType),
    }
  }

  if (room.state === "archived") {
    return {
      tone: "muted" as const,
      title: room.roomType === "post_match" ? "ห้องหลังเกมปิดแล้ว" : "ห้องพรีวิวปิดแล้ว",
      detail:
        room.roomType === "post_match"
          ? "คุณสามารถพูดคุยต่อในห้องหลักหรือห้องแท็กติก"
          : "การแข่งขันเริ่มแล้ว ไปคุยต่อในห้องหลักได้เลย",
    }
  }

  return null
}

function getNavigableRooms(channels: MatchRoomChannel[]) {
  const available = new Set(channels.map((channel) => channel.roomType))
  return conversationRooms.filter((room) => room.group === "rooms" || available.has(room.id))
}

function getStatusLabel(status: string, isFinished?: boolean) {
  const state = getMatchHubDisplayState({ status, isFinished })
  if (state === "finished") return "จบการแข่งขัน"
  if (state === "live") return status === "HT" ? "พักครึ่ง" : "ถ่ายทอดสด"
  if (state === "postponed") return "เลื่อนการแข่งขัน"
  if (state === "cancelled") return "ยกเลิก"
  if (state === "closed") return "ปิดการแข่งขัน"
  return "กำลังจะเริ่ม"
}

function getStatusTone(status: string, isFinished?: boolean) {
  const state = getMatchHubDisplayState({ status, isFinished })
  if (state === "finished") return "border-border bg-muted text-muted-foreground"
  if (state === "live") return "border-primary/40 bg-primary/15 text-primary"
  if (state === "postponed" || state === "cancelled" || state === "closed") return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200"
  return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-100"
}

function getSummaryStatusLabel(summary?: CommunityMatchRoomResponse["summary"]) {
  if (!summary) return "Template"
  if (summary.isStale || summary.status === "stale") return "Stale"
  if (summary.source === "ai" && summary.status === "generated") return "Generated"
  if (summary.status === "failed") return "Template fallback"
  return summary.source === "template" ? "Template" : "Fallback"
}

function selectReactionTeamSummary(summary: CommunityMatchRoomResponse["summary"] | undefined, side: TeamReactionLoungeSide | null) {
  if (!summary || !side) return null
  return side === "home" ? summary.homeTeamSummary || null : summary.awayTeamSummary || null
}

function getSummaryHistoryActionLabel(action: string) {
  const labels: Record<string, string> = {
    initial_generate: "สร้างครั้งแรก",
    regenerate: "Regenerate",
    auto_mark_stale: "ทำเครื่องหมาย stale",
    fallback_generated: "ใช้ template fallback",
    generation_failed: "Generate ล้มเหลว",
  }
  return labels[action] || action
}

function shortVersionHash(value?: string) {
  if (!value) return "-"
  return value.length > 12 ? `${value.slice(0, 12)}...` : value
}

function SummaryListSection({ title, items }: { title: string; items?: string[] }) {
  const visibleItems = Array.isArray(items) ? items.filter(Boolean) : []
  if (!visibleItems.length) return null
  return (
    <div className="rounded-[22px] border border-border bg-surface-2/80 p-4">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
        {visibleItems.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FanReactionCard({ fanReaction, onOpenPolls, onOpenThreads }: { fanReaction?: MatchRoomFanReaction; onOpenPolls: () => void; onOpenThreads: () => void }) {
  const reaction = fanReaction || null
  return (
    <Card className="rounded-[28px] border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(184,255,0,0.10),transparent_32%),var(--color-card)]">
      <CardContent className="space-y-4 p-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Fan Reactions</p>
          <h3 className="text-xl font-bold text-foreground">แฟนบอลมองเกมนี้อย่างไร</h3>
          <p className="mt-1 text-xs text-muted-foreground">สรุปจาก Poll และ Community content ที่ approved แล้วเท่านั้น</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface-2/80 p-4">
            <p className="text-xs text-muted-foreground">ผู้ร่วมโหวต</p>
            <p className="mt-1 text-2xl font-bold text-primary">{reaction?.participation || 0}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-2/80 p-4">
            <p className="text-xs text-muted-foreground">ตัวเลือกนำ</p>
            <p className="mt-1 line-clamp-2 text-sm font-semibold">{reaction?.topPollOption ? `${reaction.topPollOption.percent}% ${reaction.topPollOption.label}` : "ยังไม่มีผลโหวต"}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-2/80 p-4">
            <p className="text-xs text-muted-foreground">ภาพรวมความเห็น</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{reaction?.overallReaction || "ยังไม่สรุป"}</p>
          </div>
        </div>
        {reaction?.topTopics?.length ? (
          <div className="flex flex-wrap gap-2" aria-label="หัวข้อยอดนิยมจากคอมมูนิตี้">
            {reaction.topTopics.map((topic) => (
              <Badge key={topic.label} variant="outline" className="rounded-full border-primary/25 bg-primary/10 text-primary">
                {topic.label} · {topic.count}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{reaction?.limitation || "ยังไม่มีข้อมูล Community เพียงพอสำหรับสรุป reaction"}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onOpenPolls} className="rounded-full border-border">
            ดู Poll ทั้งหมด
          </Button>
          <Button type="button" variant="outline" onClick={onOpenThreads} className="rounded-full border-border">
            ดูหัวข้อสนทนา
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function formatKickoff(fixture: CommunityMatchRoomFixture) {
  if (fixture.dateThai) return fixture.dateThai
  if (!fixture.kickoff) return "ยังไม่ระบุเวลา"
  const date = new Date(fixture.kickoff)
  if (Number.isNaN(date.getTime())) return fixture.kickoff
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(date)
}

function TeamLogo({ src, name, size = "md" }: { src?: string; name: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "h-20 w-20" : size === "sm" ? "h-10 w-10" : "h-14 w-14"
  return (
    <div className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card", sizeClass)}>
      {src ? <Image src={src} alt={`${name} logo`} fill className="object-contain p-2" unoptimized /> : <span className="text-xs font-bold text-primary">{name.slice(0, 2).toUpperCase()}</span>}
    </div>
  )
}

function MatchRoomMiniCard({
  fixture,
  stats,
  compact = false,
  onToggleFollow,
  followingBusy,
}: {
  fixture: CommunityMatchRoomFixture
  stats?: {
    discussions: number
    polls: number
    followers?: number
    isFollowing?: boolean
    isRecent?: boolean
    isFavoriteTeam?: boolean
    activity?: { hasNewActivity?: boolean; hasNewPoll?: boolean; hasSummaryReady?: boolean; statusChanged?: boolean }
  }
  compact?: boolean
  onToggleFollow?: (fixture: CommunityMatchRoomFixture, nextFollow: boolean) => void
  followingBusy?: boolean
}) {
  return (
    <div
      className={cn(
        "group rounded-[24px] border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-accent-soft motion-reduce:transition-none",
        compact && "min-w-[260px]",
      )}
    >
      <Link href={`/community/matches/${fixture.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60" aria-label={`เปิด Match Room ${getMatchTitle(fixture)}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <TeamLogo src={fixture.homeLogo} name={fixture.homeTeam} size="sm" />
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                {fixture.weekNumber ? (
                  <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                    Week {fixture.weekNumber}
                  </Badge>
                ) : null}
                {fixture.isFeatured ? (
                  <Badge className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-200 hover:bg-amber-500/15">
                    Featured
                  </Badge>
                ) : null}
              </div>
              <p className="truncate text-sm font-semibold text-foreground">{fixture.homeTeam}</p>
              <p className="truncate text-sm font-semibold text-foreground">{fixture.awayTeam}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="rounded-2xl bg-muted px-3 py-1 text-xl font-black leading-none text-primary">{getScoreLabel(fixture)}</p>
            <Badge variant="outline" className={cn("mt-2 rounded-full px-2 py-0.5 text-[10px]", getStatusTone(fixture.status, fixture.isFinished))}>
              {getStatusLabel(fixture.status, fixture.isFinished)}
            </Badge>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="line-clamp-1">{formatKickoff(fixture)}</span>
          <span className="inline-flex items-center gap-1 text-primary">
            เข้าร่วม
            <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </span>
        </div>
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <div className="flex min-w-0 items-center gap-3">
          <span>{stats?.discussions || 0} discussions</span>
          <span>•</span>
          <span>{stats?.polls || 0} polls</span>
          <span>•</span>
          <span>{stats?.followers || 0} followers</span>
        </div>
        {onToggleFollow ? (
          <Button
            type="button"
            variant={stats?.isFollowing ? "default" : "outline"}
            disabled={followingBusy}
            onClick={() => onToggleFollow(fixture, !stats?.isFollowing)}
            className="h-8 rounded-full px-3 text-xs"
            aria-label={stats?.isFollowing ? `เลิกติดตาม ${getMatchTitle(fixture)}` : `ติดตาม ${getMatchTitle(fixture)}`}
          >
            {stats?.isFollowing ? "กำลังติดตาม" : "ติดตาม"}
          </Button>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {stats?.activity?.hasNewActivity ? <Badge className="rounded-full bg-primary/15 text-primary hover:bg-primary/15">ใหม่</Badge> : null}
        {stats?.activity?.hasNewPoll ? <Badge variant="outline" className="rounded-full border-primary/25 text-primary">Poll ใหม่</Badge> : null}
        {stats?.activity?.hasSummaryReady ? <Badge variant="outline" className="rounded-full border-border">AI Summary</Badge> : null}
      </div>
    </div>
  )
}

function filterFixtures(fixtures: CommunityMatchRoomFixture[], query: string, status: string) {
  const normalized = query.trim().toLowerCase()
  return fixtures.filter((fixture) => {
    const matchesQuery = !normalized || `${fixture.homeTeam} ${fixture.awayTeam} ${fixture.venue}`.toLowerCase().includes(normalized)
    const label = getStatusLabel(fixture.status, fixture.isFinished)
    const matchesStatus = status === "all" || label === status
    return matchesQuery && matchesStatus
  })
}

function isPremierLeagueFixture(fixture: CommunityMatchRoomFixture) {
  const leagueId = String(fixture.leagueId || "").trim()
  const leagueName = String(fixture.leagueName || "").trim().toLowerCase()
  return leagueId === "39" || leagueName === "premier league" || leagueName.includes("premier league")
}

function filterPremierLeagueFixtures(fixtures: CommunityMatchRoomFixture[]) {
  const fixturesWithLeague = fixtures.filter((fixture) => fixture.leagueId || fixture.leagueName)
  if (!fixturesWithLeague.length) return fixtures
  return fixtures.filter(isPremierLeagueFixture)
}

function getFixtureTime(fixture: CommunityMatchRoomFixture) {
  const value = new Date(fixture.kickoff).getTime()
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER
}

function getThailandDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const value = (type: string) => parts.find((part) => part.type === type)?.value || ""
  return `${value("year")}-${value("month")}-${value("day")}`
}

function getThailandTodayKey() {
  return getThailandDateKey(new Date())
}

function isMatchHubDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function parseDateKey(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date
}

function addDaysToDateKey(dateKey: string, days: number) {
  const date = parseDateKey(dateKey)
  if (!date) return dateKey
  date.setDate(date.getDate() + days)
  return getThailandDateKey(date)
}

function formatMatchHubDateLabel(dateKey: string, options: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  const date = parseDateKey(dateKey)
  if (!date) return dateKey
  return new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", ...options }).format(date)
}

function formatMatchHubDateParts(dateKey: string) {
  const date = parseDateKey(dateKey)
  if (!date) return { weekday: dateKey, day: "", month: "" }
  return {
    weekday: new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", weekday: "short" }).format(date),
    day: new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric" }).format(date),
    month: new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", month: "short" }).format(date),
  }
}

function getFixtureDateKey(fixture: CommunityMatchRoomFixture) {
  const date = new Date(fixture.kickoff)
  if (Number.isNaN(date.getTime())) return fixture.dateThai || "unknown"
  return getThailandDateKey(date)
}

function getInitialMatchHubDate(fixtures: CommunityMatchRoomFixture[]) {
  const firstFixture = fixtures.slice().sort((a, b) => getFixtureTime(a) - getFixtureTime(b))[0]
  return firstFixture ? getFixtureDateKey(firstFixture) : getThailandTodayKey()
}

function buildMatchHubDateTabs(selectedDate: string, range = 7) {
  const center = isMatchHubDateKey(selectedDate) ? selectedDate : getThailandTodayKey()
  const start = addDaysToDateKey(center, -range)
  return Array.from({ length: range * 2 + 1 }, (_, index) => {
    const key = addDaysToDateKey(start, index)
    return {
      key,
      label: formatMatchHubDateLabel(key),
      parts: formatMatchHubDateParts(key),
    }
  })
}

function getFixtureMinuteLabel(fixture: CommunityMatchRoomFixture) {
  const events = normalizeTimelineMatchEvents(fixture.events)
  const latestMinute = events.reduce((max, event) => Math.max(max, Number(event.minute || 0)), 0)
  if (latestMinute > 0 && getMatchHubDisplayState({ status: fixture.status, isFinished: fixture.isFinished }) === "live") return `${latestMinute}'`
  return getHubMatchStatusLabel(fixture)
}

function buildFavoriteTeamItems(fixtures: CommunityMatchRoomFixture[], roomStats?: CommunityMatchRoomResponse["roomStats"]) {
  const teams = new Map<string, { name: string; logo: string }>()
  for (const fixture of fixtures) {
    const stats = roomStats?.[fixture.id]
    if (!stats?.isFavoriteTeam) continue
    const favorite = String(stats.favoriteTeamName || "").toLowerCase()
    const homeMatches = favorite && fixture.homeTeam.toLowerCase().includes(favorite)
    const awayMatches = favorite && fixture.awayTeam.toLowerCase().includes(favorite)
    const name = homeMatches ? fixture.homeTeam : awayMatches ? fixture.awayTeam : stats.favoriteTeamName || fixture.homeTeam
    const logo = homeMatches ? fixture.homeLogo : awayMatches ? fixture.awayLogo : fixture.homeLogo
    if (name) teams.set(name, { name, logo })
  }
  return Array.from(teams.values())
}

function buildDirectoryCommunityTotals(fixtures: CommunityMatchRoomFixture[], roomStats?: CommunityMatchRoomResponse["roomStats"]) {
  return fixtures.reduce(
    (total, fixture) => {
      const stats = roomStats?.[fixture.id]
      total.rooms += 1
      total.followers += Number(stats?.followers || 0)
      total.messages += Number(stats?.newRoomMessageCount || stats?.discussions || 0)
      total.polls += Number(stats?.polls || 0)
      return total
    },
    { rooms: 0, followers: 0, messages: 0, polls: 0 },
  )
}

function getEventIcon(event: TimelineMatchEvent) {
  if (event.type === "goal") return "⚽"
  if (event.type === "yellow_card") return "▰"
  if (event.type === "red_card") return "■"
  return "⇄"
}

function CompactEmptyState({ message, description, icon }: { message: string; description?: string; icon?: ReactNode }) {
  return (
    <div className="flex min-h-[62px] items-center gap-3 rounded-lg border border-border bg-surface-2 px-3.5 py-3 text-sm text-muted-foreground">
      {icon ? <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">{icon}</span> : null}
      <span className="min-w-0">
        <span className="block font-medium text-foreground/80">{message}</span>
        {description ? <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{description}</span> : null}
      </span>
    </div>
  )
}

function LiveEmptyBanner() {
  return (
    <div className="theme-surface flex min-h-[72px] flex-wrap items-center gap-3 rounded-xl border px-4 py-3">
      <Badge className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] text-white hover:bg-red-500">LIVE</Badge>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">ไม่มีการแข่งขันสดในขณะนี้</p>
        <p className="mt-0.5 text-xs text-muted-foreground">ดูแมตช์ที่กำลังจะเริ่มด้านล่าง</p>
      </div>
    </div>
  )
}

function MatchHubDirectorySkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3 overflow-hidden">
        {[0, 1, 2].map((item) => <div key={item} className="h-48 min-w-[240px] flex-1 animate-pulse rounded-xl border border-border bg-muted/45 motion-reduce:animate-none" />)}
      </div>
      <div className="grid items-start gap-3 lg:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-xl border border-border bg-muted/45 motion-reduce:animate-none" />)}
      </div>
    </div>
  )
}

function PremierMatchCard({
  fixture,
  stats,
  onToggleFollow,
  followingBusy,
}: {
  fixture: CommunityMatchRoomFixture
  stats?: MatchRoomStats
  onToggleFollow: (fixture: CommunityMatchRoomFixture, nextFollow: boolean) => void
  followingBusy?: boolean
}) {
  const displayState = getMatchHubDisplayState({ status: fixture.status, isFinished: fixture.isFinished })
  const activityCount = Number(stats?.newRoomMessageCount || stats?.discussions || stats?.followers || 0)
  return (
    <div className="theme-surface min-w-[240px] flex-1 rounded-xl border p-3.5 transition hover:border-primary/35 hover:bg-primary/10">
      <div className="mb-3 flex items-center justify-between">
        <span className={cn("text-sm font-bold", displayState === "live" ? "text-primary" : "text-muted-foreground")}>{displayState === "live" ? getFixtureMinuteLabel(fixture) : formatKickoff(fixture)}</span>
        {displayState === "live" ? <Badge className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white hover:bg-red-500">LIVE</Badge> : null}
      </div>
      <Link href={`/community/matches/${fixture.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="min-w-0 text-center">
            <TeamLogo src={fixture.homeLogo} name={fixture.homeTeam} />
            <p className="mt-2 truncate text-sm">{fixture.homeTeam}</p>
          </div>
          <p className="text-center text-2xl font-black">{getScoreLabel(fixture)}</p>
          <div className="min-w-0 text-center">
            <TeamLogo src={fixture.awayLogo} name={fixture.awayTeam} />
            <p className="mt-2 truncate text-sm">{fixture.awayTeam}</p>
          </div>
        </div>
        <div className="mt-3 space-y-1.5 text-center text-xs text-muted-foreground">
          {fixture.venue ? <p className="truncate">{fixture.venue}</p> : null}
          {activityCount > 0 ? <p><span className="text-primary">●</span> {activityCount.toLocaleString("th-TH")} กำลังคุย</p> : null}
        </div>
      </Link>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button asChild className="rounded-lg">
          <Link href={`/community/matches/${fixture.id}`}>เข้าร่วมห้อง</Link>
        </Button>
        <Button
          type="button"
          variant={stats?.isFollowing ? "default" : "outline"}
          disabled={followingBusy}
          onClick={() => onToggleFollow(fixture, !stats?.isFollowing)}
          className="rounded-lg border-border"
        >
          {stats?.isFollowing ? "ติดตามแล้ว" : "ติดตาม"}
        </Button>
      </div>
    </div>
  )
}

function UpcomingMatchesPanel({
  fixtures,
  stats,
  onToggleFollow,
  followingBusyId,
}: {
  fixtures: CommunityMatchRoomFixture[]
  stats?: CommunityMatchRoomResponse["roomStats"]
  onToggleFollow: (fixture: CommunityMatchRoomFixture, nextFollow: boolean) => void
  followingBusyId: string | null
}) {
  return (
    <section className="theme-surface rounded-xl border p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">กำลังจะเริ่ม</h2>
        <Link href="/community/matches" className="text-xs text-primary">ดูทั้งหมด ›</Link>
      </div>
      {fixtures.length ? (
        <div className="space-y-2.5">
          {fixtures.map((fixture) => (
            <div key={fixture.id} className="rounded-lg border border-border bg-surface-2 p-2.5">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
                <div className="min-w-0 text-center">
                  <TeamLogo src={fixture.homeLogo} name={fixture.homeTeam} size="sm" />
                  <p className="mt-1 truncate text-[11px]">{fixture.homeTeam}</p>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">vs</span>
                <div className="min-w-0 text-center">
                  <TeamLogo src={fixture.awayLogo} name={fixture.awayTeam} size="sm" />
                  <p className="mt-1 truncate text-[11px]">{fixture.awayTeam}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-[11px] text-muted-foreground">{formatKickoff(fixture)}{fixture.venue ? ` · ${fixture.venue}` : ""}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={followingBusyId === fixture.id}
                  onClick={() => onToggleFollow(fixture, !stats?.[fixture.id]?.isFollowing)}
                  className="h-8 shrink-0 rounded-lg border-border px-2.5 text-xs"
                >
                  เตือนฉัน
                </Button>
              </div>
              {Number(stats?.[fixture.id]?.followers || 0) > 0 ? <p className="mt-1 text-xs text-muted-foreground"><span className="text-primary">●</span> {stats?.[fixture.id]?.followers} followers</p> : null}
            </div>
          ))}
        </div>
      ) : <CompactEmptyState message="ยังไม่มีแมตช์ที่กำลังจะเริ่ม" description="เช็กตารางในวันถัดไป" icon={<CalendarClock className="h-4 w-4" />} />}
    </section>
  )
}

function MatchEventsPanel({ fixture, events }: { fixture: CommunityMatchRoomFixture | null; events: TimelineMatchEvent[] }) {
  const isUpcoming = fixture ? getMatchHubDisplayState({ status: fixture.status, isFinished: fixture.isFinished }) === "upcoming" : false
  return (
    <section className="theme-surface rounded-xl border p-3.5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Match Events / เหตุการณ์สำคัญ</h2>
            {fixture && getMatchHubDisplayState({ status: fixture.status, isFinished: fixture.isFinished }) === "live" ? <Badge className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white hover:bg-red-500">LIVE</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">อัปเดตเหตุการณ์สำคัญจาก provider เท่านั้น</p>
        </div>
      </div>
      {fixture ? (
        <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border border-border bg-surface-2 p-3">
          <div className="min-w-0 text-center">
            <TeamLogo src={fixture.homeLogo} name={fixture.homeTeam} size="sm" />
            <span className="mt-1 block truncate text-xs">{fixture.homeTeam}</span>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black leading-none">{getScoreLabel(fixture)}</p>
            <p className="mt-1 text-xs font-bold text-primary">{events[0]?.minute ? `${events[0].minute}'` : getHubMatchStatusLabel(fixture)}</p>
          </div>
          <div className="min-w-0 text-center">
            <TeamLogo src={fixture.awayLogo} name={fixture.awayTeam} size="sm" />
            <span className="mt-1 block truncate text-xs">{fixture.awayTeam}</span>
          </div>
        </div>
      ) : null}
      {events.length ? (
        <div className="relative space-y-1 before:absolute before:left-[53px] before:top-3 before:h-[calc(100%-24px)] before:w-px before:bg-border">
          {events.slice(0, 6).map((event) => (
            <div key={event.id} className="grid grid-cols-[42px_24px_1fr_auto] gap-3 py-2 text-sm">
              <span className="text-muted-foreground">{event.minute ? `${event.minute}'` : "-"}</span>
              <span className={cn("relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-card text-center text-xs ring-1 ring-border", event.type === "yellow_card" && "text-yellow-600 dark:text-yellow-300", event.type === "red_card" && "text-red-500 dark:text-red-400")}>{getEventIcon(event)}</span>
              <div className="min-w-0">
                <p className="truncate font-medium">{event.player || event.team || event.type.replace("_", " ")}</p>
                {event.assist ? <p className="truncate text-xs text-muted-foreground">Assist: {event.assist}</p> : event.detail ? <p className="truncate text-xs text-muted-foreground">{event.detail}</p> : null}
              </div>
              {event.type === "goal" ? <span className="text-primary">{event.team || ""}</span> : null}
            </div>
          ))}
        </div>
      ) : <CompactEmptyState message={isUpcoming ? "Match Events จะปรากฏเมื่อการแข่งขันเริ่ม" : "ยังไม่มีเหตุการณ์สำคัญจากผู้ให้บริการ"} description={isUpcoming ? "ข้อมูลจะอัปเดตจากผู้ให้บริการเมื่อมีเหตุการณ์จริง" : "Panel นี้จะขยายเป็น timeline เมื่อ provider ส่งเหตุการณ์"} icon={<Info className="h-4 w-4" />} />}
      {events.length ? (
        <Button asChild variant="outline" className="mt-4 w-full rounded-xl border-border">
          <Link href={fixture ? `/community/matches/${fixture.id}` : "/community/matches"}>ดูเหตุการณ์ทั้งหมด ›</Link>
        </Button>
      ) : null}
    </section>
  )
}

function ThreadsDiscoveryPanel({ fixture, threads }: { fixture: CommunityMatchRoomFixture | null; threads: CommunityMatchRoomPost[] }) {
  return (
    <section className="theme-surface rounded-xl border p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">กระทู้กำลังคุย</h2>
        {fixture ? <Link href={`/community/matches/${fixture.id}?tab=threads`} className="text-xs text-primary">ดูทั้งหมด ›</Link> : null}
      </div>
      {threads.length && fixture ? (
        <div className="space-y-2">
          {threads.slice(0, 5).map((thread) => (
            <Link key={thread.id} href={`/community/matches/${fixture.id}/threads/${thread.id}`} className="flex gap-3 rounded-xl p-2 transition hover:bg-muted/55">
              <TeamLogo src={fixture.homeLogo} name={fixture.homeTeam} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-medium">{thread.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{thread.threadCategoryLabel || "Main Room"} · {thread.comments || 0} ความคิดเห็น</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{thread.latestActivityTimeAgo || thread.timeAgo || ""}</span>
            </Link>
          ))}
        </div>
      ) : <CompactEmptyState message="ยังไม่มีกระทู้สำหรับแมตช์นี้" description="เริ่มบทสนทนาจากห้อง Match Hub ได้เลย" icon={<MessageCircle className="h-4 w-4" />} />}
    </section>
  )
}

function RightRailSection({ title, actionLabel, children }: { title: string; actionLabel?: string; children: ReactNode }) {
  return (
    <section className="theme-surface rounded-xl border p-3.5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-bold">{title}</h2>
        {actionLabel ? <span className="text-xs text-primary">{actionLabel}</span> : null}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  )
}

function MatchHubCalendarPopover({
  selectedDate,
  visibleMonth,
  fixtureDateKeys,
  onSelectDate,
  onChangeMonth,
  onClose,
}: {
  selectedDate: string
  visibleMonth: Date
  fixtureDateKeys: Set<string>
  onSelectDate: (dateKey: string) => void
  onChangeMonth: (date: Date) => void
  onClose: () => void
}) {
  const todayKey = getThailandTodayKey()
  const selectedDateValue = parseDateKey(selectedDate) || parseDateKey(todayKey) || new Date()
  const currentYear = new Date().getFullYear()

  return (
    <div className="space-y-2">
      <Calendar
        mode="single"
        selected={selectedDateValue}
        month={visibleMonth}
        onMonthChange={onChangeMonth}
        onSelect={(date) => {
          if (!date) return
          onSelectDate(getThailandDateKey(date))
        }}
        locale={th}
        captionLayout="dropdown"
        startMonth={new Date(currentYear - 5, 0, 1)}
        endMonth={new Date(currentYear + 5, 11, 31)}
        showOutsideDays
        modifiers={{ hasFixture: (date) => fixtureDateKeys.has(getThailandDateKey(date)) }}
        modifiersClassNames={{ hasFixture: "after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-primary" }}
        className="rounded-xl bg-transparent p-0 [--cell-size:2.25rem]"
        classNames={{
          root: "w-full",
          month: "w-full gap-3",
          months: "w-full",
          caption_label: "text-sm font-semibold",
          dropdowns: "h-9 text-sm",
          weekday: "text-[11px] text-muted-foreground",
          day: "relative",
          today: "rounded-lg bg-primary/10 text-primary",
        }}
      />
      <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
        <Button type="button" variant="outline" onClick={() => onSelectDate(todayKey)} className="h-9 rounded-xl border-border px-3 text-xs">
          วันนี้
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} className="h-9 rounded-xl px-3 text-xs">
          ยกเลิก
        </Button>
      </div>
    </div>
  )
}

function MatchHubDateNavigator({
  selectedDate,
  dateTabs,
  fixtureDateKeys,
  showCalendar,
  calendarMonth,
  onSelectDate,
  onCalendarOpenChange,
  onCalendarMonthChange,
  onRefresh,
}: {
  selectedDate: string
  dateTabs: Array<{ key: string; label: string; parts: { weekday: string; day: string; month: string } }>
  fixtureDateKeys: Set<string>
  showCalendar: boolean
  calendarMonth: Date
  onSelectDate: (dateKey: string) => void
  onCalendarOpenChange: (open: boolean) => void
  onCalendarMonthChange: (date: Date) => void
  onRefresh: () => void
}) {
  const dateButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const todayKey = getThailandTodayKey()
  const isToday = selectedDate === todayKey

  useEffect(() => {
    dateButtonRefs.current[selectedDate]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    })
  }, [selectedDate, dateTabs])

  function moveSelectedDate(offset: number) {
    if (!isMatchHubDateKey(selectedDate)) return
    onSelectDate(addDaysToDateKey(selectedDate, offset))
  }

  return (
    <section className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center" aria-label="เลือกวันที่ Match Hub">
      <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-card p-1.5 shadow-[0_10px_28px_rgba(15,23,42,0.05)] dark:shadow-none">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => moveSelectedDate(-1)}
          className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground hover:bg-muted hover:text-primary"
          aria-label="วันก่อนหน้า"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto scroll-smooth px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {dateTabs.map((tab) => {
            const selected = selectedDate === tab.key
            const hasFixture = fixtureDateKeys.has(tab.key)
            return (
              <button
                key={tab.key}
                ref={(node) => {
                  dateButtonRefs.current[tab.key] = node
                }}
                type="button"
                onClick={() => onSelectDate(tab.key)}
                aria-current={selected ? "date" : undefined}
                className={cn(
                  "relative flex h-12 min-w-[112px] shrink-0 flex-col items-center justify-center rounded-lg border px-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  selected
                    ? "border-primary/60 bg-primary/10 text-primary shadow-[0_0_0_1px_rgba(184,255,0,0.08)]"
                    : "border-border bg-surface-2 text-foreground hover:border-primary/30 hover:bg-accent-soft",
                )}
              >
                <span className="text-[11px] font-semibold leading-none">{tab.parts.weekday}</span>
                <span className="mt-1 text-sm font-black leading-none">{tab.parts.day} {tab.parts.month}</span>
                {tab.key === todayKey ? <span className="sr-only">วันนี้</span> : null}
                {hasFixture ? <span className={cn("absolute bottom-1.5 h-1 w-1 rounded-full", selected ? "bg-primary" : "bg-muted-foreground/60")} /> : null}
              </button>
            )
          })}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => moveSelectedDate(1)}
          className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground hover:bg-muted hover:text-primary"
          aria-label="วันถัดไป"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 xl:justify-self-end">
        {isToday ? (
          <span className="inline-flex h-10 items-center rounded-xl border border-primary/20 bg-primary/10 px-3 text-xs font-semibold text-primary">
            วันนี้
          </span>
        ) : null}
        <Popover open={showCalendar} onOpenChange={onCalendarOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-border bg-card px-3"
              aria-label="เลือกวันที่จากปฏิทิน"
            >
              <CalendarClock className="mr-2 h-4 w-4" />
              เลือกวันที่
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[min(340px,calc(100vw-2rem))] rounded-2xl border-border bg-popover p-3 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
            <MatchHubCalendarPopover
              selectedDate={selectedDate}
              visibleMonth={calendarMonth}
              fixtureDateKeys={fixtureDateKeys}
              onChangeMonth={onCalendarMonthChange}
              onClose={() => onCalendarOpenChange(false)}
              onSelectDate={(dateKey) => {
                onSelectDate(dateKey)
                onCalendarOpenChange(false)
              }}
            />
          </PopoverContent>
        </Popover>
        <Button variant="outline" onClick={onRefresh} className="h-10 rounded-xl border-border bg-card px-3">
          <RefreshCw className="mr-2 h-4 w-4" />
          รีเฟรช
        </Button>
      </div>
    </section>
  )
}

const threadCategories = [
  { id: "all", label: "ทั้งหมด" },
  ...Object.entries(COMMUNITY_THREAD_CATEGORY_LABELS).map(([id, label]) => ({ id, label })),
]

const threadSortOptions = [
  { id: "latest", label: "ล่าสุด" },
  { id: "popular", label: "ยอดนิยม" },
  { id: "active", label: "กำลังพูดถึง" },
  { id: "official", label: "Official" },
]

function ThreadCard({
  item,
  matchId,
  showPinButton = false,
  onTogglePin,
  onToggleOfficial,
  onEdit,
  onDelete,
  onReport,
  pinningId,
}: {
  item: CommunityMatchRoomPost & {
    isPinned?: boolean
    isOfficialThread?: boolean
    threadCategoryLabel?: string
    latestActivityTimeAgo?: string
    likes?: number
    comments?: number
    media?: Array<{ url?: string | null; ownerPreviewUrl?: string | null; mediaType?: string }>
  }
  matchId: string
  showPinButton?: boolean
  onTogglePin?: (item: CommunityMatchRoomPost) => void
  onToggleOfficial?: (item: CommunityMatchRoomPost) => void
  onEdit?: (item: CommunityMatchRoomPost) => void
  onDelete?: (item: CommunityMatchRoomPost) => void
  onReport?: (item: CommunityMatchRoomPost) => void
  pinningId?: string | null
}) {
  const thumbnail = item.media?.find((media) => media.mediaType === "image" && (media.url || media.ownerPreviewUrl))
  const threadUrl = `/community/matches/${matchId}/threads/${item.id}`
  const canModerate = Boolean(item.canModerate)
  const isOwner = Boolean(item.isOwner)
  async function copyLink() {
    const url = typeof window === "undefined" ? threadUrl : `${window.location.origin}${threadUrl}`
    await navigator.clipboard?.writeText(url)
  }
  return (
    <div className="group rounded-[24px] border border-border bg-card p-4 transition hover:border-primary/35 hover:bg-accent-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
              {item.threadCategoryLabel || item.categoryLabel || "ทั่วไป"}
            </Badge>
            {item.isOfficialThread ? <Badge className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] text-sky-700 hover:bg-sky-500/15 dark:text-sky-100">Official</Badge> : null}
            {item.isPinned ? <Badge className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-700 hover:bg-amber-500/15 dark:text-amber-100">Pinned</Badge> : null}
            {item.moderationStatus === "pending_review" ? <Badge className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted">กำลังรอตรวจสอบ</Badge> : null}
          </div>
          <Link href={`/community/matches/${matchId}/threads/${item.id}`} className="mt-3 block text-lg font-semibold transition hover:text-primary">
            {item.title}
          </Link>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{item.excerpt}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label={`เมนูหัวข้อ ${item.title}`} className="h-9 w-9 rounded-full text-muted-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {(isOwner || canModerate) && onEdit ? (
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Edit3 className="mr-2 h-4 w-4" />
                แก้ไขหัวข้อ
              </DropdownMenuItem>
            ) : null}
            {canModerate && onTogglePin ? (
              <DropdownMenuItem onClick={() => onTogglePin(item)}>
                <Pin className="mr-2 h-4 w-4" />
                {item.isPinned ? "เอา pin ออก" : "Pin หัวข้อ"}
              </DropdownMenuItem>
            ) : null}
            {canModerate && onToggleOfficial ? (
              <DropdownMenuItem onClick={() => onToggleOfficial(item)}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                {item.isOfficialThread ? "เอา Official ออก" : "ตั้งเป็น Official"}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={() => void copyLink()}>
              <Copy className="mr-2 h-4 w-4" />
              คัดลอกลิงก์
            </DropdownMenuItem>
            {!isOwner && onReport ? (
              <DropdownMenuItem onClick={() => onReport(item)}>
                <Flag className="mr-2 h-4 w-4" />
                รายงานหัวข้อ
              </DropdownMenuItem>
            ) : null}
            {(isOwner || canModerate) && onDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(item)} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  ลบหัวข้อ
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
        {thumbnail ? (
          <div className="relative hidden h-20 w-20 overflow-hidden rounded-2xl border border-border bg-muted sm:block">
            <Image src={thumbnail.url || thumbnail.ownerPreviewUrl || ""} alt={item.title} fill className="object-cover" unoptimized />
          </div>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <span>{item.author?.name || "ผู้ใช้งาน"}</span>
          <span>•</span>
          <span>{item.timeAgo || ""}</span>
          <span>•</span>
          <span>activity {item.latestActivityTimeAgo || item.timeAgo || "-"}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span>{item.likes || 0} likes</span>
          <span>{item.comments || 0} comments</span>
          <Button asChild variant="outline" className="h-9 rounded-full border-border bg-card px-3">
            <Link href={threadUrl}>เปิดหัวข้อ</Link>
          </Button>
          {showPinButton && onTogglePin ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => onTogglePin(item)}
              disabled={pinningId === item.id}
              className="h-9 rounded-full border-border bg-card px-3"
            >
              {pinningId === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pin className="mr-2 h-4 w-4" />}
              {item.isPinned ? "Unpin" : "Pin"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function CommunityMatchCardsSection({ data, isLoading }: { data?: CommunityMatchRoomResponse; isLoading?: boolean }) {
  const fixtures = data?.fixtures?.slice(0, 4) || []
  return (
    <Card className="rounded-[28px] border-primary/20 bg-[radial-gradient(circle_at_left,rgba(184,255,0,0.10),transparent_34%),var(--color-card)]">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Match Rooms</p>
            <h2 className="text-xl font-bold text-foreground">ห้องแข่งขันที่กำลังน่าสนใจ</h2>
          </div>
          <Button asChild variant="outline" className="rounded-full border-border bg-card">
            <Link href="/community/matches">ดู Match Rooms ทั้งหมด</Link>
          </Button>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            กำลังโหลด Match Rooms...
          </div>
        ) : fixtures.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {fixtures.map((fixture) => (
              <MatchRoomMiniCard key={fixture.id} fixture={fixture} stats={data?.roomStats?.[fixture.id]} compact />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted p-5 text-sm text-muted-foreground">ยังไม่มีการแข่งขันในช่วงนี้</div>
        )}
      </CardContent>
    </Card>
  )
}

export function MatchRoomsDirectory() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { token: authToken } = useAuthSession()
  const urlDate = searchParams.get("date") || ""
  const [query, setQuery] = useState("")
  const [activeDate, setActiveDate] = useState(urlDate)
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => parseDateKey(urlDate) || new Date())
  const [followingBusyId, setFollowingBusyId] = useState<string | null>(null)
  const [followError, setFollowError] = useState("")
  const [showNotificationsDialog, setShowNotificationsDialog] = useState(false)
  const { data, error, isLoading, mutate } = useSWR<CommunityMatchRoomResponse>("/community/match-room", matchRoomFetcher, { revalidateOnFocus: true })
  const { data: notifications, mutate: mutateNotifications } = useSWR<MatchHubNotificationsResponse>(
    authToken ? ["/community/notifications", authToken] : null,
    matchHubNotificationsFetcher,
    { revalidateOnFocus: true },
  )
  const fixtures = filterPremierLeagueFixtures(data?.fixtures || [])
  const searchedFixtures = filterFixtures(fixtures, query, "all")
  const fallbackDate = getInitialMatchHubDate(searchedFixtures)
  const selectedDate = isMatchHubDateKey(activeDate) ? activeDate : fallbackDate
  const dateTabs = buildMatchHubDateTabs(selectedDate)
  const fixtureDateKeys = new Set(fixtures.map(getFixtureDateKey).filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key)))
  const visibleFixtures = selectedDate ? searchedFixtures.filter((fixture) => getFixtureDateKey(fixture) === selectedDate) : searchedFixtures
  const liveFixtures = visibleFixtures.filter((fixture) => getMatchHubDisplayState({ status: fixture.status, isFinished: fixture.isFinished }) === "live")
  const upcomingFixtures = visibleFixtures
    .filter((fixture) => getMatchHubDisplayState({ status: fixture.status, isFinished: fixture.isFinished }) === "upcoming")
    .sort((a, b) => getFixtureTime(a) - getFixtureTime(b))
  const eventFixture = liveFixtures[0] || visibleFixtures.find((fixture) => normalizeTimelineMatchEvents(fixture.events).length) || visibleFixtures[0] || null
  const matchEvents = eventFixture ? normalizeTimelineMatchEvents(eventFixture.events).slice().sort((a, b) => Number(b.minute ?? 0) - Number(a.minute ?? 0)) : []
  const threads = data?.threads || []
  const selectedThreads = eventFixture?.id && eventFixture.id === data?.fixture?.id ? threads : []
  const followedFixtures = fixtures.filter((fixture) => data?.roomStats?.[fixture.id]?.isFollowing || data?.roomStats?.[fixture.id]?.isRecent)
  const favoriteTeamItems = buildFavoriteTeamItems(fixtures, data?.roomStats)
  const communityTotals = buildDirectoryCommunityTotals(fixtures, data?.roomStats)
  const popularTags = data?.fanReaction?.topTopics || []

  useEffect(() => {
    if (isMatchHubDateKey(urlDate) && urlDate !== activeDate) {
      setActiveDate(urlDate)
      const nextMonth = parseDateKey(urlDate)
      if (nextMonth) setCalendarMonth(nextMonth)
      return
    }
    if (!urlDate && !activeDate && fallbackDate) {
      setActiveDate(fallbackDate)
      const nextMonth = parseDateKey(fallbackDate)
      if (nextMonth) setCalendarMonth(nextMonth)
    }
  }, [activeDate, fallbackDate, urlDate])

  function updateSelectedDate(nextDate: string, mode: "push" | "replace" = "push") {
    if (!isMatchHubDateKey(nextDate)) return
    setActiveDate(nextDate)
    const nextMonth = parseDateKey(nextDate)
    if (nextMonth) setCalendarMonth(nextMonth)
    const params = new URLSearchParams(searchParams.toString())
    params.set("date", nextDate)
    const nextUrl = `${pathname}?${params.toString()}`
    if (mode === "replace") router.replace(nextUrl, { scroll: false })
    else router.push(nextUrl, { scroll: false })
  }

  async function markNotificationsAsRead() {
    if (!authToken || !notifications?.unreadActivity) return
    try {
      await fetchJson("/community/notifications", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${authToken}` },
      })
      await mutateNotifications()
    } catch {}
  }

  async function handleOpenNotificationsDialog() {
    setShowNotificationsDialog(true)
    await markNotificationsAsRead()
  }

  async function handleToggleFollow(fixture: CommunityMatchRoomFixture, nextFollow: boolean) {
    setFollowingBusyId(fixture.id)
    setFollowError("")
    const previous = data
    await mutate(
      previous
        ? {
            ...previous,
            roomStats: {
              ...previous.roomStats,
              [fixture.id]: {
                ...(previous.roomStats?.[fixture.id] || { discussions: 0, polls: 0 }),
                isFollowing: nextFollow,
                followers: Math.max(0, Number(previous.roomStats?.[fixture.id]?.followers || 0) + (nextFollow ? 1 : -1)),
              },
            },
          }
        : previous,
      false,
    )
    try {
      await fetchJson("/community/match-room/follow", {
        method: "POST",
        body: JSON.stringify({ matchId: fixture.id, follow: nextFollow }),
      })
      await mutate()
    } catch (followToggleError) {
      setFollowError(followToggleError instanceof Error ? followToggleError.message : "อัปเดตการติดตามไม่สำเร็จ")
      await mutate(previous, false)
    } finally {
      setFollowingBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid max-w-[1720px] gap-3 px-3 py-3 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <aside className="hidden">
          <div className="sticky top-3 w-[64px] overflow-hidden rounded-xl border border-border bg-card/95 p-2 shadow-[0_18px_60px_rgba(0,0,0,0.10)] transition-[width,box-shadow] duration-200 hover:w-56 hover:shadow-[0_22px_80px_rgba(0,0,0,0.16)] focus-within:w-56 motion-reduce:transition-none">
            <Link href="/community/matches" className="flex h-11 items-center gap-3 rounded-lg px-1.5" aria-label="Match Hub" title="Match Hub">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/50 bg-primary/10">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 opacity-0 transition-opacity duration-150 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100 motion-reduce:transition-none">
                <p className="font-black leading-tight">MATCH HUB</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Premier League</p>
              </div>
            </Link>
            <nav className="mt-6 space-y-1 text-sm" aria-label="Match Hub navigation">
              {[
                { label: "หน้าหลัก", href: "/", icon: Home },
                { label: "Match Hub", href: "/community/matches", icon: CalendarClock, active: true },
                { label: "โพล", href: "/community/matches", icon: Hash },
                { label: "ตารางคะแนน", href: "/standings", icon: BarChart3 },
                { label: "นักเตะและทีม", href: "/players", icon: Users },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-label={item.label}
                    title={item.label}
                    className={cn(
                      "flex h-11 items-center gap-3 rounded-lg px-2 text-muted-foreground transition hover:bg-accent-soft hover:text-foreground",
                      item.active && "bg-primary/15 text-primary",
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 truncate opacity-0 transition-opacity duration-150 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100 motion-reduce:transition-none">{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </aside>

        <header className="grid gap-3 lg:grid-cols-[minmax(260px,360px)_minmax(320px,1fr)_auto] lg:items-center xl:col-span-2 xl:col-start-1">
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button type="button" variant="outline" size="icon" className="rounded-xl border-border bg-card lg:hidden" aria-label="เปิดเมนู Match Hub">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-border bg-popover text-popover-foreground">
                <SheetHeader>
                  <SheetTitle>Match Hub</SheetTitle>
                  <SheetDescription>เมนูหลักของพรีเมียร์ลีก Match Hub</SheetDescription>
                </SheetHeader>
                <nav className="mt-6 space-y-1" aria-label="Mobile Match Hub navigation">
                  {[
                    { label: "หน้าหลัก", href: "/", icon: Home },
                    { label: "Match Hub", href: "/community/matches", icon: CalendarClock, active: true },
                    { label: "โพล", href: "/community/matches", icon: Hash },
                    { label: "ตารางคะแนน", href: "/standings", icon: BarChart3 },
                    { label: "นักเตะและทีม", href: "/players", icon: Users },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-accent-soft hover:text-foreground",
                          item.active && "bg-primary/15 text-primary",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </nav>
              </SheetContent>
            </Sheet>
            </div>
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-card sm:flex">
              <Trophy className="h-7 w-7 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-5">Premier League</p>
              <h1 className="whitespace-nowrap font-display text-[30px] font-black leading-none tracking-tight">MATCH HUB</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">รวมทุกแมตช์ เหตุการณ์สำคัญ และกระทู้ยอดฮิต</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาทีม, ห้อง, ผู้ใช้..."
              className="h-11 rounded-xl border-border bg-input-background pl-11"
            />
          </div>
          <div className="flex items-center justify-end gap-2 lg:justify-self-end">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => void handleOpenNotificationsDialog()}
              className="relative rounded-full border-border bg-card/70"
              aria-label="เปิดการแจ้งเตือน"
            >
              <Bell className="h-4 w-4" />
              {notifications?.total ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" /> : null}
            </Button>
            <Button asChild className="h-11 rounded-full px-5">
              <Link href="/community/messages">Messages</Link>
            </Button>
          </div>
        </header>

        <main className="min-w-0 space-y-3 xl:col-start-1">
          {followError ? <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{followError}</p> : null}

          <MatchHubDateNavigator
            selectedDate={selectedDate}
            dateTabs={dateTabs}
            fixtureDateKeys={fixtureDateKeys}
            showCalendar={showCalendar}
            calendarMonth={calendarMonth}
            onSelectDate={updateSelectedDate}
            onCalendarOpenChange={setShowCalendar}
            onCalendarMonthChange={setCalendarMonth}
            onRefresh={() => void mutate()}
          />

          {isLoading ? <MatchHubDirectorySkeleton /> : null}
          {error ? (
            <section className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-destructive">โหลด Match Hub ไม่สำเร็จ กรุณาลองใหม่</p>
            <Button variant="outline" onClick={() => void mutate()} className="rounded-full border-border">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            </section>
          ) : null}

          {!isLoading && !error ? (
            !visibleFixtures.length ? (
              <div className="rounded-xl border border-dashed border-border bg-surface p-4">
                <CompactEmptyState
                  message="ไม่มีการแข่งขันพรีเมียร์ลีกในวันนี้"
                  description={`${formatMatchHubDateLabel(selectedDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} ไม่มี fixture จาก provider`}
                  icon={<CalendarClock className="h-4 w-4" />}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => updateSelectedDate(addDaysToDateKey(selectedDate, -1))} className="h-9 rounded-xl border-border bg-card px-3">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    วันก่อนหน้า
                  </Button>
                  <Button type="button" variant="outline" onClick={() => updateSelectedDate(addDaysToDateKey(selectedDate, 1))} className="h-9 rounded-xl border-border bg-card px-3">
                    วันถัดไป
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                  {selectedDate !== getThailandTodayKey() ? (
                    <Button type="button" variant="ghost" onClick={() => updateSelectedDate(getThailandTodayKey())} className="h-9 rounded-xl px-3 text-primary">
                      วันนี้
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <>
              <section className="space-y-2.5">
                {liveFixtures.length ? (
                  <>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold">แมตช์ถ่ายทอดสด</h2>
                      <Badge className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] text-white hover:bg-red-500">LIVE</Badge>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {liveFixtures.slice(0, 4).map((fixture) => (
                        <PremierMatchCard
                          key={fixture.id}
                          fixture={fixture}
                          stats={data?.roomStats?.[fixture.id]}
                          onToggleFollow={handleToggleFollow}
                          followingBusy={followingBusyId === fixture.id}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <LiveEmptyBanner />
                )}
              </section>

              <section className="grid items-start gap-3 lg:grid-cols-[minmax(220px,0.72fr)_minmax(380px,1.12fr)_minmax(280px,0.9fr)]">
                <UpcomingMatchesPanel fixtures={upcomingFixtures.slice(0, 3)} stats={data?.roomStats} onToggleFollow={handleToggleFollow} followingBusyId={followingBusyId} />
                <MatchEventsPanel fixture={eventFixture} events={matchEvents} />
                <ThreadsDiscoveryPanel fixture={eventFixture} threads={selectedThreads} />
              </section>
              </>
            )
          ) : null}
        </main>

        <aside className="space-y-3 xl:col-start-2 xl:row-start-2 xl:sticky xl:top-3">
          <RightRailSection title="ติดตามของคุณ">
            {favoriteTeamItems.length ? favoriteTeamItems.slice(0, 5).map((team) => (
              <div key={team.name} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <TeamLogo src={team.logo} name={team.name} size="sm" />
                  <span className="truncate text-sm">{team.name}</span>
                </div>
                <span className="h-2 w-2 rounded-full bg-primary" />
              </div>
            )) : <CompactEmptyState message="ยังไม่มีทีมโปรด" description="ติดตามทีมโปรดเพื่อไม่พลาดทุกความเคลื่อนไหว" />}
          </RightRailSection>

          <RightRailSection title="ห้องที่คุณเข้าเป็นประจำ">
            {followedFixtures.length ? followedFixtures.slice(0, 5).map((fixture) => {
              const stats = data?.roomStats?.[fixture.id]
              return (
                <Link key={fixture.id} href={`/community/matches/${fixture.id}`} className="flex items-center gap-3 rounded-xl p-1 transition hover:bg-accent-soft">
                  <TeamLogo src={fixture.homeLogo} name={fixture.homeTeam} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm">{getMatchTitle(fixture)}</p>
                    <p className="text-xs text-muted-foreground">{stats?.newRoomMessageCount || stats?.discussions || 0} messages</p>
                  </div>
                </Link>
              )
            }) : <CompactEmptyState message="ยังไม่มีห้องที่ติดตามหรือเคยเข้า" />}
          </RightRailSection>

          <RightRailSection title="สถิติคอมมูนิตี้วันนี้">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
              {[
                ["Rooms", communityTotals.rooms],
                ["Followers", communityTotals.followers],
                ["Messages", communityTotals.messages],
                ["Polls", communityTotals.polls],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg border border-border bg-surface-2 px-2.5 py-3 text-center">
                  <p className="text-base font-black text-primary">{value}</p>
                  <p className="mt-1 text-[10px] leading-none text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </RightRailSection>

          {popularTags.length ? (
            <RightRailSection title="แท็กยอดนิยม">
              <div className="flex flex-wrap gap-1.5">
                {popularTags.slice(0, 6).map((tag) => (
                  <Badge key={tag.label} variant="outline" className="rounded-full border-border bg-card/70 px-2 py-1 text-[11px] text-muted-foreground">#{tag.label}</Badge>
                ))}
              </div>
            </RightRailSection>
          ) : null}
        </aside>

        <Dialog open={showNotificationsDialog} onOpenChange={setShowNotificationsDialog}>
          <DialogContent className="max-w-xl rounded-[24px] border-border bg-popover text-popover-foreground">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                การแจ้งเตือน Match Hub
              </DialogTitle>
              <DialogDescription>ใช้ระบบแจ้งเตือน Community เดิม อัปเดตจากเพื่อน โพสต์ กระทู้ และ moderation</DialogDescription>
            </DialogHeader>
            {!authToken ? (
              <div className="rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">
                กรุณาเข้าสู่ระบบเพื่อดูการแจ้งเตือน
              </div>
            ) : (
              <div className="max-h-[60vh] space-y-3 overflow-y-auto">
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    ["ทั้งหมด", notifications?.total || 0],
                    ["กิจกรรม", notifications?.unreadActivity || 0],
                    ["ข้อความ", notifications?.unreadMessages || 0],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl bg-muted px-3 py-2">
                      <p className="text-lg font-black text-primary">{value}</p>
                      <p className="text-[11px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
                {notifications?.activity?.length ? (
                  notifications.activity.map((item) => (
                    <Link
                      key={item.id}
                      href={getMatchHubNotificationHref(item)}
                      onClick={() => setShowNotificationsDialog(false)}
                      className="flex items-start gap-3 rounded-xl border border-border bg-muted p-3 transition hover:border-primary/25 hover:bg-accent-soft"
                    >
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarImage src={item.actor?.avatar || "/placeholder-user.jpg"} />
                        <AvatarFallback>{getInitials(item.actor?.name || "F")}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">{item.actor?.name || "FootballAI"}</span> {item.text || "มีการแจ้งเตือนใหม่"}
                        </p>
                        {item.post?.title ? <p className="truncate text-xs text-muted-foreground">{item.post.title}</p> : null}
                        {item.commentPreview ? <p className="truncate text-xs text-primary/80">"{item.commentPreview}"</p> : null}
                        {item.story?.caption ? <p className="truncate text-xs text-primary/80">{item.story.caption}</p> : null}
                        {item.media?.originalName ? <p className="truncate text-xs text-primary/80">{item.media.originalName}</p> : null}
                        <p className="mt-1 text-[11px] text-muted-foreground">{item.timeAgo || ""}</p>
                      </div>
                      {!item.isRead ? <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary" /> : null}
                    </Link>
                  ))
                ) : (
                  <div className="rounded-xl bg-muted px-4 py-8 text-center">
                    <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium">ยังไม่มีการแจ้งเตือนใหม่</p>
                    <p className="mt-1 text-xs text-muted-foreground">เมื่อมีคนโต้ตอบหรือมีสถานะ moderation จะขึ้นที่นี่</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNotificationsDialog(false)} className="rounded-full border-border">
                ปิด
              </Button>
              <Button asChild className="rounded-full">
                <Link href="/community/messages" onClick={() => setShowNotificationsDialog(false)}>เปิด Messages</Link>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

function MatchHero({
  fixture,
  stats,
  channels = [],
  summary,
  demoOverride,
  onToggleFollow,
  followingBusy,
}: {
  fixture: CommunityMatchRoomFixture
  stats?: MatchRoomStats
  channels?: MatchRoomChannel[]
  summary?: CommunityMatchRoomResponse["summary"]
  demoOverride?: CommunityMatchRoomResponse["demoOverride"]
  onToggleFollow?: (fixture: CommunityMatchRoomFixture, nextFollow: boolean) => void
  followingBusy?: boolean
}) {
  const timelinePhase = demoOverride?.effectivePhase || getMatchTimelinePhase(fixture)
  const recommendation = getRecommendedRoom(fixture, stats, channels, timelinePhase)
  const timelineLabel = getTimelineRoomLabel(timelinePhase)
  const kickoffCountdown = timelinePhase === "pre_match" ? getKickoffCountdownLabel(fixture) : ""
  const demoNotice = demoOverride?.enabled ? getMatchDemoOverrideNotice(demoOverride.overridePhase) : ""
  const messageCount = stats?.newRoomMessageCount || stats?.discussions || 0
  const threadCount = stats?.discussions || 0
  const latestActivity = stats?.latestRoomActivityAt || stats?.latestActivityAt
  return (
    <section className="overflow-hidden rounded-[18px] border border-border bg-[radial-gradient(circle_at_top_left,rgba(184,255,0,0.12),transparent_30%),var(--color-card)] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.10)] sm:p-7" aria-label="FootballAI Match Hub header">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Badge variant="outline" className={cn("rounded-full px-3 py-1", getStatusTone(fixture.status, fixture.isFinished))}>
            {getHubMatchStatusLabel(fixture)}
          </Badge>
          <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-5xl">FootballAI Match Hub</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Welcome to FootballAI Match Hub. This is the community space for this match: rooms, polls, threads, reactions and AI match context in one place.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full border-primary/25 bg-primary/10 px-3 py-1 text-primary">{timelineLabel}</Badge>
            {kickoffCountdown ? <Badge className="rounded-full bg-primary px-3 py-1 text-primary-foreground">{kickoffCountdown}</Badge> : null}
            {demoNotice ? <Badge variant="outline" className="rounded-full border-amber-500/40 bg-amber-500/10 px-3 py-1 text-amber-700 dark:text-amber-200">Demo Mode</Badge> : null}
          </div>
          {demoNotice ? <p className="text-xs text-amber-700 dark:text-amber-100">{demoNotice}. Room availability is overridden for demo, while match facts still come from provider status {fixture.status || "unchanged"}.</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {onToggleFollow ? (
            <Button
              type="button"
              onClick={() => onToggleFollow(fixture, !stats?.isFollowing)}
              disabled={followingBusy}
              variant={stats?.isFollowing ? "default" : "outline"}
              className="rounded-full border-border"
              aria-label={stats?.isFollowing ? `เลิกติดตาม ${getMatchTitle(fixture)}` : `ติดตาม ${getMatchTitle(fixture)}`}
            >
              <Bell className="mr-2 h-4 w-4" />
              {stats?.isFollowing ? "กำลังติดตาม" : "ติดตาม Match Room"}
            </Button>
          ) : null}
          <Button variant="outline" className="rounded-full border-border bg-card">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      {recommendation ? (
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams(window.location.search)
            params.set("tab", "discussion")
            params.set("room", roomToQuery(recommendation.roomType))
            window.location.assign(`${window.location.pathname}?${params.toString()}`)
          }}
          className="mt-5 flex w-full flex-wrap items-center justify-between gap-3 rounded-[24px] border border-primary/25 bg-primary/10 p-4 text-left transition hover:border-primary/50 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 motion-reduce:transition-none"
          aria-label="Open recommended room"
        >
          <span>
            <span className="block text-sm font-semibold text-primary">Your favorite team is playing.</span>
            <span className="mt-1 block text-sm text-muted-foreground">{recommendation.title}. You can still choose Main Room, Tactical Room or any other room.</span>
          </span>
          <ChevronRight className="h-5 w-5 text-primary" />
        </button>
      ) : null}

      <div className="mt-7 grid items-center gap-4 rounded-[12px] border border-border bg-surface-2 p-4 sm:grid-cols-[1fr_auto_1fr]">
        <div className="flex items-center gap-4">
          <TeamLogo src={fixture.homeLogo} name={fixture.homeTeam} size="lg" />
          <p className="text-xl font-bold text-foreground sm:text-2xl">{fixture.homeTeam}</p>
        </div>
        <div className="rounded-[12px] bg-card/92 px-7 py-4 text-center text-4xl font-black text-primary" aria-label={`Score ${getScoreLabel(fixture)}`}>
          {getScoreLabel(fixture)}
        </div>
        <div className="flex items-center justify-end gap-4 text-right">
          <p className="text-xl font-bold text-foreground sm:text-2xl">{fixture.awayTeam}</p>
          <TeamLogo src={fixture.awayLogo} name={fixture.awayTeam} size="lg" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[12px] border border-border bg-muted p-3">
          <CalendarClock className="mb-2 h-4 w-4 text-primary" />
          <span className="block text-xs uppercase tracking-[0.16em] text-muted-foreground">Kickoff</span>
          <span className="mt-1 block font-semibold text-foreground">{formatKickoff(fixture)}</span>
        </div>
        <div className="rounded-[12px] border border-border bg-muted p-3">
          <MessageCircle className="mb-2 h-4 w-4 text-primary" />
          <span className="block text-xs uppercase tracking-[0.16em] text-muted-foreground">Messages</span>
          <span className="mt-1 block font-semibold text-foreground">{messageCount}</span>
        </div>
        <div className="rounded-[12px] border border-border bg-muted p-3">
          <Users className="mb-2 h-4 w-4 text-primary" />
          <span className="block text-xs uppercase tracking-[0.16em] text-muted-foreground">Followers</span>
          <span className="mt-1 block font-semibold text-foreground">{stats?.followers || 0}</span>
        </div>
        <div className="rounded-[12px] border border-border bg-muted p-3">
          <Trophy className="mb-2 h-4 w-4 text-primary" />
          <span className="block text-xs uppercase tracking-[0.16em] text-muted-foreground">Polls / Summary</span>
          <span className="mt-1 block font-semibold text-foreground">{stats?.polls || 0} polls · {getSummaryStatusLabel(summary)}</span>
        </div>
      </div>

      <div className="mt-3 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[12px] border border-border bg-muted p-3">
          <span className="block text-xs uppercase tracking-[0.16em] text-muted-foreground">League</span>
          <span className="mt-1 block font-semibold text-foreground">พรีเมียร์ลีก</span>
        </div>
        <div className="rounded-[12px] border border-border bg-muted p-3">
          <span className="block text-xs uppercase tracking-[0.16em] text-muted-foreground">Threads</span>
          <span className="mt-1 block font-semibold text-foreground">{threadCount}</span>
        </div>
        <div className="rounded-[12px] border border-border bg-muted p-3">
          <span className="block text-xs uppercase tracking-[0.16em] text-muted-foreground">Venue</span>
          <span className="mt-1 block truncate font-semibold text-foreground">{fixture.venue || "-"}</span>
        </div>
        <div className="rounded-[12px] border border-border bg-muted p-3">
          <span className="block text-xs uppercase tracking-[0.16em] text-muted-foreground">Latest Activity</span>
          <span className="mt-1 block font-semibold text-foreground">{latestActivity ? new Date(latestActivity).toLocaleString("th-TH") : "-"}</span>
        </div>
      </div>
    </section>
  )
}

function MatchCommunityExperience({
  fixture,
  stats,
  pulse,
  milestones,
  highlights,
  threads,
  polls,
  summary,
  recommendation,
  onOpenRoom,
  onOpenThreads,
  onOpenPolls,
  onOpenSummary,
}: {
  fixture: CommunityMatchRoomFixture
  stats?: MatchRoomStats
  pulse: ReturnType<typeof buildMatchHubCommunityPulse>
  milestones: string[]
  highlights: TimelineMatchEvent[]
  threads: CommunityMatchRoomPost[]
  polls: CommunityMatchRoomPost[]
  summary?: CommunityMatchRoomResponse["summary"]
  recommendation: ReturnType<typeof getRecommendedRoom>
  onOpenRoom: (roomType: ConversationRoomId) => void
  onOpenThreads: () => void
  onOpenPolls: () => void
  onOpenSummary: () => void
}) {
  const momentumLabel = getMatchHubFanMomentumLabel(pulse)
  const recommendedRoom = recommendation?.roomType || "main"
  const safeRecommendedRoom = recommendedRoom === "preview" ? "preview_home" : recommendedRoom === "post_match" ? "post_match_home" : recommendedRoom
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]" aria-label="Match Hub community experience">
      <Card className="rounded-[12px] border border-border bg-card/92 shadow-[0_10px_28px_rgba(0,0,0,0.12)]">
        <CardContent className="space-y-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Community Pulse</p>
              <h2 className="mt-1 text-2xl font-bold">{momentumLabel}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{getMatchTitle(fixture)} is collecting fan voices across rooms, polls, threads and match context.</p>
            </div>
            {stats?.isFavoriteTeam ? <Badge className="rounded-full bg-primary text-primary-foreground">Your favorite team is playing</Badge> : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ["Messages", pulse.messages],
              ["Threads", pulse.threads],
              ["Polls", pulse.polls],
              ["Fans", pulse.fans],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[12px] border border-border bg-muted p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-black text-foreground">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[12px] border border-border bg-muted p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold">Smart Recommendation</h3>
                <Badge variant="outline" className="rounded-full border-primary/25 text-primary">Non-forcing</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{recommendation?.title || "Recommended Room: Main Room"}</p>
              <Button type="button" onClick={() => onOpenRoom(safeRecommendedRoom as ConversationRoomId)} className="mt-4 rounded-[12px]">
                เปิดห้องที่แนะนำ
              </Button>
            </div>
            <div className="rounded-[12px] border border-border bg-muted p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold">Community Milestones</h3>
                {pulse.hasSummary ? <Badge variant="outline" className="rounded-full border-primary/25 text-primary">Summary ready</Badge> : null}
              </div>
              {milestones.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {milestones.map((milestone) => (
                    <Badge key={milestone} variant="outline" className="rounded-full border-border bg-muted text-muted-foreground">{milestone}</Badge>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Community milestones will appear as fans join the match discussion.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card className="rounded-[12px] border border-border bg-card/88 shadow-[0_10px_28px_rgba(0,0,0,0.10)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">Match Highlights</h2>
              <Badge variant="outline" className="rounded-full border-border">{highlights.length}</Badge>
            </div>
            {highlights.length ? (
              <div className="mt-3 space-y-2">
                {highlights.slice(0, 3).map((event) => (
                  <div key={event.id} className="rounded-[12px] border border-border bg-muted p-3 text-sm">
                    <p className="font-semibold">{event.minute ? `${event.minute}' ` : ""}{event.type.replace("_", " ")}</p>
                    <p className="text-muted-foreground">{[event.team, event.player, event.detail].filter(Boolean).join(" · ") || "Verified match event"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Match highlights will appear when the provider supplies verified events.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[12px] border border-border bg-card/88 shadow-[0_10px_28px_rgba(0,0,0,0.10)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">Trending Discussions</h2>
              <Button type="button" variant="ghost" onClick={onOpenThreads} className="h-8 rounded-full px-3 text-xs">เปิด</Button>
            </div>
            {threads.length ? (
              <div className="mt-3 space-y-2">
                {threads.slice(0, 3).map((thread) => (
                  <Link key={thread.id} href={`/community/matches/${fixture.id}/threads/${thread.id}`} className="block rounded-[12px] border border-border bg-muted p-3 transition hover:border-primary/40">
                    <p className="line-clamp-1 font-semibold">{thread.title}</p>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{thread.latestActivityTimeAgo || thread.timeAgo || "activity -"}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">ยังไม่มีหัวข้อที่กำลังถูกพูดถึงในแมตช์นี้</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Button type="button" variant="outline" onClick={onOpenPolls} className="h-auto justify-start rounded-[12px] border-border p-4 text-left">
            <span>
              <span className="block font-semibold">Community Poll</span>
              <span className="mt-1 block text-xs text-muted-foreground">{polls[0]?.poll?.question || MATCH_HUB_EMPTY_STATES.polls}</span>
            </span>
          </Button>
          <Button type="button" variant="outline" onClick={onOpenSummary} className="h-auto justify-start rounded-[12px] border-border p-4 text-left">
            <span>
              <span className="block font-semibold">AI Summary</span>
              <span className="mt-1 block text-xs text-muted-foreground">{summary?.headline || MATCH_HUB_EMPTY_STATES.summary}</span>
            </span>
          </Button>
        </div>
      </div>
    </section>
  )
}

export function MatchRoomDetail({ matchId }: { matchId: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { token: authToken } = useAuthSession()
  const activeView = searchParams.get("view")
  const activeTab = (searchParams.get("tab") || (activeView === "polls" || activeView === "summary" ? activeView : activeView === "info" ? "discussion" : "overview")) as RoomTab
  const safeTab = roomTabs.some((tab) => tab.id === activeTab) ? activeTab : "overview"
  const [threadSort, setThreadSort] = useState("latest")
  const [threadCategory, setThreadCategory] = useState("all")
  const [officialOnly, setOfficialOnly] = useState(false)
  const [showCreateThread, setShowCreateThread] = useState(false)
  const [threadTitle, setThreadTitle] = useState("")
  const [threadContent, setThreadContent] = useState("")
  const [threadFormCategory, setThreadFormCategory] = useState("general")
  const [threadFormError, setThreadFormError] = useState("")
  const [creatingThread, setCreatingThread] = useState(false)
  const [uploadingThreadImage, setUploadingThreadImage] = useState(false)
  const [threadImage, setThreadImage] = useState<{ id: string; url?: string | null; ownerPreviewUrl?: string | null; status: string } | null>(null)
  const [pinningThreadId, setPinningThreadId] = useState<string | null>(null)
  const [editingThread, setEditingThread] = useState<CommunityMatchRoomPost | null>(null)
  const [editThreadTitle, setEditThreadTitle] = useState("")
  const [editThreadContent, setEditThreadContent] = useState("")
  const [editThreadCategory, setEditThreadCategory] = useState("general")
  const [savingThreadEdit, setSavingThreadEdit] = useState(false)
  const [regeneratingSummary, setRegeneratingSummary] = useState(false)
  const [showSummaryHistory, setShowSummaryHistory] = useState(false)
  const [loadingSummaryHistory, setLoadingSummaryHistory] = useState(false)
  const [summaryHistory, setSummaryHistory] = useState<MatchRoomSummaryHistoryResponse | null>(null)
  const [summaryHistoryError, setSummaryHistoryError] = useState("")
  const [followingBusyId, setFollowingBusyId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MatchRoomMessage[]>([])
  const [messagesPage, setMessagesPage] = useState(1)
  const [messagesTotalPages, setMessagesTotalPages] = useState(1)
  const [messagesError, setMessagesError] = useState("")
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [messageDraft, setMessageDraft] = useState("")
  const [selectedTacticalTopic, setSelectedTacticalTopic] = useState<TacticalQuickTopic | "">("")
  const [replyTarget, setReplyTarget] = useState<MatchRoomMessage | null>(null)
  const [editingMessage, setEditingMessage] = useState<MatchRoomMessage | null>(null)
  const [editMessageDraft, setEditMessageDraft] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const [uploadingMessageImage, setUploadingMessageImage] = useState(false)
  const [messageImage, setMessageImage] = useState<{ id: string; url?: string | null; ownerPreviewUrl?: string | null; status: string } | null>(null)
  const [newMessageCount, setNewMessageCount] = useState(0)
  const [highlightedMessageId, setHighlightedMessageId] = useState("")
  const [showDraftMoveDialog, setShowDraftMoveDialog] = useState(false)
  const messageListRef = useRef<HTMLDivElement | null>(null)
  const messageEndRef = useRef<HTMLDivElement | null>(null)
  const [lastGoodData, setLastGoodData] = useState<CommunityMatchRoomResponse | null>(null)
  const { data: liveData, error, isLoading, mutate } = useSWR<CommunityMatchRoomResponse>(`/community/match-room?matchId=${encodeURIComponent(matchId)}`, matchRoomFetcher, {
    revalidateOnFocus: true,
    keepPreviousData: true,
  })
  useEffect(() => {
    if (liveData?.fixture) setLastGoodData(liveData)
  }, [liveData])
  const data = liveData?.fixture ? liveData : lastGoodData
  const threadQuery = `/community/match-room/threads?matchId=${encodeURIComponent(matchId)}&sort=${encodeURIComponent(threadSort)}${threadCategory !== "all" ? `&category=${encodeURIComponent(threadCategory)}` : ""}${officialOnly ? "&official=1" : ""}`
  const { data: threadData, error: threadError, isLoading: threadLoading, mutate: mutateThreads } = useSWR<CommunityMatchRoomThreadResponse>(
    data?.fixture ? threadQuery : null,
    matchRoomFetcher,
    { revalidateOnFocus: true },
  )
  const fixture = data?.fixture || null
  const parentErrorCode = getApiErrorCode(error)
  const parentRequestId = getApiRequestId(error)
  const parentErrorView = getMatchHubErrorView({ isLoading, hasFixture: Boolean(fixture), hasError: Boolean(error), errorCode: parentErrorCode })
  const parentNotFound = parentErrorView === "not_found"
  const parentTransientError = parentErrorView === "transient_error"
  const posts = data?.posts || []
  const polls = posts.filter((post) => post.poll?.question)
  const threads = threadData?.items || data?.threads || []
  const stats = fixture ? data?.roomStats?.[fixture.id] : undefined
  const matchHighlights = fixture ? normalizeTimelineMatchEvents(fixture.events) : []
  const communityPulse = buildMatchHubCommunityPulse({
    messages: stats?.newRoomMessageCount || stats?.discussions,
    threads: threads.length || stats?.discussions,
    polls: stats?.polls || polls.length,
    fans: stats?.followers,
    highlights: matchHighlights.length,
    summaryStatus: data?.summary?.status,
  })
  const communityMilestones = getMatchHubMilestones(communityPulse)
  const overviewRecommendation = fixture ? getRecommendedRoom(fixture, stats, data?.channels || [], data?.demoOverride?.effectivePhase) : null
  const roomQueryState = normalizeMatchHubRoomQuery(searchParams.get("room"))
  const activeConversationRoom = roomQueryState.roomId
  const activeRoomType = conversationRoomToRoomType(activeConversationRoom)
  const activePreviewSide = getPreviewSideFromConversationRoom(activeConversationRoom)
  const activeReactionSide = getReactionSideFromConversationRoom(activeConversationRoom)
  const activeChannel = data?.channels?.find((channel) => channel.roomType === activeRoomType)
  const messageQuery = fixture && safeTab === "discussion" && activeChannel?.canRead
    ? `/community/match-room/messages?matchId=${encodeURIComponent(fixture.id)}&roomType=${encodeURIComponent(activeRoomType)}${activePreviewSide ? `&previewTeam=${encodeURIComponent(activePreviewSide)}` : ""}${activeReactionSide ? `&reactionTeam=${encodeURIComponent(activeReactionSide)}` : ""}&page=1&limit=25`
    : null
  const { data: messageData, error: messageFetchError, isLoading: messagesLoading, mutate: mutateMessages } = useSWR<MatchRoomMessagesResponse>(
    messageQuery,
    matchRoomFetcher,
    {
      refreshInterval: safeTab === "discussion" ? 20000 : 0,
      refreshWhenHidden: false,
      revalidateOnFocus: true,
    },
  )

  useEffect(() => {
    setMessages([])
    setMessagesPage(1)
    setMessagesTotalPages(1)
    setNewMessageCount(0)
    setReplyTarget(null)
    setEditingMessage(null)
    setSelectedTacticalTopic("")
    setMessagesError("")
    setHighlightedMessageId("")
  }, [matchId, activeConversationRoom])

  useEffect(() => {
    if (!messageData) return
    setMessages((current) => {
      const incoming = messageData.items || []
      const currentIds = new Set(current.map((item) => item.id))
      const unseen = incoming.filter((item) => !currentIds.has(item.id))
      if (current.length && unseen.length && !isNearMessageBottom()) {
        setNewMessageCount((count) => count + unseen.length)
        return mergeMainRoomMessages(current, incoming)
      }
      window.requestAnimationFrame(() => scrollMessagesToBottom())
      setNewMessageCount(0)
      return mergeMainRoomMessages(current, incoming)
    })
    setMessagesPage(1)
    setMessagesTotalPages(messageData.pagination.totalPages || 1)
    setMessagesError("")
  }, [messageData])

  useEffect(() => {
    if (messageFetchError) setMessagesError("โหลดข้อความไม่สำเร็จ กรุณาลองใหม่")
  }, [messageFetchError])

  useEffect(() => {
    if (safeTab !== "discussion" || !activeChannel?.isTemporary) return
    if (activeChannel.state !== "open" && activeChannel.state !== "closing") return
    const target = getRoomTargetTime(activeChannel)
    if (!target) return
    const timeout = window.setTimeout(() => {
      void mutateMessages()
    }, Math.max(1000, target - Date.now() + 500))
    return () => window.clearTimeout(timeout)
  }, [safeTab, activeChannel?.roomType, activeChannel?.state, activeChannel?.closesAt, activeChannel?.opensAt, mutate, mutateMessages])

  function changeTab(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  function changeConversationRoom(roomType: ConversationRoomId) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", "discussion")
    params.set("room", roomToQuery(roomType))
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  function openConversationView(view: "polls" | "summary" | "info") {
    if (view === "info") return
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", view)
    params.set("view", view)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  function isNearMessageBottom() {
    const element = messageListRef.current
    if (!element) return true
    return element.scrollHeight - element.scrollTop - element.clientHeight < 120
  }

  function scrollMessagesToBottom() {
    messageEndRef.current?.scrollIntoView({ block: "end" })
  }

  async function loadOlderMessages() {
    if (!fixture || loadingOlder || messagesPage >= messagesTotalPages) return
    const nextPage = messagesPage + 1
    setLoadingOlder(true)
    setMessagesError("")
    const list = messageListRef.current
    const previousHeight = list?.scrollHeight || 0
    try {
      const payload = await fetchJson<MatchRoomMessagesResponse>(
        `/community/match-room/messages?matchId=${encodeURIComponent(fixture.id)}&roomType=${encodeURIComponent(activeRoomType)}${activePreviewSide ? `&previewTeam=${encodeURIComponent(activePreviewSide)}` : ""}${activeReactionSide ? `&reactionTeam=${encodeURIComponent(activeReactionSide)}` : ""}&page=${nextPage}&limit=25`,
      )
      setMessages((current) => mergeMainRoomMessages(payload.items || [], current))
      setMessagesPage(nextPage)
      setMessagesTotalPages(payload.pagination.totalPages || messagesTotalPages)
      window.requestAnimationFrame(() => {
        if (list) list.scrollTop = list.scrollHeight - previousHeight
      })
    } catch (loadError) {
      setMessagesError(loadError instanceof Error ? loadError.message : "โหลดข้อความเก่าไม่สำเร็จ")
    } finally {
      setLoadingOlder(false)
    }
  }

  async function handleThreadImageSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!authToken) {
      setThreadFormError("กรุณาเข้าสู่ระบบสมาชิกก่อนอัปโหลดรูป")
      event.target.value = ""
      return
    }
    setThreadFormError("")
    setUploadingThreadImage(true)
    try {
      const formData = new FormData()
      formData.append("purpose", "upload")
      formData.append("files", file)
      const response = await fetch("/api/community/upload", { method: "POST", headers: { Authorization: `Bearer ${authToken}` }, body: formData })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || "อัปโหลดรูปไม่สำเร็จ")
      const media = payload?.media || payload?.items?.[0] || payload?.pendingItems?.[0]
      if (!media?.id) throw new Error("ไม่พบไฟล์ที่อัปโหลด")
      setThreadImage({
        id: String(media.id),
        url: typeof media.url === "string" ? media.url : null,
        ownerPreviewUrl: typeof media.ownerPreviewUrl === "string" ? media.ownerPreviewUrl : null,
        status: String(media.status || "approved"),
      })
    } catch (uploadError) {
      setThreadFormError(uploadError instanceof Error ? uploadError.message : "อัปโหลดรูปไม่สำเร็จ")
    } finally {
      setUploadingThreadImage(false)
      event.target.value = ""
    }
  }

  async function handleMessageImageSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!authToken) {
      setMessagesError("กรุณาเข้าสู่ระบบสมาชิกก่อนแนบรูป")
      event.target.value = ""
      return
    }
    setMessagesError("")
    setUploadingMessageImage(true)
    try {
      const formData = new FormData()
      formData.append("purpose", "upload")
      formData.append("files", file)
      const response = await fetch("/api/community/upload", { method: "POST", headers: { Authorization: `Bearer ${authToken}` }, body: formData })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || "อัปโหลดรูปไม่สำเร็จ")
      const media = payload?.media || payload?.items?.[0] || payload?.pendingItems?.[0]
      if (!media?.id) throw new Error("ไม่พบไฟล์ที่อัปโหลด")
      setMessageImage({
        id: String(media.id),
        url: typeof media.url === "string" ? media.url : null,
        ownerPreviewUrl: typeof media.ownerPreviewUrl === "string" ? media.ownerPreviewUrl : null,
        status: String(media.status || "approved"),
      })
    } catch (uploadError) {
      setMessagesError(uploadError instanceof Error ? uploadError.message : "อัปโหลดรูปไม่สำเร็จ")
    } finally {
      setUploadingMessageImage(false)
      event.target.value = ""
    }
  }

  async function sendRoomMessage() {
    if (!fixture || sendingMessage || !messageDraft.trim()) return
    if (!authToken) {
      setMessagesError("กรุณาเข้าสู่ระบบสมาชิกก่อนส่งข้อความใน Match Room")
      return
    }
    const draft = messageDraft.trim()
    const image = messageImage
    const reply = replyTarget
    const tacticalTopic = activeRoomType === "tactics" ? selectedTacticalTopic : ""
    const optimisticId = `optimistic-${Date.now()}`
    setSendingMessage(true)
    setMessagesError("")
    setMessageDraft("")
    setMessageImage(null)
    setReplyTarget(null)
    setMessages((current) => [
      ...current,
      {
        id: optimisticId,
        matchId: fixture.id,
        roomType: activeRoomType,
        previewTeam: activePreviewSide || "",
        reactionTeam: activeReactionSide || "",
        tacticalTopic,
        content: draft,
        replyToId: reply?.id,
        moderationStatus: "approved",
        status: "published",
        createdAt: new Date().toISOString(),
        timeAgo: "เมื่อสักครู่",
        images: image?.url || image?.ownerPreviewUrl ? [image.url || image.ownerPreviewUrl || ""] : [],
        isOwner: true,
        author: { name: "คุณ" },
      },
    ])
    window.requestAnimationFrame(() => scrollMessagesToBottom())
    try {
      const response = await fetchJson<{ item: MatchRoomMessage; moderationStatus: string }>("/community/match-room/messages", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          matchId: fixture.id,
          roomType: activeRoomType,
          previewTeam: activePreviewSide || "",
          reactionTeam: activeReactionSide || "",
          tacticalTopic,
          content: draft,
          replyToId: reply?.id || "",
          imageMediaIds: image ? [image.id] : [],
        }),
      })
      setMessages((current) => mergeMainRoomMessages(current.filter((item) => item.id !== optimisticId), [response.item]))
      await mutateMessages()
      void mutate()
      window.requestAnimationFrame(() => scrollMessagesToBottom())
    } catch (sendError) {
      setMessages((current) => current.filter((item) => item.id !== optimisticId))
      setMessageDraft(draft)
      setMessageImage(image)
      setReplyTarget(reply)
      setSelectedTacticalTopic(tacticalTopic)
      const errorCode = typeof sendError === "object" && sendError && "code" in sendError ? String((sendError as any).code || "") : ""
      if (errorCode === "ROOM_CLOSED") {
        setShowDraftMoveDialog(true)
        await mutateMessages()
        void mutate()
      }
      const isAuthError =
        errorCode === "AUTHENTICATION_REQUIRED" ||
        (sendError instanceof Error && /authentication required|unauthorized/i.test(sendError.message))
      setMessagesError(isAuthError ? "session หมดหรือยังไม่ได้เข้าสู่ระบบสมาชิก กรุณาเข้าสู่ระบบใหม่ก่อนส่งข้อความ" : sendError instanceof Error ? sendError.message : "ส่งข้อความไม่สำเร็จ")
    } finally {
      setSendingMessage(false)
    }
  }

  async function saveMessageEdit() {
    if (!fixture || !editingMessage || !editMessageDraft.trim()) return
    setSendingMessage(true)
    setMessagesError("")
    try {
      await fetchJson(`/community/match-room/messages/${editingMessage.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          matchId: fixture.id,
          roomType: activeRoomType,
          previewTeam: activePreviewSide || "",
          reactionTeam: activeReactionSide || "",
          content: editMessageDraft,
        }),
      })
      setMessages((current) => current.map((item) => item.id === editingMessage.id ? { ...item, content: editMessageDraft.trim(), isEdited: true } : item))
      setEditingMessage(null)
      setEditMessageDraft("")
      await mutateMessages()
    } catch (editError) {
      const errorCode = typeof editError === "object" && editError && "code" in editError ? String((editError as any).code || "") : ""
      if (errorCode === "ROOM_CLOSED") {
        setShowDraftMoveDialog(true)
        setMessageDraft(editMessageDraft.trim())
        setEditingMessage(null)
        setEditMessageDraft("")
        await mutateMessages()
        void mutate()
      }
      setMessagesError(editError instanceof Error ? editError.message : "แก้ไขข้อความไม่สำเร็จ")
    } finally {
      setSendingMessage(false)
    }
  }

  async function deleteRoomMessage(message: MatchRoomMessage) {
    if (!fixture) return
    if (!window.confirm("ลบข้อความนี้ใช่ไหม?")) return
    setMessagesError("")
    try {
      await fetchJson(`/community/match-room/messages/${message.id}?matchId=${encodeURIComponent(fixture.id)}&roomType=${encodeURIComponent(activeRoomType)}${activePreviewSide ? `&previewTeam=${encodeURIComponent(activePreviewSide)}` : ""}${activeReactionSide ? `&reactionTeam=${encodeURIComponent(activeReactionSide)}` : ""}`, {
        method: "DELETE",
      })
      setMessages((current) => current.filter((item) => item.id !== message.id))
      await mutateMessages()
    } catch (deleteError) {
      setMessagesError(deleteError instanceof Error ? deleteError.message : "ลบข้อความไม่สำเร็จ")
    }
  }

  async function reportRoomMessage(message: MatchRoomMessage) {
    if (!fixture) return
    const reason = window.prompt("เหตุผลที่รายงาน: spam, harassment, inappropriate, misinformation, gambling, other", "other")
    if (!reason) return
    setMessagesError("")
    try {
      await fetchJson(`/community/match-room/messages/${message.id}/report`, {
        method: "POST",
        body: JSON.stringify({ matchId: fixture.id, reason }),
      })
    } catch (reportError) {
      setMessagesError(reportError instanceof Error ? reportError.message : "รายงานข้อความไม่สำเร็จ")
    }
  }

  function copyRoomMessageLink(message: MatchRoomMessage) {
    const url = `${window.location.origin}${pathname}?tab=discussion&room=${roomToQuery(activeConversationRoom)}#message-${message.id}`
    void navigator.clipboard?.writeText(url)
  }

  function jumpToRoomMessage(messageId: string) {
    const target = document.getElementById(`message-${messageId}`)
    if (!target) return
    target.scrollIntoView({ block: "center", behavior: "smooth" })
    setHighlightedMessageId(messageId)
    window.setTimeout(() => {
      setHighlightedMessageId((current) => (current === messageId ? "" : current))
    }, 1600)
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return
    event.preventDefault()
    void sendRoomMessage()
  }

  function moveDraftToMainRoom() {
    setShowDraftMoveDialog(false)
    setReplyTarget(null)
    changeConversationRoom("main")
  }

  function copyDraftToClipboard() {
    void navigator.clipboard?.writeText(messageDraft)
    setShowDraftMoveDialog(false)
  }

  async function handleCreateThread() {
    setThreadFormError("")
    if (!fixture) return
    setCreatingThread(true)
    try {
      await fetchJson("/community/match-room/threads", {
        method: "POST",
        body: JSON.stringify({
          matchId: fixture.id,
          title: threadTitle,
          content: threadContent,
          threadCategory: threadFormCategory,
          imageMediaIds: threadImage ? [threadImage.id] : [],
        }),
      })
      setThreadTitle("")
      setThreadContent("")
      setThreadFormCategory("general")
      setThreadImage(null)
      setShowCreateThread(false)
      changeTab("threads")
      await Promise.all([mutateThreads(), mutate()])
    } catch (createError) {
      setThreadFormError(createError instanceof Error ? createError.message : "สร้างหัวข้อไม่สำเร็จ")
    } finally {
      setCreatingThread(false)
    }
  }

  async function handleTogglePin(thread: CommunityMatchRoomPost) {
    if (!fixture) return
    setPinningThreadId(thread.id)
    try {
      await fetchJson(`/community/match-room/threads/${thread.id}?matchId=${encodeURIComponent(fixture.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ isPinned: !Boolean((thread as any).isPinned) }),
      })
      await mutateThreads()
    } catch (pinError) {
      setThreadFormError(pinError instanceof Error ? pinError.message : "อัปเดต pin ไม่สำเร็จ")
    } finally {
      setPinningThreadId(null)
    }
  }

  async function handleToggleOfficial(thread: CommunityMatchRoomPost) {
    if (!fixture) return
    setPinningThreadId(thread.id)
    try {
      await fetchJson(`/community/match-room/threads/${thread.id}?matchId=${encodeURIComponent(fixture.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ isPinned: Boolean((thread as any).isPinned), isOfficialThread: !Boolean((thread as any).isOfficialThread) }),
      })
      await mutateThreads()
    } catch (officialError) {
      setThreadFormError(officialError instanceof Error ? officialError.message : "อัปเดต Official ไม่สำเร็จ")
    } finally {
      setPinningThreadId(null)
    }
  }

  function openEditThread(thread: CommunityMatchRoomPost) {
    setEditingThread(thread)
    setEditThreadTitle(thread.title || "")
    setEditThreadContent(thread.content || thread.excerpt || "")
    setEditThreadCategory((thread as any).threadCategory || "general")
  }

  async function handleSaveThreadEdit() {
    if (!fixture || !editingThread) return
    setSavingThreadEdit(true)
    setThreadFormError("")
    try {
      await fetchJson(`/community/match-room/threads/${editingThread.id}?matchId=${encodeURIComponent(fixture.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editThreadTitle,
          content: editThreadContent,
          threadCategory: editThreadCategory,
        }),
      })
      setEditingThread(null)
      await Promise.all([mutateThreads(), mutate()])
    } catch (editError) {
      setThreadFormError(editError instanceof Error ? editError.message : "แก้ไขหัวข้อไม่สำเร็จ")
    } finally {
      setSavingThreadEdit(false)
    }
  }

  async function handleDeleteThread(thread: CommunityMatchRoomPost) {
    if (!fixture) return
    if (!window.confirm(`ลบหัวข้อ "${thread.title}" ใช่ไหม?`)) return
    setPinningThreadId(thread.id)
    try {
      await fetchJson(`/community/match-room/threads/${thread.id}?matchId=${encodeURIComponent(fixture.id)}`, {
        method: "DELETE",
      })
      await Promise.all([mutateThreads(), mutate()])
    } catch (deleteError) {
      setThreadFormError(deleteError instanceof Error ? deleteError.message : "ลบหัวข้อไม่สำเร็จ")
    } finally {
      setPinningThreadId(null)
    }
  }

  async function handleReportThread(thread: CommunityMatchRoomPost) {
    const reason = window.prompt("เหตุผลที่รายงาน: spam, harassment, inappropriate, misinformation, gambling, other", "other")
    if (!reason) return
    try {
      await fetchJson(`/community/posts/${thread.id}/report`, {
        method: "POST",
        body: JSON.stringify({ reason, description: "" }),
      })
    } catch (reportError) {
      setThreadFormError(reportError instanceof Error ? reportError.message : "รายงานหัวข้อไม่สำเร็จ")
    }
  }

  async function handleRegenerateSummary() {
    if (!fixture) return
    setRegeneratingSummary(true)
    setThreadFormError("")
    try {
      await fetchJson("/community/match-room/summary", {
        method: "POST",
        body: JSON.stringify({ matchId: fixture.id }),
      })
      await mutate()
    } catch (summaryError) {
      setThreadFormError(summaryError instanceof Error ? summaryError.message : "สร้าง AI Summary ไม่สำเร็จ")
    } finally {
      setRegeneratingSummary(false)
    }
  }

  async function handleOpenSummaryHistory() {
    if (!fixture) return
    setShowSummaryHistory(true)
    setLoadingSummaryHistory(true)
    setSummaryHistoryError("")
    try {
      const history = await fetchJson<MatchRoomSummaryHistoryResponse>(`/community/match-room/summary?matchId=${encodeURIComponent(fixture.id)}&limit=10`)
      setSummaryHistory(history)
    } catch (historyError) {
      setSummaryHistoryError(historyError instanceof Error ? historyError.message : "โหลดประวัติ Summary ไม่สำเร็จ")
    } finally {
      setLoadingSummaryHistory(false)
    }
  }

  async function handleToggleFollow(fixture: CommunityMatchRoomFixture, nextFollow: boolean) {
    setFollowingBusyId(fixture.id)
    setThreadFormError("")
    const previous = data
    await mutate(
      previous
        ? {
            ...previous,
            matchRoomState: { ...(previous.matchRoomState || { followedMatchIds: [], recentMatchIds: [], isFollowing: false }), isFollowing: nextFollow },
            roomStats: {
              ...previous.roomStats,
              [fixture.id]: {
                ...(previous.roomStats?.[fixture.id] || { discussions: 0, polls: 0 }),
                isFollowing: nextFollow,
                followers: Math.max(0, Number(previous.roomStats?.[fixture.id]?.followers || 0) + (nextFollow ? 1 : -1)),
              },
            },
          }
        : previous,
      false,
    )
    try {
      await fetchJson("/community/match-room/follow", {
        method: "POST",
        body: JSON.stringify({ matchId: fixture.id, follow: nextFollow }),
      })
      await mutate()
    } catch (followError) {
      setThreadFormError(followError instanceof Error ? followError.message : "อัปเดตการติดตามไม่สำเร็จ")
      await mutate(previous, false)
    } finally {
      setFollowingBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background px-3 py-5 text-foreground sm:px-5 lg:px-6">
      <main className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" className="rounded-full border-border bg-card">
            <Link href="/community/matches">← กลับ Match Rooms</Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-full text-muted-foreground">
            <Link href="/community">Feed</Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-full text-muted-foreground">
            <Link href="/community/messages">Messages</Link>
          </Button>
        </div>

        {isLoading && !fixture ? (
          <div className="flex min-h-[50vh] items-center justify-center rounded-[32px] border border-border bg-card text-muted-foreground">
            <Loader2 className="mr-3 h-5 w-5 animate-spin text-primary" />
            กำลังโหลด Match Room...
          </div>
        ) : null}

        {parentTransientError ? (
          <Card className="rounded-[28px] border-destructive/30 bg-destructive/10">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
              <div>
                <p className="text-destructive">โหลดข้อมูล Match Hub ล่าสุดไม่สำเร็จ กรุณาลองใหม่</p>
                {fixture ? <p className="mt-1 text-xs text-muted-foreground">ยังแสดงข้อมูลล่าสุดที่โหลดสำเร็จไว้ก่อน</p> : null}
                {parentRequestId ? <p className="mt-1 text-xs text-muted-foreground">requestId: {parentRequestId}</p> : null}
              </div>
              <Button variant="outline" onClick={() => void mutate()} className="rounded-full border-border">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {(!isLoading && !error && !fixture) || parentNotFound ? (
          <Card className="rounded-[28px] border-dashed border-border bg-card">
            <CardContent className="py-16 text-center">
              <h1 className="text-2xl font-semibold">ไม่พบ Match Room นี้</h1>
              <p className="mt-2 text-sm text-muted-foreground">ระบบจะไม่ fallback ไปแมตช์อื่น เพื่อป้องกันข้อมูลผิดห้อง</p>
              <Button asChild className="mt-5 rounded-full">
                <Link href="/community/matches">กลับไปเลือก Match Room</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {fixture ? (
          <>
            <MatchHero fixture={fixture} stats={data?.roomStats?.[fixture.id]} channels={data?.channels || []} summary={data?.summary} demoOverride={data?.demoOverride} onToggleFollow={handleToggleFollow} followingBusy={followingBusyId === fixture.id} />

            <Tabs value={safeTab} onValueChange={changeTab} className="space-y-4">
              <div className="overflow-x-auto pb-1">
                <TabsList className="h-12 rounded-full border border-border bg-card p-1">
                  {roomTabs.map((tab) => (
                    <TabsTrigger key={tab.id} value={tab.id} className="rounded-full px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value="overview">
                <div className="space-y-5">
                  <MatchCommunityExperience
                    fixture={fixture}
                    stats={stats}
                    pulse={communityPulse}
                    milestones={communityMilestones}
                    highlights={matchHighlights}
                    threads={threads}
                    polls={polls}
                    summary={data?.summary}
                    recommendation={overviewRecommendation}
                    onOpenRoom={changeConversationRoom}
                    onOpenThreads={() => changeTab("threads")}
                    onOpenPolls={() => changeTab("polls")}
                    onOpenSummary={() => changeTab("summary")}
                  />
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-5">
                    <Card className="rounded-[28px] border-border bg-card">
                      <CardContent className="space-y-3 p-5">
                        <div className="flex items-center gap-2 text-primary">
                          <Sparkles className="h-5 w-5" />
                          <h2 className="text-xl font-bold text-foreground">AI Summary Preview</h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary">{getSummaryStatusLabel(data?.summary)}</Badge>
                          {data?.summary?.isStale ? <Badge variant="outline" className="rounded-full border-amber-500/30 text-amber-700 dark:text-amber-200">ข้อมูลมีการอัปเดต</Badge> : null}
                        </div>
                        <h3 className="text-2xl font-semibold">{data?.summary?.headline || MATCH_HUB_EMPTY_STATES.summary}</h3>
                        <p className="leading-7 text-muted-foreground">{data?.summary?.shortSummary || data?.summary?.text || "The hub will show the fact-only AI summary when match data is ready."}</p>
                        <Button type="button" variant="outline" onClick={() => changeTab("summary")} className="rounded-full border-border">ดูสรุปเต็ม</Button>
                      </CardContent>
                    </Card>

                    <Card className="rounded-[28px] border-border bg-card">
                      <CardContent className="p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h2 className="text-xl font-bold">Discussion ล่าสุด</h2>
                          <Button asChild variant="outline" className="rounded-full border-border bg-card">
                            <Link href={`/community?matchId=${encodeURIComponent(fixture.id)}&compose=1`}>เริ่มโพสต์</Link>
                          </Button>
                        </div>
                        {posts.length ? (
                          <div className="mt-4 space-y-3">
                            {posts.slice(0, 3).map((post) => (
                              <Link key={post.id} href={`/community/${post.id}`} className="block rounded-2xl border border-border bg-surface-2 p-4 transition hover:border-primary/40">
                                <p className="font-semibold text-foreground">{post.title}</p>
                                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-4 text-sm text-muted-foreground">ยังไม่มีใครเริ่มพูดคุยเกี่ยวกับเกมนี้</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  <aside className="space-y-5">
                    <Card className="rounded-[28px] border-border bg-card">
                      <CardContent className="p-5">
                        <h2 className="text-lg font-bold">Thread preview</h2>
                        {threads[0] ? (
                          <div className="mt-4 space-y-2 rounded-2xl border border-border bg-surface-2 p-4">
                            <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">{(threads[0] as any).threadCategoryLabel || "ทั่วไป"}</Badge>
                            <p className="font-semibold">{threads[0].title}</p>
                            <p className="line-clamp-2 text-sm text-muted-foreground">{threads[0].excerpt}</p>
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-muted-foreground">ยังไม่มีหัวข้อสนทนาใน Match Room นี้</p>
                        )}
                      </CardContent>
                    </Card>
                    <Card className="rounded-[28px] border-border bg-card">
                      <CardContent className="p-5">
                        <h2 className="text-lg font-bold">Poll preview</h2>
                        {polls[0]?.poll ? <p className="mt-3 text-sm text-muted-foreground">{polls[0].poll.question}</p> : <p className="mt-3 text-sm text-muted-foreground">{MATCH_HUB_EMPTY_STATES.polls}</p>}
                        <Button type="button" variant="outline" onClick={() => changeTab("polls")} className="mt-4 rounded-full border-border">ดู Poll</Button>
                      </CardContent>
                    </Card>
                  </aside>
                </div>
                </div>
              </TabsContent>

              <TabsContent value="discussion">
                <MatchRoomConversation
                  fixture={fixture}
                  data={data}
                  activeRoomId={activeConversationRoom}
                  activeChannel={messageData?.room || activeChannel}
                  legacyRoomNotice={roomQueryState.notice}
                  messages={messages}
                  messagesLoading={messagesLoading}
                  messagesError={messagesError}
                  messagesPage={messagesPage}
                  messagesTotalPages={messagesTotalPages}
                  loadingOlder={loadingOlder}
                  newMessageCount={newMessageCount}
                  messageDraft={messageDraft}
                  replyTarget={replyTarget}
                  editingMessage={editingMessage}
                  editMessageDraft={editMessageDraft}
                  sendingMessage={sendingMessage}
                  uploadingMessageImage={uploadingMessageImage}
                  messageImage={messageImage}
                  isAuthenticated={Boolean(authToken)}
                  messageListRef={messageListRef}
                  messageEndRef={messageEndRef}
                  selectedTacticalTopic={selectedTacticalTopic}
                  polls={polls}
                  threads={threads}
                  onChangeRoom={changeConversationRoom}
                  onOpenView={openConversationView}
                  onRetry={() => void mutateMessages()}
                  onLoadOlder={() => void loadOlderMessages()}
                  onJumpToLatest={() => {
                    setNewMessageCount(0)
                    scrollMessagesToBottom()
                  }}
                  onDraftChange={setMessageDraft}
                  onDraftKeyDown={handleComposerKeyDown}
                  onImageSelected={handleMessageImageSelected}
                  onClearImage={() => setMessageImage(null)}
                  onSelectTacticalTopic={setSelectedTacticalTopic}
                  onOpenTacticalThreads={() => {
                    setThreadCategory("tactics")
                    setThreadFormCategory("tactics")
                    setShowCreateThread(true)
                    changeTab("threads")
                  }}
                  onSend={() => void sendRoomMessage()}
                  onReply={setReplyTarget}
                  onCancelReply={() => setReplyTarget(null)}
                  onEdit={(message) => {
                    setEditingMessage(message)
                    setEditMessageDraft(message.content || "")
                  }}
                  onEditDraftChange={setEditMessageDraft}
                  onSaveEdit={() => void saveMessageEdit()}
                  onCancelEdit={() => {
                    setEditingMessage(null)
                    setEditMessageDraft("")
                  }}
                  onDelete={(message) => void deleteRoomMessage(message)}
                  onReport={(message) => void reportRoomMessage(message)}
                  onCopy={copyRoomMessageLink}
                  highlightedMessageId={highlightedMessageId}
                  onJumpToMessage={jumpToRoomMessage}
                />
              </TabsContent>

              <TabsContent value="threads">
                <Card className="rounded-[28px] border-border bg-card">
                  <CardContent className="space-y-5 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-bold">หัวข้อสนทนา</h2>
                        <p className="mt-1 text-sm text-muted-foreground">เปิดประเด็นคุยเฉพาะเกมนี้แบบแยกหัวข้อชัดเจน</p>
                      </div>
                      <Button type="button" onClick={() => setShowCreateThread(true)} className="rounded-full">
                        <Plus className="mr-2 h-4 w-4" />
                        สร้างหัวข้อสนทนา
                      </Button>
                    </div>

                    <div className="grid gap-3 rounded-[24px] border border-border bg-surface-2 p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                      <div className="flex flex-wrap gap-2">
                        {threadSortOptions.map((option) => (
                          <Button
                            key={option.id}
                            type="button"
                            variant={threadSort === option.id ? "default" : "outline"}
                            onClick={() => setThreadSort(option.id)}
                            className="rounded-full"
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                      <Button type="button" variant={officialOnly ? "default" : "outline"} onClick={() => setOfficialOnly((value) => !value)} className="rounded-full">
                        Official / Pinned
                      </Button>
                      <div className="flex flex-wrap gap-2 lg:col-span-2">
                        {threadCategories.map((option) => (
                          <Button
                            key={option.id}
                            type="button"
                            variant={threadCategory === option.id ? "default" : "outline"}
                            onClick={() => setThreadCategory(option.id)}
                            className="rounded-full"
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {threadFormError ? <p className="text-sm text-destructive">{threadFormError}</p> : null}
                    {threadLoading ? (
                      <div className="rounded-2xl border border-border bg-muted p-5 text-sm text-muted-foreground">
                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin text-primary" />
                        กำลังโหลดหัวข้อสนทนา...
                      </div>
                    ) : threadError ? (
                      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
                        โหลดหัวข้อไม่สำเร็จ
                        <Button type="button" variant="outline" onClick={() => void mutateThreads()} className="ml-3 rounded-full border-border">Retry</Button>
                      </div>
                    ) : threads.length ? (
                      <div className="space-y-4">
                        {threads.map((thread) => (
                          <ThreadCard
                            key={thread.id}
                            item={thread as any}
                            matchId={fixture.id}
                            showPinButton={Boolean((thread as any).canModerate)}
                            onTogglePin={handleTogglePin}
                            onToggleOfficial={handleToggleOfficial}
                            onEdit={openEditThread}
                            onDelete={handleDeleteThread}
                            onReport={handleReportThread}
                            pinningId={pinningThreadId}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border bg-muted p-8 text-center text-sm text-muted-foreground">
                        ยังไม่มีหัวข้อสนทนา ลองสร้างหัวข้อที่คุณสนใจ
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="polls">
                <Card className="rounded-[28px] border-border bg-card">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-xl font-bold">โหวต</h2>
                      {fixture.isFinished ? (
                        <Button asChild className="rounded-full">
                          <Link href={`/community?matchId=${encodeURIComponent(fixture.id)}&compose=poll`}>
                            <Bell className="mr-2 h-4 w-4" />
                            Poll หลังเกม
                          </Link>
                        </Button>
                      ) : (
                        <Button disabled className="rounded-full">
                          <Bell className="mr-2 h-4 w-4" />
                          Poll หลังเกม
                        </Button>
                      )}
                    </div>
                    <div className="rounded-2xl border border-dashed border-primary/25 bg-primary/8 p-4">
                      <Badge className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] text-primary hover:bg-primary/15">
                        โหวตอย่างเป็นทางการของ Match Room
                      </Badge>
                      <p className="mt-2 text-sm font-semibold text-foreground">ยังไม่มี Official Poll</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        ระบบจะไม่สร้าง Official Poll จากข้อมูลเดา ต้องมี lineup หรือ match events จริงก่อนจึงจะแสดงในส่วนนี้
                      </p>
                    </div>
                    {polls.length ? polls.map((post) => (
                      <Link key={post.id} href={`/community/${post.id}`} className="block rounded-2xl border border-border bg-surface-2 p-4 transition hover:border-primary/40">
                        <Badge variant="outline" className="mb-2 rounded-full border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                          Poll จาก Community
                        </Badge>
                        <p className="font-semibold">{post.poll?.question}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{post.poll?.totalVotes || 0} votes • จากโพสต์ {post.title}</p>
                      </Link>
                    )) : <p className="text-sm text-muted-foreground">{MATCH_HUB_EMPTY_STATES.polls}</p>}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="summary">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <Card className="rounded-[28px] border-border bg-card">
                    <CardContent className="space-y-5 p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="rounded-full bg-primary text-primary-foreground hover:bg-primary">AI</Badge>
                            <Badge variant="outline" className="rounded-full border-border text-muted-foreground">{getSummaryStatusLabel(data?.summary)}</Badge>
                            {data?.summary?.isStale ? <Badge variant="outline" className="rounded-full border-amber-500/30 text-amber-700 dark:text-amber-200">ข้อมูลการแข่งขันมีการอัปเดต</Badge> : null}
                          </div>
                          <h2 className="mt-3 text-3xl font-bold text-foreground">สรุปเกมโดย AI</h2>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {data?.summary?.generatedAt ? `Generated: ${new Date(data.summary.generatedAt).toLocaleString("th-TH")}` : MATCH_HUB_EMPTY_STATES.summary}
                          </p>
                        </div>
                        {data?.summaryPermissions?.canRegenerate ? (
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" onClick={() => void handleOpenSummaryHistory()} className="rounded-full border-border">
                              <CalendarClock className="mr-2 h-4 w-4" />
                              ดูประวัติ
                            </Button>
                            <Button type="button" onClick={() => void handleRegenerateSummary()} disabled={regeneratingSummary} className="rounded-full">
                              {regeneratingSummary ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                              Refresh
                            </Button>
                          </div>
                        ) : null}
                      </div>

                      <div className="grid gap-3 rounded-[22px] border border-border bg-surface-2 p-4 text-xs text-muted-foreground sm:grid-cols-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">Version</p>
                          <p className="mt-1 font-semibold text-foreground">v{data?.summary?.summaryVersion || "0"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">Source</p>
                          <p className="mt-1 font-semibold text-foreground">{shortVersionHash(data?.summary?.sourceDataVersion)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">Provider</p>
                          <p className="mt-1 font-semibold text-foreground">{data?.summary?.providerStatus || "template"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">Mode</p>
                          <p className="mt-1 font-semibold text-foreground">{data?.summary?.source || "template"}</p>
                        </div>
                      </div>

                      {data?.summary?.isStale ? (
                        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-100">
                          ข้อมูลการแข่งขันหรือ Community aggregate มีการอัปเดต สรุปเก่ายังอ่านได้ แต่แอดมินสามารถ Refresh เพื่อสร้างใหม่
                        </div>
                      ) : null}

                      <div className="rounded-[24px] border border-primary/20 bg-primary/10 p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Headline</p>
                        <h3 className="mt-2 text-2xl font-semibold text-foreground">{data?.summary?.headline || MATCH_HUB_EMPTY_STATES.summary}</h3>
                        <p className="mt-3 leading-7 text-muted-foreground">{data?.summary?.shortSummary || data?.summary?.text || "The hub will show a fact-only summary when verified server match data is ready."}</p>
                      </div>

                      {data?.summary?.matchStory ? (
                        <div className="rounded-[22px] border border-border bg-surface-2 p-4">
                          <h3 className="text-base font-semibold text-foreground">เรื่องราวของเกม</h3>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{data.summary.matchStory}</p>
                        </div>
                      ) : null}

                      <SummaryListSection title="Timeline จุดสำคัญ" items={data?.summary?.keyMoments} />
                      {data?.summary?.turningPoint ? (
                        <div className="rounded-[22px] border border-border bg-surface-2 p-4">
                          <h3 className="text-base font-semibold text-foreground">จุดเปลี่ยนเกม</h3>
                          <p className="mt-3 text-sm leading-7 text-muted-foreground">{data.summary.turningPoint}</p>
                        </div>
                      ) : null}
                      <SummaryListSection title="สถิติเด่น" items={data?.summary?.statisticsHighlights} />
                      <SummaryListSection title="ผู้เล่นโดดเด่น" items={data?.summary?.topPlayers} />
                      {data?.summary?.tacticalSummary ? (
                        <div className="rounded-[22px] border border-border bg-surface-2 p-4">
                          <h3 className="text-base font-semibold text-foreground">มุมแท็กติก</h3>
                          <p className="mt-3 text-sm leading-7 text-muted-foreground">{data.summary.tacticalSummary}</p>
                        </div>
                      ) : null}
                      <SummaryListSection title="ข้อจำกัดของข้อมูล" items={data?.summary?.limitations} />
                      <p className="rounded-2xl border border-border bg-muted p-4 text-xs leading-6 text-muted-foreground">
                        {data?.summary?.disclaimer || "Community reactions เป็นความคิดเห็นจากผู้ใช้ ไม่ใช่ข้อเท็จจริงของการแข่งขัน"}
                      </p>
                      {threadFormError ? <p className="text-sm text-destructive">{threadFormError}</p> : null}
                    </CardContent>
                  </Card>

                  <aside className="space-y-5">
                    <FanReactionCard
                      fanReaction={data?.summary?.fanReaction || data?.fanReaction}
                      onOpenPolls={() => changeTab("polls")}
                      onOpenThreads={() => changeTab("threads")}
                    />
                    <Card className="rounded-[28px] border-border bg-card">
                      <CardContent className="space-y-3 p-5">
                        <h3 className="text-lg font-bold">แหล่งข้อมูลที่ใช้</h3>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline" className="rounded-full border-border">Server score</Badge>
                          <Badge variant="outline" className="rounded-full border-border">Approved polls</Badge>
                          <Badge variant="outline" className="rounded-full border-border">Approved threads</Badge>
                          <Badge variant="outline" className="rounded-full border-border">Approved comments</Badge>
                        </div>
                        <p className="text-xs leading-6 text-muted-foreground">
                          สกอร์ ผู้เล่น และเหตุการณ์มาจาก server facts เท่านั้น Community comment ไม่สามารถเปลี่ยน facts ของเกมได้
                        </p>
                      </CardContent>
                    </Card>
                  </aside>
                </div>
              </TabsContent>
            </Tabs>

            <Dialog open={showSummaryHistory} onOpenChange={setShowSummaryHistory}>
              <DialogContent className="max-h-[82vh] max-w-2xl overflow-hidden rounded-[28px] border-border/60 bg-popover p-0 text-popover-foreground">
                <DialogHeader className="border-b border-border/60 px-6 py-5">
                  <DialogTitle>ประวัติ AI Summary</DialogTitle>
                  <DialogDescription>แสดงเฉพาะ metadata ของการสร้างสรุป ไม่เก็บ prompt, API payload หรือคอมเมนต์ดิบ</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 overflow-y-auto px-6 py-5">
                  {loadingSummaryHistory ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted p-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      กำลังโหลดประวัติ...
                    </div>
                  ) : null}
                  {summaryHistoryError ? <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{summaryHistoryError}</p> : null}
                  {summaryHistory?.current ? (
                    <div className="grid gap-3 rounded-2xl border border-primary/20 bg-primary/8 p-4 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Current status</p>
                        <p className="font-semibold text-foreground">{summaryHistory.current.status} · v{summaryHistory.current.summaryVersion}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Source version</p>
                        <p className="font-semibold text-foreground">{shortVersionHash(summaryHistory.current.sourceDataVersion)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Generated by</p>
                        <p className="font-semibold text-foreground">{summaryHistory.current.generatedBy?.name || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Provider</p>
                        <p className="font-semibold text-foreground">{summaryHistory.current.providerStatus}</p>
                      </div>
                    </div>
                  ) : null}
                  {summaryHistory?.history?.length ? (
                    <div className="space-y-3">
                      {summaryHistory.history.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-border bg-surface-2 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="rounded-full border-primary/25 bg-primary/10 text-primary">
                                {getSummaryHistoryActionLabel(item.action)}
                              </Badge>
                              <Badge variant="outline" className="rounded-full border-border text-muted-foreground">
                                {item.result}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">{new Date(item.requestedAt).toLocaleString("th-TH")}</span>
                          </div>
                          <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                            <span>v{item.previousSummaryVersion} → v{item.newSummaryVersion}</span>
                            <span>{item.mode} / {item.providerStatus}</span>
                            <span>{item.durationMs}ms</span>
                          </div>
                          {item.reason ? <p className="mt-2 text-xs text-muted-foreground">{item.reason}</p> : null}
                        </div>
                      ))}
                    </div>
                  ) : !loadingSummaryHistory ? (
                    <p className="rounded-2xl border border-dashed border-border bg-muted p-5 text-sm text-muted-foreground">ยังไม่มีประวัติการ regenerate</p>
                  ) : null}
                </div>
                <DialogFooter className="border-t border-border/60 px-6 py-4">
                  <Button type="button" variant="outline" onClick={() => setShowSummaryHistory(false)} className="rounded-full border-border">
                    ปิด
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showDraftMoveDialog} onOpenChange={setShowDraftMoveDialog}>
              <DialogContent className="max-w-md rounded-[28px] border-border/60 bg-popover text-popover-foreground">
                <DialogHeader>
                  <DialogTitle>ห้องนี้ปิดแล้ว</DialogTitle>
                  <DialogDescription>
                    ระบบเก็บข้อความที่คุณพิมพ์ไว้ชั่วคราว ต้องการย้ายข้อความไปเขียนต่อในห้องหลักหรือไม่
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex-col gap-2 sm:flex-row">
                  <Button type="button" onClick={moveDraftToMainRoom} className="rounded-full">
                    ย้ายไปห้องหลัก
                  </Button>
                  <Button type="button" variant="outline" onClick={copyDraftToClipboard} className="rounded-full border-border">
                    คัดลอกข้อความ
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowDraftMoveDialog(false)} className="rounded-full">
                    ยกเลิก
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showCreateThread} onOpenChange={setShowCreateThread}>
              <DialogContent className="max-h-[88vh] max-w-2xl overflow-hidden rounded-[28px] border-border/60 bg-popover p-0 text-popover-foreground">
                <DialogHeader className="border-b border-border/60 px-6 py-5">
                  <DialogTitle>สร้างหัวข้อสนทนา</DialogTitle>
                  <DialogDescription>หัวข้อนี้จะถูกผูกกับ Match Room ปัจจุบันอัตโนมัติ และจะผ่าน moderation เดิมก่อนเผยแพร่</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 overflow-y-auto px-6 py-5">
                  <Input value={threadTitle} onChange={(event) => setThreadTitle(event.target.value)} placeholder="หัวข้อสนทนา" className="h-12 rounded-2xl border-border bg-input-background" />
                  <Textarea value={threadContent} onChange={(event) => setThreadContent(event.target.value)} placeholder="อยากชวนคุยประเด็นไหนเกี่ยวกับเกมนี้..." className="min-h-32 rounded-2xl border-border bg-input-background" />
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(COMMUNITY_THREAD_CATEGORY_LABELS).map(([id, label]) => (
                      <Button key={id} type="button" variant={threadFormCategory === id ? "default" : "outline"} onClick={() => setThreadFormCategory(id)} className="rounded-full">
                        {label}
                      </Button>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-dashed border-border bg-muted p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">รูปประกอบหัวข้อ</p>
                        <p className="text-sm text-muted-foreground">แนบได้ 1 รูป ระบบจะตรวจสื่อก่อนเหมือนโพสต์ปกติ</p>
                      </div>
                      <label className="inline-flex cursor-pointer items-center rounded-full border border-border bg-card px-4 py-2 text-sm">
                        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleThreadImageSelected} />
                        {uploadingThreadImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        เลือกรูป
                      </label>
                    </div>
                    {threadImage ? (
                      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-surface-2 p-3">
                        <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-border">
                          <Image src={threadImage.url || threadImage.ownerPreviewUrl || ""} alt="thread upload" fill className="object-cover" unoptimized />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>สถานะ: {threadImage.status === "pending_review" ? "รอตรวจสอบ" : "พร้อมใช้งาน"}</p>
                          <button type="button" onClick={() => setThreadImage(null)} className="mt-1 text-xs text-primary">
                            ลบรูปนี้
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {threadFormError ? <p className="text-sm text-destructive">{threadFormError}</p> : null}
                </div>
                <DialogFooter className="border-t border-border/60 px-6 py-5 sm:justify-between">
                  <Button type="button" variant="outline" onClick={() => setShowCreateThread(false)} className="rounded-full border-border">
                    ยกเลิก
                  </Button>
                  <Button type="button" onClick={() => void handleCreateThread()} disabled={creatingThread} className="rounded-full">
                    {creatingThread ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    สร้างหัวข้อ
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={Boolean(editingThread)} onOpenChange={(open) => (!open ? setEditingThread(null) : null)}>
              <DialogContent className="max-w-2xl rounded-[28px] border-border bg-popover text-popover-foreground">
                <DialogHeader>
                  <DialogTitle>แก้ไขหัวข้อสนทนา</DialogTitle>
                  <DialogDescription>แก้หัวข้อและเนื้อหาโดยยังผ่าน moderation เดิม หากมีความเสี่ยงจะรอตรวจ</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input value={editThreadTitle} onChange={(event) => setEditThreadTitle(event.target.value)} placeholder="หัวข้อสนทนา" className="h-12 rounded-2xl border-border bg-input-background" />
                  <div className="flex flex-wrap gap-2">
                    {threadCategories.filter((option) => option.id !== "all").map((option) => (
                      <Button key={option.id} type="button" variant={editThreadCategory === option.id ? "default" : "outline"} onClick={() => setEditThreadCategory(option.id)} className="rounded-full">
                        {option.label}
                      </Button>
                    ))}
                  </div>
                  <Textarea value={editThreadContent} onChange={(event) => setEditThreadContent(event.target.value)} placeholder="เขียนรายละเอียดหัวข้อ..." className="min-h-36 rounded-2xl border-border bg-input-background" />
                  {threadFormError ? <p className="text-sm text-destructive">{threadFormError}</p> : null}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingThread(null)} className="rounded-full border-border">
                    ยกเลิก
                  </Button>
                  <Button type="button" onClick={() => void handleSaveThreadEdit()} disabled={savingThreadEdit} className="rounded-full">
                    {savingThreadEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit3 className="mr-2 h-4 w-4" />}
                    บันทึก
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : null}
      </main>
    </div>
  )
}

function ReactionTeamSummaryCard({
  summary,
  teamSummary,
  lounge,
  onOpenSummary,
}: {
  summary?: CommunityMatchRoomResponse["summary"]
  teamSummary: MatchRoomTeamSummary | null
  lounge: TeamReactionLounge
  onOpenSummary: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const badge = getSummaryStatusLabel(summary)
  const isLong = Boolean(teamSummary && (teamSummary.limitations?.length || teamSummary.notablePlayers?.length || teamSummary.tacticalNote || teamSummary.turningPoint))

  return (
    <section className="mb-4 rounded-[24px] border border-primary/20 bg-primary/8 p-4 shadow-lg shadow-primary/5" aria-label={`${lounge.teamName} AI team summary`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Team Summary
          </p>
          <h3 className="mt-2 text-lg font-bold text-foreground">{teamSummary?.headline || `${lounge.teamName} summary is loading`}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {teamSummary?.shortSummary || "AI team summary is being prepared from verified match facts."}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn("rounded-full border-border text-[10px]", badge === "Stale" ? "border-amber-500/30 text-amber-700 dark:text-amber-200" : "text-primary")}>
            {badge}
          </Badge>
          <Button type="button" variant="ghost" onClick={onOpenSummary} className="h-8 rounded-full px-3 text-xs">
            Overall
          </Button>
        </div>
      </div>

      {teamSummary ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface-2 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Positive</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{teamSummary.keyPositive}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-2 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Problem</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{teamSummary.keyProblem}</p>
          </div>
        </div>
      ) : null}

      {teamSummary && expanded ? (
        <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
          {teamSummary.turningPoint ? <p><span className="font-semibold text-foreground">Turning point:</span> {teamSummary.turningPoint}</p> : null}
          {teamSummary.tacticalNote ? <p><span className="font-semibold text-foreground">Tactical note:</span> {teamSummary.tacticalNote}</p> : null}
          {teamSummary.notablePlayers?.length ? <p><span className="font-semibold text-foreground">Notable players:</span> {teamSummary.notablePlayers.join(", ")}</p> : null}
          {teamSummary.limitations?.length ? <p><span className="font-semibold text-foreground">Limitations:</span> {teamSummary.limitations.join(" · ")}</p> : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{summary?.generatedAt ? `Updated ${new Date(summary.generatedAt).toLocaleString("th-TH")}` : "Waiting for verified match facts"}</span>
        {isLong ? (
          <Button type="button" variant="ghost" onClick={() => setExpanded((value) => !value)} className="h-8 rounded-full px-3 text-xs" aria-expanded={expanded}>
            {expanded ? "ย่อ" : "รายละเอียด"}
          </Button>
        ) : null}
      </div>
    </section>
  )
}

function TacticalRoomContextPanel({
  fixture,
  context,
  threads,
  phase,
  onOpenThreads,
}: {
  fixture: CommunityMatchRoomFixture
  context: ReturnType<typeof getTacticalFixtureContext>
  threads: CommunityMatchRoomPost[]
  phase: MatchTimelinePhase
  onOpenThreads: () => void
}) {
  const pinnedThread = threads.find((thread) => thread.isPinned)
  const officialThread = threads.find((thread) => thread.isOfficialThread)
  const focus = getTacticalPhaseFocus(phase)
  return (
    <section className="mb-4 rounded-[24px] border border-primary/20 bg-primary/8 p-4" aria-label={TACTICAL_ROOM_COPY.title}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{TACTICAL_ROOM_COPY.title}</p>
          <h3 className="mt-2 text-lg font-bold text-foreground">{TACTICAL_ROOM_COPY.intro}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{TACTICAL_ROOM_COPY.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {focus.map((item) => (
            <Badge key={item} variant="outline" className="rounded-full border-primary/25 text-primary">{item}</Badge>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface-2 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Formation / Lineup</p>
          {context.lineups.length ? (
            <div className="mt-2 space-y-2 text-sm text-muted-foreground">
              {context.lineups.map((lineup) => (
                <p key={`${lineup.teamName}-${lineup.formation}-${lineup.manager}`}>
                  <span className="font-semibold text-foreground">{lineup.teamName || getMatchTitle(fixture)}</span>
                  {lineup.formation ? ` · ${lineup.formation}` : ""}
                  {lineup.manager ? ` · ${lineup.manager}` : ""}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{TACTICAL_ROOM_COPY.missingProviderData}</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface-2 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tactical Match Context</p>
          {context.hasProviderData ? (
            <div className="mt-2 space-y-2 text-sm text-muted-foreground">
              {context.substitutions.slice(0, 3).map((event) => <p key={event.id}>Substitution {event.minute ? `${event.minute}'` : ""} {event.player || event.team || ""}</p>)}
              {context.cards.slice(0, 3).map((event) => <p key={event.id}>{event.type === "red_card" ? "Red Card" : "Yellow Card"} {event.minute ? `${event.minute}'` : ""} {event.player || event.team || ""}</p>)}
              {context.formationChanges.slice(0, 2).map((event) => <p key={event.id}>Formation Change {event.minute ? `${event.minute}'` : ""} {event.detail || ""}</p>)}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">ไม่มีข้อมูลจากผู้ให้บริการ</p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-surface-2 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-foreground">Tactical Threads</p>
          <Button type="button" variant="outline" onClick={onOpenThreads} className="rounded-full border-border">
            สร้างหัวข้อวิเคราะห์
          </Button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-3 text-sm">
            <p className="text-xs text-muted-foreground">Pinned Tactical Thread</p>
            <p className="mt-1 line-clamp-1 font-semibold text-foreground">{pinnedThread?.title || "-"}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-sm">
            <p className="text-xs text-muted-foreground">Official Tactical Thread</p>
            <p className="mt-1 line-clamp-1 font-semibold text-foreground">{officialThread?.title || "-"}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-sm">
            <p className="text-xs text-muted-foreground">Community Tactical Threads</p>
            <p className="mt-1 font-semibold text-foreground">{threads.length}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function MatchRoomConversation({
  fixture,
  data,
  activeRoomId,
  activeChannel,
  legacyRoomNotice,
  messages,
  messagesLoading,
  messagesError,
  messagesPage,
  messagesTotalPages,
  loadingOlder,
  newMessageCount,
  messageDraft,
  replyTarget,
  editingMessage,
  editMessageDraft,
  sendingMessage,
  uploadingMessageImage,
  messageImage,
  isAuthenticated,
  messageListRef,
  messageEndRef,
  selectedTacticalTopic,
  polls,
  threads,
  onChangeRoom,
  onOpenView,
  onRetry,
  onLoadOlder,
  onJumpToLatest,
  onDraftChange,
  onDraftKeyDown,
  onImageSelected,
  onClearImage,
  onSelectTacticalTopic,
  onOpenTacticalThreads,
  onSend,
  onReply,
  onCancelReply,
  onEdit,
  onEditDraftChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onReport,
  onCopy,
  highlightedMessageId,
  onJumpToMessage,
}: {
  fixture: CommunityMatchRoomFixture
  data?: CommunityMatchRoomResponse
  activeRoomId: ConversationRoomId
  activeChannel?: MatchRoomChannel
  legacyRoomNotice?: string
  messages: MatchRoomMessage[]
  messagesLoading: boolean
  messagesError: string
  messagesPage: number
  messagesTotalPages: number
  loadingOlder: boolean
  newMessageCount: number
  messageDraft: string
  replyTarget: MatchRoomMessage | null
  editingMessage: MatchRoomMessage | null
  editMessageDraft: string
  sendingMessage: boolean
  uploadingMessageImage: boolean
  messageImage: { id: string; url?: string | null; ownerPreviewUrl?: string | null; status: string } | null
  isAuthenticated: boolean
  messageListRef: RefObject<HTMLDivElement | null>
  messageEndRef: RefObject<HTMLDivElement | null>
  selectedTacticalTopic: TacticalQuickTopic | ""
  polls: CommunityMatchRoomPost[]
  threads: CommunityMatchRoomPost[]
  onChangeRoom: (roomType: ConversationRoomId) => void
  onOpenView: (view: "polls" | "summary" | "info") => void
  onRetry: () => void
  onLoadOlder: () => void
  onJumpToLatest: () => void
  onDraftChange: (value: string) => void
  onDraftKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  onImageSelected: (event: ChangeEvent<HTMLInputElement>) => void
  onClearImage: () => void
  onSelectTacticalTopic: (topic: TacticalQuickTopic | "") => void
  onOpenTacticalThreads: () => void
  onSend: () => void
  onReply: (message: MatchRoomMessage) => void
  onCancelReply: () => void
  onEdit: (message: MatchRoomMessage) => void
  onEditDraftChange: (value: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: (message: MatchRoomMessage) => void
  onReport: (message: MatchRoomMessage) => void
  onCopy: (message: MatchRoomMessage) => void
  highlightedMessageId: string
  onJumpToMessage: (messageId: string) => void
}) {
  const activeRoomType = conversationRoomToRoomType(activeRoomId)
  const activePreviewSide = getPreviewSideFromConversationRoom(activeRoomId)
  const activeReactionSide = getReactionSideFromConversationRoom(activeRoomId)
  const activePreviewLounge = activePreviewSide ? getTeamPreviewLounges(fixture).find((lounge) => lounge.side === activePreviewSide) || null : null
  const activeReactionLounge = activeReactionSide ? getTeamReactionLounges(fixture).find((lounge) => lounge.side === activeReactionSide) || null : null
  const isMainRoom = activeRoomId === "main"
  const isTacticalRoom = activeRoomId === "tactics"
  const room = activeChannel || {
    roomType: activeRoomType,
    state: "unavailable" as const,
    canRead: false,
    canPost: false,
    isTemporary: activeRoomType === "preview" || activeRoomType === "post_match",
    isArchived: false,
  }
  const roomTitle = getRoomLabel(activeRoomId, fixture)
  const supporterComposerText = isMainRoom
    ? `${MAIN_ROOM_COPY.intro} ${MAIN_ROOM_COPY.description}`
    : isTacticalRoom
    ? `${TACTICAL_ROOM_COPY.intro}: ${TACTICAL_ROOM_COPY.description}`
    : activePreviewLounge
    ? `You're talking with ${activePreviewLounge.teamName} supporters before kickoff.`
    : activeReactionLounge
      ? `Share your reaction with fellow ${activeReactionLounge.teamName} supporters after full time.`
    : ""
  const emptyStateText = isMainRoom
    ? MAIN_ROOM_COPY.emptyTitle
    : isTacticalRoom
    ? TACTICAL_ROOM_COPY.emptyTitle
    : activePreviewLounge
    ? `Start the conversation with fellow ${activePreviewLounge.teamName} supporters.`
    : activeReactionLounge
      ? `Be the first ${activeReactionLounge.teamName} supporter to share a reaction.`
    : MATCH_HUB_EMPTY_STATES.room
  const [clockNow, setClockNow] = useState(Date.now())
  const refreshRef = useRef<string>("")
  const messagesById = new Map(messages.map((message) => [message.id, message]))
  const stats = data?.roomStats?.[fixture.id]
  const timelinePhase = data?.demoOverride?.effectivePhase || getMatchTimelinePhase(fixture)
  const roomNotice = getTemporaryRoomNotice(room, clockNow)
  const matchEvents = isMainRoom ? normalizeTimelineMatchEvents(fixture.events) : []
  const tacticalContext = isTacticalRoom ? getTacticalFixtureContext(fixture) : null
  const tacticalThreads = isTacticalRoom ? threads.filter((thread) => thread.threadCategory === "tactics" || thread.threadCategoryLabel === COMMUNITY_THREAD_CATEGORY_LABELS.tactics) : []
  const reactionTeamSummary = selectReactionTeamSummary(data?.summary, activeReactionSide)

  useEffect(() => {
    if (!room.isTemporary) return
    const interval = window.setInterval(() => setClockNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [room.isTemporary, room.roomType])

  useEffect(() => {
    if (!room.isTemporary || (room.state !== "open" && room.state !== "closing" && room.state !== "upcoming")) return
    const target = getRoomTargetTime(room)
    if (!target || target > clockNow) return
    const syncKey = `${room.roomType}:${room.state}:${target}`
    if (refreshRef.current === syncKey) return
    refreshRef.current = syncKey
    onRetry()
  }, [clockNow, room.isTemporary, room.roomType, room.state, room.opensAt, room.closesAt, onRetry])

  return (
    <section className="overflow-hidden rounded-[32px] border border-border bg-card shadow-2xl shadow-primary/5" aria-label={`ห้องพูดคุย ${roomTitle}`}>
      <div className="border-b border-border bg-card px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Match Hub</p>
            <h2 className="text-lg font-bold">#{roomTitle}</h2>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" className="rounded-full border-border" aria-label="เปิดข้อมูลห้อง">
                <Info className="mr-2 h-4 w-4" />
                ข้อมูลห้อง
              </Button>
            </SheetTrigger>
            <SheetContent className="border-border bg-popover text-popover-foreground">
              <SheetHeader>
                <SheetTitle>ข้อมูลห้อง</SheetTitle>
                <SheetDescription>{getMatchTitle(fixture)}</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-4">
                <MatchRoomInfoPanel fixture={fixture} data={data} polls={polls} threads={threads} timelinePhase={timelinePhase} onOpenView={onOpenView} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <RoomMobileTabs fixture={fixture} activeRoomId={activeRoomId} channels={data?.channels || []} clockNow={clockNow} onChangeRoom={onChangeRoom} />
      </div>

      <div className="grid min-h-[680px] lg:grid-cols-[300px_minmax(0,1fr)_320px]">
        <aside className="hidden border-r border-border bg-surface-2 p-4 lg:block">
          <RoomSidebar fixture={fixture} activeRoomId={activeRoomId} channels={data?.channels || []} stats={stats} timelinePhase={timelinePhase} clockNow={clockNow} onChangeRoom={onChangeRoom} onOpenView={onOpenView} />
        </aside>

          <div className="flex min-h-[680px] flex-col bg-[radial-gradient(circle_at_top_left,rgba(163,255,30,0.08),transparent_38%),var(--color-card)]">
          <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
            <div className="min-w-0">
              {isMainRoom ? <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{MAIN_ROOM_COPY.eyebrow}</p> : null}
              {isTacticalRoom ? <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Match Analysis</p> : null}
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" />
                <h2 className="truncate text-lg font-bold">{roomTitle}</h2>
                <Badge variant="outline" className={cn("rounded-full border-border text-[11px]", room.canPost ? "bg-primary/10 text-primary" : "text-muted-foreground")}>
                  {getRoomStateLabel(room.state)}
                </Badge>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {supporterComposerText || `${getMatchTitle(fixture)} · FootballAI Match Hub · asynchronous updates`}
              </p>
              {roomNotice ? <p className="mt-1 truncate text-xs text-primary">{roomNotice.title}</p> : null}
            </div>
            <Button type="button" variant="ghost" onClick={onRetry} className="rounded-full text-muted-foreground" aria-label="รีเฟรชข้อความ">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </header>

          <div ref={messageListRef} className="relative flex-1 overflow-y-auto px-3 py-4 sm:px-5" aria-live="polite" aria-busy={messagesLoading}>
            {messagesPage < messagesTotalPages ? (
              <div className="mb-4 text-center">
                <Button type="button" variant="outline" onClick={onLoadOlder} disabled={loadingOlder} className="rounded-full border-border bg-card">
                  {loadingOlder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  โหลดข้อความเก่า
                </Button>
              </div>
            ) : null}

            {messagesLoading && !messages.length ? <MessageSkeletonList /> : null}

            {legacyRoomNotice ? (
              <div role="status" className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-100">
                {legacyRoomNotice}
              </div>
            ) : null}
            {roomNotice ? <TemporaryRoomNotice notice={roomNotice} onGoMain={() => onChangeRoom("main")} /> : null}
            {isTacticalRoom && tacticalContext ? (
              <TacticalRoomContextPanel
                fixture={fixture}
                context={tacticalContext}
                threads={tacticalThreads}
                phase={timelinePhase}
                onOpenThreads={onOpenTacticalThreads}
              />
            ) : null}
            {activeReactionLounge ? <ReactionTeamSummaryCard summary={data?.summary} teamSummary={reactionTeamSummary} lounge={activeReactionLounge} onOpenSummary={() => onOpenView("summary")} /> : null}
            {matchEvents.length ? <SystemMatchEvents events={matchEvents} /> : null}

            {messagesError ? (
              <div role="alert" className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {messagesError}
                <Button type="button" variant="outline" onClick={onRetry} className="ml-3 rounded-full border-border">
                  Retry
                </Button>
              </div>
            ) : null}

            {!messagesLoading && !messagesError && !messages.length ? (
              <div className="mx-auto mt-16 max-w-md rounded-[28px] border border-dashed border-border bg-muted p-8 text-center">
                <MessageCircle className="mx-auto h-10 w-10 text-primary" />
                <h3 className="mt-4 text-xl font-bold">{emptyStateText}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{isMainRoom ? MAIN_ROOM_COPY.emptyDescription : isTacticalRoom ? TACTICAL_ROOM_COPY.emptyDescription : "This room is waiting for the first match take from the community."}</p>
              </div>
            ) : null}

            <div className="space-y-1">
              {messages.map((message, index) => {
                const previous = messages[index - 1]
                const grouped = shouldGroupMainRoomMessage(message, previous)
                const showDateDivider = isMainRoom && shouldShowMainRoomDateDivider(message, previous)
                return (
                  <div key={message.id}>
                    {showDateDivider ? <DateDivider label={getMainRoomDateDividerLabel(message.createdAt)} /> : null}
                    <RoomMessageRow
                      message={message}
                      grouped={grouped}
                      parent={message.replyToId ? messagesById.get(message.replyToId) : null}
                      highlighted={highlightedMessageId === message.id}
                      onReply={onReply}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onReport={onReport}
                      onCopy={onCopy}
                      onJumpToMessage={onJumpToMessage}
                    />
                  </div>
                )
              })}
            </div>
            <div ref={messageEndRef} />

            {newMessageCount > 0 ? (
              <div className="sticky bottom-3 z-20 text-center">
                <Button type="button" onClick={onJumpToLatest} className="rounded-full shadow-lg shadow-primary/20">
                  {MAIN_ROOM_COPY.newMessages} · {newMessageCount}
                </Button>
              </div>
            ) : null}
          </div>

          <RoomComposer
            room={room}
            roomTitle={roomTitle}
            helperText={supporterComposerText}
            placeholder={isMainRoom ? MAIN_ROOM_COPY.placeholder : activeReactionLounge ? "Share your post-match reaction..." : undefined}
            draft={messageDraft}
            replyTarget={replyTarget}
            editingMessage={editingMessage}
            editDraft={editMessageDraft}
            sending={sendingMessage}
            uploadingImage={uploadingMessageImage}
            image={messageImage}
            isAuthenticated={isAuthenticated}
            onDraftChange={onDraftChange}
            onDraftKeyDown={onDraftKeyDown}
            onImageSelected={onImageSelected}
            onClearImage={onClearImage}
            selectedTacticalTopic={isTacticalRoom ? selectedTacticalTopic : ""}
            onSelectTacticalTopic={onSelectTacticalTopic}
            onSend={onSend}
            onCancelReply={onCancelReply}
            onEditDraftChange={onEditDraftChange}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onGoMain={() => onChangeRoom("main")}
          />
        </div>

        <aside className="hidden border-l border-border bg-surface-2 p-4 lg:block">
          <MatchRoomInfoPanel fixture={fixture} data={data} polls={polls} threads={threads} timelinePhase={timelinePhase} onOpenView={onOpenView} />
        </aside>
      </div>
    </section>
  )
}

function RoomSidebar({
  fixture,
  activeRoomId,
  channels,
  stats,
  timelinePhase,
  clockNow,
  onChangeRoom,
  onOpenView,
}: {
  fixture: CommunityMatchRoomFixture
  activeRoomId: ConversationRoomId
  channels: MatchRoomChannel[]
  stats?: MatchRoomStats
  timelinePhase?: MatchTimelinePhase
  clockNow: number
  onChangeRoom: (roomType: ConversationRoomId) => void
  onOpenView: (view: "polls" | "summary" | "info") => void
}) {
  const navigableRooms = getNavigableRooms(channels)
  const effectivePhase = timelinePhase || getMatchTimelinePhase(fixture)
  const priority = getTimelineNavigationPriority(effectivePhase)
  const highlightedRooms = getTimelineHighlightRooms(effectivePhase)
  const previewChannel = channels.find((item) => item.roomType === "preview")
  const postMatchChannel = channels.find((item) => item.roomType === "post_match")
  const previewLounges = getTeamPreviewLounges(fixture)
  const reactionLounges = getTeamReactionLounges(fixture)
  const recommendedPreview = getFavoriteTeamPreviewLounge({
    favoriteTeamName: stats?.favoriteTeamName,
    isFavoriteTeam: stats?.isFavoriteTeam,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
  })
  const recommendedReaction = getFavoriteTeamReactionLounge({
    favoriteTeamName: stats?.favoriteTeamName,
    isFavoriteTeam: stats?.isFavoriteTeam,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
  })
  const roomSections = [
    {
      title: "Main Rooms",
      eyebrow: "🏟 Main Room",
      rooms: navigableRooms.filter((room) => room.id === "main" || room.id === "tactics"),
    },
    {
      title: "Pre Match",
      eyebrow: "⏰ Pre Match",
      rooms: previewChannel ? previewLounges : [],
    },
    {
      title: "Post Match",
      eyebrow: "⏰ Post Match",
      rooms: postMatchChannel ? reactionLounges : [],
    },
  ]
  const priorityIndex = (roomType: MatchTimelineRoomId) => {
    const index = priority.indexOf(roomType)
    return index === -1 ? 99 : index
  }
  return (
    <nav aria-label="FootballAI Match Hub navigation" className="sticky top-20 space-y-5">
      <div>
        <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Match Hub Rooms</p>
        <p className="mt-1 px-2 text-xs leading-5 text-muted-foreground">Choose how you want to join this match community.</p>
      </div>
      {roomSections.map((section) =>
        section.rooms.length ? (
          <div key={section.title}>
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{section.eyebrow}</p>
            <div className="mt-2 space-y-2">
              {[...section.rooms].sort((a, b) => {
                const aRoomType = a.id === "preview_home" || a.id === "preview_away" ? "preview" : a.id === "post_match_home" || a.id === "post_match_away" ? "post_match" : a.id
                const bRoomType = b.id === "preview_home" || b.id === "preview_away" ? "preview" : b.id === "post_match_home" || b.id === "post_match_away" ? "post_match" : b.id
                return priorityIndex(aRoomType as MatchTimelineRoomId) - priorityIndex(bRoomType as MatchTimelineRoomId)
              }).map((room) => {
                const isReactionLounge = room.id === "post_match_home" || room.id === "post_match_away"
                const isPreviewLounge = room.id === "preview_home" || room.id === "preview_away"
                const baseRoomType = isPreviewLounge ? "preview" : isReactionLounge ? "post_match" : room.id
                const channel = isPreviewLounge ? previewChannel : isReactionLounge ? postMatchChannel : channels.find((item) => item.roomType === room.id)
                const roomId = room.id as ConversationRoomId
                const previewStats = isPreviewLounge ? stats?.previewLounges?.[room.side] : null
                const reactionStats = isReactionLounge ? stats?.postMatchLounges?.[room.side] : null
                const temporaryActivity = stats?.activity?.temporaryRoom || ""
                const hasRoomActivity = temporaryActivity.startsWith(baseRoomType === "preview" ? "preview" : "post_match")
                return (
                  <RoomNavButton
                    key={room.id}
                    room={room}
                    channel={channel}
                    active={activeRoomId === roomId}
                    activityCount={isPreviewLounge ? previewStats?.messages || 0 : isReactionLounge ? reactionStats?.messageCount || reactionStats?.messages || 0 : baseRoomType === stats?.latestRoomType ? stats?.newRoomMessageCount || 0 : 0}
                    hasActivity={isPreviewLounge ? Boolean(previewStats?.latestActivityAt) : hasRoomActivity}
                    latestActivityAt={isPreviewLounge ? previewStats?.latestActivityAt : baseRoomType === stats?.latestRoomType ? stats?.latestRoomActivityAt : undefined}
                    recommended={recommendedPreview?.id === roomId || recommendedReaction?.id === roomId}
                    emphasized={highlightedRooms.includes(baseRoomType as MatchTimelineRoomId)}
                    clockNow={clockNow}
                    onClick={() => onChangeRoom(roomId)}
                  />
                )
              })}
            </div>
          </div>
        ) : null,
      )}
      {!navigableRooms.some((room) => room.group === "temporary") ? <p className="rounded-2xl border border-dashed border-border p-3 text-xs text-muted-foreground">ยังไม่มีห้องชั่วคราวที่เปิดอยู่</p> : null}
      <div>
        <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">📊 Polls & 🤖 AI Summary</p>
        <div className="mt-2 space-y-2">
          <HubUtilityButton label="Polls" description="Community votes for this match" badge={stats?.activity?.hasNewPoll ? "NEW" : `${stats?.polls || 0}`} onClick={() => onOpenView("polls")} />
          <HubUtilityButton label="AI Summary" description="Fact-only match summary" badge={stats?.activity?.hasSummaryReady ? "READY" : "SUMMARY"} onClick={() => onOpenView("summary")} />
        </div>
      </div>
    </nav>
  )
}

function RoomMobileTabs({
  fixture,
  activeRoomId,
  channels,
  clockNow,
  onChangeRoom,
}: {
  fixture: CommunityMatchRoomFixture
  activeRoomId: ConversationRoomId
  channels: MatchRoomChannel[]
  clockNow: number
  onChangeRoom: (roomType: ConversationRoomId) => void
}) {
  const rooms = getNavigableRooms(channels)
  const previewChannel = channels.find((item) => item.roomType === "preview")
  const postMatchChannel = channels.find((item) => item.roomType === "post_match")
  const previewLounges = previewChannel ? getTeamPreviewLounges(fixture) : []
  const reactionLounges = postMatchChannel ? getTeamReactionLounges(fixture) : []
  const mobileRooms: Array<(typeof conversationRooms)[number] | TeamPreviewLounge | TeamReactionLounge> = []
  for (const room of rooms) {
    if (room.id === "preview") mobileRooms.push(...previewLounges)
    else if (room.id === "post_match") mobileRooms.push(...reactionLounges)
    else mobileRooms.push(room)
  }
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="เลือกห้องสนทนา">
      {mobileRooms.map((room) => {
        const isPreviewLounge = room.id === "preview_home" || room.id === "preview_away"
        const isReactionLounge = room.id === "post_match_home" || room.id === "post_match_away"
        const roomId = room.id as ConversationRoomId
        const channel = isPreviewLounge ? previewChannel : isReactionLounge ? postMatchChannel : channels.find((item) => item.roomType === room.id)
        const disabled = Boolean(channel && !channel.canRead && !channel.canPost)
        return (
          <button
            key={room.id}
            type="button"
            role="tab"
            aria-selected={activeRoomId === roomId}
            onClick={() => {
              if (!disabled) onChangeRoom(roomId)
            }}
            disabled={disabled}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
              activeRoomId === roomId ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground",
              disabled && "cursor-not-allowed opacity-55",
            )}
          >
            #{isPreviewLounge || isReactionLounge ? room.teamName : room.label}
            {channel ? <span className="ml-2 text-[11px] opacity-70">{getRoomAvailabilityText(channel, clockNow)}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

function RoomNavButton({
  room,
  channel,
  active,
  activityCount,
  hasActivity,
  latestActivityAt,
  recommended,
  emphasized,
  clockNow,
  onClick,
}: {
  room: (typeof conversationRooms)[number] | TeamPreviewLounge | TeamReactionLounge
  channel?: MatchRoomChannel
  active: boolean
  activityCount: number
  hasActivity?: boolean
  latestActivityAt?: string | null
  recommended?: boolean
  emphasized?: boolean
  clockNow: number
  onClick: () => void
}) {
  const disabled = Boolean(channel && !channel.canRead && !channel.canPost)
  const isTeamPreview = room.id === "preview_home" || room.id === "preview_away"
  const isTeamReaction = room.id === "post_match_home" || room.id === "post_match_away"
  const badge = (isTeamPreview && channel?.state === "upcoming") || (isTeamReaction && channel?.state === "unavailable") ? "OPENING SOON" : getRoomHubBadge(channel)
  const badgeClass =
    badge === "OPEN" || badge === "LIVE"
      ? active
        ? "bg-primary-foreground/15 text-primary-foreground"
        : "bg-primary/15 text-primary"
      : badge === "ARCHIVED"
        ? "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300"
        : "bg-amber-500/10 text-amber-700 dark:text-amber-200"
  return (
    <button
      type="button"
      onClick={() => {
        if (!disabled) onClick()
      }}
      disabled={disabled}
      className={cn(
        "group w-full rounded-2xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 motion-reduce:transition-none",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/15"
          : emphasized
            ? "border-primary/45 bg-primary/10 text-foreground shadow-md shadow-primary/10 hover:border-primary/60 hover:bg-primary/14"
            : "border-border bg-card text-muted-foreground hover:border-primary/35 hover:bg-accent-soft hover:text-foreground",
        disabled && "cursor-not-allowed opacity-55 hover:bg-transparent hover:text-muted-foreground",
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold">{isTeamPreview || isTeamReaction ? `🔴 ${room.label}` : room.label}</span>
            {recommended ? <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", active ? "bg-primary-foreground/15 text-primary-foreground" : "bg-primary/15 text-primary")}>⭐ Recommended</span> : null}
            {emphasized && !recommended ? <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", active ? "bg-primary-foreground/15 text-primary-foreground" : "bg-primary/15 text-primary")}>Priority</span> : null}
          </span>
          <span className={cn("mt-1 block text-xs leading-5", active ? "text-primary-foreground/75" : "text-muted-foreground")}>{room.description}</span>
        </span>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", badgeClass)}>{badge}</span>
      </span>
      <span className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        <span className={cn("rounded-full px-2 py-0.5", active ? "bg-primary-foreground/15 text-primary-foreground/80" : "bg-muted text-muted-foreground")}>
          {isTeamReaction && channel?.state === "unavailable" ? "เปิดหลังจบเกม" : getRoomAvailabilityText(channel, clockNow)}
        </span>
        <span className={cn("rounded-full px-2 py-0.5", active ? "bg-primary-foreground/15 text-primary-foreground/80" : "bg-muted text-muted-foreground")}>
          {activityCount} messages
        </span>
        {hasActivity ? <span className={cn("h-2.5 w-2.5 rounded-full", active ? "bg-primary-foreground" : "bg-primary")} aria-label="new room activity" /> : null}
      </span>
      <span className={cn("mt-2 block truncate text-[11px]", active ? "text-primary-foreground/70" : "text-muted-foreground")}>
        Latest activity: {latestActivityAt ? new Date(latestActivityAt).toLocaleString("th-TH") : "-"}
      </span>
    </button>
  )
}

function HubUtilityButton({ label, description, badge, onClick }: { label: string; description: string; badge: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-2xl border border-border bg-card px-3 py-3 text-left text-muted-foreground transition hover:border-primary/35 hover:bg-accent-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 motion-reduce:transition-none"
    >
      <span className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-sm font-semibold">{label}</span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
        </span>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">{badge}</span>
      </span>
    </button>
  )
}

function TemporaryRoomNotice({ notice, onGoMain }: { notice: NonNullable<ReturnType<typeof getTemporaryRoomNotice>>; onGoMain: () => void }) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 text-sm",
        notice.tone === "danger"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : notice.tone === "warning"
            ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-100"
            : notice.tone === "active"
              ? "border-primary/25 bg-primary/10 text-primary"
              : "border-border bg-muted text-muted-foreground",
      )}
    >
      <div className="min-w-0">
        <p className="font-semibold text-foreground">{notice.title}</p>
        <p className="mt-1">{notice.detail}</p>
      </div>
      {notice.tone === "muted" ? (
        <Button type="button" variant="outline" onClick={onGoMain} className="rounded-full border-border bg-card">
          ไปห้องหลัก
        </Button>
      ) : null}
    </div>
  )
}

function DateDivider({ label }: { label: string }) {
  if (!label) return null
  const layout = getSystemMessageLayout("date_divider")
  return (
    <div className={cn("my-5 flex items-center gap-3", layout.className)} role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-border" />
      <span className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-muted-foreground">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

function getMatchEventLabel(event: TimelineMatchEvent) {
  if (event.type === "goal") return "Goal"
  if (event.type === "yellow_card") return "Yellow Card"
  if (event.type === "red_card") return "Red Card"
  return "Substitution"
}

function SystemMatchEvents({ events }: { events: TimelineMatchEvent[] }) {
  if (!events.length) return null
  const layout = getSystemMessageLayout("match_event")
  return (
    <div className={cn("mb-4 rounded-2xl border border-border bg-surface-2 p-4", layout.className)} aria-label={MATCH_TIMELINE_COPY.eventsTitle}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{MATCH_TIMELINE_COPY.eventsTitle}</p>
        <Badge variant="outline" className="rounded-full border-border text-[10px] text-muted-foreground">Verified fixture data</Badge>
      </div>
      <div className="space-y-2">
        {events.map((event) => (
          <div key={event.id} className="flex gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm">
            <span className="w-12 shrink-0 font-semibold text-primary">{event.minute ? `${event.minute}'` : "-"}</span>
            <span className="min-w-0">
              <span className="font-semibold text-foreground">{getMatchEventLabel(event)}</span>
              <span className="text-muted-foreground">
                {event.player ? ` · ${event.player}` : ""}
                {event.team ? ` · ${event.team}` : ""}
                {event.assist ? ` · Assist: ${event.assist}` : ""}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RoomMessageRow({
  message,
  grouped,
  parent,
  highlighted,
  onReply,
  onEdit,
  onDelete,
  onReport,
  onCopy,
  onJumpToMessage,
}: {
  message: MatchRoomMessage
  grouped: boolean
  parent?: MatchRoomMessage | null
  highlighted?: boolean
  onReply: (message: MatchRoomMessage) => void
  onEdit: (message: MatchRoomMessage) => void
  onDelete: (message: MatchRoomMessage) => void
  onReport: (message: MatchRoomMessage) => void
  onCopy: (message: MatchRoomMessage) => void
  onJumpToMessage: (messageId: string) => void
}) {
  const authorName = message.author?.name || "ผู้ใช้งาน"
  const canManage = Boolean(message.canModerate)
  const layout = getRoomMessageBubbleLayout({ isOwner: message.isOwner, grouped, hasReply: Boolean(message.replyToId) })
  const timestamp = message.timeAgo || (message.createdAt ? new Date(message.createdAt).toLocaleString("th-TH") : "")
  const tacticalTopicLabel = message.roomType === "tactics" ? getTacticalQuickTopicLabel(message.tacticalTopic) : ""

  return (
    <article
      id={`message-${message.id}`}
      className={cn(
        "group flex gap-3 rounded-2xl px-2 py-2 transition hover:bg-accent-soft/60",
        layout.rowClass,
        grouped ? "pt-1" : "mt-1",
        highlighted && "bg-primary/12 ring-2 ring-primary/45",
      )}
      aria-label={`${authorName}: ${message.content}`}
    >
      {!message.isOwner ? (
        <div className="w-10 shrink-0">
          {layout.showAvatar ? (
          <Avatar className="h-10 w-10 border border-border">
            <AvatarImage src={message.author?.avatar || ""} alt={authorName} />
            <AvatarFallback>{getInitials(authorName)}</AvatarFallback>
          </Avatar>
          ) : null}
        </div>
      ) : null}
      <div className={cn("flex min-w-0 max-w-[min(82%,42rem)] flex-col", layout.contentClass)}>
        {layout.showDisplayName ? (
          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-foreground">{authorName}</span>
            {message.author?.role === "admin" ? <Badge className="rounded-full bg-primary/15 text-[10px] text-primary hover:bg-primary/15">Admin</Badge> : null}
          </div>
        ) : null}

        <div className={cn("min-w-0 rounded-2xl border px-4 py-3 shadow-sm", layout.bubbleClass)}>
          {tacticalTopicLabel ? (
            <Badge variant="outline" className={cn("mb-2 rounded-full text-[10px]", message.isOwner ? "border-primary-foreground/40 text-primary-foreground" : "border-primary/30 text-primary")}>
              {tacticalTopicLabel}
            </Badge>
          ) : null}
          {message.replyToId ? (
            <button
              type="button"
              onClick={() => {
                if (parent) onJumpToMessage(parent.id)
              }}
              disabled={!parent}
              className={cn(
                "mb-2 block w-full rounded-xl border-l-2 px-3 py-2 text-left text-xs transition hover:bg-background/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                layout.replyClass,
                !parent && "cursor-default border-border opacity-75 hover:bg-muted",
              )}
              aria-label="ข้อความที่ตอบกลับ"
            >
              {parent ? (
                <>
                  <span className={cn("block font-semibold", message.isOwner ? "text-primary-foreground" : "text-primary")}>Replying to {parent.author?.name || "ผู้ใช้งาน"}</span>
                  <span className="mt-1 line-clamp-1">{parent.content}</span>
                </>
              ) : (
                MAIN_ROOM_COPY.deletedParent
              )}
            </button>
          ) : null}

          <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content || "ข้อความนี้ถูกลบแล้ว"}</p>
          {message.images?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.images.slice(0, 1).map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="relative block h-36 w-56 overflow-hidden rounded-2xl border border-border bg-muted">
                  <Image src={url} alt="รูปภาพในข้อความ" fill className="object-cover" unoptimized />
                </a>
              ))}
            </div>
          ) : null}
        </div>
        <div className={cn("mt-1 flex w-full flex-wrap items-center gap-2 text-xs text-muted-foreground", layout.metaClass)}>
          <time>{timestamp}</time>
          {message.moderationStatus === "pending_review" && message.isOwner ? <Badge variant="outline" className="rounded-full border-amber-500/30 text-[10px] text-amber-700 dark:text-amber-200">รอตรวจ</Badge> : null}
          {message.isEdited ? <span className="text-[11px]">แก้ไขแล้ว</span> : null}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100" aria-label="เปิดเมนูข้อความ">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-2xl border-border bg-popover text-popover-foreground">
          <DropdownMenuItem onClick={() => onReply(message)}>Reply</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onCopy(message)}>Copy link</DropdownMenuItem>
          {message.isOwner ? <DropdownMenuItem onClick={() => onEdit(message)}>Edit</DropdownMenuItem> : null}
          {message.isOwner || canManage ? <DropdownMenuItem onClick={() => onDelete(message)} className="text-destructive">Delete</DropdownMenuItem> : null}
          {!message.isOwner ? <DropdownMenuItem onClick={() => onReport(message)}>Report</DropdownMenuItem> : null}
          {canManage ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/admin/community/moderation?q=${encodeURIComponent(message.id)}`}>Open in Moderation</Link>
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </article>
  )
}

function RoomComposer({
  room,
  roomTitle,
  helperText,
  placeholder,
  draft,
  replyTarget,
  editingMessage,
  editDraft,
  sending,
  uploadingImage,
  image,
  isAuthenticated,
  selectedTacticalTopic,
  onDraftChange,
  onDraftKeyDown,
  onImageSelected,
  onClearImage,
  onSelectTacticalTopic,
  onSend,
  onCancelReply,
  onEditDraftChange,
  onSaveEdit,
  onCancelEdit,
  onGoMain,
}: {
  room: MatchRoomChannel
  roomTitle: string
  helperText?: string
  placeholder?: string
  draft: string
  replyTarget: MatchRoomMessage | null
  editingMessage: MatchRoomMessage | null
  editDraft: string
  sending: boolean
  uploadingImage: boolean
  image: { id: string; url?: string | null; ownerPreviewUrl?: string | null; status: string } | null
  isAuthenticated: boolean
  selectedTacticalTopic?: TacticalQuickTopic | ""
  onDraftChange: (value: string) => void
  onDraftKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  onImageSelected: (event: ChangeEvent<HTMLInputElement>) => void
  onClearImage: () => void
  onSelectTacticalTopic?: (topic: TacticalQuickTopic | "") => void
  onSend: () => void
  onCancelReply: () => void
  onEditDraftChange: (value: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onGoMain: () => void
}) {
  if (!room.canPost && !editingMessage) {
    const closedDescription =
      room.roomType === "post_match" && room.state === "archived"
        ? "ห้องหลังเกมปิดแล้ว คุณสามารถพูดคุยต่อในห้องหลักหรือห้องแท็กติก"
        : room.roomType === "preview" && room.state === "archived"
          ? "การแข่งขันเริ่มแล้ว คุยต่อในห้องหลักได้เลย"
          : room.state === "upcoming"
            ? "ห้องนี้ยังไม่เปิดให้ส่งข้อความ"
            : "ยังอ่านย้อนหลังได้ แต่ส่งข้อความใหม่ไม่ได้ในสถานะนี้"
    return (
      <div className="sticky bottom-0 border-t border-border bg-card/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted p-4">
          <div>
            <p className="font-semibold">ห้องนี้ปิดรับข้อความแล้ว</p>
            <p className="text-sm text-muted-foreground">{closedDescription}</p>
          </div>
          <Button type="button" onClick={onGoMain} className="rounded-full">ไปห้องหลัก</Button>
        </div>
      </div>
    )
  }

  if (!isAuthenticated && !editingMessage) {
    return (
      <div className="sticky bottom-0 border-t border-border bg-card/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/8 p-4">
          <div>
            <p className="font-semibold text-foreground">เข้าสู่ระบบก่อนคุยใน Match Room</p>
            <p className="text-sm text-muted-foreground">ตอนนี้หน้านี้อ่านได้ แต่การส่งข้อความต้องใช้บัญชีสมาชิก FootballAI</p>
          </div>
          <Button asChild className="rounded-full">
            <Link href="/login">เข้าสู่ระบบ</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="sticky bottom-0 border-t border-border bg-card/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
      {editingMessage ? (
        <div className="rounded-[24px] border border-primary/25 bg-primary/8 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-primary">แก้ไขข้อความ</p>
            <Button type="button" variant="ghost" size="icon" onClick={onCancelEdit} className="h-8 w-8 rounded-full" aria-label="ยกเลิกแก้ไข">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Textarea value={editDraft} onChange={(event) => onEditDraftChange(event.target.value)} className="min-h-20 rounded-2xl border-border bg-input-background" />
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancelEdit} className="rounded-full border-border">ยกเลิก</Button>
            <Button type="button" onClick={onSaveEdit} disabled={sending || !editDraft.trim()} className="rounded-full">
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              บันทึก
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-[24px] border border-border bg-card p-3">
          {room.roomType === "tactics" && onSelectTacticalTopic ? (
            <div className="mb-2 flex flex-wrap gap-2" aria-label="Tactical quick topics">
              {TACTICAL_QUICK_TOPICS.map((topic) => (
                <Button
                  key={topic.id}
                  type="button"
                  variant={selectedTacticalTopic === topic.id ? "default" : "outline"}
                  onClick={() => onSelectTacticalTopic(selectedTacticalTopic === topic.id ? "" : topic.id)}
                  className="h-8 rounded-full border-border px-3 text-xs"
                >
                  {topic.label}
                </Button>
              ))}
            </div>
          ) : null}
          {replyTarget ? (
            <div className="mb-2 flex items-start justify-between gap-3 rounded-2xl border-l-2 border-primary bg-primary/8 px-3 py-2">
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-primary">ตอบกลับ {replyTarget.author?.name || "ผู้ใช้งาน"}</p>
                <p className="line-clamp-1 text-muted-foreground">{replyTarget.content || "ข้อความต้นทางไม่พร้อมใช้งาน"}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={onCancelReply} className="h-8 w-8 rounded-full" aria-label="ยกเลิก reply">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
          {image ? (
            <div className="mb-2 flex items-center gap-3 rounded-2xl border border-border bg-surface-2 p-2">
              <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-border">
                <Image src={image.url || image.ownerPreviewUrl || ""} alt="แนบรูปข้อความ" fill className="object-cover" unoptimized />
              </div>
              <div className="min-w-0 flex-1 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">แนบรูป 1 รูป</p>
                <p>{image.status === "pending_review" ? "รูปนี้รอตรวจ เจ้าของจะเห็นสถานะก่อน" : "พร้อมส่งพร้อมข้อความ"}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={onClearImage} className="h-8 w-8 rounded-full" aria-label="ลบรูปแนบ">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <label className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground transition hover:text-primary">
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onImageSelected} disabled={uploadingImage || Boolean(image)} />
              {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
              <span className="sr-only">แนบรูป</span>
            </label>
            <Textarea
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={onDraftKeyDown}
              placeholder={placeholder || `พิมพ์ข้อความใน #${roomTitle}...`}
              className="max-h-36 min-h-11 resize-none rounded-2xl border-border bg-input-background px-4 py-3"
              aria-label={`พิมพ์ข้อความใน ${roomTitle}`}
            />
            <Button type="button" onClick={onSend} disabled={sending || !draft.trim()} className="h-11 shrink-0 rounded-2xl px-4">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="sr-only">ส่งข้อความ</span>
            </Button>
          </div>
          <p className="mt-2 px-1 text-[11px] text-muted-foreground">{helperText || MAIN_ROOM_COPY.enterHint}</p>
        </div>
      )}
    </div>
  )
}

function MatchRoomInfoPanel({
  fixture,
  data,
  polls,
  threads,
  timelinePhase,
  onOpenView,
}: {
  fixture: CommunityMatchRoomFixture
  data?: CommunityMatchRoomResponse
  polls: CommunityMatchRoomPost[]
  threads: CommunityMatchRoomPost[]
  timelinePhase?: MatchTimelinePhase
  onOpenView: (view: "polls" | "summary" | "info") => void
}) {
  const stats = data?.roomStats?.[fixture.id]
  const pinnedThread = threads.find((thread) => thread.isPinned) || threads[0]
  const effectivePhase = timelinePhase || getMatchTimelinePhase(fixture)
  const timelineSignals = getTimelineActivityLabels({
    phase: effectivePhase,
    previewActive: stats?.activity?.temporaryRoom === "preview_open" || stats?.activity?.temporaryRoom === "preview_closing",
    reactionOpen: stats?.activity?.temporaryRoom === "post_match_open" || stats?.activity?.temporaryRoom === "post_match_closing",
    summaryReady: stats?.activity?.hasSummaryReady,
    hasLiveStatus: effectivePhase === "live",
  })
  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-border bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Match</p>
        <h3 className="mt-2 text-lg font-bold">{getMatchTitle(fixture)}</h3>
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-surface-2 p-3">
          <span className="text-sm text-muted-foreground">{getStatusLabel(fixture.status, fixture.isFinished)}</span>
          <span className="rounded-xl bg-primary px-3 py-1 text-lg font-black text-primary-foreground">{getScoreLabel(fixture)}</span>
        </div>
        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
          <p>เวลา: {fixture.dateThai || "-"}</p>
          <p>สนาม: {fixture.venue || "-"}</p>
          <p>{stats?.followers || 0} ผู้ติดตาม · {stats?.discussions || 0} โพสต์เดิม</p>
        </div>
      </div>

      <div className="rounded-[24px] border border-primary/20 bg-primary/8 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold">Match Activity</h3>
          <Badge variant="outline" className="rounded-full border-primary/25 text-primary">{effectivePhase === "live" ? "LIVE HUB" : effectivePhase === "full_time" ? "FULL TIME" : "PRE MATCH"}</Badge>
        </div>
        {timelineSignals.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {timelineSignals.map((label) => (
              <Badge key={label} variant="outline" className="rounded-full border-border bg-card text-[10px] text-muted-foreground">{label}</Badge>
            ))}
          </div>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-2xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Messages</p>
            <p className="mt-1 text-lg font-bold">{stats?.newRoomMessageCount || stats?.discussions || 0}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Threads</p>
            <p className="mt-1 text-lg font-bold">{stats?.discussions || 0}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Polls</p>
            <p className="mt-1 text-lg font-bold">{stats?.polls || 0}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Active Fans</p>
            <p className="mt-1 text-lg font-bold">{stats?.followers || 0}</p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Latest Activity: {stats?.latestRoomActivityAt || stats?.latestActivityAt ? new Date(stats.latestRoomActivityAt || stats.latestActivityAt || "").toLocaleString("th-TH") : "-"}
        </p>
      </div>

      <div className="rounded-[24px] border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold">Poll</h3>
          {effectivePhase === "pre_match" || effectivePhase === "full_time" ? <Badge variant="outline" className="rounded-full border-primary/25 text-primary">{effectivePhase === "full_time" ? "Results" : "Pre-match"}</Badge> : null}
          <Button type="button" variant="ghost" onClick={() => onOpenView("polls")} className="h-8 rounded-full px-3 text-xs">เปิด</Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{polls[0]?.poll?.question || MATCH_HUB_EMPTY_STATES.polls}</p>
      </div>

      <div className="rounded-[24px] border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold">AI Summary</h3>
          {effectivePhase === "full_time" ? <Badge variant="outline" className="rounded-full border-primary/25 text-primary">Priority</Badge> : null}
          <Button type="button" variant="ghost" onClick={() => onOpenView("summary")} className="h-8 rounded-full px-3 text-xs">อ่าน</Button>
        </div>
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{data?.summary?.headline || data?.summary?.shortSummary || MATCH_HUB_EMPTY_STATES.summary}</p>
      </div>

      <div className="rounded-[24px] border border-border bg-card p-4">
        <h3 className="font-bold">Pinned tactical thread</h3>
        {pinnedThread ? (
          <Link href={`/community/matches/${fixture.id}/threads/${pinnedThread.id}`} className="mt-2 block text-sm text-muted-foreground transition hover:text-primary">
            {pinnedThread.title}
          </Link>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">ยังไม่มีหัวข้อที่ปักหมุด</p>
        )}
      </div>

      <div className="rounded-[24px] border border-primary/20 bg-primary/8 p-4">
        <h3 className="font-bold">กติกาห้อง</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">คุยเรื่องเกมนี้ได้เต็มที่ เคารพกัน ไม่สแปม ไม่โปรโมตพนัน และข้อความยังผ่าน moderation เดิมของ Community</p>
      </div>
    </div>
  )
}

function MessageSkeletonList() {
  return (
    <div className="space-y-4">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="flex gap-3 rounded-2xl px-2 py-2">
          <div className="h-10 w-10 rounded-full bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 rounded-full bg-white/10" />
            <div className="h-4 w-3/4 rounded-full bg-white/8" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MatchRoomThreadDetail({ matchId, threadId }: { matchId: string; threadId: string }) {
  const [comment, setComment] = useState("")
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentContent, setEditingCommentContent] = useState("")
  const [commentsLimit, setCommentsLimit] = useState(10)
  const [submitting, setSubmitting] = useState(false)
  const [pinning, setPinning] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const { data, error, isLoading, mutate } = useSWR<CommunityMatchThreadDetailResponse>(
    `/community/match-room/threads/${encodeURIComponent(threadId)}?matchId=${encodeURIComponent(matchId)}&commentsLimit=${commentsLimit}`,
    matchRoomFetcher,
    { revalidateOnFocus: true },
  )

  async function submitComment(parentCommentId?: string) {
    const value = parentCommentId ? replyDrafts[parentCommentId] || "" : comment
    if (!value.trim()) return
    setSubmitting(true)
    setErrorMessage("")
    try {
      await fetchJson(`/community/posts/${threadId}/comments`, {
        method: "POST",
        body: JSON.stringify({
          content: value,
          parentCommentId: parentCommentId || "",
        }),
      })
      if (parentCommentId) {
        setReplyDrafts((current) => ({ ...current, [parentCommentId]: "" }))
        setActiveReplyId(null)
      } else {
        setComment("")
      }
      await mutate()
    } catch (submitError) {
      setErrorMessage(submitError instanceof Error ? submitError.message : "ส่งความคิดเห็นไม่สำเร็จ")
    } finally {
      setSubmitting(false)
    }
  }

  async function togglePin() {
    setPinning(true)
    setErrorMessage("")
    try {
      await fetchJson(`/community/match-room/threads/${encodeURIComponent(threadId)}?matchId=${encodeURIComponent(matchId)}`, {
        method: "PATCH",
        body: JSON.stringify({ isPinned: !Boolean(data?.item?.isPinned) }),
      })
      await mutate()
    } catch (pinError) {
      setErrorMessage(pinError instanceof Error ? pinError.message : "อัปเดต pin ไม่สำเร็จ")
    } finally {
      setPinning(false)
    }
  }

  async function toggleOfficial() {
    setPinning(true)
    setErrorMessage("")
    try {
      await fetchJson(`/community/match-room/threads/${encodeURIComponent(threadId)}?matchId=${encodeURIComponent(matchId)}`, {
        method: "PATCH",
        body: JSON.stringify({ isPinned: Boolean(data?.item?.isPinned), isOfficialThread: !Boolean(data?.item?.isOfficialThread) }),
      })
      await mutate()
    } catch (officialError) {
      setErrorMessage(officialError instanceof Error ? officialError.message : "อัปเดต Official ไม่สำเร็จ")
    } finally {
      setPinning(false)
    }
  }

  async function copyThreadLink() {
    const url = typeof window === "undefined" ? "" : window.location.href
    await navigator.clipboard?.writeText(url)
  }

  async function reportThreadDetail() {
    const reason = window.prompt("เหตุผลที่รายงาน: spam, harassment, inappropriate, misinformation, gambling, other", "other")
    if (!reason) return
    setErrorMessage("")
    try {
      await fetchJson(`/community/posts/${threadId}/report`, {
        method: "POST",
        body: JSON.stringify({ reason, description: "" }),
      })
    } catch (reportError) {
      setErrorMessage(reportError instanceof Error ? reportError.message : "รายงานหัวข้อไม่สำเร็จ")
    }
  }

  async function deleteThreadDetail() {
    if (!window.confirm("ลบหัวข้อนี้ใช่ไหม?")) return
    setSubmitting(true)
    setErrorMessage("")
    try {
      await fetchJson(`/community/match-room/threads/${encodeURIComponent(threadId)}?matchId=${encodeURIComponent(matchId)}`, { method: "DELETE" })
      window.location.href = `/community/matches/${matchId}?tab=threads`
    } catch (deleteError) {
      setErrorMessage(deleteError instanceof Error ? deleteError.message : "ลบหัวข้อไม่สำเร็จ")
    } finally {
      setSubmitting(false)
    }
  }

  async function updateComment(commentId: string) {
    if (!editingCommentContent.trim()) return
    setSubmitting(true)
    setErrorMessage("")
    try {
      await fetchJson(`/community/comments/${commentId}`, {
        method: "PATCH",
        body: JSON.stringify({ content: editingCommentContent }),
      })
      setEditingCommentId(null)
      setEditingCommentContent("")
      await mutate()
    } catch (editError) {
      setErrorMessage(editError instanceof Error ? editError.message : "แก้ไขความคิดเห็นไม่สำเร็จ")
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteComment(commentId: string) {
    if (!window.confirm("ลบความคิดเห็นนี้ใช่ไหม?")) return
    setSubmitting(true)
    setErrorMessage("")
    try {
      await fetchJson(`/community/comments/${commentId}`, { method: "DELETE" })
      await mutate()
    } catch (deleteError) {
      setErrorMessage(deleteError instanceof Error ? deleteError.message : "ลบความคิดเห็นไม่สำเร็จ")
    } finally {
      setSubmitting(false)
    }
  }

  async function reportComment(commentId: string) {
    const reason = window.prompt("เหตุผลที่รายงาน: spam, harassment, inappropriate, misinformation, gambling, other", "other")
    if (!reason) return
    try {
      await fetchJson(`/community/comments/${commentId}/report`, {
        method: "POST",
        body: JSON.stringify({ reason, description: "" }),
      })
    } catch (reportError) {
      setErrorMessage(reportError instanceof Error ? reportError.message : "รายงานความคิดเห็นไม่สำเร็จ")
    }
  }

  async function copyCommentLink(permalink?: string) {
    const suffix = permalink || ""
    const url = typeof window === "undefined" ? suffix : `${window.location.origin}/community/matches/${matchId}/threads/${threadId}${suffix}`
    await navigator.clipboard?.writeText(url)
  }

  function renderCommentActions(item: CommunityMatchThreadDetailResponse["comments"][number] | CommunityMatchThreadDetailResponse["comments"][number]["replies"][number], parentId?: string) {
    const canEdit = Boolean(item.isOwner || item.canModerate) && !item.isDeleted
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" aria-label={`เมนูความคิดเห็นของ ${item.user.name}`} className="h-8 w-8 rounded-full text-muted-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {!item.isDeleted && parentId ? (
            <DropdownMenuItem onClick={() => setActiveReplyId(parentId)}>
              <MessageCircle className="mr-2 h-4 w-4" />
              ตอบกลับ
            </DropdownMenuItem>
          ) : null}
          {canEdit ? (
            <DropdownMenuItem
              onClick={() => {
                setEditingCommentId(item.id)
                setEditingCommentContent(item.content)
              }}
            >
              <Edit3 className="mr-2 h-4 w-4" />
              แก้ไข
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={() => void copyCommentLink(item.permalink)}>
            <Copy className="mr-2 h-4 w-4" />
            คัดลอกลิงก์
          </DropdownMenuItem>
          {!item.isOwner && !item.isDeleted ? (
            <DropdownMenuItem onClick={() => void reportComment(item.id)}>
              <Flag className="mr-2 h-4 w-4" />
              รายงาน
            </DropdownMenuItem>
          ) : null}
          {canEdit ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void deleteComment(item.id)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                ลบ
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="min-h-screen bg-background px-3 py-5 text-foreground sm:px-5 lg:px-6">
      <main className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link href="/community" className="transition hover:text-primary">Community</Link>
          <span>→</span>
          <Link href={`/community/matches/${matchId}?tab=threads`} className="transition hover:text-primary">Match Room</Link>
          <span>→</span>
          <span className="text-foreground">Thread</span>
        </div>

        <Button asChild variant="outline" className="rounded-full border-border bg-card">
          <Link href={`/community/matches/${matchId}?tab=threads`}>← กลับหัวข้อสนทนา</Link>
        </Button>

        {isLoading ? (
          <Card className="rounded-[28px] border-border bg-card">
            <CardContent className="py-20 text-center text-muted-foreground">
              <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-primary" />
              กำลังโหลดหัวข้อสนทนา...
            </CardContent>
          </Card>
        ) : null}

        {error || !data?.item ? (
          !isLoading ? (
            <Card className="rounded-[28px] border-destructive/30 bg-destructive/10">
              <CardContent className="p-6 text-destructive">ไม่พบหัวข้อสนทนานี้ หรือคุณยังไม่มีสิทธิ์ดู</CardContent>
            </Card>
          ) : null
        ) : (
          <>
            <Card className="rounded-[28px] border-border bg-card">
              <CardContent className="space-y-5 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary">{data.item.threadCategoryLabel || "ทั่วไป"}</Badge>
                      {data.item.isOfficialThread ? <Badge className="rounded-full bg-sky-500/15 text-sky-700 hover:bg-sky-500/15 dark:text-sky-100">Official</Badge> : null}
                      {data.item.isPinned ? <Badge className="rounded-full bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 dark:text-amber-100">Pinned</Badge> : null}
                      {data.item.isEdited ? <Badge variant="outline" className="rounded-full border-border">Edited</Badge> : null}
                    </div>
                    <h1 className="mt-3 text-3xl font-semibold">{data.item.title}</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {data.item.author?.name || "ผู้ใช้งาน"} • {data.item.timeAgo || ""} • {data.fixture.homeTeam} vs {data.fixture.awayTeam}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {data.permissions?.canPin ? (
                      <Button type="button" variant="outline" onClick={() => void togglePin()} disabled={pinning} className="rounded-full border-border">
                        {pinning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pin className="mr-2 h-4 w-4" />}
                        {data.item.isPinned ? "Unpin" : "Pin"}
                      </Button>
                    ) : null}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" size="icon" aria-label="เมนูหัวข้อสนทนา" className="rounded-full border-border">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        {data.permissions?.canPin ? (
                          <DropdownMenuItem onClick={() => void toggleOfficial()}>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            {data.item.isOfficialThread ? "เอา Official ออก" : "ตั้งเป็น Official"}
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem onClick={() => void copyThreadLink()}>
                          <Copy className="mr-2 h-4 w-4" />
                          คัดลอกลิงก์
                        </DropdownMenuItem>
                        {!data.item.isOwner ? (
                          <DropdownMenuItem onClick={() => void reportThreadDetail()}>
                            <Flag className="mr-2 h-4 w-4" />
                            รายงานหัวข้อ
                          </DropdownMenuItem>
                        ) : null}
                        {(data.item.isOwner || data.item.canModerate) ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => void deleteThreadDetail()} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              ลบหัวข้อ
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <p className="whitespace-pre-wrap text-base leading-8 text-muted-foreground">{data.item.content || ""}</p>

                {Array.isArray(data.item.media) && data.item.media.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.item.media.map((media) => (
                      media.url || media.ownerPreviewUrl ? (
                        <div key={media.id} className="relative aspect-[16/10] overflow-hidden rounded-[22px] border border-border bg-muted">
                          <Image src={media.url || media.ownerPreviewUrl || ""} alt={data.item.title} fill className="object-cover" unoptimized />
                        </div>
                      ) : null
                    ))}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>{data.item.likes || 0} likes</span>
                  <span>{data.item.comments || 0} comments</span>
                  <Button asChild variant="outline" className="rounded-full border-border bg-card">
                    <Link href={`/community/${data.item.id}`}>ดูโพสต์ต้นทาง</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-5">
                <Card className="rounded-[28px] border-border bg-card">
                  <CardContent className="space-y-4 p-6">
                    <h2 className="text-xl font-bold">แสดงความคิดเห็น</h2>
                    <Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="คอมเมนต์เกี่ยวกับหัวข้อนี้..." className="min-h-28 rounded-2xl border-border bg-input-background" />
                    <div className="flex justify-end">
                      <Button type="button" onClick={() => void submitComment()} disabled={submitting} className="rounded-full">
                        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        ส่งความคิดเห็น
                      </Button>
                    </div>
                    {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
                  </CardContent>
                </Card>

                <Card className="rounded-[28px] border-border bg-card">
                  <CardContent className="space-y-4 p-6">
                    <h2 className="text-xl font-bold">Comments</h2>
                    {data.comments.length ? data.comments.map((item) => (
                      <div key={item.id} id={`comment-${item.id}`} className={cn("rounded-[22px] border border-border bg-surface-2 p-4", item.isDeleted ? "border-dashed opacity-75" : "")}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{item.user.name}</span>
                            <span>•</span>
                            <span>{item.timeAgo}</span>
                            {item.isEdited ? <Badge variant="outline" className="rounded-full border-border text-[10px]">Edited</Badge> : null}
                            {item.moderationStatus === "pending_review" ? <Badge variant="outline" className="rounded-full border-amber-500/30 text-[10px] text-amber-700 dark:text-amber-200">รอตรวจ</Badge> : null}
                          </div>
                          {renderCommentActions(item, item.id)}
                        </div>
                        {editingCommentId === item.id ? (
                          <div className="mt-3 rounded-2xl border border-border bg-card p-3">
                            <Textarea value={editingCommentContent} onChange={(event) => setEditingCommentContent(event.target.value)} className="min-h-24 rounded-2xl border-border bg-input-background" />
                            <div className="mt-3 flex justify-end gap-2">
                              <Button type="button" variant="outline" onClick={() => setEditingCommentId(null)} className="rounded-full border-border">ยกเลิก</Button>
                              <Button type="button" onClick={() => void updateComment(item.id)} disabled={submitting} className="rounded-full">บันทึก</Button>
                            </div>
                          </div>
                        ) : (
                          <p className={cn("mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground", item.isDeleted ? "italic" : "")}>{item.content}</p>
                        )}
                        <div className="mt-4 space-y-3">
                          {item.replies.map((reply) => (
                            <div key={reply.id} id={`comment-${reply.id}`} className={cn("rounded-2xl border border-border bg-card px-4 py-3", reply.isDeleted ? "border-dashed opacity-75" : "")}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground">{reply.user.name}</span>
                                  <span>•</span>
                                  <span>{reply.timeAgo}</span>
                                  {reply.isEdited ? <Badge variant="outline" className="rounded-full border-border text-[10px]">Edited</Badge> : null}
                                </div>
                                {renderCommentActions(reply, item.id)}
                              </div>
                              {editingCommentId === reply.id ? (
                                <div className="mt-3">
                                  <Textarea value={editingCommentContent} onChange={(event) => setEditingCommentContent(event.target.value)} className="min-h-20 rounded-2xl border-border bg-input-background" />
                                  <div className="mt-3 flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={() => setEditingCommentId(null)} className="rounded-full border-border">ยกเลิก</Button>
                                    <Button type="button" onClick={() => void updateComment(reply.id)} disabled={submitting} className="rounded-full">บันทึก</Button>
                                  </div>
                                </div>
                              ) : (
                                <p className={cn("mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground", reply.isDeleted ? "italic" : "")}>{reply.content}</p>
                              )}
                            </div>
                          ))}
                          {activeReplyId === item.id ? (
                          <div className="rounded-2xl border border-dashed border-primary/25 bg-card p-3">
                            <Textarea
                              value={replyDrafts[item.id] || ""}
                              onChange={(event) => setReplyDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                              placeholder={`ตอบกลับ @${item.user.name}...`}
                              className="min-h-20 rounded-2xl border-border bg-input-background"
                            />
                            <div className="mt-3 flex justify-end gap-2">
                              <Button type="button" variant="ghost" onClick={() => setActiveReplyId(null)} className="rounded-full">
                                ยกเลิก
                              </Button>
                              <Button type="button" variant="outline" onClick={() => void submitComment(item.id)} disabled={submitting} className="rounded-full border-border">
                                ตอบกลับ
                              </Button>
                            </div>
                          </div>
                          ) : !item.isDeleted ? (
                            <Button type="button" variant="ghost" onClick={() => setActiveReplyId(item.id)} className="rounded-full text-muted-foreground">
                              <MessageCircle className="mr-2 h-4 w-4" />
                              ตอบกลับ
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    )) : <p className="text-sm text-muted-foreground">ยังไม่มีความคิดเห็นในหัวข้อนี้</p>}
                    {data.commentsPagination?.hasMore ? (
                      <div className="flex justify-center pt-2">
                        <Button type="button" variant="outline" onClick={() => setCommentsLimit((value) => value + 10)} className="rounded-full border-border">
                          โหลดความคิดเห็นเพิ่ม
                        </Button>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              <aside className="space-y-5">
                <Card className="rounded-[28px] border-border bg-card">
                  <CardContent className="space-y-3 p-5">
                    <h2 className="text-lg font-bold">Match context</h2>
                    <p className="text-sm text-muted-foreground">{data.fixture.homeTeam} vs {data.fixture.awayTeam}</p>
                    <p className="text-sm text-muted-foreground">{data.fixture.dateThai || data.fixture.kickoff}</p>
                    <p className="text-sm text-muted-foreground">{data.fixture.venue || "ยังไม่ระบุสนาม"}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-[28px] border-border bg-card">
                  <CardContent className="space-y-4 p-5">
                    <h2 className="text-lg font-bold">Related threads</h2>
                    {data.relatedThreads.length ? data.relatedThreads.map((thread) => (
                      <Link key={thread.id} href={`/community/matches/${matchId}/threads/${thread.id}`} className="block rounded-2xl border border-border bg-surface-2 p-4 transition hover:border-primary/40">
                        <p className="font-semibold">{thread.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{thread.excerpt}</p>
                      </Link>
                    )) : <p className="text-sm text-muted-foreground">ยังไม่มีหัวข้อที่เกี่ยวข้องเพิ่มเติม</p>}
                  </CardContent>
                </Card>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
