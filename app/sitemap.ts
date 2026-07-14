import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://footballai.vercel.app"
  const lastModified = new Date()

  const pages: Array<{
    path: string
    changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
    priority: number
  }> = [
    { path: "", changeFrequency: "daily", priority: 1 },
    { path: "/matches", changeFrequency: "hourly", priority: 0.9 },
    { path: "/standings", changeFrequency: "daily", priority: 0.9 },
    { path: "/news", changeFrequency: "hourly", priority: 0.85 },
    { path: "/stats", changeFrequency: "daily", priority: 0.8 },
    { path: "/teams", changeFrequency: "weekly", priority: 0.8 },
    { path: "/players", changeFrequency: "weekly", priority: 0.8 },
    { path: "/ai-prediction", changeFrequency: "daily", priority: 0.8 },
    { path: "/community", changeFrequency: "daily", priority: 0.75 },
    { path: "/games", changeFrequency: "weekly", priority: 0.7 },
    { path: "/compare", changeFrequency: "weekly", priority: 0.65 },
    { path: "/heatmap", changeFrequency: "weekly", priority: 0.65 },
    { path: "/worldcup-2026", changeFrequency: "daily", priority: 0.7 },
    { path: "/worldcup-2026/predictions", changeFrequency: "daily", priority: 0.72 },
    { path: "/ai-football-live", changeFrequency: "daily", priority: 0.6 },
    { path: "/leagues", changeFrequency: "weekly", priority: 0.6 },
    { path: "/site-map", changeFrequency: "monthly", priority: 0.6 },
    { path: "/about", changeFrequency: "monthly", priority: 0.5 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
    { path: "/careers", changeFrequency: "monthly", priority: 0.4 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
    { path: "/cookies", changeFrequency: "yearly", priority: 0.3 },
    { path: "/login", changeFrequency: "monthly", priority: 0.3 },
    { path: "/register", changeFrequency: "monthly", priority: 0.3 },
    { path: "/forgot-password", changeFrequency: "monthly", priority: 0.2 },
  ]

  return pages.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))
}
