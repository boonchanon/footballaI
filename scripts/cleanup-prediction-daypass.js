const mongoose = require("mongoose")
const path = require("path")

require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") })

const paymentEntitlementSchema = new mongoose.Schema(
  {
    productCode: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },
    active: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "paymententitlements" },
)

const PaymentEntitlement =
  mongoose.models.PaymentEntitlement || mongoose.model("PaymentEntitlement", paymentEntitlementSchema)

async function main() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured")
  }

  const apply = process.argv.includes("--apply")

  await mongoose.connect(mongoUri)

  const filter = {
    targetId: "prediction-access",
    targetType: "daypass",
    active: true,
  }

  const items = await PaymentEntitlement.find(filter)
    .select("_id productCode targetType targetId active expiresAt createdAt")
    .sort({ createdAt: -1 })
    .lean()

  console.log(`[cleanup-prediction-daypass] found ${items.length} active daypass entitlements`)

  if (items.length > 0) {
    console.table(
      items.map((item) => ({
        id: String(item._id),
        productCode: item.productCode,
        targetType: item.targetType,
        targetId: item.targetId,
        active: item.active,
        expiresAt: item.expiresAt ? new Date(item.expiresAt).toISOString() : null,
        createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : null,
      })),
    )
  }

  if (!apply) {
    console.log("[cleanup-prediction-daypass] dry run only. Re-run with --apply to deactivate these entitlements.")
    await mongoose.disconnect()
    return
  }

  const result = await PaymentEntitlement.updateMany(
    filter,
    {
      $set: {
        active: false,
        expiresAt: new Date(),
      },
    },
  )

  console.log(
    `[cleanup-prediction-daypass] deactivated ${result.modifiedCount || 0} entitlement(s)`,
  )

  await mongoose.disconnect()
}

main().catch((error) => {
  console.error("[cleanup-prediction-daypass] failed", error)
  process.exit(1)
})
