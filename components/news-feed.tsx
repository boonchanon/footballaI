"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Clock, RefreshCw, Loader2, Newspaper } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import useSWR from "swr"
import { useState } from "react"

import { backendFetcher } from "@/lib/api-client"

interface NewsItem {
  id: string
  title: string
  description?: string
  source: string
  timeAgo: string
  image: string
  isFeatured?: boolean
  url?: string
}

interface NewsResponse {
  articles: NewsItem[]
  lastUpdated: string
  source: string
}

export function NewsFeed() {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const { data, error, isLoading, mutate } = useSWR<NewsResponse>("/news", backendFetcher, {
    refreshInterval: 30 * 60 * 1000,
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60 * 1000,
  })

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await mutate()
    setIsRefreshing(false)
  }

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">กำลังโหลดข่าว...</span>
        </CardContent>
      </Card>
    )
  }

  const newsItems = data?.articles || []
  const featuredNews = newsItems.find((item) => item.isFeatured) || newsItems[0]
  const regularNews = newsItems.filter((item) => item.id !== featuredNews?.id).slice(0, 3)

  return (
    <Card className="overflow-hidden border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">ข่าวล่าสุด</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefreshing} className="h-8 w-8">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {featuredNews && (
          <a href={featuredNews.url || "#"} className="group block" target="_blank" rel="noopener noreferrer">
            <div className="relative aspect-video bg-muted">
              <Image
                src={featuredNews.image || "/placeholder.svg"}
                alt={featuredNews.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h3 className="mb-2 line-clamp-2 font-semibold leading-tight transition-colors group-hover:text-primary">
                  {featuredNews.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-primary">{featuredNews.source}</span>
                  <span>•</span>
                  <Clock className="h-3 w-3" />
                  <span>{featuredNews.timeAgo}</span>
                </div>
              </div>
            </div>
          </a>
        )}

        <div className="divide-y divide-border/50">
          {regularNews.map((news) => (
            <a
              key={news.id}
              href={news.url || "#"}
              className="group flex gap-3 p-4 transition-colors hover:bg-muted/30"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={news.image || "/placeholder.svg"}
                  alt={news.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="min-w-0 flex-1 py-0.5">
                <h4 className="mb-2 line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-primary">
                  {news.title}
                </h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{news.source}</span>
                  <span>•</span>
                  <span>{news.timeAgo}</span>
                </div>
              </div>
            </a>
          ))}
        </div>

        {error && <div className="py-4 text-center text-sm text-muted-foreground">ไม่สามารถโหลดข่าวได้</div>}

        <div className="border-t border-border/50 p-3">
          <Button asChild variant="outline" className="h-9 w-full justify-center gap-2 bg-transparent text-sm">
            <Link href="/news">
              ดูข่าวทั้งหมด
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
