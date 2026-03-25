import { NextRequest } from "next/server"

import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { hashValue } from "@/lib/server/password-reset"
import { User } from "@/lib/server/models"

export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    const body = await request.json()
    const resetToken = String(body.resetToken || "").trim()
    const password = String(body.password || "")

    if (!resetToken) {
      return errorResponse("ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว", 422, [{ path: "resetToken" }])
    }

    if (password.length < 6) {
      return errorResponse("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร", 422, [{ path: "password" }])
    }

    const user = await User.findOne({
      resetPasswordToken: hashValue(resetToken),
      resetPasswordExpiresAt: { $gt: new Date() },
    })

    if (!user) {
      return errorResponse("Reset token is invalid or expired", 400)
    }

    user.password = password
    user.resetPasswordOtpHash = ""
    user.resetPasswordOtpExpiresAt = null
    user.resetPasswordOtpAttempts = 0
    user.resetPasswordToken = ""
    user.resetPasswordExpiresAt = null
    await user.save()

    return ok({ message: "Password reset successfully" })
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Reset password failed", 500)
  }
}
