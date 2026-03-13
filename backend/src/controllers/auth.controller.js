const { body } = require("express-validator")

const User = require("../models/user.model")
const { ApiError } = require("../utils/api-error")
const { asyncHandler } = require("../utils/async-handler")
const { signToken } = require("../utils/jwt")
const { ensureValidRequest } = require("../utils/validators")

const registerValidation = [
  body("name").trim().isLength({ min: 2, max: 80 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  body("avatar").optional().isString(),
  body("favoriteTeam").optional().isString(),
  body("bio").optional().isLength({ max: 280 }),
]

const loginValidation = [body("email").isEmail().normalizeEmail(), body("password").notEmpty()]

const updateProfileValidation = [
  body("name").optional().trim().notEmpty(),
  body("avatar").optional().isString(),
  body("favoriteTeam").optional().isString(),
  body("bio").optional().isLength({ max: 280 })
]

const changePasswordValidation = [body("currentPassword").notEmpty(), body("newPassword").isLength({ min: 6 })]

const register = asyncHandler(async (req, res) => {
  ensureValidRequest(req)

  const { name, email, password, avatar, favoriteTeam, bio } = req.body
  const existingUser = await User.findOne({ email })
  if (existingUser) {
    throw new ApiError(409, "Email already in use")
  }

  const user = await User.create({
    name: name.trim(),
    email,
    password,
    avatar: typeof avatar === "string" ? avatar.trim() : "",
    favoriteTeam: typeof favoriteTeam === "string" ? favoriteTeam.trim() : "",
    bio: typeof bio === "string" ? bio.trim() : "",
  })
  const token = signToken({ sub: user._id.toString(), role: user.role })

  res.status(201).json({
    token,
    user: sanitizeUser(user)
  })
})

const login = asyncHandler(async (req, res) => {
  ensureValidRequest(req)

  const { email, password } = req.body
  const user = await User.findOne({ email })
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password")
  }

  const token = signToken({ sub: user._id.toString(), role: user.role })
  res.json({ token, user: sanitizeUser(user) })
})

const me = asyncHandler(async (req, res) => {
  res.json({ user: sanitizeUser(req.user) })
})

const updateProfile = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const { name, avatar, favoriteTeam, bio } = req.body

  if (typeof name !== "undefined") req.user.name = name
  if (typeof avatar !== "undefined") req.user.avatar = avatar
  if (typeof favoriteTeam !== "undefined") req.user.favoriteTeam = favoriteTeam
  if (typeof bio !== "undefined") req.user.bio = bio

  await req.user.save()
  res.json({ user: sanitizeUser(req.user) })
})

const changePassword = asyncHandler(async (req, res) => {
  ensureValidRequest(req)
  const user = await User.findById(req.user._id)
  const { currentPassword, newPassword } = req.body

  if (!user || !(await user.comparePassword(currentPassword))) {
    throw new ApiError(401, "Current password is incorrect")
  }

  user.password = newPassword
  await user.save()

  res.json({ message: "Password updated successfully" })
})

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    favoriteTeam: user.favoriteTeam,
    bio: user.bio,
    role: user.role,
    createdAt: user.createdAt
  }
}

module.exports = {
  changePassword,
  changePasswordValidation,
  login,
  loginValidation,
  me,
  register,
  registerValidation,
  updateProfile,
  updateProfileValidation
}
