import { NextRequest } from "next/server"
import { requireAuthUser } from "@/lib/server/auth"
import { ok, errorResponse } from "@/lib/server/http"
import { quizHistory } from "@/lib/server/quiz-results"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthUser(request)
    const raw = request.nextUrl.searchParams.get("page") || "1"
    const page = Number(raw)
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(page) || page < 1 || page > 100000) return errorResponse("Invalid page", 400)
    return ok(await quizHistory(user._id.toString(), page), { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") return errorResponse(error.message, 401)
    console.error("Quiz history failed", error)
    return errorResponse("โหลดประวัติไม่สำเร็จ กรุณาลองอีกครั้ง", 500)
  }
}
