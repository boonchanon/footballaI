const User = require("../models/user.model")
const { ApiError } = require("../utils/api-error")
const { verifyToken } = require("../utils/jwt")

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null

  if (!token) {
    return next(new ApiError(401, "Authentication required"))
  }

  try {
    const payload = verifyToken(token)
    const user = await User.findById(payload.sub).select("-password")
    if (!user) {
      return next(new ApiError(401, "Invalid token"))
    }

    req.user = user
    next()
  } catch (error) {
    next(new ApiError(401, "Invalid or expired token"))
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return next(new ApiError(403, "Admin access required"))
  }
  next()
}

module.exports = { requireAuth, requireAdmin }
