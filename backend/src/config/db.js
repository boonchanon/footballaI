const mongoose = require("mongoose")
const { env } = require("./env")

let connectionPromise = null

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  if (!env.mongoUri) {
    throw new Error("MONGODB_URI is not configured")
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    })
  }

  await connectionPromise
  console.log("MongoDB connected")
  return mongoose.connection
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
}

module.exports = { mongoose, connectDatabase, disconnectDatabase }
