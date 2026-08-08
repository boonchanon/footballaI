const { sendSuccess } = require("../utils/response")

const getProfile = async (req, res) => {
  return sendSuccess(res, req.user, "Profile retrieved")
}

const updateProfile = async (req, res, next) => {
  try {
    const user = await require("../services/auth.service").updateProfile({ userId: req.user.id, ...req.body })
    return sendSuccess(res, user, "Profile updated")
  } catch (error) {
    next(error)
  }
}

module.exports = { getProfile, updateProfile }
