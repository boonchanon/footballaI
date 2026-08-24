"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Coins,
  Copy,
  Crown,
  Gift,
  Loader2,
  Lock,
  QrCode,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Wallet,
  Zap,
} from "lucide-react"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { fetchJson } from "@/lib/api-client"
import { getAuthToken } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

type CoinPackCode = "starter" | "value" | "season"
type ProductCode = "prediction_5_matches" | "prediction_15_matches" | "prediction_tournament"

type CoinPack = {
  code: CoinPackCode
  productCode: ProductCode
  coins: number
  price: number
  label: string
  description: string
  featured?: boolean
  bonus?: string
}

type AccessOrder = {
  id: string
  productCode: ProductCode
  productName: string
  amount: number
  currency: string
  status: string
  targetType: string
  targetId: string
  createdAt: string
  paidAt?: string | null
  slipImageUrl?: string
}

type AccessEntitlement = {
  id: string
  productCode: ProductCode
  targetType: string
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

type SubscriptionPageProps = {
  selectedPackCode?: string
}

const coinPacks: CoinPack[] = [
  {
    code: "starter",
    productCode: "prediction_5_matches",
    coins: 5,
    price: 5,
    label: "แพ็กเริ่มต้น",
    description: "เหมาะสำหรับคนที่อยากลองเปิดดูผลทำนายเฉพาะคู่ที่สนใจ",
  },
  {
    code: "value",
    productCode: "prediction_15_matches",
    coins: 15,
    price: 5,
    label: "แพ็กคุ้มค่า",
    description: "เหมาะกับคนที่ตามหลายคู่ต่อสัปดาห์และอยากใช้เหรียญได้ต่อเนื่อง",
    featured: true,
    bonus: "คุ้มสุด",
  },
  {
    code: "season",
    productCode: "prediction_tournament",
    coins: 40,
    price: 5,
    label: "แพ็กดูยาว",
    description: "ปลดล็อกได้ทั้งรายการ เหมาะกับคนที่อยากดูผลทำนายครบทุกคู่",
    bonus: "ปลดล็อกทั้งรายการ",
  },
]

const includedFeatures = [
  {
    title: "ปลดล็อกผลทำนายรายคู่",
    description: "ใช้เหรียญเปิดดูผล AI Prediction เฉพาะแมตช์ที่คุณสนใจ",
  },
  {
    title: "ดูสกอร์ที่คาดและความมั่นใจ",
    description: "เห็นผลหลัก พร้อมโอกาสชนะ เสมอ และแพ้ของแต่ละคู่",
  },
  {
    title: "ดูมุมมองโมเดลประกอบ",
    description: "เห็นค่าประกอบจากหลายโมเดลในคู่ที่ปลดล็อกแล้ว",
  },
  {
    title: "ซื้อเท่าที่ใช้",
    description: "ไม่ต้องสมัครสมาชิกแบบรายเดือน เลือกใช้เฉพาะเวลาที่ต้องการ",
  },
]

const faqs = [
  {
    question: "1 เหรียญใช้ทำอะไรได้บ้าง",
    answer: "ใช้ปลดล็อกผลทำนายของ 1 คู่ เพื่อดูผลคาดการณ์ สกอร์เด่น และข้อมูลประกอบของคู่นั้น",
  },
  {
    question: "ซื้อแล้วใช้งานได้เมื่อไร",
    answer: "เมื่อชำระเงินและตรวจสอบสลิปสำเร็จ เหรียญจะถูกเพิ่มในระบบแล้วใช้ต่อได้ทันที",
  },
  {
    question: "จำเป็นต้องซื้อรายเดือนหรือไม่",
    answer: "ไม่จำเป็น ระบบนี้เป็นแบบซื้อเหรียญตามการใช้งานจริง เหมาะกับคนที่อยากดูเฉพาะบางคู่",
  },
  {
    question: "ถ้าดูหลายคู่ควรเลือกแพ็กไหน",
    answer: "ถ้าดูไม่กี่คู่เลือกแพ็กเริ่มต้น แต่ถ้าตามหลายคู่ต่อเนื่อง แนะนำแพ็กคุ้มค่าหรือแพ็กปลดล็อกทั้งรายการ",
  },
]

function getPaymentErrorMeta(message: string) {
  const normalized = message.trim()

  if (!normalized) {
    return { title: "เกิดข้อผิดพลาด", description: "ระบบยังดำเนินการต่อไม่ได้ในตอนนี้ กรุณาลองใหม่อีกครั้ง" }
  }
  if (normalized.includes("unable_to_verify_recipient")) {
    return { title: "ยังยืนยันผู้รับเงินไม่ได้", description: "กรุณาใช้สลิปที่ชัดเจนและเห็นข้อมูลผู้รับครบถ้วน" }
  }
  if (normalized.includes("recipient_mismatch")) {
    return { title: "บัญชีปลายทางไม่ตรง", description: "สลิปนี้โอนไปยังบัญชีที่ไม่ตรงกับพร้อมเพย์ของระบบ" }
  }
  if (normalized.includes("amount_mismatch")) {
    return { title: "ยอดเงินไม่ตรง", description: "ยอดในสลิปไม่ตรงกับราคาแพ็กที่เลือก กรุณาตรวจสอบแล้วลองใหม่" }
  }
  if (normalized.includes("missing_reference")) {
    return { title: "สลิปนี้ยังตรวจสอบไม่ได้", description: "ระบบไม่พบเลขอ้างอิงรายการโอน กรุณาใช้สลิปต้นฉบับ" }
  }
  if (normalized.includes("duplicate_slip")) {
    return { title: "สลิปนี้ถูกใช้ไปแล้ว", description: "กรุณาใช้สลิปจากรายการโอนใหม่เท่านั้น" }
  }
  if (normalized.includes("invalid_image")) {
    return { title: "รูปสลิปไม่ถูกต้อง", description: "กรุณาอัปโหลดไฟล์ PNG, JPG, JPEG หรือ WEBP ที่อ่านได้ชัดเจน" }
  }
  if (normalized.includes("promptpay_not_configured")) {
    return { title: "ระบบรับชำระยังไม่พร้อม", description: "ฝั่งเซิร์ฟเวอร์ยังไม่ได้ตั้งค่าพร้อมเพย์" }
  }
  if (normalized.includes("Authentication required")) {
    return { title: "กรุณาเข้าสู่ระบบก่อน", description: "คุณต้องล็อกอินก่อนจึงจะสร้างคำสั่งซื้อและอัปโหลดสลิปได้" }
  }
  if (normalized.includes("Failed to fetch") || normalized.includes("NetworkError")) {
    return { title: "เชื่อมต่อระบบชำระเงินไม่สำเร็จ", description: "ขณะนี้ระบบติดต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้ง" }
  }
  return { title: "ตรวจสอบสลิปไม่สำเร็จ", description: normalized }
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

function getPackDisplayLabel(pack: CoinPack) {
  if (pack.code === "season") return "แพ็ก 40 เหรียญ"
  return pack.label
}

function getPackDisplayDescription(pack: CoinPack) {
  if (pack.code === "season") {
    return "เหมาะกับคนที่อยากเติมเหรียญก้อนไว้ใช้ต่อเนื่อง ปลดล็อกได้หลายคู่ตลอดฤดูกาล"
  }
  return pack.description
}

function getPackDisplayBonus(pack: CoinPack) {
  if (pack.code === "season") return "เหรียญคุ้มสุด"
  return pack.bonus
}

function CoinPreview() {
  const examples = [
    { match: "Liverpool vs Arsenal", cost: 1, status: "ปลดล็อกแล้ว", score: "2-1" },
    { match: "Chelsea vs Spurs", cost: 1, status: "พร้อมปลดล็อก", score: "1-1" },
    { match: "Newcastle vs Man City", cost: 1, status: "พร้อมปลดล็อก", score: "0-2" },
    { match: "Villa vs Brighton", cost: 1, status: "พร้อมปลดล็อก", score: "2-2" },
  ]

  return (
    <div className="relative overflow-hidden rounded-[30px] border border-border bg-card/95 p-5 shadow-[0_28px_86px_rgba(0,0,0,0.16)] backdrop-blur md:p-6">
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/18 blur-3xl" />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-scoreboard text-xs font-bold uppercase text-primary">Coin Preview</p>
            <p className="mt-1 text-sm text-muted-foreground">ตัวอย่างการใช้เหรียญเพื่อเปิดดูผลทำนาย</p>
          </div>
          <Badge className="border border-primary/30 bg-primary/12 text-primary hover:bg-primary/12">1 คู่ = 1 เหรียญ</Badge>
        </div>

        <div className="space-y-3">
          {examples.map((item, index) => (
            <article key={item.match} className={cn("rounded-[20px] border border-border bg-background/60 p-4", index === 0 && "border-primary/35 bg-primary/[0.06]")}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{item.match}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.status}</p>
                </div>
                <div className="text-right">
                  <p className="font-scoreboard text-2xl text-foreground">{item.score}</p>
                  <p className="text-xs text-primary">ใช้ {item.cost} เหรียญ</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-4 rounded-[20px] border border-border bg-muted/55 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Lock className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">ใช้เหรียญเฉพาะคู่ที่อยากดู</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">ไม่ต้องจ่ายรายเดือน ถ้าอยากดูเฉพาะบางคู่ก็ซื้อเท่าที่ใช้</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CoinPackCard({ pack, selected }: { pack: CoinPack; selected: boolean }) {
  return (
    <article
      className={cn(
        "relative flex min-h-[390px] flex-col rounded-[26px] border bg-card p-5 shadow-[0_16px_48px_rgba(0,0,0,0.07)] transition lg:p-6",
        selected
          ? "border-primary bg-[radial-gradient(circle_at_top,rgba(184,255,0,0.16),transparent_42%),var(--color-card)] shadow-[0_24px_60px_rgba(184,255,0,0.10)]"
          : pack.featured
            ? "border-primary/45 bg-[radial-gradient(circle_at_top,rgba(184,255,0,0.12),transparent_42%),var(--color-card)]"
            : "border-border",
      )}
    >
      {selected ? (
        <div className="absolute right-5 top-5 rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">กำลังเลือก</div>
      ) : pack.featured ? (
        <div className="absolute right-5 top-5 rounded-full bg-primary/15 px-3 py-1 text-xs font-black text-primary">แนะนำ</div>
      ) : null}

      <div>
        <p className="font-scoreboard text-xs font-bold uppercase text-primary">Coin Pack</p>
        <h3 className="font-stadium mt-3 text-xl leading-tight text-foreground">{getPackDisplayLabel(pack)}</h3>
        <p className="mt-3 min-h-[48px] text-sm leading-6 text-muted-foreground">{getPackDisplayDescription(pack)}</p>
      </div>

      <div className="mt-6">
        <div className="flex items-end gap-2">
          <span className="font-scoreboard text-5xl leading-none text-foreground">{pack.coins}</span>
          <span className="pb-2 text-sm text-muted-foreground">เหรียญ</span>
        </div>
        <p className="mt-2 text-sm font-semibold text-primary">ราคา ฿{pack.price}</p>
      </div>

      <div className="mt-6 rounded-[20px] border border-border bg-background/60 p-4">
        <p className="text-sm font-semibold text-foreground">เหมาะกับใคร</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{getPackDisplayDescription(pack)}</p>
        {getPackDisplayBonus(pack) ? <p className="mt-3 text-xs font-semibold text-primary">{getPackDisplayBonus(pack)}</p> : null}
      </div>

      <div className="mt-auto pt-6">
        <Button asChild className={cn("h-12 w-full rounded-full font-black", selected ? "bg-primary text-primary-foreground hover:bg-primary/90" : "")} variant={selected ? "default" : "secondary"}>
          <Link href={`/payment?pack=${pack.code}#checkout`}>
            ชำระแพ็กนี้
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">กดแล้วจะเปิดบล็อกชำระเงินของแพ็กนี้ทันที</p>
      </div>
    </article>
  )
}

function CheckoutBlock({
  pack,
  authToken,
  paymentState,
  paymentLoading,
  paymentError,
  currentOrder,
  slipFile,
  slipPreviewUrl,
  submitting,
  successMessage,
  copied,
  onVerifySlip,
  onSlipChange,
  onCopyPromptPay,
}: {
  pack: CoinPack
  authToken: string | null
  paymentState: PaymentStateResponse | null
  paymentLoading: boolean
  paymentError: string | null
  currentOrder: AccessOrder | null
  slipFile: File | null
  slipPreviewUrl: string
  submitting: boolean
  successMessage: string | null
  copied: boolean
  onVerifySlip: () => Promise<void>
  onSlipChange: (file: File | null) => void
  onCopyPromptPay: () => Promise<void>
}) {
  const promptpayId = paymentState?.promptpay?.id || process.env.NEXT_PUBLIC_PROMPTPAY_ID?.trim() || ""
  const promptpayName = paymentState?.promptpay?.accountName || process.env.NEXT_PUBLIC_PROMPTPAY_NAME?.trim() || "FootballAI"
  const qrPayload = currentOrder ? buildPromptPayPayload(promptpayId, currentOrder.amount) : ""
  const qrImageUrl = qrPayload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(qrPayload)}`
    : ""

  const activeCredits = (paymentState?.entitlements || [])
    .filter((item) => item.active && item.targetType === "credits")
    .reduce((sum, item) => sum + (typeof item.metadata?.remainingCredits === "number" ? item.metadata.remainingCredits : 0), 0)

  return (
    <section id="checkout" className="container mx-auto px-4 py-12 md:py-16">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="font-scoreboard text-xs font-black uppercase text-primary">Checkout</p>
          <h2 className="font-stadium mt-2 text-3xl leading-tight text-foreground md:text-4xl">ชำระเงินสำหรับ {getPackDisplayLabel(pack)}</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">เลือกแพ็กแล้ว ระบบจะสร้างออเดอร์ ยอด และ QR ให้ตรงกับแพ็กนี้โดยตรง</p>
        </div>
        <Badge className="border border-primary/30 bg-primary/12 px-3 py-1.5 text-primary hover:bg-primary/12">
          {pack.coins} เหรียญ • ฿{pack.price}
        </Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Coins className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">แพ็กที่เลือก</p>
                <h3 className="text-xl font-bold text-foreground">{getPackDisplayLabel(pack)}</h3>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[20px] border border-border bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">จำนวนเหรียญ</p>
                <p className="mt-2 text-3xl font-black text-foreground">{pack.coins}</p>
              </div>
              <div className="rounded-[20px] border border-border bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">ยอดชำระ</p>
                <p className="mt-2 text-3xl font-black text-primary">฿{pack.price}</p>
              </div>
              <div className="rounded-[20px] border border-border bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">เหรียญคงเหลือ</p>
                <p className="mt-2 text-3xl font-black text-foreground">{authToken ? activeCredits : "-"}</p>
              </div>
            </div>

            {!authToken ? (
              <Alert className="mt-6 border-primary/20 bg-primary/[0.05]">
                <AlertTitle>ต้องเข้าสู่ระบบก่อน</AlertTitle>
                <AlertDescription>กรุณาล็อกอินก่อนสร้างออเดอร์และอัปสลิป เพื่อให้ระบบเพิ่มเหรียญเข้าบัญชีของคุณได้ถูกต้อง</AlertDescription>
              </Alert>
            ) : null}

            {(paymentError || paymentLoading) && (
              <div className="mt-6 rounded-[22px] border border-rose-500/20 bg-rose-500/10 p-4 text-white">
                <div className="flex items-start gap-3">
                  {paymentLoading ? <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-primary" /> : <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-300" />}
                  <div>
                    <p className="font-semibold">{paymentLoading ? "กำลังโหลดข้อมูลการชำระเงิน" : "ยังดำเนินการต่อไม่ได้"}</p>
                    <p className="mt-1 text-sm text-white/75">{paymentLoading ? "ระบบกำลังดึงข้อมูลออเดอร์และพร้อมเพย์ล่าสุด" : paymentError}</p>
                  </div>
                </div>
              </div>
            )}

            {successMessage ? (
              <div className="mt-6 rounded-[22px] border border-emerald-500/20 bg-emerald-500/10 p-4 text-white">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
                  <div>
                    <p className="font-semibold">ชำระเงินสำเร็จ</p>
                    <p className="mt-1 text-sm text-white/75">{successMessage}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="outline" className="h-12 rounded-full border-border px-6 font-bold">
                <Link href="/ai-prediction">กลับไปหน้า AI Prediction</Link>
              </Button>
            </div>
          </div>

          {currentOrder ? (
            <div className="rounded-[28px] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">ออเดอร์ล่าสุดของแพ็กนี้</p>
                  <h3 className="mt-1 text-xl font-bold text-foreground">{currentOrder.productName}</h3>
                </div>
                <Badge className="bg-primary text-primary-foreground">{getOrderStatusLabel(currentOrder.status)}</Badge>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[18px] border border-border bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">ยอด</p>
                  <p className="mt-2 text-2xl font-black text-foreground">฿{currentOrder.amount}</p>
                </div>
                <div className="rounded-[18px] border border-border bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">สร้างเมื่อ</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{formatDateTime(currentOrder.createdAt)}</p>
                </div>
                <div className="rounded-[18px] border border-border bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">ชำระเมื่อ</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{formatDateTime(currentOrder.paidAt)}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-primary/20 bg-[radial-gradient(circle_at_top,rgba(184,255,0,0.14),transparent_35%),var(--color-card)] p-6 shadow-[0_24px_70px_rgba(184,255,0,0.08)]">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <QrCode className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">PromptPay</p>
                <h3 className="text-xl font-bold text-foreground">ชำระเงินของแพ็กนี้</h3>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-border bg-background/55 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">บัญชีรับเงิน</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{promptpayName}</p>
                  <p className="mt-1 text-base text-primary">{promptpayId || "ยังไม่พบหมายเลขพร้อมเพย์จากระบบ"}</p>
                </div>
                <Button type="button" variant="outline" onClick={() => void onCopyPromptPay()} className="rounded-full border-border bg-background/60">
                  <Copy className="mr-2 h-4 w-4" />
                  {copied ? "คัดลอกแล้ว" : "คัดลอก"}
                </Button>
              </div>

              <div className="mt-5 flex min-h-[300px] items-center justify-center rounded-[24px] border border-dashed border-primary/25 bg-black/20">
                {currentOrder && qrImageUrl ? (
                  <img
                    src={qrImageUrl}
                    alt="คิวอาร์พร้อมเพย์"
                    className="h-[260px] w-[260px] rounded-[24px] border border-white/10 bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,0.25)]"
                  />
                ) : (
                  <div className="px-6 text-center">
                    <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                    <p className="mt-4 text-base font-semibold text-foreground">กำลังเตรียมออเดอร์และ QR ของแพ็กนี้</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">เมื่อระบบสร้างออเดอร์เสร็จ บล็อกชำระเงินของแพ็กที่เลือกจะขึ้นตรงนี้อัตโนมัติ</p>
                  </div>
                )}
              </div>

              <p className="mt-5 text-center text-sm leading-7 text-muted-foreground">ชำระ {currentOrder?.amount ?? pack.price} บาท แล้วอัปโหลดสลิปของรายการนี้เพื่อให้ระบบตรวจสอบอัตโนมัติ</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <UploadCloud className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">อัปสลิป</p>
                <h3 className="text-xl font-bold text-foreground">ส่งตรวจสอบในหน้าเดียวกัน</h3>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_250px]">
              <label className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-primary/30 bg-primary/5 px-6 py-8 text-center transition hover:border-primary hover:bg-primary/10">
                {slipPreviewUrl ? (
                  <img src={slipPreviewUrl} alt="ตัวอย่างสลิป" className="mb-4 h-36 w-full max-w-[280px] rounded-[18px] object-cover shadow-[0_16px_40px_rgba(0,0,0,0.24)]" />
                ) : (
                  <UploadCloud className="mb-3 h-8 w-8 text-primary" />
                )}
                <span className="text-base font-medium text-foreground">{slipFile ? slipFile.name : "กดเพื่อเลือกรูปสลิปของแพ็กนี้"}</span>
                <span className="mt-2 text-sm text-muted-foreground">รองรับ PNG, JPG, JPEG และ WEBP</span>
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(event) => onSlipChange(event.target.files?.[0] || null)}
                />
              </label>

              <div className="flex flex-col gap-4 rounded-[24px] border border-border bg-background/60 p-5">
                <div>
                  <p className="text-sm text-muted-foreground">ขั้นตอน</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">1. เลือกแพ็ก แล้วระบบสร้างออเดอร์ให้อัตโนมัติ</p>
                  <p className="text-sm leading-6 text-foreground">2. สแกนจ่ายตามยอดของแพ็กนี้</p>
                  <p className="text-sm leading-6 text-foreground">3. อัปสลิปเพื่อตรวจสอบและรับเหรียญ</p>
                </div>
                <Button
                  type="button"
                  onClick={() => void onVerifySlip()}
                  disabled={!authToken || submitting || !currentOrder || !slipFile}
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  อัปสลิปและตรวจสอบ
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function SubscriptionPage({ selectedPackCode }: SubscriptionPageProps) {
  const authToken = getAuthToken()
  const [paymentState, setPaymentState] = useState<PaymentStateResponse | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [currentOrder, setCurrentOrder] = useState<AccessOrder | null>(null)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreviewUrl, setSlipPreviewUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const autoCreatedPackRef = useRef<string | null>(null)

  const selectedPack = useMemo(() => {
    if (!selectedPackCode || !["starter", "value", "season"].includes(selectedPackCode)) return null
    return coinPacks.find((item) => item.code === selectedPackCode) ?? null
  }, [selectedPackCode])

  useEffect(() => {
    if (!slipFile) {
      setSlipPreviewUrl("")
      return
    }

    const nextPreviewUrl = URL.createObjectURL(slipFile)
    setSlipPreviewUrl(nextPreviewUrl)
    return () => URL.revokeObjectURL(nextPreviewUrl)
  }, [slipFile])

  useEffect(() => {
    if (!authToken) {
      setPaymentState(null)
      setCurrentOrder(null)
      return
    }
    void loadPaymentState()
  }, [authToken, selectedPack?.productCode])

  useEffect(() => {
    if (!authToken || !selectedPack) return
    if (submitting) return
    if (currentOrder && currentOrder.status === "pending" && currentOrder.productCode === selectedPack.productCode) return
    if (autoCreatedPackRef.current === selectedPack.code) return

    autoCreatedPackRef.current = selectedPack.code
    void handleCreateOrder()
  }, [authToken, selectedPack, currentOrder, submitting])

  async function loadPaymentState() {
    if (!authToken) return
    setPaymentLoading(true)
    setPaymentError(null)
    try {
      const data = await fetchJson<PaymentStateResponse>("/payments/me", {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      setPaymentState(data)
      if (selectedPack) {
        const packOrder = data.orders.find(
          (item) => item.status === "pending" && item.targetId === "prediction-access" && item.productCode === selectedPack.productCode,
        )
        setCurrentOrder(packOrder ?? null)
      } else {
        setCurrentOrder(null)
      }
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "โหลดข้อมูลการชำระเงินไม่สำเร็จ"
      setPaymentError(getPaymentErrorMeta(rawMessage).description)
    } finally {
      setPaymentLoading(false)
    }
  }

  async function handleCreateOrder() {
    if (!authToken || !selectedPack) {
      setPaymentError("กรุณาเข้าสู่ระบบและเลือกแพ็กก่อน")
      return
    }

    setSubmitting(true)
    setPaymentError(null)
    setSuccessMessage(null)
    try {
      const data = await fetchJson<{ order: AccessOrder }>("/payments/create-order", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          productCode: selectedPack.productCode,
          targetId: "prediction-access",
        }),
      })
      setCurrentOrder(data.order)
      setSlipFile(null)
      setSuccessMessage(null)
      await loadPaymentState()
    } catch (error) {
      autoCreatedPackRef.current = null
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
      const message = response.message || "ชำระเงินสำเร็จ และระบบเพิ่มสิทธิ์ให้แล้ว"
      setSuccessMessage(message)
      setSlipFile(null)
      toast({
        className:
          "border-primary/25 bg-[linear-gradient(180deg,rgba(184,255,0,0.18),rgba(10,14,12,0.96))] text-white shadow-[0_24px_80px_rgba(184,255,0,0.16)]",
        title: "ชำระเงินสำเร็จ",
        description: message,
      })
      await loadPaymentState()
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "ตรวจสอบสลิปไม่สำเร็จ"
      const friendly = getPaymentErrorMeta(rawMessage)
      setPaymentError(friendly.description)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCopyPromptPay() {
    const promptpayId = paymentState?.promptpay?.id || process.env.NEXT_PUBLIC_PROMPTPAY_ID?.trim() || ""
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
    <main className="theme-page overflow-x-hidden">
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_24%,rgba(184,255,0,0.34),transparent_24%),radial-gradient(circle_at_84%_10%,rgba(184,255,0,0.12),transparent_30%),linear-gradient(115deg,var(--color-background)_0%,var(--color-background)_45%,color-mix(in_srgb,var(--color-primary)_8%,var(--color-background))_100%)]" />
        <div className="container relative mx-auto px-4 py-10 md:py-14 lg:min-h-[calc(100vh-72px)] lg:py-12">
          <div className="grid items-center gap-10 lg:grid-cols-[0.88fr_1.12fr] xl:gap-12">
            <div className="max-w-[700px] lg:pl-4">
              <Badge className="mb-5 border border-primary/30 bg-primary/12 px-3 py-1 text-primary hover:bg-primary/12">
                <Crown className="mr-2 h-3.5 w-3.5" />
                FootballAI Coins
              </Badge>
              <h1 className="font-stadium max-w-[700px] text-5xl leading-[1] text-foreground drop-shadow-[0_10px_30px_rgba(0,0,0,0.20)] md:text-6xl xl:text-[5.1rem]">
                ซื้อเหรียญเพื่อ
                <span className="block text-primary drop-shadow-[0_0_26px_rgba(184,255,0,0.28)]">ปลดล็อก AI Prediction</span>
              </h1>
              <p className="mt-4 max-w-[520px] text-base font-semibold leading-8 text-muted-foreground">
                ซื้อเท่าที่ใช้ เปิดดูเฉพาะคู่ที่สนใจ และเด้งเข้าบล็อกชำระเงินของแพ็กที่เลือกทันที
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-12 rounded-full bg-primary px-6 font-black text-primary-foreground hover:bg-primary/90">
                  <a href="#pricing">
                    เลือกแพ็กเหรียญ
                    <Zap className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="outline" className="h-12 rounded-full border-border bg-card px-6 font-bold text-foreground hover:bg-accent-soft">
                  <Link href="/ai-prediction">กลับไปหน้า AI Prediction</Link>
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm text-muted-foreground">
                {["1 คู่ ใช้ 1 เหรียญ", "กดแพ็กแล้วเปิด payment block ทันที", "รองรับ PromptPay + อัปสลิป"].map((item) => (
                  <span key={item} className="rounded-full border border-border bg-card/80 px-4 py-2 shadow-[0_14px_34px_rgba(0,0,0,0.08)]">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <CoinPreview />
          </div>
        </div>
      </section>

      <section id="pricing" className="container mx-auto px-4 py-12 md:py-16">
        <div className="mx-auto mb-8 flex max-w-4xl flex-col items-center gap-5 text-center">
          <div>
            <p className="font-scoreboard text-xs font-black uppercase text-primary">Coin Packs</p>
            <h2 className="font-stadium mt-2 text-3xl leading-tight text-foreground md:text-4xl">เลือกแพ็กเหรียญที่เหมาะกับการใช้งาน</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">กดแพ็กไหน ระบบจะพาคุณลงไปที่บล็อกชำระเงินของแพ็กนั้นทันที</p>
          </div>
        </div>
        <div className="mx-auto grid max-w-[420px] gap-4 lg:max-w-none lg:grid-cols-3 lg:items-stretch">
          {coinPacks.map((pack) => (
            <CoinPackCard key={pack.code} pack={pack} selected={selectedPack?.code === pack.code} />
          ))}
        </div>
      </section>

      {selectedPack ? (
        <CheckoutBlock
          pack={selectedPack}
          authToken={authToken}
          paymentState={paymentState}
          paymentLoading={paymentLoading}
          paymentError={paymentError}
          currentOrder={currentOrder}
          slipFile={slipFile}
          slipPreviewUrl={slipPreviewUrl}
          submitting={submitting}
          successMessage={successMessage}
          copied={copied}
          onVerifySlip={handleVerifySlip}
          onSlipChange={setSlipFile}
          onCopyPromptPay={handleCopyPromptPay}
        />
      ) : null}

      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="mb-6">
          <p className="font-scoreboard text-xs font-black uppercase text-primary">Included</p>
          <h2 className="font-stadium mt-2 text-3xl leading-tight text-foreground md:text-4xl">เมื่อซื้อเหรียญแล้ว คุณจะได้อะไร</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {includedFeatures.map((item, index) => (
            <article key={item.title} className="rounded-[24px] border border-border bg-card p-5 shadow-[0_14px_40px_rgba(0,0,0,0.06)]">
              <div className="flex items-start justify-between gap-4">
                <span className="font-mono text-sm font-black text-primary">{String(index + 1).padStart(2, "0")}</span>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  {index === 0 ? <Coins className="h-5 w-5" /> : index === 1 ? <Sparkles className="h-5 w-5" /> : index === 2 ? <ShieldCheck className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
                </span>
              </div>
              <h3 className="mt-8 text-xl font-black">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="font-scoreboard text-xs font-bold uppercase text-primary">FAQ</p>
            <h2 className="font-stadium mt-2 text-3xl leading-tight text-foreground md:text-4xl">คำถามที่พบบ่อย</h2>
            <p className="mt-4 max-w-sm text-sm leading-7 text-muted-foreground">สรุปเรื่องการซื้อเหรียญแบบสั้นและเข้าใจง่ายสำหรับผู้ใช้</p>
          </div>
          <Accordion type="multiple" className="rounded-[24px] border border-border bg-card px-5 shadow-[0_16px_48px_rgba(0,0,0,0.06)]">
            {faqs.map((item, index) => (
              <AccordionItem key={item.question} value={`faq-${index}`} className="border-border">
                <AccordionTrigger className="py-5 text-base font-black hover:no-underline">{item.question}</AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-7 text-muted-foreground">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-14 pt-8 md:pb-20 md:pt-12">
        <div className="overflow-hidden rounded-[28px] border border-primary/25 bg-primary p-7 text-primary-foreground shadow-[0_24px_70px_rgba(184,255,0,0.16)] md:p-8">
          <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="font-scoreboard text-xs font-black uppercase opacity-70">FootballAI Coins</p>
              <h2 className="font-stadium mt-3 text-3xl leading-tight md:text-5xl">พร้อมปลดล็อกผลทำนายคู่ถัดไปแล้วหรือยัง</h2>
              <p className="mt-3 max-w-2xl text-base leading-7 opacity-75">เลือกแพ็กเหรียญที่เหมาะกับคุณ แล้วค่อยเปิดบล็อกชำระเงินจริงของแพ็กนั้นต่อได้ทันที</p>
            </div>
            <Button asChild className="h-12 rounded-full bg-background px-6 font-black text-foreground hover:bg-background/90">
              <a href="#pricing">
                ซื้อเหรียญตอนนี้
                <Zap className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
