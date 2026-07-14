"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Shield, UserPlus, Users } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { fetchJson } from "@/lib/api-client"
import { getAuthToken } from "@/lib/auth-client"

type AdminUserItem = {
  id: string
  type: "user" | "admin"
  name: string
  email: string
  avatar: string
  role: string
  roleLabel: string
  status: "active" | "inactive"
  statusLabel: string
  joinDate: string
}

type UsersResponse = {
  items: AdminUserItem[]
  summary: {
    users: number
    admins: number
  }
}

const roleColors: Record<string, string> = {
  superadmin: "bg-red-500/10 text-red-400",
  admin: "bg-orange-500/10 text-orange-400",
  admincommunity: "bg-violet-500/10 text-violet-400",
  user: "bg-zinc-500/10 text-zinc-300",
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400",
  inactive: "bg-zinc-500/10 text-zinc-300",
}

export default function UsersPage() {
  const [items, setItems] = useState<AdminUserItem[]>([])
  const [summary, setSummary] = useState({ users: 0, admins: 0 })
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      setError("ไม่พบสิทธิ์แอดมิน กรุณาเข้าสู่ระบบใหม่")
      setLoading(false)
      return
    }

    const params = new URLSearchParams()
    if (searchQuery) params.set("q", searchQuery)
    if (roleFilter !== "all") params.set("role", roleFilter)
    if (statusFilter !== "all") params.set("status", statusFilter)

    setLoading(true)
    fetchJson<UsersResponse>(`/admin/users?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        setItems(response.items)
        setSummary(response.summary)
        setError("")
      })
      .catch((fetchError) => setError(fetchError instanceof Error ? fetchError.message : "โหลดข้อมูลผู้ใช้ไม่สำเร็จ"))
      .finally(() => setLoading(false))
  }, [searchQuery, roleFilter, statusFilter])

  const totalAccounts = useMemo(() => summary.users + summary.admins, [summary])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">จัดการผู้ใช้</h1>
          <p className="text-muted-foreground">ดึงบัญชีผู้ใช้และแอดมินจาก MongoDB โดยตรง</p>
        </div>
        <Button disabled className="gap-2">
          <UserPlus className="h-4 w-4" />
          เพิ่มผู้ใช้
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalAccounts}</p>
              <p className="text-sm text-muted-foreground">บัญชีทั้งหมด</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <Users className="h-8 w-8 text-cyan-400" />
            <div>
              <p className="text-2xl font-bold">{summary.users}</p>
              <p className="text-sm text-muted-foreground">ผู้ใช้งานทั่วไป</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <Shield className="h-8 w-8 text-orange-400" />
            <div>
              <p className="text-2xl font-bold">{summary.admins}</p>
              <p className="text-sm text-muted-foreground">บัญชีแอดมิน</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ค้นหาชื่อหรืออีเมล..." className="pl-9" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="บทบาท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกบทบาท</SelectItem>
                <SelectItem value="superadmin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="admincommunity">Admin Community</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="active">ใช้งาน</SelectItem>
                <SelectItem value="inactive">ปิดใช้งาน</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>รายการบัญชี</CardTitle>
          <CardDescription>{loading ? "กำลังโหลด..." : `พบ ${items.length} รายการ`}</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>บัญชี</TableHead>
                <TableHead>บทบาท</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>วันที่สร้าง</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : items.map((item) => (
                    <TableRow key={`${item.type}-${item.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={item.avatar || "/placeholder.svg"} />
                            <AvatarFallback>{item.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={roleColors[item.role] || roleColors.user}>
                          {item.roleLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColors[item.status]}>
                          {item.statusLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.type === "admin" ? "แอดมิน" : "ผู้ใช้"}</TableCell>
                      <TableCell>{new Date(item.joinDate).toLocaleDateString("th-TH")}</TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
