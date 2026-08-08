function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500
  const isValidationError = statusCode === 422 && Array.isArray(error.details)
  const isProduction = process.env.NODE_ENV === "production"

  res.status(statusCode).json(
    isValidationError
      ? {
          success: false,
          message: "รายละเอียดข้อผิดพลาด",
          errors: error.details,
        }
      : {
          success: false,
          message: error.message || "เกิดข้อผิดพลาดภายในระบบ",
          ...(isProduction ? {} : { details: error.details || null }),
        },
  )
}

module.exports = { errorHandler }
