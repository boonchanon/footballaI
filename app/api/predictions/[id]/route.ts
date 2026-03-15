import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { Prediction } from "@/lib/server/models"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const { id } = await params

    const item = await Prediction.findOneAndDelete({ _id: id, user: user._id })
    if (!item) {
      return errorResponse("Prediction not found", 404)
    }

    return ok({ message: "Prediction deleted" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete prediction"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
