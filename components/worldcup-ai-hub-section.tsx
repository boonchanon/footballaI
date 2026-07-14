"use client"

import Image from "next/image"
import useSWR from "swr"
import { Loader2, Sparkles, Target, WandSparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type AiHubResponse = {
  recaps: Array<{
    title: string
    body: string
    matchLabel: string
    image: string
  }>
  preview: {
    title: string
    body: string
    kickoffLabel: string
  }
  insights: Array<{
    title: string
    body: string
    tag: string
  }>
  source: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function WorldcupAiHubSection() {
  const { data, isLoading } = useSWR<AiHubResponse>("/api/worldcup/ai-hub", fetcher, {
    refreshInterval: 30 * 60 * 1000,
    revalidateOnFocus: false,
  })

  return (
    <section className="border-t border-border bg-muted/20 py-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[28px] border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(217,165,32,0.14),transparent_34%),linear-gradient(180deg,rgba(255,253,248,0.96),rgba(255,250,240,0.88))] px-6 py-6 shadow-[0_24px_60px_rgba(114,95,57,0.12)] md:px-8 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,rgba(217,165,32,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] dark:shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
            <Badge variant="outline" className="mb-4">
              <WandSparkles className="mr-1 h-3 w-3" />
              AI Layer
            </Badge>
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <h2 className="text-3xl font-display leading-tight md:text-5xl">บทสรุป พรีวิว และมุมวิเคราะห์ที่ทำให้หน้า World Cup ดูมีชีวิต</h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
                  ใช้ AI เป็นชั้นเรียบเรียงจากข้อมูลจริง เพื่อเพิ่มน้ำหนักแบบหน้าเว็บข่าวกีฬา โดยไม่ทำให้ข้อมูลหลักอย่างสกอร์และข่าวต้นทางเสียความน่าเชื่อถือ
                </p>
              </div>
              <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-4 text-right dark:bg-black/20">
                <p className="text-[11px] uppercase tracking-[0.2em] text-primary/75">Processing</p>
                <p className="mt-2 text-lg font-semibold">{data?.source || "loading"}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
            {[
              { label: "Rewrite", value: "News", note: "ข่าวจริง + ภาษาไทยลื่น" },
              { label: "Recap", value: "3 Match", note: "สรุปหลายเกมแบบบทความ" },
              { label: "Preview", value: "Next", note: "บทนำก่อนแข่งแบบอ่านง่าย" },
            ].map((item) => (
              <div key={item.label} className="rounded-[24px] border border-border/70 bg-card/80 px-5 py-5 dark:border-white/10 dark:bg-black/20">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-2xl font-display text-primary">{item.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            กำลังสร้าง AI content สำหรับหน้า World Cup...
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {data?.recaps?.map((recap, index) => (
                  <Card key={`${recap.matchLabel}-${index}`} className="overflow-hidden rounded-[28px] border-border/70 bg-card/80 py-0 shadow-[0_24px_60px_rgba(114,95,57,0.12)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] dark:shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
                    <div className="relative aspect-[16/10] border-b border-border/60 dark:border-white/5">
                      <Image
                        src={recap.image || "/worldcup/trophy.jpg"}
                        alt={recap.title || "AI Match Recap"}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent dark:from-black/85 dark:via-black/15" />
                      <div className="absolute inset-x-0 bottom-0 px-5 pb-4">
                        <Badge variant="secondary" className="mb-2 gap-1">
                          <Sparkles className="h-3 w-3" />
                          AI Match Recap
                        </Badge>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-foreground/75 dark:text-white/70">{recap.matchLabel}</p>
                      </div>
                    </div>
                    <CardContent className="space-y-4 px-5 py-5">
                      <h3 className="text-xl font-semibold leading-tight">{recap.title}</h3>
                      <p className="text-sm leading-7 text-muted-foreground">{recap.body}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/80 py-0 shadow-[0_24px_60px_rgba(114,95,57,0.12)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] dark:shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
                <CardHeader className="border-b border-border/60 px-6 py-6 dark:border-white/5">
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Target className="h-5 w-5 text-primary" />
                    AI Preview
                  </CardTitle>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{data?.preview.kickoffLabel}</p>
                </CardHeader>
                <CardContent className="space-y-5 px-6 py-6">
                  <h3 className="max-w-xl text-2xl font-semibold leading-tight">{data?.preview.title}</h3>
                  <p className="max-w-2xl text-base leading-8 text-muted-foreground">{data?.preview.body}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {data?.insights?.map((item, index) => (
                <Card
                  key={`${item.tag}-${item.title}`}
                  className="rounded-[24px] border-border/70 bg-card/80 py-0 shadow-[0_20px_50px_rgba(114,95,57,0.1)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] dark:shadow-[0_20px_50px_rgba(0,0,0,0.14)]"
                >
                  <CardContent className="px-5 py-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <Badge variant="secondary" className="text-[11px]">
                        {item.tag}
                      </Badge>
                      <span className="text-xs text-muted-foreground">0{index + 1}</span>
                    </div>
                    <h3 className="text-lg font-semibold leading-tight">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
