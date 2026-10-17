import { NextRequest } from "next/server"
import { requireAuthUser } from "@/lib/server/auth"
import { ok, errorResponse } from "@/lib/server/http"
import { QuizError } from "@/lib/server/quiz-engine"
import { loadQuiz, startQuiz, updateQuiz } from "@/lib/server/quiz-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function failure(error: unknown) {
  if (error instanceof QuizError) return errorResponse(error.message, error.status)
  if (error instanceof Error && error.message === "Authentication required") return errorResponse(error.message, 401)
  if (error instanceof SyntaxError) return errorResponse("Invalid JSON", 400)
  console.error("Quiz request failed", error)
  return errorResponse("ไม่สามารถบันทึกเกมได้ กรุณาลองอีกครั้ง", 500)
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthUser(request)
    return ok(await loadQuiz(user._id.toString(), request.nextUrl.searchParams.get("session")), {
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch (error) { return failure(error) }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthUser(request)
    const body = await request.json()
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new QuizError("Invalid request")
    const allowed = body.action === "start"
      ? ["action", "category", "requestId", "difficulty"]
      : ["action", "sessionId", "questionId", "selected"]
    if (Object.keys(body).some(key => !allowed.includes(key))) throw new QuizError("Unexpected field")
    const result = body.action === "start"
      ? await startQuiz(user._id.toString(), body.category, body.requestId, body.difficulty)
      : ["answer", "next", "complete"].includes(body.action)
        ? await updateQuiz(user._id.toString(), body.sessionId, body.action, body.questionId, body.selected)
        : (() => { throw new QuizError("Invalid action") })()
    return ok(result, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) { return failure(error) }
}
