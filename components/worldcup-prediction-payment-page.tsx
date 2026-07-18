"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, ArrowLeft, CheckCircle2, Copy, Loader2, QrCode, ShieldCheck, Sparkles, UploadCloud } from "lucide-react"

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

type WorldcupPredictionPaymentPageProps = {
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
      title: "ยืนยันบัญชีผู้รับยังไม่สำเร็จ",
      description: "ระบบยังยืนยันบัญชีผู้รับจากสลิปนี้ไม่ได้ กรุณาใช้สลิปที่เห็นข้อมูลชัดเจน ไม่เบลอ และไม่ถูกครอปรายละเอียดสำคัญออก",
    }
  }

  if (normalized.includes("recipient_mismatch")) {
    return {
      title: "บัญชีปลายทางไม่ตรง",
      description: "สลิปนี้โอนไปยังบัญชีที่ไม่ตรงกับพร้อมเพย์ของระบบ กรุณาตรวจสอบผู้รับเงินแล้วลองใหม่อีกครั้ง",
    }
  }

  if (normalized.includes("amount_mismatch")) {
    return {
      title: "ยอดเงินไม่ตรงกับแพ็กเกจ",
      description: "ยอดเงินในสลิปไม่ตรงกับแพ็กเกจที่เลือก กรุณาตรวจสอบจำนวนเงินแล้วส่งสลิปใหม่อีกครั้ง",
    }
  }

  if (normalized.includes("missing_reference")) {
    return {
      title: "สลิปนี้ยังตรวจสอบไม่ได้",
      description: "ระบบไม่พบเลขอ้างอิงรายการโอนจากสลิปนี้ กรุณาใช้สลิปต้นฉบับจากแอปธนาคารที่แสดงข้อมูลครบถ้วน",
    }
  }

  if (normalized.includes("duplicate_slip")) {
    return {
      title: "สลิปนี้ถูกใช้ไปแล้ว",
      description: "ระบบพบว่าสลิปนี้เคยถูกใช้ตรวจสอบมาก่อน กรุณาใช้สลิปจากรายการโอนใหม่เท่านั้น",
    }
  }

  if (normalized.includes("invalid_image")) {
    return {
      title: "รูปสลิปไม่ถูกต้อง",
      description: "กรุณาอัปโหลดไฟล์ภาพสลิปที่เปิดอ่านได้ชัดเจน เช่น PNG, JPG หรือ WEBP",
    }
  }

  if (normalized.includes("slip_time_too_old")) {
    return {
      title: "เวลาสลิปไม่ตรงกับคำสั่งซื้อ",
      description: "สลิปนี้เก่ากว่าคำสั่งซื้อที่กำลังตรวจสอบมากเกินไป กรุณาใช้สลิปของรายการที่เพิ่งชำระจริง",
    }
  }

  if (normalized.includes("invalid_transfer_time")) {
    return {
      title: "เวลาการโอนไม่สมเหตุสมผล",
      description: "ระบบพบเวลาโอนในสลิปไม่ถูกต้อง กรุณาตรวจสอบสลิปต้นฉบับแล้วลองใหม่อีกครั้ง",
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
      description: "ขณะนี้ระบบติดต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง",
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
    description: normalized || "เกิดปัญหาระหว่างตรวจสอบสลิป กรุณาลองใหม่อีกครั้ง",
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

export function WorldcupPredictionPaymentPage({
  round = "รอบ 4 ทีม",
  fixtureId = "",
  home = "France",
  away = "Spain",
}: WorldcupPredictionPaymentPageProps) {
  const publicPromptPayId = process.env.NEXT_PUBLIC_PROMPTPAY_ID?.trim() || ""
  const publicPromptPayName = process.env.NEXT_PUBLIC_PROMPTPAY_NAME?.trim() || "FootballAI"
  const router = useRouter()
  const authToken = getAuthToken()

  const [paymentState, setPaymentState] = useState<PaymentStateResponse | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [selectedPackageCode, setSelectedPackageCode] = useState<PredictionAccessProductCode>("prediction_5_matches")
  const [currentOrder, setCurrentOrder] = useState<AccessOrder | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreviewUrl, setSlipPreviewUrl] = useState<string>("")
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const selectedPackage =
    PREDICTION_ACCESS_PRODUCTS.find((item) => item.code === selectedPackageCode) ?? PREDICTION_ACCESS_PRODUCTS[0]
  const promptpayId = paymentState?.promptpay?.id || publicPromptPayId
  const promptpayName = paymentState?.promptpay?.accountName || publicPromptPayName

  const targetLabel = useMemo(() => {
    if (selectedPackage.targetType === "credits") {
      return selectedPackage.credits ? `ปลดล็อกได้ ${selectedPackage.credits} คู่` : "แพ็กเกจเครดิต"
    }
    return "ปลดล็อกครบทุกคู่ของทัวร์นาเมนต์"
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

    const nextPreviewUrl = URL.createObjectURL(slipFile)
    setSlipPreviewUrl(nextPreviewUrl)
    return () => URL.revokeObjectURL(nextPreviewUrl)
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
      setPaymentError("กรุณาเข้าสู่ระบบก่อนซื้อสิทธิ์")
      return
    }

    const product = PREDICTION_ACCESS_PRODUCTS.find((item) => item.code === productCode)
    if (!product) return

    setSubmitting(true)
    setSelectedPackageCode(productCode)
    setPaymentError(null)
    setSuccessMessage(null)

    try {
      const data = await fetchJson<{ order: AccessOrder }>("/payments/create-order", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ productCode, targetId: "worldcup-2026" }),
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

      const message = response.message || "ชำระเงินสำเร็จ และระบบปลดล็อกสิทธิ์ให้แล้ว"
      setSuccessMessage(message)
      setSlipFile(null)
      toast({
        className:
          "border-primary/25 bg-[linear-gradient(180deg,rgba(184,255,0,0.18),rgba(10,14,12,0.96))] text-white shadow-[0_24px_80px_rgba(184,255,0,0.16)]",
        title: (
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-black">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <span className="text-base font-semibold">ชำระเงินสำเร็จ</span>
          </div>
        ),
        description: (
          <div className="space-y-2 pl-[52px] text-sm text-white/75">
            <p>{message}</p>
            <p className="text-primary">แพ็กเกจ {selectedPackage.name} พร้อมใช้งานแล้ว</p>
          </div>
        ),
      })
      await loadPaymentState()
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "ตรวจสอบสลิปไม่สำเร็จ"
      const friendly = getPaymentErrorMeta(rawMessage)
      setPaymentError(friendly.description)
      toast({
        variant: "destructive",
        className:
          "border-rose-500/30 bg-[linear-gradient(180deg,rgba(120,16,28,0.95),rgba(28,10,14,0.98))] text-white shadow-[0_24px_80px_rgba(244,63,94,0.22)]",
        title: (
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/18 text-rose-200 ring-1 ring-rose-300/20">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="text-base font-semibold">{friendly.title}</span>
          </div>
        ),
        description: <div className="pl-[52px] text-sm leading-6 text-rose-50/90">{friendly.description}</div>,
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCopyPromptPayId() {
    if (!promptpayId) return
    try {
      await navigator.clipboard.writeText(promptpayId)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setPaymentError("คัดลอกหมายเลขพร้อมเพย์ไม่สำเร็จ กรุณาคัดลอกด้วยตนเอง")
    }
  }

  return (
    <section className="container mx-auto px-4 py-8 md:py-10">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push("/worldcup-2026/predictions")} className="rounded-full">
          <ArrowLeft className="mr-2 h-4 w-4" />
          กลับไปหน้าทำนาย
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Card className="overflow-hidden border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(184,255,0,0.12),transparent_28%),linear-gradient(180deg,#101416_0%,#0b0d0f_100%)] text-white">
            <CardContent className="p-8 md:p-10">
              <div className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                ชำระเงินและตรวจสลิปอัตโนมัติ
              </div>
              <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">ปลดล็อกผลทำนายแบบพรีเมียม</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 md:text-base">
                เลือกแพ็กเกจที่ต้องการ ชำระผ่านพร้อมเพย์ แล้วอัปโหลดสลิปเพื่อให้ระบบตรวจสอบและปลดล็อกสิทธิ์ให้อัตโนมัติ
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">คู่ที่กำลังดู</p>
                  <p className="mt-2 text-lg font-semibold">{home}</p>
                  <p className="text-sm text-white/60">vs {away}</p>
                </div>
                <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">รอบการแข่งขัน</p>
                  <p className="mt-2 text-lg font-semibold">{round}</p>
                </div>
                <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">สิทธิ์ที่เลือก</p>
                  <p className="mt-2 text-lg font-semibold">{targetLabel}</p>
                  <p className="text-sm text-white/60">ราคา 5 บาทต่อแพ็กเกจ</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {!authToken ? (
            <Alert>
              <AlertTitle>ต้องเข้าสู่ระบบก่อน</AlertTitle>
              <AlertDescription>ล็อกอินก่อนจึงจะสร้างคำสั่งซื้อและอัปโหลดสลิปเพื่อปลดล็อกสิทธิ์ได้</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            {PREDICTION_ACCESS_PRODUCTS.map((product) => {
              const active = selectedPackageCode === product.code

              return (
                <button
                  key={product.code}
                  type="button"
                  onClick={() => void handleCreateOrder(product.code)}
                  disabled={!authToken || submitting}
                  className={cn(
                    "relative overflow-hidden rounded-[28px] border p-5 text-left transition",
                    active
                      ? "border-primary bg-[linear-gradient(180deg,rgba(184,255,0,0.14),rgba(184,255,0,0.05))] shadow-[0_0_0_1px_rgba(184,255,0,0.2),0_30px_60px_rgba(184,255,0,0.08)]"
                      : "border-border/60 bg-card/80 hover:border-primary/30 hover:bg-card",
                    (!authToken || submitting) && "cursor-not-allowed opacity-70",
                  )}
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{product.name}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{product.description}</p>
                    </div>
                    <p className="text-3xl font-display text-primary">{product.price}฿</p>
                  </div>
                </button>
              )
            })}
          </div>

          {(paymentError || paymentLoading) && (
            <Card className="overflow-hidden border-rose-500/25 bg-[linear-gradient(180deg,rgba(120,16,28,0.16),rgba(26,10,14,0.96))] text-white shadow-[0_24px_60px_rgba(244,63,94,0.08)]">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-200 ring-1 ring-rose-300/15">
                    {paymentLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <AlertTriangle className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold">{paymentLoading ? "กำลังโหลดข้อมูลการชำระเงิน" : "ยังดำเนินการต่อไม่ได้"}</p>
                    <p className="mt-1 text-sm leading-6 text-white/75">
                      {paymentLoading ? "รอสักครู่ ระบบกำลังดึงข้อมูลออเดอร์และสิทธิ์การใช้งานล่าสุดให้คุณ" : paymentError}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {successMessage ? (
            <Card className="overflow-hidden border-emerald-500/25 bg-[linear-gradient(180deg,rgba(16,90,54,0.14),rgba(8,20,14,0.96))] text-white shadow-[0_24px_60px_rgba(16,185,129,0.08)]">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/18 text-emerald-200 ring-1 ring-emerald-300/15">
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
                    <p className="text-xs uppercase tracking-[0.22em] text-primary">ขั้นตอนส่งสลิป</p>
                    <p className="mt-2 text-2xl font-semibold">อัปโหลดสลิปเพื่อให้ระบบตรวจสอบอัตโนมัติ</p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      หลังจากสแกนจ่ายแล้ว ให้อัปโหลดรูปสลิปของรายการนี้ ระบบจะส่งไปตรวจสอบและปลดล็อกสิทธิ์ให้ทันทีเมื่อผ่านเงื่อนไข
                    </p>
                  </div>
                  <Badge className="bg-primary text-primary-foreground">ออเดอร์ {currentOrder.amount} บาท</Badge>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_280px]">
                  <label className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-primary/30 bg-primary/5 px-6 py-8 text-center transition hover:border-primary hover:bg-primary/10">
                    {slipPreviewUrl ? (
                      <img
                        src={slipPreviewUrl}
                        alt="ตัวอย่างสลิป"
                        className="mb-4 h-36 w-full max-w-[280px] rounded-[18px] object-cover shadow-[0_16px_40px_rgba(0,0,0,0.24)]"
                      />
                    ) : (
                      <UploadCloud className="mb-3 h-8 w-8 text-primary" />
                    )}
                    <span className="text-base font-medium">{slipFile ? slipFile.name : "กดเพื่อเลือกรูปสลิป หรือวางไฟล์ลงตรงนี้"}</span>
                    <span className="mt-2 text-sm text-muted-foreground">รองรับไฟล์ PNG, JPG, JPEG และ WEBP</span>
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={(event) => setSlipFile(event.target.files?.[0] || null)}
                    />
                  </label>

                  <div className="flex flex-col gap-4 rounded-[24px] border border-border/60 bg-background/60 p-5">
                    <div>
                      <p className="text-sm text-muted-foreground">แพ็กเกจที่เลือก</p>
                      <p className="mt-1 text-lg font-semibold">{selectedPackage.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{targetLabel}</p>
                    </div>
                    <div className="rounded-[18px] border border-primary/15 bg-primary/8 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-primary">ตัวอย่างก่อนส่ง</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {slipFile ? "ตรวจชื่อไฟล์และภาพสลิปให้เรียบร้อยก่อนกดส่งตรวจสอบ" : "เมื่อเลือกรูปแล้ว ระบบจะแสดงตัวอย่างสลิปตรงนี้ทันที"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => void handleVerifySlip()}
                      disabled={submitting || !slipFile}
                      className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                      อัปโหลดและตรวจสอบสลิป
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden border-primary/15 bg-[radial-gradient(circle_at_top,rgba(184,255,0,0.16),rgba(11,13,15,1)_58%)] text-white shadow-[0_30px_90px_rgba(184,255,0,0.08)]">
            <CardContent className="p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <QrCode className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">พร้อมเพย์</p>
                  <h2 className="mt-1 text-2xl font-semibold">สแกนจ่ายก่อน แล้วค่อยอัปสลิป</h2>
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
                    <img
                      src={qrImageUrl}
                      alt="คิวอาร์พร้อมเพย์"
                      className="h-[340px] w-[340px] rounded-[28px] border border-white/10 bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,0.3)]"
                    />
                  ) : (
                    <div className="flex h-[340px] w-[340px] items-center justify-center rounded-[28px] border border-dashed border-white/12 px-6 text-center text-sm text-white/55">
                      {promptpayId ? "เลือกแพ็กเกจก่อน แล้วคิวอาร์สำหรับชำระเงินจะขึ้นตรงนี้" : "ระบบยังไม่สามารถสร้างคิวอาร์ได้ เพราะยังไม่มีหมายเลขพร้อมเพย์"}
                    </div>
                  )}
                </div>
              </div>

              <p className="mt-5 text-center text-sm leading-7 text-white/65">
                ชำระ {currentOrder?.amount ?? selectedPackage.price} บาท แล้วใช้สลิปของรายการนั้นอัปโหลดเพื่อตรวจสอบได้ทันที
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/90">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <p className="font-semibold">เงื่อนไขแพ็กเกจ</p>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
                <p>1. แพ็ก 5 คู่ ใช้ปลดล็อกผลทำนายได้ 5 แมตช์</p>
                <p>2. แพ็ก 15 คู่ ใช้ปลดล็อกผลทำนายได้ 15 แมตช์</p>
                <p>3. แพ็กทั้งทัวร์ ใช้ดูผลทำนายได้ครบทุกคู่ในรายการเดียว</p>
                <p>4. ระบบจะตรวจทั้งยอดเงิน ความถูกต้องของผู้รับ และข้อมูลอ้างอิงจากสลิปก่อนปลดล็อก</p>
              </div>
              <div className="mt-6 flex gap-3">
                <Link
                  href="/worldcup-2026/predictions"
                  className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                >
                  กลับไปหน้าทำนาย
                </Link>
                <div className="inline-flex items-center rounded-full border border-primary/15 bg-primary/8 px-4 py-2 text-sm text-primary">
                  <Sparkles className="mr-2 h-4 w-4" />
                  ระบบปลดล็อกแบบอัตโนมัติ
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
