import { NextRequest, NextResponse } from "next/server"

import { createIntelSphereCompletion, extractJsonPayload } from "@/lib/intelsphere"
import { formatDateThai } from "@/lib/sportmonks"

type ScoreItem = {
  id: string
  stage: string
  date: string
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  homeFlag: string
  awayFlag: string
  homeBadge: string
  awayBadge: string
  venue: string
  status: "live" | "finished" | "upcoming"
  note: string
}

type ScoresResponse = {
  recentResults: ScoreItem[]
  upcomingFixtures: ScoreItem[]
  source: string
}

type HistoricalRecapMatch = {
  id: string
  year: number
  stage: string
  date: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  venue: string
  note: string
  searchQuery: string
  image: string
}

type AiRecapItem = {
  title: string
  body: string
  matchLabel: string
  image: string
}

type AiHubPayload = {
  recaps: AiRecapItem[]
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
  source: "ai" | "fallback"
}

type GNewsResponse = {
  articles?: Array<{
    image?: string
  }>
}

const GNEWS_BASE_URL = "https://gnews.io/api/v4/search"
const RECAP_FALLBACK_IMAGE = "/worldcup/trophy.jpg"

const historicalRecapMatches: HistoricalRecapMatch[] = [
  {
    id: "wc-2022-final",
    year: 2022,
    stage: "Final",
    date: "2022-12-18",
    homeTeam: "Argentina",
    awayTeam: "France",
    homeScore: 3,
    awayScore: 3,
    venue: "Lusail Iconic Stadium",
    note: "Argentina won 4-2 on penalties.",
    searchQuery: '"2022 FIFA World Cup final" Argentina France Messi',
    image: "/worldcup/messi2022.jpg",
  },
  {
    id: "wc-2018-final",
    year: 2018,
    stage: "Final",
    date: "2018-07-15",
    homeTeam: "France",
    awayTeam: "Croatia",
    homeScore: 4,
    awayScore: 2,
    venue: "Luzhniki Stadium",
    note: "France won their second World Cup title.",
    searchQuery: '"2018 FIFA World Cup final" France Croatia Mbappe',
    image: "/worldcup/france2018.jpg",
  },
  {
    id: "wc-2010-final",
    year: 2010,
    stage: "Final",
    date: "2010-07-11",
    homeTeam: "Netherlands",
    awayTeam: "Spain",
    homeScore: 0,
    awayScore: 1,
    venue: "Soccer City",
    note: "Spain won in extra time through Andres Iniesta.",
    searchQuery: '"2010 FIFA World Cup final" Spain Netherlands Iniesta',
    image: "/worldcup/worldcup2010.webp",
  },
]

function buildOrigin(request: NextRequest) {
  return new URL(request.url).origin
}

async function fetchHistoricalRecapImage(match: HistoricalRecapMatch) {
  if (match.image) {
    return match.image
  }

  const apiKey = process.env.GNEWS_API_KEY
  if (!apiKey) {
    return RECAP_FALLBACK_IMAGE
  }

  try {
    const response = await fetch(
      `${GNEWS_BASE_URL}?q=${encodeURIComponent(match.searchQuery)}&lang=en&max=1&apikey=${apiKey}`,
      { next: { revalidate: 21600 } },
    )

    if (!response.ok) {
      return RECAP_FALLBACK_IMAGE
    }

    const data = (await response.json()) as GNewsResponse
    return data.articles?.[0]?.image || RECAP_FALLBACK_IMAGE
  } catch {
    return RECAP_FALLBACK_IMAGE
  }
}

async function fetchHistoricalRecapImages() {
  const images = await Promise.all(historicalRecapMatches.map((match) => fetchHistoricalRecapImage(match)))
  return historicalRecapMatches.map((match, index) => ({
    ...match,
    image: images[index] || RECAP_FALLBACK_IMAGE,
  }))
}

function buildFallbackRecaps(matches: Array<HistoricalRecapMatch & { image: string }>) {
  return matches.map((match) => ({
    title: `${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam}`,
    body: `${match.homeTeam} และ ${match.awayTeam} สร้างแมตช์ที่ถูกพูดถึงอย่างมากในฟุตบอลโลก ${match.year} โดยเกมนี้มีน้ำหนักทั้งในเชิงประวัติศาสตร์และอารมณ์ร่วมของแฟนบอลทั่วโลก ${match.note}`,
    matchLabel: `${match.stage} • ${formatDateThai(match.date)}`,
    image: match.image,
  }))
}

function fallbackPayload(scores: ScoresResponse, recapMatches: Array<HistoricalRecapMatch & { image: string }>): AiHubPayload {
  const upcoming = scores.upcomingFixtures[0]

  return {
    recaps: buildFallbackRecaps(recapMatches),
    preview: {
      title: upcoming ? `${upcoming.homeTeam} vs ${upcoming.awayTeam}` : "พรีวิวแมตช์ถัดไป",
      body: upcoming
        ? `แมตช์นี้น่าจับตาในแง่จังหวะเปิดเกมและการคุมพื้นที่แดนกลาง โดยเฉพาะช่วงต้นเกมที่ทั้งสองฝั่งน่าจะเน้นความรัดกุมก่อนเร่งจังหวะในครึ่งหลัง`
        : "เมื่อมีโปรแกรมแข่งขันจริงเข้ามา ระบบจะสร้างบทนำก่อนเกมให้อัตโนมัติจากคู่แข่ง เวลาแข่ง และบริบทของรอบการแข่งขัน",
      kickoffLabel: upcoming ? `${formatDateThai(upcoming.date)} • ${upcoming.venue}` : "กำลังรอโปรแกรมแข่งขัน",
    },
    insights: [
      {
        title: "ประเด็นวันนี้",
        body: "การหยิบแมตช์ประวัติศาสตร์หลายปีขึ้นมาเล่า ช่วยให้หน้า World Cup มีมิติและไม่ยึดติดอยู่กับผลล่าสุดเพียงอย่างเดียว",
        tag: "Today",
      },
      {
        title: "ทีมที่น่าจับตา",
        body: "แมตช์คลาสสิกของแต่ละปีช่วยให้คนอ่านย้อนเห็นทั้งยุคสมัย ทีมเต็ง และช่วงเวลาที่นิยามทัวร์นาเมนต์ได้ชัดขึ้น",
        tag: "History",
      },
      {
        title: "มุมเว็บข่าวกีฬา",
        body: "AI recap ที่พาไปหลายปีและใช้ภาพข่าวจริงของแต่ละแมตช์ จะดูเหมือนคอลัมน์พิเศษมากกว่ากล่องสรุปธรรมดา",
        tag: "Product",
      },
    ],
    source: "fallback",
  }
}

export async function GET(request: NextRequest) {
  try {
    const origin = buildOrigin(request)
    const [scoresResponse, recapMatches] = await Promise.all([
      fetch(`${origin}/api/worldcup/scores`, { cache: "no-store" }),
      fetchHistoricalRecapImages(),
    ])

    const scores = (await scoresResponse.json()) as ScoresResponse
    const fallback = fallbackPayload(scores, recapMatches)
    const upcoming = scores.upcomingFixtures[0]

    const completion = await createIntelSphereCompletion(
      [
        {
          role: "system",
          content:
            "You are a Thai football editor writing concise premium-feeling website copy. Keep facts grounded in provided match data only. Return JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            instruction:
              'Return JSON with shape {"recaps":[{"title":"","body":"","matchLabel":""},{"title":"","body":"","matchLabel":""},{"title":"","body":"","matchLabel":""}],"preview":{"title":"","body":"","kickoffLabel":""},"insights":[{"title":"","body":"","tag":""},{"title":"","body":"","tag":""},{"title":"","body":"","tag":""}]}. Write polished Thai. Each recap should be 2-3 sentences. Keep the same order as input matches and only use provided facts.',
            today: new Date().toISOString(),
            historicalWorldCupMatches: recapMatches.map((match) => ({
              year: match.year,
              stage: match.stage,
              date: match.date,
              homeTeam: match.homeTeam,
              awayTeam: match.awayTeam,
              homeScore: match.homeScore,
              awayScore: match.awayScore,
              venue: match.venue,
              note: match.note,
            })),
            upcomingMatch: upcoming || null,
          }),
        },
      ],
      0.5,
    )

    if (!completion) {
      return NextResponse.json(fallback)
    }

    const parsed = extractJsonPayload<Omit<AiHubPayload, "source">>(completion)
    if (!parsed?.recaps || !Array.isArray(parsed.recaps) || !parsed?.preview || !Array.isArray(parsed.insights)) {
      return NextResponse.json(fallback)
    }

    const recaps = recapMatches.map((match, index) => ({
      title: parsed.recaps[index]?.title || fallback.recaps[index]?.title || `${match.homeTeam} vs ${match.awayTeam}`,
      body: parsed.recaps[index]?.body || fallback.recaps[index]?.body || "",
      matchLabel: parsed.recaps[index]?.matchLabel || `${match.stage} • ${formatDateThai(match.date)}`,
      image: match.image,
    }))

    return NextResponse.json({
      recaps,
      preview: parsed.preview,
      insights: parsed.insights.slice(0, 3),
      source: "ai",
    })
  } catch {
    return NextResponse.json(
      {
        recaps: buildFallbackRecaps(
          historicalRecapMatches.map((match) => ({
            ...match,
            image: RECAP_FALLBACK_IMAGE,
          })),
        ),
        preview: {
          title: "พรีวิวแมตช์ถัดไป",
          body: "เมื่อมีโปรแกรมจริงและข้อมูลทีมครบ ระบบจะสร้างบทนำก่อนเกมให้อัตโนมัติ",
          kickoffLabel: "AI fallback",
        },
        insights: [
          { title: "ประเด็นวันนี้", body: "จัด content ให้เล่าเรื่องจากแมตช์คลาสสิก ไปสู่ข่าวและมุมวิเคราะห์", tag: "Today" },
          { title: "ทีมที่น่าจับตา", body: "หยิบเกมใหญ่จากหลายยุคมาช่วยให้หน้า World Cup มีน้ำหนักทางประวัติศาสตร์", tag: "History" },
          { title: "มุมเว็บไซต์", body: "ใช้ AI เป็นชั้นสรุปและเรียบเรียง ส่วนภาพข่าวจริงให้ดึงจากแหล่งข่าวที่ค้นเจอ", tag: "Product" },
        ],
        source: "fallback",
      },
      { status: 200 },
    )
  }
}
