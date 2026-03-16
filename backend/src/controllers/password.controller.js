const crypto = require("crypto")
const nodemailer = require("nodemailer")
const { body } = require("express-validator")

const User = require("../models/user.model")
const { asyncHandler } = require("../utils/async-handler")
const { ensureValidRequest } = require("../utils/validators")

const RESET_OTP_TTL_MS = 10 * 60 * 1000
const RESET_OTP_MAX_ATTEMPTS = 5
const RESET_SESSION_TTL_MS = 15 * 60 * 1000

function generateOtp() {
  return crypto.randomInt(0, 10 ** 6).toString().padStart(6, "0")
}

function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

function generateResetSessionToken() {
  return crypto.randomBytes(32).toString("hex")
}

async function sendPasswordResetOtpEmail(email, otp) {
  const gmailUser = process.env.GMAIL_USER?.trim()
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.trim()
  const appName = process.env.APP_NAME || "FootballAI"

  if (!gmailUser || !gmailAppPassword) {
    console.info(`[password-reset] OTP for ${email}: ${otp}`)
    return false
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  })

  await transporter.sendMail({
    from: `${appName} <${gmailUser}>`,
    to: email,
    subject: `${appName} OTP for password reset`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>${appName}</h2>
        <p>You requested a password reset for your account.</p>
        <p>Your OTP code is:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${otp}</p>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  })

  return true
}

const forgotPasswordValidation = [body("email").isEmail().normalizeEmail()]
const verifyResetOtpValidation = [body("email").isEmail().normalizeEmail(), body("otp").matches(/^\d{6}$/)]
const resetPasswordValidation = [body("resetToken").notEmpty(), body("password").isLength({ min: 6 })]

const forgotPassword = asyncHandler(async (req, res) => {
  ensureValidRequest(req)

  const { email } = req.body
  const user = await User.findOne({ email })
  let devOtp

  if (user) {
    const otp = generateOtp()

    user.resetPasswordOtpHash = hashValue(otp)
    user.resetPasswordOtpExpiresAt = new Date(Date.now() + RESET_OTP_TTL_MS)
    user.resetPasswordOtpAttempts = 0
    user.resetPasswordToken = ""
    user.resetPasswordExpiresAt = null
    await user.save()

    const sent = await sendPasswordResetOtpEmail(email, otp)

    if (!sent && process.env.NODE_ENV !== "production") {
      devOtp = otp
    }
  }

  res.json({
    message: "If the email exists, an OTP has been sent.",
    ...(devOtp ? { devOtp } : {}),
  })
})

const verifyResetOtp = asyncHandler(async (req, res) => {
  ensureValidRequest(req)

  const { email, otp } = req.body
  const user = await User.findOne({ email })

  if (!user || !user.resetPasswordOtpHash || !user.resetPasswordOtpExpiresAt) {
    return res.status(400).json({ error: "OTP is invalid or expired" })
  }

  if (user.resetPasswordOtpExpiresAt.getTime() <= Date.now()) {
    user.resetPasswordOtpHash = ""
    user.resetPasswordOtpExpiresAt = null
    user.resetPasswordOtpAttempts = 0
    await user.save()
    return res.status(400).json({ error: "OTP is invalid or expired" })
  }

  if ((user.resetPasswordOtpAttempts || 0) >= RESET_OTP_MAX_ATTEMPTS) {
    return res.status(429).json({ error: "Too many invalid OTP attempts" })
  }

  if (user.resetPasswordOtpHash !== hashValue(otp)) {
    user.resetPasswordOtpAttempts = (user.resetPasswordOtpAttempts || 0) + 1
    await user.save()
    return res.status(400).json({ error: "OTP is invalid or expired" })
  }

  const resetToken = generateResetSessionToken()

  user.resetPasswordOtpHash = ""
  user.resetPasswordOtpExpiresAt = null
  user.resetPasswordOtpAttempts = 0
  user.resetPasswordToken = hashValue(resetToken)
  user.resetPasswordExpiresAt = new Date(Date.now() + RESET_SESSION_TTL_MS)
  await user.save()

  res.json({
    message: "OTP verified successfully.",
    resetToken,
  })
})

const resetPassword = asyncHandler(async (req, res) => {
  ensureValidRequest(req)

  const { resetToken, password } = req.body
  const user = await User.findOne({
    resetPasswordToken: hashValue(resetToken),
    resetPasswordExpiresAt: { $gt: new Date() },
  })

  if (!user) {
    return res.status(400).json({ error: "Reset token is invalid or expired" })
  }

  user.password = password
  user.resetPasswordOtpHash = ""
  user.resetPasswordOtpExpiresAt = null
  user.resetPasswordOtpAttempts = 0
  user.resetPasswordToken = ""
  user.resetPasswordExpiresAt = null
  await user.save()

  res.json({ message: "Password reset successfully" })
})

module.exports = {
  forgotPassword,
  forgotPasswordValidation,
  resetPassword,
  resetPasswordValidation,
  verifyResetOtp,
  verifyResetOtpValidation,
}
