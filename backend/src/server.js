try {
  require("dotenv").config()
} catch (error) {
  // Dotenv is optional in hosted environments.
}

const app = require("./app")
const { connectDatabase } = require("./config/db")
const { env } = require("./config/env")
const { startFootballDataCron } = require("./cron/football-data.cron")

async function start() {
  await connectDatabase()
  startFootballDataCron()

  app.listen(env.port, () => {
    console.log(`API listening on port ${env.port}`)
  })
}

start().catch((error) => {
  console.error("Failed to start server", error)
  process.exit(1)
})
