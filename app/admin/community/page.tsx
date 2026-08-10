"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, Ban, FileText, Flag, MessageSquare, ShieldCheck, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminRetryButton,
  AdminSectionCard,
  AdminStatCard,
  AdminStatusBadge,
  getCommunityStatusTone,
} from "@/components/admin/community-admin-ui"
import { fetchJson } from "@/lib/api-client"

type OverviewResponse = {
  metrics: Record<string, number>
  recentOperations: Array<{ id: string; action: string; contentType: string; status: string; admin: string; reason: string; timeAgo: string }>
  recentReports: Array<{ id: string; reason: string; targetType: string; reporter: string; timeAgo: string }>
}

const metricCards = [
  ["totalUsers", "Users", Users, "active"],
  ["totalPosts", "Posts", FileText, "info"],
  ["pendingModeration", "Pending", AlertTriangle, "pending"],
  ["openReports", "Reports", Flag, "pending"],
  ["bannedUsers", "Banned", Ban, "banned"],
] as const

export default function AdminCommunityOverviewPage() {
  const [data, setData] = useState<OverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function load() {
    setLoading(true)
    try {
      const response = await fetchJson<OverviewResponse>("/admin/community/overview")
      setData(response)
      setError("")
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลด dashboard ไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Community Operations"
        description="ศูนย์ปฏิบัติการสำหรับ reports, moderation, user actions และ audit history จากข้อมูลจริง"
        action={<AdminRetryButton onRetry={() => void load()} />}
      />

      {error ? <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          {metricCards.map(([key, label, Icon, tone]) => (
            <AdminStatCard key={key} label={label} value={data?.metrics[key] ?? 0} icon={Icon} tone={tone} />
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminSectionCard title="Moderation Queue" description="รายการที่ต้องตัดสินใจจาก moderation pipeline">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4">
              <div>
                <p className="text-2xl font-bold">{data?.metrics.pendingModeration ?? 0}</p>
                <p className="text-sm text-muted-foreground">Pending items</p>
              </div>
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <Button asChild className="w-full">
              <Link href="/admin/community/moderation">Open Moderation Queue</Link>
            </Button>
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Open Reports" description="รายงานจากผู้ใช้ที่ยังต้อง review">
          <div className="space-y-3">
            {data?.recentReports.map((item) => (
              <div key={item.id} className="rounded-xl border border-border p-3 text-sm transition-colors hover:bg-muted/30">
                <div className="flex flex-wrap items-center gap-2">
                  <AdminStatusBadge tone="pending">{item.reason}</AdminStatusBadge>
                  <Badge variant="outline">{item.targetType}</Badge>
                </div>
                <p className="mt-2 text-muted-foreground">{item.reporter} • {item.timeAgo}</p>
              </div>
            ))}
            {!data?.recentReports.length ? <AdminEmptyState title="No open reports" description="ยังไม่มี report ที่ต้องจัดการ" /> : null}
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/community/reports">Open Reports</Link>
            </Button>
          </div>
        </AdminSectionCard>
      </div>

      <AdminSectionCard title="Recent Actions" description="ประวัติ moderation ล่าสุดเพื่อปิด loop report -> action -> audit">
        <div className="space-y-3">
          {data?.recentOperations.map((item) => (
            <div key={item.id} className="grid gap-3 rounded-xl border border-border p-3 text-sm transition-colors hover:bg-muted/30 md:grid-cols-[180px_1fr_140px]">
              <div className="flex flex-wrap items-center gap-2">
                <AdminStatusBadge tone={getCommunityStatusTone(item.action)}>{item.action}</AdminStatusBadge>
                <Badge variant="outline">{item.contentType}</Badge>
              </div>
              <div>
                <p className="font-medium">{item.reason || "No reason recorded"}</p>
                <p className="text-muted-foreground">{item.admin} • {item.timeAgo}</p>
              </div>
              <AdminStatusBadge tone={getCommunityStatusTone(item.status)}>{item.status}</AdminStatusBadge>
            </div>
          ))}
          {!data?.recentOperations.length ? <AdminEmptyState title="No recent actions" description="Audit log จะเริ่มแสดงเมื่อมี admin action" /> : null}
          <Button asChild variant="outline">
            <Link href="/admin/community/audit">Open Audit Log</Link>
          </Button>
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Community Health / Content" description="ภาพรวมปริมาณ content หลักที่ระบบรองรับจริง">
        <div className="grid gap-3 md:grid-cols-4">
          {[
            ["Posts today", data?.metrics.postsToday ?? 0],
            ["Threads", data?.metrics.threads ?? 0],
            ["Polls", data?.metrics.polls ?? 0],
            ["Stories", data?.metrics.stories ?? 0],
            ["Active match rooms", data?.metrics.activeMatchRooms ?? 0],
            ["Restricted users", data?.metrics.restrictedUsers ?? 0],
            ["Suspended users", data?.metrics.suspendedUsers ?? 0],
            ["Active users", data?.metrics.activeCommunityUsers ?? 0],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-xl font-semibold">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </AdminSectionCard>
    </div>
  )
}
