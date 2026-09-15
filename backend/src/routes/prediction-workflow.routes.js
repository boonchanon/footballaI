const express = require("express")
const path = require("path")

const {
  EXPORT_DIR,
  deleteRawFile,
  exportFixturePredictions,
  getPipelineStatus,
  predictMatch,
  runFullPipeline,
  runUploadPipeline,
  runUploadPipelineBatch,
} = require("../services/prediction-pipeline.service")

const router = express.Router()

function createHttpError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function rawMultipart(req, res, next) {
  const contentType = req.headers["content-type"] || ""
  if (!contentType.includes("multipart/form-data")) {
    return next(createHttpError(415, "รองรับเฉพาะ multipart/form-data"))
  }

  const chunks = []
  req.on("data", (chunk) => chunks.push(chunk))
  req.on("end", () => {
    req.rawBody = Buffer.concat(chunks)
    next()
  })
  req.on("error", (error) => next(error))
}

function parseMultipartFormData(req) {
  const contentType = req.headers["content-type"] || ""
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)
  const boundary = boundaryMatch?.[1] || boundaryMatch?.[2]
  if (!boundary) {
    throw createHttpError(400, "ไม่พบ boundary ของ multipart request")
  }

  const body = req.rawBody || Buffer.alloc(0)
  const parts = body.toString("binary").split(`--${boundary}`)
  const files = []
  const fields = {}

  for (const part of parts) {
    if (!part || part === "--\r\n" || part === "--") continue
    const normalized = part.replace(/^\r\n/, "").replace(/\r\n$/, "")
    const separatorIndex = normalized.indexOf("\r\n\r\n")
    if (separatorIndex === -1) continue

    const rawHeaders = normalized.slice(0, separatorIndex)
    const rawContent = normalized.slice(separatorIndex + 4)
    const contentBuffer = Buffer.from(rawContent.replace(/\r\n$/, ""), "binary")
    const disposition = rawHeaders
      .split("\r\n")
      .find((line) => line.toLowerCase().startsWith("content-disposition"))

    if (!disposition) continue

    const nameMatch = disposition.match(/name="([^"]+)"/i)
    const filenameMatch = disposition.match(/filename="([^"]*)"/i)
    const fieldName = nameMatch?.[1]
    if (!fieldName) continue

    if (filenameMatch && filenameMatch[1]) {
      files.push({
        fieldName,
        originalName: path.basename(filenameMatch[1]),
        buffer: contentBuffer,
      })
    } else {
      fields[fieldName] = contentBuffer.toString("utf8").trim()
    }
  }

  return { fields, files }
}

router.get("/pipeline/status", async (req, res, next) => {
  try {
    const payload = await getPipelineStatus()
    res.json(payload)
  } catch (error) {
    next(error)
  }
})

router.post("/pipeline/upload", rawMultipart, async (req, res, next) => {
  try {
    const { files } = parseMultipartFormData(req)
    const uploadFiles = files.filter((item) => item.fieldName === "file")
    if (!uploadFiles.length) {
      throw createHttpError(422, "กรุณาแนบไฟล์ฤดูกาลล่าสุด")
    }

    const payload =
      uploadFiles.length === 1 ? await runUploadPipeline(uploadFiles[0]) : await runUploadPipelineBatch(uploadFiles)
    res.json(payload)
  } catch (error) {
    next(error)
  }
})

router.post("/pipeline/full", async (req, res, next) => {
  try {
    const payload = await runFullPipeline()
    res.json(payload)
  } catch (error) {
    next(error)
  }
})

router.delete("/pipeline/files/:filename", async (req, res, next) => {
  try {
    const payload = await deleteRawFile(req.params.filename)
    res.json(payload)
  } catch (error) {
    next(error)
  }
})

router.post("/predict-match", express.json({ limit: "1mb" }), async (req, res, next) => {
  try {
    const homeTeam = String(req.body?.home_team || "").trim()
    const awayTeam = String(req.body?.away_team || "").trim()

    if (!homeTeam || !awayTeam) {
      throw createHttpError(422, "กรุณาระบุทีมเหย้าและทีมเยือน")
    }

    const payload = await predictMatch({ homeTeam, awayTeam })
    res.json(payload)
  } catch (error) {
    next(error)
  }
})

router.post("/predictions/export-fixtures", rawMultipart, async (req, res, next) => {
  try {
    const { files, fields } = parseMultipartFormData(req)
    const file = files.find((item) => item.fieldName === "file")
    const season = String(fields.season || "").trim()

    if (!file) {
      throw createHttpError(422, "กรุณาแนบไฟล์ fixture CSV")
    }

    if (!season) {
      throw createHttpError(422, "กรุณาระบุฤดูกาลเป้าหมาย")
    }

    const payload = await exportFixturePredictions({
      season,
      originalName: file.originalName,
      buffer: file.buffer,
    })

    res.json(payload)
  } catch (error) {
    next(error)
  }
})

router.get("/predictions/download/:filename", async (req, res, next) => {
  try {
    const filename = path.basename(String(req.params.filename || ""))
    const filePath = path.join(EXPORT_DIR, filename)
    res.download(filePath)
  } catch (error) {
    next(error)
  }
})

module.exports = router
