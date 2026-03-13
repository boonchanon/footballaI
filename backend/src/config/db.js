const mongoose = require("mongoose")

const { env } = require("./env")

async function connectDatabase() {
  if (!env.mongoUri) {
    throw new Error("MONGODB_URI is not configured")
  }

  mongoose.set("strictQuery", true)
  await mongoose.connect(env.mongoUri)
  console.log("MongoDB connected")
}

module.exports = connectDatabase
