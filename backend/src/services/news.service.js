const { env } = require("../config/env")
const { formatDateThai, getTimeAgoThai } = require("../utils/football")

function categorizeNews(title, description) {
  const text = `${title} ${description}`.toLowerCase()

  if (text.includes("transfer") || text.includes("sign") || text.includes("deal") || text.includes("move")) return "transfer"
  if (text.includes("preview") || text.includes("upcoming") || text.includes("fixture")) return "preview"
  if (text.includes("result") || text.includes("beat") || text.includes("won") || text.includes("score")) return "result"
  if (text.includes("match") || text.includes("game")) return "match"
  return "general"
}

function translateNewsText(text) {
  return text
    .replace(/Premier League/gi, "พรีเมียร์ลีก")
    .replace(/Manchester United/gi, "แมนเชสเตอร์ ยูไนเต็ด")
    .replace(/Manchester City/gi, "แมนเชสเตอร์ ซิตี้")
    .replace(/Liverpool/gi, "ลิเวอร์พูล")
    .replace(/Arsenal/gi, "อาร์เซนอล")
    .replace(/Chelsea/gi, "เชลซี")
    .replace(/Tottenham/gi, "ท็อตแนม")
}

function getFallbackNews() {
  const now = new Date()
  const articles = [
    {
      id: "fallback-1",
      title: "พรีเมียร์ลีก อัปเดตตารางคะแนนล่าสุด",
      description: "ติดตามความเคลื่อนไหวล่าสุดของตารางคะแนนพรีเมียร์ลีก ฤดูกาล 2024/25",
      url: "#",
      image: "/premier-league-news.jpg",
      source: "EPL Hub",
      publishedAt: now.toISOString(),
      isFeatured: true,
      category: "general"
    },
    {
      id: "fallback-2",
      title: "สรุปผลการแข่งขันพรีเมียร์ลีกสัปดาห์นี้",
      description: "รวมผลการแข่งขันที่น่าสนใจในสัปดาห์ที่ผ่านมา",
      url: "#",
      image: "/premier-league-news.jpg",
      source: "EPL Hub",
      publishedAt: new Date(now.getTime() - 3600000).toISOString(),
      isFeatured: false,
      category: "result"
    },
    {
      id: "fallback-3",
      title: "ข่าวการย้ายทีมล่าสุดในพรีเมียร์ลีก",
      description: "อัปเดตข่าวการย้ายทีมของนักเตะในพรีเมียร์ลีก",
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
      `https://gnews.io/api/v4/search?q=Premier+League+football&lang=en&country=uk&max=20&apikey=${env.gnewsApiKey}`
    )

    if (!response.ok) {
      return { articles: getFallbackNews(), source: "fallback" }
    }

    const data = await response.json()
    const articles = (data.articles || []).map((article, index) => ({
      id: `gnews-${index}-${Date.now()}`,
      title: translateNewsText(article.title),
      titleEn: article.title,
      description: translateNewsText(article.description || ""),
      descriptionEn: article.description || "",
      url: article.url,
      image: article.image || "/premier-league-news.jpg",
      source: article.source?.name || "GNews",
      timeAgo: getTimeAgoThai(article.publishedAt),
      publishedAt: article.publishedAt,
      publishedAtThai: formatDateThai(article.publishedAt),
      isFeatured: index === 0,
      category: categorizeNews(article.title, article.description || "")
    }))

    return {
      articles: articles.length > 0 ? articles : getFallbackNews(),
      source: articles.length > 0 ? "gnews" : "fallback"
    }
  } catch (error) {
    return { articles: getFallbackNews(), source: "fallback" }
  }
}

module.exports = { getNews }
