import { NextRequest } from "next/server"
import type { QuizPeriod } from "@/lib/games/quiz-results"
import { connectDatabase } from "@/lib/server/db"
import { ok, errorResponse } from "@/lib/server/http"
import { quizLeaderboard } from "@/lib/server/quiz-results"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get("period") || "weekly"
  if (!["weekly", "monthly", "season"].includes(period)) return errorResponse("Invalid period", 400)
  try {
    await connectDatabase()
    return ok(await quizLeaderboard(period as QuizPeriod), { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Quiz leaderboard failed", error)
    return errorResponse("โหลดอันดับไม่สำเร็จ กรุณาลองอีกครั้ง", 500)
  }
}
