"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, Copy, Loader2, QrCode, ShieldCheck, Sparkles, UploadCloud, Wallet } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { fetchJson } from "@/lib/api-client"
import { getAuthToken } from "@/lib/auth-client"
import { PREDICTION_ACCESS_PRODUCTS, type PredictionAccessProductCode, type PredictionAccessTargetType } from "@/lib/prediction-access"
import { cn } from "@/lib/utils"

type AccessOrder = {
  id: string
  productCode: PredictionAccessProductCode
  productName: string
  amount: number
  currency: string
  status: string
  targetType: PredictionAccessTargetType
  targetId: string
  createdAt: string
  paidAt?: string | null
  slipImageUrl?: string
}

type AccessEntitlement = {
  id: string
  productCode: PredictionAccessProductCode
  targetType: PredictionAccessTargetType
  targetId: string
  active: boolean
  amount: number
  expiresAt?: string | null
  metadata?: {
    creditsLimit?: number | null
    remainingCredits?: number | null
    unlockedFixtureIds?: string[]
  }
}

type PaymentStateResponse = {
  promptpay: {
    id: string
    accountName: string
  }
  orders: AccessOrder[]
  entitlements: AccessEntitlement[]
}

type VerifyResponse = {
  message?: string
}

type PredictionPaymentPageProps = {
  round?: string
  fixtureId?: string
  home?: string
  away?: string
}

function getPaymentErrorMeta(message: string) {
  const normalized = message.trim()

  if (!normalized) {
    return {
      title: "เกิดข้อผิดพลาด",
      description: "ระบบยังดำเนินการต่อไม่ได้ในตอนนี้ กรุณาลองใหม่อีกครั้ง",
    }
  }

  if (normalized.includes("unable_to_verify_recipient")) {
    return {
      title: "ยังยืนยันผู้รับเงินไม่ได้",
      description: "ระบบยังอ่านข้อมูลผู้รับจากสลิปนี้ไม่ครบ กรุณาใช้สลิปที่เห็นข้อมูลชัดเจนและไม่ถูกครอป",
    }
  }

  if (normalized.includes("recipient_mismatch")) {
    return {
      title: "บัญชีปลายทางไม่ตรง",
      description: "สลิปนี้โอนไปยังบัญชีที่ไม่ตรงกับบัญชีรับเงินของระบบ กรุณาตรวจสอบปลายทางแล้วลองใหม่",
    }
  }

  if (normalized.includes("amount_mismatch")) {
    return {
      title: "ยอดเงินไม่ตรงกับแพ็กเกจ",
      description: "ยอดเงินในสลิปไม่ตรงกับราคาแพ็กเกจที่เลือก กรุณาตรวจสอบยอดแล้วส่งสลิปใหม่",
    }
  }

  if (normalized.includes("missing_reference")) {
    return {
      title: "ระบบอ่านเลขอ้างอิงสลิปไม่สำเร็จ",
      description: "กรุณาใช้สลิปต้นฉบับจากแอปธนาคารที่แสดงรายละเอียดครบถ้วน",
    }
  }

  if (normalized.includes("duplicate_slip")) {
    return {
      title: "สลิปนี้ถูกใช้ไปแล้ว",
      description: "ระบบพบว่าสลิปนี้เคยถูกใช้ยืนยันการชำระมาก่อน กรุณาใช้สลิปของรายการโอนใหม่เท่านั้น",
    }
  }

  if (normalized.includes("invalid_image")) {
    return {
      title: "ไฟล์สลิปไม่ถูกต้อง",
      description: "กรุณาอัปโหลดไฟล์ PNG, JPG, JPEG หรือ WEBP ที่อ่านได้ชัดเจน",
    }
  }

  if (normalized.includes("slip_time_too_old")) {
    return {
      title: "เวลาสลิปไม่ตรงกับคำสั่งซื้อ",
      description: "สลิปนี้เก่ากว่าคำสั่งซื้อเกินไป กรุณาใช้สลิปของการโอนล่าสุด",
    }
  }

  if (normalized.includes("invalid_transfer_time")) {
    return {
      title: "เวลาโอนในสลิปผิดปกติ",
      description: "ระบบพบเวลาโอนที่ไม่สมเหตุสมผล กรุณาตรวจสอบสลิปต้นฉบับแล้วลองใหม่",
    }
  }

  if (normalized.includes("promptpay_not_configured")) {
    return {
      title: "ระบบรับชำระยังไม่พร้อม",
      description: "ฝั่งเซิร์ฟเวอร์ยังไม่ได้ตั้งค่าพร้อมเพย์สำหรับตรวจสลิป กรุณาติดต่อผู้ดูแลระบบ",
    }
  }

  if (normalized.includes("Authentication required")) {
    return {
      title: "กรุณาเข้าสู่ระบบก่อน",
      description: "คุณต้องล็อกอินก่อนจึงจะสร้างคำสั่งซื้อและอัปโหลดสลิปได้",
    }
  }

  if (normalized.includes("Failed to fetch") || normalized.includes("NetworkError")) {
    return {
      title: "เชื่อมต่อระบบชำระเงินไม่สำเร็จ",
      description: "ขณะนี้ระบบติดต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตและลองใหม่อีกครั้ง",
    }
  }

  if (normalized.includes("404")) {
    return {
      title: "ไม่พบข้อมูลที่ต้องการ",
      description: "ระบบไม่พบคำสั่งซื้อหรือข้อมูลการชำระเงินที่เกี่ยวข้อง กรุณาลองใหม่อีกครั้ง",
    }
  }

  if (normalized.includes("500")) {
    return {
      title: "ระบบขัดข้องชั่วคราว",
      description: "ฝั่งเซิร์ฟเวอร์มีปัญหาชั่วคราว กรุณารอสักครู่แล้วลองใหม่อีกครั้ง",
    }
  }

  return {
    title: "ตรวจสอบสลิปไม่สำเร็จ",
    description: normalized,
  }
}

function formatPromptPayTarget(value: string) {
  const digits = value.replace(/\D/g, "")
  if (digits.length === 10 && digits.startsWith("0")) return `0066${digits.slice(1)}`
  return value.trim()
}

function crc16Ccitt(input: string) {
  let crc = 0xffff
  for (let index = 0; index < input.length; index += 1) {
    crc ^= input.charCodeAt(index) << 8
    for (let step = 0; step < 8; step += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0")
}

function buildPromptPayPayload(id: string, amount: number) {
  const target = formatPromptPayTarget(id)
  if (!target) return ""

  const buildField = (tag: string, value: string) => `${tag}${value.length.toString().padStart(2, "0")}${value}`
  const merchantAccount = `${buildField("00", "A000000677010111")}${buildField("01", target)}`
  const base =
    buildField("00", "01") +
    buildField("01", "12") +
    buildField("29", merchantAccount) +
    buildField("58", "TH") +
    buildField("53", "764") +
    buildField("54", amount.toFixed(2)) +
    "6304"

  return `${base}${crc16Ccitt(base)}`
}

function formatDateTime(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  })
}

function getOrderStatusLabel(status: string) {
  if (status === "paid") return "ชำระแล้ว"
  if (status === "pending") return "รอตรวจสลิป"
  if (status === "reviewing") return "กำลังตรวจสอบ"
  if (status === "expired") return "หมดอายุ"
  if (status === "failed") return "ไม่สำเร็จ"
  if (status === "cancelled") return "ยกเลิก"
  return status
}

export function PredictionPaymentPage({
  round,
  fixtureId,
  home,
  away,
}: PredictionPaymentPageProps) {
  const authToken = getAuthToken()
  const publicPromptPayId = process.env.NEXT_PUBLIC_PROMPTPAY_ID?.trim() || ""
  const publicPromptPayName = process.env.NEXT_PUBLIC_PROMPTPAY_NAME?.trim() || "FootballAI"

  const [paymentState, setPaymentState] = useState<PaymentStateResponse | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [selectedPackageCode, setSelectedPackageCode] = useState<PredictionAccessProductCode>("prediction_15_matches")
  const [currentOrder, setCurrentOrder] = useState<AccessOrder | null>(null)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreviewUrl, setSlipPreviewUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const selectedPackage =
    PREDICTION_ACCESS_PRODUCTS.find((item) => item.code === selectedPackageCode) ?? PREDICTION_ACCESS_PRODUCTS[0]
  const promptpayId = paymentState?.promptpay?.id || publicPromptPayId
  const promptpayName = paymentState?.promptpay?.accountName || publicPromptPayName

  const activeEntitlements = paymentState?.entitlements ?? []
  const activeOrders = paymentState?.orders ?? []
  const totalCredits = activeEntitlements.reduce((sum, item) => {
    if (!item.active || item.targetType !== "credits") return sum
    return sum + (typeof item.metadata?.creditsLimit === "number" ? item.metadata.creditsLimit : 0)
  }, 0)
  const remainingCredits = activeEntitlements.reduce((sum, item) => {
    if (!item.active || item.targetType !== "credits") return sum
    return sum + (typeof item.metadata?.remainingCredits === "number" ? item.metadata.remainingCredits : 0)
  }, 0)
  const hasTournamentPass = activeEntitlements.some((item) => item.active && item.targetType === "daypass")

  const contextLabel = useMemo(() => {
    if (home && away) return `${home} vs ${away}`
    if (round) return round
    if (fixtureId) return `แมตช์ #${fixtureId}`
    return "ปลดล็อกผลทำนายและเหรียญของระบบ"
  }, [fixtureId, home, away, round])

  const targetLabel = useMemo(() => {
    if (selectedPackage.targetType === "credits") {
      return selectedPackage.credits ? `รับเหรียญ ${selectedPackage.credits} เหรียญ` : "แพ็กเหรียญ"
    }
    return "ปลดล็อกดูผลทำนายครบทั้งรายการ"
  }, [selectedPackage])

  const qrPayload = currentOrder ? buildPromptPayPayload(promptpayId, currentOrder.amount) : ""
  const qrImageUrl = qrPayload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(qrPayload)}`
    : ""

  useEffect(() => {
    void loadPaymentState()
  }, [authToken])

  useEffect(() => {
    if (!slipFile) {
      setSlipPreviewUrl("")
      return
    }

    const previewUrl = URL.createObjectURL(slipFile)
    setSlipPreviewUrl(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [slipFile])

  async function loadPaymentState() {
    if (!authToken) {
      setPaymentState(null)
      setCurrentOrder(null)
      return
    }

    setPaymentLoading(true)
    setPaymentError(null)
    try {
      const data = await fetchJson<PaymentStateResponse>("/payments/me", {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      setPaymentState(data)
      setCurrentOrder(data.orders.find((item) => item.status === "pending") ?? null)
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "โหลดข้อมูลการชำระเงินไม่สำเร็จ"
      setPaymentError(getPaymentErrorMeta(rawMessage).description)
    } finally {
      setPaymentLoading(false)
    }
  }

  async function handleCreateOrder(productCode: PredictionAccessProductCode) {
    if (!authToken) {
      setPaymentError("กรุณาเข้าสู่ระบบก่อนซื้อเหรียญ")
      return
    }

    setSubmitting(true)
    setSelectedPackageCode(productCode)
    setPaymentError(null)
    setSuccessMessage(null)

    try {
      const data = await fetchJson<{ order: AccessOrder }>("/payments/create-order", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ productCode, targetId: "prediction-access" }),
      })

      setCurrentOrder(data.order)
      setSlipFile(null)
      await loadPaymentState()
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "สร้างคำสั่งซื้อไม่สำเร็จ"
      setPaymentError(getPaymentErrorMeta(rawMessage).description)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerifySlip() {
    if (!authToken || !currentOrder) {
      setPaymentError("ไม่พบคำสั่งซื้อที่รอชำระ")
      return
    }

    if (!slipFile) {
      setPaymentError("กรุณาเลือกรูปสลิปก่อนส่งตรวจสอบ")
      return
    }

    setSubmitting(true)
    setPaymentError(null)
    setSuccessMessage(null)

    try {
      const formData = new FormData()
      formData.append("orderId", currentOrder.id)
      formData.append("slip", slipFile)

      const response = await fetchJson<VerifyResponse>("/payments/verify-slip", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData,
      })

      setSuccessMessage(response.message || "ระบบตรวจสลิปผ่านแล้ว และปลดล็อกสิทธิ์ให้เรียบร้อย")
      setSlipFile(null)
      await loadPaymentState()
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "ตรวจสลิปไม่สำเร็จ"
      setPaymentError(getPaymentErrorMeta(rawMessage).description)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCopyPromptPayId() {
    if (!promptpayId) return
    try {
      await navigator.clipboard.writeText(promptpayId)
      setCopied(true)
      toast({
        title: "คัดลอกพร้อมเพย์แล้ว",
        description: "สามารถนำหมายเลขไปชำระในแอปธนาคารได้ทันที",
      })
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast({
        title: "คัดลอกไม่สำเร็จ",
        description: "กรุณาคัดลอกหมายเลขพร้อมเพย์ด้วยตนเอง",
        variant: "destructive",
      })
    }
  }

  return (
    <section className="container mx-auto px-4 py-10">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_420px]">
        <div className="space-y-6">
          <Card className="overflow-hidden border-primary/15 bg-[radial-gradient(circle_at_top_left,rgba(184,255,0,0.14),transparent_36%),linear-gradient(180deg,#0b1418_0%,#081015_100%)] text-white shadow-[0_30px_90px_rgba(184,255,0,0.08)]">
            <CardContent className="p-8">
              <Badge className="border border-primary/30 bg-primary/10 text-primary">Payment Center</Badge>
              <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <h1 className="text-4xl font-semibold tracking-tight">ซื้อเหรียญเพื่อปลดล็อกผลทำนาย</h1>
                  <p className="mt-3 text-base leading-7 text-white/72">
                    แยกออกจากหน้าบอลโลกแล้ว ใช้เป็นหน้าซื้อเหรียญกลางของระบบสำหรับปลดล็อกผลทำนาย ชำระผ่านพร้อมเพย์
                    แล้วอัปโหลดสลิปให้ระบบตรวจสอบอัตโนมัติ
                  </p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-4 text-right">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">บริบทล่าสุด</p>
                  <p className="mt-2 text-lg font-semibold">{contextLabel}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">เหรียญคงเหลือ</p>
                  <p className="mt-2 text-3xl font-semibold text-primary">{remainingCredits}</p>
                  <p className="mt-2 text-sm text-white/65">จากเหรียญทั้งหมด {totalCredits} เหรียญ</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">แพ็กปลดล็อกทั้งรายการ</p>
                  <p className="mt-2 text-3xl font-semibold">{hasTournamentPass ? "พร้อม" : "ยังไม่มี"}</p>
                  <p className="mt-2 text-sm text-white/65">ใช้ดูผลทำนายครบทุกคู่แบบไม่ต้องใช้เหรียญ</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">ออเดอร์ล่าสุด</p>
                  <p className="mt-2 text-3xl font-semibold">{activeOrders.length}</p>
                  <p className="mt-2 text-sm text-white/65">ระบบเก็บประวัติคำสั่งซื้อย้อนหลัง 10 รายการ</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {!authToken ? (
            <Alert>
              <AlertTitle>ต้องเข้าสู่ระบบก่อน</AlertTitle>
              <AlertDescription>ล็อกอินก่อนจึงจะสร้างคำสั่งซื้อ อัปโหลดสลิป และรับเหรียญได้</AlertDescription>
            </Alert>
          ) : null}

          <Card className="border-border/60 bg-card/90">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-lg font-semibold">เลือกแพ็กเกจซื้อเหรียญ</p>
                  <p className="text-sm text-muted-foreground">เลือกจำนวนเหรียญที่ต้องการ สร้างออเดอร์ แล้วค่อยชำระเงิน</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {PREDICTION_ACCESS_PRODUCTS.map((product) => {
                  const isActive = selectedPackageCode === product.code
                  return (
                    <button
                      key={product.code}
                      type="button"
                      onClick={() => void handleCreateOrder(product.code)}
                      disabled={!authToken || submitting}
                      className={cn(
                        "rounded-[28px] border p-5 text-left transition",
                        isActive
                          ? "border-primary bg-[linear-gradient(180deg,rgba(184,255,0,0.16),rgba(184,255,0,0.05))] shadow-[0_0_0_1px_rgba(184,255,0,0.2)]"
                          : "border-border/60 bg-background/60 hover:border-primary/30 hover:bg-background",
                        (!authToken || submitting) && "cursor-not-allowed opacity-70",
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-semibold">{product.name}</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">{product.description}</p>
                        </div>
                        <p className="text-3xl font-semibold text-primary">{product.price}฿</p>
                      </div>
                      <div className="mt-5 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{product.targetType === "credits" ? `${product.credits ?? 0} เหรียญ` : "แพ็กดูครบทุกคู่"}</span>
                        {isActive ? <Badge className="bg-primary text-primary-foreground">เลือกอยู่</Badge> : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {(paymentError || paymentLoading) && (
            <Card className="overflow-hidden border-rose-500/25 bg-[linear-gradient(180deg,rgba(120,16,28,0.16),rgba(26,10,14,0.96))] text-white">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-200">
                    {paymentLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <AlertTriangle className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold">{paymentLoading ? "กำลังโหลดข้อมูลการชำระเงิน" : "ยังดำเนินการต่อไม่ได้"}</p>
                    <p className="mt-1 text-sm leading-6 text-white/75">
                      {paymentLoading ? "รอสักครู่ ระบบกำลังดึงข้อมูลออเดอร์และสิทธิ์ล่าสุด" : paymentError}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {successMessage ? (
            <Card className="overflow-hidden border-emerald-500/25 bg-[linear-gradient(180deg,rgba(16,90,54,0.14),rgba(8,20,14,0.96))] text-white">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/18 text-emerald-200">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold">ปลดล็อกสำเร็จแล้ว</p>
                    <p className="mt-1 text-sm leading-6 text-white/75">{successMessage}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {currentOrder ? (
            <Card className="border-border/60 bg-card/90">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-primary">ออเดอร์ที่กำลังรอชำระ</p>
                    <p className="mt-2 text-2xl font-semibold">{currentOrder.productName}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{targetLabel}</p>
                  </div>
                  <Badge className="bg-primary text-primary-foreground">ยอดชำระ {currentOrder.amount} บาท</Badge>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_300px]">
                  <label className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-primary/30 bg-primary/5 px-6 py-8 text-center transition hover:border-primary hover:bg-primary/10">
                    {slipPreviewUrl ? (
                      <img src={slipPreviewUrl} alt="ตัวอย่างสลิป" className="mb-4 h-36 w-full max-w-[280px] rounded-[18px] object-cover" />
                    ) : (
                      <UploadCloud className="mb-3 h-8 w-8 text-primary" />
                    )}
                    <span className="text-base font-medium">{slipFile ? slipFile.name : "กดเพื่อเลือกรูปสลิป หรือวางไฟล์ลงตรงนี้"}</span>
                    <span className="mt-2 text-sm text-muted-foreground">รองรับ PNG, JPG, JPEG และ WEBP</span>
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={(event) => setSlipFile(event.target.files?.[0] || null)}
                    />
                  </label>

                  <div className="flex flex-col gap-4 rounded-[24px] border border-border/60 bg-background/60 p-5">
                    <div>
                      <p className="text-sm text-muted-foreground">ขั้นตอน</p>
                      <p className="mt-1 text-lg font-semibold">ชำระเงินก่อน แล้วอัปสลิปให้ระบบตรวจสอบ</p>
                    </div>
                    <div className="rounded-[18px] border border-primary/15 bg-primary/8 p-4 text-sm text-muted-foreground">
                      ระบบจะตรวจยอดเงิน ผู้รับ เลขอ้างอิง และเวลาทำรายการก่อนเติมเหรียญให้อัตโนมัติ
                    </div>
                    <Button
                      type="button"
                      onClick={() => void handleVerifySlip()}
                      disabled={submitting || !slipFile}
                      className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                      อัปโหลดและตรวจสลิป
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden border-primary/15 bg-[radial-gradient(circle_at_top,rgba(184,255,0,0.16),rgba(11,13,15,1)_58%)] text-white">
            <CardContent className="p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <QrCode className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">พร้อมเพย์</p>
                  <h2 className="mt-1 text-2xl font-semibold">สแกนจ่าย แล้วค่อยส่งสลิป</h2>
                </div>
              </div>

              <div className="mt-6 rounded-[24px] border border-white/8 bg-black/20 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-white/60">บัญชีรับเงิน</p>
                    <p className="mt-1 text-xl font-semibold">{promptpayName}</p>
                    <p className="mt-1 text-base text-primary">{promptpayId || "ยังไม่พบหมายเลขพร้อมเพย์จากระบบ"}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleCopyPromptPayId()}
                    className="rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {copied ? "คัดลอกแล้ว" : "คัดลอก"}
                  </Button>
                </div>

                <div className="mt-6 flex justify-center">
                  {currentOrder && qrImageUrl ? (
                    <img src={qrImageUrl} alt="คิวอาร์พร้อมเพย์" className="h-[320px] w-[320px] rounded-[28px] border border-white/10 bg-white p-4" />
                  ) : (
                    <div className="flex h-[320px] w-[320px] items-center justify-center rounded-[28px] border border-dashed border-white/12 px-6 text-center text-sm text-white/55">
                      {promptpayId ? "เลือกแพ็กเกจก่อน แล้วคิวอาร์สำหรับชำระเงินจะขึ้นตรงนี้" : "ระบบยังไม่สามารถสร้างคิวอาร์ได้ เพราะยังไม่มีหมายเลขพร้อมเพย์"}
                    </div>
                  )}
                </div>
              </div>

              <p className="mt-5 text-center text-sm leading-7 text-white/65">
                ชำระ {currentOrder?.amount ?? selectedPackage.price} บาท แล้วใช้สลิปของรายการนั้นอัปโหลดเพื่อให้ระบบตรวจสอบทันที
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/90">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <p className="font-semibold">สรุปสิทธิ์และการใช้งาน</p>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
                <p>1. แพ็กเหรียญใช้ปลดล็อกผลทำนายเป็นรายคู่ตามจำนวนเหรียญที่ซื้อ</p>
                <p>2. แพ็กปลดล็อกทั้งรายการเหมาะกับการดูผลทำนายครบทุกคู่แบบไม่ต้องใช้เหรียญทีละแมตช์</p>
                <p>3. ระบบจะตรวจยอดเงิน ผู้รับ และข้อมูลอ้างอิงจากสลิปก่อนอนุมัติสิทธิ์</p>
                <p>4. ถ้าสลิปไม่ผ่าน ระบบจะแจ้งเหตุผลกลับมาเพื่อให้แก้ไขและอัปโหลดใหม่ได้</p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/worldcup-2026/predictions"
                  className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                >
                  กลับไปหน้าทำนายบอลโลก
                </Link>
                <div className="inline-flex items-center rounded-full border border-primary/15 bg-primary/8 px-4 py-2 text-sm text-primary">
                  <Sparkles className="mr-2 h-4 w-4" />
                  ระบบปลดล็อกอัตโนมัติหลังตรวจสลิปผ่าน
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/90">
            <CardContent className="p-6">
              <p className="text-lg font-semibold">ประวัติคำสั่งซื้อล่าสุด</p>
              <div className="mt-4 space-y-3">
                {activeOrders.length > 0 ? (
                  activeOrders.slice(0, 5).map((order) => (
                    <div key={order.id} className="rounded-[20px] border border-border/60 bg-background/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{order.productName}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                        </div>
                        <Badge variant="outline">{getOrderStatusLabel(order.status)}</Badge>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                        <span>{order.amount} บาท</span>
                        <span>{order.targetType === "credits" ? "เหรียญ" : "ปลดล็อกทั้งรายการ"}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[20px] border border-dashed border-border/60 bg-background/40 p-5 text-sm text-muted-foreground">
                    ยังไม่มีประวัติคำสั่งซื้อ
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
