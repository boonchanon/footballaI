const { register, login, updateProfile } = require("../services/auth.service")
const { sendSuccess } = require("../utils/response")

const registerRoute = async (req, res, next) => {
  try {
    const { user, token } = await register(req.body)
    return sendSuccess(res, { user, token }, "Registration successful", 201)
  } catch (error) {
    next(error)
  }
}

const loginRoute = async (req, res, next) => {
  try {
    const { user, token } = await login(req.body)
    return sendSuccess(res, { user, token }, "Login successful")
  } catch (error) {
    next(error)
  }
}

const getProfile = async (req, res, next) => {
  try {
    return sendSuccess(res, req.user, "Profile retrieved")
  } catch (error) {
    next(error)
  }
}

const updateProfileRoute = async (req, res, next) => {
  try {
    const user = await updateProfile({ userId: req.user.id, ...req.body })
    return sendSuccess(res, user, "Profile updated")
  } catch (error) {
    next(error)
  }
}

module.exports = {
  register: registerRoute,
  login: loginRoute,
  getProfile,
  updateProfile: updateProfileRoute,
}
