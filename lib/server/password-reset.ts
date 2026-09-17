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

export async function sendTokenReceiptEmail({
  email,
  name,
  orderId,
  productName,
  tokenAmount,
  amount,
  currency,
  paidAt,
}: {
  email: string
  name: string
  orderId: string
  productName: string
  tokenAmount: number
  amount: number
  currency: string
  paidAt: Date
}) {
  const gmailUser = process.env.GMAIL_USER?.trim()
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.trim()
  const appName = process.env.APP_NAME || "FootballAI"
  if (!gmailUser || !gmailAppPassword) return false

  const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailAppPassword } })
  await transporter.sendMail({
    from: `${appName} <${gmailUser}>`,
    to: email,
    subject: `${appName} ใบเสร็จการซื้อ Token #${orderId.slice(-8)}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#202020">
        <h2>${appName}</h2>
        <p>เรียนคุณ ${name}</p>
        <p>ขอบคุณสำหรับการซื้อ Token รายการของคุณชำระเงินสำเร็จแล้ว</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <tr><td style="padding:8px;border-bottom:1px solid #ddd">เลขรายการ</td><td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">${orderId}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #ddd">สินค้า</td><td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">${productName}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #ddd">จำนวน Token</td><td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">${tokenAmount}</td></tr>
          <tr><td style="padding:8px">ยอดชำระ</td><td style="padding:8px;text-align:right"><strong>${amount.toFixed(2)} ${currency}</strong></td></tr>
        </table>
        <p>วันที่ชำระเงิน: ${paidAt.toLocaleString("th-TH")}</p>
      </div>
    `,
  })
  return true
}
