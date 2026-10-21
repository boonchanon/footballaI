import mongoose from "mongoose"

import { User, TokenTransaction } from "./models"

export type TokenTransactionType = "welcome_bonus" | "purchase" | "admin_grant" | "prediction_unlock"

function isDuplicateKeyError(error: any) {
  return error?.code === 11000 || error?.errorResponse?.code === 11000
}

function assertSameOwner(transaction: any, userId: string) {
  if (transaction && String(transaction.user) !== String(userId)) {
    throw new Error("Token idempotency key belongs to another user")
  }
  return transaction
}

// Balance change and ledger insert run in one MongoDB transaction, so a concurrent request with the
// same idempotency key either sees the committed transaction or fails on the unique index and is
// rolled back — the balance can never move twice for one key.
async function runBalanceChange<T>(idempotencyKey: string, work: (session: mongoose.ClientSession) => Promise<T>) {
  const session = await mongoose.startSession()
  try {
    let result: T | undefined
    await session.withTransaction(async () => {
      result = await work(session)
    })
    return result as T
  } catch (error) {
    if (isDuplicateKeyError(error)) return (await TokenTransaction.findOne({ idempotencyKey }).lean()) as T
    throw error
  } finally {
    await session.endSession()
  }
}

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

  const result = await runBalanceChange(idempotencyKey, async (session) => {
    const existing = await TokenTransaction.findOne({ idempotencyKey }).session(session).lean()
    if (existing) return existing

    const user = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { tokenBalance: amount } },
      { new: true, projection: { tokenBalance: 1 }, session },
    )
    if (!user) throw new Error("User not found")

    const [created] = await TokenTransaction.create(
      [
        {
          user: userId,
          amount,
          balanceAfter: Number(user.tokenBalance || 0),
          type,
          description,
          idempotencyKey,
          ...(orderId ? { order: orderId } : {}),
          ...(actorAdminId ? { actorAdmin: actorAdminId } : {}),
          metadata: metadata || {},
        },
      ],
      { session },
    )
    return created
  })
  return assertSameOwner(result, userId)
}

export async function consumeToken(userId: string, idempotencyKey: string, metadata?: Record<string, unknown>) {
  const result = await runBalanceChange(idempotencyKey, async (session) => {
    const existing = await TokenTransaction.findOne({ idempotencyKey }).session(session).lean()
    if (existing) return existing

    const user = await User.findOneAndUpdate(
      { _id: userId, tokenBalance: { $gte: 1 } },
      { $inc: { tokenBalance: -1 } },
      { new: true, projection: { tokenBalance: 1 }, session },
    )
    if (!user) return null

    const [created] = await TokenTransaction.create(
      [
        {
          user: userId,
          amount: 1,
          balanceAfter: Number(user.tokenBalance || 0),
          type: "prediction_unlock",
          description: "ปลดล็อกผลทำนาย",
          idempotencyKey,
          metadata: metadata || {},
        },
      ],
      { session },
    )
    return created
  })
  return assertSameOwner(result, userId)
}

// Unlock keys are per user. Before this was fixed the key had no user id, so the first buyer's
// transaction unlocked the fixture for everyone; keep honouring a buyer's own legacy-key unlock.
export function predictionUnlockKey(competition: "premier" | "worldcup", userId: string, fixtureId: string) {
  return `prediction-unlock:${competition}:${userId}:${fixtureId}`
}

export async function hasLegacyPredictionUnlock(competition: "premier" | "worldcup", userId: string, fixtureId: string) {
  const legacy = await TokenTransaction.exists({
    user: userId,
    type: "prediction_unlock",
    idempotencyKey: `prediction-unlock:${competition}:${fixtureId}`,
  })
  return Boolean(legacy)
}
