const { validationResult } = require("express-validator")

const { ApiError } = require("./api-error")

function ensureValidRequest(req) {
  const result = validationResult(req)
  if (!result.isEmpty()) {
    throw new ApiError(422, "Validation failed", result.array())
  }
}

module.exports = { ensureValidRequest }
