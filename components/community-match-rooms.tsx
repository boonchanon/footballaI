"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useState, type ChangeEvent } from "react"
import useSWR from "swr"
import {
  Bell,
  CalendarClock,
  ChevronRight,
  Copy,
  Edit3,
  Flag,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pin,
  Plus,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { fetchJson } from "@/lib/api-client"
import { COMMUNITY_THREAD_CATEGORY_LABELS } from "@/lib/server/community-threads"
import { cn } from "@/lib/utils"

export type CommunityMatchRoomFixture = {
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

export type CommunityMatchRoomPost = {
  id: string
  title: string
  excerpt?: string
  content?: string
  categoryLabel?: string
  threadCategoryLabel?: string
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

export type CommunityMatchRoomResponse = {
  fixtures: CommunityMatchRoomFixture[]
  fixture: CommunityMatchRoomFixture | null
  roomStats?: Record<
    string,
    {
      discussions: number
      polls: number
      followers?: number
      latestActivityAt?: string | null
      latestPollAt?: string | null
      summaryStatus?: string
      summaryVersion?: string
      isFollowing?: boolean
      isRecent?: boolean
      isFavoriteTeam?: boolean
      lastVisitedAt?: string | null
      activity?: { hasNewActivity?: boolean; hasNewPoll?: boolean; hasSummaryReady?: boolean; statusChanged?: boolean }
    }
  >
  matchRoomState?: { isFollowing: boolean; followedMatchIds: string[]; recentMatchIds: string[] }
  summary: {
    source: string
    status?: string
    text: string
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
    fanReaction?: MatchRoomFanReaction
  }
  fanReaction?: MatchRoomFanReaction
  summaryPermissions?: { canRegenerate: boolean }
  pollTemplate: { question: string; options: Array<{ id: string; text: string }> }
  prompts: string[]
  posts: CommunityMatchRoomPost[]
  threads?: CommunityMatchRoomPost[]
}

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

function matchRoomFetcher<T>(path: string) {
  return fetchJson<T>(path, { cache: "no-store" })
}

function getMatchTitle(fixture: CommunityMatchRoomFixture) {
  return `${fixture.homeTeam} vs ${fixture.awayTeam}`
}

function getScoreLabel(fixture: CommunityMatchRoomFixture) {
  if (fixture.homeScore !== null && fixture.awayScore !== null) return `${fixture.homeScore} - ${fixture.awayScore}`
  return "VS"
}

function getStatusLabel(status: string, isFinished?: boolean) {
  if (isFinished || ["FT", "AET", "PEN", "finished", "Finished", "Match Finished"].includes(status)) return "จบการแข่งขัน"
  if (["1H", "2H", "ET", "BT", "P", "SUSP", "INT", "live", "Live", "In Progress"].includes(status)) return "ถ่ายทอดสด"
  if (status === "HT") return "พักครึ่ง"
  if (["PST", "postponed", "Postponed"].includes(status)) return "เลื่อนการแข่งขัน"
  if (["CANC", "cancelled", "Cancelled"].includes(status)) return "ยกเลิก"
  return "กำลังจะเริ่ม"
}

function getStatusTone(status: string, isFinished?: boolean) {
  if (isFinished || ["FT", "AET", "PEN", "finished", "Finished", "Match Finished"].includes(status)) return "border-white/10 bg-white/8 text-muted-foreground"
  if (["1H", "2H", "HT", "ET", "BT", "P", "SUSP", "INT", "live", "Live", "In Progress"].includes(status)) return "border-primary/40 bg-primary/15 text-primary"
  if (["PST", "CANC", "ABD", "AWD", "WO", "postponed", "Postponed", "cancelled", "Cancelled"].includes(status)) return "border-amber-400/30 bg-amber-400/10 text-amber-200"
  return "border-sky-300/20 bg-sky-300/10 text-sky-100"
}

function getSummaryStatusLabel(summary?: CommunityMatchRoomResponse["summary"]) {
  if (!summary) return "Template"
  if (summary.isStale || summary.status === "stale") return "Stale"
  if (summary.source === "ai" && summary.status === "generated") return "Generated"
  if (summary.status === "failed") return "Template fallback"
  return summary.source === "template" ? "Template" : "Fallback"
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
    <div className="rounded-[22px] border border-white/10 bg-background/45 p-4">
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
    <Card className="rounded-[28px] border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(184,255,0,0.10),transparent_32%),rgba(18,20,18,0.9)]">
      <CardContent className="space-y-4 p-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Fan Reactions</p>
          <h3 className="text-xl font-bold text-foreground">แฟนบอลมองเกมนี้อย่างไร</h3>
          <p className="mt-1 text-xs text-muted-foreground">สรุปจาก Poll และ Community content ที่ approved แล้วเท่านั้น</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-background/45 p-4">
            <p className="text-xs text-muted-foreground">ผู้ร่วมโหวต</p>
            <p className="mt-1 text-2xl font-bold text-primary">{reaction?.participation || 0}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-background/45 p-4">
            <p className="text-xs text-muted-foreground">ตัวเลือกนำ</p>
            <p className="mt-1 line-clamp-2 text-sm font-semibold">{reaction?.topPollOption ? `${reaction.topPollOption.percent}% ${reaction.topPollOption.label}` : "ยังไม่มีผลโหวต"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-background/45 p-4">
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
          <Button type="button" variant="outline" onClick={onOpenPolls} className="rounded-full border-white/10">
            ดู Poll ทั้งหมด
          </Button>
          <Button type="button" variant="outline" onClick={onOpenThreads} className="rounded-full border-white/10">
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
    <div className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-background/70", sizeClass)}>
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
        "group rounded-[24px] border border-white/10 bg-background/45 p-4 transition hover:border-primary/40 hover:bg-primary/8 motion-reduce:transition-none",
        compact && "min-w-[260px]",
      )}
    >
      <Link href={`/community/matches/${fixture.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60" aria-label={`เปิด Match Room ${getMatchTitle(fixture)}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <TeamLogo src={fixture.homeLogo} name={fixture.homeTeam} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{fixture.homeTeam}</p>
              <p className="truncate text-sm font-semibold text-foreground">{fixture.awayTeam}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="rounded-2xl bg-black/45 px-3 py-1 text-xl font-black leading-none text-primary">{getScoreLabel(fixture)}</p>
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
        {stats?.activity?.hasSummaryReady ? <Badge variant="outline" className="rounded-full border-white/10">AI Summary</Badge> : null}
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
    <div className="group rounded-[24px] border border-white/10 bg-background/45 p-4 transition hover:border-primary/35 hover:bg-background/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
              {item.threadCategoryLabel || item.categoryLabel || "ทั่วไป"}
            </Badge>
            {item.isOfficialThread ? <Badge className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] text-sky-100 hover:bg-sky-500/15">Official</Badge> : null}
            {item.isPinned ? <Badge className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-100 hover:bg-amber-500/15">Pinned</Badge> : null}
            {item.moderationStatus === "pending_review" ? <Badge className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-white/10">กำลังรอตรวจสอบ</Badge> : null}
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
          <div className="relative hidden h-20 w-20 overflow-hidden rounded-2xl border border-white/10 bg-black/30 sm:block">
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
          <Button asChild variant="outline" className="h-9 rounded-full border-white/10 bg-background/60 px-3">
            <Link href={threadUrl}>เปิดหัวข้อ</Link>
          </Button>
          {showPinButton && onTogglePin ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => onTogglePin(item)}
              disabled={pinningId === item.id}
              className="h-9 rounded-full border-white/10 bg-background/60 px-3"
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
    <Card className="rounded-[28px] border-primary/20 bg-[radial-gradient(circle_at_left,rgba(184,255,0,0.11),transparent_34%),linear-gradient(135deg,rgba(27,29,22,0.95),rgba(15,16,18,0.94))]">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Match Rooms</p>
            <h2 className="text-xl font-bold text-foreground">ห้องแข่งขันที่กำลังน่าสนใจ</h2>
          </div>
          <Button asChild variant="outline" className="rounded-full border-white/10 bg-background/50">
            <Link href="/community/matches">ดู Match Rooms ทั้งหมด</Link>
          </Button>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-background/35 p-4 text-sm text-muted-foreground">
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
          <div className="rounded-2xl border border-dashed border-white/10 bg-background/35 p-5 text-sm text-muted-foreground">ยังไม่มีการแข่งขันในช่วงนี้</div>
        )}
      </CardContent>
    </Card>
  )
}

export function MatchRoomsDirectory() {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [view, setView] = useState<"all" | "following" | "recent" | "favorite">("all")
  const [followingBusyId, setFollowingBusyId] = useState<string | null>(null)
  const [followError, setFollowError] = useState("")
  const { data, error, isLoading, mutate } = useSWR<CommunityMatchRoomResponse>("/community/match-room", matchRoomFetcher, { revalidateOnFocus: true })
  const fixtures = data?.fixtures || []
  const visibleFixtures = filterFixtures(fixtures, query, status).filter((fixture) => {
    if (view === "following") return Boolean(data?.roomStats?.[fixture.id]?.isFollowing)
    if (view === "recent") return Boolean(data?.roomStats?.[fixture.id]?.isRecent)
    if (view === "favorite") return Boolean(data?.roomStats?.[fixture.id]?.isFavoriteTeam)
    return true
  })
  const liveFixtures = visibleFixtures.filter((fixture) => getStatusLabel(fixture.status, fixture.isFinished) === "ถ่ายทอดสด")
  const scheduledFixtures = visibleFixtures.filter((fixture) => getStatusLabel(fixture.status, fixture.isFinished) === "กำลังจะเริ่ม")
  const finishedFixtures = visibleFixtures.filter((fixture) => getStatusLabel(fixture.status, fixture.isFinished) === "จบการแข่งขัน")
  const otherFixtures = visibleFixtures.filter((fixture) => !liveFixtures.includes(fixture) && !scheduledFixtures.includes(fixture) && !finishedFixtures.includes(fixture))
  const favoriteFixtures = visibleFixtures.filter((fixture) => data?.roomStats?.[fixture.id]?.isFavoriteTeam)
  const featuredIds = new Set(favoriteFixtures.map((fixture) => fixture.id))
  const sections =
    view === "following"
      ? [{ title: "ห้องที่ติดตาม", items: visibleFixtures }]
      : view === "recent"
        ? [{ title: "ห้องที่เคยเข้า", items: visibleFixtures }]
        : view === "favorite"
          ? [{ title: "ห้องทีมโปรด", items: visibleFixtures }]
          : [
              { title: "ทีมโปรด", items: favoriteFixtures.slice(0, 6) },
              { title: "กำลังแข่งขัน", items: liveFixtures.filter((fixture) => !featuredIds.has(fixture.id)) },
              { title: "กำลังจะเริ่ม", items: scheduledFixtures.filter((fixture) => !featuredIds.has(fixture.id)) },
              { title: "จบล่าสุด", items: finishedFixtures.filter((fixture) => !featuredIds.has(fixture.id)).slice(0, 9) },
              { title: "รายการอื่น", items: otherFixtures.filter((fixture) => !featuredIds.has(fixture.id)) },
            ]

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
    <div className="min-h-screen bg-background px-3 py-5 text-foreground sm:px-5 lg:px-6">
      <main className="mx-auto max-w-7xl overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,#1e1e20_0%,#151517_100%)] shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
        <header className="flex flex-wrap items-center gap-4 border-b border-white/10 px-5 py-4 lg:px-7">
          <Button asChild variant="outline" className="rounded-full border-white/10 bg-background/50">
            <Link href="/community">← กลับคอมมูนิตี้</Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">FootballAI Community</p>
            <h1 className="text-3xl font-display font-semibold tracking-tight">Match Rooms</h1>
          </div>
          <Button asChild className="rounded-full">
            <Link href="/community/messages">Messages</Link>
          </Button>
        </header>

        <section className="space-y-5 p-5 lg:p-7">
          <div className="grid gap-3 rounded-[26px] border border-white/10 bg-background/40 p-4 md:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อทีม สนาม หรือแมตช์..." className="h-11 rounded-full border-white/10 bg-background/70 pl-11" />
            </div>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-full border border-white/10 bg-background/70 px-4 text-sm outline-none">
              <option value="all">ทุกสถานะ</option>
              <option value="ถ่ายทอดสด">ถ่ายทอดสด</option>
              <option value="กำลังจะเริ่ม">กำลังจะเริ่ม</option>
              <option value="จบการแข่งขัน">จบการแข่งขัน</option>
              <option value="เลื่อนการแข่งขัน">เลื่อนการแข่งขัน</option>
              <option value="ยกเลิก">ยกเลิก</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              ["all", "ทั้งหมด"],
              ["following", "ห้องที่ติดตาม"],
              ["recent", "เคยเข้า"],
              ["favorite", "ทีมโปรด"],
            ].map(([id, label]) => (
              <Button key={id} type="button" variant={view === id ? "default" : "outline"} onClick={() => setView(id as typeof view)} className="rounded-full">
                {label}
              </Button>
            ))}
          </div>
          {followError ? <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{followError}</p> : null}

          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="h-40 animate-pulse rounded-[24px] border border-white/10 bg-background/50 motion-reduce:animate-none" />
              ))}
            </div>
          ) : null}

          {error ? (
            <Card className="rounded-[26px] border-destructive/30 bg-destructive/10">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                <p className="text-sm text-destructive">โหลด Match Room ไม่สำเร็จ กรุณาลองใหม่</p>
                <Button variant="outline" onClick={() => void mutate()} className="rounded-full border-white/10">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {!isLoading && !error && !visibleFixtures.length ? (
            <Card className="rounded-[26px] border-dashed border-white/10 bg-card/70">
              <CardContent className="py-16 text-center text-muted-foreground">
                <Trophy className="mx-auto mb-4 h-12 w-12 text-primary/50" />
                {view === "following" ? "คุณยังไม่ได้ติดตาม Match Room" : view === "recent" ? "ยังไม่มีห้องที่เคยเข้า" : view === "favorite" ? "ยังไม่มี Match Room ของทีมโปรด" : "ยังไม่มีการแข่งขันในช่วงนี้"}
              </CardContent>
            </Card>
          ) : null}

          {sections.map((section) =>
            section.items.length ? (
              <section key={section.title} className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {section.items.map((fixture) => (
                    <MatchRoomMiniCard key={fixture.id} fixture={fixture} stats={data?.roomStats?.[fixture.id]} onToggleFollow={handleToggleFollow} followingBusy={followingBusyId === fixture.id} />
                  ))}
                </div>
              </section>
            ) : null,
          )}
        </section>
      </main>
    </div>
  )
}

function MatchHero({
  fixture,
  stats,
  onToggleFollow,
  followingBusy,
}: {
  fixture: CommunityMatchRoomFixture
  stats?: { discussions: number; polls: number; followers?: number; isFollowing?: boolean }
  onToggleFollow?: (fixture: CommunityMatchRoomFixture, nextFollow: boolean) => void
  followingBusy?: boolean
}) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-primary/25 bg-[radial-gradient(circle_at_top_left,rgba(184,255,0,0.18),transparent_32%),linear-gradient(135deg,rgba(24,28,21,0.98),rgba(8,9,10,0.98))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.3)] sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Badge variant="outline" className={cn("rounded-full px-3 py-1", getStatusTone(fixture.status, fixture.isFinished))}>
            {getStatusLabel(fixture.status, fixture.isFinished)}
          </Badge>
          <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-5xl">{getMatchTitle(fixture)}</h1>
          <p className="text-sm text-muted-foreground">{formatKickoff(fixture)}{fixture.venue ? ` • ${fixture.venue}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onToggleFollow ? (
            <Button
              type="button"
              onClick={() => onToggleFollow(fixture, !stats?.isFollowing)}
              disabled={followingBusy}
              variant={stats?.isFollowing ? "default" : "outline"}
              className="rounded-full border-white/10"
              aria-label={stats?.isFollowing ? `เลิกติดตาม ${getMatchTitle(fixture)}` : `ติดตาม ${getMatchTitle(fixture)}`}
            >
              <Bell className="mr-2 h-4 w-4" />
              {stats?.isFollowing ? "กำลังติดตาม" : "ติดตาม Match Room"}
            </Button>
          ) : null}
          <Button variant="outline" className="rounded-full border-white/10 bg-background/50">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      <div className="mt-7 grid items-center gap-4 rounded-[28px] border border-white/10 bg-black/25 p-4 sm:grid-cols-[1fr_auto_1fr]">
        <div className="flex items-center gap-4">
          <TeamLogo src={fixture.homeLogo} name={fixture.homeTeam} size="lg" />
          <p className="text-xl font-bold text-foreground sm:text-2xl">{fixture.homeTeam}</p>
        </div>
        <div className="rounded-[24px] bg-background/80 px-7 py-4 text-center text-4xl font-black text-primary" aria-label={`Score ${getScoreLabel(fixture)}`}>
          {getScoreLabel(fixture)}
        </div>
        <div className="flex items-center justify-end gap-4 text-right">
          <p className="text-xl font-bold text-foreground sm:text-2xl">{fixture.awayTeam}</p>
          <TeamLogo src={fixture.awayLogo} name={fixture.awayTeam} size="lg" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-background/35 p-3">
          <CalendarClock className="mb-2 h-4 w-4 text-primary" />
          ลีก/รายการยังไม่มีข้อมูล
        </div>
        <div className="rounded-2xl border border-white/10 bg-background/35 p-3">
          <MessageCircle className="mb-2 h-4 w-4 text-primary" />
          {stats?.discussions || 0} โพสต์ในห้องนี้
        </div>
        <div className="rounded-2xl border border-white/10 bg-background/35 p-3">
          <Users className="mb-2 h-4 w-4 text-primary" />
          {stats?.polls || 0} Poll ที่ผูกกับแมตช์
        </div>
        <div className="rounded-2xl border border-white/10 bg-background/35 p-3">
          <Bell className="mb-2 h-4 w-4 text-primary" />
          {stats?.followers || 0} ผู้ติดตามห้องนี้
        </div>
      </div>
    </section>
  )
}

export function MatchRoomDetail({ matchId }: { matchId: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = (searchParams.get("tab") || "overview") as RoomTab
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
  const { data, error, isLoading, mutate } = useSWR<CommunityMatchRoomResponse>(`/community/match-room?matchId=${encodeURIComponent(matchId)}`, matchRoomFetcher, { revalidateOnFocus: true })
  const threadQuery = `/community/match-room/threads?matchId=${encodeURIComponent(matchId)}&sort=${encodeURIComponent(threadSort)}${threadCategory !== "all" ? `&category=${encodeURIComponent(threadCategory)}` : ""}${officialOnly ? "&official=1" : ""}`
  const { data: threadData, error: threadError, isLoading: threadLoading, mutate: mutateThreads } = useSWR<CommunityMatchRoomThreadResponse>(
    data?.fixture ? threadQuery : null,
    matchRoomFetcher,
    { revalidateOnFocus: true },
  )
  const fixture = data?.fixture || null
  const posts = data?.posts || []
  const polls = posts.filter((post) => post.poll?.question)
  const threads = threadData?.items || data?.threads || []

  function changeTab(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  async function handleThreadImageSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setThreadFormError("")
    setUploadingThreadImage(true)
    try {
      const formData = new FormData()
      formData.append("purpose", "upload")
      formData.append("files", file)
      const response = await fetch("/api/community/upload", { method: "POST", body: formData })
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
          <Button asChild variant="outline" className="rounded-full border-white/10 bg-background/60">
            <Link href="/community/matches">← กลับ Match Rooms</Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-full text-muted-foreground">
            <Link href="/community">Feed</Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-full text-muted-foreground">
            <Link href="/community/messages">Messages</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex min-h-[50vh] items-center justify-center rounded-[32px] border border-white/10 bg-card/80 text-muted-foreground">
            <Loader2 className="mr-3 h-5 w-5 animate-spin text-primary" />
            กำลังโหลด Match Room...
          </div>
        ) : null}

        {error ? (
          <Card className="rounded-[28px] border-destructive/30 bg-destructive/10">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
              <p className="text-destructive">โหลด Match Room ไม่สำเร็จ กรุณาลองใหม่</p>
              <Button variant="outline" onClick={() => void mutate()} className="rounded-full border-white/10">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && !error && !fixture ? (
          <Card className="rounded-[28px] border-dashed border-white/10 bg-card/70">
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
            <MatchHero fixture={fixture} stats={data?.roomStats?.[fixture.id]} onToggleFollow={handleToggleFollow} followingBusy={followingBusyId === fixture.id} />

            <Tabs value={safeTab} onValueChange={changeTab} className="space-y-4">
              <div className="overflow-x-auto pb-1">
                <TabsList className="h-12 rounded-full border border-white/10 bg-card/80 p-1">
                  {roomTabs.map((tab) => (
                    <TabsTrigger key={tab.id} value={tab.id} className="rounded-full px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value="overview">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-5">
                    <Card className="rounded-[28px] border-white/10 bg-card/85">
                      <CardContent className="space-y-3 p-5">
                        <div className="flex items-center gap-2 text-primary">
                          <Sparkles className="h-5 w-5" />
                          <h2 className="text-xl font-bold text-foreground">AI Summary Preview</h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary">{getSummaryStatusLabel(data?.summary)}</Badge>
                          {data?.summary?.isStale ? <Badge variant="outline" className="rounded-full border-amber-400/30 text-amber-200">ข้อมูลมีการอัปเดต</Badge> : null}
                        </div>
                        <h3 className="text-2xl font-semibold">{data?.summary?.headline || "ยังไม่มีสรุปเกม"}</h3>
                        <p className="leading-7 text-muted-foreground">{data?.summary?.shortSummary || data?.summary?.text || "สรุปเกมจะพร้อมเมื่อมีข้อมูลการแข่งขันเพียงพอ"}</p>
                        <Button type="button" variant="outline" onClick={() => changeTab("summary")} className="rounded-full border-white/10">ดูสรุปเต็ม</Button>
                      </CardContent>
                    </Card>

                    <Card className="rounded-[28px] border-white/10 bg-card/85">
                      <CardContent className="p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h2 className="text-xl font-bold">Discussion ล่าสุด</h2>
                          <Button asChild variant="outline" className="rounded-full border-white/10 bg-background/60">
                            <Link href={`/community?matchId=${encodeURIComponent(fixture.id)}&compose=1`}>เริ่มโพสต์</Link>
                          </Button>
                        </div>
                        {posts.length ? (
                          <div className="mt-4 space-y-3">
                            {posts.slice(0, 3).map((post) => (
                              <Link key={post.id} href={`/community/${post.id}`} className="block rounded-2xl border border-white/10 bg-background/45 p-4 transition hover:border-primary/40">
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
                    <Card className="rounded-[28px] border-white/10 bg-card/85">
                      <CardContent className="p-5">
                        <h2 className="text-lg font-bold">Thread preview</h2>
                        {threads[0] ? (
                          <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-background/45 p-4">
                            <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">{(threads[0] as any).threadCategoryLabel || "ทั่วไป"}</Badge>
                            <p className="font-semibold">{threads[0].title}</p>
                            <p className="line-clamp-2 text-sm text-muted-foreground">{threads[0].excerpt}</p>
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-muted-foreground">ยังไม่มีหัวข้อสนทนาใน Match Room นี้</p>
                        )}
                      </CardContent>
                    </Card>
                    <Card className="rounded-[28px] border-white/10 bg-card/85">
                      <CardContent className="p-5">
                        <h2 className="text-lg font-bold">Poll preview</h2>
                        {polls[0]?.poll ? <p className="mt-3 text-sm text-muted-foreground">{polls[0].poll.question}</p> : <p className="mt-3 text-sm text-muted-foreground">ยังไม่มี Poll สำหรับเกมนี้</p>}
                        <Button type="button" variant="outline" onClick={() => changeTab("polls")} className="mt-4 rounded-full border-white/10">ดู Poll</Button>
                      </CardContent>
                    </Card>
                  </aside>
                </div>
              </TabsContent>

              <TabsContent value="discussion">
                <Card className="rounded-[28px] border-white/10 bg-card/85">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-xl font-bold">ห้องคุย</h2>
                      <Button asChild className="rounded-full">
                        <Link href={`/community?matchId=${encodeURIComponent(fixture.id)}&compose=1`}>
                          <MessageCircle className="mr-2 h-4 w-4" />
                          ร่วมพูดคุย
                        </Link>
                      </Button>
                    </div>
                    {posts.length ? posts.map((post) => (
                      <Link key={post.id} href={`/community/${post.id}`} className="block rounded-2xl border border-white/10 bg-background/45 p-4 transition hover:border-primary/40">
                        <p className="font-semibold">{post.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
                      </Link>
                    )) : <p className="text-sm text-muted-foreground">ยังไม่มีใครเริ่มพูดคุยเกี่ยวกับเกมนี้</p>}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="threads">
                <Card className="rounded-[28px] border-white/10 bg-card/85">
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

                    <div className="grid gap-3 rounded-[24px] border border-white/10 bg-background/40 p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
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
                      <div className="rounded-2xl border border-white/10 bg-background/45 p-5 text-sm text-muted-foreground">
                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin text-primary" />
                        กำลังโหลดหัวข้อสนทนา...
                      </div>
                    ) : threadError ? (
                      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
                        โหลดหัวข้อไม่สำเร็จ
                        <Button type="button" variant="outline" onClick={() => void mutateThreads()} className="ml-3 rounded-full border-white/10">Retry</Button>
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
                      <div className="rounded-2xl border border-dashed border-white/10 bg-background/35 p-8 text-center text-sm text-muted-foreground">
                        ยังไม่มีหัวข้อสนทนา ลองสร้างหัวข้อที่คุณสนใจ
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="polls">
                <Card className="rounded-[28px] border-white/10 bg-card/85">
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
                      <Link key={post.id} href={`/community/${post.id}`} className="block rounded-2xl border border-white/10 bg-background/45 p-4 transition hover:border-primary/40">
                        <Badge variant="outline" className="mb-2 rounded-full border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                          Poll จาก Community
                        </Badge>
                        <p className="font-semibold">{post.poll?.question}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{post.poll?.totalVotes || 0} votes • จากโพสต์ {post.title}</p>
                      </Link>
                    )) : <p className="text-sm text-muted-foreground">ยังไม่มี Poll สำหรับเกมนี้</p>}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="summary">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <Card className="rounded-[28px] border-white/10 bg-card/85">
                    <CardContent className="space-y-5 p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="rounded-full bg-primary text-primary-foreground hover:bg-primary">AI</Badge>
                            <Badge variant="outline" className="rounded-full border-white/10 text-muted-foreground">{getSummaryStatusLabel(data?.summary)}</Badge>
                            {data?.summary?.isStale ? <Badge variant="outline" className="rounded-full border-amber-400/30 text-amber-200">ข้อมูลการแข่งขันมีการอัปเดต</Badge> : null}
                          </div>
                          <h2 className="mt-3 text-3xl font-bold text-foreground">สรุปเกมโดย AI</h2>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {data?.summary?.generatedAt ? `Generated: ${new Date(data.summary.generatedAt).toLocaleString("th-TH")}` : "ยังไม่มี generation จาก AI"}
                          </p>
                        </div>
                        {data?.summaryPermissions?.canRegenerate ? (
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" onClick={() => void handleOpenSummaryHistory()} className="rounded-full border-white/10">
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

                      <div className="grid gap-3 rounded-[22px] border border-white/10 bg-background/35 p-4 text-xs text-muted-foreground sm:grid-cols-4">
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
                        <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100">
                          ข้อมูลการแข่งขันหรือ Community aggregate มีการอัปเดต สรุปเก่ายังอ่านได้ แต่แอดมินสามารถ Refresh เพื่อสร้างใหม่
                        </div>
                      ) : null}

                      <div className="rounded-[24px] border border-primary/20 bg-primary/10 p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Headline</p>
                        <h3 className="mt-2 text-2xl font-semibold text-foreground">{data?.summary?.headline || "ยังไม่มีสรุปเกม"}</h3>
                        <p className="mt-3 leading-7 text-muted-foreground">{data?.summary?.shortSummary || data?.summary?.text || "ระบบจะแสดง fact-only summary เมื่อมีข้อมูลยืนยันจาก server"}</p>
                      </div>

                      {data?.summary?.matchStory ? (
                        <div className="rounded-[22px] border border-white/10 bg-background/45 p-4">
                          <h3 className="text-base font-semibold text-foreground">เรื่องราวของเกม</h3>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{data.summary.matchStory}</p>
                        </div>
                      ) : null}

                      <SummaryListSection title="Timeline จุดสำคัญ" items={data?.summary?.keyMoments} />
                      {data?.summary?.turningPoint ? (
                        <div className="rounded-[22px] border border-white/10 bg-background/45 p-4">
                          <h3 className="text-base font-semibold text-foreground">จุดเปลี่ยนเกม</h3>
                          <p className="mt-3 text-sm leading-7 text-muted-foreground">{data.summary.turningPoint}</p>
                        </div>
                      ) : null}
                      <SummaryListSection title="สถิติเด่น" items={data?.summary?.statisticsHighlights} />
                      <SummaryListSection title="ผู้เล่นโดดเด่น" items={data?.summary?.topPlayers} />
                      {data?.summary?.tacticalSummary ? (
                        <div className="rounded-[22px] border border-white/10 bg-background/45 p-4">
                          <h3 className="text-base font-semibold text-foreground">มุมแท็กติก</h3>
                          <p className="mt-3 text-sm leading-7 text-muted-foreground">{data.summary.tacticalSummary}</p>
                        </div>
                      ) : null}
                      <SummaryListSection title="ข้อจำกัดของข้อมูล" items={data?.summary?.limitations} />
                      <p className="rounded-2xl border border-white/10 bg-background/35 p-4 text-xs leading-6 text-muted-foreground">
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
                    <Card className="rounded-[28px] border-white/10 bg-card/85">
                      <CardContent className="space-y-3 p-5">
                        <h3 className="text-lg font-bold">แหล่งข้อมูลที่ใช้</h3>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline" className="rounded-full border-white/10">Server score</Badge>
                          <Badge variant="outline" className="rounded-full border-white/10">Approved polls</Badge>
                          <Badge variant="outline" className="rounded-full border-white/10">Approved threads</Badge>
                          <Badge variant="outline" className="rounded-full border-white/10">Approved comments</Badge>
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
              <DialogContent className="max-h-[82vh] max-w-2xl overflow-hidden rounded-[28px] border-border/60 bg-[#101214] p-0 text-foreground">
                <DialogHeader className="border-b border-border/60 px-6 py-5">
                  <DialogTitle>ประวัติ AI Summary</DialogTitle>
                  <DialogDescription>แสดงเฉพาะ metadata ของการสร้างสรุป ไม่เก็บ prompt, API payload หรือคอมเมนต์ดิบ</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 overflow-y-auto px-6 py-5">
                  {loadingSummaryHistory ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-background/40 p-4 text-sm text-muted-foreground">
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
                        <div key={item.id} className="rounded-2xl border border-white/10 bg-background/45 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="rounded-full border-primary/25 bg-primary/10 text-primary">
                                {getSummaryHistoryActionLabel(item.action)}
                              </Badge>
                              <Badge variant="outline" className="rounded-full border-white/10 text-muted-foreground">
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
                    <p className="rounded-2xl border border-dashed border-white/10 bg-background/35 p-5 text-sm text-muted-foreground">ยังไม่มีประวัติการ regenerate</p>
                  ) : null}
                </div>
                <DialogFooter className="border-t border-border/60 px-6 py-4">
                  <Button type="button" variant="outline" onClick={() => setShowSummaryHistory(false)} className="rounded-full border-white/10">
                    ปิด
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showCreateThread} onOpenChange={setShowCreateThread}>
              <DialogContent className="max-h-[88vh] max-w-2xl overflow-hidden rounded-[28px] border-border/60 bg-[#101214] p-0 text-foreground">
                <DialogHeader className="border-b border-border/60 px-6 py-5">
                  <DialogTitle>สร้างหัวข้อสนทนา</DialogTitle>
                  <DialogDescription>หัวข้อนี้จะถูกผูกกับ Match Room ปัจจุบันอัตโนมัติ และจะผ่าน moderation เดิมก่อนเผยแพร่</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 overflow-y-auto px-6 py-5">
                  <Input value={threadTitle} onChange={(event) => setThreadTitle(event.target.value)} placeholder="หัวข้อสนทนา" className="h-12 rounded-2xl border-white/10 bg-background/60" />
                  <Textarea value={threadContent} onChange={(event) => setThreadContent(event.target.value)} placeholder="อยากชวนคุยประเด็นไหนเกี่ยวกับเกมนี้..." className="min-h-32 rounded-2xl border-white/10 bg-background/60" />
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(COMMUNITY_THREAD_CATEGORY_LABELS).map(([id, label]) => (
                      <Button key={id} type="button" variant={threadFormCategory === id ? "default" : "outline"} onClick={() => setThreadFormCategory(id)} className="rounded-full">
                        {label}
                      </Button>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-dashed border-white/10 bg-background/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">รูปประกอบหัวข้อ</p>
                        <p className="text-sm text-muted-foreground">แนบได้ 1 รูป ระบบจะตรวจสื่อก่อนเหมือนโพสต์ปกติ</p>
                      </div>
                      <label className="inline-flex cursor-pointer items-center rounded-full border border-white/10 bg-background/70 px-4 py-2 text-sm">
                        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleThreadImageSelected} />
                        {uploadingThreadImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        เลือกรูป
                      </label>
                    </div>
                    {threadImage ? (
                      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                        <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/10">
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
                  <Button type="button" variant="outline" onClick={() => setShowCreateThread(false)} className="rounded-full border-white/10">
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
              <DialogContent className="max-w-2xl rounded-[28px] border-white/10 bg-card">
                <DialogHeader>
                  <DialogTitle>แก้ไขหัวข้อสนทนา</DialogTitle>
                  <DialogDescription>แก้หัวข้อและเนื้อหาโดยยังผ่าน moderation เดิม หากมีความเสี่ยงจะรอตรวจ</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input value={editThreadTitle} onChange={(event) => setEditThreadTitle(event.target.value)} placeholder="หัวข้อสนทนา" className="h-12 rounded-2xl border-white/10 bg-background/60" />
                  <div className="flex flex-wrap gap-2">
                    {threadCategories.filter((option) => option.id !== "all").map((option) => (
                      <Button key={option.id} type="button" variant={editThreadCategory === option.id ? "default" : "outline"} onClick={() => setEditThreadCategory(option.id)} className="rounded-full">
                        {option.label}
                      </Button>
                    ))}
                  </div>
                  <Textarea value={editThreadContent} onChange={(event) => setEditThreadContent(event.target.value)} placeholder="เขียนรายละเอียดหัวข้อ..." className="min-h-36 rounded-2xl border-white/10 bg-background/60" />
                  {threadFormError ? <p className="text-sm text-destructive">{threadFormError}</p> : null}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingThread(null)} className="rounded-full border-white/10">
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

        <Button asChild variant="outline" className="rounded-full border-white/10 bg-background/60">
          <Link href={`/community/matches/${matchId}?tab=threads`}>← กลับหัวข้อสนทนา</Link>
        </Button>

        {isLoading ? (
          <Card className="rounded-[28px] border-white/10 bg-card/85">
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
            <Card className="rounded-[28px] border-white/10 bg-card/85">
              <CardContent className="space-y-5 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary">{data.item.threadCategoryLabel || "ทั่วไป"}</Badge>
                      {data.item.isOfficialThread ? <Badge className="rounded-full bg-sky-500/15 text-sky-100 hover:bg-sky-500/15">Official</Badge> : null}
                      {data.item.isPinned ? <Badge className="rounded-full bg-amber-500/15 text-amber-100 hover:bg-amber-500/15">Pinned</Badge> : null}
                      {data.item.isEdited ? <Badge variant="outline" className="rounded-full border-white/10">Edited</Badge> : null}
                    </div>
                    <h1 className="mt-3 text-3xl font-semibold">{data.item.title}</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {data.item.author?.name || "ผู้ใช้งาน"} • {data.item.timeAgo || ""} • {data.fixture.homeTeam} vs {data.fixture.awayTeam}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {data.permissions?.canPin ? (
                      <Button type="button" variant="outline" onClick={() => void togglePin()} disabled={pinning} className="rounded-full border-white/10">
                        {pinning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pin className="mr-2 h-4 w-4" />}
                        {data.item.isPinned ? "Unpin" : "Pin"}
                      </Button>
                    ) : null}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" size="icon" aria-label="เมนูหัวข้อสนทนา" className="rounded-full border-white/10">
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
                        <div key={media.id} className="relative aspect-[16/10] overflow-hidden rounded-[22px] border border-white/10 bg-black/30">
                          <Image src={media.url || media.ownerPreviewUrl || ""} alt={data.item.title} fill className="object-cover" unoptimized />
                        </div>
                      ) : null
                    ))}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>{data.item.likes || 0} likes</span>
                  <span>{data.item.comments || 0} comments</span>
                  <Button asChild variant="outline" className="rounded-full border-white/10 bg-background/60">
                    <Link href={`/community/${data.item.id}`}>ดูโพสต์ต้นทาง</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-5">
                <Card className="rounded-[28px] border-white/10 bg-card/85">
                  <CardContent className="space-y-4 p-6">
                    <h2 className="text-xl font-bold">แสดงความคิดเห็น</h2>
                    <Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="คอมเมนต์เกี่ยวกับหัวข้อนี้..." className="min-h-28 rounded-2xl border-white/10 bg-background/60" />
                    <div className="flex justify-end">
                      <Button type="button" onClick={() => void submitComment()} disabled={submitting} className="rounded-full">
                        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        ส่งความคิดเห็น
                      </Button>
                    </div>
                    {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
                  </CardContent>
                </Card>

                <Card className="rounded-[28px] border-white/10 bg-card/85">
                  <CardContent className="space-y-4 p-6">
                    <h2 className="text-xl font-bold">Comments</h2>
                    {data.comments.length ? data.comments.map((item) => (
                      <div key={item.id} id={`comment-${item.id}`} className={cn("rounded-[22px] border border-white/10 bg-background/45 p-4", item.isDeleted ? "border-dashed opacity-75" : "")}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{item.user.name}</span>
                            <span>•</span>
                            <span>{item.timeAgo}</span>
                            {item.isEdited ? <Badge variant="outline" className="rounded-full border-white/10 text-[10px]">Edited</Badge> : null}
                            {item.moderationStatus === "pending_review" ? <Badge variant="outline" className="rounded-full border-amber-400/30 text-[10px] text-amber-200">รอตรวจ</Badge> : null}
                          </div>
                          {renderCommentActions(item, item.id)}
                        </div>
                        {editingCommentId === item.id ? (
                          <div className="mt-3 rounded-2xl border border-white/10 bg-background/50 p-3">
                            <Textarea value={editingCommentContent} onChange={(event) => setEditingCommentContent(event.target.value)} className="min-h-24 rounded-2xl border-white/10 bg-background/60" />
                            <div className="mt-3 flex justify-end gap-2">
                              <Button type="button" variant="outline" onClick={() => setEditingCommentId(null)} className="rounded-full border-white/10">ยกเลิก</Button>
                              <Button type="button" onClick={() => void updateComment(item.id)} disabled={submitting} className="rounded-full">บันทึก</Button>
                            </div>
                          </div>
                        ) : (
                          <p className={cn("mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground", item.isDeleted ? "italic" : "")}>{item.content}</p>
                        )}
                        <div className="mt-4 space-y-3">
                          {item.replies.map((reply) => (
                            <div key={reply.id} id={`comment-${reply.id}`} className={cn("rounded-2xl border border-white/10 bg-black/15 px-4 py-3", reply.isDeleted ? "border-dashed opacity-75" : "")}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground">{reply.user.name}</span>
                                  <span>•</span>
                                  <span>{reply.timeAgo}</span>
                                  {reply.isEdited ? <Badge variant="outline" className="rounded-full border-white/10 text-[10px]">Edited</Badge> : null}
                                </div>
                                {renderCommentActions(reply, item.id)}
                              </div>
                              {editingCommentId === reply.id ? (
                                <div className="mt-3">
                                  <Textarea value={editingCommentContent} onChange={(event) => setEditingCommentContent(event.target.value)} className="min-h-20 rounded-2xl border-white/10 bg-background/60" />
                                  <div className="mt-3 flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={() => setEditingCommentId(null)} className="rounded-full border-white/10">ยกเลิก</Button>
                                    <Button type="button" onClick={() => void updateComment(reply.id)} disabled={submitting} className="rounded-full">บันทึก</Button>
                                  </div>
                                </div>
                              ) : (
                                <p className={cn("mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground", reply.isDeleted ? "italic" : "")}>{reply.content}</p>
                              )}
                            </div>
                          ))}
                          {activeReplyId === item.id ? (
                          <div className="rounded-2xl border border-dashed border-primary/25 bg-background/35 p-3">
                            <Textarea
                              value={replyDrafts[item.id] || ""}
                              onChange={(event) => setReplyDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                              placeholder={`ตอบกลับ @${item.user.name}...`}
                              className="min-h-20 rounded-2xl border-white/10 bg-background/60"
                            />
                            <div className="mt-3 flex justify-end gap-2">
                              <Button type="button" variant="ghost" onClick={() => setActiveReplyId(null)} className="rounded-full">
                                ยกเลิก
                              </Button>
                              <Button type="button" variant="outline" onClick={() => void submitComment(item.id)} disabled={submitting} className="rounded-full border-white/10">
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
                        <Button type="button" variant="outline" onClick={() => setCommentsLimit((value) => value + 10)} className="rounded-full border-white/10">
                          โหลดความคิดเห็นเพิ่ม
                        </Button>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              <aside className="space-y-5">
                <Card className="rounded-[28px] border-white/10 bg-card/85">
                  <CardContent className="space-y-3 p-5">
                    <h2 className="text-lg font-bold">Match context</h2>
                    <p className="text-sm text-muted-foreground">{data.fixture.homeTeam} vs {data.fixture.awayTeam}</p>
                    <p className="text-sm text-muted-foreground">{data.fixture.dateThai || data.fixture.kickoff}</p>
                    <p className="text-sm text-muted-foreground">{data.fixture.venue || "ยังไม่ระบุสนาม"}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-[28px] border-white/10 bg-card/85">
                  <CardContent className="space-y-4 p-5">
                    <h2 className="text-lg font-bold">Related threads</h2>
                    {data.relatedThreads.length ? data.relatedThreads.map((thread) => (
                      <Link key={thread.id} href={`/community/matches/${matchId}/threads/${thread.id}`} className="block rounded-2xl border border-white/10 bg-background/45 p-4 transition hover:border-primary/40">
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
