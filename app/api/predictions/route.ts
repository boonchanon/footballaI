import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok, parsePagination } from "@/lib/server/http"
import { Prediction } from "@/lib/server/models"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildPrediction } = require("../../../backend/src/services/prediction.service.js")

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const { page, limit, skip } = parsePagination(request.nextUrl.searchParams)

    const [items, total] = await Promise.all([
      Prediction.find({ user: user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Prediction.countDocuments({ user: user._id }),
    ])

    return ok({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load predictions"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const body = await request.json()

    if (!String(body.homeTeam || "").trim() || !String(body.awayTeam || "").trim()) {
      return errorResponse("Validation failed", 422)
    }

    const predictionPayload = buildPrediction(body)
    const item = await Prediction.create({
      ...predictionPayload,
      user: user._id,
    })

    return ok(item, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create prediction"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
