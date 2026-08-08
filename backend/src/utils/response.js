function sendSuccess(res, data = {}, message = "Success", status = 200) {
  return res.status(status).json({ success: true, message, data })
}

function sendError(res, error) {
  const message = error.message || "Error"
  const status = error.statusCode || 500
  return res.status(status).json({ success: false, message })
}

function sendValidationError(res, errors, message = "รายละเอียดข้อผิดพลาด") {
  return res.status(422).json({
    success: false,
    message,
    errors,
  })
}

module.exports = { sendSuccess, sendError, sendValidationError }
