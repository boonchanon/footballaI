"use client"

import React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, FileText, ImageIcon, Tag, Save, Loader2, Eye, Upload } from "lucide-react"
import Link from "next/link"

const categories = [
  { id: "transfer", name: "ข่าวซื้อขาย" },
  { id: "match", name: "ข่าวแมตช์" },
  { id: "injury", name: "ข่าวบาดเจ็บ" },
  { id: "general", name: "ข่าวทั่วไป" },
  { id: "analysis", name: "วิเคราะห์" },
]

const teams = [
  { id: "all", name: "ทุกทีม" },
  { id: "mancity", name: "แมนเชสเตอร์ ซิตี้" },
  { id: "liverpool", name: "ลิเวอร์พูล" },
  { id: "arsenal", name: "อาร์เซนอล" },
  { id: "chelsea", name: "เชลซี" },
  { id: "manutd", name: "แมนเชสเตอร์ ยูไนเต็ด" },
]

export default function WriteNewsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isPreview, setIsPreview] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    content: "",
    category: "",
    team: "all",
    status: "draft",
    featuredImage: "",
    tags: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    await new Promise((resolve) => setTimeout(resolve, 1500))
    
    alert(formData.status === "published" ? "เผยแพร่บทความสำเร็จ!" : "บันทึกฉบับร่างสำเร็จ!")
    setIsLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">เขียนข่าว</h1>
            <p className="text-muted-foreground">สร้างบทความข่าวใหม่</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setIsPreview(!isPreview)}>
          <Eye className="mr-2 h-4 w-4" />
          {isPreview ? "แก้ไข" : "ตัวอย่าง"}
        </Button>
      </div>

      {isPreview ? (
        /* Preview Mode */
        <Card>
          <CardContent className="pt-6">
            <article className="prose prose-invert max-w-none">
              {formData.featuredImage && (
                <div className="w-full h-64 bg-muted rounded-lg mb-6 flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <h1 className="text-3xl font-bold mb-2">{formData.title || "หัวข้อบทความ"}</h1>
              {formData.subtitle && (
                <p className="text-xl text-muted-foreground mb-6">{formData.subtitle}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                <span>โดย Admin</span>
                <span>•</span>
                <span>{new Date().toLocaleDateString("th-TH")}</span>
                {formData.category && (
                  <>
                    <span>•</span>
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                      {categories.find(c => c.id === formData.category)?.name}
                    </span>
                  </>
                )}
              </div>
              <div className="whitespace-pre-wrap">
                {formData.content || "เนื้อหาบทความจะแสดงที่นี่..."}
              </div>
              {formData.tags && (
                <div className="flex flex-wrap gap-2 mt-6">
                  {formData.tags.split(",").map((tag, index) => (
                    <span key={index} className="bg-muted px-3 py-1 rounded-full text-sm">
                      #{tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </article>
          </CardContent>
        </Card>
      ) : (
        /* Edit Mode */
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Content */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    เนื้อหาบทความ
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">หัวข้อ</Label>
                    <Input
                      id="title"
                      placeholder="กรอกหัวข้อบทความ"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      className="text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subtitle">หัวข้อรอง (ถ้ามี)</Label>
                    <Input
                      id="subtitle"
                      placeholder="กรอกหัวข้อรอง"
                      value={formData.subtitle}
                      onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">เนื้อหา</Label>
                    <Textarea
                      id="content"
                      placeholder="เขียนเนื้อหาบทความที่นี่..."
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      required
                      rows={15}
                      className="resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Featured Image */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    รูปภาพหลัก
                  </CardTitle>
                  <CardDescription>อัปโหลดรูปภาพประกอบบทความ</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
                    <p className="text-sm text-muted-foreground">รองรับไฟล์ JPG, PNG, WebP (สูงสุด 5MB)</p>
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setFormData({ ...formData, featuredImage: file.name })
                        }
                      }}
                    />
                  </div>
                  {formData.featuredImage && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      เลือกไฟล์: {formData.featuredImage}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Publish Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>การเผยแพร่</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>สถานะ</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกสถานะ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">ฉบับร่าง</SelectItem>
                        <SelectItem value="published">เผยแพร่</SelectItem>
                        <SelectItem value="scheduled">ตั้งเวลา</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Category & Tags */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    หมวดหมู่และแท็ก
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>หมวดหมู่</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกหมวดหมู่" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>ทีมที่เกี่ยวข้อง</Label>
                    <Select
                      value={formData.team}
                      onValueChange={(value) => setFormData({ ...formData, team: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกทีม" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">แท็ก</Label>
                    <Input
                      id="tags"
                      placeholder="คั่นด้วยเครื่องหมาย ,"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">เช่น: พรีเมียร์ลีก, ซื้อขาย, ฮาแลนด์</p>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        กำลังบันทึก...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {formData.status === "published" ? "เผยแพร่บทความ" : "บันทึกฉบับร่าง"}
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" className="w-full bg-transparent" onClick={() => router.back()}>
                    ยกเลิก
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
