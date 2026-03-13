try {
  require("dotenv").config()
} catch (error) {
  // Railway injects env vars directly in production, so dotenv is optional there.
}

const app = require("./app")
const connectDatabase = require("./config/db")
const { env } = require("./config/env")

async function start() {
  await connectDatabase()

  app.listen(env.port, () => {
    console.log(`API listening on port ${env.port}`)
  })
}

start().catch((error) => {
  console.error("Failed to start server", error)
  process.exit(1)
})
