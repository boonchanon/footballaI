import { NextResponse } from "next/server"

import { formatDateThai, getTimeAgoThai } from "@/lib/sportmonks"

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

interface RawNewsArticle {
  title: string
  description?: string
  url: string
  image?: string
  source?: {
    name?: string
  }
  publishedAt: string
}

interface AiTranslationItem {
  titleThai?: string
  descriptionThai?: string
}

interface AiTranslationResponse {
  items?: AiTranslationItem[]
}

const GNEWS_QUERY = "Premier League football"
const GNEWS_MAX_ARTICLES = 20
const AI_TRANSLATION_LIMIT = 10

const TEAM_TRANSLATIONS: Record<string, string> = {
  "Manchester United": "แมนเชสเตอร์ ยูไนเต็ด",
  "Manchester City": "แมนเชสเตอร์ ซิตี้",
  "Liverpool": "ลิเวอร์พูล",
  "Arsenal": "อาร์เซนอล",
  "Chelsea": "เชลซี",
  "Tottenham": "ท็อตแนม ฮ็อตสเปอร์",
  "Spurs": "สเปอร์ส",
  "Newcastle": "นิวคาสเซิล",
  "Aston Villa": "แอสตัน วิลลา",
  "West Ham": "เวสต์แฮม",
  "Brighton": "ไบรท์ตัน",
  "Everton": "เอฟเวอร์ตัน",
  "Leicester": "เลสเตอร์",
  "Nottingham Forest": "น็อตติงแฮม ฟอเรสต์",
}

const TERM_TRANSLATIONS: Record<string, string> = {
  "Premier League": "พรีเมียร์ลีก",
  football: "ฟุตบอล",
  Football: "ฟุตบอล",
  transfer: "ย้ายทีม",
  Transfer: "ย้ายทีม",
  transfers: "ดีลย้ายทีม",
  Transfers: "ดีลย้ายทีม",
  manager: "กุนซือ",
  Manager: "กุนซือ",
  coach: "โค้ช",
  Coach: "โค้ช",
  player: "นักเตะ",
  Player: "นักเตะ",
  players: "นักเตะ",
  Players: "นักเตะ",
  striker: "กองหน้า",
  Striker: "กองหน้า",
  midfielder: "กองกลาง",
  Midfielder: "กองกลาง",
  defender: "กองหลัง",
  Defender: "กองหลัง",
  goalkeeper: "ผู้รักษาประตู",
  Goalkeeper: "ผู้รักษาประตู",
  injury: "อาการบาดเจ็บ",
  Injury: "อาการบาดเจ็บ",
  injuries: "ปัญหาอาการบาดเจ็บ",
  Injuries: "ปัญหาอาการบาดเจ็บ",
  win: "ชนะ",
  Win: "ชนะ",
  wins: "เก็บชัย",
  Wins: "เก็บชัย",
  loss: "ความพ่ายแพ้",
  Loss: "ความพ่ายแพ้",
  draw: "เสมอ",
  Draw: "เสมอ",
  preview: "พรีวิว",
  Preview: "พรีวิว",
  result: "ผลการแข่งขัน",
  Result: "ผลการแข่งขัน",
  results: "ผลการแข่งขัน",
  Results: "ผลการแข่งขัน",
  update: "อัปเดต",
  Update: "อัปเดต",
  report: "รายงาน",
  Report: "รายงาน",
  signs: "เซ็นสัญญา",
  Signs: "เซ็นสัญญา",
  agrees: "บรรลุข้อตกลง",
  Agrees: "บรรลุข้อตกลง",
  agrees: "บรรลุข้อตกลง",
  deal: "ดีล",
  Deal: "ดีล",
  race: "การลุ้นแชมป์",
  Race: "การลุ้นแชมป์",
  title: "แชมป์",
  Title: "แชมป์",
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function translateWithDictionary(text: string): string {
  if (!text) return ""

  let translated = text

  for (const [english, thai] of Object.entries(TEAM_TRANSLATIONS)) {
    translated = translated.replace(new RegExp(escapeRegExp(english), "gi"), thai)
  }

  for (const [english, thai] of Object.entries(TERM_TRANSLATIONS)) {
    translated = translated.replace(new RegExp(`\\b${escapeRegExp(english)}\\b`, "g"), thai)
  }

  return translated
}

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

function sanitizeThaiText(value: string | undefined, fallback: string): string {
  const text = value?.trim()
  if (!text) return fallback
  return text.replace(/\s+/g, " ")
}

function normalizeCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "")
  if (trimmed.endsWith("/chat/completions")) return trimmed
  return `${trimmed}/chat/completions`
}

function extractJsonPayload(content: string): AiTranslationResponse | null {
  const trimmed = content.trim()

  try {
    const parsed = JSON.parse(trimmed) as AiTranslationResponse | AiTranslationItem[]
    if (Array.isArray(parsed)) return { items: parsed }
    return parsed
  } catch {}

  const match = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/(\{[\s\S]*\})/)
  if (!match?.[1]) return null

  try {
    const parsed = JSON.parse(match[1]) as AiTranslationResponse | AiTranslationItem[]
    if (Array.isArray(parsed)) return { items: parsed }
    return parsed
  } catch {
    return null
  }
}

function getMessageContent(messageContent: unknown): string | null {
  if (typeof messageContent === "string") {
    return messageContent
  }

  if (Array.isArray(messageContent)) {
    const text = messageContent
      .map((item) => {
        if (typeof item === "string") return item
        if (item && typeof item === "object" && "text" in item && typeof item.text === "string") {
          return item.text
        }
        return ""
      })
      .join("")
      .trim()

    return text || null
  }

  return null
}

async function translateArticlesWithAi(articles: RawNewsArticle[]): Promise<AiTranslationItem[] | null> {
  const apiKey = process.env.INTELSPHERE_API_KEY
  const baseUrl = process.env.INTELSPHERE_BASE_URL
  const model = process.env.INTELSPHERE_MODEL

  if (!apiKey || !baseUrl || !model || articles.length === 0) {
    return null
  }

  const payload = {
    model,
    temperature: 0.3,
    stream: false,
    messages: [
      {
        role: "system",
        content:
          "You are a Thai sports news editor. Translate English football news into Thai. Keep facts unchanged. Write Thai that is clear, polished, and punchy. Add only light playful flavor suitable for a news site, never clickbait, never invent details. Preserve team and player names in Thai transliteration when natural. Return valid JSON only.",
      },
      {
        role: "user",
        content: JSON.stringify({
          instruction:
            "Translate each item into Thai. Return JSON with shape {\"items\":[{\"titleThai\":\"...\",\"descriptionThai\":\"...\"}]}. Keep the same number and order as input. Each title should be concise. Each description should be 1-2 Thai sentences.",
          items: articles.map((article) => ({
            title: article.title,
            description: article.description || "",
          })),
        }),
      },
    ],
  }

  try {
    const response = await fetch(normalizeCompletionsUrl(baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      console.error("IntelSphere translation error:", response.status)
      return null
    }

    const data = await response.json()
    const content = getMessageContent(data?.choices?.[0]?.message?.content)
    if (!content) return null

    const parsed = extractJsonPayload(content)
    if (!parsed?.items || !Array.isArray(parsed.items)) return null

    return parsed.items
  } catch (error) {
    console.error("IntelSphere translation failed:", error)
    return null
  }
}

async function fetchRealNews(): Promise<NewsArticle[]> {
  const apiKey = process.env.GNEWS_API_KEY

  if (!apiKey) {
    console.log("GNEWS_API_KEY not configured, using fallback news")
    return []
  }

  try {
    const response = await fetch(
      `https://gnews.io/api/v4/search?q=${encodeURIComponent(GNEWS_QUERY)}&lang=en&country=uk&max=${GNEWS_MAX_ARTICLES}&apikey=${apiKey}`,
      { next: { revalidate: 600 } },
    )

    if (!response.ok) {
      console.error("GNews API error:", response.status)
      return []
    }

    const data = await response.json()
    const rawArticles: RawNewsArticle[] = Array.isArray(data.articles) ? data.articles : []
    const aiTranslations = await translateArticlesWithAi(rawArticles.slice(0, AI_TRANSLATION_LIMIT))

    return rawArticles.map((article, index) => {
      const translated = aiTranslations?.[index]
      const titleEn = article.title || "Premier League news update"
      const descriptionEn = article.description || ""

      return {
        id: `gnews-${index}-${new Date(article.publishedAt).getTime() || Date.now()}`,
        title: sanitizeThaiText(translated?.titleThai, translateWithDictionary(titleEn)),
        titleEn,
        description: sanitizeThaiText(translated?.descriptionThai, translateWithDictionary(descriptionEn)),
        descriptionEn,
        url: article.url,
        image: article.image || "/premier-league-news.jpg",
        source: article.source?.name || "GNews",
        timeAgo: getTimeAgoThai(article.publishedAt),
        publishedAt: article.publishedAt,
        publishedAtThai: formatDateThai(article.publishedAt),
        isFeatured: index === 0,
        category: categorizeNews(titleEn, descriptionEn),
      }
    })
  } catch (error) {
    console.error("Failed to fetch real news:", error)
    return []
  }
}

function getFallbackNews(): NewsArticle[] {
  const now = new Date()
  return [
    {
      id: "fallback-1",
      title: "อัปเดตตารางคะแนนพรีเมียร์ลีกล่าสุด",
      titleEn: "Premier League Latest Standings Update",
      description: "ตามติดความเคลื่อนไหวบนหัวตารางและโซนลุ้นหนีตกชั้นแบบไม่กะพริบตา",
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
      title: "สรุปผลพรีเมียร์ลีกประจำสัปดาห์ ใครเฮ ใครมีเรื่องให้โค้ชปวดหัว",
      titleEn: "Premier League Weekly Results Summary",
      description: "รวมผลการแข่งขันคู่สำคัญ พร้อมประเด็นที่แฟนบอลน่าจะหยิบไปคุยยาวหลังจบเกม",
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
      title: "โปรแกรมพรีเมียร์ลีกสัปดาห์หน้า คู่ไหนเดือดมีแววต้องปักหมุด",
      titleEn: "Next Week Premier League Fixtures",
      description: "รวมโปรแกรมน่าจับตาของสัปดาห์หน้า เผื่อจัดเวลานั่งเชียร์กันล่วงหน้า",
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
      title: "ตลาดนักเตะเริ่มคึก อัปเดตดีลล่าสุดแบบไม่ปล่อยให้ข่าวลือวิ่งนำ",
      titleEn: "Latest Premier League Transfer News",
      description: "สรุปความคืบหน้าดีลเด่นในพรีเมียร์ลีกแบบกระชับ อ่านจบแล้วรู้เรื่องไม่ต้องเดาต่อ",
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
    const realNews = await fetchRealNews()
    const articles = realNews.length > 0 ? realNews : getFallbackNews()
    const source = realNews.length > 0 ? "gnews" : "fallback"

    const sortedArticles = articles.sort((a, b) => {
      if (a.isFeatured) return -1
      if (b.isFeatured) return 1
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })

    return NextResponse.json({
      articles: sortedArticles,
      lastUpdated: new Date().toISOString(),
      lastUpdatedThai: formatDateThai(new Date().toISOString()),
      source,
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
