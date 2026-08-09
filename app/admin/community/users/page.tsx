"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Ban, Clock, Search, ShieldAlert } from "lucide-react"

import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPagination,
  AdminSectionCard,
  AdminStatusBadge,
  getCommunityStatusTone,
} from "@/components/admin/community-admin-ui"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fetchJson } from "@/lib/api-client"

type CommunityUser = {
  id: string
  name: string
  email: string
  avatar: string
  status: "active" | "restricted" | "suspended" | "banned"
  warningsCount: number
  communityStats: { posts: number; threads: number; polls: number; roomMessages: number; comments: number; reportsAgainst: number }
  lastActionAt: string | null
  createdAt: string
}

type UsersResponse = {
  items: CommunityUser[]
  pagination: { page: number; totalPages: number; total: number }
}

export default function AdminCommunityUsersPage() {
  const [items, setItems] = useState<CommunityUser[]>([])
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (query.trim()) params.set("q", query.trim())
      if (status !== "all") params.set("status", status)
      const response = await fetchJson<UsersResponse>(`/admin/community/users?${params.toString()}`)
      setItems(response.items)
      setTotalPages(response.pagination.totalPages)
      setError("")
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลดผู้ใช้ไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [status, page])

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Community Users"
        description="ค้นหา ตรวจสถานะ และเปิด user detail เพื่อทำ moderation action แบบมี audit trail"
      />

      <Card className="border-border/70 bg-card/80">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setPage(1)
                  void load()
                }
              }}
              placeholder="Search users..."
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={(value) => {
            setStatus(value)
            setPage(1)
          }}>
            <SelectTrigger className="md:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="restricted">Restricted</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="banned">Banned</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => {
            setPage(1)
            void load()
          }}>ค้นหา</Button>
        </CardContent>
      </Card>

      {error ? <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}

      <AdminSectionCard title="User Management" description={loading ? "กำลังโหลด..." : `${items.length} users on this page`}>
        {loading ? <div className="space-y-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-xl" />)}</div> : null}
        {!loading && items.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[260px]">User</TableHead>
                <TableHead>Community Activity</TableHead>
                <TableHead>Reports</TableHead>
                <TableHead>Warnings</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={item.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{item.name.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground">
                      <p>{item.communityStats.posts} posts / {item.communityStats.threads} threads</p>
                      <p>{item.communityStats.roomMessages} room messages / {item.communityStats.comments} comments</p>
                    </div>
                  </TableCell>
                  <TableCell>{item.communityStats.reportsAgainst}</TableCell>
                  <TableCell>{item.warningsCount}</TableCell>
                  <TableCell>
                    <AdminStatusBadge tone={getCommunityStatusTone(item.status)}>{item.status}</AdminStatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.lastActionAt ? new Date(item.lastActionAt).toLocaleString("th-TH") : new Date(item.createdAt).toLocaleString("th-TH")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/community/users/${item.id}`}>Review</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
        {!loading && !items.length ? <AdminEmptyState title="No users found" description="ไม่พบผู้ใช้ตามตัวกรองที่เลือก" /> : null}
      </AdminSectionCard>

      <AdminPagination page={page} totalPages={totalPages} loading={loading} onPageChange={setPage} />

      <Card>
        <CardContent className="flex flex-wrap gap-4 p-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><Clock className="h-4 w-4" />Restriction blocks content creation.</span>
          <span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4" />Suspension blocks community interactions.</span>
          <span className="flex items-center gap-2"><Ban className="h-4 w-4" />Ban is community-only, not login ban.</span>
        </CardContent>
      </Card>
    </div>
  )
}
