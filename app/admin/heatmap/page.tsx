"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Activity,
  Link2,
  Upload,
  Trash2,
  Eye,
  Plus,
  ImageIcon,
  X,
  CheckCircle2,
  Search,
} from "lucide-react"

interface HeatmapEntry {
  id: number
  player: string
  team: string
  match: string
  date: string
  sourceType: "link" | "file"
  imageUrl: string
  fileName?: string
  status: "active" | "draft"
}

const initialEntries: HeatmapEntry[] = [
  {
    id: 1,
    player: "Erling Haaland",
    team: "Manchester City",
    match: "Man City vs Liverpool",
    date: "15 Jan 2026",
    sourceType: "link",
    imageUrl: "/premier-league-match-action-shot.jpg",
    status: "active",
  },
  {
    id: 2,
    player: "Mohamed Salah",
    team: "Liverpool",
    match: "Man City vs Liverpool",
    date: "15 Jan 2026",
    sourceType: "file",
    imageUrl: "/premier-league-player-action-shot.jpg",
    fileName: "salah_heatmap_jan15.png",
    status: "active",
  },
  {
    id: 3,
    player: "Bukayo Saka",
    team: "Arsenal",
    match: "Arsenal vs Chelsea",
    date: "12 Jan 2026",
    sourceType: "link",
    imageUrl: "/premier-league-match-intense.jpg",
    status: "draft",
  },
  {
    id: 4,
    player: "Cole Palmer",
    team: "Chelsea",
    match: "Arsenal vs Chelsea",
    date: "12 Jan 2026",
    sourceType: "file",
    imageUrl: "/premier-league-goal-moment.jpg",
    fileName: "palmer_heatmap_jan12.png",
    status: "active",
  },
]

export default function AdminHeatmapPage() {
  const [entries, setEntries] = useState<HeatmapEntry[]>(initialEntries)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [previewEntry, setPreviewEntry] = useState<HeatmapEntry | null>(null)

  // Form states
  const [sourceType, setSourceType] = useState<"link" | "file">("link")
  const [linkUrl, setLinkUrl] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [formPlayer, setFormPlayer] = useState("")
  const [formTeam, setFormTeam] = useState("")
  const [formMatch, setFormMatch] = useState("")
  const [formStatus, setFormStatus] = useState<"active" | "draft">("active")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setFilePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddEntry = () => {
    if (!formPlayer || !formTeam || !formMatch) return
    if (sourceType === "link" && !linkUrl) return
    if (sourceType === "file" && !selectedFile) return

    const newEntry: HeatmapEntry = {
      id: Date.now(),
      player: formPlayer,
      team: formTeam,
      match: formMatch,
      date: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      sourceType,
      imageUrl: sourceType === "link" ? linkUrl : (filePreview || ""),
      fileName: sourceType === "file" ? selectedFile?.name : undefined,
      status: formStatus,
    }

    setEntries((prev) => [newEntry, ...prev])
    resetForm()
  }

  const resetForm = () => {
    setShowAddForm(false)
    setSourceType("link")
    setLinkUrl("")
    setSelectedFile(null)
    setFilePreview(null)
    setFormPlayer("")
    setFormTeam("")
    setFormMatch("")
    setFormStatus("active")
  }

  const handleDelete = (id: number) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    if (previewEntry?.id === id) setPreviewEntry(null)
  }

  const filteredEntries = entries.filter(
    (entry) =>
      entry.player.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.match.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.team.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {"จัดการ Heatmap"}
          </h1>
          <p className="text-muted-foreground">
            {"เพิ่ม Heatmap ด้วยลิงก์รูปภาพ หรืออัปโหลดไฟล์รูปภาพ"}
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} disabled={showAddForm}>
          <Plus className="h-4 w-4 mr-2" />
          {"เพิ่ม Heatmap"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-lg">
                <ImageIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{entries.length}</p>
                <p className="text-sm text-muted-foreground">{"Heatmap ทั้งหมด"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {entries.filter((e) => e.status === "active").length}
                </p>
                <p className="text-sm text-muted-foreground">{"เผยแพร่แล้ว"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-yellow-500/10 rounded-lg">
                <Activity className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {entries.filter((e) => e.status === "draft").length}
                </p>
                <p className="text-sm text-muted-foreground">{"แบบร่าง"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Heatmap Form */}
      {showAddForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Plus className="h-5 w-5" />
                  {"เพิ่ม Heatmap ใหม่"}
                </CardTitle>
                <CardDescription>
                  {"เลือกวิธีเพิ่มรูปภาพ Heatmap: ลิงก์ หรือ อัปโหลดไฟล์"}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Player Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">{"ชื่อนักเตะ"}</Label>
                <Input
                  placeholder="เช่น Erling Haaland"
                  value={formPlayer}
                  onChange={(e) => setFormPlayer(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">{"ทีม"}</Label>
                <Select value={formTeam} onValueChange={setFormTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกทีม" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manchester City">Manchester City</SelectItem>
                    <SelectItem value="Liverpool">Liverpool</SelectItem>
                    <SelectItem value="Arsenal">Arsenal</SelectItem>
                    <SelectItem value="Chelsea">Chelsea</SelectItem>
                    <SelectItem value="Manchester United">Manchester United</SelectItem>
                    <SelectItem value="Tottenham">Tottenham</SelectItem>
                    <SelectItem value="Newcastle">Newcastle</SelectItem>
                    <SelectItem value="Aston Villa">Aston Villa</SelectItem>
                    <SelectItem value="Brighton">Brighton</SelectItem>
                    <SelectItem value="West Ham">West Ham</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">{"แมตช์"}</Label>
                <Input
                  placeholder="เช่น Man City vs Liverpool"
                  value={formMatch}
                  onChange={(e) => setFormMatch(e.target.value)}
                />
              </div>
            </div>

            {/* Source Type Toggle */}
            <div className="space-y-3">
              <Label className="text-foreground">
                {"วิธีเพิ่มรูปภาพ (เลือกอย่างใดอย่างหนึ่ง)"}
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSourceType("link")
                    setSelectedFile(null)
                    setFilePreview(null)
                  }}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    sourceType === "link"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-lg ${
                      sourceType === "link"
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Link2 className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className={`font-medium ${sourceType === "link" ? "text-primary" : "text-foreground"}`}>
                      {"ลิงก์ URL"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {"วาง URL รูปภาพจากภายนอก"}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSourceType("file")
                    setLinkUrl("")
                  }}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    sourceType === "file"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-lg ${
                      sourceType === "file"
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Upload className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className={`font-medium ${sourceType === "file" ? "text-primary" : "text-foreground"}`}>
                      {"อัปโหลดไฟล์"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {"อัปโหลดไฟล์ PNG, JPG, WEBP"}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Input based on source type */}
            {sourceType === "link" ? (
              <div className="space-y-3">
                <Label className="text-foreground">{"URL รูปภาพ"}</Label>
                <Input
                  placeholder="https://example.com/heatmap.png"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  type="url"
                />
                {linkUrl && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-border bg-muted/30">
                    <div className="p-2 bg-muted/50 flex items-center gap-2 text-xs text-muted-foreground">
                      <Eye className="h-3.5 w-3.5" />
                      {"ตัวอย่างรูปภาพ"}
                    </div>
                    <div className="relative w-full aspect-video">
                      <Image
                        src={linkUrl}
                        alt="Heatmap preview"
                        fill
                        className="object-contain"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = "none"
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <Label className="text-foreground">{"เลือกไฟล์รูปภาพ"}</Label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                    <Upload className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="font-medium text-foreground">
                      {selectedFile ? selectedFile.name : "คลิกหรือลากไฟล์มาวางที่นี่"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {"PNG, JPG, WEBP (สูงสุด 10MB)"}
                    </p>
                  </div>
                </div>
                {filePreview && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-border bg-muted/30">
                    <div className="p-2 bg-muted/50 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Eye className="h-3.5 w-3.5" />
                        {"ตัวอย่างรูปภาพ"}
                      </span>
                      <span>{selectedFile?.name}</span>
                    </div>
                    <div className="relative w-full aspect-video">
                      <Image
                        src={filePreview}
                        alt="File preview"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Status + Submit */}
            <div className="flex items-end gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">{"สถานะ"}</Label>
                <Select value={formStatus} onValueChange={(v: "active" | "draft") => setFormStatus(v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{"เผยแพร่"}</SelectItem>
                    <SelectItem value="draft">{"แบบร่าง"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1" />
              <Button variant="outline" onClick={resetForm}>
                {"ยกเลิก"}
              </Button>
              <Button
                onClick={handleAddEntry}
                disabled={
                  !formPlayer ||
                  !formTeam ||
                  !formMatch ||
                  (sourceType === "link" && !linkUrl) ||
                  (sourceType === "file" && !selectedFile)
                }
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {"บันทึก Heatmap"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ค้นหาชื่อนักเตะ, ทีม, หรือแมตช์..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Image Preview Modal */}
      {previewEntry && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPreviewEntry(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-card rounded-2xl overflow-hidden border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground">{previewEntry.player}</h3>
                <p className="text-sm text-muted-foreground">
                  {previewEntry.match} - {previewEntry.date}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setPreviewEntry(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative w-full aspect-video bg-muted">
              <Image
                src={previewEntry.imageUrl}
                alt={`Heatmap - ${previewEntry.player}`}
                fill
                className="object-contain"
              />
            </div>
            <div className="p-4 flex items-center gap-3 text-sm text-muted-foreground">
              {previewEntry.sourceType === "link" ? (
                <Badge variant="outline" className="gap-1">
                  <Link2 className="h-3 w-3" />
                  {"ลิงก์"}
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <Upload className="h-3 w-3" />
                  {"ไฟล์: "}{previewEntry.fileName}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={
                  previewEntry.status === "active"
                    ? "bg-green-500/10 text-green-500 border-green-500/20"
                    : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                }
              >
                {previewEntry.status === "active" ? "เผยแพร่" : "แบบร่าง"}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Heatmap Entries Grid */}
      {filteredEntries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEntries.map((entry) => (
            <Card key={entry.id} className="overflow-hidden group">
              {/* Image Thumbnail */}
              <div
                className="relative w-full aspect-video bg-muted cursor-pointer"
                onClick={() => setPreviewEntry(entry)}
              >
                <Image
                  src={entry.imageUrl}
                  alt={`Heatmap - ${entry.player}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {/* Source Badge */}
                <div className="absolute top-2 left-2">
                  {entry.sourceType === "link" ? (
                    <Badge className="bg-blue-500/80 text-white border-0 gap-1 text-xs">
                      <Link2 className="h-3 w-3" />
                      {"URL"}
                    </Badge>
                  ) : (
                    <Badge className="bg-orange-500/80 text-white border-0 gap-1 text-xs">
                      <Upload className="h-3 w-3" />
                      {"FILE"}
                    </Badge>
                  )}
                </div>
                {/* Status Badge */}
                <div className="absolute top-2 right-2">
                  <Badge
                    className={`border-0 text-xs ${
                      entry.status === "active"
                        ? "bg-green-500/80 text-white"
                        : "bg-yellow-500/80 text-white"
                    }`}
                  >
                    {entry.status === "active" ? "เผยแพร่" : "แบบร่าง"}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{entry.player}</p>
                    <p className="text-sm text-muted-foreground truncate">{entry.team}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {entry.match} - {entry.date}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive flex-shrink-0"
                    onClick={() => handleDelete(entry.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? "ไม่พบ Heatmap ที่ตรงกับการค้นหา" : "ยังไม่มี Heatmap ในระบบ"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
