import { NextRequest } from "next/server"

import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import {
  generateOtp,
  hashValue,
  RESET_OTP_TTL_MS,
  sendPasswordResetOtpEmail,
} from "@/lib/server/password-reset"
import { User } from "@/lib/server/models"

export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    const body = await request.json()
    const email = String(body.email || "").trim().toLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse("Validation failed", 422, [{ path: "email" }])
    }

    const user = await User.findOne({ email })
    let devOtp: string | undefined

    if (user) {
      const otp = generateOtp()

      user.resetPasswordOtpHash = hashValue(otp)
      user.resetPasswordOtpExpiresAt = new Date(Date.now() + RESET_OTP_TTL_MS)
      user.resetPasswordOtpAttempts = 0
      user.resetPasswordToken = ""
      user.resetPasswordExpiresAt = null
      await user.save()

      const sent = await sendPasswordResetOtpEmail(email, otp)

      if (!sent && process.env.NODE_ENV !== "production") {
        devOtp = otp
      }
    }

    return ok({
      message: "If the email exists, an OTP has been sent.",
      ...(devOtp ? { devOtp } : {}),
    })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Forgot password failed", 500)
  }
}
