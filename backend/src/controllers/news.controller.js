const { asyncHandler } = require("../utils/async-handler")
const { formatDateThai } = require("../utils/football")
const { getNews } = require("../services/news.service")

const listNews = asyncHandler(async (req, res) => {
  const { articles, source } = await getNews()

  res.json({
    articles,
    lastUpdated: new Date().toISOString(),
    lastUpdatedThai: formatDateThai(new Date().toISOString()),
    source,
    stats: {
      total: articles.length,
      results: articles.filter((item) => item.category === "result").length,
      previews: articles.filter((item) => item.category === "preview").length,
      transfers: articles.filter((item) => item.category === "transfer").length,
      general: articles.filter((item) => item.category === "general").length,
      match: articles.filter((item) => item.category === "match").length
    }
  })
})

module.exports = { listNews }
