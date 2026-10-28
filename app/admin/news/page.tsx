"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, ExternalLink, Search } from "lucide-react"

import { DataSourceBar, StateBox, formatThaiDateTime, useFootball } from "@/components/admin/football-data"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Article = { id: string; title: string; titleEn?: string; url: string; source: string; publishedAt: string; category: string; image?: string }
type NewsResponse = { articles: Article[]; source?: string; notice?: string; lastUpdated?: string; stats?: Record<string, number> }

const CATEGORY_TH: Record<string, string> = { match: "แมตช์", transfer: "ย้ายทีม", preview: "พรีวิว", result: "ผลการแข่งขัน", general: "ทั่วไป" }
const SOURCE_TH: Record<string, string> = { gnews: "GNews (ล่าสุด)", cache: "ข่าวที่บันทึกไว้ล่าสุด", fallback: "ข่าวตัวอย่าง", "news-api-disabled": "ปิดการดึงข่าว" }

export default function NewsPage() {
  const [topic, setTopic] = useState<"premier-league" | "worldcup">("premier-league")
  const news = useFootball<NewsResponse>(topic === "worldcup" ? "/api/news?topic=worldcup" : "/api/news")
  const [searchQuery, setSearchQuery] = useState("")
  const [category, setCategory] = useState("all")

  const articles = news.data?.articles || []
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return articles.filter((article) => (category === "all" || article.category === category) && `${article.title} ${article.titleEn || ""} ${article.source}`.toLowerCase().includes(q))
  }, [articles, searchQuery, category])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">จัดการข่าว</h1>
          <p className="text-muted-foreground">ข่าวจริงจาก GNews แปลไทยอัตโนมัติ ที่หน้าข่าวของเว็บแสดงอยู่ตอนนี้</p>
        </div>
        <DataSourceBar source={SOURCE_TH[news.data?.source || ""] || news.data?.source} updatedAt={news.data?.lastUpdated} refreshing={news.isValidating} onRefresh={() => void news.mutate()} />
      </div>

      {news.data?.notice ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {news.data.notice}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[["ทั้งหมด", news.data?.stats?.total], ["ผลการแข่งขัน", news.data?.stats?.results], ["พรีวิว", news.data?.stats?.previews], ["ย้ายทีม", news.data?.stats?.transfers], ["แมตช์", news.data?.stats?.match], ["ทั่วไป", news.data?.stats?.general]].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold">{value ?? "-"}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>รายการข่าว</CardTitle>
            <CardDescription>แสดง {filtered.length} ข่าว · กดหัวข้อเพื่อเปิดแหล่งข่าวต้นทาง</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={topic} onValueChange={(value) => setTopic(value as typeof topic)}>
              <SelectTrigger className="sm:w-44" aria-label="หัวข้อข่าว">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="premier-league">พรีเมียร์ลีก</SelectItem>
                <SelectItem value="worldcup">ฟุตบอลโลก 2026</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="sm:w-40" aria-label="หมวดข่าว">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกหมวด</SelectItem>
                {Object.entries(CATEGORY_TH).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="ค้นหาข่าว..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9 sm:w-52" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <StateBox loading={news.isLoading} error={news.error} empty={!filtered.length} emptyText="ไม่พบข่าว" />
          {filtered.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[320px]">หัวข้อ</TableHead>
                    <TableHead>หมวด</TableHead>
                    <TableHead>แหล่งข่าว</TableHead>
                    <TableHead>เผยแพร่</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell>
                        <a href={article.url} target="_blank" rel="noreferrer" className="group inline-flex items-start gap-1 font-medium hover:text-primary">
                          {article.title}
                          <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
                        </a>
                        {article.titleEn ? <p className="mt-0.5 text-xs text-muted-foreground">{article.titleEn}</p> : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{CATEGORY_TH[article.category] || article.category}</Badge>
                      </TableCell>
                      <TableCell>{article.source}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatThaiDateTime(article.publishedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
