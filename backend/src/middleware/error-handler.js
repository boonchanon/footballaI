function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500
  res.status(statusCode).json({
    error: error.message || "Internal server error",
    details: error.details || null,
  })
}

module.exports = { errorHandler }
