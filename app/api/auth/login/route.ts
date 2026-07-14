import { NextRequest } from "next/server"

import { signToken, sanitizeUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { generateOtp, hashValue, RESET_OTP_MAX_ATTEMPTS, RESET_OTP_TTL_MS } from "@/lib/server/password-reset"
import { User } from "@/lib/server/models"

function normalizePhone(value: string) {
  return value.trim().replace(/[^\d+]/g, "")
}

function isValidPhone(value: string) {
  return /^(\+?\d{9,15})$/.test(value)
}

export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    const body = await request.json()
    const action = String(body.action || "password")

    if (action === "request-phone-otp") {
      const phone = normalizePhone(String(body.phone || ""))
      if (!isValidPhone(phone)) {
        return errorResponse("กรุณากรอกเบอร์โทรให้ถูกต้อง", 422, [{ path: "phone" }])
      }

      const user = await User.findOne({ phone })
      let devOtp: string | undefined

      if (user) {
        const otp = generateOtp()
        user.phoneOtpHash = hashValue(otp)
        user.phoneOtpExpiresAt = new Date(Date.now() + RESET_OTP_TTL_MS)
        user.phoneOtpAttempts = 0
        await user.save({ validateBeforeSave: false })

        if (process.env.NODE_ENV !== "production") {
          devOtp = otp
          console.info(`[phone-login] OTP for ${phone}: ${otp}`)
        }
      }

      return ok({
        message: "หากพบเบอร์โทรในระบบ จะมีการส่ง OTP ให้",
        ...(devOtp ? { devOtp } : {}),
      })
    }

    if (action === "verify-phone-otp") {
      const phone = normalizePhone(String(body.phone || ""))
      const otp = String(body.otp || "").trim()

      if (!isValidPhone(phone) || !/^\d{6}$/.test(otp)) {
        return errorResponse("กรอกเบอร์โทรหรือ OTP ไม่ถูกต้อง", 422)
      }

      const user = await User.findOne({ phone })
      if (!user || !user.phoneOtpHash || !user.phoneOtpExpiresAt) {
        return errorResponse("OTP ไม่ถูกต้องหรือหมดอายุแล้ว", 400)
      }

      if (user.phoneOtpExpiresAt.getTime() <= Date.now()) {
        user.phoneOtpHash = ""
        user.phoneOtpExpiresAt = null
        user.phoneOtpAttempts = 0
        await user.save({ validateBeforeSave: false })
        return errorResponse("OTP ไม่ถูกต้องหรือหมดอายุแล้ว", 400)
      }

      if ((user.phoneOtpAttempts || 0) >= RESET_OTP_MAX_ATTEMPTS) {
        return errorResponse("กรอก OTP ผิดเกินจำนวนที่กำหนด", 429)
      }

      if (user.phoneOtpHash !== hashValue(otp)) {
        user.phoneOtpAttempts = (user.phoneOtpAttempts || 0) + 1
        await user.save({ validateBeforeSave: false })
        return errorResponse("OTP ไม่ถูกต้องหรือหมดอายุแล้ว", 400)
      }

      user.phoneOtpHash = ""
      user.phoneOtpExpiresAt = null
      user.phoneOtpAttempts = 0
      user.phoneVerifiedAt = user.phoneVerifiedAt || new Date()
      await user.save({ validateBeforeSave: false })

      return ok({
        message: "ยืนยัน OTP สำเร็จ",
        token: signToken({ sub: user._id.toString(), role: user.role }),
        user: sanitizeUser(user),
      })
    }

    const identifier = String(body.identifier || body.email || "").trim()
    const password = String(body.password || "")
    const normalizedPhone = normalizePhone(identifier)
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)
    const isPhone = isValidPhone(normalizedPhone)

    if (!isEmail && !isPhone) {
      return errorResponse("กรุณากรอกอีเมลหรือเบอร์โทรให้ถูกต้อง", 422, [{ path: "identifier" }])
    }

    if (!password) {
      return errorResponse("กรุณากรอกรหัสผ่าน", 422, [{ path: "password" }])
    }

    const user = await User.findOne(isEmail ? { email: identifier.toLowerCase() } : { phone: normalizedPhone })
    if (!user || !(await user.comparePassword(password))) {
      return errorResponse("อีเมลหรือเบอร์โทร หรือรหัสผ่านไม่ถูกต้อง", 401, [
        { path: "identifier" },
        { path: "password" },
      ])
    }

    return ok({
      token: signToken({ sub: user._id.toString(), role: user.role }),
      user: sanitizeUser(user),
    })
  } catch (error) {
    console.error("POST /api/auth/login failed", error)
    return errorResponse(error instanceof Error ? error.message : "Login failed", 500)
  }
}
