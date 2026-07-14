const User = require("../models/user.model")
const { ApiError } = require("../utils/api-error")
const { verifyToken } = require("../utils/jwt")

const ADMIN_ROLES = ["superadmin", "admin", "admincommunity"]
const FULL_ADMIN_ROLES = ["superadmin", "admin"]

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
  if (!req.user || !FULL_ADMIN_ROLES.includes(req.user.role)) {
    return next(new ApiError(403, "Admin access required"))
  }
  next()
}

function requireAnyAdmin(req, res, next) {
  if (!req.user || !ADMIN_ROLES.includes(req.user.role)) {
    return next(new ApiError(403, "Admin access required"))
  }
  next()
}

function requireCommunityAdmin(req, res, next) {
  if (!req.user || !["superadmin", "admincommunity"].includes(req.user.role)) {
    return next(new ApiError(403, "Community admin access required"))
  }
  next()
}

module.exports = { requireAuth, requireAdmin, requireAnyAdmin, requireCommunityAdmin }
