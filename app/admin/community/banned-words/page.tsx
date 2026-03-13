"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Plus,
  Search,
  Trash2,
  Edit,
  Shield,
  AlertTriangle,
  Ban,
  Filter,
  Upload,
  Download,
  Settings,
} from "lucide-react"

// Mock data for banned words
const initialBannedWords = [
  { id: 1, word: "คำหยาบ1", category: "คำหยาบคาย", action: "block", isActive: true, hitCount: 156 },
  { id: 2, word: "คำหยาบ2", category: "คำหยาบคาย", action: "block", isActive: true, hitCount: 89 },
  { id: 3, word: "สแปม", category: "สแปม", action: "flag", isActive: true, hitCount: 234 },
  { id: 4, word: "ลิงค์ขาย", category: "โฆษณา", action: "flag", isActive: true, hitCount: 45 },
  { id: 5, word: "คำดูถูก", category: "ดูถูก/เหยียด", action: "block", isActive: true, hitCount: 67 },
  { id: 6, word: "คำไม่เหมาะสม", category: "คำหยาบคาย", action: "replace", replacement: "***", isActive: true, hitCount: 123 },
  { id: 7, word: "สแปมเมอร์", category: "สแปม", action: "block", isActive: false, hitCount: 12 },
]

const categories = [
  { value: "คำหยาบคาย", label: "คำหยาบคาย", color: "bg-red-500/10 text-red-500" },
  { value: "สแปม", label: "สแปม", color: "bg-amber-500/10 text-amber-500" },
  { value: "โฆษณา", label: "โฆษณา", color: "bg-blue-500/10 text-blue-500" },
  { value: "ดูถูก/เหยียด", label: "ดูถูก/เหยียด", color: "bg-purple-500/10 text-purple-500" },
]

const actions = [
  { value: "block", label: "บล็อกโพสต์", description: "ไม่อนุญาตให้โพสต์" },
  { value: "flag", label: "ตั้งค่าสถานะ", description: "โพสต์ได้แต่ถูกตรวจสอบ" },
  { value: "replace", label: "แทนที่คำ", description: "แทนที่ด้วยข้อความอื่น" },
]

export default function AdminBannedWordsPage() {
  const [bannedWords, setBannedWords] = useState(initialBannedWords)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedWord, setSelectedWord] = useState<typeof initialBannedWords[0] | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)

  // Form state
  const [newWord, setNewWord] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [newAction, setNewAction] = useState("block")
  const [newReplacement, setNewReplacement] = useState("")
  const [bulkWords, setBulkWords] = useState("")

  const filteredWords = bannedWords.filter((item) => {
    const matchesSearch = item.word.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const getCategoryBadge = (category: string) => {
    const cat = categories.find(c => c.value === category)
    return <Badge className={cat?.color || "bg-zinc-500/10 text-zinc-500"}>{category}</Badge>
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case "block":
        return <Badge className="bg-red-500/10 text-red-500">บล็อก</Badge>
      case "flag":
        return <Badge className="bg-amber-500/10 text-amber-500">ตรวจสอบ</Badge>
      case "replace":
        return <Badge className="bg-blue-500/10 text-blue-500">แทนที่</Badge>
      default:
        return <Badge variant="outline">{action}</Badge>
    }
  }

  const handleAddWord = () => {
    if (!newWord.trim() || !newCategory) return

    const newItem = {
      id: Date.now(),
      word: newWord.trim(),
      category: newCategory,
      action: newAction,
      replacement: newAction === "replace" ? newReplacement : undefined,
      isActive: true,
      hitCount: 0,
    }

    setBannedWords([newItem, ...bannedWords])
    setNewWord("")
    setNewCategory("")
    setNewAction("block")
    setNewReplacement("")
    setShowAddDialog(false)
  }

  const handleBulkImport = () => {
    const words = bulkWords.split("\n").filter(w => w.trim())
    const newItems = words.map((word, index) => ({
      id: Date.now() + index,
      word: word.trim(),
      category: newCategory || "คำหยาบคาย",
      action: newAction,
      isActive: true,
      hitCount: 0,
    }))

    setBannedWords([...newItems, ...bannedWords])
    setBulkWords("")
    setShowImportDialog(false)
  }

  const handleDelete = () => {
    if (!selectedWord) return
    setBannedWords(bannedWords.filter(w => w.id !== selectedWord.id))
    setShowDeleteDialog(false)
    setSelectedWord(null)
  }

  const handleToggleActive = (id: number) => {
    setBannedWords(bannedWords.map(w => 
      w.id === id ? { ...w, isActive: !w.isActive } : w
    ))
  }

  const stats = [
    { label: "คำต้องห้ามทั้งหมด", value: bannedWords.length, icon: Shield },
    { label: "เปิดใช้งาน", value: bannedWords.filter(w => w.isActive).length, icon: Ban },
    { label: "ถูกบล็อกทั้งหมด", value: bannedWords.reduce((sum, w) => sum + w.hitCount, 0), icon: AlertTriangle },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">คำต้องห้าม</h1>
          <p className="text-muted-foreground">จัดการคำหยาบและคำต้องห้ามในระบบ</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => setShowImportDialog(true)}>
            <Upload className="h-4 w-4" />
            นำเข้า
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent">
            <Download className="h-4 w-4" />
            ส่งออก
          </Button>
          <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4" />
            เพิ่มคำ
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                placeholder="ค้นหาคำ..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="หมวดหมู่" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Words List */}
      <Card>
        <CardHeader>
          <CardTitle>รายการคำต้องห้าม</CardTitle>
          <CardDescription>คำที่ถูกบล็อกหรือกรองในระบบ</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredWords.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                  item.isActive ? "border-border hover:bg-muted/50" : "border-dashed border-muted bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-4">
                  <Switch
                    checked={item.isActive}
                    onCheckedChange={() => handleToggleActive(item.id)}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${!item.isActive && "text-muted-foreground line-through"}`}>
                        {item.word}
                      </span>
                      {getCategoryBadge(item.category)}
                      {getActionBadge(item.action)}
                      {item.replacement && (
                        <span className="text-sm text-muted-foreground">
                          → {item.replacement}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      ถูกบล็อก {item.hitCount} ครั้ง
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-500 hover:text-red-600"
                    onClick={() => {
                      setSelectedWord(item)
                      setShowDeleteDialog(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {filteredWords.length === 0 && (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">ไม่พบคำที่ค้นหา</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Word Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มคำต้องห้าม</DialogTitle>
            <DialogDescription>
              เพิ่มคำที่ต้องการบล็อกหรือกรองในระบบ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>คำที่ต้องการเพิ่ม</Label>
              <Input
                placeholder="พิมพ์คำที่ต้องการบล็อก..."
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>หมวดหมู่</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="เลือกหมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>การดำเนินการ</Label>
              <Select value={newAction} onValueChange={setNewAction}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {actions.map((action) => (
                    <SelectItem key={action.value} value={action.value}>
                      <div>
                        <div className="font-medium">{action.label}</div>
                        <div className="text-xs text-muted-foreground">{action.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newAction === "replace" && (
              <div>
                <Label>แทนที่ด้วย</Label>
                <Input
                  placeholder="เช่น *** หรือ [ถูกลบ]"
                  value={newReplacement}
                  onChange={(e) => setNewReplacement(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleAddWord}>
              เพิ่มคำ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>นำเข้าคำต้องห้าม</DialogTitle>
            <DialogDescription>
              นำเข้าหลายคำพร้อมกัน (แต่ละคำขึ้นบรรทัดใหม่)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>หมวดหมู่</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="เลือกหมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>รายการคำ</Label>
              <Textarea
                placeholder="คำที่ 1&#10;คำที่ 2&#10;คำที่ 3"
                value={bulkWords}
                onChange={(e) => setBulkWords(e.target.value)}
                className="mt-1.5 min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {bulkWords.split("\n").filter(w => w.trim()).length} คำ
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleBulkImport}>
              นำเข้า
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบคำ "{selectedWord?.word}" ออกจากรายการหรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
