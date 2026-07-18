import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { PaymentEntitlement, PaymentOrder } from "@/lib/server/models"
import { getThunderConfig, verifyThunderSlipImage } from "@/lib/server/thunder"

export const runtime = "nodejs"

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "")
}

function normalizePromptPayDigits(value: string) {
  const digits = normalizeDigits(value)
  if (digits.length === 12 && digits.startsWith("0066")) {
    return `0${digits.slice(4)}`
  }
  return digits
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "")
}

function isSameRecipient(configured: string, received: string) {
  const left = normalizePromptPayDigits(configured)
  const right = normalizePromptPayDigits(received)
  if (!left || !right) return false
  return left === right || left.endsWith(right) || right.endsWith(left)
}

export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const formData = await request.formData()

    const orderId = String(formData.get("orderId") || "").trim()
    const slip = formData.get("slip") || formData.get("image")

    if (!orderId) {
      return errorResponse("กรุณาระบุคำสั่งซื้อ", 422)
    }

    if (!(slip instanceof File) || slip.size <= 0) {
      return errorResponse("invalid_image", 422)
    }

    const order = await PaymentOrder.findOne({ _id: orderId, user: user._id })
    if (!order) return errorResponse("ไม่พบคำสั่งซื้อ", 404)
    if (order.status === "paid") return errorResponse("คำสั่งซื้อนี้ชำระเงินสำเร็จแล้ว", 409)

    const thunder = getThunderConfig()
    const verified = await verifyThunderSlipImage(slip, {
      amount: Number(order.amount),
      checkDuplicate: true,
    })

    if (!verified.ok) {
      console.error("[payments/verify-slip] thunder verify failed", {
        orderId,
        error: verified.error,
        amount: verified.amount,
        raw: verified.raw,
      })
      return errorResponse(verified.error || "thunder_verify_failed", 422, verified.raw)
    }

    if (!verified.reference) {
      return errorResponse("missing_reference", 422, {
        code: "missing_reference",
        thunder: verified.raw,
      })
    }

    if (verified.amount == null || Number(verified.amount) !== Number(order.amount)) {
      console.error("[payments/verify-slip] amount mismatch", {
        orderId,
        expectedAmount: Number(order.amount),
        receivedAmount: verified.amount,
        raw: verified.raw,
      })
      return errorResponse(
        `ยอดเงินไม่ตรง: ระบบอ่านได้ ${verified.amount ?? "ไม่พบยอด"} บาท แต่คำสั่งซื้อนี้ต้องเป็น ${Number(order.amount)} บาท`,
        422,
        {
          code: "amount_mismatch",
          expectedAmount: Number(order.amount),
          receivedAmount: verified.amount,
          thunder: verified.raw,
        },
      )
    }

    if (!thunder.promptpayId) {
      return errorResponse("promptpay_not_configured", 500)
    }

    if (!verified.recipientAccount) {
      console.error("[payments/verify-slip] missing recipient account", {
        orderId,
        verified,
      })
      return errorResponse("unable_to_verify_recipient", 422, {
        code: "unable_to_verify_recipient",
        thunder: verified.raw,
      })
    }

    if (!isSameRecipient(thunder.promptpayId, verified.recipientAccount)) {
      console.error("[payments/verify-slip] recipient mismatch", {
        orderId,
        expectedRecipient: thunder.promptpayId,
        receivedRecipient: verified.recipientAccount,
        raw: verified.raw,
      })
      return errorResponse("recipient_mismatch", 422, {
        code: "recipient_mismatch",
        expectedRecipient: thunder.promptpayId,
        receivedRecipient: verified.recipientAccount,
        thunder: verified.raw,
      })
    }

    if (thunder.accountName && verified.recipientName) {
      const expectedName = normalizeName(thunder.accountName)
      const receivedName = normalizeName(verified.recipientName)
      if (expectedName && receivedName && expectedName !== receivedName) {
        console.warn("[payments/verify-slip] recipient name mismatch", {
          orderId,
          expectedName: thunder.accountName,
          receivedName: verified.recipientName,
        })
      }
    }

    if (verified.transferredAt) {
      const transferredAt = new Date(verified.transferredAt)
      const orderCreatedAt = new Date(order.createdAt)
      const now = new Date()
      const maxPastSkewMs = 15 * 60 * 1000
      const maxFutureSkewMs = 10 * 60 * 1000

      if (!Number.isNaN(transferredAt.getTime())) {
        if (transferredAt.getTime() < orderCreatedAt.getTime() - maxPastSkewMs) {
          return errorResponse("slip_time_too_old", 422, {
            code: "slip_time_too_old",
            orderCreatedAt: orderCreatedAt.toISOString(),
            transferredAt: transferredAt.toISOString(),
            thunder: verified.raw,
          })
        }

        if (transferredAt.getTime() > now.getTime() + maxFutureSkewMs) {
          return errorResponse("invalid_transfer_time", 422, {
            code: "invalid_transfer_time",
            transferredAt: transferredAt.toISOString(),
            thunder: verified.raw,
          })
        }
      }
    }

    const effectiveRef = verified.reference
    const existingPaid = await PaymentOrder.findOne({
      _id: { $ne: order._id },
      status: "paid",
      verificationRef: effectiveRef,
    }).lean()

    if (existingPaid) {
      return errorResponse("duplicate_slip", 409)
    }

    const now = new Date()
    const expiresAt = order.targetType === "daypass" ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : null

    order.status = "paid"
    order.slipImageUrl = slip.name || ""
    order.slipPayload = ""
    order.paidAt = now
    order.verificationRef = effectiveRef
    order.rawVerification = verified.raw
    order.expiresAt = expiresAt
    await order.save()

    const existingEntitlement = await PaymentEntitlement.findOne({ order: order._id }).lean()
    if (!existingEntitlement) {
      await PaymentEntitlement.create({
        user: user._id,
        order: order._id,
        productCode: order.productCode,
        targetType: order.targetType,
        targetId: order.targetId,
        amount: order.amount,
        active: true,
        expiresAt,
        metadata: {
          paymentProvider: "thunder",
          verificationRef: effectiveRef,
          creditsLimit: order.productCode === "prediction_5_matches" ? 5 : order.productCode === "prediction_15_matches" ? 15 : null,
          remainingCredits: order.productCode === "prediction_5_matches" ? 5 : order.productCode === "prediction_15_matches" ? 15 : null,
          unlockedFixtureIds: [],
        },
      })
    }

    return ok({
      success: true,
      order: {
        id: order._id.toString(),
        status: order.status,
        paidAt: order.paidAt,
        expiresAt: order.expiresAt,
      },
      message: "ชำระเงินสำเร็จและปลดล็อกสิทธิ์แล้ว",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "ไม่สามารถตรวจสอบสลิปได้"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
