import { NextResponse } from "next/server"
import { formatDateThai, getTimeAgoThai } from "@/lib/sportmonks"

// News categories
type NewsCategory = "match" | "transfer" | "preview" | "result" | "general"

interface NewsArticle {
  id: string
  title: string
  titleEn?: string
  description: string
  descriptionEn?: string
  url: string
  image: string
  source: string
  timeAgo: string
  publishedAt: string
  publishedAtThai: string
  isFeatured: boolean
  category: NewsCategory
}

async function fetchRealNews(): Promise<NewsArticle[]> {
  const apiKey = process.env.GNEWS_API_KEY || "2d59fcd313d1e012b7ea784cf1380dd5"

  if (!apiKey) {
    console.log("[v0] GNEWS_API_KEY not configured, using fallback news")
    return []
  }

  try {
    // Search for Premier League news
    const response = await fetch(
      `https://gnews.io/api/v4/search?q=Premier+League+football&lang=en&country=uk&max=20&apikey=${apiKey}`,
      { next: { revalidate: 600 } }, // Cache for 10 minutes
    )

    if (!response.ok) {
      console.error("GNews API error:", response.status)
      return []
    }

    const data = await response.json()
    const articles: NewsArticle[] = []

    if (data.articles && Array.isArray(data.articles)) {
      data.articles.forEach((article: any, index: number) => {
        // Translate title to Thai (simple translation for common terms)
        const titleThai = translateNewsTitleToThai(article.title)
        const descriptionThai = translateNewsDescriptionToThai(article.description || "")

        // Categorize news
        const category = categorizeNews(article.title, article.description)

        articles.push({
          id: `gnews-${index}-${Date.now()}`,
          title: titleThai,
          titleEn: article.title,
          description: descriptionThai,
          descriptionEn: article.description || "",
          url: article.url,
          image: article.image || "/premier-league-news.jpg",
          source: article.source?.name || "GNews",
          timeAgo: getTimeAgoThai(article.publishedAt),
          publishedAt: article.publishedAt,
          publishedAtThai: formatDateThai(article.publishedAt),
          isFeatured: index === 0,
          category: category,
        })
      })
    }

    return articles
  } catch (error) {
    console.error("Failed to fetch real news:", error)
    return []
  }
}

// Translate news title to Thai
function translateNewsTitleToThai(title: string): string {
  let translated = title

  // Team names
  const teamTranslations: Record<string, string> = {
    "Manchester United": "แมนเชสเตอร์ ยูไนเต็ด",
    "Manchester City": "แมนเชสเตอร์ ซิตี้",
    "Man United": "แมนฯ ยูไนเต็ด",
    "Man City": "แมนฯ ซิตี้",
    Liverpool: "ลิเวอร์พูล",
    Arsenal: "อาร์เซนอล",
    Chelsea: "เชลซี",
    Tottenham: "ท็อตแนม",
    Spurs: "สเปอร์ส",
    Newcastle: "นิวคาสเซิล",
    "Aston Villa": "แอสตัน วิลล่า",
    "West Ham": "เวสต์แฮม",
    Brighton: "ไบรท์ตัน",
    Fulham: "ฟูแล่ม",
    Brentford: "เบรนท์ฟอร์ด",
    "Crystal Palace": "คริสตัล พาเลซ",
    Wolves: "วูล์ฟส์",
    Everton: "เอฟเวอร์ตัน",
    "Nottingham Forest": "น็อตติงแฮม ฟอเรสต์",
    Bournemouth: "บอร์นมัธ",
    Leicester: "เลสเตอร์",
    Southampton: "เซาแธมป์ตัน",
    Ipswich: "อิปสวิช",
  }

  // Common football terms
  const termTranslations: Record<string, string> = {
    "Premier League": "พรีเมียร์ลีก",
    "2024/25": "ฤดูกาล 2024/25",
    "2024-25": "ฤดูกาล 2024/25",
    transfer: "ย้ายทีม",
    Transfer: "ย้ายทีม",
    signs: "เซ็นสัญญา",
    Signs: "เซ็นสัญญา",
    injury: "อาการบาดเจ็บ",
    Injury: "อาการบาดเจ็บ",
    goal: "ประตู",
    Goal: "ประตู",
    goals: "ประตู",
    Goals: "ประตู",
    manager: "กุนซือ",
    Manager: "กุนซือ",
    coach: "โค้ช",
    Coach: "โค้ช",
    win: "ชนะ",
    Win: "ชนะ",
    wins: "ชนะ",
    Wins: "ชนะ",
    lose: "แพ้",
    Lose: "แพ้",
    loss: "พ่ายแพ้",
    Loss: "พ่ายแพ้",
    draw: "เสมอ",
    Draw: "เสมอ",
    match: "แมตช์",
    Match: "แมตช์",
    player: "นักเตะ",
    Player: "นักเตะ",
    players: "นักเตะ",
    Players: "นักเตะ",
    team: "ทีม",
    Team: "ทีม",
    football: "ฟุตบอล",
    Football: "ฟุตบอล",
    season: "ฤดูกาล",
    Season: "ฤดูกาล",
    vs: "พบ",
    VS: "พบ",
    against: "พบ",
    beats: "เอาชนะ",
    Beats: "เอาชนะ",
    defeated: "พ่ายแพ้ต่อ",
    Defeated: "พ่ายแพ้ต่อ",
    defeats: "เอาชนะ",
    Defeats: "เอาชนะ",
    news: "ข่าว",
    News: "ข่าว",
    update: "อัปเดต",
    Update: "อัปเดต",
    breaking: "ด่วน",
    Breaking: "ด่วน",
    exclusive: "เอ็กซ์คลูซีฟ",
    Exclusive: "เอ็กซ์คลูซีฟ",
    report: "รายงาน",
    Report: "รายงาน",
    confirms: "ยืนยัน",
    Confirms: "ยืนยัน",
    striker: "กองหน้า",
    Striker: "กองหน้า",
    midfielder: "กองกลาง",
    Midfielder: "กองกลาง",
    defender: "กองหลัง",
    Defender: "กองหลัง",
    goalkeeper: "ผู้รักษาประตู",
    Goalkeeper: "ผู้รักษาประตู",
    captain: "กัปตัน",
    Captain: "กัปตัน",
    scored: "ยิง",
    Scored: "ยิง",
    scoring: "ทำประตู",
    Scoring: "ทำประตู",
    assist: "แอสซิสต์",
    Assist: "แอสซิสต์",
    assists: "แอสซิสต์",
    Assists: "แอสซิสต์",
    "hat-trick": "แฮตทริก",
    "Hat-trick": "แฮตทริก",
    derby: "ดาร์บี้",
    Derby: "ดาร์บี้",
    title: "แชมป์",
    Title: "แชมป์",
    race: "การแข่งขัน",
    Race: "การแข่งขัน",
  }

  // Apply team translations
  for (const [eng, thai] of Object.entries(teamTranslations)) {
    translated = translated.replace(new RegExp(eng, "gi"), thai)
  }

  // Apply term translations
  for (const [eng, thai] of Object.entries(termTranslations)) {
    translated = translated.replace(new RegExp(`\\b${eng}\\b`, "g"), thai)
  }

  return translated
}

// Translate news description to Thai
function translateNewsDescriptionToThai(description: string): string {
  return translateNewsTitleToThai(description)
}

// Categorize news based on content
function categorizeNews(title: string, description: string): NewsCategory {
  const text = `${title} ${description}`.toLowerCase()

  if (text.includes("transfer") || text.includes("sign") || text.includes("deal") || text.includes("move")) {
    return "transfer"
  }
  if (text.includes("preview") || text.includes("upcoming") || text.includes("will face") || text.includes("to play")) {
    return "preview"
  }
  if (
    text.includes("result") ||
    text.includes("beat") ||
    text.includes("won") ||
    text.includes("lost") ||
    text.includes("draw") ||
    text.includes("score") ||
    text.includes("-0") ||
    text.includes("-1") ||
    text.includes("-2") ||
    text.includes("-3")
  ) {
    return "result"
  }
  if (text.includes("match") || text.includes("game") || text.includes("fixture")) {
    return "match"
  }

  return "general"
}

function getFallbackNews(): NewsArticle[] {
  const now = new Date()
  return [
    {
      id: "fallback-1",
      title: "พรีเมียร์ลีก อัปเดตตารางคะแนนล่าสุด",
      titleEn: "Premier League Latest Standings Update",
      description: "ติดตามความเคลื่อนไหวล่าสุดของตารางคะแนนพรีเมียร์ลีก ฤดูกาล 2024/25",
      descriptionEn: "Follow the latest Premier League standings for the 2024/25 season",
      url: "#",
      image: "/premier-league-news.jpg",
      source: "EPL Hub",
      timeAgo: "เมื่อสักครู่",
      publishedAt: now.toISOString(),
      publishedAtThai: formatDateThai(now.toISOString()),
      isFeatured: true,
      category: "general",
    },
    {
      id: "fallback-2",
      title: "สรุปผลการแข่งขันพรีเมียร์ลีกสัปดาห์นี้",
      titleEn: "Premier League Weekly Results Summary",
      description: "รวมผลการแข่งขันที่น่าสนใจในสัปดาห์ที่ผ่านมา",
      descriptionEn: "Compilation of interesting match results from this week",
      url: "#",
      image: "/premier-league-news.jpg",
      source: "EPL Hub",
      timeAgo: "1 ชั่วโมงที่แล้ว",
      publishedAt: new Date(now.getTime() - 3600000).toISOString(),
      publishedAtThai: formatDateThai(new Date(now.getTime() - 3600000).toISOString()),
      isFeatured: false,
      category: "result",
    },
    {
      id: "fallback-3",
      title: "ตารางแข่งขันพรีเมียร์ลีกสัปดาห์หน้า",
      titleEn: "Next Week Premier League Fixtures",
      description: "เตรียมพร้อมสำหรับแมตช์ที่น่าจับตามองในสัปดาห์หน้า",
      descriptionEn: "Get ready for the exciting matches coming next week",
      url: "#",
      image: "/premier-league-news.jpg",
      source: "EPL Hub",
      timeAgo: "2 ชั่วโมงที่แล้ว",
      publishedAt: new Date(now.getTime() - 7200000).toISOString(),
      publishedAtThai: formatDateThai(new Date(now.getTime() - 7200000).toISOString()),
      isFeatured: false,
      category: "preview",
    },
    {
      id: "fallback-4",
      title: "ข่าวการย้ายทีมล่าสุดในพรีเมียร์ลีก",
      titleEn: "Latest Premier League Transfer News",
      description: "อัปเดตข่าวการย้ายทีมของนักเตะในพรีเมียร์ลีก",
      descriptionEn: "Updates on player transfers in the Premier League",
      url: "#",
      image: "/premier-league-news.jpg",
      source: "EPL Hub",
      timeAgo: "3 ชั่วโมงที่แล้ว",
      publishedAt: new Date(now.getTime() - 10800000).toISOString(),
      publishedAtThai: formatDateThai(new Date(now.getTime() - 10800000).toISOString()),
      isFeatured: false,
      category: "transfer",
    },
  ]
}

export async function GET() {
  try {
    // Fetch real news from GNews API
    const realNews = await fetchRealNews()

    const articles = realNews.length > 0 ? realNews : getFallbackNews()
    const source = realNews.length > 0 ? "gnews" : "fallback"

    // Sort by date (newest first)
    const sortedArticles = articles.sort((a, b) => {
      if (a.isFeatured) return -1
      if (b.isFeatured) return 1
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })

    return NextResponse.json({
      articles: sortedArticles,
      lastUpdated: new Date().toISOString(),
      lastUpdatedThai: formatDateThai(new Date().toISOString()),
      source: source,
      stats: {
        total: sortedArticles.length,
        results: sortedArticles.filter((a) => a.category === "result").length,
        previews: sortedArticles.filter((a) => a.category === "preview").length,
        transfers: sortedArticles.filter((a) => a.category === "transfer").length,
        general: sortedArticles.filter((a) => a.category === "general").length,
        match: sortedArticles.filter((a) => a.category === "match").length,
      },
    })
  } catch (error) {
    console.error("News API error:", error)

    const fallbackNews = getFallbackNews()
    return NextResponse.json({
      articles: fallbackNews,
      lastUpdated: new Date().toISOString(),
      lastUpdatedThai: formatDateThai(new Date().toISOString()),
      source: "fallback",
      stats: {
        total: fallbackNews.length,
        results: fallbackNews.filter((a) => a.category === "result").length,
        previews: fallbackNews.filter((a) => a.category === "preview").length,
        transfers: fallbackNews.filter((a) => a.category === "transfer").length,
        general: fallbackNews.filter((a) => a.category === "general").length,
        match: fallbackNews.filter((a) => a.category === "match").length,
      },
    })
  }
}
