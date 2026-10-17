import { NextRequest } from "next/server"
import { requireAuthUser } from "@/lib/server/auth"
import { ok, errorResponse } from "@/lib/server/http"
import { QuizError } from "@/lib/server/quiz-engine"
import { loadWho, startWho, updateWho } from "@/lib/server/who-am-i-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
const headers = { "Cache-Control": "private, no-store" }

function failure(error: unknown) {
  if (error instanceof QuizError) return errorResponse(error.message, error.status)
  if (error instanceof Error && error.message === "Authentication required") return errorResponse(error.message, 401)
  if (error instanceof SyntaxError) return errorResponse("Invalid JSON", 400)
  console.error("Who Am I request failed", error)
  return errorResponse("ไม่สามารถบันทึกเกมได้ กรุณาลองอีกครั้ง", 500)
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthUser(request)
    return ok(await loadWho(user._id.toString(), request.nextUrl.searchParams.get("session")), { headers })
  } catch (error) { return failure(error) }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthUser(request)
    const body = await request.json()
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new QuizError("Invalid request")
    const fields: Record<string, string[]> = {
      start: ["difficulty", "requestId"], answer: ["sessionId", "questionId", "selected"],
      hint: ["sessionId", "questionId", "hintNumber"], next: ["sessionId", "questionId"],
      complete: ["sessionId"], expire: ["sessionId"],
    }
    if (typeof body.action !== "string" || !Object.hasOwn(fields, body.action)) throw new QuizError("Invalid action")
    if (Object.keys(body).some(key => key !== "action" && !fields[body.action].includes(key))) throw new QuizError("Unexpected field")
    const result = body.action === "start" ? await startWho(user._id.toString(), body.difficulty, body.requestId)
      : await updateWho(user._id.toString(), body.sessionId, body.action, body.questionId, body.selected, body.hintNumber)
    return ok(result, { headers })
  } catch (error) { return failure(error) }
}
