import { NextRequest, NextResponse } from "next/server"

import { FOOTBALL_PREDICTION_API_BASE_URL, parsePredictionResponse } from "@/lib/football-prediction"
import { requireAuthUser } from "@/lib/server/auth"
import { connectDatabase } from "@/lib/server/db"
import { PaymentEntitlement } from "@/lib/server/models"

export const maxDuration = 60

function isEntitlementActive(item: any, now: Date) {
  if (!item?.active) return false
  if (!item?.expiresAt) return true
  return new Date(item.expiresAt).getTime() > now.getTime()
}

export async function GET() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(`${FOOTBALL_PREDICTION_API_BASE_URL}/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      const message = data?.error || data?.detail || "Prediction health check failed"
      return NextResponse.json({ error: message, raw: data }, { status: response.status })
    }

    return NextResponse.json(data ?? { ok: true })
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Prediction API ใช้เวลาตอบนานเกินไป ระหว่างปลุกเซิร์ฟเวอร์"
        : "Prediction API ยังไม่พร้อมใช้งาน"

    return NextResponse.json({ error: message }, { status: 503 })
  } finally {
    clearTimeout(timeout)
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, any>

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const fixtureId = String(body.fixture_id || "").trim()
  if (!fixtureId) {
    return NextResponse.json({ error: "Missing fixture id" }, { status: 422 })
  }

  try {
    await connectDatabase()
    const user = await requireAuthUser(req)
    const now = new Date()

    const entitlements = await PaymentEntitlement.find({ user: user._id, active: true }).sort({ createdAt: 1 })

    const tournamentAccess = entitlements.find((item: any) => item.targetType === "daypass" && isEntitlementActive(item, now))

    let unlocked = Boolean(tournamentAccess)
    let creditEntitlementToConsume: any = null

    if (!unlocked) {
      for (const entitlement of entitlements) {
        if (entitlement.targetType !== "credits" || !isEntitlementActive(entitlement, now)) continue

        const metadata = (entitlement.metadata || {}) as Record<string, any>
        const unlockedFixtureIds = Array.isArray(metadata.unlockedFixtureIds) ? metadata.unlockedFixtureIds.map(String) : []
        const remainingCredits = typeof metadata.remainingCredits === "number" ? metadata.remainingCredits : 0

        if (unlockedFixtureIds.includes(fixtureId)) {
          unlocked = true
          break
        }

        if (!creditEntitlementToConsume && remainingCredits > 0) {
          creditEntitlementToConsume = entitlement
        }
      }
    }

    if (!unlocked && !creditEntitlementToConsume) {
      return NextResponse.json(
        {
          error: "กรุณาซื้อแพ็กเกจก่อนดูผลทำนายคู่นี้",
          code: "prediction_locked",
        },
        { status: 403 },
      )
    }

    if (!unlocked && creditEntitlementToConsume) {
      const metadata = (creditEntitlementToConsume.metadata || {}) as Record<string, any>
      const unlockedFixtureIds = Array.isArray(metadata.unlockedFixtureIds) ? metadata.unlockedFixtureIds.map(String) : []
      const remainingCredits = typeof metadata.remainingCredits === "number" ? metadata.remainingCredits : 0

      creditEntitlementToConsume.metadata = {
        ...metadata,
        unlockedFixtureIds: [...new Set([...unlockedFixtureIds, fixtureId])],
        remainingCredits: Math.max(0, remainingCredits - 1),
      }
      await creditEntitlementToConsume.save()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication required"
    return NextResponse.json({ error: message === "Authentication required" ? "กรุณาเข้าสู่ระบบก่อนดูผลทำนาย" : message }, { status: 401 })
  }

  const payload = {
    home_team: body.home_team,
    away_team: body.away_team,
    neutral: body.neutral,
    tournament_weight: body.tournament_weight,
    ...(body.round_name ? { round_name: body.round_name } : {}),
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 55000)

  try {
    const response = await fetch(`${FOOTBALL_PREDICTION_API_BASE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    })

    const data = await response.json().catch(() => null)

    if (data?.ok === false) {
      const message = data?.error || data?.detail || "Prediction API request failed"
      return NextResponse.json({ error: message, raw: data }, { status: response.ok ? 422 : response.status })
    }

    if (!response.ok) {
      const message = data?.detail || data?.error || "Prediction API request failed"
      return NextResponse.json({ error: message }, { status: response.status })
    }

    return NextResponse.json({
      raw: data,
      parsed: parsePredictionResponse(data),
    })
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Prediction API ตอบกลับช้ากว่าปกติ เซิร์ฟเวอร์อาจกำลังเริ่มทำงาน ลองกดใหม่อีกครั้งในอีกสักครู่"
        : "Prediction API ยังไม่พร้อมใช้งาน"

    return NextResponse.json({ error: message }, { status: 503 })
  } finally {
    clearTimeout(timeout)
  }
}
