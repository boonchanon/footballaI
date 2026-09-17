import { NextRequest } from "next/server"

import { requireAuthUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { errorResponse, ok, parsePagination } from "@/lib/server/http"
import { TokenTransaction, User } from "@/lib/server/models"

export async function GET(request: NextRequest) {
  try {
    await connectDatabase()
    const user = await requireAuthUser(request)
    const { page, limit, skip } = parsePagination(request.nextUrl.searchParams)
    const [currentUser, transactions, total] = await Promise.all([
      User.findById(user._id).select("tokenBalance").lean(),
      TokenTransaction.find({ user: user._id }).populate("order", "productName amount currency status").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      TokenTransaction.countDocuments({ user: user._id }),
    ])

    return ok({
      balance: Number(currentUser?.tokenBalance || 0),
      transactions: transactions.map((item: any) => ({
        id: item._id.toString(),
        amount: item.amount,
        balanceAfter: item.balanceAfter,
        type: item.type,
        description: item.description,
        order: item.order
          ? {
              productName: item.order.productName || "",
              amount: item.order.amount || 0,
              currency: item.order.currency || "THB",
              status: item.order.status || "",
            }
          : null,
        createdAt: item.createdAt,
      })),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "ไม่สามารถโหลดประวัติ Token ได้"
    return errorResponse(message, message === "Authentication required" ? 401 : 500)
  }
}