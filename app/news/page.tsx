"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import useSWR from "swr"
import { Bookmark, Clock, Filter, ImageOff, Loader2, MessageSquareShare, Newspaper, RefreshCw, TrendingUp } from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { NewsHeroCarousel } from "@/components/news-hero-carousel"
import { useToast } from "@/hooks/use-toast"
import { fetchJson } from "@/lib/api-client"
import { getAuthToken } from "@/lib/auth-client"
import { getPageSourcePolicy } from "@/lib/content-sources"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface NewsArticle {
  id: string
  title: string
  description?: string
  url: string
  image: string
  source: string
  timeAgo: string
  category?: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const categories = [
  { id: "all", label: "ทั้งหมด", icon: Filter },
  { id: "result", label: "ผลการแข่งขัน", icon: TrendingUp },
  { id: "transfer", label: "ย้ายทีม", icon: RefreshCw },
  { id: "general", label: "ข่าวทั่วไป", icon: Newspaper },
]

function categoryLabel(category?: string) {
  if (category === "result") return "ผลการแข่งขัน"
  if (category === "transfer") return "ย้ายทีม"
  if (category === "preview") return "พรีวิว"
  return "ข่าวทั่วไป"
}

function buildChatShareHref(article: NewsArticle) {
  const params = new URLSearchParams({
    shareType: "article",
    shareTitle: article.title,
    shareDescription: article.description || "",
    shareUrl: article.url,
    shareImage: article.image || "",
    shareSource: article.source || "",
  })

  return `/community/messages?${params.toString()}`
}

function NewsImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false)

  if (error || !src) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-muted">
        <ImageOff className="h-10 w-10 text-muted-foreground/50" />
      </div>
    )
  }

  return (
    <Image
      src={src || "/placeholder.svg"}
      alt={alt}
      fill
      className="object-cover"
      onError={() => setError(true)}
      unoptimized={src.startsWith("http")}
    />
  )
}

export default function NewsPage() {
  const sourcePolicy = getPageSourcePolicy("news")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [shareDialogArticle, setShareDialogArticle] = useState<NewsArticle | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const { toast } = useToast()

  const { data, error, isLoading, mutate } = useSWR("/api/news", fetcher, {
    refreshInterval: 30 * 60 * 1000,
    revalidateOnFocus: false,
  })

  const newsArticles: NewsArticle[] = data?.articles || []
  const filteredArticles =
    selectedCategory === "all"
      ? newsArticles
      : newsArticles.filter((article) => article.category === selectedCategory)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await mutate()
    setIsRefreshing(false)
  }

  async function handleSaveArticle(article: NewsArticle) {
    const token = getAuthToken()
    if (!token) {
      toast({
        title: "ต้องเข้าสู่ระบบก่อน",
        description: "กรุณาเข้าสู่ระบบเพื่อบันทึกข่าว",
        variant: "destructive",
      })
      return
    }

    try {
      await fetchJson("/favorites", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemType: "article",
          itemId: article.id,
          title: article.title,
          subtitle: article.source,
          image: article.image,
          meta: { url: article.url, category: article.category || "general" },
        }),
      })
      toast({
        title: "บันทึกข่าวแล้ว",
        description: "เพิ่มข่าวนี้ในรายการที่บันทึกไว้เรียบร้อย",
      })
    } catch (saveError) {
      toast({
        title: "บันทึกข่าวไม่สำเร็จ",
        description: saveError instanceof Error ? saveError.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    }
  }

  async function handleShareToCommunity(article: NewsArticle) {
    const token = getAuthToken()
    if (!token) {
      toast({
        title: "ต้องเข้าสู่ระบบก่อน",
        description: "กรุณาเข้าสู่ระบบเพื่อแชร์ข่าวเข้าคอมมูนิตี้",
        variant: "destructive",
      })
      return
    }

    try {
      await fetchJson("/community/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: `ชวนคุย: ${article.title}`,
          content: `มีใครเห็นต่างยังไงกับข่าวนี้บ้าง มาแชร์ข่าวกันได้เลย\n\nลิงก์อ้างอิง: ${article.url}`,
          category: article.category === "transfer" ? "transfer-rumors" : "general",
          images: article.image ? [article.image] : [],
          sharedItem: {
            type: "article",
            title: article.title,
            url: article.url,
            image: article.image,
            source: article.source,
          },
        }),
      })
      toast({
        title: "แชร์เข้าคอมมูนิตี้แล้ว",
        description: "ข่าวนี้ถูกเปิดเป็นโพสต์สำหรับแชร์ข่าวเรียบร้อย",
      })
    } catch (error) {
      toast({
        title: "แชร์เข้าคอมมูนิตี้ไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    }
  }

  function openShareDialog(article: NewsArticle) {
    setShareDialogArticle(article)
  }

  async function submitSharedNewsToCommunity() {
    const article = shareDialogArticle
    if (!article) return

    const token = getAuthToken()
    if (!token) {
      toast({
        title: "ต้องเข้าสู่ระบบก่อน",
        description: "กรุณาเข้าสู่ระบบเพื่อแชร์ข่าวเข้าคอมมูนิตี้",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSharing(true)
      await fetchJson("/community/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: `ชวนคุย: ${article.title}`,
          content: `${article.description || "มีความเห็นยังไงกับข่าวนี้บ้าง มาแชร์ข่าวกันได้เลย"}\n\nลิงก์อ้างอิง: ${article.url}`,
          category: article.category === "transfer" ? "transfer-rumors" : "general",
          images: article.image ? [article.image] : [],
          sharedItem: {
            type: "article",
            title: article.title,
            description: article.description || "",
            url: article.url,
            image: article.image,
            source: article.source,
          },
        }),
      })
      toast({
        title: "แชร์ข่าวเข้าคอมมูนิตี้แล้ว",
        description: "โพสต์ข่าวถูกส่งไปที่คอมมูนิตี้แล้ว",
      })
      setShareDialogArticle(null)
    } catch (error) {
      toast({
        title: "แชร์ข่าวไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-16">
        {isLoading ? (
          <div className="flex items-center justify-center bg-card py-32 dark:bg-[#0a0a0a]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">กำลังโหลดข่าวเด่น...</span>
          </div>
        ) : newsArticles.length > 0 ? (
          <NewsHeroCarousel articles={newsArticles} />
        ) : null}
      </div>

      <div className="sticky top-16 z-30 border-b border-border/50 bg-background/95 backdrop-blur-md">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-3 py-3 sm:flex-row">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {categories.map((category) => {
                const Icon = category.icon
                return (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                    className={`gap-2 rounded-xl transition-all ${
                      selectedCategory === category.id ? "shadow-lg shadow-primary/25" : "hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {category.label}
                  </Button>
                )
              })}
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
                <span className="font-semibold text-foreground">{filteredArticles.length}</span>
                <span>ข่าว</span>
              </div>
              <Badge variant="outline" className="hidden rounded-full px-3 py-1 text-xs md:inline-flex">
                แหล่งข้อมูล: {sourcePolicy.kind}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className="gap-2 rounded-xl bg-transparent"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">รีเฟรช</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">กำลังโหลดข่าว...</span>
          </div>
        )}

        {error && (
          <Card className="mb-8 border-destructive/50 bg-destructive/5">
            <CardContent className="py-8 text-center">
              <p className="mb-4 text-destructive">ไม่สามารถโหลดข่าวได้</p>
              <Button variant="outline" onClick={handleRefresh} className="gap-2 bg-transparent">
                <RefreshCw className="h-4 w-4" />
                ลองใหม่
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredArticles.map((article) => (
            <Card
              key={article.id}
              className="group h-full overflow-hidden border-border/50 transition-all hover:border-primary/50"
            >
              <div className="relative aspect-video bg-muted">
                <NewsImage src={article.image} alt={article.title} />
                <Badge className="absolute left-3 top-3 bg-background/80 text-foreground text-xs backdrop-blur-sm">
                  {categoryLabel(article.category)}
                </Badge>
              </div>
              <CardHeader>
                <a href={article.url} target="_blank" rel="noopener noreferrer" className="block">
                  <CardTitle className="line-clamp-2 text-lg transition-colors group-hover:text-primary">
                    {article.title}
                  </CardTitle>
                </a>
                {article.description ? <CardDescription className="line-clamp-2">{article.description}</CardDescription> : null}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Newspaper className="h-3 w-3" />
                    {article.source}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {article.timeAgo}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1 bg-transparent">
                    <a href={article.url} target="_blank" rel="noopener noreferrer">
                      อ่านต่อ
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-transparent"
                    onClick={() => openShareDialog(article)}
                  >
                    <MessageSquareShare className="h-4 w-4" />
                    แชร์
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-transparent"
                    onClick={() => handleSaveArticle(article)}
                  >
                    <Bookmark className="h-4 w-4" />
                    บันทึก
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {!isLoading && filteredArticles.length === 0 && (
          <Card className="border-2 border-dashed border-border/50">
            <CardContent className="py-20 text-center">
              <Newspaper className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">ไม่พบข่าวในหมวดนี้</h3>
              <p className="mb-4 text-muted-foreground">ลองสลับไปดูหมวดอื่นหรือรีเฟรชอีกครั้ง</p>
              <Button variant="outline" onClick={() => setSelectedCategory("all")}>
                ดูข่าวทั้งหมด
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={!!shareDialogArticle} onOpenChange={(open) => !open && setShareDialogArticle(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>แชร์ข่าว</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {shareDialogArticle ? (
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                <p className="text-sm font-medium">{shareDialogArticle.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{shareDialogArticle.source}</p>
                {shareDialogArticle.description ? (
                  <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">{shareDialogArticle.description}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogArticle(null)} disabled={isSharing}>
              ยกเลิก
            </Button>
            {shareDialogArticle ? (
              <Button asChild variant="outline" className="bg-transparent">
                <Link href={buildChatShareHref(shareDialogArticle)}>
                  <MessageSquareShare className="mr-2 h-4 w-4" />
                  ไปแชต
                </Link>
              </Button>
            ) : null}
            <Button onClick={submitSharedNewsToCommunity} disabled={isSharing}>
              {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquareShare className="mr-2 h-4 w-4" />}
              ลงฟีด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}

