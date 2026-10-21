import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { PaymentEntitlement, PaymentOrder } from "@/lib/server/models"
import { getEasySlipConfig, verifyEasySlipImage } from "@/lib/server/easyslip"
import { isRecipientVerified, matchRecipientAccount } from "@/lib/server/payment-recipient"
import { addTokens } from "@/lib/server/tokens"
import { sendTokenReceiptEmail } from "@/lib/server/password-reset"

export const runtime = "nodejs"

function isReusableOrderStatus(status: string) {
  return status === "cancelled" || status === "expired"
}

// The env flag can relax the check for local testing only; production always verifies the recipient.
function requiresRecipientVerification() {
  if (process.env.NODE_ENV === "production") return true
  return process.env.EASYSLIP_REQUIRE_RECIPIENT_VERIFICATION?.trim() !== "false"
}

function isDuplicateKeyError(error: any) {
  return error?.code === 11000 || error?.errorResponse?.code === 11000
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
    const recipientVerified = isRecipientVerified({
      configuredAccount: easyslip.promptpayId,
      configuredName: easyslip.accountName,
      receivedAccount: verified.recipientAccount,
      receivedName: verified.recipientName,
    })
    if (!recipientVerified) {
      console.warn("[payments/verify-slip] recipient not verified", {
        orderId,
        reference: verified.reference,
        accountMatch: matchRecipientAccount(easyslip.promptpayId, verified.recipientAccount || ""),
        hasRecipientAccount: Boolean(verified.recipientAccount),
        hasRecipientName: Boolean(verified.recipientName),
      })
      if (requiresRecipientVerification()) {
        return errorResponse("ไม่สามารถยืนยันบัญชีผู้รับเงินในสลิปได้ กรุณาตรวจสอบว่าโอนเข้าบัญชีที่ถูกต้อง หรือติดต่อแอดมิน", 422)
      }
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

    // Claim the order and the slip reference in one atomic write: a second request for the same order
    // no longer matches status != "paid", and a second order using the same slip hits the partial
    // unique index on paid orders' verificationRef.
    let paidOrder
    try {
      paidOrder = await PaymentOrder.findOneAndUpdate(
        { _id: order._id, user: user._id, status: { $ne: "paid" } },
        {
          $set: {
            status: "paid",
            slipImageUrl: slip.name || "",
            slipPayload: "",
            paidAt: now,
            verificationRef: verified.reference,
            rawVerification: verified.raw,
            expiresAt,
          },
        },
        { new: true },
      )
    } catch (error) {
      if (isDuplicateKeyError(error)) return errorResponse("duplicate_slip", 409)
      throw error
    }
    if (!paidOrder) return errorResponse("คำสั่งซื้อนี้ชำระเงินสำเร็จแล้ว", 409)

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

    return ok({ success: true, order: { id: paidOrder._id.toString(), status: paidOrder.status, paidAt: paidOrder.paidAt, expiresAt: paidOrder.expiresAt }, message: "ชำระเงินสำเร็จและปลดล็อกสิทธิ์แล้ว" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "ไม่สามารถตรวจสอบสลิปได้"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
