"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Newspaper, Clock, RefreshCw, Loader2, ImageOff, TrendingUp, Filter, Bookmark } from "lucide-react"
import { useState } from "react"
import useSWR from "swr"
import Image from "next/image"
import { NewsHeroCarousel } from "@/components/news-hero-carousel"
import { fetchJson } from "@/lib/api-client"
import { getAuthToken } from "@/lib/auth-client"
import { useToast } from "@/hooks/use-toast"

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
  { id: "transfer", label: "ข่าวย้ายทีม", icon: RefreshCw },
  { id: "general", label: "ข่าวทั่วไป", icon: Newspaper },
]

function NewsImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false)

  if (error || !src) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-muted flex items-center justify-center">
        <ImageOff className="w-10 h-10 text-muted-foreground/50" />
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
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  const { data, error, isLoading, mutate } = useSWR("/api/news", fetcher, {
    refreshInterval: 30 * 60 * 1000,
    revalidateOnFocus: false,
  })

  const newsArticles = data?.articles || []
  const filteredArticles =
    selectedCategory === "all"
      ? newsArticles
      : newsArticles.filter((article: NewsArticle) => article.category === selectedCategory)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await mutate()
    setIsRefreshing(false)
  }

  async function handleSaveArticle(article: NewsArticle) {
    const token = getAuthToken()
    if (!token) {
      toast({ title: "ต้องเข้าสู่ระบบก่อน", description: "กรุณาเข้าสู่ระบบเพื่อบันทึกข่าว", variant: "destructive" })
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
      toast({ title: "บันทึกข่าวแล้ว", description: "เพิ่มข่าวนี้ในรายการที่บันทึกไว้เรียบร้อย" })
    } catch (error) {
      toast({
        title: "บันทึกข่าวไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      })
    }
  }

  const regularArticles = filteredArticles

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* FIFA-style Hero Carousel */}
      <div className="pt-16">
        {isLoading ? (
          <div className="flex items-center justify-center py-32 bg-[#0a0a0a]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">{"กำลังโหลดข่าวเด่น..."}</span>
          </div>
        ) : newsArticles.length > 0 ? (
          <NewsHeroCarousel articles={newsArticles} />
        ) : null}
      </div>

      {/* Filter Bar */}
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3">
            {/* Category Tabs */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
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
                    <Icon className="w-4 h-4" />
                    {category.label}
                  </Button>
                )
              })}
            </div>

            {/* Refresh Button & Stats */}
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{filteredArticles.length}</span>
                <span>{"ข่าว"}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className="gap-2 rounded-xl bg-transparent"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{"รีเฟรช"}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">{"กำลังโหลดข่าว..."}</span>
          </div>
        )}

        {error && (
          <Card className="border-destructive/50 bg-destructive/5 mb-8">
            <CardContent className="py-8 text-center">
              <p className="text-destructive mb-4">{"ไม่สามารถโหลดข่าวได้"}</p>
              <Button variant="outline" onClick={handleRefresh} className="gap-2 bg-transparent">
                <RefreshCw className="w-4 h-4" /> {"ลองใหม่"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Articles Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {regularArticles.map((article: NewsArticle) => (
            <Card key={article.id} className="overflow-hidden border-border/50 hover:border-primary/50 transition-all h-full group">
                <div className="relative aspect-video bg-muted">
                  <NewsImage src={article.image} alt={article.title} />
                  {article.category && (
                    <Badge className="absolute top-3 left-3 bg-background/80 text-foreground backdrop-blur-sm text-xs">
                      {article.category === "result"
                        ? "ผลการแข่งขัน"
                        : article.category === "transfer"
                          ? "ข่าวย้ายทีม"
                          : article.category === "preview"
                            ? "พรีวิว"
                            : "ข่าวทั่วไป"}
                    </Badge>
                  )}
                </div>
                <CardHeader>
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="block">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-2">
                      {article.title}
                    </CardTitle>
                  </a>
                  {article.description && (
                    <CardDescription className="line-clamp-2">{article.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Newspaper className="w-3 h-3" /> {article.source}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {article.timeAgo}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1 bg-transparent">
                      <a href={article.url} target="_blank" rel="noopener noreferrer">
                        อ่านต่อ
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={() => handleSaveArticle(article)}>
                      <Bookmark className="w-4 h-4" />
                      บันทึก
                    </Button>
                  </div>
                </CardContent>
              </Card>
          ))}
        </div>

        {!isLoading && filteredArticles.length === 0 && (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="py-20 text-center">
              <Newspaper className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg mb-2">{"ไม่พบข่าวในหมวดหมู่นี้"}</h3>
              <p className="text-muted-foreground mb-4">{"ลองเลือกหมวดหมู่อื่น"}</p>
              <Button variant="outline" onClick={() => setSelectedCategory("all")}>
                {"ดูข่าวทั้งหมด"}
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  )
}
