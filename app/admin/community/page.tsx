"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Search,
  MoreHorizontal,
  Eye,
  Trash2,
  Ban,
  Pin,
  Flag,
  MessageSquare,
  ThumbsUp,
  Clock,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react"

// Mock data for posts
const mockPosts = [
  {
    id: 1,
    title: "แมนซิตี้ vs ลิเวอร์พูล จะเป็นเกมชี้ชะตาแชมป์ฤดูกาลนี้",
    author: { name: "สมชาย แฟนบอล", avatar: "/thai-man-football-fan.jpg" },
    category: "วิเคราะห์แมตช์",
    status: "published",
    likes: 245,
    comments: 89,
    reports: 0,
    isPinned: true,
    createdAt: "2026-01-29 14:30",
  },
  {
    id: 2,
    title: "ฮาแลนด์ vs ซาลาห์ - ศึกดาวซัลโวจะลงเอยที่ใคร?",
    author: { name: "วิชัย ลิเวอร์พูล", avatar: "/thai-man-liverpool-supporter.jpg" },
    category: "พูดคุยนักเตะ",
    status: "published",
    likes: 167,
    comments: 156,
    reports: 2,
    isPinned: false,
    createdAt: "2026-01-29 13:00",
  },
  {
    id: 3,
    title: "โพสต์ที่มีคำไม่เหมาะสม",
    author: { name: "ผู้ใช้ทั่วไป", avatar: "" },
    category: "ทั่วไป",
    status: "flagged",
    likes: 5,
    comments: 12,
    reports: 8,
    isPinned: false,
    createdAt: "2026-01-29 12:00",
  },
  {
    id: 4,
    title: "อาร์เซนอลจะคว้าตัว โอซิเมน มาเสริมทีมได้หรือไม่?",
    author: { name: "ประยุทธ์ ปืนใหญ่", avatar: "/thai-man-arsenal-fan.jpg" },
    category: "ข่าวย้ายทีม",
    status: "published",
    likes: 98,
    comments: 67,
    reports: 0,
    isPinned: false,
    createdAt: "2026-01-29 10:30",
  },
  {
    id: 5,
    title: "โพสต์สแปม ขายของ",
    author: { name: "สแปมเมอร์", avatar: "" },
    category: "ทั่วไป",
    status: "hidden",
    likes: 0,
    comments: 0,
    reports: 15,
    isPinned: false,
    createdAt: "2026-01-29 09:00",
  },
]

export default function AdminCommunityPage() {
  const [posts, setPosts] = useState(mockPosts)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedPost, setSelectedPost] = useState<typeof mockPosts[0] | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const filteredPosts = posts.filter((post) => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || post.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-green-500/10 text-green-500">เผยแพร่</Badge>
      case "flagged":
        return <Badge className="bg-amber-500/10 text-amber-500">ถูกรายงาน</Badge>
      case "hidden":
        return <Badge className="bg-red-500/10 text-red-500">ซ่อน</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleDelete = (postId: number) => {
    setPosts(posts.filter(p => p.id !== postId))
    setShowDeleteDialog(false)
    setSelectedPost(null)
  }

  const handleTogglePin = (postId: number) => {
    setPosts(posts.map(p => p.id === postId ? { ...p, isPinned: !p.isPinned } : p))
  }

  const handleToggleStatus = (postId: number, newStatus: string) => {
    setPosts(posts.map(p => p.id === postId ? { ...p, status: newStatus } : p))
  }

  const stats = [
    { label: "โพสต์ทั้งหมด", value: posts.length, icon: MessageSquare },
    { label: "เผยแพร่", value: posts.filter(p => p.status === "published").length, icon: CheckCircle },
    { label: "ถูกรายงาน", value: posts.filter(p => p.status === "flagged").length, icon: AlertTriangle },
    { label: "ซ่อน", value: posts.filter(p => p.status === "hidden").length, icon: XCircle },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">จัดการคอมมูนิตี้</h1>
        <p className="text-muted-foreground">จัดการโพสต์และเนื้อหาในชุมชน</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาโพสต์..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="กรองสถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="published">เผยแพร่</SelectItem>
                <SelectItem value="flagged">ถูกรายงาน</SelectItem>
                <SelectItem value="hidden">ซ่อน</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle>โพสต์ทั้งหมด</CardTitle>
          <CardDescription>รายการโพสต์ในระบบ</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={post.author.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{post.author.name[0]}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{post.title}</h3>
                        {post.isPinned && (
                          <Badge variant="secondary" className="gap-1">
                            <Pin className="h-3 w-3" />
                            ปักหมุด
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span>{post.author.name}</span>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs">{post.category}</Badge>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>{post.createdAt}</span>
                      </div>
                    </div>
                    {getStatusBadge(post.status)}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-4 w-4" />
                        {post.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {post.comments}
                      </span>
                      {post.reports > 0 && (
                        <span className="flex items-center gap-1 text-red-500">
                          <Flag className="h-4 w-4" />
                          {post.reports} รายงาน
                        </span>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          ดูโพสต์
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTogglePin(post.id)}>
                          <Pin className="h-4 w-4 mr-2" />
                          {post.isPinned ? "ยกเลิกปักหมุด" : "ปักหมุด"}
                        </DropdownMenuItem>
                        {post.status === "published" ? (
                          <DropdownMenuItem onClick={() => handleToggleStatus(post.id, "hidden")}>
                            <Ban className="h-4 w-4 mr-2" />
                            ซ่อนโพสต์
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleToggleStatus(post.id, "published")}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            เผยแพร่โพสต์
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-red-500"
                          onClick={() => {
                            setSelectedPost(post)
                            setShowDeleteDialog(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          ลบโพสต์
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}

            {filteredPosts.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">ไม่พบโพสต์ที่ค้นหา</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบโพสต์</DialogTitle>
            <DialogDescription>
              คุณต้องการลบโพสต์ "{selectedPost?.title}" หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={() => selectedPost && handleDelete(selectedPost.id)}>
              ลบโพสต์
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
