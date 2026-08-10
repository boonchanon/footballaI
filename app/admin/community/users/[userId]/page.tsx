"use client"

import { useEffect, useState } from "react"
import type React from "react"
import Link from "next/link"
import { ArrowLeft, Ban, CheckCircle, Clock, ShieldAlert, TriangleAlert } from "lucide-react"

import {
  AdminActionDialog,
  AdminEmptyState,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatCard,
  AdminStatusBadge,
  getCommunityStatusTone,
} from "@/components/admin/community-admin-ui"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchJson } from "@/lib/api-client"

type StatIcon = React.ComponentType<{ className?: string }>

type ModerationState = {
  status: "active" | "restricted" | "suspended" | "banned"
  warningsCount: number
  postingRestrictedUntil: string | null
  suspendedAt: string | null
  bannedAt: string | null
  lastActionAt: string | null
}

type DetailResponse = {
  user: {
    id: string
    name: string
    email: string
    avatar: string
    favoriteTeam: string
    bio: string
    moderationState: ModerationState
    communityStats: { posts: number; comments: number; pollVotes: number; matchRoomPosts: number; followedMatchRooms: number; reportsAgainst: number }
  }
  posts: Array<{ id: string; title: string; contentType: string; status: string; moderationStatus: string; reportsCount: number; timeAgo: string }>
  reportsAgainst: Array<{ id: string; reason: string; targetType: string; status: string; timeAgo: string }>
  history: Array<{ id: string; action: string; contentType: string; status: string; metadata?: Record<string, unknown>; createdAt: string; admin?: { email: string; role: string } | null }>
}

type PendingAction = {
  action: string
  title: string
  confirmLabel: string
  destructive?: boolean
  impact: string
} | null

export default function AdminCommunityUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const [userId, setUserId] = useState("")
  const [data, setData] = useState<DetailResponse | null>(null)
  const [duration, setDuration] = useState("7d")
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    void params.then((value) => setUserId(value.userId))
  }, [params])

  async function load() {
    if (!userId) return
    setLoading(true)
    try {
      const response = await fetchJson<DetailResponse>(`/admin/community/users/${userId}`)
      setData(response)
      setError("")
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลดผู้ใช้ไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [userId])

  async function runAction() {
    if (!data) return
    if (!pendingAction || reason.trim().length < 6) return
    setActing(pendingAction.action)
    try {
      await fetchJson(`/admin/community/users/${data.user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: pendingAction.action, reason: reason.trim(), duration }),
      })
      setPendingAction(null)
      setReason("")
      await load()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "ดำเนินการไม่สำเร็จ")
    } finally {
      setActing("")
    }
  }

  const state = data?.user.moderationState
  const isBanned = Boolean(state?.bannedAt)
  const isSuspended = Boolean(state?.suspendedAt)
  const isRestricted = Boolean(state?.postingRestrictedUntil)

  function openAction(action: NonNullable<PendingAction>) {
    setReason("")
    setPendingAction(action)
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={data?.user.name || "Community User"}
        description="User moderation detail พร้อม current status, action history และ audit trail"
        action={
          <Button asChild variant="outline">
            <Link href="/admin/community/users"><ArrowLeft className="mr-2 h-4 w-4" />Back to users</Link>
          </Button>
        }
      />

      {error ? <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
      {loading ? <Skeleton className="h-80 rounded-2xl" /> : null}

      {!loading && data ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <Card className="border-border/70 bg-card/80">
              <CardContent className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_280px]">
                <div className="flex min-w-0 gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={data.user.avatar || "/placeholder.svg"} />
                    <AvatarFallback>{data.user.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xl font-semibold">{data.user.name}</p>
                    <AdminStatusBadge tone={getCommunityStatusTone(data.user.moderationState.status)}>{data.user.moderationState.status}</AdminStatusBadge>
                    <Badge variant="outline">{data.user.moderationState.warningsCount} warnings</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{data.user.email}</p>
                  <p className="mt-3 text-sm">{data.user.bio || "No bio"}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
                  <p className="font-medium">Current Status</p>
                  <div className="mt-3 space-y-1 text-muted-foreground">
                    <p>Favorite: {data.user.favoriteTeam || "-"}</p>
                    <p>Restricted until: {state?.postingRestrictedUntil ? new Date(state.postingRestrictedUntil).toLocaleString("th-TH") : "-"}</p>
                    <p>Suspended: {state?.suspendedAt ? new Date(state.suspendedAt).toLocaleString("th-TH") : "-"}</p>
                    <p>Banned: {state?.bannedAt ? new Date(state.bannedAt).toLocaleString("th-TH") : "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: "Posts", value: data.user.communityStats.posts, icon: CheckCircle as StatIcon, tone: "info" as const },
                { label: "Room posts", value: data.user.communityStats.matchRoomPosts, icon: ShieldAlert as StatIcon, tone: "info" as const },
                { label: "Reports", value: data.user.communityStats.reportsAgainst, icon: TriangleAlert as StatIcon, tone: "pending" as const },
                { label: "Warnings", value: data.user.moderationState.warningsCount, icon: Clock as StatIcon, tone: "restricted" as const },
              ].map((item) => <AdminStatCard key={item.label} label={item.label} value={item.value} icon={item.icon} tone={item.tone} />)}
            </div>

            <AdminSectionCard title="Recent Content">
              <div className="space-y-3">
                {data.posts.map((post) => (
                  <div key={post.id} className="rounded-xl border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{post.contentType}</Badge>
                      <Badge>{post.status}</Badge>
                      {post.reportsCount ? <Badge className="bg-amber-500/10 text-amber-400">{post.reportsCount} reports</Badge> : null}
                    </div>
                    <p className="mt-2 font-medium">{post.title}</p>
                    <p className="text-xs text-muted-foreground">{post.timeAgo}</p>
                  </div>
                ))}
                {!data.posts.length ? <AdminEmptyState title="No recent content" /> : null}
              </div>
            </AdminSectionCard>

            <AdminSectionCard title="Moderation History">
              <div className="space-y-3">
                {data.history.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminStatusBadge tone={getCommunityStatusTone(item.action)}>{item.action}</AdminStatusBadge>
                      <AdminStatusBadge tone={getCommunityStatusTone(item.status)}>{item.status}</AdminStatusBadge>
                    </div>
                    <p className="mt-2 text-muted-foreground">{item.admin?.email || "system"} • {new Date(item.createdAt).toLocaleString("th-TH")}</p>
                    {item.metadata?.reason ? <p className="mt-1">Reason: {String(item.metadata.reason)}</p> : null}
                  </div>
                ))}
                {!data.history.length ? <AdminEmptyState title="No moderation history" /> : null}
              </div>
            </AdminSectionCard>
          </div>

          <Card className="h-fit border-border/70 bg-card/80 lg:sticky lg:top-20">
            <CardContent className="space-y-3 p-5">
              <div>
                <p className="font-semibold">Moderation Actions</p>
                <p className="text-sm text-muted-foreground">ทุก action ต้องมี reason และบันทึก audit</p>
              </div>
              <Button className="w-full justify-start" variant="outline" disabled={Boolean(acting)} onClick={() => openAction({ action: "warn", title: "Warn Community User", confirmLabel: "Warn User", impact: "ส่งคำเตือนให้ผู้ใช้ โดยไม่ปิดสิทธิ์การใช้งาน Community" })}>
                <TriangleAlert className="mr-2 h-4 w-4" />Warn
              </Button>
              {!isBanned && !isRestricted ? (
                <>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger><SelectValue placeholder="Duration" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">1 hour</SelectItem>
                      <SelectItem value="24h">24 hours</SelectItem>
                      <SelectItem value="3d">3 days</SelectItem>
                      <SelectItem value="7d">7 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="w-full justify-start" variant="outline" disabled={Boolean(acting)} onClick={() => openAction({ action: "restrict", title: "Restrict Community User", confirmLabel: "Restrict User", impact: "จำกัดการสร้างเนื้อหาและ interaction บางส่วนตามระยะเวลาที่เลือก" })}>
                    <Clock className="mr-2 h-4 w-4" />Restrict
                  </Button>
                </>
              ) : null}
              {isRestricted ? (
                <Button className="w-full justify-start" variant="outline" disabled={Boolean(acting)} onClick={() => openAction({ action: "clear_restriction", title: "Clear Community Restriction", confirmLabel: "Clear Restriction", impact: "คืนสิทธิ์ interaction ที่ถูกจำกัดไว้ โดยไม่ลบ moderation history เดิม" })}>
                  <CheckCircle className="mr-2 h-4 w-4" />Clear Restriction
                </Button>
              ) : null}
              {isSuspended ? (
                <Button className="w-full justify-start" variant="outline" disabled={Boolean(acting)} onClick={() => openAction({ action: "unsuspend", title: "Unsuspend Community User", confirmLabel: "Unsuspend", impact: "คืนสิทธิ์ Community ให้ผู้ใช้นี้ โดยไม่ลบ moderation history เดิม" })}>
                  <CheckCircle className="mr-2 h-4 w-4" />Unsuspend
                </Button>
              ) : !isBanned ? (
                <Button className="w-full justify-start" variant="outline" disabled={Boolean(acting)} onClick={() => openAction({ action: "suspend", title: "Suspend Community User", confirmLabel: "Suspend User", destructive: true, impact: "ระงับการ interaction ใน Community ชั่วคราวตาม Community policy" })}>
                  <ShieldAlert className="mr-2 h-4 w-4" />Suspend
                </Button>
              ) : null}
              {isBanned ? (
                <Button className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90" disabled={Boolean(acting)} onClick={() => openAction({ action: "unban", title: "Unban Community User", confirmLabel: "Unban", impact: "คืนสิทธิ์ Community ให้ผู้ใช้นี้ โดยไม่ลบประวัติ Moderation เดิม" })}>
                  <CheckCircle className="mr-2 h-4 w-4" />Unban
                </Button>
              ) : (
                <Button className="w-full justify-start" variant="destructive" disabled={Boolean(acting)} onClick={() => openAction({ action: "ban", title: "Ban Community User", confirmLabel: "Ban User", destructive: true, impact: "ผู้ใช้จะยังอ่าน Community ได้ แต่ไม่สามารถมี interaction ตาม Community Ban Policy" })}>
                  <Ban className="mr-2 h-4 w-4" />Ban
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <AdminActionDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.title || ""}
        description="Action นี้จะ refresh state จาก server และเพิ่มรายการใน audit history หลังสำเร็จ"
        target={data?.user.name || data?.user.email}
        reason={reason}
        destructive={pendingAction?.destructive}
        busy={Boolean(acting)}
        confirmLabel={pendingAction?.confirmLabel || "Confirm"}
        impact={pendingAction?.impact}
        onReasonChange={setReason}
        onCancel={() => {
          if (acting) return
          setPendingAction(null)
          setReason("")
        }}
        onConfirm={() => void runAction()}
      />
    </div>
  )
}
