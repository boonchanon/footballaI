"use client"

import { useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { ArrowLeft, Clock, Eye, Loader2, RefreshCw, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuthSession } from "@/hooks/use-auth-session"
import { fetchJson } from "@/lib/api-client"
import { cn } from "@/lib/utils"

type MyPostItem = {
  id: string
  preview: string
  category: string
  status: string
  statusLabel: string
  friendlyReasons: string[]
  createdAgo: string
  lastEditedAt?: string | null
  editVersion: number
  hasPendingRevision: boolean
  canEdit: boolean
  canDelete: boolean
  canResubmit: boolean
}

type MyPostsResponse = {
  items: MyPostItem[]
  counts: Record<string, number>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const statusTabs = [
  { id: "all", label: "ทั้งหมด" },
  { id: "published", label: "เผยแพร่แล้ว" },
  { id: "pending_review", label: "กำลังตรวจสอบ" },
  { id: "revision_pending", label: "Revision รอตรวจ" },
  { id: "hidden", label: "ถูกซ่อน" },
  { id: "rejected", label: "ไม่ผ่าน" },
]

function getStatusClass(status: string) {
  if (status === "published") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  if (status === "pending_review" || status === "revision_pending") return "border-primary/30 bg-primary/15 text-primary"
  if (status === "rejected") return "border-destructive/30 bg-destructive/10 text-destructive"
  return "border-border bg-muted text-muted-foreground"
}

export default function MyCommunityPostsPage() {
  const { token } = useAuthSession()
  const [status, setStatus] = useState("all")
  const query = `/community/my-posts?status=${encodeURIComponent(status)}&limit=20`
  const { data, error, isLoading, mutate } = useSWR<MyPostsResponse>(
    token ? [query, token] : null,
    ([url, authToken]) =>
      fetchJson<MyPostsResponse>(url, {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: "no-store",
      }),
    { revalidateOnFocus: true },
  )

  return (
    <div className="min-h-screen bg-background px-3 py-5 text-foreground sm:px-6">
      <main className="mx-auto max-w-5xl space-y-5">
        <div className="overflow-hidden rounded-[32px] border border-border bg-card shadow-[0_24px_70px_rgba(0,0,0,0.10)]">
          <div className="flex flex-wrap items-center gap-4 border-b border-border px-5 py-4">
            <Button asChild variant="outline" className="rounded-full border-border bg-card">
              <Link href="/community">
                <ArrowLeft className="mr-2 h-4 w-4" />
                กลับคอมมูนิตี้
              </Link>
            </Button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Content Status Center</p>
              <h1 className="text-3xl font-display font-semibold">โพสต์ของฉัน</h1>
              <p className="text-sm text-muted-foreground">ดูสถานะโพสต์และ revision ที่กำลังรอตรวจ โดยไม่แสดงข้อมูล moderation ภายใน</p>
            </div>
          </div>

          <div className="space-y-5 p-5">
            <div className="flex flex-wrap gap-2">
              {statusTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatus(tab.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition",
                    status === tab.id ? "border-primary/40 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-accent-soft hover:text-foreground",
                  )}
                >
                  {tab.label}
                  <span className="ml-2 text-xs opacity-70">{data?.counts?.[tab.id] ?? 0}</span>
                </button>
              ))}
            </div>

            {isLoading ? (
              <Card className="rounded-[28px] border-border bg-card">
                <CardContent className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  กำลังโหลดโพสต์ของคุณ...
                </CardContent>
              </Card>
            ) : null}

            {error ? (
              <Card className="rounded-[28px] border-destructive/30 bg-destructive/10">
                <CardContent className="space-y-3 py-8">
                  <p className="font-semibold text-destructive">โหลดข้อมูลไม่ได้</p>
                  <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "เกิดข้อผิดพลาด"}</p>
                  <Button variant="outline" className="rounded-full border-border" onClick={() => void mutate()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    ลองใหม่
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {!isLoading && !error && !data?.items?.length ? (
              <Card className="rounded-[28px] border-dashed border-border bg-card">
                <CardContent className="py-16 text-center">
                  <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                  <h2 className="text-xl font-semibold">ยังไม่มีรายการในสถานะนี้</h2>
                  <p className="mt-2 text-sm text-muted-foreground">ลองเปลี่ยน tab หรือกลับไปสร้างโพสต์ใหม่ใน community</p>
                </CardContent>
              </Card>
            ) : null}

            <div className="space-y-3">
              {data?.items?.map((post) => (
                <Card key={post.id} className="rounded-[26px] border-border bg-card">
                  <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={cn("rounded-full px-2 py-0.5 text-[11px]", getStatusClass(post.status))}>
                          {post.statusLabel}
                        </Badge>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {post.createdAgo}
                        </span>
                        {post.hasPendingRevision ? <span className="text-xs text-primary">มีฉบับแก้ไขรอตรวจ</span> : null}
                      </div>
                      <p className="line-clamp-2 text-sm leading-6 text-foreground">{post.preview || "ไม่มีตัวอย่างข้อความ"}</p>
                      {post.friendlyReasons.length ? (
                        <p className="mt-2 text-xs text-muted-foreground">{post.friendlyReasons.join(" • ")}</p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <Button asChild variant="outline" className="rounded-full border-border">
                        <Link href={`/community/${post.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          ดูโพสต์
                        </Link>
                      </Button>
                      <Button asChild className="rounded-full">
                        <Link href={`/community?edit=${post.id}`}>แก้ไขในฟีด</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
