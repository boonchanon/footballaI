const compression = require("compression")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const express = require("express")
const helmet = require("helmet")
const morgan = require("morgan")

const { env } = require("./config/env")
const apiRoutes = require("./routes")
const { errorHandler } = require("./middleware/error-handler")
const { notFound } = require("./middleware/not-found")

const app = express()
app.set("trust proxy", 1)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.clientUrls.includes(origin)) {
        return callback(null, true)
      }
      return callback(new Error(`Origin ${origin} is not allowed by CORS`))
    },
    credentials: true,
  }),
)
app.use(helmet())
app.use(compression())
app.use(morgan(env.isProduction ? "combined" : "dev"))
app.use(express.json({ limit: "2mb" }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "API is healthy",
    data: {
      environment: env.nodeEnv,
      timestamp: new Date().toISOString(),
    },
  })
})

app.use("/api", apiRoutes)
app.use(notFound)
app.use(errorHandler)

module.exports = app
