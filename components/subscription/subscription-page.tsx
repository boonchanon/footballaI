"use client"

import { useMemo, useState } from "react"
import {
  ArrowRight,
  BarChart3,
  Check,
  Crown,
  Gauge,
  Gift,
  Lock,
  Minus,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Billing = "monthly" | "yearly"
type PlanId = "free" | "pro" | "pro_plus"
type UiPlanCode =
  | "global_free"
  | "global_pro_monthly"
  | "global_pro_yearly"
  | "global_pro_plus_monthly"
  | "global_pro_plus_yearly"

type Plan = {
  id: PlanId
  name: string
  label: string
  description: string
  monthlyPrice: number
  yearlyMonthlyEquivalent: number
  yearlyTotal: number
  featured?: boolean
  features: Array<{ label: string; status?: "available" | "soon" }>
  cta: string
}

type ComparisonRow = {
  feature: string
  free: "yes" | "no" | "soon"
  pro: "yes" | "no" | "soon"
  proPlus: "yes" | "no" | "soon"
}

const plans: Plan[] = [
  {
    id: "free",
    name: "FREE",
    label: "เริ่มต้นใช้งาน FootballAI",
    description: "เหมาะสำหรับแฟนบอลที่อยากติดตามข้อมูลพื้นฐานและเข้าร่วมคอมมูนิตี้",
    monthlyPrice: 0,
    yearlyMonthlyEquivalent: 0,
    yearlyTotal: 0,
    cta: "ใช้งานฟรี",
    features: [
      { label: "โปรแกรมและผลการแข่งขัน" },
      { label: "ตารางคะแนน" },
      { label: "Community" },
      { label: "Match Hub" },
      { label: "ทดลอง AI Prediction", status: "soon" },
    ],
  },
  {
    id: "pro",
    name: "PRO",
    label: "ปลดล็อกเครื่องมือวิเคราะห์หลัก",
    description: "สำหรับผู้ใช้ที่อยากอ่านเกมด้วย AI และข้อมูลเชิงลึกมากกว่าสกอร์",
    monthlyPrice: 149,
    yearlyMonthlyEquivalent: 124,
    yearlyTotal: 1490,
    featured: true,
    cta: "อัปเกรดเป็น PRO",
    features: [
      { label: "ทุกฟีเจอร์ของ FREE" },
      { label: "AI Prediction" },
      { label: "Advanced Statistics" },
      { label: "Heat Map" },
      { label: "Match Insights" },
      { label: "Team / Player Compare" },
      { label: "ไม่มีโฆษณา", status: "soon" },
    ],
  },
  {
    id: "pro_plus",
    name: "PRO+",
    label: "เครื่องมือวิเคราะห์สำหรับสายลึก",
    description: "เพิ่มพื้นที่วิเคราะห์ เปรียบเทียบ และจัดข้อมูลสำหรับการติดตามแบบจริงจัง",
    monthlyPrice: 299,
    yearlyMonthlyEquivalent: 249,
    yearlyTotal: 2990,
    cta: "เลือก PRO+",
    features: [
      { label: "ทุกฟีเจอร์ของ PRO" },
      { label: "AI Compare", status: "soon" },
      { label: "Custom Dashboard", status: "soon" },
      { label: "Advanced Watchlist", status: "soon" },
      { label: "Data Export", status: "soon" },
      { label: "Advanced Analysis Tools", status: "soon" },
      { label: "Priority Support", status: "soon" },
    ],
  },
]

const comparisonRows: ComparisonRow[] = [
  { feature: "AI Prediction", free: "soon", pro: "yes", proPlus: "yes" },
  { feature: "Advanced Statistics", free: "no", pro: "yes", proPlus: "yes" },
  { feature: "Heat Map", free: "no", pro: "yes", proPlus: "yes" },
  { feature: "Match Insights", free: "no", pro: "yes", proPlus: "yes" },
  { feature: "AI Compare", free: "no", pro: "no", proPlus: "soon" },
  { feature: "Custom Dashboard", free: "no", pro: "no", proPlus: "soon" },
  { feature: "Data Export", free: "no", pro: "no", proPlus: "soon" },
]

const featureStrip = [
  {
    number: "01",
    title: "AI Prediction",
    description: "ประเมินความเป็นไปได้ของการแข่งขัน",
    icon: Target,
  },
  {
    number: "02",
    title: "Advanced Statistics",
    description: "ข้อมูลเชิงลึกมากกว่าสถิติพื้นฐาน",
    icon: BarChart3,
  },
  {
    number: "03",
    title: "Match Insights",
    description: "สรุปประเด็นสำคัญของเกม",
    icon: Sparkles,
  },
  {
    number: "04",
    title: "AI Compare",
    description: "เปรียบเทียบทีมและนักเตะด้วยข้อมูล",
    icon: Gauge,
  },
]

const faqs = [
  {
    question: "ยกเลิกแพ็กเกจได้ตลอดเวลาไหม",
    answer: "รายละเอียดการยกเลิกจะขึ้นอยู่กับระบบสมาชิกเมื่อเปิดใช้งานการชำระเงินจริง",
  },
  {
    question: "เปลี่ยนแพ็กเกจภายหลังได้ไหม",
    answer: "ระบบถูกออกแบบให้รองรับการเปลี่ยนแพ็กเกจในอนาคต",
  },
  {
    question: "รองรับการชำระเงินแบบไหนบ้าง",
    answer: "FootballAI มีระบบ PromptPay และการตรวจสอบสลิปในระบบเดิม โดยการเชื่อมกับ Global Subscription จะดำเนินการในขั้นถัดไป",
  },
  {
    question: "PRO ต่างจาก PRO+ อย่างไร",
    answer: "PRO เน้น AI และข้อมูลเชิงลึก ส่วน PRO+ เพิ่มเครื่องมือสำหรับผู้ใช้ที่ต้องการวิเคราะห์ข้อมูลมากขึ้น",
  },
]

function getUiPlanCode(plan: Plan, billing: Billing): UiPlanCode {
  if (plan.id === "free") return "global_free"
  if (plan.id === "pro") return billing === "monthly" ? "global_pro_monthly" : "global_pro_yearly"
  return billing === "monthly" ? "global_pro_plus_monthly" : "global_pro_plus_yearly"
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("th-TH").format(value)
}

function AvailabilityMark({ value }: { value: "yes" | "no" | "soon" }) {
  if (value === "yes") {
    return (
      <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="h-4 w-4" />
      </span>
    )
  }
  if (value === "soon") {
    return <span className="inline-flex rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">เร็ว ๆ นี้</span>
  }
  return (
    <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Minus className="h-4 w-4" />
    </span>
  )
}

function BillingToggle({ billing, onChange }: { billing: Billing; onChange: (billing: Billing) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-[360px] rounded-full border border-border bg-card p-1 shadow-[0_18px_48px_rgba(0,0,0,0.08)]">
      {([
        { key: "monthly", label: "รายเดือน", badge: "" },
        { key: "yearly", label: "รายปี", badge: "ลด 17%" },
      ] as const).map((item) => {
        const active = billing === item.key
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={cn(
              "flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-sm font-bold transition",
              active ? "bg-primary text-primary-foreground shadow-[0_12px_26px_rgba(184,255,0,0.22)]" : "text-muted-foreground hover:bg-accent-soft hover:text-foreground",
            )}
            aria-pressed={active}
          >
            {item.label}
            {item.badge ? <span className={cn("rounded-full px-2 py-0.5 text-[10px]", active ? "bg-background/35" : "bg-primary/12 text-primary")}>{item.badge}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

function PredictionPreview() {
  const matches = [
    {
      home: "Man City",
      away: "Arsenal",
      homeCode: "MC",
      awayCode: "ARS",
      score: "2 - 1",
      unlocked: true,
      values: [
        { label: "ชนะ", value: 56 },
        { label: "เสมอ", value: 24 },
        { label: "แพ้", value: 20 },
      ],
    },
    {
      home: "Liverpool",
      away: "Chelsea",
      homeCode: "LIV",
      awayCode: "CHE",
      score: "1 - 0",
      unlocked: true,
      values: [
        { label: "ชนะ", value: 48 },
        { label: "เสมอ", value: 27 },
        { label: "แพ้", value: 25 },
      ],
    },
    {
      home: "Tottenham",
      away: "Man United",
      homeCode: "TOT",
      awayCode: "MUN",
      score: "? - ?",
      unlocked: false,
      values: [
        { label: "ชนะ", value: 44 },
        { label: "เสมอ", value: 28 },
        { label: "แพ้", value: 28 },
      ],
    },
    {
      home: "Newcastle",
      away: "Aston Villa",
      homeCode: "NEW",
      awayCode: "AVL",
      score: "? - ?",
      unlocked: false,
      values: [
        { label: "ชนะ", value: 41 },
        { label: "เสมอ", value: 31 },
        { label: "แพ้", value: 28 },
      ],
    },
  ]

  return (
    <div className="relative overflow-hidden rounded-[30px] border border-border bg-card/95 p-5 shadow-[0_28px_86px_rgba(0,0,0,0.16)] backdrop-blur md:p-6">
      <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary/18 blur-3xl" />
      <div className="absolute bottom-12 right-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-scoreboard text-xs font-bold uppercase text-primary">AI Prediction Preview</p>
            <p className="mt-1 text-sm text-muted-foreground">ตัวอย่างการวิเคราะห์ 4 คู่ต่อสัปดาห์</p>
          </div>
          <Badge className="border border-primary/30 bg-primary/12 text-primary hover:bg-primary/12">Prediction</Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {matches.map((match, index) => (
            <article
              key={`${match.home}-${match.away}`}
              className={cn(
                "relative min-h-[210px] overflow-hidden rounded-[22px] border border-border bg-background/55 p-4",
                !match.unlocked && "bg-muted/40",
              )}
            >
              <div className="absolute left-3 top-3 z-10 rounded-lg border border-primary/30 bg-primary/12 px-2 py-1 text-[11px] font-bold text-primary">
                {match.unlocked ? "เปิดให้ดู" : "ล็อกด้วย Pro"}
              </div>
              <div className={cn("pt-8", !match.unlocked && "select-none blur-[1.4px]")}>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                  <div>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-xs font-black text-primary">
                      {index % 2 === 0 ? <Trophy className="h-6 w-6" /> : match.homeCode}
                    </div>
                    <p className="mt-2 text-xs font-bold sm:text-sm">{match.home}</p>
                  </div>
                  <div className="text-xs font-bold uppercase text-muted-foreground">vs</div>
                  <div>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-xs font-black text-primary">
                      {index % 2 === 0 ? <ShieldCheck className="h-6 w-6" /> : match.awayCode}
                    </div>
                    <p className="mt-2 text-xs font-bold sm:text-sm">{match.away}</p>
                  </div>
                </div>

                <div className="my-3 text-center">
                  <p className="text-xs text-muted-foreground">สกอร์ที่ AI คาดการณ์</p>
                  <p className="font-scoreboard mt-1 text-4xl leading-none text-foreground">{match.score}</p>
                </div>

                <div className="space-y-2">
                  {match.values.map((item) => (
                    <div key={item.label} className="grid grid-cols-[34px_1fr_42px] items-center gap-2 text-xs">
                      <span className="font-bold text-foreground">{item.label}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-muted">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${item.value}%` }} />
                      </span>
                      <span className="font-scoreboard text-right text-sm">{match.unlocked ? `${item.value}%` : <Lock className="ml-auto h-3.5 w-3.5 text-muted-foreground" />}</span>
                    </div>
                  ))}
                </div>
              </div>
              {!match.unlocked ? (
                <div className="pointer-events-none absolute inset-0 bg-background/18" />
              ) : null}
            </article>
          ))}
        </div>

        <div className="mt-4 rounded-[20px] border border-border bg-muted/55 p-4 transition hover:bg-muted/70">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Lock className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">AI Insight</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">ปลดล็อกเหตุผลและการวิเคราะห์เชิงลึกด้วย PRO</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  )
}

function PlanCard({ plan, billing }: { plan: Plan; billing: Billing }) {
  const price = billing === "monthly" ? plan.monthlyPrice : plan.yearlyMonthlyEquivalent
  const yearlyCopy = billing === "yearly" && plan.yearlyTotal > 0 ? `เรียกเก็บ ฿${formatPrice(plan.yearlyTotal)} ต่อปี` : ""
  const uiPlanCode = getUiPlanCode(plan, billing)

  return (
    <article
      className={cn(
        "relative flex min-h-[500px] flex-col rounded-[26px] border bg-card p-5 shadow-[0_16px_48px_rgba(0,0,0,0.07)] transition lg:p-6",
        plan.featured
          ? "z-10 border-primary bg-[radial-gradient(circle_at_top,rgba(184,255,0,0.14),transparent_42%),var(--color-card)]"
          : "border-border",
      )}
      data-plan-code={uiPlanCode}
    >
      {plan.featured ? (
        <div className="absolute right-5 top-5 rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">แนะนำ</div>
      ) : null}

      <div>
        <p className="font-scoreboard text-xs font-bold uppercase text-primary">{plan.name}</p>
        <h3 className="font-stadium mt-3 text-xl leading-tight text-foreground">{plan.label}</h3>
        <p className="mt-3 min-h-[48px] text-sm leading-6 text-muted-foreground">{plan.description}</p>
      </div>

      <div className="mt-6">
        <div className="flex items-end gap-2">
          <span className="font-scoreboard text-5xl leading-none text-foreground">฿{formatPrice(price)}</span>
          <span className="pb-2 text-sm text-muted-foreground">/ เดือน</span>
        </div>
        {yearlyCopy ? <p className="mt-2 text-sm font-semibold text-primary">{yearlyCopy}</p> : <p className="mt-2 text-sm text-muted-foreground">เริ่มต้นได้ทันที</p>}
      </div>

      <div className="mt-6 space-y-2.5">
        {plan.features.map((feature) => (
          <div key={feature.label} className="flex items-start gap-3 text-sm">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Check className="h-3.5 w-3.5" />
            </span>
            <span className="leading-6 text-foreground">
              {feature.label}
              {feature.status === "soon" ? <span className="ml-2 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">เร็ว ๆ นี้</span> : null}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-6">
        <Button
          type="button"
          disabled={plan.id !== "free"}
          className={cn(
            "h-12 w-full rounded-full font-black",
            plan.featured ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border bg-secondary text-secondary-foreground hover:bg-accent-soft",
          )}
          variant={plan.featured ? "default" : "secondary"}
          title={plan.id === "free" ? undefined : "ระบบชำระเงินจะเชื่อมในขั้นถัดไป"}
        >
          {plan.cta}
          {plan.id !== "free" ? <Lock className="ml-2 h-4 w-4" /> : <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
        {plan.id !== "free" ? <p className="mt-3 text-center text-xs text-muted-foreground">ระบบชำระเงินจะเชื่อมในขั้นถัดไป</p> : null}
      </div>
    </article>
  )
}

export function SubscriptionPage() {
  const [billing, setBilling] = useState<Billing>("monthly")
  const activeBillingLabel = useMemo(() => (billing === "monthly" ? "รายเดือน" : "รายปี"), [billing])

  return (
    <main className="theme-page overflow-x-hidden">
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_24%,rgba(184,255,0,0.34),transparent_24%),radial-gradient(circle_at_84%_10%,rgba(184,255,0,0.12),transparent_30%),linear-gradient(115deg,var(--color-background)_0%,var(--color-background)_45%,color-mix(in_srgb,var(--color-primary)_8%,var(--color-background))_100%)]" />
        <div className="container relative mx-auto px-4 py-10 md:py-14 lg:min-h-[calc(100vh-72px)] lg:py-12">
          <div className="grid items-center gap-10 lg:grid-cols-[0.88fr_1.12fr] xl:gap-12">
            <div className="max-w-[700px] lg:pl-4">
              <Badge className="mb-5 border border-primary/30 bg-primary/12 px-3 py-1 text-primary hover:bg-primary/12">
                <Crown className="mr-2 h-3.5 w-3.5" />
                FootballAI Pro
              </Badge>
              <h1 className="font-stadium max-w-[700px] text-5xl leading-[1] text-foreground drop-shadow-[0_10px_30px_rgba(0,0,0,0.20)] md:text-6xl xl:text-[5.1rem]">
                ปลดล็อกฟอร์มการ
                <span className="block text-primary drop-shadow-[0_0_26px_rgba(184,255,0,0.28)]">วิเคราะห์บอลของคุณ</span>
              </h1>
              <p className="mt-4 max-w-[520px] text-base font-semibold leading-8 text-muted-foreground">
                ใช้ AI และข้อมูลเชิงลึก เพื่อเข้าใจเกมได้มากกว่าสกอร์
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-12 rounded-full bg-primary px-6 font-black text-primary-foreground hover:bg-primary/90">
                  <a href="#pricing">
                    เริ่มต้นใช้ Pro
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="outline" className="h-12 rounded-full border-border bg-card px-6 font-bold text-foreground hover:bg-accent-soft">
                  <a href="#pricing">ดูแพ็กเกจ</a>
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm text-muted-foreground">
                {["AI พร้อมใช้งาน", "ไม่แตะ World Cup Flow", `เลือกบิล: ${activeBillingLabel}`].map((item) => (
                  <span key={item} className="rounded-full border border-border bg-card/80 px-4 py-2 shadow-[0_14px_34px_rgba(0,0,0,0.08)]">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <PredictionPreview />
          </div>

          <div className="mx-auto mt-8 max-w-[760px] rounded-[24px] border border-border bg-card/90 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.12)] backdrop-blur lg:mt-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-primary/14 text-primary shadow-[0_14px_38px_rgba(184,255,0,0.16)]">
                  <Gift className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="font-stadium text-lg leading-none text-foreground">พิเศษสำหรับสมาชิก PRO</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">เข้าถึง AI Insight, สถิติขั้นสูง และเครื่องมือวิเคราะห์แบบไม่จำกัด</p>
                </div>
              </div>
              <Button asChild className="h-12 shrink-0 rounded-full bg-primary px-6 font-black text-primary-foreground hover:bg-primary/90">
                <a href="#pricing">
                  ดูแพ็กเกจทั้งหมด
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="container mx-auto px-4 py-12 md:py-16">
        <div className="mx-auto mb-8 flex max-w-4xl flex-col items-center gap-5 text-center">
          <div>
            <p className="font-scoreboard text-xs font-black uppercase text-primary">Plans</p>
            <h2 className="font-stadium mt-2 text-3xl leading-tight text-foreground md:text-4xl">เลือกแพ็กเกจที่อ่านเกมได้ลึกขึ้น</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">จัดทุกอย่างไว้เป็น 3 ระดับให้เทียบง่าย ไม่ต้องไล่หาเองว่าฟีเจอร์ไหนอยู่แพ็กไหน</p>
          </div>
          <BillingToggle billing={billing} onChange={setBilling} />
        </div>
        <div className="mx-auto grid max-w-[420px] gap-4 lg:max-w-none lg:grid-cols-3 lg:items-stretch">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} billing={billing} />
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-scoreboard text-xs font-bold uppercase text-primary">Compare</p>
            <h2 className="font-stadium mt-2 text-3xl leading-tight text-foreground md:text-4xl">เปรียบเทียบฟีเจอร์</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">ตารางนี้เป็นโครง UI สำหรับแผน Global Subscription และยังไม่เชื่อมระบบชำระเงิน</p>
        </div>

        <div className="overflow-x-auto rounded-[24px] border border-border bg-card shadow-[0_16px_48px_rgba(0,0,0,0.06)]">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/45">
                <th className="px-5 py-4 text-left font-black">ฟีเจอร์</th>
                <th className="px-5 py-4 text-center font-black">FREE</th>
                <th className="px-5 py-4 text-center font-black text-primary">PRO</th>
                <th className="px-5 py-4 text-center font-black">PRO+</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.feature} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-4 font-semibold text-foreground">{row.feature}</td>
                  <td className="px-5 py-4 text-center"><AvailabilityMark value={row.free} /></td>
                  <td className="px-5 py-4 text-center"><AvailabilityMark value={row.pro} /></td>
                  <td className="px-5 py-4 text-center"><AvailabilityMark value={row.proPlus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="mb-6">
          <p className="font-scoreboard text-xs font-black uppercase text-primary">Tools</p>
          <h2 className="font-stadium mt-2 text-3xl leading-tight text-foreground md:text-4xl">เครื่องมือที่ได้ใน FootballAI Pro</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featureStrip.map((item) => {
            const Icon = item.icon
            return (
              <article key={item.number} className="rounded-[24px] border border-border bg-card p-5 shadow-[0_14px_40px_rgba(0,0,0,0.06)]">
                <div className="flex items-start justify-between gap-4">
                  <span className="font-mono text-sm font-black text-primary">{item.number}</span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <h3 className="mt-8 text-xl font-black">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="font-scoreboard text-xs font-bold uppercase text-primary">FAQ</p>
            <h2 className="font-stadium mt-2 text-3xl leading-tight text-foreground md:text-4xl">คำถามที่พบบ่อย</h2>
            <p className="mt-4 max-w-sm text-sm leading-7 text-muted-foreground">ตอบเฉพาะสิ่งที่ระบบพร้อมรองรับในแผนงาน โดยไม่ claim recurring payment ใน phase นี้</p>
          </div>
          <Accordion type="multiple" className="rounded-[24px] border border-border bg-card px-5 shadow-[0_16px_48px_rgba(0,0,0,0.06)]">
            {faqs.map((item, index) => (
              <AccordionItem key={item.question} value={`faq-${index}`} className="border-border">
                <AccordionTrigger className="py-5 text-base font-black hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-7 text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-14 pt-8 md:pb-20 md:pt-12">
        <div className="overflow-hidden rounded-[28px] border border-primary/25 bg-primary p-7 text-primary-foreground shadow-[0_24px_70px_rgba(184,255,0,0.16)] md:p-8">
          <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="font-scoreboard text-xs font-black uppercase opacity-70">FootballAI Pro</p>
              <h2 className="font-stadium mt-3 text-3xl leading-tight md:text-5xl">พร้อมเข้าใจเกมให้มากกว่าเดิมหรือยัง</h2>
              <p className="mt-3 max-w-2xl text-base leading-7 opacity-75">ปลดล็อก AI และเครื่องมือวิเคราะห์ของ FootballAI</p>
            </div>
            <Button asChild className="h-12 rounded-full bg-background px-6 font-black text-foreground hover:bg-background/90">
              <a href="#pricing">
                เริ่มต้นใช้ PRO
                <Zap className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
