const bcrypt = require("bcryptjs")
const mongoose = require("mongoose")
const path = require("path")

require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") })

const adminRoleEnum = ["superadmin", "admin", "admincommunity"]

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: adminRoleEnum, default: "admin" },
    permissions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "admins" },
)

const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema)

async function upsertAdmin(email, password, role) {
  if (!email || !password) return

  const hashedPassword = await bcrypt.hash(password, 10)
  await Admin.updateOne(
    { email: email.toLowerCase().trim() },
    {
      $set: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role,
        isActive: true,
      },
      $setOnInsert: {
        permissions: [],
      },
    },
    { upsert: true },
  )
}

async function main() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured")
  }

  const seedTargets = [
    { email: process.env.SUPERADMIN_EMAIL, password: process.env.SUPERADMIN_PASSWORD, role: "superadmin" },
    { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, role: "admin" },
    { email: process.env.ADMIN_COMMUNITY_EMAIL, password: process.env.ADMIN_COMMUNITY_PASSWORD, role: "admincommunity" },
  ]

  const availableTargets = seedTargets.filter((target) => target.email && target.password)
  if (availableTargets.length === 0) {
    throw new Error("No admin credentials found in .env.local. Fill SUPERADMIN_EMAIL/PASSWORD or ADMIN_EMAIL/PASSWORD or ADMIN_COMMUNITY_EMAIL/PASSWORD first.")
  }

  await mongoose.connect(mongoUri)

  for (const target of availableTargets) {
    await upsertAdmin(target.email, target.password, target.role)
  }

  console.log("Admin accounts seeded successfully")
  await mongoose.disconnect()
}

main().catch((error) => {
  console.error("Failed to seed admin accounts", error)
  process.exit(1)
})
