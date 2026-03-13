"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Flag,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  Ban,
  MessageSquare,
  User,
  Trash2,
} from "lucide-react"

// Mock data for reports
const mockReports = [
  {
    id: 1,
    postTitle: "โพสต์ที่มีคำไม่เหมาะสม",
    postId: 3,
    reportedBy: { name: "ผู้แจ้ง 1", avatar: "/thai-man-1.jpg" },
    author: { name: "ผู้ใช้ทั่วไป", avatar: "" },
    reason: "คำหยาบคาย",
    description: "โพสต์มีการใช้คำไม่สุภาพ",
    status: "pending",
    createdAt: "2026-01-29 14:00",
  },
  {
    id: 2,
    postTitle: "โพสต์ที่มีคำไม่เหมาะสม",
    postId: 3,
    reportedBy: { name: "ผู้แจ้ง 2", avatar: "/thai-man-2.jpg" },
    author: { name: "ผู้ใช้ทั่วไป", avatar: "" },
    reason: "เนื้อหาไม่เหมาะสม",
    description: "เนื้อหามีการใช้คำพูดดูถูกผู้อื่น",
    status: "pending",
    createdAt: "2026-01-29 13:30",
  },
  {
    id: 3,
    postTitle: "โพสต์สแปม ขายของ",
    postId: 5,
    reportedBy: { name: "ผู้แจ้ง 3", avatar: "/thai-man-3.jpg" },
    author: { name: "สแปมเมอร์", avatar: "" },
    reason: "สแปม/โฆษณา",
    description: "โพสต์ขายสินค้าที่ไม่เกี่ยวข้องกับฟุตบอล",
    status: "resolved",
    resolvedAction: "ลบโพสต์",
    createdAt: "2026-01-29 10:00",
  },
  {
    id: 4,
    postTitle: "ความเห็นที่ไม่เหมาะสม",
    postId: 2,
    reportedBy: { name: "ผู้แจ้ง 4", avatar: "/thai-man-4.jpg" },
    author: { name: "ผู้ใช้ A", avatar: "" },
    reason: "คำหยาบคาย",
    description: "ความเห็นมีคำหยาบคายหลายคำ",
    status: "dismissed",
    createdAt: "2026-01-29 09:00",
  },
]

export default function AdminReportsPage() {
  const [reports, setReports] = useState(mockReports)
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedReport, setSelectedReport] = useState<typeof mockReports[0] | null>(null)
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [actionType, setActionType] = useState<"resolve" | "dismiss" | null>(null)
  const [actionNote, setActionNote] = useState("")

  const filteredReports = reports.filter((report) => {
    return statusFilter === "all" || report.status === statusFilter
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-500">รอตรวจสอบ</Badge>
      case "resolved":
        return <Badge className="bg-green-500/10 text-green-500">ดำเนินการแล้ว</Badge>
      case "dismissed":
        return <Badge className="bg-zinc-500/10 text-zinc-500">ยกเลิก</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleAction = (type: "resolve" | "dismiss", report: typeof mockReports[0]) => {
    setSelectedReport(report)
    setActionType(type)
    setShowActionDialog(true)
    setActionNote("")
  }

  const confirmAction = () => {
    if (!selectedReport || !actionType) return
    
    setReports(reports.map(r => 
      r.id === selectedReport.id 
        ? { ...r, status: actionType === "resolve" ? "resolved" : "dismissed" }
        : r
    ))
    setShowActionDialog(false)
    setSelectedReport(null)
    setActionType(null)
    setActionNote("")
  }

  const stats = [
    { label: "รายงานทั้งหมด", value: reports.length, icon: Flag },
    { label: "รอตรวจสอบ", value: reports.filter(r => r.status === "pending").length, icon: Clock },
    { label: "ดำเนินการแล้ว", value: reports.filter(r => r.status === "resolved").length, icon: CheckCircle },
    { label: "ยกเลิก", value: reports.filter(r => r.status === "dismissed").length, icon: XCircle },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">รายงานจากผู้ใช้</h1>
        <p className="text-muted-foreground">จัดการรายงานเนื้อหาที่ไม่เหมาะสม</p>
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
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="กรองสถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="pending">รอตรวจสอบ</SelectItem>
                <SelectItem value="resolved">ดำเนินการแล้ว</SelectItem>
                <SelectItem value="dismissed">ยกเลิก</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>รายงานทั้งหมด</CardTitle>
          <CardDescription>รายการรายงานจากผู้ใช้</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Report Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            <Flag className="h-3 w-3 mr-1" />
                            {report.reason}
                          </Badge>
                          {getStatusBadge(report.status)}
                        </div>
                        <h3 className="font-semibold">{report.postTitle}</h3>
                      </div>
                    </div>

                    {/* Report Info */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>แจ้งโดย: {report.reportedBy.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <span>ผู้โพสต์: {report.author.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{report.createdAt}</span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">
                      <span className="font-medium">รายละเอียด: </span>
                      {report.description}
                    </p>

                    {/* Actions */}
                    {report.status === "pending" && (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                          <Eye className="h-4 w-4" />
                          ดูโพสต์
                        </Button>
                        <Button 
                          size="sm" 
                          className="gap-1"
                          onClick={() => handleAction("resolve", report)}
                        >
                          <CheckCircle className="h-4 w-4" />
                          ดำเนินการ
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-1"
                          onClick={() => handleAction("dismiss", report)}
                        >
                          <XCircle className="h-4 w-4" />
                          ยกเลิก
                        </Button>
                      </div>
                    )}

                    {report.status === "resolved" && (
                      <Badge variant="secondary" className="text-xs">
                        การดำเนินการ: {report.resolvedAction || "ลบโพสต์"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredReports.length === 0 && (
              <div className="text-center py-12">
                <Flag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">ไม่มีรายงานที่ตรงกับตัวกรอง</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "resolve" ? "ดำเนินการกับรายงาน" : "ยกเลิกรายงาน"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "resolve" 
                ? "เลือกการดำเนินการที่ต้องการทำกับโพสต์นี้"
                : "ยืนยันการยกเลิกรายงานนี้"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionType === "resolve" && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="gap-2 h-auto py-3 flex-col bg-transparent">
                  <Ban className="h-5 w-5 text-amber-500" />
                  <span>ซ่อนโพสต์</span>
                </Button>
                <Button variant="outline" className="gap-2 h-auto py-3 flex-col bg-transparent">
                  <Trash2 className="h-5 w-5 text-red-500" />
                  <span>ลบโพสต์</span>
                </Button>
                <Button variant="outline" className="gap-2 h-auto py-3 flex-col bg-transparent">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span>เตือนผู้ใช้</span>
                </Button>
                <Button variant="outline" className="gap-2 h-auto py-3 flex-col bg-transparent">
                  <Ban className="h-5 w-5 text-red-500" />
                  <span>แบนผู้ใช้</span>
                </Button>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">บันทึก (ไม่บังคับ)</label>
              <Textarea
                placeholder="เพิ่มบันทึกสำหรับการดำเนินการนี้..."
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>
              ยกเลิก
            </Button>
            <Button onClick={confirmAction}>
              ยืนยัน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
