import { NextRequest } from "next/server"

import { getPredictionAccessProduct } from "@/lib/prediction-access"
import { requireAuthUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok } from "@/lib/server/http"
import { PaymentOrder } from "@/lib/server/models"

export async function POST(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const body = await request.json()

    const productCode = String(body.productCode || "")
    const product = getPredictionAccessProduct(productCode)
    if (!product) return errorResponse("แพ็กเกจที่เลือกไม่ถูกต้อง", 422)

    const order = await PaymentOrder.create({
      user: user._id,
      productCode: product.code,
      productName: product.name,
      amount: product.price,
      currency: "THB",
      status: "pending",
      paymentProvider: "thunder",
      targetType: product.targetType,
      targetId: "worldcup-2026",
    })

    return ok(
      {
        order: {
          id: order._id.toString(),
          productCode: order.productCode,
          productName: order.productName,
          amount: order.amount,
          currency: order.currency,
          status: order.status,
          targetType: order.targetType,
          targetId: order.targetId,
          createdAt: order.createdAt,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "ไม่สามารถสร้างคำสั่งซื้อได้"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}
