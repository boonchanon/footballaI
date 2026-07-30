import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { normalizeMatchId, setMatchRoomFollow } from "@/lib/server/community-match-follow"
import { getMatchRoomFixture } from "@/lib/server/community-match-room"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"

export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const body = await request.json().catch(() => ({}))
    const matchId = normalizeMatchId(body.matchId)
    if (!matchId) return errorResponse("Match not found", 404)

    const fixture = await getMatchRoomFixture(matchId)
    if (!fixture || fixture.id !== matchId) return errorResponse("Match not found", 404)

    const result = await setMatchRoomFollow({
      userId: user._id.toString(),
      matchId,
      follow: body.follow !== false,
    })

    return ok({ ...result, matchId })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update match follow"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
