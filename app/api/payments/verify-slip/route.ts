import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { PaymentEntitlement, PaymentOrder } from "@/lib/server/models"
import { getEasySlipConfig, verifyEasySlipImage } from "@/lib/server/easyslip"
import { addTokens } from "@/lib/server/tokens"
import { sendTokenReceiptEmail } from "@/lib/server/password-reset"

export const runtime = "nodejs"

function isReusableOrderStatus(status: string) {
  return status === "cancelled" || status === "expired"
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "")
}

function normalizePromptPayDigits(value: string) {
  const digits = normalizeDigits(value)
  return digits.length === 12 && digits.startsWith("0066") ? `0${digits.slice(4)}` : digits
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9ก-๙]/g, "")
}

function isSameRecipient(configured: string, received: string) {
  const left = normalizePromptPayDigits(configured)
  const right = normalizePromptPayDigits(received)
  if (!left || !right) return false
  if (left === right || left.endsWith(right) || right.endsWith(left)) return true
  return right.length >= 4 && left.slice(-4) === right.slice(-4)
}

function isSameRecipientName(configured: string, received: string) {
  const left = normalizeName(configured)
  const right = normalizeName(received)
  return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)))
}

export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const formData = await request.formData()
    const orderId = String(formData.get("orderId") || "").trim()
    const slip = formData.get("slip") || formData.get("image")

    if (!orderId) return errorResponse("กรุณาระบุคำสั่งซื้อ", 422)
    if (!(slip instanceof File) || slip.size <= 0) return errorResponse("invalid_image", 422)

    const order = await PaymentOrder.findOne({ _id: orderId, user: user._id })
    if (!order) return errorResponse("ไม่พบคำสั่งซื้อ", 404)
    if (order.status === "paid") return errorResponse("คำสั่งซื้อนี้ชำระเงินสำเร็จแล้ว", 409)

    const easyslip = getEasySlipConfig()
    const verified = await verifyEasySlipImage(slip)
    if (!verified.ok) {
      console.error("[payments/verify-slip] easyslip verify failed", { orderId, error: verified.error })
      return errorResponse(verified.error || "easyslip_verify_failed", 422)
    }

    if (!verified.reference) return errorResponse("missing_reference", 422)
    if (verified.amount == null || Number(verified.amount) !== Number(order.amount)) {
      return errorResponse(`ยอดเงินไม่ตรง: สลิป ${verified.amount ?? "ไม่พบยอด"} บาท แต่รายการนี้ต้อง ${Number(order.amount)} บาท`, 422)
    }

    if (!easyslip.promptpayId) return errorResponse("promptpay_not_configured", 500)
    const hasRecipientAccount = Boolean(verified.recipientAccount)
    const recipientAccountMatches = hasRecipientAccount && isSameRecipient(easyslip.promptpayId, verified.recipientAccount)
    const recipientNameMatches = Boolean(easyslip.accountName && verified.recipientName) && isSameRecipientName(easyslip.accountName, verified.recipientName)
    if (hasRecipientAccount && !recipientAccountMatches && !recipientNameMatches) {
      return errorResponse("recipient_mismatch", 422)
    }

    if (!hasRecipientAccount && !verified.recipientName) {
      console.warn("[payments/verify-slip] EasySlip did not return recipient fields; continuing after amount/reference validation", {
        orderId,
        reference: verified.reference,
      })
    }

    if (verified.transferredAt) {
      const transferredAt = new Date(verified.transferredAt)
      const createdAt = new Date(order.createdAt)
      const now = new Date()
      if (!Number.isNaN(transferredAt.getTime())) {
        if (transferredAt.getTime() < createdAt.getTime() - 15 * 60 * 1000) return errorResponse("slip_time_too_old", 422)
        if (transferredAt.getTime() > now.getTime() + 10 * 60 * 1000) return errorResponse("invalid_transfer_time", 422)
      }
    }

    const existingReference = await PaymentOrder.findOne({ _id: { $ne: order._id }, verificationRef: verified.reference }).select("_id status").lean()
    if (existingReference && !isReusableOrderStatus(String(existingReference.status || ""))) return errorResponse("duplicate_slip", 409)

    const now = new Date()
    const expiresAt = order.targetType === "daypass" ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : null
    const creditAmount = order.productCode === "prediction_5_matches" ? 5 : order.productCode === "prediction_15_matches" ? 15 : order.productCode === "prediction_tournament" ? 40 : null

    order.status = "paid"
    order.slipImageUrl = slip.name || ""
    order.slipPayload = ""
    order.paidAt = now
    order.verificationRef = verified.reference
    order.rawVerification = verified.raw
    order.expiresAt = expiresAt
    await order.save()

    if (creditAmount) {
      await addTokens({
        userId: user._id.toString(),
        amount: creditAmount,
        type: "purchase",
        description: `ซื้อ Token: ${order.productName}`,
        idempotencyKey: `purchase:${order._id.toString()}`,
        orderId: order._id.toString(),
        metadata: { verificationRef: verified.reference, paymentProvider: "easyslip" },
      })
      try {
        await sendTokenReceiptEmail({ email: user.email, name: user.name, orderId: order._id.toString(), productName: order.productName, tokenAmount: creditAmount, amount: Number(order.amount), currency: order.currency, paidAt: now })
      } catch (emailError) {
        console.error("[payments/verify-slip] receipt email failed", { orderId, emailError })
      }
    }

    const existingEntitlement = await PaymentEntitlement.findOne({ order: order._id }).lean()
    if (!existingEntitlement && !creditAmount) {
      await PaymentEntitlement.create({
        user: user._id,
        order: order._id,
        productCode: order.productCode,
        targetType: order.targetType,
        targetId: order.targetId,
        amount: order.amount,
        active: true,
        expiresAt,
        metadata: { paymentProvider: "easyslip", verificationRef: verified.reference, creditsLimit: creditAmount, remainingCredits: creditAmount, unlockedFixtureIds: [] },
      })
    }

    return ok({ success: true, order: { id: order._id.toString(), status: order.status, paidAt: order.paidAt, expiresAt: order.expiresAt }, message: "ชำระเงินสำเร็จและปลดล็อกสิทธิ์แล้ว" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "ไม่สามารถตรวจสอบสลิปได้"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
