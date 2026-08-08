const bcrypt = require("bcryptjs")
const { signToken } = require("../utils/jwt")
const User = require("../models/user.model")
const { ApiError } = require("../utils/api-error")

const register = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email })
  if (existingUser) {
    throw new ApiError(409, "Email already in use")
  }

  const user = await User.create({
    name,
    email,
    password,
  })

  return {
    user: user.toObject(),
    token: signToken({ sub: user._id.toString() }),
  }
}

const login = async ({ email, password }) => {
  const user = await User.findOne({ email })
  if (!user) {
    throw new ApiError(401, "Invalid email or password")
  }

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) {
    throw new ApiError(401, "Invalid email or password")
  }

  return {
    user: user.toObject(),
    token: signToken({ sub: user._id.toString() }),
  }
}

const updateProfile = async ({ userId, name, avatar }) => {
  const data = {}
  if (typeof name !== "undefined") data.name = name
  if (typeof avatar !== "undefined") data.avatar = avatar

  const user = await User.findByIdAndUpdate(userId, data, { new: true })
  return user ? user.toObject() : null
}

module.exports = {
  register,
  login,
  updateProfile,
}
