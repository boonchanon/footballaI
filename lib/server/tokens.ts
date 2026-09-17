import { User, TokenTransaction } from "./models"

export type TokenTransactionType = "welcome_bonus" | "purchase" | "admin_grant" | "prediction_unlock"

export async function addTokens({
  userId,
  amount,
  type,
  description,
  idempotencyKey,
  orderId,
  actorAdminId,
  metadata,
}: {
  userId: string
  amount: number
  type: TokenTransactionType
  description: string
  idempotencyKey: string
  orderId?: string
  actorAdminId?: string
  metadata?: Record<string, unknown>
}) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("Token amount must be a positive integer")

  const existing = await TokenTransaction.findOne({ idempotencyKey }).lean()
  if (existing) return existing

  const user = await User.findOneAndUpdate(
    { _id: userId },
    { $inc: { tokenBalance: amount } },
    { new: true, projection: { tokenBalance: 1 } },
  )
  if (!user) throw new Error("User not found")

  try {
    return await TokenTransaction.create({
      user: userId,
      amount,
      balanceAfter: Number(user.tokenBalance || 0),
      type,
      description,
      idempotencyKey,
      ...(orderId ? { order: orderId } : {}),
      ...(actorAdminId ? { actorAdmin: actorAdminId } : {}),
      metadata: metadata || {},
    })
  } catch (error: any) {
    if (error?.code === 11000) return TokenTransaction.findOne({ idempotencyKey }).lean()
    throw error
  }
}

export async function consumeToken(userId: string, idempotencyKey: string, metadata?: Record<string, unknown>) {
  const existing = await TokenTransaction.findOne({ idempotencyKey }).lean()
  if (existing) return existing

  const user = await User.findOneAndUpdate(
    { _id: userId, tokenBalance: { $gte: 1 } },
    { $inc: { tokenBalance: -1 } },
    { new: true, projection: { tokenBalance: 1 } },
  )
  if (!user) return null

  try {
    return await TokenTransaction.create({
      user: userId,
      amount: 1,
      balanceAfter: Number(user.tokenBalance || 0),
      type: "prediction_unlock",
      description: "ปลดล็อกผลทำนาย",
      idempotencyKey,
      metadata: metadata || {},
    })
  } catch (error: any) {
    if (error?.code === 11000) return TokenTransaction.findOne({ idempotencyKey }).lean()
    throw error
  }
}