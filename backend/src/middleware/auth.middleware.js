const { ApiError } = require("../utils/api-error")
const { verifyToken } = require("../utils/jwt")
const User = require("../models/user.model")

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null

  if (!token) {
    return next(new ApiError(401, "Authentication required"))
  }

  try {
    const payload = verifyToken(token)
    const user = await User.findById(payload.sub)
    if (!user) {
      return next(new ApiError(401, "Invalid token"))
    }

    req.user = user
    next()
  } catch (error) {
    next(new ApiError(401, "Invalid or expired token"))
  }
}

module.exports = { requireAuth }
