import { NextResponse } from "next/server"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { homeTeam, awayTeam, model } = await req.json()

    const modelMap: Record<string, string> = {
      "gpt-5": "openai/gpt-5",
      "claude-sonnet-4.5": "anthropic/claude-sonnet-4.5",
      "grok-4-fast": "xai/grok-4-fast",
    }

    const modelName = model === "gpt-5" ? "GPT-5" : model === "claude-sonnet-4.5" ? "Claude Sonnet 4.5" : "Grok 4 Fast"

    // Generate mock prediction based on team names
    const homeWin = Math.floor(Math.random() * 30) + 35 // 35-65%
    const draw = Math.floor(Math.random() * 20) + 20 // 20-40%
    const awayWin = 100 - homeWin - draw

    const predictionData = {
      homeWinProbability: homeWin,
      drawProbability: draw,
      awayWinProbability: awayWin,
      predictedScore: {
        home: Math.floor(Math.random() * 3) + 1,
        away: Math.floor(Math.random() * 2),
      },
      confidence: Math.floor(Math.random() * 20) + 70, // 70-90%
      analysis: `จากการวิเคราะห์สถิติและฟอร์มล่าสุดของทั้งสองทีม ${homeTeam} มีความได้เปรียบในฐานะทีมเจ้าบ้าน ด้วยสถิติการชนะในบ้านที่ดี รวมถึงผลงานการเจอกันในอดีตที่ ${homeTeam} มักได้เปรียบ อย่างไรก็ตาม ${awayTeam} ก็มีฟอร์มที่น่าจับตามองในช่วงหลัง`,
      keyFactors: ["ฟอร์มล่าสุด 5 นัดของทีมเจ้าบ้าน", "สถิติการเจอกันในอดีต", "ความแข็งแกร่งของทีมเจ้าบ้าน", "สถานะของผู้เล่นคนสำคัญ"],
    }

    return NextResponse.json({
      homeTeam,
      awayTeam,
      modelName,
      ...predictionData,
    })
  } catch (error) {
    console.error("Prediction error:", error)
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการทำนาย" }, { status: 500 })
  }
}
