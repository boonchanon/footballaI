import mongoose from "mongoose"

declare global {
  var __mongoose_connection__: Promise<typeof mongoose> | undefined
}

export async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured")
  }

  if (!global.__mongoose_connection__) {
    mongoose.set("strictQuery", true)
    global.__mongoose_connection__ = mongoose.connect(mongoUri).catch((error) => {
      console.error("MongoDB connection failed", error)
      global.__mongoose_connection__ = undefined
      throw error
    })
  }

  return global.__mongoose_connection__
}
