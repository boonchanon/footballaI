import crypto from "crypto"
import nodemailer from "nodemailer"

export const RESET_OTP_LENGTH = 6
export const RESET_OTP_TTL_MS = 10 * 60 * 1000
export const RESET_OTP_MAX_ATTEMPTS = 5
export const RESET_SESSION_TTL_MS = 15 * 60 * 1000

export function isGmailConfigured() {
  return Boolean(process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.trim())
}

export function generateOtp() {
  return crypto.randomInt(0, 10 ** RESET_OTP_LENGTH).toString().padStart(RESET_OTP_LENGTH, "0")
}

export function hashValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

export function generateResetSessionToken() {
  return crypto.randomBytes(32).toString("hex")
}

export async function sendPasswordResetOtpEmail(email: string, otp: string) {
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
