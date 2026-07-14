"use client"

import useSWR from "swr"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Clock3, Loader2, Newspaper, Sparkles, WandSparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type NewsArticle = {
  id: string
  title: string
  description?: string
  url: string
  image: string
  source: string
  timeAgo: string
  category?: string
}

type NewsResponse = {
  articles: NewsArticle[]
  source: string
  lastUpdatedThai?: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function categoryLabel(category?: string) {
  switch (category) {
    case "result":
      return "อัปเดตรอบแข่งขัน"
    case "preview":
      return "พรีวิว"
    case "transfer":
      return "ขุมกำลัง"
    case "match":
      return "สถานการณ์ทีม"
    default:
      return "ข่าวฟุตบอลโลก"
  }
}

export function WorldcupNewsSection() {
  const { data, isLoading } = useSWR<NewsResponse>("/api/news?topic=worldcup", fetcher, {
    refreshInterval: 30 * 60 * 1000,
    revalidateOnFocus: false,
  })

  const articles = data?.articles || []
  const featured = articles[0]
  const secondary = articles.slice(1, 5)

  return (
    <section className="border-t border-border bg-muted/20 py-16">
      <div className="container mx-auto px-4">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge variant="outline" className="mb-4">
              <Newspaper className="mr-1 h-3 w-3" />
              World Cup News
            </Badge>
            <h2 className="text-3xl font-display md:text-5xl">ข่าวบอลโลกควรเด่นที่สุดบนช่วงบนของหน้า</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              รวมข่าวเจ้าภาพ ทีมที่ผ่านเข้ารอบ ขุมกำลังทีมเต็ง และประเด็นก่อนแข่งในเลย์เอาต์ที่ให้น้ำหนักกับข่าวเด่นมากกว่าบล็อกสกอร์
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-muted-foreground dark:border-white/10 dark:bg-black/20">
            {data?.lastUpdatedThai ? `อัปเดตล่าสุด ${data.lastUpdatedThai}` : "อัปเดตข่าวอัตโนมัติทุก 30 นาที"}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            กำลังโหลดข่าวฟุตบอลโลก...
          </div>
        ) : featured ? (
          <div className="grid gap-6 lg:grid-cols-[1.45fr_0.95fr]">
            <Card className="overflow-hidden rounded-[30px] border-border/70 bg-card/80 py-0 shadow-[0_24px_60px_rgba(114,95,57,0.12)] dark:border-white/10 dark:bg-black/20 dark:shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
              <div className="relative aspect-[16/9]">
                <Image src={featured.image || "/worldcup-2026-popup-bg.jpg"} alt={featured.title} fill className="object-cover" unoptimized={featured.image?.startsWith("http")} />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent dark:from-black/90 dark:via-black/25" />
                <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge className="bg-primary text-primary-foreground">{categoryLabel(featured.category)}</Badge>
                    <Badge variant="secondary" className="gap-1">
                      <WandSparkles className="h-3 w-3" />
                      AI Rewrite
                    </Badge>
                  </div>
                  <h3 className="max-w-3xl text-2xl font-semibold leading-tight text-foreground md:text-4xl dark:text-white">{featured.title}</h3>
                  {featured.description ? <p className="mt-3 max-w-2xl text-sm leading-7 text-foreground/80 md:text-base dark:text-white/75">{featured.description}</p> : null}
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-foreground/70 dark:text-white/65">
                    <span>{featured.source}</span>
                    <span className="flex items-center gap-1">
                      <Clock3 className="h-4 w-4" />
                      {featured.timeAgo}
                    </span>
                  </div>
                  <Button asChild className="mt-5 rounded-xl">
                    <a href={featured.url} target="_blank" rel="noopener noreferrer">
                      อ่านข่าวต้นฉบับ
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </Card>

            <div className="grid gap-4">
              {secondary.map((article) => (
                <Card key={article.id} className="rounded-[24px] border-border/70 bg-card/80 py-0 dark:border-white/10 dark:bg-black/20">
                  <CardContent className="flex gap-4 p-4">
                    <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-muted">
                      <Image src={article.image || "/worldcup-2026-popup-bg.jpg"} alt={article.title} fill className="object-cover" unoptimized={article.image?.startsWith("http")} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[11px]">
                          {categoryLabel(article.category)}
                        </Badge>
                        <Badge variant="secondary" className="text-[11px]">
                          AI Rewrite
                        </Badge>
                        <span className="text-xs text-muted-foreground">{article.timeAgo}</span>
                      </div>
                      <h3 className="line-clamp-2 text-base font-semibold leading-6">{article.title}</h3>
                      {article.description ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{article.description}</p> : null}
                      <div className="mt-3">
                        <Link href={article.url} target="_blank" className="text-sm font-medium text-primary hover:underline">
                          อ่านต่อ
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card className="rounded-[24px] border-dashed border-border/70 bg-card/80 py-0 dark:border-white/10 dark:bg-black/20">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-primary/12 p-2 text-primary">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold">เหตุผลที่ข่าวชุดนี้ควรเป็นตัวเด่นของหน้า</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        ถ้ามี `GNEWS_API_KEY` ระบบจะดึงข่าวจริง แล้วใช้โมเดลที่ตั้งไว้ใน `INTELSPHERE_MODEL` ช่วย rewrite ภาษาไทยให้ลื่นขึ้นโดยยังยึดข้อเท็จจริงจากต้นทาง
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 p-10 text-center text-muted-foreground">
            ยังไม่มีข่าวฟุตบอลโลกให้แสดง
          </div>
        )}
      </div>
    </section>
  )
}
