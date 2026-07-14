const { env } = require("../config/env")
const { formatDateThai, getTimeAgoThai } = require("../utils/football")

const GNEWS_QUERY = "Premier League football"
const GNEWS_MAX_ARTICLES = 20
const AI_TRANSLATION_LIMIT = 10

const TEAM_TRANSLATIONS = {
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

const TERM_TRANSLATIONS = {
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
  deal: "ดีล",
  Deal: "ดีล",
  race: "การลุ้นแชมป์",
  Race: "การลุ้นแชมป์",
  title: "แชมป์",
  Title: "แชมป์",
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function translateWithDictionary(text) {
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

function categorizeNews(title, description) {
  const text = `${title} ${description}`.toLowerCase()

  if (text.includes("transfer") || text.includes("sign") || text.includes("deal") || text.includes("move")) return "transfer"
  if (text.includes("preview") || text.includes("upcoming") || text.includes("fixture")) return "preview"
  if (text.includes("result") || text.includes("beat") || text.includes("won") || text.includes("score")) return "result"
  if (text.includes("match") || text.includes("game")) return "match"
  return "general"
}

function sanitizeThaiText(value, fallback) {
  const text = typeof value === "string" ? value.trim() : ""
  if (!text) return fallback
  return text.replace(/\s+/g, " ")
}

function normalizeCompletionsUrl(baseUrl) {
  const trimmed = baseUrl.replace(/\/+$/, "")
  if (trimmed.endsWith("/chat/completions")) return trimmed
  return `${trimmed}/chat/completions`
}

function extractJsonPayload(content) {
  const trimmed = content.trim()

  try {
    return JSON.parse(trimmed)
  } catch {}

  const match = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/(\{[\s\S]*\})/)
  if (!match || !match[1]) return null

  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

async function translateArticlesWithAi(articles) {
  if (!env.intelsphereApiKey || !env.intelsphereBaseUrl || !env.intelsphereModel || articles.length === 0) {
    return null
  }

  const payload = {
    model: env.intelsphereModel,
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a Thai sports news editor. Translate English football news into Thai. Keep facts unchanged. Write Thai that is clear, polished, and punchy. Add only light playful flavor suitable for a news site, never clickbait, never invent details. Preserve team and player names in Thai transliteration when natural. Return valid JSON only."
      },
      {
        role: "user",
        content: JSON.stringify({
          instruction:
            "Translate each item into Thai. Return JSON with shape {\"items\":[{\"titleThai\":\"...\",\"descriptionThai\":\"...\"}]}. Keep the same number and order as input. Each title should be concise. Each description should be 1-2 Thai sentences.",
          items: articles.map((article) => ({
            title: article.title,
            description: article.description || ""
          }))
        })
      }
    ]
  }

  try {
    const response = await fetch(normalizeCompletionsUrl(env.intelsphereBaseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.intelsphereApiKey}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      console.error("IntelSphere translation error:", response.status)
      return null
    }

    const data = await response.json()
    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
    if (typeof content !== "string") return null

    const parsed = extractJsonPayload(content)
    if (!parsed || !Array.isArray(parsed.items)) return null

    return parsed.items
  } catch (error) {
    console.error("IntelSphere translation failed:", error)
    return null
  }
}

function getFallbackNews() {
  const now = new Date()
  const articles = [
    {
      id: "fallback-1",
      title: "อัปเดตตารางคะแนนพรีเมียร์ลีกล่าสุด",
      description: "ตามติดความเคลื่อนไหวบนหัวตารางและโซนลุ้นหนีตกชั้นแบบไม่กะพริบตา",
      url: "#",
      image: "/premier-league-news.jpg",
      source: "EPL Hub",
      publishedAt: now.toISOString(),
      isFeatured: true,
      category: "general"
    },
    {
      id: "fallback-2",
      title: "สรุปผลพรีเมียร์ลีกประจำสัปดาห์ ใครเฮ ใครมีเรื่องให้โค้ชปวดหัว",
      description: "รวมผลการแข่งขันคู่สำคัญ พร้อมประเด็นที่แฟนบอลน่าจะหยิบไปคุยยาวหลังจบเกม",
      url: "#",
      image: "/premier-league-news.jpg",
      source: "EPL Hub",
      publishedAt: new Date(now.getTime() - 3600000).toISOString(),
      isFeatured: false,
      category: "result"
    },
    {
      id: "fallback-3",
      title: "ตลาดนักเตะเริ่มคึก อัปเดตดีลล่าสุดแบบไม่ปล่อยให้ข่าวลือวิ่งนำ",
      description: "สรุปความคืบหน้าดีลเด่นในพรีเมียร์ลีกแบบกระชับ อ่านจบแล้วรู้เรื่องไม่ต้องเดาต่อ",
      url: "#",
      image: "/premier-league-news.jpg",
      source: "EPL Hub",
      publishedAt: new Date(now.getTime() - 7200000).toISOString(),
      isFeatured: false,
      category: "transfer"
    }
  ]

  return articles.map((article) => ({
    ...article,
    timeAgo: getTimeAgoThai(article.publishedAt),
    publishedAtThai: formatDateThai(article.publishedAt)
  }))
}

async function getNews() {
  if (!env.gnewsApiKey) {
    return { articles: getFallbackNews(), source: "fallback" }
  }

  try {
    const response = await fetch(
      `https://gnews.io/api/v4/search?q=${encodeURIComponent(GNEWS_QUERY)}&lang=en&country=uk&max=${GNEWS_MAX_ARTICLES}&apikey=${env.gnewsApiKey}`
    )

    if (!response.ok) {
      return { articles: getFallbackNews(), source: "fallback" }
    }

    const data = await response.json()
    const rawArticles = Array.isArray(data.articles) ? data.articles : []
    const aiTranslations = await translateArticlesWithAi(rawArticles.slice(0, AI_TRANSLATION_LIMIT))

    const articles = rawArticles.map((article, index) => {
      const translated = aiTranslations && aiTranslations[index] ? aiTranslations[index] : null
      const titleEn = article.title || "Premier League news update"
      const descriptionEn = article.description || ""

      return {
        id: `gnews-${index}-${new Date(article.publishedAt).getTime() || Date.now()}`,
        title: sanitizeThaiText(translated && translated.titleThai, translateWithDictionary(titleEn)),
        titleEn,
        description: sanitizeThaiText(translated && translated.descriptionThai, translateWithDictionary(descriptionEn)),
        descriptionEn,
        url: article.url,
        image: article.image || "/premier-league-news.jpg",
        source: article.source && article.source.name ? article.source.name : "GNews",
        timeAgo: getTimeAgoThai(article.publishedAt),
        publishedAt: article.publishedAt,
        publishedAtThai: formatDateThai(article.publishedAt),
        isFeatured: index === 0,
        category: categorizeNews(titleEn, descriptionEn)
      }
    })

    return {
      articles: articles.length > 0 ? articles : getFallbackNews(),
      source: articles.length > 0 ? "gnews" : "fallback"
    }
  } catch (error) {
    return { articles: getFallbackNews(), source: "fallback" }
  }
}

module.exports = { getNews }
