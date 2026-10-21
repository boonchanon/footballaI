import assert from "node:assert/strict"
import path from "node:path"
import { after, before, describe, test } from "node:test"

import dotenv from "dotenv"
import mongoose from "mongoose"

import { PaymentOrder, TokenTransaction, User } from "../lib/server/models"
import { isRecipientVerified, isSameRecipientName, matchRecipientAccount } from "../lib/server/payment-recipient"
import { addTokens, consumeToken, hasLegacyPredictionUnlock, predictionUnlockKey } from "../lib/server/tokens"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

// Runs against a separate throwaway database on the same cluster (transactions need a replica set).
const TEST_DB = "footballai_payment_safety_test"
const mongoUri = process.env.MONGODB_URI

describe("recipient verification", () => {
  test("exact PromptPay match passes, including +66 form", () => {
    assert.equal(matchRecipientAccount("0812345678", "0066812345678"), "exact")
    assert.equal(isRecipientVerified({ configuredAccount: "0812345678", configuredName: "FootballAI", receivedAccount: "081-234-5678" }), true)
  })

  test("masked account needs a matching name", () => {
    const base = { configuredAccount: "0812345678", configuredName: "Boonchanon Shop" }
    assert.equal(matchRecipientAccount(base.configuredAccount, "xxx-xxx-5678"), "partial")
    assert.equal(isRecipientVerified({ ...base, receivedAccount: "xxx-xxx-5678" }), false)
    assert.equal(isRecipientVerified({ ...base, receivedAccount: "xxx-xxx-5678", receivedName: "BOONCHANON SHOP" }), true)
    assert.equal(isRecipientVerified({ ...base, receivedAccount: "xxx-xxx-5678", receivedName: "Someone Else" }), false)
  })

  test("missing recipient fields fail", () => {
    assert.equal(isRecipientVerified({ configuredAccount: "0812345678", configuredName: "FootballAI" }), false)
  })

  test("wrong account fails even when the name matches", () => {
    assert.equal(isRecipientVerified({ configuredAccount: "0812345678", configuredName: "FootballAI", receivedAccount: "0899999999", receivedName: "FootballAI" }), false)
  })

  test("very short name fragments do not match", () => {
    assert.equal(isSameRecipientName("Boonchanon Shop", "mr"), false)
    assert.equal(isSameRecipientName("Boonchanon Shop", "boonchanon"), true)
  })
})

describe("token ledger concurrency", { skip: !mongoUri && "MONGODB_URI is not configured" }, () => {
  before(async () => {
    await mongoose.connect(mongoUri as string, { dbName: TEST_DB })
    await mongoose.connection.db!.dropDatabase()
    await Promise.all([User.init(), TokenTransaction.init(), PaymentOrder.init()])
  })

  after(async () => {
    await mongoose.connection.db?.dropDatabase()
    await mongoose.disconnect()
  })

  async function createUser(label: string, tokenBalance: number) {
    return User.create({ name: label, email: `${label}-${Date.now()}@example.com`, password: "secret123", tokenBalance })
  }

  test("each user pays for their own unlock of the same fixture", async () => {
    const [a, b] = await Promise.all([createUser("a", 1), createUser("b", 1)])
    const fixtureId = "1790392"
    const txA = await consumeToken(a.id, predictionUnlockKey("premier", a.id, fixtureId), { fixtureId })
    const txB = await consumeToken(b.id, predictionUnlockKey("premier", b.id, fixtureId), { fixtureId })
    assert.ok(txA && txB)
    assert.notEqual(String((txA as any)._id), String((txB as any)._id))
    assert.equal((await User.findById(a.id))!.tokenBalance, 0)
    assert.equal((await User.findById(b.id))!.tokenBalance, 0)

    const c = await createUser("c", 0)
    assert.equal(await consumeToken(c.id, predictionUnlockKey("premier", c.id, fixtureId), { fixtureId }), null)
  })

  test("parallel unlocks with the same key charge one token", async () => {
    const user = await createUser("parallel-unlock", 3)
    const key = predictionUnlockKey("premier", user.id, "42")
    const results = await Promise.all(Array.from({ length: 10 }, () => consumeToken(user.id, key, { fixtureId: "42" })))
    assert.ok(results.every(Boolean))
    assert.equal((await User.findById(user.id))!.tokenBalance, 2)
    assert.equal(await TokenTransaction.countDocuments({ idempotencyKey: key }), 1)
  })

  test("parallel purchases with the same key credit once", async () => {
    const user = await createUser("parallel-purchase", 0)
    const key = "purchase:test-order"
    await Promise.all(
      Array.from({ length: 10 }, () => addTokens({ userId: user.id, amount: 5, type: "purchase", description: "test", idempotencyKey: key })),
    )
    assert.equal((await User.findById(user.id))!.tokenBalance, 5)
    assert.equal(await TokenTransaction.countDocuments({ idempotencyKey: key }), 1)
  })

  test("an idempotency key owned by another user is rejected", async () => {
    const [owner, other] = await Promise.all([createUser("owner", 0), createUser("other", 0)])
    await addTokens({ userId: owner.id, amount: 1, type: "admin_grant", description: "test", idempotencyKey: "admin-grant:shared" })
    await assert.rejects(addTokens({ userId: other.id, amount: 1, type: "admin_grant", description: "test", idempotencyKey: "admin-grant:shared" }))
    assert.equal((await User.findById(other.id))!.tokenBalance, 0)
  })

  test("legacy per-fixture unlocks are honoured only for their buyer", async () => {
    const [buyer, other] = await Promise.all([createUser("legacy-buyer", 0), createUser("legacy-other", 0)])
    await TokenTransaction.create({ user: buyer._id, amount: 1, balanceAfter: 0, type: "prediction_unlock", description: "legacy", idempotencyKey: "prediction-unlock:premier:777" })
    assert.equal(await hasLegacyPredictionUnlock("premier", buyer.id, "777"), true)
    assert.equal(await hasLegacyPredictionUnlock("premier", other.id, "777"), false)
  })

  test("one slip reference can mark only one order as paid", async () => {
    const user = await createUser("slip", 0)
    const orderFields = { user: user._id, productCode: "prediction_5_matches", productName: "5 matches", amount: 5, targetType: "credits" }
    const orders = await PaymentOrder.create([orderFields, orderFields])
    const claim = (orderId: unknown) =>
      PaymentOrder.findOneAndUpdate({ _id: orderId, status: { $ne: "paid" } }, { $set: { status: "paid", verificationRef: "SLIP-REF-1" } }, { new: true })
        .then(() => "paid")
        .catch((error) => (error?.code === 11000 ? "duplicate" : Promise.reject(error)))
    const outcomes = await Promise.all(orders.map((order: any) => claim(order._id)))
    assert.deepEqual([...outcomes].sort(), ["duplicate", "paid"])
    assert.equal(await PaymentOrder.countDocuments({ verificationRef: "SLIP-REF-1", status: "paid" }), 1)
  })
})
