import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { PaymentEntitlement, PaymentOrder } from "@/lib/server/models"
import { getThunderConfig } from "@/lib/server/thunder"

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const now = new Date()

    const [orders, entitlements] = await Promise.all([
      PaymentOrder.find({ user: user._id }).sort({ createdAt: -1 }).limit(10).lean(),
      PaymentEntitlement.find({
        user: user._id,
        active: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      })
        .sort({ createdAt: -1 })
        .lean(),
    ])

    const thunder = getThunderConfig()

    return ok({
      promptpay: {
        id: thunder.promptpayId,
        accountName: thunder.accountName,
      },
      orders: orders.map((order: any) => ({
        id: order._id.toString(),
        productCode: order.productCode,
        productName: order.productName,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        targetType: order.targetType,
        targetId: order.targetId,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        slipImageUrl: order.slipImageUrl || "",
      })),
      entitlements: entitlements.map((item: any) => ({
        id: item._id.toString(),
        productCode: item.productCode,
        targetType: item.targetType,
        targetId: item.targetId,
        active: item.active,
        amount: item.amount,
        expiresAt: item.expiresAt,
        metadata: item.metadata || {},
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลการชำระเงินได้"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
