const { body } = require("express-validator")

const User = require("../models/user.model")
const { deleteUserAccount } = require("../services/user-account.service")
const { ApiError } = require("../utils/api-error")
const { asyncHandler } = require("../utils/async-handler")
const { signToken } = require("../utils/jwt")
const { ensureValidRequest } = require("../utils/validators")

const registerValidation = [
  body("name").trim().isLength({ min: 2, max: 80 }),
  body("email").isEmail().normalizeEmail(),
  body("phone").optional().matches(/^(\+?\d{9,15})$/),
  body("password").isLength({ min: 6 }),
  body("avatar").optional().isString(),
  body("favoriteTeam").optional().isString(),
  body("bio").optional().isLength({ max: 280 }),
]

const loginValidation = [body("identifier").notEmpty(), body("password").notEmpty()]

const updateProfileValidation = [
  body("name").optional().trim().isLength({ min: 2, max: 80 }),
  body("avatar").optional().isString(),
  body("favoriteTeam").optional().isString(),
  body("bio").optional().isLength({ max: 280 }),
]

const changePasswordValidation = [body("currentPassword").notEmpty(), body("newPassword").isLength({ min: 6 })]
const deleteAccountValidation = [body("currentPassword").optional().isString()]

const register = asyncHandler(async (req, res) => {
  ensureValidRequest(req)

  const { name, email, phone, password, avatar, favoriteTeam, bio } = req.body
  const existingUser = await User.findOne({ email })
  if (existingUser) {
    throw new ApiError(409, "Email already in use")
  }

  if (phone) {
    const existingPhone = await User.findOne({ phone })
    if (existingPhone) {
      throw new ApiError(409, "Phone already in use")
    }
  }

  const user = await User.create({
    name: name.trim(),
    email,
    ...(typeof phone === "string" && phone.trim() ? { phone: phone.trim() } : {}),
    password,
    avatar: typeof avatar === "string" ? avatar.trim() : "",
    favoriteTeam: typeof favoriteTeam === "string" ? favoriteTeam.trim() : "",
    bio: typeof bio === "string" ? bio.trim() : "",
  })
  const token = signToken({ sub: user._id.toString(), role: user.role })

  res.status(201).json({
    token,
    user: sanitizeUser(user),
  })
})

const login = asyncHandler(async (req, res) => {
  ensureValidRequest(req)

  const { identifier, password } = req.body
  const normalizedIdentifier = String(identifier || "").trim()
  const normalizedPhone = normalizedIdentifier.replace(/[^\d+]/g, "")
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdentifier)
  const user = await User.findOne(isEmail ? { email: normalizedIdentifier.toLowerCase() } : { phone: normalizedPhone })
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email/phone or password")
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

  if (typeof name !== "undefined") req.user.name = name.trim()
  if (typeof avatar !== "undefined") req.user.avatar = avatar.trim()
  if (typeof favoriteTeam !== "undefined") req.user.favoriteTeam = favoriteTeam.trim()
  if (typeof bio !== "undefined") req.user.bio = bio.trim()

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

const deleteAccount = asyncHandler(async (req, res) => {
  ensureValidRequest(req)

  const user = await User.findById(req.user._id)
  if (!user) {
    throw new ApiError(404, "User not found")
  }

  const currentPassword = typeof req.body.currentPassword === "string" ? req.body.currentPassword : ""
  const hasSocialLogin = Boolean(user.googleId || user.facebookId)

  if (!hasSocialLogin) {
    if (!currentPassword) {
      throw new ApiError(422, "Current password is required")
    }

    if (!(await user.comparePassword(currentPassword))) {
      throw new ApiError(401, "Current password is incorrect")
    }
  }

  await deleteUserAccount(user._id.toString())
  res.json({ message: "Account deleted successfully" })
})

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    favoriteTeam: user.favoriteTeam,
    bio: user.bio,
    role: user.role,
    createdAt: user.createdAt,
  }
}

module.exports = {
  changePassword,
  changePasswordValidation,
  deleteAccount,
  deleteAccountValidation,
  login,
  loginValidation,
  me,
  register,
  registerValidation,
  updateProfile,
  updateProfileValidation,
}
