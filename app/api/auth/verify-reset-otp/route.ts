import { NextRequest } from "next/server"

import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import {
  generateResetSessionToken,
  hashValue,
  RESET_OTP_MAX_ATTEMPTS,
  RESET_SESSION_TTL_MS,
} from "@/lib/server/password-reset"
import { User } from "@/lib/server/models"

export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    const body = await request.json()
    const email = String(body.email || "").trim().toLowerCase()
    const otp = String(body.otp || "").trim()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(otp)) {
      return errorResponse("Validation failed", 422)
    }

    const user = await User.findOne({ email })
    if (!user || !user.resetPasswordOtpHash || !user.resetPasswordOtpExpiresAt) {
      return errorResponse("OTP is invalid or expired", 400)
    }

    if (user.resetPasswordOtpExpiresAt.getTime() <= Date.now()) {
      user.resetPasswordOtpHash = ""
      user.resetPasswordOtpExpiresAt = null
      user.resetPasswordOtpAttempts = 0
      await user.save()
      return errorResponse("OTP is invalid or expired", 400)
    }

    if ((user.resetPasswordOtpAttempts || 0) >= RESET_OTP_MAX_ATTEMPTS) {
      return errorResponse("Too many invalid OTP attempts", 429)
    }

    if (user.resetPasswordOtpHash !== hashValue(otp)) {
      user.resetPasswordOtpAttempts = (user.resetPasswordOtpAttempts || 0) + 1
      await user.save()
      return errorResponse("OTP is invalid or expired", 400)
    }

    const resetToken = generateResetSessionToken()

    user.resetPasswordOtpHash = ""
    user.resetPasswordOtpExpiresAt = null
    user.resetPasswordOtpAttempts = 0
    user.resetPasswordToken = hashValue(resetToken)
    user.resetPasswordExpiresAt = new Date(Date.now() + RESET_SESSION_TTL_MS)
    await user.save()

    return ok({
      message: "OTP verified successfully.",
      resetToken,
    })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "OTP verification failed", 500)
  }
}
